import { tr } from '../i18n/tr';
import { en } from '../i18n/en';
import { t } from '../i18n';
import { useLanguageStore } from '../store/useLanguageStore';

describe('Runtime & AI Deep Localization Verification Suite', () => {
  beforeEach(() => {
    useLanguageStore.getState().setLanguage('en');
  });

  afterEach(() => {
    useLanguageStore.getState().setLanguage('tr');
  });

  test('1. English dictionary has 100% key parity with Turkish dictionary', () => {
    function getKeys(obj: any, prefix = ''): string[] {
      return Object.keys(obj).reduce((acc: string[], key: string) => {
        const pre = prefix ? `${prefix}.` : '';
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          acc.push(...getKeys(obj[key], `${pre}${key}`));
        } else {
          acc.push(`${pre}${key}`);
        }
        return acc;
      }, []);
    }

    const trKeys = getKeys(tr);
    const enKeys = getKeys(en);

    const missingInEn = trKeys.filter((k) => !enKeys.includes(k));
    expect(missingInEn).toEqual([]);
  });

  test('2. t() hook returns natural English strings without falling back to Turkish strings', () => {
    useLanguageStore.getState().setLanguage('en');

    expect(t('settings.title')).toBe('Settings');
    expect(t('settings.selectLanguage')).toBe('App Language');
    expect(t('common.cancel')).toBe('Cancel');
    expect(t('common.confirm')).toBe('Confirm');
    expect(t('checkIn.title')).toBe('Daily Check-in');
  });

  test('3. Card Fallback System provides localized English card content', async () => {
    const { pickFallbackCards } = require('../utils/cardPool');
    const cardsEn = await pickFallbackCards(3, true);

    expect(cardsEn.length).toBe(3);
    cardsEn.forEach((card: any) => {
      // Ensure no Turkish character leakage in fallback messages
      expect(card.title).not.toMatch(/[ığüşöçİĞÜŞÖÇ]/);
      expect(card.message).not.toMatch(/[ığüşöçİĞÜŞÖÇ]/);
    });
  });

  test('4. Language store persistence maintains device preference', async () => {
    await useLanguageStore.getState().setLanguage('en');
    expect(useLanguageStore.getState().language).toBe('en');

    await useLanguageStore.getState().loadLanguage();
    expect(useLanguageStore.getState().language).toBe('en');
  });
});
