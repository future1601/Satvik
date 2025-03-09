import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Dimensions,
  TouchableOpacity,
  Image,
  NativeSyntheticEvent,
  NativeScrollEvent,
  StatusBar,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Auth: undefined;
};

type OnboardingScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Onboarding'
>;

type Props = {
  navigation: OnboardingScreenNavigationProp;
};

const { width, height } = Dimensions.get('window');

interface SlideItem {
  id: string;
  title: string;
  description: string;
  image: any;
}

const slides: SlideItem[] = [
  {
    id: '1',
    title: 'Smarter Choices,\nHealthier You',
    description: 'Scan barcodes to get personalized health ratings, discover better alternatives and track your nutrient intake effectively.',
    image: require('../../assets/onboarding1.png'),
  },
  {
    id: '2',
    title: 'Mindful Living',
    description: 'Practice mindfulness and meditation for inner peace and balanced lifestyle.',
    image: require('../../assets/onboarding2.png'),
  },
  {
    id: '3',
    title: 'Healthy Lifestyle',
    description: 'Create sustainable habits for a balanced and fulfilling life with personalized recommendations.',
    image: require('../../assets/onboarding3.png'),
  },
];

const OnboardingScreen: React.FC<Props> = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (event && event.nativeEvent) {
      const contentOffsetX = event.nativeEvent.contentOffset.x;
      const currentIndex = Math.floor(contentOffsetX / width);
      setCurrentIndex(currentIndex);
    }
  };

  const renderSlide = ({ item }: { item: SlideItem }) => {
    return (
      <View style={styles.slideContainer}>
        <Image source={item.image} style={styles.image} resizeMode="contain" />
        <View style={styles.textContainer}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
        </View>
      </View>
    );
  };

  const renderPagination = () => {
    return (
      <View style={styles.paginationContainer}>
        {slides.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              { backgroundColor: index === currentIndex ? '#4CAF50' : '#E0E0E0' },
            ]}
          />
        ))}
      </View>
    );
  };

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      // Navigate to Auth screen when on the last slide
      navigation.navigate('Auth');
    }
  };

  const handleSkip = () => {
    // Navigate directly to Auth screen when Skip is pressed
    navigation.navigate('Auth');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Satvik</Text>
      </View>
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        keyExtractor={(item) => item.id}
        scrollEventThrottle={16}
      />
      {renderPagination()}
      <View style={styles.buttonContainer}>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingTop: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  slideContainer: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  image: {
    width: width * 0.8,
    height: height * 0.4,
    marginTop: 20,
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 40,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 32,
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 30,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 20,
  },
  skipText: {
    fontSize: 16,
    color: '#666',
  },
  nextButton: {
    backgroundColor: '#1E1E2D',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default OnboardingScreen; 