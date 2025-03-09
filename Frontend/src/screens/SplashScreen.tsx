import React from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  Image, 
  Pressable, 
  Dimensions 
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Replace the import with a local type definition
type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
};

type SplashScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Splash'
>;

type Props = {
  navigation: SplashScreenNavigationProp;
};

const { width, height } = Dimensions.get('window');

const SplashScreen: React.FC<Props> = ({ navigation }) => {
  const handlePress = () => {
    navigation.navigate('Onboarding');
  };

  return (
    <Pressable style={styles.container} onPress={handlePress}>
      <View style={styles.content}>
        <Image 
          source={require('../../assets/splash.png')} 
          style={styles.image} 
          resizeMode="contain"
        />
        <Text style={styles.title}>Satvik</Text>
        <Text style={styles.subtitle}>Where Life Meets Balance.</Text>
      </View>
      <View style={styles.progressBar} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  image: {
    width: width * 0.8,
    height: width * 0.8,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#445566',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#778899',
    textAlign: 'center',
  },
  progressBar: {
    width: 60,
    height: 5,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    marginBottom: 40,
  },
});

export default SplashScreen; 