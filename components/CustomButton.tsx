import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import useThemeStore from '../store/useThemeStore';

interface Props {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  style?: any;
}

export const CustomButton: React.FC<Props> = ({ 
  title, 
  onPress, 
  loading = false, 
  variant = 'primary',
  style 
}) => {
  const { currentTheme } = useThemeStore();

  const getButtonStyle = () => {
    switch (variant) {
      case 'secondary': return { backgroundColor: currentTheme.colors.button.secondary };
      case 'outline': return { 
        backgroundColor: 'transparent', 
        borderWidth: 1, 
        borderColor: currentTheme.colors.button.primary 
      };
      default: return { backgroundColor: currentTheme.colors.button.primary };
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'outline': return { color: currentTheme.colors.button.primary };
      default: return { color: currentTheme.colors.button.text };
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.button, getButtonStyle(), style]} 
      onPress={onPress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? currentTheme.colors.button.primary : currentTheme.colors.button.text} />
      ) : (
        <Text style={[styles.text, getTextStyle()]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
    width: '100%',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});
