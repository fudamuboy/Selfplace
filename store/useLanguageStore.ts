import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { detectDeviceLanguage } from '../utils/deviceLanguage';

export type Language = 'tr' | 'en';

export const LANGUAGE_STORAGE_KEY = 'appLanguage';
export const LANGUAGE_SELECTION_COMPLETED_KEY = 'hasCompletedLanguageSelection';

interface LanguageState {
  language: Language;
  hasSelectedLanguage: boolean;
  isInitialized: boolean;
  setLanguage: (lang: Language) => Promise<void>;
  setHasSelectedLanguage: (completed: boolean) => Promise<void>;
  loadLanguage: () => Promise<Language>;
}

export const useLanguageStore = create<LanguageState>((set, get) => ({
  language: 'tr',
  hasSelectedLanguage: false,
  isInitialized: false,

  setLanguage: async (lang: Language) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      set({ language: lang });
      try {
        const client = require('../api/client').default;
        const useAuthStore = require('./useAuthStore').default;
        if (useAuthStore.getState().token) {
          client.put('/user/language', { language: lang }).catch(() => {});
        }
        // The daily reminder text is fixed at scheduling time; reschedule it in the new language
        const useNotificationStore = require('./useNotificationStore').default;
        if (useNotificationStore.getState().remindersEnabled) {
          useNotificationStore.getState().scheduleNotification().catch(() => {});
        }
      } catch {
        // ignore background sync error
      }
    } catch (e) {
      console.error('[useLanguageStore] Error setting language:', e);
    }
  },

  setHasSelectedLanguage: async (completed: boolean) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_SELECTION_COMPLETED_KEY, completed ? 'true' : 'false');
      set({ hasSelectedLanguage: completed });
    } catch (e) {
      console.error('[useLanguageStore] Error setting language selection completed:', e);
    }
  },

  loadLanguage: async () => {
    try {
      const storedLang = (await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)) as Language | null;
      const storedSelected = await AsyncStorage.getItem(LANGUAGE_SELECTION_COMPLETED_KEY);

      const isSelected = storedSelected === 'true';

      let validLang: Language;
      if (storedLang === 'en' || storedLang === 'tr') {
        // An explicit choice (language screen or Settings) always wins over the device language
        validLang = storedLang;
      } else if (isSelected || (await AsyncStorage.getItem('onboardingCompleted')) === 'true') {
        // Installs from before the language picker existed keep Turkish
        validLang = 'tr';
      } else {
        // True first launch: follow the device language (not persisted until the user confirms)
        validLang = detectDeviceLanguage();
      }

      set({
        language: validLang,
        hasSelectedLanguage: isSelected,
        isInitialized: true,
      });

      return validLang;
    } catch (e) {
      console.error('[useLanguageStore] Error loading language:', e);
      set({ isInitialized: true });
      return 'tr';
    }
  },
}));
