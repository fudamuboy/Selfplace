import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { detectDeviceLanguage, getDevicePrimaryLanguage, toSupportedLanguage } from '../utils/deviceLanguage';

export type Language = 'tr' | 'en';

export const LANGUAGE_STORAGE_KEY = 'appLanguage';
export const LANGUAGE_SELECTION_COMPLETED_KEY = 'hasCompletedLanguageSelection';
/** Primary subtag of the device language last seen by the app ('tr', 'en', 'fr'…). */
export const LAST_DEVICE_LANGUAGE_KEY = 'lastDeviceLanguage';
/** The app language changed while the backend could not be told (no session yet). */
const BACKEND_SYNC_PENDING_KEY = 'languageBackendSyncPending';

interface LanguageState {
  language: Language;
  hasSelectedLanguage: boolean;
  isInitialized: boolean;
  setLanguage: (lang: Language) => Promise<void>;
  setHasSelectedLanguage: (completed: boolean) => Promise<void>;
  loadLanguage: () => Promise<Language>;
  syncWithDeviceLanguage: () => Promise<void>;
  flushBackendLanguageSync: () => Promise<void>;
}

/**
 * Device ↔ app language rule:
 * - The app remembers the last device language it observed.
 * - When the device language CHANGES to a supported language (en/tr), the app follows it.
 * - While the device language does not change, a manual choice in Settings is kept.
 * - An unsupported device language (fr, de…) never changes the app language.
 *
 * Returns the supported language to switch to, or null; always records the new observation.
 */
async function observeDeviceLanguageChange(): Promise<Language | null> {
  const device = getDevicePrimaryLanguage();
  if (!device) return null;
  const lastSeen = await AsyncStorage.getItem(LAST_DEVICE_LANGUAGE_KEY);
  if (device === lastSeen) return null;
  await AsyncStorage.setItem(LAST_DEVICE_LANGUAGE_KEY, device);
  return toSupportedLanguage(device);
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
        } else {
          // Told to the backend once a session is available (flushBackendLanguageSync)
          await AsyncStorage.setItem(BACKEND_SYNC_PENDING_KEY, 'true');
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
      const onboarded = (await AsyncStorage.getItem('onboardingCompleted')) === 'true';

      const isSelected = storedSelected === 'true';
      const hasStoredLang = storedLang === 'en' || storedLang === 'tr';
      // The app already has a language of its own (chosen, or a pre-language-picker install)
      const established = hasStoredLang || isSelected || onboarded;

      let validLang: Language;
      if (hasStoredLang) {
        validLang = storedLang as Language;
      } else if (established) {
        // Installs from before the language picker existed default to Turkish
        validLang = 'tr';
      } else {
        // True first launch: follow the device language (not persisted until the user confirms)
        validLang = detectDeviceLanguage();
      }

      // Applied here, before the first screen renders, so the UI never flashes the old language
      const deviceLang = await observeDeviceLanguageChange();
      if (established && deviceLang && deviceLang !== validLang) {
        validLang = deviceLang;
        await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, deviceLang);
        // No session is restored yet at this point: tell the backend later
        await AsyncStorage.setItem(BACKEND_SYNC_PENDING_KEY, 'true');
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

  /** Called when the app returns to the foreground: follows a device language change. */
  syncWithDeviceLanguage: async () => {
    try {
      if (!get().isInitialized) return;
      const deviceLang = await observeDeviceLanguageChange();
      // During the first-launch language screen the choice is still the user's to confirm
      const established = get().hasSelectedLanguage || !!(await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY));
      if (established && deviceLang && deviceLang !== get().language) {
        await get().setLanguage(deviceLang);
      }
    } catch (e) {
      console.error('[useLanguageStore] Error syncing device language:', e);
    }
  },

  /** Sends a language change made without a session to the backend, once one is available. */
  flushBackendLanguageSync: async () => {
    try {
      if ((await AsyncStorage.getItem(BACKEND_SYNC_PENDING_KEY)) !== 'true') return;
      const useAuthStore = require('./useAuthStore').default;
      if (!useAuthStore.getState().token) return;
      const client = require('../api/client').default;
      await client.put('/user/language', { language: get().language });
      await AsyncStorage.removeItem(BACKEND_SYNC_PENDING_KEY);
    } catch {
      // Kept pending: retried on the next session start
    }
  },
}));
