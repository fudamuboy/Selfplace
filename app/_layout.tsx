import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { View, ActivityIndicator } from 'react-native';
import useThemeStore from "../store/useThemeStore";
import useAuthStore from "../store/useAuthStore";

export default function RootLayout() {
  const { loadTheme, currentTheme } = useThemeStore();
  const { token, setAuth } = useAuthStore();
  const [isReady, setIsReady] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    async function initialize() {
      // Load theme
      await loadTheme();
      
      // Check onboarding status
      const onboardingValue = await AsyncStorage.getItem('onboardingCompleted');
      const isCompleted = onboardingValue === 'true';
      setOnboardingCompleted(isCompleted);
      
      // Check for existing token
      const storedToken = await AsyncStorage.getItem('token');
      const storedUser = await AsyncStorage.getItem('user');
      if (storedToken && storedUser) {
        await setAuth(storedToken, JSON.parse(storedUser));
      }
      
      setIsReady(true);
    }
    initialize();
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';
    const onOnboarding = segments[0] === 'onboarding';

    if (!onboardingCompleted) {
      if (!onOnboarding) {
        router.replace('/onboarding');
      }
    } else if (!token) {
      if (inTabsGroup || !inAuthGroup) {
        router.replace('/(auth)/login');
      }
    } else if (token) {
      if (inAuthGroup || onOnboarding || !inTabsGroup) {
        router.replace('/(tabs)');
      }
    }
  }, [isReady, onboardingCompleted, token, segments]);

  if (!isReady || onboardingCompleted === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F2027' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="check-in" />
      <Stack.Screen name="cards" />
      <Stack.Screen name="theme-selection" />
      <Stack.Screen name="privacy-data" />
    </Stack>
  );
}
