import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CommonActions } from '@react-navigation/native';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import StatisticsScreen from '../screens/StatisticsScreen';
import ScanScreen from '../screens/ScanScreen';
import InsightsScreen from '../screens/InsightsScreen';
import ExtraScreen from '../screens/ExtraScreen';
import BarcodeScannerScreen from '../screens/BarcodeScannerScreen';
import FoodRecognitionScreen from '../screens/FoodRecognitionScreen';
import ScanOptionsScreen from '/home/mors/Desktop/Satvik-app/Frontend/src/screens/ScanScreen.tsx';

// Define the type for our stack navigator
type ScanStackParamList = {
  ScanOptions: undefined;
  BarcodeScanner: undefined;
  FoodRecognition: undefined;
};

// Create the tab navigator
const Tab = createBottomTabNavigator();
const ScanStack = createNativeStackNavigator<ScanStackParamList>();

// Create a stack navigator for the scan-related screens
const ScanStackNavigator = () => {
  return (
    <ScanStack.Navigator screenOptions={{ headerShown: false }}>
      <ScanStack.Screen name="ScanOptions" component={ScanOptionsScreen} />
      <ScanStack.Screen name="FoodRecognition" component={FoodRecognitionScreen} />
      <ScanStack.Screen name="BarcodeScanner" component={BarcodeScannerScreen} />
    </ScanStack.Navigator>
  );
};

// Custom tab button for the center (scan) button
const CustomTabButton = ({ children, onPress }: any) => (
  <TouchableOpacity
    style={styles.customTabButton}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <View style={styles.customTabButtonInner}>
      {children}
    </View>
  </TouchableOpacity>
);

const BottomTabs = () => {
  const insets = useSafeAreaInsets();
  
  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = 'home';
          } else if (route.name === 'Statistics') {
            iconName = 'chart-bar';
          } else if (route.name === 'Scan') {
            iconName = 'plus';
          } else if (route.name === 'Insights') {
            iconName = 'heart-pulse';
          } else if (route.name === 'More') {
            iconName = 'dots-horizontal';
          }

          // Return the icon component
          return (
            <View style={[
              styles.iconContainer,
              focused && styles.activeIconContainer
            ]}>
              <MaterialCommunityIcons
                name={iconName as any}
                size={route.name === 'Scan' ? 26 : 22}
                color={focused ? '#000' : '#666'}
              />
            </View>
          );
        },
        tabBarActiveTintColor: '#000',
        tabBarInactiveTintColor: '#666',
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 0,
          backgroundColor: '#D9ECFF',
          height: 60 + (Platform.OS === 'ios' ? insets.bottom : 0),
          borderTopWidth: 0,
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: -2,
          },
          shadowOpacity: 0.1,
          shadowRadius: 3.5,
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : 0,
        },
        headerShown: false,
        tabBarOnPress: ({ navigation, route }) => {
          navigation.dispatch(
            CommonActions.navigate({
              name: route.name,
              merge: true,
            })
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Statistics" component={StatisticsScreen} />
      <Tab.Screen 
        name="Scan" 
        component={ScanStackNavigator} 
        options={{
          tabBarButton: (props) => <CustomTabButton {...props} />
        }}
      />
      <Tab.Screen name="Insights" component={InsightsScreen} />
      <Tab.Screen name="More" component={ExtraScreen} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  activeIconContainer: {
    backgroundColor: '#B3DAFF',
  },
  customTabButton: {
    top: -20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customTabButtonInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#D9ECFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3.5,
    elevation: 5,
  },
});

export default BottomTabs;
