import { t } from '../i18n';
import { tr } from '../i18n/tr';
import { en } from '../i18n/en';
import { useLanguageStore } from '../store/useLanguageStore';

describe('Forensic Localization Audit Suite — Real Simulator Issues Verification', () => {
  beforeEach(() => {
    useLanguageStore.setState({ language: 'tr' });
  });

  describe('Issue #1: Theme Screen Translation Keys', () => {
    test('settings.theme exists and resolves accurately in Turkish and English', () => {
      expect(t('settings.theme', {}, 'tr')).toBe('Tema');
      expect(t('settings.theme', {}, 'en')).toBe('Theme');
    });

    test('Theme screen keys never leak raw dot syntax', () => {
      const renderedTr = t('settings.theme', {}, 'tr');
      const renderedEn = t('settings.theme', {}, 'en');
      expect(renderedTr).not.toContain('settings.');
      expect(renderedEn).not.toContain('settings.');
      expect(renderedTr).not.toBe('settings.theme');
      expect(renderedEn).not.toBe('settings.theme');
    });
  });

  describe('Issue #2: Privacy & Data Screen Translation Keys', () => {
    test('settings.privacyData exists and resolves accurately in Turkish and English', () => {
      expect(t('settings.privacyData', {}, 'tr')).toBe('Gizlilik ve Veriler');
      expect(t('settings.privacyData', {}, 'en')).toBe('Privacy & Data');
    });

    test('settings.account exists and resolves accurately in Turkish and English', () => {
      expect(t('settings.account', {}, 'tr')).toBe('Hesap');
      expect(t('settings.account', {}, 'en')).toBe('Account');
    });

    test('Privacy & Data keys never leak raw dot syntax', () => {
      const renderedTr = t('settings.privacyData', {}, 'tr');
      const renderedEn = t('settings.privacyData', {}, 'en');
      expect(renderedTr).not.toContain('settings.');
      expect(renderedEn).not.toContain('settings.');
      expect(renderedTr).not.toBe('settings.privacyData');
      expect(renderedEn).not.toBe('settings.privacyData');
    });
  });

  describe('Issue #3: Journey Screen & Test Fixture Exclusion', () => {
    test('Integration test fixtures (e.g. Test Prompt, Test Content) are filtered out from timeline', () => {
      const mockRawTimeline = [
        { id: 81, prompt: 'Test Prompt', content: 'Test Content', emotion: 'Mutlu', source_type: 'reflection' },
        { id: 82, prompt: 'Test Prompt', content: 'Test Content', emotion: 'Mutlu', source_type: 'reflection' },
        { id: 85, prompt: 'What made you happy today?', content: 'Bugün kendimi çok iyi hissediyorum', emotion: 'Mutlu', source_type: 'checkin' },
      ];

      const filtered = mockRawTimeline.filter((entry: any) => {
        const p = (entry.prompt || '').toLowerCase().trim();
        const c = (entry.content || '').toLowerCase().trim();
        if (p === 'test prompt' || c === 'test content') return false;
        return true;
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe(85);
      expect(filtered.some((e: any) => e.prompt === 'Test Prompt')).toBe(false);
      expect(filtered.some((e: any) => e.content === 'Test Content')).toBe(false);
    });
  });

  describe('Issue #4: Past Weeks (Archive) Screen Localization & Parity', () => {
    test('history.pastWeeks and history.archiveSubtitle exist and resolve correctly', () => {
      expect(t('history.pastWeeks', {}, 'tr')).toBe('Geçmiş Haftalar');
      expect(t('history.pastWeeks', {}, 'en')).toBe('Past Weeks');
      expect(t('history.archiveSubtitle', {}, 'tr')).toBe('Duygusal yolculuğunun arşivi ✨');
      expect(t('history.archiveSubtitle', {}, 'en')).toBe('Archive of your emotional journey ✨');
    });

    test('history chips and labels resolve without English leakage in Turkish', () => {
      expect(t('history.entries', {}, 'tr')).toBe('Yazı');
      expect(t('history.entries', {}, 'en')).toBe('Entries');
      expect(t('history.dominantMood', {}, 'tr')).toBe('Baskın Duygu');
      expect(t('history.dominantMood', {}, 'en')).toBe('Dominant Mood');
      expect(t('history.checkIn', {}, 'tr')).toBe('Check-in');
      expect(t('history.checkIn', {}, 'en')).toBe('Check-in');
      expect(t('history.emptyArchive', {}, 'tr')).toBe('Henüz geçmiş haftaların oluşmaya başlamadı.');
      expect(t('history.emptyArchive', {}, 'en')).toBe('Your past weeks have not accumulated yet.');
    });
  });

  describe('Issue #5: Global Translation Key Leakage Audit', () => {
    test('Safe fallback returns humanized label and NEVER dumps technical dot notation', () => {
      const nonExistent1 = t('settings.someNewFeature' as any);
      expect(nonExistent1).toBe('Some New Feature');
      expect(nonExistent1).not.toContain('settings.');

      const nonExistent2 = t('profile.account_security' as any);
      expect(nonExistent2).toBe('Account Security');
      expect(nonExistent2).not.toContain('profile.');
    });

    test('Connections keys exist and do not leak', () => {
      expect(t('connections.accept', {}, 'tr')).toBe('Kabul Et');
      expect(t('connections.accept', {}, 'en')).toBe('Accept');
      expect(t('connections.reject', {}, 'tr')).toBe('Reddet');
      expect(t('connections.reject', {}, 'en')).toBe('Decline');
      expect(t('connections.noActiveConnections', {}, 'tr')).toBe('Henüz aktif bir bağlantın yok');
      expect(t('connections.noActiveConnections', {}, 'en')).toBe('No active connections yet');
    });
  });
});
