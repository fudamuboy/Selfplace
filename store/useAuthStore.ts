import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: number;
  username: string;
  email: string;
  zodiac_sign?: string;
  birth_date?: string;
  createdAt?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
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
}

const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  onboardingCompleted: null,
  postAuthOnboardingCompleted: null,
  sessionExpired: false,

  setAuth: async (token, user) => {
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
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    set({ token: null, user: null, sessionExpired: false });
  },

  /**
   * Called by the API client when a 401/403 is received.
   * Clears credentials from storage and signals the UI to redirect to login.
   */
  handleSessionExpiry: async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    set({ token: null, user: null, sessionExpired: true });
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
    await AsyncStorage.clear();
    set({ token: null, user: null, onboardingCompleted: false, postAuthOnboardingCompleted: false, sessionExpired: false });
  },
}));

export default useAuthStore;
