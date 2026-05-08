import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import useThemeStore from '../store/useThemeStore';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  edges?: ('top' | 'right' | 'bottom' | 'left')[];
  noSafeArea?: boolean;
}

export const GradientBackground: React.FC<Props> = ({ children, style, edges = ['top', 'bottom'], noSafeArea = false }) => {
  const { currentTheme } = useThemeStore();
  
  const content = (
    <>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.25)' }]} />
      {children}
    </>
  );

  return (
    <LinearGradient
      colors={currentTheme.colors.background}
      style={[styles.container, style]}
    >
      {noSafeArea ? content : (
        <SafeAreaView style={{ flex: 1 }} edges={edges}>
          {content}
        </SafeAreaView>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

