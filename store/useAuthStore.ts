import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: number;
  username: string;
  email: string;
  createdAt?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  onboardingCompleted: boolean | null;
  postAuthOnboardingCompleted: boolean | null;
  setAuth: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  setOnboardingCompleted: (completed: boolean) => Promise<void>;
  setPostAuthOnboardingCompleted: (completed: boolean) => Promise<void>;
  resetAll: () => Promise<void>;
}

const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  onboardingCompleted: null,
  postAuthOnboardingCompleted: null,
  setAuth: async (token, user) => {
    await AsyncStorage.setItem('token', token);
    await AsyncStorage.setItem('user', JSON.stringify(user));
    set({ token, user });
  },
  logout: async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    set({ token: null, user: null });
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
    set({ token: null, user: null, onboardingCompleted: false, postAuthOnboardingCompleted: false });
  },
}));

export default useAuthStore;
