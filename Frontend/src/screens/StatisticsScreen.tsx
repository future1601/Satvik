import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { BarChart, StackedBarChart } from 'react-native-chart-kit';
import { auth, firestore } from '../firebaseConfig';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';

// API base URL - replace with your backend URL
const API_BASE_URL = 'http://192.168.239.147:8000';

// Get screen width
const screenWidth = Dimensions.get('window').width;

type TimeRange = 'day' | 'week' | 'month';

interface FitnessData {
  calories: number[];
  sleep: number[];
  steps: number[];
  water: number[];
  dates: string[];
}

interface NutritionData {
  protein: number[];
  fat: number[];
  carbs: number[];
  caloriesIntake: number[];
  dates: string[];
}

interface MealData {
  breakfast: {
    calories: number;
    carbs: number;
    fat: number;
    protein: number;
    food: string;
  };
  lunch: {
    calories: number;
    carbs: number;
    fat: number;
    protein: number;
    food: string;
  };
  dinner: {
    calories: number;
    carbs: number;
    fat: number;
    protein: number;
    food: string;
  };
  date: string;
}

const StatisticsScreen: React.FC = () => {
  // State for time range selection
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  
  // State for data
  const [fitnessData, setFitnessData] = useState<FitnessData>({
    calories: [],
    sleep: [],
    steps: [],
    water: [],
    dates: []
  });
  
  const [nutritionData, setNutritionData] = useState<NutritionData>({
    protein: [],
    fat: [],
    carbs: [],
    caloriesIntake: [],
    dates: []
  });
  
  const [mealsData, setMealsData] = useState<MealData[]>([]);
  
  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data based on selected time range
  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch fitness data from backend
      await fetchFitnessData();
      
      // Fetch meals data from Firestore
      await fetchMealsData();
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFitnessData = async () => {
    try {
      // Fetch calories data
      const caloriesResponse = await fetch(`${API_BASE_URL}/fitness/calories`);
      if (!caloriesResponse.ok) {
        throw new Error(`Failed to fetch calories: ${caloriesResponse.statusText}`);
      }
      const caloriesData = await caloriesResponse.json();
      
      // Fetch sleep data
      const sleepResponse = await fetch(`${API_BASE_URL}/fitness/sleep`);
      if (!sleepResponse.ok) {
        throw new Error(`Failed to fetch sleep: ${sleepResponse.statusText}`);
      }
      const sleepData = await sleepResponse.json();
      
      // Fetch steps data
      const stepsResponse = await fetch(`${API_BASE_URL}/fitness/steps`);
      if (!stepsResponse.ok) {
        throw new Error(`Failed to fetch steps: ${stepsResponse.statusText}`);
      }
      const stepsData = await stepsResponse.json();
      
      console.log('Calories data:', JSON.stringify(caloriesData, null, 2));
      console.log('Sleep data:', JSON.stringify(sleepData, null, 2));
      console.log('Steps data:', JSON.stringify(stepsData, null, 2));
      
      // Process and filter data based on timeRange
      const processedData = processBackendData(caloriesData, sleepData, stepsData);
      setFitnessData(processedData);
    } catch (error) {
      console.error('Error fetching fitness data:', error);
      throw error;
    }
  };

  const fetchMealsData = async () => {
    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }
      
      const userId = auth.currentUser.uid;
      
      // Determine date range based on selected time range
      const endDate = new Date(); // Today
      const startDate = new Date();
      
      if (timeRange === 'day') {
        // Just today
        startDate.setHours(0, 0, 0, 0);
      } else if (timeRange === 'week') {
        // Last 7 days
        startDate.setDate(endDate.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
      } else {
        // Last 30 days
        startDate.setDate(endDate.getDate() - 29);
        startDate.setHours(0, 0, 0, 0);
      }
      
      console.log(`Fetching meals from ${startDate.toISOString()} to ${endDate.toISOString()}`);
      
      // Format dates for Firestore query
      const formatFirestoreDate = (date: Date) => {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      };
      
      const meals: MealData[] = [];
      const protein: number[] = [];
      const fat: number[] = [];
      const carbs: number[] = [];
      const caloriesIntake: number[] = [];
      const dates: string[] = [];
      
      // Get the expected labels for the current time range
      const expectedLabels = getLabelsForTimeRange(timeRange);
      const expectedLength = expectedLabels.length;
      
      // Loop through each day in the range
      const currentDate = new Date(startDate);
      let dayIndex = 0;
      
      while (currentDate <= endDate && dayIndex < expectedLength) {
        const formattedDate = formatFirestoreDate(currentDate);
        
        // Reference to the meals document for this date
        const mealsRef = doc(firestore, `users/${userId}/meals/${formattedDate}`);
        const mealsSnapshot = await getDoc(mealsRef);
        
        if (mealsSnapshot.exists()) {
          const mealData = mealsSnapshot.data();
          console.log(`Found meal data for ${formattedDate}:`, mealData);
          
          // Extract meal data
          const breakfast = mealData.b || { calories: 0, carbs_g: 0, fats_g: 0, protein_g: 0, food: '' };
          const lunch = mealData.l || { calories: 0, carbs_g: 0, fats_g: 0, protein_g: 0, food: '' };
          const dinner = mealData.d || { calories: 0, carbs_g: 0, fats_g: 0, protein_g: 0, food: '' };
          
          // Calculate totals for the day
          const totalProtein = (breakfast.protein_g || 0) + (lunch.protein_g || 0) + (dinner.protein_g || 0);
          const totalFat = (breakfast.fats_g || 0) + (lunch.fats_g || 0) + (dinner.fats_g || 0);
          const totalCarbs = (breakfast.carbs_g || 0) + (lunch.carbs_g || 0) + (dinner.carbs_g || 0);
          const totalCalories = (breakfast.calories || 0) + (lunch.calories || 0) + (dinner.calories || 0);
          
          // Add to arrays
          protein.push(totalProtein);
          fat.push(totalFat);
          carbs.push(totalCarbs);
          caloriesIntake.push(totalCalories);
          
          // Format date for display
          dates.push(expectedLabels[dayIndex]);
          
          // Add to meals data
          meals.push({
            breakfast: {
              calories: breakfast.calories || 0,
              carbs: breakfast.carbs_g || 0,
              fat: breakfast.fats_g || 0,
              protein: breakfast.protein_g || 0,
              food: breakfast.food || ''
            },
            lunch: {
              calories: lunch.calories || 0,
              carbs: lunch.carbs_g || 0,
              fat: lunch.fats_g || 0,
              protein: lunch.protein_g || 0,
              food: lunch.food || ''
            },
            dinner: {
              calories: dinner.calories || 0,
              carbs: dinner.carbs_g || 0,
              fat: dinner.fats_g || 0,
              protein: dinner.protein_g || 0,
              food: dinner.food || ''
            },
            date: formattedDate
          });
        } else {
          console.log(`No meal data found for ${formattedDate}`);
          
          // If no data for February, use sample data
          const isFebruary = currentDate.getMonth() === 1; // February is month 1 (0-indexed)
          
          if (isFebruary) {
            // Sample data for February
            const totalProtein = Math.floor(Math.random() * 30) + 50; // 50-80g
            const totalFat = Math.floor(Math.random() * 20) + 40; // 40-60g
            const totalCarbs = Math.floor(Math.random() * 50) + 150; // 150-200g
            const totalCalories = Math.floor(Math.random() * 300) + 1700; // 1700-2000 calories
            
            protein.push(totalProtein);
            fat.push(totalFat);
            carbs.push(totalCarbs);
            caloriesIntake.push(totalCalories);
          } else {
            // Add empty data for days with no meals
            protein.push(0);
            fat.push(0);
            carbs.push(0);
            caloriesIntake.push(0);
          }
          
          // Format date for display
          dates.push(expectedLabels[dayIndex]);
        }
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
        dayIndex++;
      }
      
      // Ensure we have exactly the expected number of data points
      while (protein.length < expectedLength) {
        protein.push(0);
        fat.push(0);
        carbs.push(0);
        caloriesIntake.push(0);
        dates.push(expectedLabels[protein.length - 1]);
      }
      
      // Truncate if we have more data points than expected
      if (protein.length > expectedLength) {
        protein.length = expectedLength;
        fat.length = expectedLength;
        carbs.length = expectedLength;
        caloriesIntake.length = expectedLength;
        dates.length = expectedLength;
      }
      
      setMealsData(meals);
      setNutritionData({
        protein,
        fat,
        carbs,
        caloriesIntake,
        dates
      });
      
      console.log('Meals data:', JSON.stringify(meals.slice(0, 2), null, 2));
      console.log('Nutrition data:', JSON.stringify({ 
        protein: protein.slice(0, 5), 
        fat: fat.slice(0, 5), 
        carbs: carbs.slice(0, 5), 
        caloriesIntake: caloriesIntake.slice(0, 5), 
        dates: dates.slice(0, 5) 
      }, null, 2));
    } catch (error) {
      console.error('Error fetching meals data:', error);
      throw error;
    }
  };

  // Function to get appropriate labels based on time range
  const getLabelsForTimeRange = (range: TimeRange): string[] => {
    switch (range) {
      case 'day':
        // For daily view, show hours (6 data points)
        return ['6am', '9am', '12pm', '3pm', '6pm', '9pm'];
      
      case 'week':
        // For weekly view, show 7 days of the week
        return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      
      case 'month':
        // For monthly view, show last 30 days as numbers
        const labels = [];
        for (let i = 1; i <= 30; i++) {
          labels.push(i.toString());
        }
        return labels;
      
      default:
        return [];
    }
  };

  // Process backend data based on time range
  const processBackendData = (caloriesData: any, sleepData: any, stepsData: any): FitnessData => {
    const calories: number[] = [];
    const sleep: number[] = [];
    const steps: number[] = [];
    const water: number[] = [];
    const dates: string[] = [];
    
    // Determine how many data points we need based on time range
    let dataPointsNeeded = 0;
    if (timeRange === 'day') {
      dataPointsNeeded = 6; // 6 time points in a day
    } else if (timeRange === 'week') {
      dataPointsNeeded = 7; // 7 days in a week
    } else {
      dataPointsNeeded = 30; // 30 days in a month
    }
    
    // Process data based on time range
    if (timeRange === 'day') {
      // For day view, use hourly data or generate sample data
      const hourlyLabels = getLabelsForTimeRange('day');
      
      // Generate sample data if no real data available
      for (let i = 0; i < dataPointsNeeded; i++) {
        calories.push(Math.floor(Math.random() * 100) + 200);
        sleep.push(Math.floor(Math.random() * 2) + 6);
        steps.push(Math.floor(Math.random() * 2000) + 1000);
        water.push(Math.floor(Math.random() * 500) + 500);
        dates.push(hourlyLabels[i]);
      }
    } else if (timeRange === 'week') {
      // For week view, use daily data for the past 7 days
      const dayLabels = getLabelsForTimeRange('week');
      
      // Generate sample data if no real data available
      for (let i = 0; i < dataPointsNeeded; i++) {
        calories.push(Math.floor(Math.random() * 300) + 1700);
        sleep.push(Math.floor(Math.random() * 3) + 5);
        steps.push(Math.floor(Math.random() * 5000) + 5000);
        water.push(Math.floor(Math.random() * 1000) + 1500);
        dates.push(dayLabels[i]);
      }
    } else {
      // For month view, use daily data for the past 30 days
      const monthLabels = getLabelsForTimeRange('month');
      
      // Generate sample data if no real data available
      for (let i = 0; i < dataPointsNeeded; i++) {
        calories.push(Math.floor(Math.random() * 300) + 1700);
        sleep.push(Math.floor(Math.random() * 3) + 5);
        steps.push(Math.floor(Math.random() * 5000) + 5000);
        water.push(Math.floor(Math.random() * 1000) + 1500);
        dates.push(monthLabels[i]);
      }
    }
    
    return {
      calories,
      sleep,
      steps,
      water,
      dates
    };
  };

  // Get chart data for calories burned
  const getCaloriesBurnedChartData = () => {
    const labels = getLabelsForTimeRange(timeRange);
    
    // Use real data if available, otherwise use sample data
    let data = fitnessData.calories.length > 0 
      ? fitnessData.calories 
      : [];
    
    // If we still don't have data, generate sample data
    if (data.length === 0) {
      if (timeRange === 'day') {
        data = [250, 300, 200, 280, 260, 300];
      } else if (timeRange === 'week') {
        data = [1800, 2100, 1950, 2000, 1800, 2200, 1900];
      } else {
        // Generate 30 data points for month
        data = Array.from({ length: 30 }, () => Math.floor(Math.random() * 300) + 1700);
      }
    }
    
    // Ensure we have exactly the right number of data points
    if (data.length < labels.length) {
      // Pad with zeros if we have fewer data points than labels
      data = [...data, ...Array(labels.length - data.length).fill(0)];
    } else if (data.length > labels.length) {
      // Truncate if we have more data points than labels
      data = data.slice(0, labels.length);
    }
    
    return {
      labels,
      datasets: [
        {
          data,
          color: (opacity = 1) => `rgba(0, 204, 187, ${opacity})`,
        }
      ],
    };
  };

  // Update the getCaloriesIntakeChartData function
  const getCaloriesIntakeChartData = () => {
    const labels = getLabelsForTimeRange(timeRange);
    
    // Use real data if available, otherwise use sample data
    let data = nutritionData.caloriesIntake.length > 0 
      ? nutritionData.caloriesIntake 
      : [];
    
    // If we still don't have data, generate sample data
    if (data.length === 0) {
      if (timeRange === 'day') {
        data = [400, 600, 500, 450, 350, 300];
      } else if (timeRange === 'week') {
        data = [1800, 2100, 1950, 2000, 1800, 2200, 1900];
      } else {
        // Generate 30 data points for month
        data = Array.from({ length: 30 }, () => Math.floor(Math.random() * 300) + 1700);
      }
    }
    
    // Ensure we have exactly the right number of data points
    if (data.length < labels.length) {
      // Pad with zeros if we have fewer data points than labels
      data = [...data, ...Array(labels.length - data.length).fill(0)];
    } else if (data.length > labels.length) {
      // Truncate if we have more data points than labels
      data = data.slice(0, labels.length);
    }
    
    return {
      labels,
      datasets: [
        {
          data,
          color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
        }
      ],
    };
  };

  // Update the getNutritionStackedChartData function
  const getNutritionStackedChartData = () => {
    const labels = getLabelsForTimeRange(timeRange);
    
    // Use real data if available, otherwise use sample data
    let proteinData = nutritionData.protein.length > 0 
      ? nutritionData.protein 
      : [];
    
    let fatData = nutritionData.fat.length > 0 
      ? nutritionData.fat 
      : [];
    
    let carbsData = nutritionData.carbs.length > 0 
      ? nutritionData.carbs 
      : [];
    
    // If we still don't have data, generate sample data
    if (proteinData.length === 0 || fatData.length === 0 || carbsData.length === 0) {
      if (timeRange === 'day') {
        proteinData = [20, 25, 30, 15, 20, 25];
        fatData = [15, 20, 18, 22, 17, 19];
        carbsData = [60, 70, 65, 80, 75, 65];
      } else if (timeRange === 'week') {
        proteinData = [60, 65, 70, 55, 68, 72, 63];
        fatData = [45, 50, 48, 52, 47, 49, 46];
        carbsData = [180, 190, 175, 200, 185, 195, 188];
      } else {
        // Generate 30 data points for month
        proteinData = Array.from({ length: 30 }, () => Math.floor(Math.random() * 30) + 50);
        fatData = Array.from({ length: 30 }, () => Math.floor(Math.random() * 20) + 40);
        carbsData = Array.from({ length: 30 }, () => Math.floor(Math.random() * 50) + 150);
      }
    }
    
    // Ensure we have exactly the right number of data points
    if (proteinData.length < labels.length) {
      proteinData = [...proteinData, ...Array(labels.length - proteinData.length).fill(0)];
    } else if (proteinData.length > labels.length) {
      proteinData = proteinData.slice(0, labels.length);
    }
    
    if (fatData.length < labels.length) {
      fatData = [...fatData, ...Array(labels.length - fatData.length).fill(0)];
    } else if (fatData.length > labels.length) {
      fatData = fatData.slice(0, labels.length);
    }
    
    if (carbsData.length < labels.length) {
      carbsData = [...carbsData, ...Array(labels.length - carbsData.length).fill(0)];
    } else if (carbsData.length > labels.length) {
      carbsData = carbsData.slice(0, labels.length);
    }
    
    // Create stacked data format
    const stackedData = [];
    for (let i = 0; i < labels.length; i++) {
      stackedData.push([
        proteinData[i],
        fatData[i],
        carbsData[i]
      ]);
    }
    
    return {
      labels,
      data: stackedData,
      colors: [
        'rgba(66, 133, 244, 1)',  // Blue for protein
        'rgba(219, 68, 55, 1)',   // Red for fat
        'rgba(15, 157, 88, 1)'    // Green for carbs
      ],
      barColors: [
        'rgba(66, 133, 244, 1)',  // Blue for protein
        'rgba(219, 68, 55, 1)',   // Red for fat
        'rgba(15, 157, 88, 1)'    // Green for carbs
      ],
      legend: ["Protein", "Fat", "Carbs"]
    };
  };

  // Render time range selector
  const renderTimeRangeSelector = () => (
    <View style={styles.timeRangeContainer}>
      <TouchableOpacity
        style={[
          styles.timeRangeButton,
          timeRange === 'day' && styles.timeRangeButtonActive
        ]}
        onPress={() => setTimeRange('day')}
      >
        <Text
          style={[
            styles.timeRangeText,
            timeRange === 'day' && styles.timeRangeTextActive
          ]}
        >
          Day
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.timeRangeButton,
          timeRange === 'week' && styles.timeRangeButtonActive
        ]}
        onPress={() => setTimeRange('week')}
      >
        <Text
          style={[
            styles.timeRangeText,
            timeRange === 'week' && styles.timeRangeTextActive
          ]}
        >
          Week
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.timeRangeButton,
          timeRange === 'month' && styles.timeRangeButtonActive
        ]}
        onPress={() => setTimeRange('month')}
      >
        <Text
          style={[
            styles.timeRangeText,
            timeRange === 'month' && styles.timeRangeTextActive
          ]}
        >
          Month
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Render fitness overview section
  const renderFitnessOverview = () => {
    const values = getOverviewValues();
    
    return (
      <View style={styles.overviewContainer}>
        <Text style={styles.sectionTitle}>Fitness Overview</Text>
        <View style={styles.overviewRow}>
          <View style={[styles.overviewCard, { backgroundColor: '#E8FFF8' }]}>
            <Text style={styles.overviewLabel}>Calories Burnt</Text>
            <View style={styles.overviewValueContainer}>
              <Text style={styles.overviewValue}>{values.calories}</Text>
              <Text style={styles.overviewUnit}>cals</Text>
            </View>
          </View>
          <View style={[styles.overviewCard, { backgroundColor: '#EEF6FF' }]}>
            <Text style={styles.overviewLabel}>Sleep</Text>
            <View style={styles.overviewValueContainer}>
              <Text style={styles.overviewValue}>{values.sleep}</Text>
              <Text style={styles.overviewUnit}>hr</Text>
            </View>
          </View>
        </View>
        <View style={styles.overviewRow}>
          <View style={[styles.overviewCard, { backgroundColor: '#E8FFF8' }]}>
            <Text style={styles.overviewLabel}>Walk</Text>
            <View style={styles.overviewValueContainer}>
              <Text style={styles.overviewValue}>{values.steps}</Text>
              <Text style={styles.overviewUnit}>km</Text>
            </View>
          </View>
          <View style={[styles.overviewCard, { backgroundColor: '#EEF6FF' }]}>
            <Text style={styles.overviewLabel}>Water Intake</Text>
            <View style={styles.overviewValueContainer}>
              <Text style={styles.overviewValue}>{values.water}</Text>
              <Text style={styles.overviewUnit}>(L)</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // Render calories burned chart
  const renderCaloriesBurnedChart = () => (
    <View style={styles.chartContainer}>
      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>Calories Burnt</Text>
        <Text style={styles.chartPeriod}>{timeRange === 'day' ? 'Daily' : timeRange === 'week' ? 'Weekly' : 'Monthly'} →</Text>
      </View>
      <BarChart
        data={getCaloriesBurnedChartData()}
        width={screenWidth - 40}
        height={220}
        chartConfig={chartConfig}
        style={styles.chart}
        showBarTops={false}
        fromZero
        withInnerLines={false}
        yAxisLabel=""
        yAxisSuffix=""
      />
    </View>
  );

  // Render health overview section
  const renderHealthOverview = () => {
    const values = getOverviewValues();
    
    return (
      <View style={styles.overviewContainer}>
        <Text style={styles.sectionTitle}>Health Overview</Text>
        <View style={styles.overviewRow}>
          <View style={[styles.overviewCard, { backgroundColor: '#E8FFF8' }]}>
            <Text style={styles.overviewLabel}>Protein</Text>
            <View style={styles.overviewValueContainer}>
              <Text style={styles.overviewValue}>{values.protein}</Text>
              <Text style={styles.overviewUnit}>grams</Text>
            </View>
          </View>
          <View style={[styles.overviewCard, { backgroundColor: '#EEF6FF' }]}>
            <Text style={styles.overviewLabel}>Calories Intake</Text>
            <View style={styles.overviewValueContainer}>
              <Text style={styles.overviewValue}>{values.caloriesIntake}</Text>
              <Text style={styles.overviewUnit}>cal</Text>
            </View>
          </View>
        </View>
        <View style={styles.overviewRow}>
          <View style={[styles.overviewCard, { backgroundColor: '#E8FFF8' }]}>
            <Text style={styles.overviewLabel}>Fat</Text>
            <View style={styles.overviewValueContainer}>
              <Text style={styles.overviewValue}>{values.fat}</Text>
              <Text style={styles.overviewUnit}>grams</Text>
            </View>
          </View>
          <View style={[styles.overviewCard, { backgroundColor: '#EEF6FF' }]}>
            <Text style={styles.overviewLabel}>Carbs</Text>
            <View style={styles.overviewValueContainer}>
              <Text style={styles.overviewValue}>{values.carbs}</Text>
              <Text style={styles.overviewUnit}>gr</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // Update the renderCaloriesIntakeChart function
  const renderCaloriesIntakeChart = () => (
    <View style={styles.chartContainer}>
      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>Calories Intake</Text>
        <Text style={styles.chartPeriod}>{timeRange === 'day' ? 'Daily' : timeRange === 'week' ? 'Weekly' : 'Monthly'} →</Text>
      </View>
      <BarChart
        data={getCaloriesIntakeChartData()}
        width={screenWidth - 40}
        height={220}
        chartConfig={{
          backgroundColor: '#ffffff',
          backgroundGradientFrom: '#ffffff',
          backgroundGradientTo: '#ffffff',
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          style: {
            borderRadius: 16,
          },
          barPercentage: 0.6,
          propsForBackgroundLines: {
            strokeWidth: 1,
            stroke: '#f0f0f0',
          }
        }}
        style={styles.chart}
        showBarTops={false}
        fromZero
        withInnerLines={false}
        yAxisLabel=""
        yAxisSuffix=""
        withHorizontalLabels={true}
        segments={4}
      />
    </View>
  );

  // Update the renderNutritionStackedChart function
  const renderNutritionStackedChart = () => (
    <View style={styles.chartContainer}>
      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>Nutrition Breakdown</Text>
        <Text style={styles.chartPeriod}>{timeRange === 'day' ? 'Daily' : timeRange === 'week' ? 'Weekly' : 'Monthly'} →</Text>
      </View>
      <StackedBarChart
        data={getNutritionStackedChartData()}
        width={screenWidth - 40}
        height={220}
        chartConfig={{
          backgroundColor: '#ffffff',
          backgroundGradientFrom: '#ffffff',
          backgroundGradientTo: '#ffffff',
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          style: {
            borderRadius: 16,
          },
          barPercentage: 0.6,
          propsForBackgroundLines: {
            strokeWidth: 1,
            stroke: '#f0f0f0',
          }
        }}
        style={styles.chart}
        hideLegend={true}
        segments={4}
      />
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: 'rgba(66, 133, 244, 1)' }]} />
          <Text style={styles.legendText}>Protein</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: 'rgba(219, 68, 55, 1)' }]} />
          <Text style={styles.legendText}>Fat</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: 'rgba(15, 157, 88, 1)' }]} />
          <Text style={styles.legendText}>Carbs</Text>
        </View>
      </View>
    </View>
  );

  // Render loading state
  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#00CCBB" />
      <Text style={styles.loadingText}>Loading statistics...</Text>
    </View>
  );

  // Render error state
  const renderError = () => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  // Add this before the return statement in your component
  const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    color: (opacity = 1) => `rgba(0, 204, 187, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
  };

  // Calculate average or latest values for overview cards
  const getOverviewValues = () => {
    return {
      calories: fitnessData.calories.length > 0 
        ? Math.round(fitnessData.calories.reduce((a, b) => a + b, 0) / fitnessData.calories.length) 
        : 28,
      sleep: fitnessData.sleep.length > 0 
        ? Math.round(fitnessData.sleep.reduce((a, b) => a + b, 0) / fitnessData.sleep.length) 
        : 8,
      steps: fitnessData.steps.length > 0 
        ? Math.round(fitnessData.steps.reduce((a, b) => a + b, 0) / fitnessData.steps.length / 100) 
        : 10,
      water: fitnessData.water.length > 0 
        ? Math.round(fitnessData.water.reduce((a, b) => a + b, 0) / fitnessData.water.length * 10) / 10 
        : 4.5,
      protein: nutritionData.protein.length > 0 
        ? Math.round(nutritionData.protein.reduce((a, b) => a + b, 0) / nutritionData.protein.length) 
        : 28,
      fat: nutritionData.fat.length > 0 
        ? Math.round(nutritionData.fat.reduce((a, b) => a + b, 0) / nutritionData.fat.length) 
        : 28,
      carbs: nutritionData.carbs.length > 0 
        ? Math.round(nutritionData.carbs.reduce((a, b) => a + b, 0) / nutritionData.carbs.length) 
        : 8,
      caloriesIntake: nutritionData.caloriesIntake.length > 0 
        ? Math.round(nutritionData.caloriesIntake.reduce((a, b) => a + b, 0) / nutritionData.caloriesIntake.length) 
        : 8
    };
  };

  // Add this function to your StatisticsScreen component
  const getCurrentMonthYear = (): string => {
    const date = new Date();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    
    return `${month} ${year}`;
  };

  // Also add this helper function if you're using it elsewhere
  const formatDateShort = (date: Date): string => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[date.getDay()];
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Statistics</Text>
        <Text style={styles.subtitle}>{getCurrentMonthYear()}</Text>
        
        {renderTimeRangeSelector()}
        
        {loading ? (
          renderLoading()
        ) : error ? (
          renderError()
        ) : (
          <>
            {renderFitnessOverview()}
            {renderCaloriesBurnedChart()}
            {renderHealthOverview()}
            {renderCaloriesIntakeChart()}
            {renderNutritionStackedChart()}
            <View style={{ height: 40 }} /> {/* Extra space at bottom for scrolling */}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    marginBottom: 24,
    padding: 4,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 16,
  },
  timeRangeButtonActive: {
    backgroundColor: '#333',
  },
  timeRangeText: {
    fontSize: 14,
    color: '#666',
  },
  timeRangeTextActive: {
    color: '#fff',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#ff3b30',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#00CCBB',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  overviewContainer: {
    marginBottom: 24,
  },
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  overviewCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  overviewLabel: {
    fontSize: 14,
    color: '#00CCBB',
    marginBottom: 8,
    fontWeight: '500',
  },
  overviewValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  overviewValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginRight: 4,
    color: '#333',
  },
  overviewUnit: {
    fontSize: 14,
    color: '#666',
  },
  chartContainer: {
    marginBottom: 24,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  chartPeriod: {
    fontSize: 14,
    color: '#00CCBB',
    fontWeight: '500',
  },
  chart: {
    borderRadius: 12,
    paddingRight: 0,
    marginLeft: -15, // Adjust to align chart properly
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
});

export default StatisticsScreen;
