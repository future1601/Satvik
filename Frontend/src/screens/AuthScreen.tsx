import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import GoogleLoginButton from '../components/GoogleLoginButton';
import { firebase } from '../firebaseConfig';

type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Auth: undefined;
  Login: undefined;
  Register: undefined;
  Home: undefined;
};

type AuthScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Auth'
>;

type Props = {
  navigation: AuthScreenNavigationProp;
};

const { width, height } = Dimensions.get('window');

const AuthScreen: React.FC<Props> = ({ navigation }) => {
  const handleRegister = () => {
    console.log('Register button pressed');
    // Navigate to Register screen
    navigation.navigate('Register');
  };

  const handleLogin = () => {
    console.log('Login button pressed');
    // Navigate to Login screen
    navigation.navigate('Login');
  };

  const handleGoogleLogin = async () => {
    console.log('Google login button pressed');
    // Implement Google authentication here
    try {
      // This is a placeholder for your Google authentication logic
      // You'll need to implement the actual Google Sign-In flow
      
      // After successful Google sign-in, navigate to Home
      // navigation.navigate('Home');
    } catch (error) {
      console.error('Google login error:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <View style={styles.contentContainer}>
        <View style={styles.imageContainer}>
          <Image
            source={require('../../assets/splash.png')}
            style={styles.image}
            resizeMode="contain"
          />
        </View>
        
        <View style={styles.textContainer}>
          <Text style={styles.title}>Satvik</Text>
          <Text style={styles.subtitle}>Where Nutrition Meets Balance.</Text>
        </View>
      </View>
      
      <View style={styles.buttonContainer}>
        <View style={styles.topButtonsRow}>
          <TouchableOpacity 
            style={styles.registerButton} 
            onPress={handleRegister}
          >
            <Text style={styles.registerButtonText}>Register</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.loginButton} 
            onPress={handleLogin}
          >
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>
        </View>
        
        <GoogleLoginButton onPress={handleGoogleLogin} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  image: {
    width: width * 0.8,
    height: width * 0.6,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#445566',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#778899',
    textAlign: 'center',
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    width: '100%',
  },
  topButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  registerButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#445566',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  registerButtonText: {
    fontSize: 16,
    color: '#445566',
    fontWeight: '500',
  },
  loginButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#0F1729',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  loginButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  googleButton: {
    width: '100%',
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 10,
  },
  googleButtonText: {
    fontSize: 16,
    color: '#444',
    fontWeight: '500',
  },
});

export default AuthScreen;
