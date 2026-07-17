import 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { View, ActivityIndicator, Animated, Text, StyleSheet, Platform, AppState } from 'react-native';
import useThemeStore from "../store/useThemeStore";
import useAuthStore from "../store/useAuthStore";
import { useNetworkStore } from "../store/useNetworkStore";
import * as Notifications from '../utils/notifications';
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

        // Load theme
        try {
          await loadTheme();
        } catch (e) {
          console.error('[Startup] Theme load failed:', e);
        }

        // Check onboarding status
        try {
          const onboardingValue = await AsyncStorage.getItem('onboardingCompleted');
          await setOnboardingCompleted(onboardingValue === 'true');
        } catch (e) {
          console.error('[Startup] Onboarding status check failed:', e);
          await setOnboardingCompleted(false);
        }

        // Check post-auth onboarding status
        try {
          const postAuthValue = await AsyncStorage.getItem('postAuthOnboardingCompleted');
          await setPostAuthOnboardingCompleted(postAuthValue === 'true');
        } catch (e) {
          console.error('[Startup] Post-auth onboarding status check failed:', e);
          await setPostAuthOnboardingCompleted(false);
        }

        // Restore session — token validity is enforced server-side on first API call
        try {
          const storedToken = await AsyncStorage.getItem('token');
          const storedUser = await AsyncStorage.getItem('user');
          if (storedToken && storedUser) {
            try {
              const parsedUser = JSON.parse(storedUser);
              console.log('[AUTH-TRACE _layout] hydration: calling setAuth with stored token.');
              await setAuth(storedToken, parsedUser);
              console.log('[AUTH-TRACE _layout] hydration: setAuth complete. Fetching subscription...');

              // Hydrate subscription state
              try {
                const sub = await getSubscription();
                console.log('[AUTH-TRACE _layout] hydration: getSubscription OK, plan:', sub.plan_type);
                useAuthStore.getState().setPlanType(sub.plan_type);
              } catch (subErr: any) {
                if (subErr?.isSessionExpiry || subErr?.message === 'SESSION_EXPIRED') {
                  // Normal condition: stored JWT has expired.
                  // The API interceptor already called handleSessionExpiry() which
                  // cleared token + user from AsyncStorage and set token=null in store.
                  // Route guard will redirect to login — no red screen, no crash.
                  console.warn('[Startup] Stored session expired — redirecting to login.');
                  // Explicit cleanup (belt-and-suspenders in case interceptor skipped it)
                  await AsyncStorage.removeItem('token');
                  await AsyncStorage.removeItem('user');
                } else {
                  console.warn('[Startup] Failed to fetch subscription (non-auth):', subErr);
                }
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

        // IAP is intentionally NOT initialised here.
        // purchaseUpdatedListener can fire synchronously inside initConnection()
        // for pending StoreKit transactions. If initIAP() runs before the token
        // is confirmed stable in the store, those listener-triggered calls to
        // verifyAppleReceipt() go out with no Authorization header, the JWT
        // middleware returns 401, and the global interceptor calls
        // handleSessionExpiry() — logging the user out immediately after login.
        // initIAP() is deferred to a separate useEffect guarded by isReady + token.
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
        useAuthStore.getState().clearSessionExpired();
        setIsReady(true);
      }
    }
    initialize();
  }, []);

  // ── IAP initialisation — deferred until the user is authenticated ───────────
  // MUST run after isReady=true so the token is guaranteed to be in the store
  // before purchaseUpdatedListener can fire and call verifyAppleReceipt().
  // Without this guard, a pending StoreKit transaction fires the listener
  // synchronously inside initConnection(), the request goes out with no token,
  // the JWT middleware returns 401, and handleSessionExpiry() is triggered
  // immediately after a fresh login.
  const iapInitialisedRef = useRef(false);
  useEffect(() => {
    if (!token) {
      iapInitialisedRef.current = false;
      try {
        useSubscriptionStore.getState().teardownIAP();
      } catch (e) {
        console.error('[IAP] Teardown exception:', e);
      }
      return;
    }
    if (!isReady) {
      return;
    }
    if (iapInitialisedRef.current) {
      return;
    }
    iapInitialisedRef.current = true;
    try {
      useSubscriptionStore.getState().initIAP();
    } catch (e) {
      console.error('[Startup] IAP init exception:', e);
    }
  }, [isReady, token]);

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: string) => {
      if (nextAppState === 'active') {
        // Guard: never fire authenticated requests before startup hydration is complete
        // and never fire if the user is not logged in.
        const currentToken = useAuthStore.getState().token;
        console.log(`[AUTH-TRACE _layout] AppState -> active. isReady=${isReady}, token=${currentToken ? 'SET' : 'NULL'}`);

        if (!isReady || !currentToken) {
          console.log('[AUTH-TRACE _layout] AppState wake skipped: not ready or not authenticated.');
          return;
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
  }, [isReady]);

  // Track the last active token so we only show the toast on expiry of an ACTIVE session
  const prevTokenRef = useRef<string | null>(null);
  useEffect(() => {
    if (token) {
      prevTokenRef.current = token;
    } else if (!sessionExpired) {
      prevTokenRef.current = null;
    }
  }, [token, sessionExpired]);

  // ── Session expiry: show soft toast then redirect to login ─────────────────
  useEffect(() => {
    console.log(`[AUTH-TRACE _layout] sessionExpired effect: sessionExpired=${sessionExpired}, isReady=${isReady}, prevToken=${prevTokenRef.current ? 'SET' : 'NULL'}`);
    if (sessionExpired && isReady) {
      if (prevTokenRef.current !== null) {
        console.warn('[AUTH-TRACE _layout] ⚠️  Showing session-expired toast and redirecting to login.');
        setShowSessionToast(true);
      } else {
        console.log('[AUTH-TRACE _layout] Silent session expiry (startup hydration / no active session). Redirecting to login.');
      }
      // Navigate to login after a brief delay so the toast is visible
      const timer = setTimeout(() => {
        router.replace('/(auth)/login');
        prevTokenRef.current = null;
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
