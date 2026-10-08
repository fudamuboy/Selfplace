import { tr, TranslationKeys } from './tr';
import { en } from './en';
import { useLanguageStore, Language } from '../store/useLanguageStore';

const translations: Record<Language, TranslationKeys> = {
  tr,
  en,
};

type NestedKeys<T> = T extends object
  ? {
      [K in keyof T & (string | number)]: T[K] extends object
        ? `${K}.${NestedKeys<T[K]>}`
        : `${K}`;
    }[keyof T & (string | number)]
  : '';

export type TranslationKeyPath = NestedKeys<TranslationKeys>;

/**
 * Gets a nested value from a dictionary using a dot-notation key.
 */
function getNestedValue(obj: any, path: string): string | undefined {
  const keys = path.split('.');
  let current = obj;
  for (const k of keys) {
    if (current && typeof current === 'object' && k in current) {
      current = current[k];
    } else {
      return undefined;
    }
  }
  return typeof current === 'string' ? current : undefined;
}

/**
 * Helper to retrieve a translated string by key path with optional parameter substitution.
 * Fallbacks to Turkish if key missing in English, and to key string if missing in both.
 */
export function t(
  keyPath: TranslationKeyPath | string,
  params?: Record<string, string | number>,
  overrideLang?: Language
): string {
  const storeLang = useLanguageStore.getState().language;
  const lang = overrideLang || storeLang || 'tr';

  let text = getNestedValue(translations[lang], keyPath);

  // Fallback to TR if missing in EN
  if (text === undefined && lang !== 'tr') {
    text = getNestedValue(translations['tr'], keyPath);
  }

  // Fallback to EN if missing in TR
  if (text === undefined && lang !== 'en') {
    text = getNestedValue(translations['en'], keyPath);
  }

  // Safe fallback if missing in both: NEVER leak raw technical dot-notation keys!
  if (text === undefined) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn(`[i18n] Missing translation key: "${keyPath}" for lang "${lang}"`);
    }
    const lastPart = (keyPath.split('.').pop() || keyPath);
    text = lastPart
      .replace(/([A-Z])/g, ' $1')
      .replace(/[-_]/g, ' ')
      .trim();
    text = text.replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // Replace parameters if provided e.g. {name} -> 'Alice'
  if (params && typeof text === 'string') {
    Object.entries(params).forEach(([paramKey, paramVal]) => {
      text = (text as string).replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
    });
  }

  return text;
}

/**
 * React hook to get translated strings bound to the current active language in useLanguageStore.
 */
export function useT() {
  const language = useLanguageStore((state) => state.language);

  const translate = (
    keyPath: TranslationKeyPath | string,
    params?: Record<string, string | number>
  ) => {
    return t(keyPath, params, language);
  };

  return {
    t: translate,
    language,
  };
}

export { tr, en };
