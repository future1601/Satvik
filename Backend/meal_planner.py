import pandas as pd
import random

def generate_meal_plan(dishes_csv, history_csv, target_calories):
    # Load the dishes dataset
    dishes_df = pd.read_csv(dishes_csv)
    
    # Load the user's past food history
    history_df = pd.read_csv(history_csv)
    
    # Ensure correct column names
    if 'Food' in history_df.columns:
        history_df.rename(columns={'Food': 'Dish'}, inplace=True)
    
    # Calculate past average protein intake
    past_protein = history_df['Protein'].mean()
    target_protein = past_protein * 1.2  # Increase protein intake by 20%
    
    # Identify user's most frequently eaten dishes
    favorite_dishes = history_df['Dish'].value_counts().index.tolist()
    
    # Prioritize favorite dishes in meal selection
    dishes_df['Preference'] = dishes_df['Dish'].apply(lambda x: 1 if x in favorite_dishes else 0)
    dishes_df = dishes_df.sort_values(by='Preference', ascending=False)
    
    # Shuffle the dataset slightly to add variation
    dishes_df = dishes_df.sample(frac=1, random_state=42).reset_index(drop=True)
    
    # Initialize meal plan
    meal_plan = {"Breakfast": [], "Lunch": [], "Dinner": []}
    remaining_calories = target_calories
    remaining_protein = target_protein
    
    # Function to select dishes for each meal
    def select_meal(meal_name, calorie_limit, protein_limit):
        nonlocal remaining_calories, remaining_protein
        meal_items = []
        meal_calories = 0
        meal_protein = 0
        
        for _, row in dishes_df.iterrows():
            if meal_calories + row['Calories (kcal)'] <= calorie_limit and meal_protein + row['Protein (g)'] <= protein_limit:
                meal_items.append(row.to_dict())
                meal_calories += row['Calories (kcal)']
                meal_protein += row['Protein (g)']
                remaining_calories -= row['Calories (kcal)']
                remaining_protein -= row['Protein (g)']
                
            if meal_calories >= calorie_limit * 0.95 and meal_protein >= protein_limit * 0.95:  # Try to fill at least 95%
                break
        
        meal_plan[meal_name] = meal_items
    
    # Allocate calories and protein to meals (approximate ratio: 25% breakfast, 40% lunch, 35% dinner)
    select_meal("Breakfast", target_calories * 0.25, target_protein * 0.25)
    select_meal("Lunch", target_calories * 0.40, target_protein * 0.40)
    select_meal("Dinner", remaining_calories, remaining_protein)  # Use remaining for dinner
    
    return meal_plan