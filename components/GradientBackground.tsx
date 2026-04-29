import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import useThemeStore from '../store/useThemeStore';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const GradientBackground: React.FC<Props> = ({ children, style }) => {
  const { currentTheme } = useThemeStore();
  
  return (
    <LinearGradient
      colors={currentTheme.colors.background}
      style={[styles.container, style]}
    >
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.25)' }]} />
      {children}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

