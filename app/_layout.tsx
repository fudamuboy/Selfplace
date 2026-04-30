import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { View, ActivityIndicator } from 'react-native';
import useThemeStore from "../store/useThemeStore";
import useAuthStore from "../store/useAuthStore";

export default function RootLayout() {
  const { loadTheme, currentTheme } = useThemeStore();
  const { token, setAuth, onboardingCompleted, setOnboardingCompleted, postAuthOnboardingCompleted, setPostAuthOnboardingCompleted } = useAuthStore();
  const [isReady, setIsReady] = useState(false);
  
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    async function initialize() {
      // Load theme
      await loadTheme();
      
      // Check onboarding status
      const onboardingValue = await AsyncStorage.getItem('onboardingCompleted');
      await setOnboardingCompleted(onboardingValue === 'true');

      // Check post-auth onboarding status
      const postAuthValue = await AsyncStorage.getItem('postAuthOnboardingCompleted');
      await setPostAuthOnboardingCompleted(postAuthValue === 'true');
      
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
    const onPostAuthOnboarding = segments[0] === 'post-auth-onboarding';

    if (!onboardingCompleted) {
      if (!onOnboarding) {
        router.replace('/onboarding');
      }
    } else if (!token) {
      if (inTabsGroup || !inAuthGroup) {
        router.replace('/(auth)/login');
      }
    } else if (token) {
      if (!postAuthOnboardingCompleted) {
        if (!onPostAuthOnboarding) {
          router.replace('/post-auth-onboarding');
        }
      } else if (inAuthGroup || onOnboarding || onPostAuthOnboarding) {
        router.replace('/(tabs)');
      }
    }
  }, [isReady, onboardingCompleted, token, postAuthOnboardingCompleted, segments]);

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
      <Stack.Screen name="post-auth-onboarding" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="check-in" />
      <Stack.Screen name="cards" />
      <Stack.Screen name="theme-selection" />
      <Stack.Screen name="privacy-data" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="faq" />
      <Stack.Screen name="terms" />
      <Stack.Screen name="privacy-policy" />
      <Stack.Screen name="reset-password" />
    </Stack>
  );
}
