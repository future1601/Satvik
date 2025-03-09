import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  Image, 
  Dimensions 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Define the navigation param list
type RootStackParamList = {
  ScanOptions: undefined;
  BarcodeScanner: undefined;
  FoodRecognition: undefined;
};

type ScanOptionsScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ScanOptions'
>;

const { width } = Dimensions.get('window');

const ScanOptionsScreen: React.FC = () => {
  const navigation = useNavigation<ScanOptionsScreenNavigationProp>();

  const handleBarcodeScan = () => {
    navigation.navigate('BarcodeScanner');
  };

  const handleFoodRecognition = () => {
    navigation.navigate('FoodRecognition');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>SnapBite</Text>
        <Text style={styles.subtitle}>Scan. Detect. Eat Smart!</Text>
        
        <TouchableOpacity 
          style={[styles.card, { backgroundColor: '#FFF176' }]}
          activeOpacity={0.8}
          onPress={handleBarcodeScan}
        >
          <MaterialIcons name="arrow-forward" size={20} color="#333" style={styles.cardArrow} />
          <View style={styles.cardContent}>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>Barcode Scanner</Text>
              <Text style={styles.cardDescription}>
                Scan a product's barcode to discover healthier alternatives.
              </Text>
            </View>
          </View>
          <Image 
            source={require('../../assets/barcode.png')} 
            style={styles.cardImage} 
            resizeMode="contain"
          />
        </TouchableOpacity>
        
        <View style={styles.dividerContainer}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.divider} />
        </View>
        
        <TouchableOpacity 
          style={[styles.card, { backgroundColor: '#FFCC80' }]}
          activeOpacity={0.8}
          onPress={handleFoodRecognition}
        >
          <MaterialIcons name="arrow-forward" size={20} color="#333" style={styles.cardArrow} />
          <View style={styles.cardContent}>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>Food Recognition</Text>
              <Text style={styles.cardDescription}>
                Scan food items to recognize them and instantly see their nutritional information.
              </Text>
            </View>
          </View>
          <Image 
            source={require('../../assets/food.png')} 
            style={styles.cardImage} 
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E4F1F',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  card: {
    borderRadius: 16,
    padding: 45,
    marginTop: 30,
    marginBottom: 30,
    position: 'relative',
    height: 200,
  },
  cardContent: {
    flexDirection: 'column',
    justifyContent: 'center',
    height: '100%',
  },
  cardImage: {
    width: 100,
    height: 80,
    position: 'absolute',
    right: 10,
    bottom: 10,
  },
  cardTextContainer: {
    width: '70%',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  cardArrow: {
    position: 'absolute',
    top: 15,
    left: 15,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 4,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
  },
});

export default ScanOptionsScreen;
