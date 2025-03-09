import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Props {
  onPress: () => void;
  style?: ViewStyle;
}

const GoogleLoginButton: React.FC<Props> = ({ onPress, style }) => {
  return (
    <TouchableOpacity style={[styles.button, style]} onPress={onPress}>
      <MaterialCommunityIcons name="google" size={24} color="#4285F4" style={styles.icon} />
      <Text style={styles.buttonText}>Login with Google</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    width: '100%',
    height: 48,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#dadce0',
  },
  icon: {
    marginRight: 12,
  },
  buttonText: {
    color: '#757575',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default GoogleLoginButton;
