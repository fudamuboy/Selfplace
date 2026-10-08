import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguageStore } from '../store/useLanguageStore';
import { resolveDeviceLanguage } from '../utils/deviceLanguage';

// Simulated iOS device languages (Settings.get('AppleLanguages'))
let mockAppleLanguages: string[] | null = ['en-US'];
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  Settings: { get: (key: string) => (key === 'AppleLanguages' ? mockAppleLanguages : null) },
  I18nManager: { getConstants: () => ({ localeIdentifier: null }) },
}));

const freshLaunch = async (deviceLanguages: string[] | null) => {
  mockAppleLanguages = deviceLanguages;
  // Simulate an app restart: in-memory store back to its defaults, then hydrate from storage
  useLanguageStore.setState({ language: 'tr', hasSelectedLanguage: false, isInitialized: false });
  return useLanguageStore.getState().loadLanguage();
};

describe('First-launch language detection', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('1. fresh install + English device → English preselected, nothing persisted', async () => {
    expect(await freshLaunch(['en-US', 'tr-TR'])).toBe('en');
    expect(useLanguageStore.getState().hasSelectedLanguage).toBe(false);
    expect(await AsyncStorage.getItem('appLanguage')).toBeNull();
  });

  test('2. fresh install + Turkish device → Turkish preselected', async () => {
    expect(await freshLaunch(['tr-TR', 'en-US'])).toBe('tr');
  });

  test('3. English device + user chooses Turkish → Turkish persists', async () => {
    await freshLaunch(['en-US']);
    await useLanguageStore.getState().setLanguage('tr');
    await useLanguageStore.getState().setHasSelectedLanguage(true);
    expect(await AsyncStorage.getItem('appLanguage')).toBe('tr');
    expect(useLanguageStore.getState().language).toBe('tr');
  });

  test('4. restart after choosing Turkish → still Turkish', async () => {
    await freshLaunch(['en-US']);
    await useLanguageStore.getState().setLanguage('tr');
    expect(await freshLaunch(['en-US'])).toBe('tr');
  });

  test('5. device language changes after a choice → the choice wins', async () => {
    await freshLaunch(['tr-TR']);
    await useLanguageStore.getState().setLanguage('en'); // e.g. switched in Settings
    expect(await freshLaunch(['tr-TR'])).toBe('en');
    await useLanguageStore.getState().setLanguage('tr');
    expect(await freshLaunch(['en-GB'])).toBe('tr');
  });

  test('6. unsupported device language → English fallback', async () => {
    expect(await freshLaunch(['fr-FR', 'tr-TR'])).toBe('en');
    expect(await freshLaunch(['de-DE'])).toBe('en');
    expect(await freshLaunch(['es-ES'])).toBe('en');
  });

  test('7. installs from before the language picker keep Turkish', async () => {
    await AsyncStorage.setItem('onboardingCompleted', 'true');
    expect(await freshLaunch(['en-US'])).toBe('tr');
  });

  test('locale parsing', () => {
    expect(resolveDeviceLanguage('tr')).toBe('tr');
    expect(resolveDeviceLanguage('tr_TR')).toBe('tr');
    expect(resolveDeviceLanguage('TR-tr')).toBe('tr');
    expect(resolveDeviceLanguage('en_US')).toBe('en');
    expect(resolveDeviceLanguage('trk')).toBe('en');
    expect(resolveDeviceLanguage(null)).toBe('en');
  });
});
