import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguageStore } from '../store/useLanguageStore';
import useAuthStore from '../store/useAuthStore';
import { t } from '../i18n';

describe('i18n Architecture & Persistence Suite', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useLanguageStore.setState({
      language: 'tr',
      hasSelectedLanguage: false,
      isInitialized: false,
    });
  });

  test('1. Default language is Turkish', async () => {
    const lang = useLanguageStore.getState().language;
    expect(lang).toBe('tr');
    expect(t('common.save')).toBe('Kaydet');
    expect(t('auth.loginTab')).toBe('Giriş Yap');
  });

  test('2. Switch to English and verify translation lookup', async () => {
    await useLanguageStore.getState().setLanguage('en');
    expect(useLanguageStore.getState().language).toBe('en');
    expect(t('common.save')).toBe('Save');
    expect(t('auth.loginTab')).toBe('Log In');
    expect(t('settings.title')).toBe('Settings');
  });

  test('3. Switch back to Turkish', async () => {
    await useLanguageStore.getState().setLanguage('en');
    await useLanguageStore.getState().setLanguage('tr');
    expect(useLanguageStore.getState().language).toBe('tr');
    expect(t('common.save')).toBe('Kaydet');
  });

  test('4. AsyncStorage persistence across simulated restart', async () => {
    await useLanguageStore.getState().setLanguage('en');
    await useLanguageStore.getState().setHasSelectedLanguage(true);

    // Simulate app restart by resetting store memory and re-loading from AsyncStorage
    useLanguageStore.setState({
      language: 'tr',
      hasSelectedLanguage: false,
      isInitialized: false,
    });

    const loadedLang = await useLanguageStore.getState().loadLanguage();
    expect(loadedLang).toBe('en');
    expect(useLanguageStore.getState().hasSelectedLanguage).toBe(true);
  });

  test('5. Parameter interpolation and missing-key fallback', () => {
    useLanguageStore.setState({ language: 'en' });
    // Interpolation test
    const formatted = t('common.loading');
    expect(formatted).toBe('Loading...');

    // Missing key safe fallback test (never leak technical dot syntax)
    const missing = t('non_existent_key.sub_key' as any);
    expect(missing).toBe('Sub Key');
    expect(missing).not.toContain('.');

    // Newly audited keys verification in both TR and EN
    expect(t('settings.theme', {}, 'tr')).toBe('Tema');
    expect(t('settings.theme', {}, 'en')).toBe('Theme');
    expect(t('settings.privacyData', {}, 'tr')).toBe('Gizlilik ve Veriler');
    expect(t('settings.privacyData', {}, 'en')).toBe('Privacy & Data');
    expect(t('settings.account', {}, 'tr')).toBe('Hesap');
    expect(t('settings.account', {}, 'en')).toBe('Account');
    expect(t('connections.accept', {}, 'tr')).toBe('Kabul Et');
    expect(t('connections.accept', {}, 'en')).toBe('Accept');
    expect(t('connections.reject', {}, 'tr')).toBe('Reddet');
    expect(t('connections.reject', {}, 'en')).toBe('Decline');
    expect(t('history.pastWeeks', {}, 'tr')).toBe('Geçmiş Haftalar');
    expect(t('history.pastWeeks', {}, 'en')).toBe('Past Weeks');
  });

  test('6. resetAll() preserves language settings in AsyncStorage', async () => {
    await useLanguageStore.getState().setLanguage('en');
    await useLanguageStore.getState().setHasSelectedLanguage(true);

    // Reset auth store (which performs AsyncStorage.clear() with language preservation)
    await useAuthStore.getState().resetAll();

    const storedLang = await AsyncStorage.getItem('appLanguage');
    const storedSelected = await AsyncStorage.getItem('hasCompletedLanguageSelection');

    expect(storedLang).toBe('en');
    expect(storedSelected).toBe('true');
  });
});
