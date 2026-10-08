const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const db = require('../config/db');
const { getLivingContext, updateFollowUpsAndPromises } = require('../services/livingContextEngine');
const { trackEvent } = require('../services/eventEngine');

describe('Living Context & Event Engine Unit Tests', () => {
  let testUserId;
  let partnerUserId;
  let connectionId;

  before(async () => {
    // Clean up any leftovers from previous runs
    await db.query("DELETE FROM users WHERE username IN ('test_user_lce_1', 'test_user_lce_2')");

    // 1. Setup mock users
    const userRes = await db.query(
      `INSERT INTO users (username, email, password, birth_date) 
       VALUES ('test_user_lce_1', 'lce1@example.com', 'hash', '1995-01-01') RETURNING id`
    );
    testUserId = userRes.rows[0].id;

    const partnerRes = await db.query(
      `INSERT INTO users (username, email, password, birth_date) 
       VALUES ('test_user_lce_2', 'lce2@example.com', 'hash', '1995-01-01') RETURNING id`
    );
    partnerUserId = partnerRes.rows[0].id;

    // 2. Setup subscription
    await db.query(
      `INSERT INTO subscription_status (user_id, plan_type, is_active) 
       VALUES ($1, 'signature', true)`,
      [testUserId]
    );

    // 3. Create active connection
    const connRes = await db.query(
      `INSERT INTO relationship_connections (requester_id, recipient_id, connection_type, status) 
       VALUES ($1, $2, 'romantic', 'active') RETURNING id`,
      [testUserId, partnerUserId]
    );
    connectionId = connRes.rows[0].id;

    // 4. Create timeline event
    await db.query(
      `INSERT INTO relationship_timeline (connection_id, event_type, title_tr, description_tr) 
       VALUES ($1, 'created', 'İlk Bağlantı', 'Selfplace yolculuğu başladı.')`,
      [connectionId]
    );
  });

  after(async () => {
    // Cleanup
    await db.query('DELETE FROM relationship_connections WHERE id = $1', [connectionId]);
    await db.query('DELETE FROM users WHERE id IN ($1, $2)', [testUserId, partnerUserId]);
  });

  test('Should successfully build Living Context string', async () => {
    const context = await getLivingContext(testUserId);
    assert.strictEqual(typeof context, 'string');
    assert.match(context, /SELFPLACE LIVE CONTEXT/);
    assert.match(context, /test_user_lce_1/);
    assert.match(context, /test_user_lce_2/);
    assert.match(context, /İlk Bağlantı/);
  });

  test('Should track new in-app events using trackEvent', async () => {
    await trackEvent(testUserId, 'CHECKIN_COMPLETED', 'minor', { mood: 'Mutlu' });
    
    // Verify timeline has event
    const eventsRes = await db.query(
      'SELECT event_type, title_tr FROM relationship_timeline WHERE connection_id = $1 ORDER BY created_at DESC LIMIT 1',
      [connectionId]
    );
    assert.strictEqual(eventsRes.rows.length, 1);
    assert.strictEqual(eventsRes.rows[0].event_type, 'CHECKIN_COMPLETED');
    assert.match(eventsRes.rows[0].title_tr, /Duygu Paylaşımı/);
  });

  test('Should dynamically process follow-ups and promises', async () => {
    // Call updateFollowUpsAndPromises with a mock follow-up trigger response
    await updateFollowUpsAndPromises(
      testUserId,
      'Tamam, yarın bana sor.',
      'Söz veriyorum, yarın dünkü toplantının nasıl geçtiğini sana soracağım.'
    );

    // Verify follow-ups table/memory has the new promise
    const followUpsRes = await db.query(
      `SELECT memory_value FROM emotional_memories WHERE user_id = $1 AND memory_key = 'pending_follow_ups'`,
      [testUserId]
    );
    assert.strictEqual(followUpsRes.rows.length, 1);
    
    const list = JSON.parse(followUpsRes.rows[0].memory_value);
    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].status, 'pending');
    assert.match(list[0].promise, /sor/i);

    // Now resolve the promise
    await updateFollowUpsAndPromises(
      testUserId,
      'Toplantı harika geçti!',
      'Çok sevindim!'
    );

    const resolvedRes = await db.query(
      `SELECT memory_value FROM emotional_memories WHERE user_id = $1 AND memory_key = 'pending_follow_ups'`,
      [testUserId]
    );
    const resolvedList = JSON.parse(resolvedRes.rows[0].memory_value);
    const resolvedItem = resolvedList.find(i => i.id === list[0].id);
    assert.strictEqual(resolvedItem.status, 'completed');
  });



  test('Should redact partner data according to partner privacy settings', async () => {
    // 1. Setup partner privacy to exclude checkins and personality
    await db.query(
      `INSERT INTO relationship_privacy_settings (connection_id, user_id, exclude_checkins, exclude_personality, exclude_cards, exclude_journals, exclude_ai_chat) 
       VALUES ($1, $2, true, true, false, false, false)
       ON CONFLICT (connection_id, user_id) 
       DO UPDATE SET exclude_checkins = true, exclude_personality = true`,
      [connectionId, partnerUserId]
    );

    // 2. Setup partner mood history
    await db.query(
      `INSERT INTO check_ins (user_id, mood, note) 
       VALUES ($1, 'Kaygılı', 'Gizli kalması gereken partner notu')`,
      [partnerUserId]
    );

    // 3. Build Living Context
    const context = await getLivingContext(testUserId);

    // 4. Assertions
    // Partner name/connection exists (Known facts) are visible
    assert.match(context, /Partner Adı: test_user_lce_2/);
    // Partner's checkin history must be hidden/empty
    assert.match(context, /Partner: Duygu bilgisi yok/);
    // Partner's archetype/personality must be hidden
    assert.match(context, /Partner DISC Arketipi: Gizli/);
    assert.match(context, /Partner Aşk Dili: Gizli/);
    assert.match(context, /Partner Bağlanma Stili: Gizli/);

    // Cleanup privacy settings for connection
    await db.query('DELETE FROM relationship_privacy_settings WHERE connection_id = $1', [connectionId]);
    await db.query('DELETE FROM check_ins WHERE user_id = $1', [partnerUserId]);
  });
});
