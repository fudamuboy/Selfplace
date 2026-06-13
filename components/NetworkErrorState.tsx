import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useThemeStore from '../store/useThemeStore';

interface NetworkErrorStateProps {
  message?: string;
  onRetry: () => void;
}

export const NetworkErrorState: React.FC<NetworkErrorStateProps> = ({
  message = 'Bağlantı kısa süreliğine sessizleşti 🌙',
  onRetry,
}) => {
  const { currentTheme } = useThemeStore();

  return (
    <View style={styles.container}>
      <Ionicons name="cloud-offline-outline" size={64} color={currentTheme.colors.primary} style={styles.icon} />
      <Text style={[styles.message, { color: currentTheme.colors.text.primary }]}>
        {message}
      </Text>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: currentTheme.colors.button.primary }]}
        onPress={onRetry}
        activeOpacity={0.8}
      >
        <Text style={[styles.buttonText, { color: currentTheme.colors.button.text }]}>
          Tekrar Dene
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: 80,
  },
  icon: {
    marginBottom: 20,
    opacity: 0.8,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    fontWeight: '500',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
