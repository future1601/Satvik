import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Image, TouchableOpacity } from 'react-native';

// Mock data for meals
const meals = [
  {
    meal: "Breakfast",
    dish: "Biryani",
    calories: 350,
    portion: 1,
    carbs: 8,
    protein: 16,
    fat: 6
  },
  {
    meal: "Lunch",
    dish: "Paneer Masala",
    calories: 427,
    portion: 1,
    carbs: 8,
    protein: 16,
    fat: 6
  },
  {
    meal: "Dinner",
    dish: "Pasta",
    calories: 427,
    portion: 1,
    carbs: 8,
    protein: 16,
    fat: 6
  }
];

// Mock data for days
const days = ['S', 'S', 'M', 'T', 'W', 'T', 'F'];
const dates = [8, 9, 10, 11, 12, 13, 14]; // Adding date numbers
const currentDay = 1; // Wednesday (0-indexed)
const currentMonth = "March 2025"; // Updated month and year

const InsightsScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Insights</Text>
      </View>
      
      <View style={styles.header}>
        <Text style={styles.monthYear}>{currentMonth}</Text>
        <View style={styles.calendarContainer}>
          <View style={styles.daysContainer}>
            {days.map((day, index) => (
              <View key={index} style={styles.dayItem}>
                <Text style={styles.dayText}>{day}</Text>
              </View>
            ))}
          </View>
          
          <View style={styles.datesContainer}>
            {dates.map((date, index) => (
              <View 
                key={index} 
                style={[
                  styles.dateItem, 
                  index === currentDay && styles.currentDateItem
                ]}
              >
                <Text 
                  style={[
                    styles.dateNumber,
                    index === currentDay && styles.currentDateNumber
                  ]}
                >
                  {date}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
      
      <ScrollView style={styles.scrollView}>
        {meals.map((meal, index) => (
          <View key={index} style={styles.mealCard}>
            <View style={styles.mealCardHeader}>
              <View style={styles.mealTitleContainer}>
                <Text style={styles.mealType}>{meal.meal}</Text>
                <Text style={styles.mealCalories}>{meal.calories} Kcal</Text>
              </View>
              <TouchableOpacity style={styles.addButton}>
                <Text style={styles.addButtonText}>+</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.mealContent}>
              <Image 
                source={require('../../assets/salad.png')} 
                style={styles.mealIcon} 
              />
              <View style={styles.dishContainer}>
                <Text style={styles.dishName}>{meal.dish}</Text>
                <Text style={styles.dishCalories}>{meal.calories} Kcal</Text>
                <Text style={styles.portion}>{meal.portion} Portion</Text>
              </View>
            </View>
            
            <View style={styles.macrosContainer}>
              <View style={styles.macroLabelsContainer}>
                <View style={styles.macroLabelItem}>
                  <View style={[styles.macroIndicator, styles.carbsIndicator]} />
                  <Text style={styles.macroText}>{meal.carbs}% carbs</Text>
                </View>
                
                <View style={styles.macroLabelItem}>
                  <View style={[styles.macroIndicator, styles.proteinIndicator]} />
                  <Text style={styles.macroText}>{meal.protein}% protein</Text>
                </View>
                
                <View style={styles.macroLabelItem}>
                  <View style={[styles.macroIndicator, styles.fatIndicator]} />
                  <Text style={styles.macroText}>{meal.fat}% fat</Text>
                </View>
              </View>
              
              <View style={styles.macroBarsContainer}>
                <View style={[styles.macroBar, styles.carbsBar, { flex: meal.carbs }]} />
                <View style={[styles.macroBar, styles.proteinBar, { flex: meal.protein }]} />
                <View style={[styles.macroBar, styles.fatBar, { flex: meal.fat }]} />
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  titleContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  monthYear: {
    fontSize: 18,
    marginBottom: 12,
  },
  calendarContainer: {
    backgroundColor: '#F2F2F2',
    borderRadius: 8,
    padding: 8,
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  datesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayItem: {
    alignItems: 'center',
    width: 40,
  },
  dateItem: {
    alignItems: 'center',
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  currentDateItem: {
    backgroundColor: '#222',
    borderRadius: 8,
  },
  dayText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
  },
  dateNumber: {
    fontSize: 16,
    color: '#888',
  },
  currentDateNumber: {
    color: 'white',
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  mealCard: {
    backgroundColor: '#2B2B2B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  mealCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  mealTitleContainer: {
    flex: 1,
  },
  mealType: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  mealCalories: {
    color: '#AAAAAA',
    fontSize: 14,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 24,
    color: '#2B2B2B',
    fontWeight: 'bold',
    lineHeight: 24,
  },
  mealContent: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  mealIcon: {
    width: 70,
    height: 70,
    borderRadius: 8,
    marginRight: 16,
  },
  dishContainer: {
    justifyContent: 'center',
  },
  dishName: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  dishCalories: {
    color: '#AAAAAA',
    fontSize: 14,
    marginBottom: 2,
  },
  portion: {
    color: '#AAAAAA',
    fontSize: 14,
  },
  macrosContainer: {
    marginTop: 8,
  },
  macroLabelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  macroLabelItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  macroIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  carbsIndicator: {
    backgroundColor: '#5D5FEF',
  },
  proteinIndicator: {
    backgroundColor: '#FF9F29',
  },
  fatIndicator: {
    backgroundColor: '#FF5757',
  },
  macroText: {
    color: '#AAAAAA',
    fontSize: 12,
  },
  macroBarsContainer: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  macroBar: {
    height: 6,
  },
  carbsBar: {
    backgroundColor: '#5D5FEF',
  },
  proteinBar: {
    backgroundColor: '#FF9F29',
  },
  fatBar: {
    backgroundColor: '#FF5757',
  },
});

export default InsightsScreen;
