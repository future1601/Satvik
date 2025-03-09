import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  ScrollView,
  SafeAreaView
} from 'react-native';

// Update the API_BASE_URL to use your machine's IP address instead of localhost
const API_BASE_URL = 'http://192.168.239.147:8000'; // For Android emulator
// OR
// const API_BASE_URL = 'http://127.0.0.1:8000'; // For iOS simulator
// OR
// const API_BASE_URL = 'http://YOUR_MACHINE_IP:8000'; // Replace with your actual IP address

interface Dish {
  Dish: string;
  "Calories (kcal)": number;
  "Protein (g)": number;
  "Fat (g)": number;
  "Carbohydrates (g)": number;
}

interface MealPlan {
  Breakfast: Dish[];
  Lunch: Dish[];
  Dinner: Dish[];
}

const ExtraScreen: React.FC = () => {
  const [calorieGoal, setCalorieGoal] = useState('');
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGeneratePlan = async () => {
    if (!calorieGoal || isNaN(parseInt(calorieGoal))) {
      setError('Please enter a valid calorie goal');
      return;
    }

    setLoading(true);
    setError(null);
    setMealPlan(null);

    try {
      const response = await fetch(`${API_BASE_URL}/meal-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_calories: parseInt(calorieGoal) })
      });

      if (!response.ok) {
        throw new Error(`Failed to generate plan: ${response.statusText}`);
      }

      const data = await response.json();
      setMealPlan(data);
    } catch (err: any) {
      setError(err.message || 'Failed to generate meal plan');
    } finally {
      setLoading(false);
    }
  };

  const renderMealCard = (mealName: keyof MealPlan) => {
    if (!mealPlan) {
      return (
        <View style={styles.mealCard}>
          <Text style={styles.mealTitle}>{mealName}</Text>
        </View>
      );
    }

    const dishes = mealPlan[mealName] || [];
    const totalCalories = dishes.reduce((acc, dish) => acc + dish["Calories (kcal)"], 0);
    const totalProtein = dishes.reduce((acc, dish) => acc + dish["Protein (g)"], 0);

    return (
      <View style={styles.mealCard}>
        <Text style={styles.mealTitle}>{mealName}</Text>
        
        {mealPlan && dishes.length > 0 && (
          <>
            {dishes.map((dish, index) => (
              <View key={index} style={styles.dishItem}>
                <Text style={styles.dishName}>{dish.Dish}</Text>
                <Text style={styles.dishDetails}>
                  {dish["Calories (kcal)"]} kcal | {dish["Protein (g)"]}g protein | 
                  {dish["Fat (g)"]}g fat | {dish["Carbohydrates (g)"]}g carbs
                </Text>
              </View>
            ))}
            
            <View style={styles.mealSummary}>
              <Text style={styles.summaryText}>
                Total: {totalCalories.toFixed(0)} kcal | {totalProtein.toFixed(0)}g protein
              </Text>
            </View>
          </>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Custom Meal Planner</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Enter your Today calorie goal:</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={calorieGoal}
            onChangeText={setCalorieGoal}
            placeholder="e.g. 2000"
          />
        </View>
        
        <Text style={styles.description}>
          Here's your custom meal plan for the day! Based on your calorie goal, we've crafted a balanced meal plan that
          prioritizes your favorite dishes while boosting your protein intake. Let's get started!
        </Text>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={handleGeneratePlan}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Get Meal Plan</Text>
        </TouchableOpacity>
        
        {loading && (
          <ActivityIndicator size="large" color="#333" style={styles.loader} />
        )}
        
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}
        
        <View style={styles.mealsContainer}>
          {renderMealCard("Breakfast")}
          {renderMealCard("Lunch")}
          {renderMealCard("Dinner")}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#2B2B2B',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loader: {
    marginVertical: 20,
  },
  errorText: {
    color: 'red',
    marginBottom: 20,
  },
  mealsContainer: {
    marginTop: 10,
  },
  mealCard: {
    backgroundColor: '#2B2B2B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  mealTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  dishItem: {
    marginBottom: 10,
  },
  dishName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  dishDetails: {
    color: '#AAAAAA',
    fontSize: 14,
  },
  mealSummary: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#444',
  },
  summaryText: {
    color: 'white',
    fontWeight: 'bold',
  }
});

export default ExtraScreen;
