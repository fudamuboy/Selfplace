import 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { View, ActivityIndicator, Animated, Text, StyleSheet, Platform, AppState } from 'react-native';
import useThemeStore from "../store/useThemeStore";
import useAuthStore from "../store/useAuthStore";
import { useNetworkStore } from "../store/useNetworkStore";
import * as Notifications from 'expo-notifications';
import { getSubscription } from '../api/userApi';
import useSubscriptionStore from '../store/useSubscriptionStore';

// ─── Soft session-expiry toast ────────────────────────────────────────────────
function SessionExpiredToast({ visible, onHide }: { visible: boolean; onHide: () => void }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: 10, duration: 300, useNativeDriver: true }),
        ]).start(() => onHide());
      }, 3500);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        toastStyles.container,
        { opacity: fadeAnim, transform: [{ translateY }] },
      ]}
    >
      <Text style={toastStyles.emoji}>🔐</Text>
      <Text style={toastStyles.text}>
        Oturum süren doldu. Lütfen tekrar giriş yap.
      </Text>
    </Animated.View>
  );
}

const toastStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 60,
    left: 24,
    right: 24,
    backgroundColor: 'rgba(30, 20, 50, 0.96)',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 9999,
  },
  emoji: {
    fontSize: 18,
  },
  text: {
    flex: 1,
    color: '#e2d9f3',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
});

// ─── Root Layout ──────────────────────────────────────────────────────────────
export default function RootLayout() {
  const { loadTheme } = useThemeStore();
  const {
    token,
    setAuth,
    onboardingCompleted,
    setOnboardingCompleted,
    postAuthOnboardingCompleted,
    setPostAuthOnboardingCompleted,
    sessionExpired,
    clearSessionExpired,
  } = useAuthStore();
  const [isReady, setIsReady] = useState(false);
  const [showSessionToast, setShowSessionToast] = useState(false);

  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (e) {
    console.error('[Startup] Notification handler setup failed:', e);
  }

  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    async function initialize() {
      try {
        console.log('[Startup] Starting initialization...');

        // Load theme
        try {
          console.log('[Startup] Loading theme...');
          await loadTheme();
        } catch (e) {
          console.error('[Startup] Theme load failed:', e);
        }

        // Check onboarding status
        try {
          console.log('[Startup] Checking onboarding status...');
          const onboardingValue = await AsyncStorage.getItem('onboardingCompleted');
          await setOnboardingCompleted(onboardingValue === 'true');
        } catch (e) {
          console.error('[Startup] Onboarding status check failed:', e);
          await setOnboardingCompleted(false);
        }

        // Check post-auth onboarding status
        try {
          console.log('[Startup] Checking post-auth onboarding status...');
          const postAuthValue = await AsyncStorage.getItem('postAuthOnboardingCompleted');
          await setPostAuthOnboardingCompleted(postAuthValue === 'true');
        } catch (e) {
          console.error('[Startup] Post-auth onboarding status check failed:', e);
          await setPostAuthOnboardingCompleted(false);
        }

        // Restore session — token validity is enforced server-side on first API call
        try {
          console.log('[Startup] Restoring session...');
          const storedToken = await AsyncStorage.getItem('token');
          const storedUser = await AsyncStorage.getItem('user');
          if (storedToken && storedUser) {
            try {
              const parsedUser = JSON.parse(storedUser);
              await setAuth(storedToken, parsedUser);

              // Hydrate subscription state
              try {
                const sub = await getSubscription();
                useAuthStore.getState().setPlanType(sub.plan_type);
              } catch (subErr) {
                console.error('[Startup] Failed to fetch subscription:', subErr);
              }
            } catch (e) {
              console.error('[Startup] Session JSON parse failed:', e);
              // Corrupt storage — clear and send to login
              await AsyncStorage.removeItem('token');
              await AsyncStorage.removeItem('user');
            }
          }
        } catch (e) {
          console.error('[Startup] Session restore failed:', e);
        }

        // Configure Android notification channel
        if (Platform.OS === 'android') {
          try {
            console.log('[Startup] Configuring Android notification channel...');
            await Notifications.setNotificationChannelAsync('default', {
              name: 'default',
              importance: Notifications.AndroidImportance.MAX,
              vibrationPattern: [0, 250, 250, 250],
              lightColor: '#FF231F7C',
            });
          } catch (e) {
            console.error('[Startup] Android notification configuration failed:', e);
          }
        }

        // Initialize IAP globally (fire and forget so it doesn't block UI)
        try {
          console.log('[Startup] Initializing IAP globally...');
          useSubscriptionStore.getState().initIAP();
        } catch (e) {
          console.error('[Startup] IAP init exception:', e);
        }

        console.log('[Startup] Initialization complete.');
      } catch (e) {
        console.error('[Startup] Critical initialization error:', e);
        // Fallback state so the app doesn't hang on splash
        try {
          if (useAuthStore.getState().onboardingCompleted === null) {
            useAuthStore.setState({ onboardingCompleted: false });
          }
        } catch (fallbackError) {
          console.error('[Startup] Fallback initialization error:', fallbackError);
        }
      } finally {
        setIsReady(true);
      }
    }
    initialize();
  }, []);

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: string) => {
      if (nextAppState === 'active') {
        if (__DEV__) {
          console.log('[AppState] App returned to active. Revalidating connectivity...');
        }
        const isOnlineNow = await useNetworkStore.getState().checkConnectivity();
        if (isOnlineNow) {
          useNetworkStore.getState().triggerGlobalRefresh();

          // Silently refresh subscription state so expiry / renewal is reflected
          // immediately without requiring the user to navigate to Profile.
          try {
            const sub = await getSubscription();
            useAuthStore.getState().setPlanType(sub.plan_type);
          } catch {
            // Non-critical: ignore network errors on wake
          }
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);

  // ── Session expiry: show soft toast then redirect to login ─────────────────
  useEffect(() => {
    if (sessionExpired && isReady) {
      setShowSessionToast(true);
      // Navigate to login after a brief delay so the toast is visible
      const timer = setTimeout(() => {
        router.replace('/(auth)/login');
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [sessionExpired, isReady]);

  // ── Route guarding ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';
    const onOnboarding = segments[0] === 'onboarding';
    const onPostAuthOnboarding = segments[0] === 'post-auth-onboarding';
    const onPublic = 
      segments[0] === 'terms' || 
      segments[0] === 'privacy-policy' || 
      segments[0] === 'reset-password' || 
      segments[0] === 'forgot-password';

    if (!onboardingCompleted) {
      if (!onOnboarding) {
        router.replace('/onboarding');
      }
    } else if (!token) {
      if (inTabsGroup || (!inAuthGroup && !onPublic)) {
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
    <View style={{ flex: 1 }}>
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
        <Stack.Screen name="account" />
        <Stack.Screen name="faq" />
        <Stack.Screen name="terms" />
        <Stack.Screen name="privacy-policy" />
        <Stack.Screen name="reset-password" />
        <Stack.Screen name="connections" />
        <Stack.Screen name="connection-invite" />
        <Stack.Screen name="connection-detail" />
        <Stack.Screen name="connection-rituals" />
        <Stack.Screen name="connection-timeline" />
        <Stack.Screen name="personality-result-detail" options={{ presentation: 'modal' }} />
      </Stack>

      {/* Global soft session-expiry toast — rendered above all screens */}
      <SessionExpiredToast
        visible={showSessionToast}
        onHide={() => {
          setShowSessionToast(false);
          clearSessionExpired();
        }}
      />
    </View>
  );
}
