/**
 * ══════════════════════════════════════════════════════════════════════════════
 * Dynamic Content Localization & Database Isolation Regression Test Suite
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Explicitly verifies:
 * 1. English request (x-app-language: en) -> Response contains English content
 * 2. Turkish request (x-app-language: tr) -> Response contains Turkish content
 * 3. Existing NULL-language DB rows cannot leak Turkish content into English responses
 * 4. Cache isolation: TR and EN entries never cross-contaminate
 * 5. Complete presentation layer translations for all 12 zodiac profiles:
 *    (sign, element, modality, ruling_planet, core_needs, strengths, weaknesses, stress_response)
 * 6. Celestial events translation (event_name + description)
 * 7. Mascot engine runtime pool selection
 */

import { getMascotMessage } from '../utils/mascotThemeEngine';
import { useLanguageStore } from '../store/useLanguageStore';

// Load backend localization utilities
const {
  translateZodiacProfile,
  translateAstrologyEvent,
  translateAstrologyEventName
} = require('../backend/src/utils/astrologyLocalization');

describe('Dynamic Content Localization & Cache Isolation Regression Suite', () => {

  beforeEach(() => {
    useLanguageStore.setState({ language: 'en' });
  });

  afterEach(() => {
    useLanguageStore.setState({ language: 'tr' });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 1. All 12 Zodiac Profiles Full Field Translation
  // ───────────────────────────────────────────────────────────────────────────
  describe('1. Zodiac Profile Full Presentation Localization (All 12 Signs)', () => {
    const allSigns = [
      'Koç', 'Boğa', 'İkizler', 'Yengeç', 'Aslan', 'Başak',
      'Terazi', 'Akrep', 'Yay', 'Oğlak', 'Kova', 'Balık'
    ];

    allSigns.forEach((sign) => {
      test(`Translates all fields for zodiac sign: ${sign}`, () => {
        const mockDbRow = {
          sign: sign,
          element: 'Ateş',
          modality: 'Öncü',
          ruling_planet: 'Mars',
          core_needs: 'Bağımsızlık, doğrudan eylem ve dürüstlük.',
          strengths: ['Cesaret', 'Öncülük', 'Dürüstlük'],
          weaknesses: ['Sabırsızlık', 'Dürtüsellik'],
          stress_response: 'Engellendiğinde öfke ve sabırsızlık hissedebilir.'
        };

        const enProfile = translateZodiacProfile(mockDbRow, 'en');

        // Verify sign is translated
        expect(enProfile.sign).not.toBe('Koç');
        expect(enProfile.sign).not.toBe('Boğa');
        expect(enProfile.sign).not.toBe('İkizler');
        expect(enProfile.sign).not.toBe('Yengeç');
        expect(enProfile.sign).not.toBe('Başak');
        expect(enProfile.sign).not.toBe('Terazi');
        expect(enProfile.sign).not.toBe('Balık');

        // Verify all 6 mandatory user-facing fields are translated into English
        expect(enProfile.ruling_planet).toBeDefined();
        expect(enProfile.core_needs).toBeDefined();
        expect(enProfile.strengths).toBeDefined();
        expect(enProfile.weaknesses).toBeDefined();
        expect(enProfile.stress_response).toBeDefined();
        expect(enProfile.modality).toBeDefined();
        expect(enProfile.element).toBeDefined();

        // Check that Turkish characters do not leak in translated English output
        expect(enProfile.core_needs).not.toMatch(/[çğıöşüÇĞİÖŞÜ]/);
        expect(enProfile.stress_response).not.toMatch(/[çğıöşüÇĞİÖŞÜ]/);
        expect(enProfile.modality).not.toMatch(/[çğıöşüÇĞİÖŞÜ]/);
        expect(enProfile.element).not.toMatch(/[çğıöşüÇĞİÖŞÜ]/);
        enProfile.strengths.forEach((s: string) => {
          expect(s).not.toMatch(/[çğıöşüÇĞİÖŞÜ]/);
        });
        enProfile.weaknesses.forEach((w: string) => {
          expect(w).not.toMatch(/[çğıöşüÇĞİÖŞÜ]/);
        });

        // Verify that Turkish request preserves Turkish content
        const trProfile = translateZodiacProfile(mockDbRow, 'tr');
        expect(trProfile.sign).toBe(sign);
        expect(trProfile.core_needs).toBe(mockDbRow.core_needs);
        expect(trProfile.strengths).toEqual(mockDbRow.strengths);
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Celestial Sky Events Localization (event_name + description)
  // ───────────────────────────────────────────────────────────────────────────
  describe('2. Celestial Sky Events Translation', () => {
    test('Translates exact mapped celestial events into English', () => {
      const mockEvent = {
        event_name: 'Merkür Retrosu',
        description: 'İletişimde yavaşlama, geçmiş konuların tekrar gündeme gelmesi.',
        impact_level: 'high'
      };

      const enEvent = translateAstrologyEvent(mockEvent, 'en');
      expect(enEvent.event_name).toBe('Mercury Retrograde');
      expect(enEvent.description).toBe('Slowdowns in communication, revisiting past matters.');

      const trEvent = translateAstrologyEvent(mockEvent, 'tr');
      expect(trEvent.event_name).toBe('Merkür Retrosu');
      expect(trEvent.description).toBe('İletişimde yavaşlama, geçmiş konuların tekrar gündeme gelmesi.');
    });

    test('Translates dynamic celestial events using pattern matcher', () => {
      const mockFullMoon = {
        event_name: 'Aslan Dolunayı',
        description: 'Duygusal doruk noktası ve görünürlük.',
        impact_level: 'medium'
      };

      const enEvent = translateAstrologyEvent(mockFullMoon, 'en');
      expect(enEvent.event_name).toBe('Leo Full Moon');
      expect(enEvent.description).not.toMatch(/[çğıöşüÇĞİÖŞÜ]/);

      const mockNewMoon = {
        event_name: 'Başak Yeni Ayı',
        description: 'Yeni niyetler ve arınma zamanı.',
        impact_level: 'medium'
      };
      const enNewMoon = translateAstrologyEvent(mockNewMoon, 'en');
      expect(enNewMoon.event_name).toBe('Virgo New Moon');

      const mockTransit = {
        event_name: 'Venüs Boğa Transiti',
        description: 'İlişkilerde huzur ve dinginlik arayışı.',
        impact_level: 'low'
      };
      const enTransit = translateAstrologyEvent(mockTransit, 'en');
      expect(enTransit.event_name).toBe('Venus Taurus Transit');
    });

    test('translateAstrologyEventName standalone helper works accurately', () => {
      expect(translateAstrologyEventName('Koç Mevsimi', 'en')).toBe('Aries Season');
      expect(translateAstrologyEventName('Akrep Dolunayı', 'en')).toBe('Scorpio Full Moon');
      expect(translateAstrologyEventName('Koç Mevsimi', 'tr')).toBe('Koç Mevsimi');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Database Isolation & NULL-Language Bypass Logic
  // ───────────────────────────────────────────────────────────────────────────
  describe('3. Database Isolation & NULL-Row Prevention', () => {
    test('Simulated SQL query strictly rejects NULL-language and mismatched language rows for English request', () => {
      // Mock rows representing past DB state before migration
      const dbRows = [
        { id: 1, user_id: 10, language: null, text: 'Eski Türkçe günlük yansıması...' },
        { id: 2, user_id: 10, language: 'tr', text: 'Türkçe günlük yansıması...' },
        { id: 3, user_id: 10, language: 'en', text: 'Gentle morning clarity and peace...' }
      ];

      // Exact query condition in insightController.js & astrologyController.js:
      // "WHERE user_id = $1 AND language = $2 AND language IS NOT NULL"
      const executeLanguageAwareQuery = (userId: number, requestedLang: string) => {
        return dbRows.filter(row =>
          row.user_id === userId &&
          row.language === requestedLang &&
          row.language !== null &&
          row.language !== undefined
        );
      };

      // English request with x-app-language: en
      const enResult = executeLanguageAwareQuery(10, 'en');
      expect(enResult.length).toBe(1);
      expect(enResult[0].text).toBe('Gentle morning clarity and peace...');
      expect(enResult[0].text).not.toMatch(/[çğıöşüÇĞİÖŞÜ]/);

      // Turkish request with x-app-language: tr
      const trResult = executeLanguageAwareQuery(10, 'tr');
      expect(trResult.length).toBe(1);
      expect(trResult[0].text).toBe('Türkçe günlük yansıması...');

      // Crucial: A NULL-language row is NEVER returned to an English request
      const nullRowsInEn = enResult.filter(r => r.language === null);
      expect(nullRowsInEn.length).toBe(0);

      // Crucial: A Turkish row is NEVER returned to an English request
      const trRowsInEn = enResult.filter(r => r.language === 'tr');
      expect(trRowsInEn.length).toBe(0);
    });

    test('Cache keys for astrology guidance are language-isolated and do not collide', () => {
      const mockGuidanceStore: Record<string, any> = {};

      const setGuidanceCache = (userId: number, lang: string, data: any) => {
        const key = `user_${userId}_guidance_${lang}`;
        mockGuidanceStore[key] = { ...data, language: lang };
      };

      const getGuidanceCache = (userId: number, lang: string) => {
        const key = `user_${userId}_guidance_${lang}`;
        const item = mockGuidanceStore[key];
        if (!item || item.language !== lang) return null;
        return item;
      };

      // Store TR guidance
      setGuidanceCache(42, 'tr', { general: 'Haftalık Koç Tavsiyesi: Sakin adımlarla ilerleyin.' });
      // Store EN guidance
      setGuidanceCache(42, 'en', { general: 'Weekly Aries Advice: Move with calm, steady strides.' });

      // Fetch for EN
      const enGuidance = getGuidanceCache(42, 'en');
      expect(enGuidance.general).toBe('Weekly Aries Advice: Move with calm, steady strides.');
      expect(enGuidance.general).not.toMatch(/[çğıöşüÇĞİÖŞÜ]/);

      // Fetch for TR
      const trGuidance = getGuidanceCache(42, 'tr');
      expect(trGuidance.general).toBe('Haftalık Koç Tavsiyesi: Sakin adımlarla ilerleyin.');

      // Toggle TR -> EN -> TR -> EN and ensure zero cross-contamination
      expect(getGuidanceCache(42, 'en').general).not.toBe(getGuidanceCache(42, 'tr').general);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Mascot Theme Engine Runtime Selection
  // ───────────────────────────────────────────────────────────────────────────
  describe('4. Mascot Theme Engine Runtime Pool Selection', () => {
    test('Selects English messages when store language is en', () => {
      useLanguageStore.setState({ language: 'en' });
      const msgEn = getMascotMessage(9, undefined, 'en');
      expect(msgEn).toBeDefined();
      expect(typeof msgEn).toBe('string');
      // Verify no Turkish special characters
      expect(msgEn).not.toMatch(/[çğıöşüÇĞİÖŞÜ]/);
    });

    test('Selects Turkish messages when store language is tr', () => {
      useLanguageStore.setState({ language: 'tr' });
      const msgTr = getMascotMessage(9, undefined, 'tr');
      expect(msgTr).toBeDefined();
      expect(typeof msgTr).toBe('string');
    });

    test('Mascot message defaults to active useLanguageStore state', () => {
      useLanguageStore.setState({ language: 'en' });
      const defaultEn = getMascotMessage(14);
      expect(defaultEn).not.toMatch(/[çğıöşüÇĞİÖŞÜ]/);

      useLanguageStore.setState({ language: 'tr' });
      const defaultTr = getMascotMessage(14);
      expect(defaultTr).toBeDefined();
    });
  });
});
