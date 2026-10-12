import { I18nManager, Platform, Settings } from 'react-native';
import { getLocales } from 'expo-localization';
import type { Language } from '../store/useLanguageStore';

/**
 * The device's preferred language, e.g. "tr-TR".
 *
 * expo-localization reads the iPhone's preferred languages natively on every call
 * (Locale.preferredLanguages), so a change made while Selfplace is in the background is
 * visible when it returns to the foreground. React Native's Settings only holds the values
 * read at startup, so it is kept as a fallback only.
 */
export function getDeviceLocale(): string | null {
  try {
    const tag = getLocales()[0]?.languageTag;
    if (tag) return tag;
  } catch {
    // native module unavailable: fall back to React Native built-ins
  }
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

/** Primary language subtag of the device's preferred language ('tr', 'en', 'fr'…), or null if unknown. */
export function getDevicePrimaryLanguage(): string | null {
  const primary = getDeviceLocale()?.split(/[-_]/)[0]?.toLowerCase();
  return primary || null;
}

/** 'tr' / 'en' when Selfplace supports the language, null otherwise (unsupported languages never switch the app). */
export function toSupportedLanguage(primary: string | null | undefined): Language | null {
  return primary === 'tr' || primary === 'en' ? primary : null;
}
