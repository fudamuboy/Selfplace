/**
 * expo-localization mock for Jest (no native module in Node).
 * Returns no locale by default, so device-language tests drive React Native's Settings mock;
 * tests that target expo-localization set getLocales' return value.
 */
export const getLocales = jest.fn(() => [] as { languageTag: string }[]);
