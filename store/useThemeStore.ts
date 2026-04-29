import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { themeModes, ThemeMode } from '../constants/themeModes';

interface ThemeState {
  currentTheme: ThemeMode;
  setTheme: (themeId: 'sakin' | 'minimal' | 'sicak') => Promise<void>;
  loadTheme: () => Promise<void>;
}

const useThemeStore = create<ThemeState>((set) => ({
  currentTheme: themeModes.sakin,
  setTheme: async (themeId) => {
    const theme = themeModes[themeId];
    if (theme) {
      await AsyncStorage.setItem('app_theme', themeId);
      set({ currentTheme: theme });
    }
  },
  loadTheme: async () => {
    try {
      const savedThemeId = await AsyncStorage.getItem('app_theme');
      if (savedThemeId && themeModes[savedThemeId]) {
        set({ currentTheme: themeModes[savedThemeId] });
      }
    } catch (error) {
      console.log('Error loading theme:', error);
    }
  },
}));

export default useThemeStore;
