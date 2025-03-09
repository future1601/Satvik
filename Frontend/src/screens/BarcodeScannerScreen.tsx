// BarcodeScannerScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  Button,
  ScrollView
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';
import { auth, firestore } from '../firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';

// API base URL - replace with your backend URL
const API_BASE_URL = 'http://192.168.239.147:8000';

const BarcodeScannerScreen: React.FC = () => {
  const [hasPermission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const navigation = useNavigation();

  if (!hasPermission) {
    // Camera permissions are still loading
    return <View style={styles.container}><ActivityIndicator size="large" color="#00CCBB" /></View>;
  }
  
  if (!hasPermission.granted) {
    // Camera permissions are not granted yet
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No access to camera</Text>
        <Button onPress={requestPermission} title="Grant Permission" />
        <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current && !scanning) {
      try {
        setScanning(true);
        
        // Take picture
        const photo = await cameraRef.current.takePictureAsync({ 
          quality: 0.7,
          base64: true
        });
        
        // Get base64 data
        let base64Data;
        if (photo.base64) {
          base64Data = photo.base64;
        } else {
          // If base64 is not available, read from URI
          base64Data = await FileSystem.readAsStringAsync(photo.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
        }
        
        // Send to backend
        const response = await fetch(`${API_BASE_URL}/barcode-scan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64Data })
        });
        
        if (!response.ok) {
          throw new Error('Failed to scan barcode');
        }
        
        const result = await response.json();
        console.log("Barcode scan result:", result);
        
        if (result.success && result.product) {
          // Save to Firestore if user is logged in
          if (auth.currentUser) {
            const userId = auth.currentUser.uid;
            const timestamp = new Date().toISOString();
            
            // Create a valid document with no undefined values
            const productData = {
              timestamp,
              product: result.product,
              barcode: result.barcode,
              // Only include nutritionInfo if it exists, otherwise use an empty object
              nutritionInfo: {
                calories: result.product.calories || 0,
                protein: result.product.protein || 0,
                carbs: result.product.carbs || 0,
                fat: result.product.fat || 0,
                sugar: result.product.sugar || 0,
                fiber: result.product.fiber || 0,
                sodium: result.product.sodium || 0
              },
              // Add alternatives if available
              alternatives: result.alternatives || []
            };
            
            await setDoc(doc(firestore, `users/${userId}/scanned_products/${timestamp}`), productData);
          }
          
          // Show product details with alternatives
          if (result.alternatives && result.alternatives.length > 0) {
            // Create a message with alternatives
            let alternativesMessage = "Healthier alternatives:\n";
            result.alternatives.forEach((alt, index) => {
              // Skip alternatives with N/A or empty names
              if (alt.name && alt.name !== "N/A") {
                alternativesMessage += `${index + 1}. ${alt.name}`;
                
                // Only add brand if it's not N/A and not empty
                if (alt.brand && alt.brand !== "N/A" && alt.brand !== "Recommended by AI") {
                  alternativesMessage += ` - ${alt.brand}`;
                }
                
                alternativesMessage += "\n";
              }
            });
            
            // Format product name and brand
            const productName = result.product.name !== "N/A" ? result.product.name : "";
            const productBrand = result.product.brand !== "N/A" ? result.product.brand : "";
            const productDisplay = productName + (productName && productBrand ? " by " : "") + productBrand;
            
            Alert.alert(
              "Product Found",
              `${productDisplay}\n\n${alternativesMessage}`,
              [
                {
                  text: "View Details",
                  onPress: () => {
                    // Navigate to product details screen with the product data and alternatives
                    navigation.navigate('ProductDetails', { 
                      product: result.product,
                      alternatives: result.alternatives,
                      availableInIndia: result.available_in_india
                    });
                  }
                },
                { text: "Scan Again", onPress: () => setScanning(false) }
              ]
            );
          } else {
            // Regular product alert without alternatives
            const productName = result.product.name !== "N/A" ? result.product.name : "";
            const productBrand = result.product.brand !== "N/A" ? result.product.brand : "";
            const productDisplay = productName + (productName && productBrand ? " by " : "") + productBrand;
            
            Alert.alert(
              "Product Found",
              productDisplay,
              [
                {
                  text: "View Details",
                  onPress: () => {
                    // Navigate to product details screen with the product data
                    navigation.navigate('ProductDetails', { 
                      product: result.product,
                      alternatives: [],
                      availableInIndia: result.available_in_india
                    });
                  }
                },
                { text: "Scan Again", onPress: () => setScanning(false) }
              ]
            );
          }
        } else {
          Alert.alert(
            "No Product Found",
            "We couldn't find any product matching this barcode. Please try again.",
            [{ text: "OK", onPress: () => setScanning(false) }]
          );
        }
      } catch (error) {
        console.error("Error scanning barcode:", error);
        Alert.alert(
          "Error",
          "Failed to scan barcode. Please try again.",
          [{ text: "OK", onPress: () => setScanning(false) }]
        );
      }
    }
  };

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
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
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
            Position the barcode within the frame and tap the camera button
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
    justifyContent: 'center',
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
    width: 250,
    height: 150,
    borderWidth: 2,
    borderColor: '#00CCBB',
    backgroundColor: 'transparent',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 40,
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
    bottom: 120,
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
});

export default BarcodeScannerScreen;