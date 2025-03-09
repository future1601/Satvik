import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import { auth, firestore } from '../firebaseConfig';
import { doc, getDoc, updateDoc, setDoc, increment } from 'firebase/firestore';

const API_BASE_URL = 'http://192.168.239.147:8000';

// Default data structure
interface UserData {
  firstName?: string;
  lastName?: string;
  email?: string;
  tip?: string;
  updates?: Array<{
    type: string;
    message: string;
    time: string;
    icon: string;
  }>;
}

// Fitness data structure
interface FitnessData {
  calories: string;
  sleep: string;
  steps: string;
  water: string;
}

const HomeScreen: React.FC = () => {
  const [userData, setUserData] = useState<UserData>({});
  const [fitnessData, setFitnessData] = useState<FitnessData>({
    calories: '0',
    sleep: '0',
    steps: '0',
    water: '1.5' 
  });
  const [loading, setLoading] = useState(true);
  const [fitnessLoading, setFitnessLoading] = useState(true);
  const [fitnessError, setFitnessError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Default data for new users or when Firestore data is incomplete
  const defaultData = {
    tip: 'Did you know? Drinking 4.5L Of Water Daily Boosts Hydration And Keeps Your Skin Glowing!',
    updates: [
      {
        type: 'Hydration Alert',
        message: 'You\'ve Only Had 1.5L Of Water Today! Stay Hydrated 💧',
        time: 'March • 6:00 PM',
        icon: 'water'
      },
      {
        type: 'Meal Reminder',
        message: 'Forgot To Log Your Lunch?',
        time: 'March • 6:00 PM',
        icon: 'sunny'
      },
      {
        type: 'Your Water Intake Improved By 15%',
        message: 'You\'re Week-Stay-Hydrated!',
        time: 'March • 8:00 PM',
        icon: 'water'
      }
    ]
  };

  // Get current date
  const getCurrentDate = () => {
    const months = [
      'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
      'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
    ];
    const now = new Date();
    const month = months[now.getMonth()];
    const day = now.getDate().toString().padStart(2, '0');
    const year = now.getFullYear();
    return `${month} ${day}, ${year}`;
  };

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Function to authenticate with Google Fit
  const authenticateWithGoogleFit = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        setIsAuthenticated(true);
        // After authentication, fetch fitness data
        fetchFitnessData();
      } else {
        const errorData = await response.json();
        setFitnessError(`Authentication failed: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error during authentication:', error);
      setFitnessError(`Authentication error: ${error.message}`);
    }
  };

  // Fetch fitness data from FastAPI backend
  const fetchFitnessData = async () => {
    setFitnessLoading(true);
    setFitnessError(null);
    
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
      
      // Calculate total steps from the array
      let totalSteps = 0;
      if (Array.isArray(stepsData)) {
        // Sum up all steps from the array
        totalSteps = stepsData.reduce((sum, day) => sum + (day.steps || 0), 0);
      } else if (stepsData.steps) {
        // If it's a single object with steps property
        totalSteps = stepsData.steps;
      }
      
      // Calculate total calories
      let totalCalories = 0;
      if (Array.isArray(caloriesData)) {
        // Sum up all calories from the array
        totalCalories = caloriesData.reduce((sum, day) => sum + (day.calories || 0), 0);
      } else if (caloriesData.calories) {
        // If it's a single object with calories property
        totalCalories = caloriesData.calories;
      }
      
      // Calculate average sleep hours
      let sleepHours = 0;
      if (Array.isArray(sleepData) && sleepData.length > 0) {
        // Get the most recent sleep data or calculate average
        const recentSleep = sleepData[0];
        sleepHours = recentSleep.duration_hours || 0;
      } else if (sleepData.sleep_hours) {
        // If it's a single object with sleep_hours property
        sleepHours = sleepData.sleep_hours;
      }
      
      // Update fitness data state
      setFitnessData({
        calories: Math.round(totalCalories).toString(),
        sleep: sleepHours.toFixed(1),
        steps: totalSteps.toString(),
        water: fitnessData.water // Keep existing water data
      });
    } catch (error) {
      console.error('Error fetching fitness data:', error);
      setFitnessError(error.message);
    } finally {
      setFitnessLoading(false);
    }
  };

  // Fetch user data from Firestore
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          console.log('No user is signed in');
          setLoading(false);
          return;
        }

        const userDocRef = doc(firestore, 'users', currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const data = userDocSnap.data() as UserData;
          
          // Merge fetched data with default data for any missing fields
          setUserData({
            ...defaultData,
            ...data
          });
        } else {
          console.log('No user data found in Firestore');
          setUserData(defaultData);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        setUserData(defaultData);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Function to log water intake
  const logWaterIntake = async (amount: number) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert("Error", "You must be logged in to track water intake");
        return;
      }

      // Get current date in YYYY-MM-DD format
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      
      // Reference to the user's water intake document
      const waterRef = doc(firestore, `users/${currentUser.uid}/water/${dateStr}`);
      
      // Get current water intake
      const waterDoc = await getDoc(waterRef);
      
      if (waterDoc.exists()) {
        // Update existing water intake
        await updateDoc(waterRef, {
          total: increment(amount),
          logs: [...(waterDoc.data().logs || []), {
            amount: amount,
            timestamp: new Date()
          }]
        });
      } else {
        // Create new water intake document
        await setDoc(waterRef, {
          total: amount,
          logs: [{
            amount: amount,
            timestamp: new Date()
          }]
        });
      }
      
      // Update fitnessData state
      setFitnessData(prev => ({
        ...prev,
        water: (parseFloat(prev.water) + amount).toString()
      }));
      
      Alert.alert("Success", `Added ${amount}L of water to your daily intake!`);
    } catch (error) {
      console.error("Error logging water intake:", error);
      Alert.alert("Error", "Failed to log water intake. Please try again.");
    }
  };

  // Render stat card
  const renderStatCard = (title: string, value: string, unit: string, bgColor: string) => (
    <View style={[styles.statCard, { backgroundColor: bgColor }]}>
      <Text style={styles.statTitle}>{title}</Text>
      <View style={styles.statValueContainer}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statUnit}>{unit}</Text>
      </View>
    </View>
  );

  // Render update item
  const renderUpdateItem = (update: any, index: number) => (
    <View key={index} style={styles.updateItem}>
      <View style={styles.updateIconContainer}>
        {update.icon === 'water' ? (
          <Ionicons name="water" size={24} color="white" />
        ) : (
          <Feather name="sun" size={24} color="white" />
        )}
      </View>
      <View style={styles.updateContent}>
        <Text style={styles.updateType}>{update.type}</Text>
        <Text style={styles.updateMessage}>{update.message}</Text>
        <Text style={styles.updateTime}>{update.time}</Text>
      </View>
    </View>
  );

  // Render error message for fitness data
  const renderFitnessError = () => (
    <TouchableOpacity 
      style={styles.errorContainer} 
      onPress={fetchFitnessData}
    >
      <Text style={styles.errorText}>
        {fitnessError || 'Failed to load fitness data'}
      </Text>
      <Text style={styles.retryText}>Tap to retry</Text>
    </TouchableOpacity>
  );

  // Add authentication button
  const renderAuthButton = () => (
    <TouchableOpacity 
      style={styles.authButton}
      onPress={authenticateWithGoogleFit}
    >
      <Text style={styles.authButtonText}>Connect to Google Fit</Text>
    </TouchableOpacity>
  );

  // Render refresh button
  const renderRefreshButton = () => (
    <TouchableOpacity 
      style={styles.refreshButton}
      onPress={fetchFitnessData}
    >
      <MaterialIcons name="refresh" size={20} color="white" />
      <Text style={styles.refreshButtonText}>Refresh</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#00CCBB" />
        <Text style={styles.loadingText}>Loading your health data...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header with profile */}
        <View style={styles.header}>
          <View style={styles.profileSection}>
            <Image 
              source={require('../../assets/profile-pic.jpg')} 
              style={styles.profileImage} 
            />
            <View style={styles.profileInfo}>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.userName}>
                {userData.firstName ? `${userData.firstName} ${userData.lastName || ''}` : 'Welcome'}
              </Text>
            </View>
          </View>
          <View style={styles.notificationBadge}>
            <Text style={styles.notificationText}>10</Text>
          </View>
        </View>

        {/* Date */}
        <Text style={styles.date}>{getCurrentDate()}</Text>

        {/* Your Statistics */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Statistics</Text>
          {isAuthenticated && !fitnessLoading && !fitnessError && renderRefreshButton()}
        </View>
        
        {!isAuthenticated ? (
          <View style={styles.authContainer}>
            <Text style={styles.authText}>
              Connect to Google Fit to view your fitness data
            </Text>
            {renderAuthButton()}
          </View>
        ) : fitnessLoading ? (
          <View style={styles.fitnessLoadingContainer}>
            <ActivityIndicator size="small" color="#00CCBB" />
            <Text style={styles.fitnessLoadingText}>Updating fitness data...</Text>
          </View>
        ) : fitnessError ? (
          renderFitnessError()
        ) : (
          <View style={styles.statsContainer}>
            <View style={styles.statsRow}>
              {renderStatCard('Calories Burned', fitnessData.calories, 'cal', '#E8FFF8')}
              {renderStatCard('Sleep', fitnessData.sleep, 'hr', '#EEF6FF')}
            </View>
            <View style={styles.statsRow}>
              {renderStatCard('Steps', fitnessData.steps, 'steps', '#E8FFF8')}
              {renderStatCard('Water Intake', fitnessData.water, 'L', '#EEF6FF')}
            </View>
          </View>
        )}

        {/* Water Intake Logging Section */}
        <View style={styles.waterIntakeContainer}>
          <Text style={styles.waterIntakeTitle}>Log Your Water Intake</Text>
          <View style={styles.waterButtonsRow}>
            <TouchableOpacity 
              style={styles.waterButton} 
              onPress={() => logWaterIntake(0.5)}
            >
              <Text style={styles.waterButtonText}>500 Ml</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.waterButton} 
              onPress={() => logWaterIntake(1.0)}
            >
              <Text style={styles.waterButtonText}>1 Liter</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tip of the day */}
        <View style={styles.tipContainer}>
          <Text style={styles.tipTitle}>Tip Of The Day! ✨</Text>
          <Text style={styles.tipText}>{userData.tip || defaultData.tip}</Text>
        </View>

        {/* Updates */}
        <Text style={styles.sectionTitle}>Updates</Text>
        <Text style={styles.updateSubheader}>Today</Text>
        <View style={styles.updatesContainer}>
          {(userData.updates || defaultData.updates).map((update, index) => renderUpdateItem(update, index))}
        </View>

        {/* Friend's Food */}
        <Text style={styles.sectionTitle}>Look What Arpita Is Eating</Text>
        <View style={styles.foodContainer}>
          <Image 
            source={require('../../assets/healthy-bowl.jpg')} 
            style={styles.foodImage} 
            resizeMode="cover"
          />
          <View style={styles.foodFooter}>
            <View style={styles.foodUser}>
              <Image 
                source={require('../../assets/profile-pic.jpg')} 
                style={styles.foodUserImage} 
              />
              <Text style={styles.foodUserName}>Aryan</Text>
            </View>
            <TouchableOpacity style={styles.likeButton}>
              <Ionicons name="heart-outline" size={24} color="black" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8D8D8D',
  },
  fitnessLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  fitnessLoadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#8D8D8D',
  },
  errorContainer: {
    backgroundColor: '#FFF1F0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#FF4D4F',
    marginBottom: 8,
    textAlign: 'center',
  },
  retryText: {
    fontSize: 14,
    color: '#1890FF',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  profileInfo: {
    justifyContent: 'center',
  },
  greeting: {
    fontSize: 14,
    color: '#8D8D8D',
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
  notificationBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#00CCBB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  date: {
    fontSize: 14,
    color: '#8D8D8D',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#000000',
  },
  statsContainer: {
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    justifyContent: 'center',
  },
  statTitle: {
    fontSize: 14,
    color: '#00CCBB',
    marginBottom: 8,
  },
  statValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginRight: 4,
  },
  statUnit: {
    fontSize: 14,
    color: '#8D8D8D',
  },
  tipContainer: {
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#4A4A4A',
    lineHeight: 20,
  },
  updateSubheader: {
    fontSize: 14,
    color: '#8D8D8D',
    marginBottom: 12,
  },
  updatesContainer: {
    marginBottom: 24,
  },
  updateItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  updateIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  updateContent: {
    flex: 1,
  },
  updateType: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  updateMessage: {
    fontSize: 14,
    color: '#4A4A4A',
    marginBottom: 4,
  },
  updateTime: {
    fontSize: 12,
    color: '#8D8D8D',
  },
  foodContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
    backgroundColor: '#F9F9F9',
  },
  foodImage: {
    width: '100%',
    height: 200,
  },
  foodFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  foodUser: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  foodUserImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
  },
  foodUserName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
  },
  likeButton: {
    padding: 4,
  },
  bottomSpacing: {
    height: 60,
  },
  authContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  authText: {
    fontSize: 16,
    color: '#4A4A4A',
    marginBottom: 16,
    textAlign: 'center',
  },
  authButton: {
    backgroundColor: '#00CCBB',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  authButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00CCBB',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  waterIntakeContainer: {
    backgroundColor: '#f0f8ff',
    borderRadius: 15,
    padding: 15,
    marginTop: 20,
    marginBottom: 10,
  },
  waterIntakeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00CCBB',
    marginBottom: 10,
  },
  waterButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  waterButton: {
    backgroundColor: '#e6f7ff',
    borderRadius: 10,
    padding: 12,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#b3e0ff',
  },
  waterButtonText: {
    color: '#0099cc',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default HomeScreen; 