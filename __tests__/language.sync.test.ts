/**
 * iPhone language ↔ Selfplace language synchronization.
 * Device language is simulated through Settings.get('AppleLanguages'); the API client is mocked.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguageStore, LANGUAGE_STORAGE_KEY, LAST_DEVICE_LANGUAGE_KEY } from '../store/useLanguageStore';
import useAuthStore from '../store/useAuthStore';
import { getLocales } from 'expo-localization';

let mockAppleLanguages: string[] | null = ['en-US'];
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  Settings: { get: (key: string) => (key === 'AppleLanguages' ? mockAppleLanguages : null) },
  I18nManager: { getConstants: () => ({ localeIdentifier: null }) },
}));

const mockPut = jest.fn(async (..._args: any[]) => ({ data: {} }));
jest.mock('../api/client', () => ({ __esModule: true, default: { put: (...a: any[]) => mockPut(...a) } }));
jest.mock('../store/useNotificationStore', () => ({
  __esModule: true,
  default: { getState: () => ({ remindersEnabled: false }) },
}));

const store = () => useLanguageStore.getState();

/** Cold start: in-memory state reset, then hydration from storage (as _layout does). */
const launch = async (device: string[] | null) => {
  mockAppleLanguages = device;
  useLanguageStore.setState({ language: 'tr', hasSelectedLanguage: false, isInitialized: false });
  return store().loadLanguage();
};

/** App returns to the foreground after the iPhone language changed. */
const foreground = async (device: string[] | null) => {
  mockAppleLanguages = device;
  await store().syncWithDeviceLanguage();
  return store().language;
};

/** A user who already went through the language picker. */
const establishedUser = async (appLanguage: 'tr' | 'en', observedDevice?: string) => {
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, appLanguage);
  await AsyncStorage.setItem('hasCompletedLanguageSelection', 'true');
  if (observedDevice) await AsyncStorage.setItem(LAST_DEVICE_LANGUAGE_KEY, observedDevice);
};

/** Number of writes to appLanguage so far (AsyncStorage is a jest.fn in __mocks__). */
const appLanguageWrites = () =>
  (AsyncStorage.setItem as jest.Mock).mock.calls.filter(([key]) => key === LANGUAGE_STORAGE_KEY).length;

const mockLocales = getLocales as jest.Mock;

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockLocales.mockReturnValue([]); // default: expo-localization gives nothing → Settings fallback
  useAuthStore.setState({ token: null });
});

describe('device language at launch', () => {
  test('device Turkish → Selfplace Turkish', async () => {
    await establishedUser('en');
    expect(await launch(['tr-TR', 'en-US'])).toBe('tr');
    expect(await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('tr');
  });

  test('device English → Selfplace English', async () => {
    await establishedUser('tr');
    expect(await launch(['en-US'])).toBe('en');
    expect(await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');
  });

  test('device French + Selfplace Turkish → stays Turkish', async () => {
    await establishedUser('tr');
    expect(await launch(['fr-FR', 'en-US'])).toBe('tr');
    expect(await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('tr');
  });

  test('device French + Selfplace English → stays English (no fallback)', async () => {
    await establishedUser('en');
    expect(await launch(['fr-FR', 'tr-TR'])).toBe('en');
  });

  test('first launch: device language preselected but not persisted before the user confirms', async () => {
    expect(await launch(['tr-TR'])).toBe('tr');
    expect(await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)).toBeNull();
    expect(await AsyncStorage.getItem(LAST_DEVICE_LANGUAGE_KEY)).toBe('tr');
  });
});

describe('iPhone language changed while Selfplace is installed', () => {
  test('Turkish → English: Selfplace follows when it becomes active', async () => {
    await establishedUser('tr');
    await launch(['tr-TR']);
    expect(await foreground(['en-US'])).toBe('en');
    expect(await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');
  });

  test('English → Turkish: Selfplace follows when it becomes active', async () => {
    await establishedUser('en');
    await launch(['en-GB']);
    expect(await foreground(['tr-TR'])).toBe('tr');
  });

  test('Turkish → English also followed on the next cold start (iOS relaunches apps on a system language change)', async () => {
    await establishedUser('tr');
    await launch(['tr-TR']);
    expect(await launch(['en-US'])).toBe('en');
  });

  test('change to French: current language preserved, and never re-written while unsupported', async () => {
    await establishedUser('en');
    await launch(['en-US']);
    const before = appLanguageWrites();
    expect(await foreground(['fr-FR'])).toBe('en');
    expect(await foreground(['fr-FR'])).toBe('en');
    expect(await launch(['fr-FR'])).toBe('en');
    expect(appLanguageWrites() - before).toBe(0);
  });

  test('French → Turkish: followed once the device language is supported again', async () => {
    await establishedUser('en');
    await launch(['fr-FR']);
    expect(await foreground(['tr-TR'])).toBe('tr');
  });

  test('foreground with an unchanged device language does nothing', async () => {
    await establishedUser('tr');
    await launch(['tr-TR']);
    const before = appLanguageWrites();
    await foreground(['tr-TR']);
    await foreground(['tr-TR']);
    expect(appLanguageWrites() - before).toBe(0);
  });

  test('during the first-launch language screen, a device change does not pick the language for the user', async () => {
    await launch(['en-US']);
    expect(await foreground(['tr-TR'])).toBe('en');
    expect(await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)).toBeNull();
  });
});

describe('manual choice in Settings', () => {
  test('updates immediately, persists, and survives foreground/reopen while the iPhone language is unchanged', async () => {
    await establishedUser('tr');
    await launch(['tr-TR']);

    await store().setLanguage('en'); // Settings → English
    expect(store().language).toBe('en');
    expect(await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');

    expect(await foreground(['tr-TR'])).toBe('en'); // not overwritten
    expect(await launch(['tr-TR'])).toBe('en');     // close and reopen
  });

  test('a later iPhone language change still wins over the manual choice', async () => {
    await establishedUser('tr');
    await launch(['tr-TR']);
    await store().setLanguage('en');
    expect(await foreground(['tr-TR'])).toBe('en');
    // iPhone switched to English then back to Turkish
    expect(await foreground(['en-US'])).toBe('en');
    expect(await foreground(['tr-TR'])).toBe('tr');
  });
});

describe('backend language synchronization', () => {
  test('foreground change with a session is sent to the backend right away', async () => {
    await establishedUser('tr');
    await launch(['tr-TR']);
    useAuthStore.setState({ token: 'session-token' });
    await foreground(['en-US']);
    expect(mockPut).toHaveBeenCalledWith('/user/language', { language: 'en' });
  });

  test('change applied at startup (no session yet) is sent once the session is ready', async () => {
    await establishedUser('tr');
    await launch(['en-US']);
    expect(mockPut).not.toHaveBeenCalled();

    useAuthStore.setState({ token: 'session-token' });
    await store().flushBackendLanguageSync();
    expect(mockPut).toHaveBeenCalledTimes(1);
    expect(mockPut).toHaveBeenCalledWith('/user/language', { language: 'en' });

    await store().flushBackendLanguageSync(); // already sent: nothing more
    expect(mockPut).toHaveBeenCalledTimes(1);
  });

  test('pending sync is kept when the backend call fails', async () => {
    await establishedUser('tr');
    await launch(['en-US']);
    useAuthStore.setState({ token: 'session-token' });
    mockPut.mockRejectedValueOnce(new Error('offline'));
    await store().flushBackendLanguageSync();
    await store().flushBackendLanguageSync();
    expect(mockPut).toHaveBeenCalledTimes(2);
  });
});

describe('expo-localization (live iPhone language)', () => {
  test('takes precedence over the startup snapshot from React Native Settings', async () => {
    await establishedUser('tr');
    mockLocales.mockReturnValue([{ languageTag: 'en-GB' }]);
    expect(await launch(['tr-TR'])).toBe('en'); // Settings says Turkish, the live value says English
  });

  test('a change made while in the background is seen on return to the foreground', async () => {
    await establishedUser('tr');
    mockLocales.mockReturnValue([{ languageTag: 'tr-TR' }]);
    await launch(['tr-TR']);

    // Settings keeps its startup snapshot (tr-TR); only the live source changes
    mockLocales.mockReturnValue([{ languageTag: 'en-US' }]);
    expect(await foreground(['tr-TR'])).toBe('en');

    mockLocales.mockReturnValue([{ languageTag: 'fr-FR' }]);
    expect(await foreground(['tr-TR'])).toBe('en'); // unsupported: kept

    mockLocales.mockReturnValue([{ languageTag: 'tr-TR' }]);
    expect(await foreground(['tr-TR'])).toBe('tr');
  });

  test('native module failure falls back to React Native Settings', async () => {
    await establishedUser('en');
    mockLocales.mockImplementation(() => { throw new Error('native module unavailable'); });
    expect(await launch(['tr-TR'])).toBe('tr');
    mockLocales.mockReset();
  });
});
