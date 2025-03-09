// FoodRecognitionScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  Image,
  Button
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { CameraType } from 'expo-camera/build/Camera.types';
import { MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { auth, firestore } from '../firebaseConfig';
import { doc, setDoc, Timestamp } from 'firebase/firestore';

// Define the navigation type
type ScanStackParamList = {
  ScanOptions: undefined;
  BarcodeScanner: undefined;
  FoodRecognition: undefined;
};

type FoodRecognitionScreenNavigationProp = NavigationProp<ScanStackParamList>;

// API base URL - replace with your backend URL
const API_BASE_URL = 'http://192.168.239.147:8000';

const FoodRecognitionScreen: React.FC = () => {
  const [hasPermission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [recognizedFood, setRecognizedFood] = useState<any>(null);
  const cameraRef = useRef<CameraView>(null);
  const navigation = useNavigation<FoodRecognitionScreenNavigationProp>();
  const [isLoading, setIsLoading] = useState(false);

  if (!hasPermission) {
    // Camera permissions are still loading.
    return <View />;
  }

  if (!hasPermission.granted) {
    // Camera permissions are not granted yet.
    return (
      <View style={styles.container}>
        <Text style={styles.text}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="Grant Permission" />
      </View>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current) {
      setIsLoading(true);
      try {
        // Use maximum quality and resolution
        const photo = await cameraRef.current.takePictureAsync({
          quality: 1,
          base64: true,
          exif: false,
          skipProcessing: false, // Enable image processing
          // Set higher resolution if available
          imageWidth: 1920,
          imageHeight: 1080,
        });
        
        console.log("Photo taken with dimensions:", photo.width, "x", photo.height);
        
        if (photo.base64) {
          await recognizeFood(photo.base64);
        } else {
          // If base64 is not available, we need to read the file and convert it
          console.log("Base64 not available, reading from URI");
          const response = await fetch(photo.uri);
          const blob = await response.blob();
          const reader = new FileReader();
          reader.onload = async () => {
            const base64data = reader.result?.toString().split(',')[1];
            if (base64data) {
              await recognizeFood(base64data);
            }
          };
          reader.readAsDataURL(blob);
        }
      } catch (error) {
        console.error("Error taking picture:", error);
        setIsLoading(false);
        Alert.alert("Error", "Failed to take picture. Please try again.");
      }
    }
  };

  const recognizeFood = async (base64Data: string) => {
    try {
      console.log("Sending image to backend for food detection...");
      setIsLoading(true);
      
      // Send to backend
      const response = await fetch(`${API_BASE_URL}/food-detect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Data })
      });
      
      console.log("Response status:", response.status);
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log("Result from server:", JSON.stringify(result));
      
      if (result.success && result.food) {
        // Set the captured image
        setCapturedImage(`data:image/jpeg;base64,${base64Data}`);
        
        // Set the recognized food with all nutrition data
        setRecognizedFood({
          name: result.food.name,
          calories: result.food.calories,
          protein: result.food.protein,
          carbs: result.food.carbs,
          fat: result.food.fat
        });
        
        // Save to Firestore if user is logged in
        if (auth.currentUser) {
          const userId = auth.currentUser.uid;
          const now = new Date();
          const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
          
          // Determine meal type based on time of day
          const hour = now.getHours();
          let mealType = 'b'; // breakfast
          if (hour >= 11 && hour < 15) {
            mealType = 'l'; // lunch
          } else if (hour >= 15) {
            mealType = 'd'; // dinner
          }
          
          // Reference to the meals document for this date
          const mealsRef = doc(firestore, `users/${userId}/meals/${dateStr}`);
          
          // Add the recognized food to the appropriate meal
          await setDoc(mealsRef, {
            [mealType]: {
              food: result.food.name,
              calories: result.food.calories || 0,
              protein_g: result.food.protein || 0,
              carbs_g: result.food.carbs || 0,
              fats_g: result.food.fat || 0,
              timestamp: Timestamp.now()
            }
          }, { merge: true });
        }
      } else {
        console.log("Food not recognized. Error:", result.error);
        Alert.alert(
          "Food Not Recognized",
          "We couldn't identify this food. Please try again or take a clearer photo.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error("Error recognizing food:", error);
      Alert.alert(
        "Error",
        `An error occurred: ${error.message}. Please try again.`,
        [{ text: "OK" }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const resetCamera = () => {
    setCapturedImage(null);
    setRecognizedFood(null);
  };

  if (capturedImage && recognizedFood) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: capturedImage }} style={styles.resultImage} />
        
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>{recognizedFood.name}</Text>
          
          <View style={styles.nutritionContainer}>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>{recognizedFood.calories || 0}</Text>
              <Text style={styles.nutritionLabel}>Calories</Text>
            </View>
            
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>{recognizedFood.protein || 0}g</Text>
              <Text style={styles.nutritionLabel}>Protein</Text>
            </View>
            
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>{recognizedFood.carbs || 0}g</Text>
              <Text style={styles.nutritionLabel}>Carbs</Text>
            </View>
            
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>{recognizedFood.fat || 0}g</Text>
              <Text style={styles.nutritionLabel}>Fat</Text>
            </View>
          </View>
          
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.secondaryButton} onPress={resetCamera}>
              <Text style={styles.secondaryButtonText}>Try Again</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.primaryButton} 
              onPress={() => {
                // Show success alert before navigating back
                Alert.alert(
                  "Food Recognized",
                  `${recognizedFood.name} has been added to your meal log.`,
                  [{ text: "OK", onPress: () => navigation.goBack() }]
                );
              }}
            >
              <Text style={styles.primaryButtonText}>Save & Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
      >
        <View style={styles.overlay}>
          <View style={styles.scanFrame} />
        </View>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => {
              try {
                if (navigation && navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  // Fallback to navigating to ScanOptions directly
                  navigation.navigate('ScanOptions');
                }
              } catch (error) {
                // If all else fails, try to navigate to the main scan screen
                console.log('Navigation error:', error);
                navigation.navigate('ScanOptions');
              }
            }}
          >
            <MaterialIcons name="arrow-back" size={28} color="#fff" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.captureButton, scanning && styles.disabledButton]} 
            onPress={takePicture}
            disabled={scanning}
          >
            {scanning ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <MaterialIcons name="camera" size={36} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
        
        <View style={styles.instructionContainer}>
          <Text style={styles.instructionText}>
            Position the food in the center of the frame and tap the camera button
          </Text>
        </View>
      </CameraView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 280,
    height: 280,
    borderWidth: 2,
    borderColor: '#00CCBB',
    backgroundColor: 'transparent',
    borderRadius: 20,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    padding: 10,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#00CCBB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#999',
  },
  instructionContainer: {
    position: 'absolute',
    bottom: 160,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionText: {
    color: '#fff',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 8,
    maxWidth: '80%',
  },
  text: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#00CCBB',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  resultImage: {
    width: '100%',
    height: '50%',
  },
  resultContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
    padding: 20,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  nutritionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  nutritionItem: {
    alignItems: 'center',
  },
  nutritionValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00CCBB',
  },
  nutritionLabel: {
    fontSize: 14,
    color: '#666',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  primaryButton: {
    backgroundColor: '#00CCBB',
    padding: 15,
    borderRadius: 8,
    flex: 1,
    marginLeft: 10,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default FoodRecognitionScreen;