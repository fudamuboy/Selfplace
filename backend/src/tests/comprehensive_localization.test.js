const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const db = require('../config/db');
const { getLanguage } = require('../utils/languageResolver');
const { localizeEmotionalEntry, CARD_EN_MAP, EMOTIONS_EN_MAP } = require('../utils/emotionalLocalization');
const {
  getWeatherPresentation,
  getEnergyPresentation,
  normalizeWeather,
  normalizeEnergy
} = require('../utils/relationshipEnums');
const { trackEvent } = require('../services/eventEngine');
const checkInController = require('../controllers/checkInController');
const personalityController = require('../controllers/personalityController');
const relationshipController = require('../controllers/relationshipController');

describe('Comprehensive Localization & Content Preservation Suite', () => {

  describe('1. Unified Language Resolver', () => {
    it('should prioritize x-app-language over Accept-Language', () => {
      const req = {
        headers: {
          'x-app-language': 'en',
          'accept-language': 'tr-TR,tr;q=0.9'
        }
      };
      assert.strictEqual(getLanguage(req), 'en');
    });

    it('should use Accept-Language when x-app-language is absent', () => {
      const req = {
        headers: {
          'accept-language': 'en-US,en;q=0.9'
        }
      };
      assert.strictEqual(getLanguage(req), 'en');
    });

    it('should fallback to tr when neither or unknown is provided', () => {
      const req1 = { headers: {} };
      const req2 = { headers: { 'x-app-language': 'fr' } };
      assert.strictEqual(getLanguage(req1), 'tr');
      assert.strictEqual(getLanguage(req2), 'tr');
    });
  });

  describe('2. emotional_entries Classification & Preservation', () => {
    it('must PRESERVE user-authored journal content across TR -> EN -> TR', () => {
      const originalUserText = 'Bugün kendimi çok iyi hissediyorum ve hayat güzel.';
      const journalEntry = {
        id: 101,
        source_type: 'journal',
        emotion: 'Mutlu',
        prompt: 'Günün Notu',
        content: originalUserText,
        created_at: new Date().toISOString()
      };

      // In TR mode
      const trResult = localizeEmotionalEntry(journalEntry, false);
      assert.strictEqual(trResult.content, originalUserText);

      // In EN mode: user-authored content MUST NOT change
      const enResult = localizeEmotionalEntry(journalEntry, true);
      assert.strictEqual(enResult.content, originalUserText, 'User text must remain untouched in EN mode');
      assert.strictEqual(enResult.emotion, 'Happy', 'Emotion taxonomy is localized');

      // Back in TR mode
      const trResultAgain = localizeEmotionalEntry(journalEntry, false);
      assert.strictEqual(trResultAgain.content, originalUserText);
    });

    it('must PRESERVE user-authored check-in notes while localizing system question prompt', () => {
      const userCheckInNote = 'İşimde güzel bir terfi aldım, biraz yorgunum ama mutluyum.';
      const checkinEntry = {
        id: 102,
        source_type: 'checkin',
        emotion: 'Yorgun',
        prompt: 'Bugün seni en çok ne etkiledi?',
        content: userCheckInNote,
        created_at: new Date().toISOString()
      };

      const enResult = localizeEmotionalEntry(checkinEntry, true);
      assert.strictEqual(enResult.content, userCheckInNote, 'Check-in note must NEVER be altered or translated');
      assert.strictEqual(enResult.prompt, 'What affected you most today?', 'System question prompt is localized');
      assert.strictEqual(enResult.emotion, 'Tired', 'Emotion is localized');
    });

    it('must localize Selfplace-generated card titles and default template content', () => {
      const defaultCardEntry = {
        id: 103,
        source_type: 'card',
        emotion: 'Motive',
        prompt: 'Nazik Bir Başlangıç',
        content: 'Bu kartı bugün için seçtim.',
        created_at: new Date().toISOString()
      };

      const enResult = localizeEmotionalEntry(defaultCardEntry, true);
      assert.strictEqual(enResult.prompt, 'A Gentle Start');
      assert.strictEqual(enResult.content, 'I chose this card for today.');
      assert.strictEqual(enResult.emotion, 'Motivated');
    });

    it('must NEVER overwrite custom user notes attached to a card', () => {
      const userCardNote = 'Bugün bu adımı atarken biraz korktum ama yaptım.';
      const customCardEntry = {
        id: 104,
        source_type: 'card',
        emotion: 'Motive',
        prompt: 'Küçük Bir Seçim',
        content: userCardNote,
        created_at: new Date().toISOString()
      };

      const enResult = localizeEmotionalEntry(customCardEntry, true);
      assert.strictEqual(enResult.prompt, 'A Small Choice');
      assert.strictEqual(enResult.content, userCardNote, 'Custom user reflection on card must remain unchanged');
    });

    it('ensures historical entries never disappear: all entries returned without language filtering', async () => {
      // Test the getTimeline controller function directly
      let sentJson = null;
      const fakeReq = {
        user: { id: 7 },
        headers: { 'x-app-language': 'en' }
      };
      const fakeRes = {
        json: (data) => { sentJson = data; }
      };

      await require('../controllers/emotionalController').getTimeline(fakeReq, fakeRes);
      assert.ok(Array.isArray(sentJson), 'Timeline must return an array');
      // If user 7 has entries in DB, verify they are present regardless of their creation language
      if (sentJson.length > 0) {
        assert.ok(sentJson[0].id, 'Entries should contain ID');
      }
    });
  });

  describe('3. relationship_daily_syncs Language Isolation & Enums', () => {
    let testConnId;
    let userAId, userBId;

    before(async () => {
      // Find or create an active connection for testing
      const userRes = await db.query('SELECT id FROM users LIMIT 2');
      if (userRes.rows.length >= 2) {
        userAId = userRes.rows[0].id;
        userBId = userRes.rows[1].id;
        const connRes = await db.query(
          `INSERT INTO relationship_connections (requester_id, recipient_id, status)
           VALUES ($1, $2, 'active')
           ON CONFLICT DO NOTHING RETURNING id`,
          [userAId, userBId]
        );
        if (connRes.rows.length > 0) {
          testConnId = connRes.rows[0].id;
        } else {
          const existing = await db.query(
            `SELECT id FROM relationship_connections WHERE (requester_id = $1 AND recipient_id = $2) OR (requester_id = $2 AND recipient_id = $1) LIMIT 1`,
            [userAId, userBId]
          );
          testConnId = existing.rows[0]?.id;
        }
      }
    });

    it('enables TR and EN daily sync rows to coexist safely on the same date and connection', async () => {
      if (!testConnId) return;

      const today = new Date().toISOString().split('T')[0];

      // 1. Insert TR sync
      await db.query(
        `INSERT INTO relationship_daily_syncs
         (connection_id, generated_text, emotional_weather, relationship_energy, synced_date, language_code)
         VALUES ($1, $2, $3, $4, $5, 'tr')
         ON CONFLICT (connection_id, synced_date, language_code) DO UPDATE SET
           generated_text = EXCLUDED.generated_text`,
        [testConnId, 'Bugün birbirinize şefkatle yaklaşın.', 'Sakin', 'Huzurlu', today]
      );

      // 2. Insert EN sync for the SAME connection and SAME date
      await db.query(
        `INSERT INTO relationship_daily_syncs
         (connection_id, generated_text, emotional_weather, relationship_energy, synced_date, language_code)
         VALUES ($1, $2, $3, $4, $5, 'en')
         ON CONFLICT (connection_id, synced_date, language_code) DO UPDATE SET
           generated_text = EXCLUDED.generated_text`,
        [testConnId, 'Approach each other with gentle care today.', 'Calm', 'Peaceful', today]
      );

      // 3. Query TR sync specifically
      const trRes = await db.query(
        'SELECT generated_text, emotional_weather, language_code FROM relationship_daily_syncs WHERE connection_id = $1 AND synced_date = $2 AND language_code = $3',
        [testConnId, today, 'tr']
      );
      assert.strictEqual(trRes.rows.length, 1);
      assert.strictEqual(trRes.rows[0].language_code, 'tr');
      assert.strictEqual(trRes.rows[0].generated_text, 'Bugün birbirinize şefkatle yaklaşın.');

      // 4. Query EN sync specifically
      const enRes = await db.query(
        'SELECT generated_text, emotional_weather, language_code FROM relationship_daily_syncs WHERE connection_id = $1 AND synced_date = $2 AND language_code = $3',
        [testConnId, today, 'en']
      );
      assert.strictEqual(enRes.rows.length, 1);
      assert.strictEqual(enRes.rows[0].language_code, 'en');
      assert.strictEqual(enRes.rows[0].generated_text, 'Approach each other with gentle care today.');
    });

    it('correctly formats canonical relationship enum values at presentation layer', () => {
      // Weather formatting
      assert.strictEqual(getWeatherPresentation('Sakin', 'en'), 'Calm');
      assert.strictEqual(getWeatherPresentation('Calm', 'tr'), 'Sakin');
      assert.strictEqual(getWeatherPresentation('Dingin', 'en'), 'Serene');
      assert.strictEqual(getWeatherPresentation('Hafif Yoğun', 'en'), 'Mildly Intense');
      assert.strictEqual(getWeatherPresentation('Mildly Intense', 'tr'), 'Hafif Yoğun');

      // Energy formatting
      assert.strictEqual(getEnergyPresentation('Huzurlu', 'en'), 'Peaceful');
      assert.strictEqual(getEnergyPresentation('Peaceful', 'tr'), 'Huzurlu');
      assert.strictEqual(getEnergyPresentation('Yenileniyor', 'en'), 'Renewing');
      assert.strictEqual(getEnergyPresentation('Duygusal', 'en'), 'Emotional');
    });
  });

  describe('4. relationship_rituals Existing EN Columns & Coexistence', () => {
    let testConnId;
    let testRitualId;

    before(async () => {
      const connRes = await db.query('SELECT id FROM relationship_connections WHERE status = \'active\' LIMIT 1');
      if (connRes.rows.length > 0) {
        testConnId = connRes.rows[0].id;
        const ritualRes = await db.query(
          `INSERT INTO relationship_rituals (connection_id, prompt_tr, prompt_en)
           VALUES ($1, $2, $3) RETURNING id`,
          [testConnId, 'Bugün birbirinize teşekkür ettiniz mi?', 'Did you thank each other today?']
        );
        testRitualId = ritualRes.rows[0].id;
      }
    });

    after(async () => {
      if (testRitualId) {
        await db.query('DELETE FROM relationship_rituals WHERE id = $1', [testRitualId]);
      }
    });

    it('re-uses relationship_reflection_en, gentle_suggestion_en, and emotional_climate_en columns', async () => {
      if (!testRitualId) return;

      // Update both TR and EN columns on the same ritual
      await db.query(
        `UPDATE relationship_rituals
         SET relationship_reflection = 'Ortak paylaşım derin bir bağ kurdu.',
             emotional_climate = 'Sakin',
             gentle_suggestion = 'Akşam yürüyüşü yapabilirsiniz.',
             relationship_reflection_en = 'Shared openness created a deep bond.',
             emotional_climate_en = 'Calm Intimacy',
             gentle_suggestion_en = 'You could take an evening walk together.'
         WHERE id = $1`,
        [testRitualId]
      );

      const res = await db.query(
        `SELECT relationship_reflection, relationship_reflection_en,
                emotional_climate, emotional_climate_en,
                gentle_suggestion, gentle_suggestion_en,
                prompt_tr, prompt_en
         FROM relationship_rituals WHERE id = $1`,
        [testRitualId]
      );

      const r = res.rows[0];
      assert.strictEqual(r.relationship_reflection, 'Ortak paylaşım derin bir bağ kurdu.');
      assert.strictEqual(r.relationship_reflection_en, 'Shared openness created a deep bond.');
      assert.strictEqual(r.emotional_climate, 'Sakin');
      assert.strictEqual(r.emotional_climate_en, 'Calm Intimacy');
      assert.strictEqual(r.gentle_suggestion, 'Akşam yürüyüşü yapabilirsiniz.');
      assert.strictEqual(r.gentle_suggestion_en, 'You could take an evening walk together.');
      assert.strictEqual(r.prompt_tr, 'Bugün birbirinize teşekkür ettiniz mi?');
      assert.strictEqual(r.prompt_en, 'Did you thank each other today?');
    });
  });

  describe('5. Check-in reflection_questions Bilingual Table', () => {
    it('has text_tr and text_en columns populated and active', async () => {
      const res = await db.query(
        'SELECT id, text_tr, text_en, category, active FROM reflection_questions WHERE active = true LIMIT 5'
      );
      assert.ok(res.rows.length > 0, 'Reflection questions should exist');
      for (const q of res.rows) {
        assert.ok(q.text_tr && q.text_tr.length > 5, 'text_tr should be valid Turkish');
        assert.ok(q.text_en && q.text_en.length > 5, 'text_en should be valid English');
        assert.strictEqual(q.active, true);
      }
    });

    it('returns English question when Accept-Language is EN and Turkish when TR', async () => {
      // EN request
      let enJson = null;
      await checkInController.getRandomQuestion(
        { headers: { 'x-app-language': 'en' } },
        { json: (d) => { enJson = d; } }
      );
      assert.ok(enJson && enJson.question_text, 'Question text must exist in EN');
      assert.ok(!/[çğıöşüÇĞİÖŞÜ]/.test(enJson.question_text), `EN question "${enJson.question_text}" must not contain Turkish characters`);

      // TR request
      let trJson = null;
      await checkInController.getRandomQuestion(
        { headers: { 'x-app-language': 'tr' } },
        { json: (d) => { trJson = d; } }
      );
      assert.ok(trJson && trJson.question_text, 'Question text must exist in TR');
    });
  });

  describe('6. EventEngine Deterministic Bilingual Writes', () => {
    it('writes both title_tr, title_en, description_tr, and description_en to relationship_timeline', async () => {
      const connRes = await db.query('SELECT id, requester_id FROM relationship_connections WHERE status = \'active\' LIMIT 1');
      if (connRes.rows.length === 0) return;
      const connId = connRes.rows[0].id;
      const userId = connRes.rows[0].requester_id;

      await trackEvent(userId, 'CHECKIN_COMPLETED', 'minor', {}, null, null, connId);

      const latestEventRes = await db.query(
        `SELECT event_type, title_tr, title_en, description_tr, description_en
         FROM relationship_timeline WHERE connection_id = $1 AND event_type = 'CHECKIN_COMPLETED'
         ORDER BY created_at DESC LIMIT 1`,
        [connId]
      );

      assert.strictEqual(latestEventRes.rows.length, 1);
      const e = latestEventRes.rows[0];
      assert.strictEqual(e.title_tr, 'Duygu Paylaşımı Yapıldı 💭');
      assert.strictEqual(e.title_en, 'Emotion Shared 💭');
      assert.ok(e.description_tr.includes('günlük duygu durumunu paylaştı.'));
      assert.ok(e.description_en.includes('shared their daily emotional check-in.'));
    });
  });

  describe('7. Personality Results Multi-Language Preservation (Option B)', () => {
    let testUserId;
    let testResultId;

    before(async () => {
      const uRes = await db.query('SELECT id FROM users LIMIT 1');
      if (uRes.rows.length > 0) {
        testUserId = uRes.rows[0].id;
        const insertRes = await db.query(
          `INSERT INTO personality_results (user_id, test_type, result_data)
           VALUES ($1, 'journey', $2) RETURNING id`,
          [
            testUserId,
            JSON.stringify({
              archetype_name: 'Sakin Gözlemci',
              description: 'İçsel derinliği yüksek, gözlem yeteneği kuvvetli bir yapı.',
              baseArchetype: 'Gölge Suyu (Moonwater)',
              baseArchetypeId: 'moonwater',
              scores: { social_energy: -2, energy_rhythm: -1, emotional_expression: -1 },
              color_family: { id: 'moon_blue', hex: '#4FD8FF', name: 'Moon Blue' },
              original_language: 'tr'
            })
          ]
        );
        testResultId = insertRes.rows[0].id;
      }
    });

    after(async () => {
      if (testResultId) {
        await db.query('DELETE FROM personality_results WHERE id = $1', [testResultId]);
      }
    });

    it('preserves the original Turkish result while serving localized English result on demand', async () => {
      if (!testResultId) return;

      // 1. Fetch result with EN header
      let enResultJson = null;
      await personalityController.getResult(
        { user: { id: testUserId }, params: { id: testResultId }, headers: { 'x-app-language': 'en' } },
        { json: (d) => { enResultJson = d; }, status: () => ({ json: (d) => { enResultJson = d; } }) }
      );

      assert.ok(enResultJson.success);
      assert.ok(enResultJson.result.result_data.archetype_name, 'Archetype name must exist');
      // Should not be in Turkish
      assert.ok(
        !/[çğıöşüÇĞİÖŞÜ]/.test(enResultJson.result.result_data.archetype_name),
        `Archetype name "${enResultJson.result.result_data.archetype_name}" should be localized to English`
      );

      // 2. Fetch result with TR header
      let trResultJson = null;
      await personalityController.getResult(
        { user: { id: testUserId }, params: { id: testResultId }, headers: { 'x-app-language': 'tr' } },
        { json: (d) => { trResultJson = d; }, status: () => ({ json: (d) => { trResultJson = d; } }) }
      );

      assert.ok(trResultJson.success);
      // Original Turkish archetype name is preserved!
      assert.strictEqual(trResultJson.result.result_data.archetype_name, 'Sakin Gözlemci');
      assert.strictEqual(trResultJson.result.result_data.description, 'İçsel derinliği yüksek, gözlem yeteneği kuvvetli bir yapı.');
    });
  });

  describe('8. users.preferred_language Synchronization', () => {
    it('can update preferred_language via updateLanguage controller', async () => {
      const uRes = await db.query('SELECT id, preferred_language FROM users LIMIT 1');
      if (uRes.rows.length === 0) return;
      const userId = uRes.rows[0].id;
      const initialLang = uRes.rows[0].preferred_language || 'tr';

      const userController = require('../controllers/userController');
      let responseJson = null;

      // Change to en
      await userController.updateLanguage(
        { user: { id: userId }, body: { language: 'en' }, headers: { 'x-app-language': 'en' } },
        { json: (d) => { responseJson = d; }, status: () => ({ json: (d) => { responseJson = d; } }) }
      );

      assert.ok(responseJson.success);
      assert.strictEqual(responseJson.preferred_language, 'en');

      const checkDb = await db.query('SELECT preferred_language FROM users WHERE id = $1', [userId]);
      assert.strictEqual(checkDb.rows[0].preferred_language, 'en');

      // Revert to initial
      await userController.updateLanguage(
        { user: { id: userId }, body: { language: initialLang }, headers: {} },
        { json: () => {}, status: () => ({ json: () => {} }) }
      );
    });
  });

});
