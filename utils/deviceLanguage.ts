import { I18nManager, Platform, Settings } from 'react-native';
import type { Language } from '../store/useLanguageStore';

/**
 * Device language detection with React Native built-ins (no native dependency).
 * Only used when the user has never chosen a language; an explicit choice always wins.
 */
export function getDeviceLocale(): string | null {
  try {
    if (Platform.OS === 'ios') {
      // The user's preferred languages, in order (e.g. ["en-US", "tr-TR"]).
      // I18nManager's locale is unreliable on iOS: it resolves against the app's bundled localizations.
      const preferred = Settings?.get?.('AppleLanguages');
      if (Array.isArray(preferred) && preferred[0]) return String(preferred[0]);
      const appleLocale = Settings?.get?.('AppleLocale');
      if (appleLocale) return String(appleLocale);
    } else if (Platform.OS === 'android') {
      const id = I18nManager?.getConstants?.().localeIdentifier; // e.g. "en_US"
      if (id) return String(id);
    }
  } catch {
    // fall through to Intl
  }
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale || null;
  } catch {
    return null;
  }
}

/** Turkish device → Turkish; English and every unsupported language (fr, de, es…) → English. */
export function resolveDeviceLanguage(locale: string | null | undefined): Language {
  return locale && /^tr([-_]|$)/i.test(locale) ? 'tr' : 'en';
}

export function detectDeviceLanguage(): Language {
  return resolveDeviceLanguage(getDeviceLocale());
}
