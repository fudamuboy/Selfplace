import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: number;
  username: string;
  email: string;
  zodiac_sign?: string;
  birth_date?: string;
  createdAt?: string;
  onboarding_goals?: string[];
}

interface AuthState {
  token: string | null;
  user: User | null;
  planType: 'free' | 'plus' | 'signature';
  onboardingCompleted: boolean | null;
  postAuthOnboardingCompleted: boolean | null;
  sessionExpired: boolean;
  setAuth: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  handleSessionExpiry: () => Promise<void>;
  clearSessionExpired: () => void;
  setOnboardingCompleted: (completed: boolean) => Promise<void>;
  setPostAuthOnboardingCompleted: (completed: boolean) => Promise<void>;
  resetAll: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  setPlanType: (planType: 'free' | 'plus' | 'signature') => void;
}

const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  planType: 'free',
  onboardingCompleted: null,
  postAuthOnboardingCompleted: null,
  sessionExpired: false,

  setPlanType: (planType) => set({ planType }),

  setAuth: async (token, user) => {
    if (__DEV__) {
      console.log(`[AUTH-TRACE setAuth] ${new Date().toISOString()} — token: ${token.slice(0, 12)}...`);
      console.trace('[AUTH-TRACE setAuth] call stack');
    }
    await AsyncStorage.setItem('token', token);
    await AsyncStorage.setItem('user', JSON.stringify(user));
    set({ token, user, sessionExpired: false });
  },

  updateUser: async (updates) => {
    const currentUser = get().user;
    if (currentUser) {
      const updatedUser = { ...currentUser, ...updates };
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      set({ user: updatedUser });
    }
  },

  logout: async () => {
    if (__DEV__) {
      console.warn(`[AUTH-TRACE logout] ${new Date().toISOString()}`);
      console.trace('[AUTH-TRACE logout] call stack');
    }
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    set({ token: null, user: null, sessionExpired: false, planType: 'free' });
  },

  /**
   * Called by the API client when a 401/403 is received.
   * Clears credentials from storage and signals the UI to redirect to login.
   */
  handleSessionExpiry: async () => {
    if (__DEV__) {
      console.warn(`[AUTH-TRACE handleSessionExpiry] ${new Date().toISOString()}`);
      console.trace('[AUTH-TRACE handleSessionExpiry] call stack');
    }
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    set({ token: null, user: null, sessionExpired: true, planType: 'free' });
  },

  /** Call once the session-expiry message has been shown. */
  clearSessionExpired: () => {
    set({ sessionExpired: false });
  },

  setOnboardingCompleted: async (completed) => {
    await AsyncStorage.setItem('onboardingCompleted', completed ? 'true' : 'false');
    set({ onboardingCompleted: completed });
  },

  setPostAuthOnboardingCompleted: async (completed) => {
    await AsyncStorage.setItem('postAuthOnboardingCompleted', completed ? 'true' : 'false');
    set({ postAuthOnboardingCompleted: completed });
  },

  resetAll: async () => {
    const savedLang = await AsyncStorage.getItem('appLanguage');
    const savedSelected = await AsyncStorage.getItem('hasCompletedLanguageSelection');
    const savedDeviceLang = await AsyncStorage.getItem('lastDeviceLanguage');
    await AsyncStorage.clear();
    if (savedLang) await AsyncStorage.setItem('appLanguage', savedLang);
    if (savedSelected) await AsyncStorage.setItem('hasCompletedLanguageSelection', savedSelected);
    // Keeps the device-language observation, so a reset does not override the user's language choice
    if (savedDeviceLang) await AsyncStorage.setItem('lastDeviceLanguage', savedDeviceLang);
    set({ token: null, user: null, onboardingCompleted: false, postAuthOnboardingCompleted: false, sessionExpired: false, planType: 'free' });
  },
}));

export default useAuthStore;
