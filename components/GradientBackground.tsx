import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/Colors';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const GradientBackground: React.FC<Props> = ({ children, style }) => {
  return (
    <LinearGradient
      colors={[Colors.background.start, Colors.background.end]}
      style={[styles.container, style]}
    >
      {children}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
