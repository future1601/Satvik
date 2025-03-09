from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from datetime import datetime, timedelta
from typing import Dict, List
import json
import cv2
import numpy as np
from pyzbar.pyzbar import decode, ZBarSymbol
import base64
import torch
import torchvision.transforms as transforms
import timm
import torch.nn as nn
from PIL import Image, ImageEnhance
import io
import os
import time
import requests
from pydantic import BaseModel
import google.generativeai as genai
from collections import Counter
from meal_planner import generate_meal_plan
import pandas as pd

# ------------------- FASTAPI SETUP -------------------
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------- GOOGLE FIT SETUP -------------------
SCOPES = [
    'https://www.googleapis.com/auth/fitness.activity.read',
    'https://www.googleapis.com/auth/fitness.body.read',
    'https://www.googleapis.com/auth/fitness.sleep.read'
]
credentials_store = {}

def get_google_fit_service(credentials: Dict):
    creds = Credentials(**credentials)
    return build('fitness', 'v1', credentials=creds)

# ImageNet mean and std for normalization
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]

# Set up device in a robust way
device = torch.device("cpu")  # Default to CPU
try:
    if torch.cuda.is_available():
        # Test CUDA with a small tensor operation
        try:
            test_tensor = torch.zeros(1).cuda()
            test_tensor = test_tensor + 1  # Simple operation to test CUDA
            device = torch.device("cuda:0")
            print(f"CUDA test successful. Using GPU: {torch.cuda.get_device_name(0)}")
        except Exception as e:
            print(f"CUDA initialization error: {e}")
            print("CUDA available but not working properly. Falling back to CPU.")
    else:
        print("CUDA not available, using CPU")
except Exception as e:
    print(f"CUDA error: {e}")
    print("Falling back to CPU")

# Get current directory
current_dir = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(current_dir, "best_model.pth")

# Define separate models for different purposes
food_model = None  # PyTorch model for food detection
gemini_model = None  # Gemini model for barcode scanning

# Function to create the model architecture
def create_timm_model(num_classes: int):
    """Create the Timm model architecture."""
    model = timm.create_model('tf_efficientnetv2_s', pretrained=False)
    in_features = model.classifier.in_features
    model.classifier = nn.Linear(in_features, num_classes)
    return model

# Function to load the PyTorch model
def load_timm_model(model_path: str):
    """Load model checkpoint (including class names) and build the model architecture."""
    if not os.path.exists(model_path):
        print(f"Error: Model file {model_path} does not exist")
        return None, None

    print(f"Loading model from {model_path}")
    try:
        checkpoint = torch.load(model_path, map_location=device)
        
        # If the checkpoint has class_names
        class_names = checkpoint.get('class_names', None)
        if class_names is None:
            print("Warning: 'class_names' not found in checkpoint. Using numeric class IDs.")
            # Fallback: set some number of classes
            num_classes = checkpoint.get('num_classes', 10)  # Default to 10 classes
        else:
            num_classes = len(class_names)
            print(f"Found {num_classes} classes: {class_names}")

        # Create model architecture
        model = create_timm_model(num_classes)
        
        # Load the state dict - handle different checkpoint formats
        if 'model_state_dict' in checkpoint:
            model.load_state_dict(checkpoint['model_state_dict'])
        else:
            # Try loading directly
            model.load_state_dict(checkpoint)
            
        model.eval()
        print(f"Model loaded successfully with {num_classes} classes.")
        return model, class_names
    except Exception as e:
        print(f"Error loading model: {e}")
        import traceback
        traceback.print_exc()
        return None, None

# Load the PyTorch model for food detection
try:
    food_model, class_names = load_timm_model(MODEL_PATH)
    if food_model is not None:
        food_model = food_model.to(device)
        print(f"Food detection model loaded successfully to {device}")
    else:
        print("WARNING: Food detection model failed to load")
except Exception as e:
    print(f"Error loading food detection model: {e}")
    food_model = None
    class_names = None

# Load Gemini model for barcode scanning
try:
    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "AIzaSyDB0WpEXLcc4-VgTKgp7_5pQgd-uv6iIJs")
    if GOOGLE_API_KEY:
        genai.configure(api_key=GOOGLE_API_KEY)
        gemini_model = genai.GenerativeModel("gemini-pro-vision")
        print("Gemini model initialized for barcode scanning")
    else:
        print("WARNING: No Google API key found. Gemini model will not be available.")
except Exception as e:
    print(f"Error initializing Gemini model: {e}")
    gemini_model = None

# Load nutrition data from CSV
try:
    nutrition_csv_path = os.path.join(current_dir, "data", "nutrition_data.csv")
    if os.path.exists(nutrition_csv_path):
        nutrition_df = pd.read_csv(nutrition_csv_path)
        print(f"Loaded nutrition data for {len(nutrition_df)} foods")
    else:
        nutrition_df = None
        print(f"WARNING: Nutrition data file not found at {nutrition_csv_path}")
except Exception as e:
    print(f"Error loading nutrition data: {e}")
    nutrition_df = None

# ------------------- GOOGLE OAUTH ENDPOINT -------------------
@app.post("/auth/google")
async def google_auth():
    """Initiate Google OAuth2 flow."""
    try:
        flow = InstalledAppFlow.from_client_secrets_file(
            'credentials.json',
            SCOPES
        )
        creds = flow.run_local_server(port=8080)
        
        credentials_store['user'] = {
            'token': creds.token,
            'refresh_token': creds.refresh_token,
            'token_uri': creds.token_uri,
            'client_id': creds.client_id,
            'client_secret': creds.client_secret,
            'scopes': creds.scopes
        }
        return {"message": "Authentication successful"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Authentication failed: {str(e)}")

# ------------------- GOOGLE FIT ENDPOINTS -------------------
@app.get("/fitness/steps")
async def get_steps():
    """Get daily step count for the last 7 days."""
    if 'user' not in credentials_store:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    service = get_google_fit_service(credentials_store['user'])
    end_time = datetime.now()
    start_time = end_time - timedelta(days=7)
    
    body = {
        "aggregateBy": [{
            "dataTypeName": "com.google.step_count.delta",
            "dataSourceId": "derived:com.google.step_count.delta:com.google.android.gms:estimated_steps"
        }],
        "bucketByTime": { "durationMillis": 86400000 },
        "startTimeMillis": int(start_time.timestamp() * 1000),
        "endTimeMillis": int(end_time.timestamp() * 1000)
    }
    
    response = service.users().dataset().aggregate(userId="me", body=body).execute()
    daily_steps = []
    for bucket in response.get('bucket', []):
        date = datetime.fromtimestamp(int(bucket['startTimeMillis']) / 1000).strftime('%Y-%m-%d')
        steps = 0
        if bucket['dataset'][0]['point']:
            steps = bucket['dataset'][0]['point'][0]['value'][0]['intVal']
        daily_steps.append({"date": date, "steps": steps})
    
    return daily_steps

@app.get("/fitness/sleep")
async def get_sleep():
    """Get sleep data for the last 7 days."""
    if 'user' not in credentials_store:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    service = get_google_fit_service(credentials_store['user'])
    end_time = datetime.now()
    start_time = end_time - timedelta(days=7)
    
    body = {
        "aggregateBy": [{
            "dataTypeName": "com.google.sleep.segment"
        }],
        "startTimeMillis": int(start_time.timestamp() * 1000),
        "endTimeMillis": int(end_time.timestamp() * 1000)
    }
    
    response = service.users().dataset().aggregate(userId="me", body=body).execute()
    sleep_data = []
    for bucket in response.get('bucket', []):
        for dataset in bucket.get('dataset', []):
            for point in dataset.get('point', []):
                start = datetime.fromtimestamp(int(point['startTimeNanos']) / 1000000000)
                end = datetime.fromtimestamp(int(point['endTimeNanos']) / 1000000000)
                sleep_data.append({
                    "date": start.strftime('%Y-%m-%d'),
                    "start_time": start.strftime('%H:%M'),
                    "end_time": end.strftime('%H:%M'),
                    "duration_hours": (end - start).total_seconds() / 3600
                })
    return sleep_data

@app.get("/fitness/calories")
async def get_calories():
    """Get daily calorie burn data for the last 7 days."""
    if 'user' not in credentials_store:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    service = get_google_fit_service(credentials_store['user'])
    end_time = datetime.now()
    start_time = end_time - timedelta(days=7)
    
    body = {
        "aggregateBy": [{
            "dataTypeName": "com.google.calories.expended",
            "dataSourceId": "derived:com.google.calories.expended:com.google.android.gms:merge_calories_expended"
        }],
        "bucketByTime": { "durationMillis": 86400000 },
        "startTimeMillis": int(start_time.timestamp() * 1000),
        "endTimeMillis": int(end_time.timestamp() * 1000)
    }
    
    response = service.users().dataset().aggregate(userId="me", body=body).execute()
    daily_calories = []
    for bucket in response.get('bucket', []):
        date = datetime.fromtimestamp(int(bucket['startTimeMillis']) / 1000).strftime('%Y-%m-%d')
        calories = 0
        if bucket['dataset'][0]['point']:
            calories = bucket['dataset'][0]['point'][0]['value'][0]['fpVal']
        daily_calories.append({"date": date, "calories": round(calories, 2)})
    return daily_calories

@app.get("/test")
async def test_endpoint():
    """Simple test endpoint that doesn't require authentication."""
    return {
        "status": "API is working",
        "authenticated": 'user' in credentials_store
    }

# ------------------- BARCODE SCAN ENDPOINT -------------------
class ImageRequest(BaseModel):
    imageBase64: str

# Configure Gemini API - you might want to move this to an environment variable
GEMINI_API_KEY = "AIzaSyAIykwqYxbWW0yaNkvp-XyO-KzwGPMCRpo"
genai.configure(api_key=GEMINI_API_KEY)

# Initialize the Gemini model
model = genai.GenerativeModel("gemini-2.0-flash")

@app.post("/barcode-scan")
async def scan_barcode(request: ImageRequest):
    try:
        print("\n----- BARCODE SCAN REQUEST RECEIVED -----")
        
        # 1) Decode the base64 image
        try:
            image_data = base64.b64decode(request.imageBase64)
            print(f"Image decoded successfully, size: {len(image_data)} bytes")
        except Exception as e:
            print(f"ERROR: Invalid image data: {str(e)}")
            return {"success": False, "error": f"Invalid image data: {str(e)}"}
        
        # 2) Save image to disk for debugging
        image_dir = os.path.join(current_dir, "captured_barcodes")
        os.makedirs(image_dir, exist_ok=True)
        timestamp = int(time.time())
        image_path = os.path.join(image_dir, f"barcode_image_{timestamp}.jpg")
        with open(image_path, "wb") as f:
            f.write(image_data)
        print(f"Image saved to {image_path}")
        
        # 3) Convert to OpenCV format and scan for barcodes
        try:
            # Convert image to numpy array for OpenCV
            nparr = np.frombuffer(image_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                print("ERROR: Failed to decode image")
                return {"success": False, "error": "Failed to decode image"}
            
            print(f"Image loaded, shape: {img.shape}")
            
            # Specify barcode types to scan
            symbols_to_scan = [
                ZBarSymbol.EAN13,
                ZBarSymbol.UPCA,
                ZBarSymbol.QRCODE,
                ZBarSymbol.CODE39,
                ZBarSymbol.CODE128,
                ZBarSymbol.EAN8
            ]
            
            # Scan for barcodes
            barcodes = decode(img, symbols=symbols_to_scan)
            
            if not barcodes:
                print("No barcodes found in image")
                return {"success": False, "error": "No barcode detected in the image"}
            
            # Get the first barcode (most prominent)
            barcode = barcodes[0]
            barcode_data = barcode.data.decode("utf-8")
            barcode_type = barcode.type
            
            print(f"Detected barcode: {barcode_type} - {barcode_data}")
            
            # Draw rectangle around barcode and save for debugging
            (x, y, w, h) = barcode.rect
            cv2.rectangle(img, (x, y), (x + w, y + h), (0, 255, 0), 2)
            cv2.putText(img, f"{barcode_type}: {barcode_data}", (x, y - 10), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
            
            debug_path = os.path.join(image_dir, f"barcode_detected_{timestamp}.jpg")
            cv2.imwrite(debug_path, img)
            print(f"Annotated image saved to {debug_path}")
            
        except Exception as e:
            print(f"ERROR: Error processing image: {str(e)}")
            import traceback
            traceback.print_exc()
            return {"success": False, "error": f"Error processing image: {str(e)}"}
        
        # 4) Fetch product details from Open Food Facts API
        try:
            product_info = get_product_info(barcode_data)
            
            if not product_info:
                print(f"Product not found for barcode: {barcode_data}")
                return {"success": False, "error": "Product not found in database"}
            
            print(f"Product found: {product_info['name']}")
            
            # 5) Get healthier alternatives
            alternatives = []
            
            # Check if product is available in India
            available_in_india = "en:india" in product_info.get("available_countries", [])
            
            if "category" in product_info:
                # Try to get alternatives from Open Food Facts
                alternatives = get_alternatives(product_info["category"])
            
            # If no alternatives found or not available in India, use Gemini
            if not alternatives:
                alternatives = fetch_alternatives_using_gemini(
                    product_info["name"], 
                    product_info.get("category", "food")
                )
            
            # Clean up the product info
            if product_info["name"] == "N/A" and product_info["brand"] != "N/A":
                product_info["name"] = f"Product by {product_info['brand']}"
            elif product_info["brand"] == "N/A" and product_info["name"] != "N/A":
                product_info["brand"] = "Unknown Brand"
            
            # Clean up alternatives
            for alt in alternatives:
                if alt["name"] == "Unknown":
                    alt["name"] = "Alternative Product"
                if alt["brand"] == "Unknown":
                    alt["brand"] = "Popular Brand"
                if alt["brand"] == "Recommended by AI":
                    alt["brand"] = "Popular Brand"
            
            return {
                "success": True,
                "barcode": barcode_data,
                "type": barcode_type,
                "product": product_info,
                "alternatives": alternatives[:5],  # Limit to top 5
                "available_in_india": available_in_india
            }
            
        except Exception as e:
            print(f"ERROR: Error fetching product info: {str(e)}")
            import traceback
            traceback.print_exc()
            return {"success": False, "error": f"Error fetching product info: {str(e)}"}
        
    except Exception as e:
        print(f"CRITICAL ERROR: Unexpected error in barcode scanning: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"success": False, "error": f"Unexpected error: {str(e)}"}

# Helper function to get product info from Open Food Facts
def get_product_info(barcode):
    url = f"https://world.openfoodfacts.org/api/v2/product/{barcode}.json"
    response = requests.get(url)
    
    if response.status_code == 200:
        data = response.json()
        if data.get("status") == 1:
            product = data["product"]
            nutrients = product.get("nutriments", {})
            
            # Extract available countries
            countries_tags = product.get("countries_tags", [])
            
            return {
                "name": product.get("product_name", "N/A"),
                "brand": product.get("brands", "N/A"),
                "image": product.get("image_url", ""),
                "category": product.get("categories", "N/A"),
                "available_countries": countries_tags,
                "servingSize": product.get("serving_size", "N/A"),
                "calories": nutrients.get("energy-kcal_100g", 0),
                "protein": nutrients.get("proteins_100g", 0),
                "carbs": nutrients.get("carbohydrates_100g", 0),
                "fat": nutrients.get("fat_100g", 0),
                "sugar": nutrients.get("sugars_100g", 0),
                "fiber": nutrients.get("fiber_100g", 0),
                "sodium": nutrients.get("sodium_100g", 0)
            }
    return None

# Function to fetch healthier alternatives available in India
def get_alternatives(category):
    try:
        # Clean up category string to create a valid URL
        category_tag = category.split(",")[0].strip().replace(" ", "-").lower()
        url = f"https://world.openfoodfacts.org/category/{category_tag}/india.json"
        
        response = requests.get(url)
        alternatives = []
        
        if response.status_code == 200:
            data = response.json()
            for product in data.get("products", []):
                if "en:india" in product.get("countries_tags", []):
                    alternatives.append({
                        "name": product.get("product_name", "Unknown"),
                        "brand": product.get("brands", "Unknown"),
                        "barcode": product.get("code", "N/A"),
                        "image": product.get("image_url", "")
                    })
        
        return alternatives[:5]  # Return top 5 alternatives
    except Exception as e:
        print(f"Error getting alternatives: {str(e)}")
        return []

# Function to fetch healthier alternatives using Gemini AI
def fetch_alternatives_using_gemini(product_name, category):
    try:
        prompt = f"List only the top 5 healthier alternative products available in India for the category '{category}' without extra information. Provide only product names nothing extra."
        
        chat = model.start_chat()
        response = chat.send_message(prompt)
        
        # Parse the response into structured data
        alternatives = []
        for line in response.text.strip().split('\n'):
            line = line.strip()
            if not line or line.startswith('Here') or line.startswith('These'):
                continue
                
            # Remove numbering if present
            if line[0].isdigit() and '.' in line[:3]:
                line = line.split('.', 1)[1].strip()
            
            # Remove any bullet points
            line = line.lstrip('-*•').strip()
            
            if line:
                alternatives.append({
                    "name": line,
                    "brand": "Popular Brand",
                    "barcode": "N/A",
                    "image": ""
                })
        
        return alternatives
    except Exception as e:
        print(f"Error with Gemini API: {str(e)}")
        return []

# ------------------- FOOD DETECTION ENDPOINT -------------------
@app.post("/food-detect")
async def detect_food(request: ImageRequest):
    try:
        print("\n----- FOOD DETECTION REQUEST RECEIVED -----")
        
        # Check if food model is available
        if food_model is None:
            print("ERROR: Food detection model not loaded")
            return {"success": False, "error": "Food detection model not loaded"}
        
        # 1) Decode the base64 image
        try:
            image_data = base64.b64decode(request.imageBase64)
            print(f"Image decoded successfully, size: {len(image_data)} bytes")
        except Exception as e:
            print(f"ERROR: Invalid image data: {str(e)}")
            return {"success": False, "error": f"Invalid image data: {str(e)}"}
        
        # 2) Save image to disk for debugging
        image_dir = os.path.join(current_dir, "captured_images")
        os.makedirs(image_dir, exist_ok=True)
        timestamp = int(time.time())
        image_path = os.path.join(image_dir, f"food_image_{timestamp}.jpg")
        with open(image_path, "wb") as f:
            f.write(image_data)
        print(f"Image saved to {image_path}")
        
        # 3) Preprocess the image
        try:
            image_pil = Image.open(image_path).convert('RGB')
            print(f"Image opened, size: {image_pil.size}")
            
            # Apply image enhancement techniques
            enhancer = ImageEnhance.Contrast(image_pil)
            image_pil = enhancer.enhance(1.5)  # Increase contrast by 50%
            
            enhancer = ImageEnhance.Sharpness(image_pil)
            image_pil = enhancer.enhance(1.5)  # Increase sharpness by 50%
            
            enhancer = ImageEnhance.Color(image_pil)
            image_pil = enhancer.enhance(1.2)  # Increase color saturation by 20%
            
            # Save enhanced image for debugging
            enhanced_path = os.path.join(image_dir, f"enhanced_{timestamp}.jpg")
            image_pil.save(enhanced_path)
            print(f"Enhanced image saved to {enhanced_path}")
            
            # Preprocess for PyTorch model
            preprocess = transforms.Compose([
                transforms.Resize((384, 384)),
                transforms.ToTensor(),
                transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD)
            ])
            
            # Move tensor to the same device as the model
            image_tensor = preprocess(image_pil).unsqueeze(0).to(device)
            print(f"Image preprocessed, tensor shape: {image_tensor.shape}, device: {image_tensor.device}")
            
            # Run inference with PyTorch model
            with torch.no_grad():
                outputs = food_model(image_tensor)
                probabilities = torch.nn.functional.softmax(outputs, dim=1)
                
                # Top-1
                conf, pred_idx = torch.max(probabilities, 1)
                predicted_idx = pred_idx.item()
                confidence_value = conf.item()
                
                print(f"Top prediction: Class {predicted_idx} with confidence {confidence_value:.4f}")
                
                # Top-3
                if class_names:
                    topk = min(3, len(class_names))
                else:
                    topk = 3
                top3_prob, top3_indices = torch.topk(probabilities, topk, dim=1)
                
                # Map indices to class names
                predictions = []
                if class_names:
                    for i in range(top3_indices.shape[1]):
                        idx = top3_indices[0][i].item()
                        conf_val = top3_prob[0][i].item() * 100
                        if idx < len(class_names):
                            pred_name = class_names[idx]
                        else:
                            pred_name = f"Class_{idx}"
                        predictions.append({"name": pred_name, "confidence": conf_val})
                        print(f"Prediction {i+1}: {pred_name} with confidence {conf_val:.2f}%")
                else:
                    # Fallback if no class_names
                    for i in range(top3_indices.shape[1]):
                        idx = top3_indices[0][i].item()
                        conf_val = top3_prob[0][i].item() * 100
                        predictions.append({"name": f"Class_{idx}", "confidence": conf_val})
                
                if predictions:
                    top_food = predictions[0]["name"]
                else:
                    top_food = "Unknown Food"
            
            # Get nutrition data from CSV instead of hardcoded dictionary
            if nutrition_df is not None:
                # Clean up food name for matching (remove spaces, lowercase)
                top_food_clean = top_food.lower().replace(' ', '_')
                
                # Try to find the food in the nutrition dataframe
                food_row = nutrition_df[nutrition_df['Dish'].str.lower() == top_food_clean]
                
                if not food_row.empty:
                    # Food found in nutrition data
                    nutrition = {
                        "calories": int(food_row['Calories (kcal)'].values[0]),
                        "protein": int(food_row['Protein (g)'].values[0]),
                        "carbs": int(food_row['Carbohydrates (g)'].values[0]),
                        "fat": int(food_row['Fat (g)'].values[0])
                    }
                    print(f"Found nutrition data for {top_food} in CSV: {nutrition}")
                else:
                    # Try fuzzy matching if exact match fails
                    from difflib import get_close_matches
                    all_dishes = nutrition_df['Dish'].str.lower().tolist()
                    matches = get_close_matches(top_food_clean, all_dishes, n=1, cutoff=0.6)
                    
                    if matches:
                        closest_match = matches[0]
                        food_row = nutrition_df[nutrition_df['Dish'].str.lower() == closest_match]
                        nutrition = {
                            "calories": int(food_row['Calories (kcal)'].values[0]),
                            "protein": int(food_row['Protein (g)'].values[0]),
                            "carbs": int(food_row['Carbohydrates (g)'].values[0]),
                            "fat": int(food_row['Fat (g)'].values[0])
                        }
                        print(f"Found close match '{closest_match}' for '{top_food}' in CSV: {nutrition}")
                    else:
                        # Fallback to zeros if no match found
                        nutrition = {"calories": 0, "protein": 0, "carbs": 0, "fat": 0}
                        print(f"No nutrition data found for {top_food} in CSV")
            else:
                # Fallback to zeros if nutrition data not loaded
                nutrition = {"calories": 0, "protein": 0, "carbs": 0, "fat": 0}
                print(f"No nutrition database available for {top_food}")
            
            response_data = {
                "success": True,
                "food": {
                    "name": top_food,
                    "calories": nutrition["calories"],
                    "protein": nutrition["protein"],
                    "carbs": nutrition["carbs"],
                    "fat": nutrition["fat"]
                }
            }
            print(f"Returning response: {response_data}")
            return response_data
            
        except Exception as e:
            print(f"ERROR: Error processing image: {str(e)}")
            import traceback
            traceback.print_exc()
            return {"success": False, "error": f"Error processing image: {str(e)}"}
        
    except Exception as e:
        print(f"CRITICAL ERROR: Unexpected error in food detection: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"success": False, "error": f"Unexpected error: {str(e)}"}

# ------------------- MEAL PLANNER ENDPOINT -------------------
class CalorieRequest(BaseModel):
    target_calories: int = 2000

@app.post("/meal-plan")
async def create_meal_plan(request: CalorieRequest):
    try:
        # Get the absolute path to the data directory
        BASE_DIR = os.path.dirname(os.path.abspath(__file__))
        DATA_DIR = os.path.join(BASE_DIR, "data")
        
        # Use absolute paths for the CSV files
        dishes_csv = os.path.join(DATA_DIR, "nutrition_data.csv")
        history_csv = os.path.join(DATA_DIR, "food.csv")
        
        # Check if files exist
        if not os.path.exists(dishes_csv):
            raise HTTPException(status_code=500, detail=f"File not found: {dishes_csv}")
        if not os.path.exists(history_csv):
            raise HTTPException(status_code=500, detail=f"File not found: {history_csv}")
        
        meal_plan = generate_meal_plan(
            dishes_csv=dishes_csv,
            history_csv=history_csv,
            target_calories=request.target_calories
        )
        return meal_plan
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ------------------- MAIN -------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)