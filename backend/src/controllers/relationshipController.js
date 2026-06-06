const db = require('../config/db');
const OpenAI = require('openai');
const { getInsightFeed } = require('../services/emotionalContextBuilder');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function getUserPlan(userId) {
  const result = await db.query('SELECT plan_type FROM subscription_status WHERE user_id = $1', [userId]);
  if (result.rows.length === 0) return 'free';
  return result.rows[0].plan_type || 'free';
}

/**
 * Send invitation to connect
 * POST /api/relationships/invite
 */
exports.sendInvite = async (req, res) => {
  const { email, connectionType, alias } = req.body;
  const requesterId = req.user.id;

  if (!email || !connectionType) {
    return res.status(400).json({ message: 'E-posta adresi ve ilişki türü gereklidir.' });
  }

  try {
    // Check connection limit for free plan
    const plan = await getUserPlan(requesterId);
    if (plan === 'free') {
      const activeCountRes = await db.query(
        `SELECT COUNT(*) FROM relationship_connections 
         WHERE (requester_id = $1 OR recipient_id = $1) AND status = 'active'`,
        [requesterId]
      );
      if (parseInt(activeCountRes.rows[0].count) >= 1) {
        return res.status(403).json({
          message: 'Ücretsiz planda yalnızca 1 aktif bağlantı kurabilirsiniz. Sınırsız bağlantı için planınızı Selfplace Plus\'a yükseltin.',
          isLimitReached: true
        });
      }
    }

    // 1. Find the recipient user
    const recipientRes = await db.query('SELECT id, username FROM users WHERE email = $1', [email.trim().toLowerCase()]);
    if (recipientRes.rows.length === 0) {
      return res.status(404).json({ message: 'Bu e-posta adresine sahip bir kullanıcı bulunamadı.' });
    }

    const recipientId = recipientRes.rows[0].id;

    // 2. Prevent self-invite
    if (recipientId === requesterId) {
      return res.status(400).json({ message: 'Kendinize bağlantı isteği gönderemezsiniz.' });
    }

    // 3. Check existing connection (any direction)
    const checkRes = await db.query(
      `SELECT * FROM relationship_connections 
       WHERE (requester_id = $1 AND recipient_id = $2) 
          OR (requester_id = $2 AND recipient_id = $1)`,
      [requesterId, recipientId]
    );

    if (checkRes.rows.length > 0) {
      const conn = checkRes.rows[0];
      if (conn.status === 'active') {
        return res.status(400).json({ message: 'Bu kullanıcıyla zaten aktif bir bağlantınız var.' });
      }
      if (conn.status === 'pending') {
        if (conn.requester_id === requesterId) {
          return res.status(400).json({ message: 'Bu kullanıcıya zaten beklemede olan bir isteğiniz var.' });
        } else {
          return res.status(400).json({ message: 'Bu kullanıcıdan zaten beklemede olan bir istek aldınız. Lütfen kabul edin.' });
        }
      }
      // If rejected or disconnected, we can update it or delete and re-create. Let's delete the old record.
      await db.query('DELETE FROM relationship_connections WHERE id = $1', [conn.id]);
    }

    // 4. Create new connection
    const insertRes = await db.query(
      `INSERT INTO relationship_connections 
       (requester_id, recipient_id, status, connection_type, requester_alias) 
       VALUES ($1, $2, 'pending', $3, $4) 
       RETURNING id`,
      [requesterId, recipientId, connectionType, alias || null]
    );
    const connectionId = insertRes.rows[0].id;

    // 5. Create default privacy settings for both users
    await db.query(
      `INSERT INTO relationship_privacy_settings (user_id, connection_id) VALUES ($1, $2), ($3, $2)`,
      [requesterId, connectionId, recipientId]
    );

    res.status(201).json({
      message: 'Bağlantı isteği başarıyla gönderildi.',
      connectionId
    });

  } catch (err) {
    console.error('[relationshipController] sendInvite error:', err);
    res.status(500).json({ message: 'İstek gönderilemedi. Lütfen tekrar deneyin.' });
  }
};

/**
 * Get all connections (active and pending)
 * GET /api/relationships
 */
exports.getConnections = async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await db.query(
      `SELECT c.id, c.requester_id, c.recipient_id, c.status, c.connection_type,
              c.requester_alias, c.recipient_alias, c.created_at,
              u1.username as requester_username, u1.email as requester_email,
              u2.username as recipient_username, u2.email as recipient_email
       FROM relationship_connections c
       JOIN users u1 ON c.requester_id = u1.id
       JOIN users u2 ON c.recipient_id = u2.id
       WHERE c.requester_id = $1 OR c.recipient_id = $1
       ORDER BY c.updated_at DESC`,
      [userId]
    );

    const formatted = result.rows.map(row => {
      const isRequester = row.requester_id === userId;
      const partnerId = isRequester ? row.recipient_id : row.requester_id;
      const partnerUsername = isRequester ? row.recipient_username : row.requester_username;
      const partnerEmail = isRequester ? row.recipient_email : row.requester_email;
      const myAlias = isRequester ? row.requester_alias : row.recipient_alias;
      const partnerAlias = isRequester ? row.recipient_alias : row.requester_alias;

      return {
        id: row.id,
        status: row.status,
        connectionType: row.connection_type,
        myAlias,
        partnerAlias,
        partner: {
          id: partnerId,
          username: partnerUsername,
          email: partnerEmail
        },
        isIncoming: !isRequester && row.status === 'pending',
        createdAt: row.created_at
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error('[relationshipController] getConnections error:', err);
    res.status(500).json({ message: 'Bağlantılar yüklenemedi.' });
  }
};

/**
 * Accept or reject connection request
 * PUT /api/relationships/:id/respond
 */
exports.respondInvite = async (req, res) => {
  const connectionId = req.params.id;
  const { action, alias } = req.body; // 'accept' or 'reject'
  const userId = req.user.id;

  if (!['accept', 'reject'].includes(action)) {
    return res.status(400).json({ message: 'Geçersiz işlem.' });
  }

  try {
    // Check if the connection exists and the current user is the recipient
    const checkRes = await db.query(
      'SELECT * FROM relationship_connections WHERE id = $1 AND recipient_id = $2 AND status = \'pending\'',
      [connectionId, userId]
    );

    if (checkRes.rows.length === 0) {
      return res.status(404).json({ message: 'Bağlantı isteği bulunamadı veya yetkiniz yok.' });
    }

    if (action === 'accept') {
      const plan = await getUserPlan(userId);
      if (plan === 'free') {
        const activeCountRes = await db.query(
          `SELECT COUNT(*) FROM relationship_connections 
           WHERE (requester_id = $1 OR recipient_id = $1) AND status = 'active'`,
          [userId]
        );
        if (parseInt(activeCountRes.rows[0].count) >= 1) {
          return res.status(403).json({
            message: 'Ücretsiz planda yalnızca 1 aktif bağlantı kurabilirsiniz. Sınırsız bağlantı için planınızı yükseltin.',
            isLimitReached: true
          });
        }
      }

      await db.query(
        `UPDATE relationship_connections 
         SET status = 'active', recipient_alias = $1, updated_at = NOW() 
         WHERE id = $2`,
        [alias || null, connectionId]
      );

      // Create timeline event
      await db.query(
        `INSERT INTO relationship_timeline (connection_id, event_type, title_tr, description_tr)
         VALUES ($1, 'created', 'İlk Bağlantı Kuruldu 🌿', 'Selfplace üzerinde duygusal uyum yolculuğunuz başladı.')`,
        [connectionId]
      );

      return res.json({ message: 'Bağlantı başarıyla kabul edildi.' });
    } else {
      await db.query(
        `UPDATE relationship_connections 
         SET status = 'rejected', updated_at = NOW() 
         WHERE id = $1`,
        [connectionId]
      );
      return res.json({ message: 'Bağlantı isteği reddedildi.' });
    }

  } catch (err) {
    console.error('[relationshipController] respondInvite error:', err);
    res.status(500).json({ message: 'İşlem tamamlanamadı.' });
  }
};

/**
 * Update connection settings (alias or type)
 * PUT /api/relationships/:id/settings
 */
exports.updateSettings = async (req, res) => {
  const connectionId = req.params.id;
  const { alias, connectionType } = req.body;
  const userId = req.user.id;

  try {
    const checkRes = await db.query(
      'SELECT * FROM relationship_connections WHERE id = $1 AND (requester_id = $2 OR recipient_id = $2)',
      [connectionId, userId]
    );

    if (checkRes.rows.length === 0) {
      return res.status(404).json({ message: 'Bağlantı bulunamadı.' });
    }

    const conn = checkRes.rows[0];
    const isRequester = conn.requester_id === userId;

    let updateFields = [];
    let params = [];
    let paramIndex = 1;

    if (alias !== undefined) {
      if (isRequester) {
        updateFields.push(`requester_alias = $${paramIndex}`);
      } else {
        updateFields.push(`recipient_alias = $${paramIndex}`);
      }
      params.push(alias);
      paramIndex++;
    }

    if (connectionType !== undefined) {
      updateFields.push(`connection_type = $${paramIndex}`);
      params.push(connectionType);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'Güncellenecek alan belirtilmedi.' });
    }

    params.push(connectionId);
    await db.query(
      `UPDATE relationship_connections 
       SET ${updateFields.join(', ')}, updated_at = NOW() 
       WHERE id = $${paramIndex}`,
      params
    );

    res.json({ message: 'Bağlantı ayarları güncellendi.' });

  } catch (err) {
    console.error('[relationshipController] updateSettings error:', err);
    res.status(500).json({ message: 'Ayarlar güncellenemedi.' });
  }
};

/**
 * Disconnect (delete connection)
 * DELETE /api/relationships/:id
 */
exports.disconnect = async (req, res) => {
  const connectionId = req.params.id;
  const userId = req.user.id;

  try {
    // Check if the connection belongs to the user
    const checkRes = await db.query(
      'SELECT * FROM relationship_connections WHERE id = $1 AND (requester_id = $2 OR recipient_id = $2)',
      [connectionId, userId]
    );

    if (checkRes.rows.length === 0) {
      return res.status(404).json({ message: 'Bağlantı bulunamadı veya silme yetkiniz yok.' });
    }

    // Hard delete to automatically cascade delete insights, privacy settings, relationship_context
    await db.query('DELETE FROM relationship_connections WHERE id = $1', [connectionId]);

    res.json({ message: 'Bağlantı başarıyla kesildi.' });
  } catch (err) {
    console.error('[relationshipController] disconnect error:', err);
    res.status(500).json({ message: 'Bağlantı kesilemedi.' });
  }
};

/**
 * Get privacy settings for a connection
 * GET /api/relationships/:id/privacy
 */
exports.getPrivacySettings = async (req, res) => {
  const connectionId = req.params.id;
  const userId = req.user.id;

  try {
    const result = await db.query(
      'SELECT * FROM relationship_privacy_settings WHERE connection_id = $1 AND user_id = $2',
      [connectionId, userId]
    );

    if (result.rows.length === 0) {
      // Create default settings on-the-fly if not present
      const insert = await db.query(
        `INSERT INTO relationship_privacy_settings (user_id, connection_id) 
         VALUES ($1, $2) 
         ON CONFLICT (user_id, connection_id) DO UPDATE SET user_id = EXCLUDED.user_id 
         RETURNING *`,
        [userId, connectionId]
      );
      return res.json(insert.rows[0]);
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('[relationshipController] getPrivacySettings error:', err);
    res.status(500).json({ message: 'Gizlilik ayarları getirilemedi.' });
  }
};

/**
 * Update privacy settings
 * PUT /api/relationships/:id/privacy
 */
exports.updatePrivacySettings = async (req, res) => {
  const connectionId = req.params.id;
  const userId = req.user.id;
  const { excludeCheckins, excludeJournals, excludeCards, excludeAiChat, excludePersonality } = req.body;

  try {
    const checkRes = await db.query(
      'SELECT * FROM relationship_connections WHERE id = $1 AND (requester_id = $2 OR recipient_id = $2)',
      [connectionId, userId]
    );

    if (checkRes.rows.length === 0) {
      return res.status(404).json({ message: 'Bağlantı bulunamadı.' });
    }

    const result = await db.query(
      `INSERT INTO relationship_privacy_settings 
       (user_id, connection_id, exclude_checkins, exclude_journals, exclude_cards, exclude_ai_chat, exclude_personality)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id, connection_id) 
       DO UPDATE SET 
         exclude_checkins = EXCLUDED.exclude_checkins,
         exclude_journals = EXCLUDED.exclude_journals,
         exclude_cards = EXCLUDED.exclude_cards,
         exclude_ai_chat = EXCLUDED.exclude_ai_chat,
         exclude_personality = EXCLUDED.exclude_personality
       RETURNING *`,
      [
        userId, 
        connectionId, 
        excludeCheckins ?? false, 
        excludeJournals ?? false, 
        excludeCards ?? false, 
        excludeAiChat ?? false, 
        excludePersonality ?? false
      ]
    );

    res.json({
      message: 'Gizlilik sınırları güncellendi.',
      settings: result.rows[0]
    });
  } catch (err) {
    console.error('[relationshipController] updatePrivacySettings error:', err);
    res.status(500).json({ message: 'Gizlilik ayarları güncellenemedi.' });
  }
};

/**
 * Get AI Empathy Insight for a connection
 * GET /api/relationships/:id/insight
 */
exports.getInsight = async (req, res) => {
  const connectionId = req.params.id;
  const userId = req.user.id;

  try {
    // 1. Verify connection is active and belongs to user
    const checkRes = await db.query(
      `SELECT c.*, 
              u1.username as req_username, u1.zodiac_sign as req_zodiac,
              u2.username as rec_username, u2.zodiac_sign as rec_zodiac
       FROM relationship_connections c
       JOIN users u1 ON c.requester_id = u1.id
       JOIN users u2 ON c.recipient_id = u2.id
       WHERE c.id = $1 AND c.status = 'active' AND (c.requester_id = $2 OR c.recipient_id = $2)`,
      [connectionId, userId]
    );

    if (checkRes.rows.length === 0) {
      return res.status(404).json({ message: 'Aktif bağlantı bulunamadı.' });
    }

    const conn = checkRes.rows[0];
    const isRequester = conn.requester_id === userId;
    const partnerId = isRequester ? conn.recipient_id : conn.requester_id;
    const myUsername = isRequester ? conn.req_username : conn.rec_username;
    const partnerUsername = isRequester ? conn.rec_username : conn.req_username;
    const myZodiac = isRequester ? conn.req_zodiac : conn.rec_zodiac;
    const partnerZodiac = isRequester ? conn.rec_zodiac : conn.req_zodiac;
    const myAlias = isRequester ? conn.requester_alias : conn.recipient_alias;
    const partnerName = myAlias || partnerUsername;

    // 2. Look up privacy settings for BOTH users
    const privacyRes = await db.query(
      'SELECT * FROM relationship_privacy_settings WHERE connection_id = $1',
      [connectionId]
    );

    const myPrivacy = privacyRes.rows.find(r => r.user_id === userId) || { exclude_checkins: false, exclude_journals: false, exclude_cards: false, exclude_ai_chat: false, exclude_personality: false };
    const partnerPrivacy = privacyRes.rows.find(r => r.user_id === partnerId) || { exclude_checkins: false, exclude_journals: false, exclude_cards: false, exclude_ai_chat: false, exclude_personality: false };

    // 3. Gather USER context (Respecting myPrivacy)
    let myDossier = `[SENİN PROFİLİN VE RUH HALİN]\n`;
    myDossier += `Burç: ${myZodiac || 'Bilinmiyor'}\n`;

    if (!myPrivacy.exclude_personality) {
      const myPersonality = await db.query(
        "SELECT result_data FROM personality_results WHERE user_id = $1 AND test_type = 'color' ORDER BY created_at DESC LIMIT 1",
        [userId]
      );
      if (myPersonality.rows.length > 0) {
        const p = myPersonality.rows[0].result_data;
        myDossier += `DISC Kişilik Rengi: Dominant ${p.dominantColor} (${p.title}).\n`;
      }
    }

    if (!myPrivacy.exclude_checkins) {
      const myCheckins = await db.query(
        'SELECT mood, created_at FROM check_ins WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5',
        [userId]
      );
      if (myCheckins.rows.length > 0) {
        myDossier += `Son Duygu Durumları: ${myCheckins.rows.map(r => r.mood).join(', ')}\n`;
      }
    }

    if (!myPrivacy.exclude_cards) {
      const myCards = await db.query(
        'SELECT category, response FROM card_responses WHERE user_id = $1 ORDER BY created_at DESC LIMIT 3',
        [userId]
      );
      if (myCards.rows.length > 0) {
        myDossier += `Son İlgi/Eylem Seçimleri: ${myCards.rows.map(r => `[${r.category}] -> ${r.response}`).join(' | ')}\n`;
      }
    }

    // 4. Gather PARTNER context (Respecting partnerPrivacy)
    let partnerDossier = `[ORTAĞININ PROFİLİ VE RUH HALİ (Adı: ${partnerName})]\n`;
    partnerDossier += `Burç: ${partnerZodiac || 'Bilinmiyor'}\n`;

    if (!partnerPrivacy.exclude_personality) {
      const partnerPersonality = await db.query(
        "SELECT result_data FROM personality_results WHERE user_id = $1 AND test_type = 'color' ORDER BY created_at DESC LIMIT 1",
        [partnerId]
      );
      if (partnerPersonality.rows.length > 0) {
        const p = partnerPersonality.rows[0].result_data;
        partnerDossier += `DISC Kişilik Rengi: Dominant ${p.dominantColor} (${p.title}).\n`;
      }
    }

    if (!partnerPrivacy.exclude_checkins) {
      const partnerCheckins = await db.query(
        'SELECT mood FROM check_ins WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5',
        [partnerId]
      );
      if (partnerCheckins.rows.length > 0) {
        partnerDossier += `Son Duygu Durumları: ${partnerCheckins.rows.map(r => r.mood).join(', ')}\n`;
      }
    }

    if (!partnerPrivacy.exclude_cards) {
      const partnerCards = await db.query(
        'SELECT category, response FROM card_responses WHERE user_id = $1 ORDER BY created_at DESC LIMIT 3',
        [partnerId]
      );
      if (partnerCards.rows.length > 0) {
        partnerDossier += `Son İlgi/Eylem Seçimleri: ${partnerCards.rows.map(r => `[${r.category}] -> ${r.response}`).join(' | ')}\n`;
      }
    }

    // 5. Query recent insight to see if we can serve a cached version
    const cachedInsight = await db.query(
      `SELECT * FROM relationship_insights 
       WHERE connection_id = $1 AND for_user_id = $2 
       ORDER BY generated_at DESC LIMIT 1`,
      [connectionId, userId]
    );

    const forceRefresh = req.query.refresh === 'true';
    if (cachedInsight.rows.length > 0 && !forceRefresh) {
      const insight = cachedInsight.rows[0];
      // 24 hour fresh cache window
      const isFresh = (new Date() - new Date(insight.generated_at)) < 24 * 60 * 60 * 1000;
      if (isFresh) {
        return res.json({ insightText: insight.insight_text, generatedAt: insight.generated_at });
      }
    }

    // 6. Generate new AI insight
    const connectionTypeStr = conn.connection_type === 'partner' ? 'Partner' :
                              conn.connection_type === 'best_friend' ? 'En Yakın Arkadaş' :
                              conn.connection_type === 'family' ? 'Aile Üyesi' : 'Yakın Kişi';

    const systemPrompt = `You are "Selfplace", a highly emotionally intelligent and gentle relational empathy guide.
You are generating a private, reflective empathy insight for user "${myUsername}" regarding their connection with "${partnerName}" (Relationship Type: ${connectionTypeStr}).

CRITICAL SAFETY & PRIVACY RULES:
1. NEVER reveal any private content, journals, AI chats, check-in notes, or specific cards.
2. NEVER compare the users competitively or score them against each other.
3. NEVER take sides or judge their actions. Avoid blame completely.
4. DO NOT diagnose their relationship, tell them what to do, or suggest breaking up/connecting more dependency.
5. The guidance must feel gentle, poetic, warm, non-invasive, and focus on fostering mutual empathy and understanding.
6. Speak in Turkish. Keep it concise, warm, and comforting (exactly 3-4 sentences max).

Use the following profiles to synthesize communication insights:
${myDossier}

${partnerDossier}

Guide the user on how they can approach their interaction style, respect each other's emotional space, and bridge any compatibility differences based on their profiles. Example: "Her iki taraf da farklı şekillerde dinlenmek isteyebilir. Biri daha doğrudan konuşmaya ihtiyaç duyarken, diğeri sessizce hislerini sindirmeyi seçebilir. Bu farklılıklar bir mesafe değil, birbirinizi daha derinden tanımak için birer davettir."`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: systemPrompt }],
      temperature: 0.7,
    });

    const insightText = completion.choices[0].message.content;

    // Save insight to DB
    const insertInsight = await db.query(
      `INSERT INTO relationship_insights (connection_id, for_user_id, insight_text) 
       VALUES ($1, $2, $3) 
       RETURNING generated_at`,
      [connectionId, userId, insightText]
    );

    res.json({
      insightText,
      generatedAt: insertInsight.rows[0].generated_at
    });

  } catch (err) {
    console.error('[relationshipController] getInsight error:', err);
    res.status(500).json({ message: 'İlişki içgörüsü şu an üretilemiyor, lütfen daha sonra tekrar deneyin.' });
  }
};

/**
 * Get daily relationship sync (weather, energy, guide)
 * GET /api/relationships/:id/daily-sync
 */
exports.getDailySync = async (req, res) => {
  const connectionId = req.params.id;
  const userId = req.user.id;

  try {
    // 1. Verify active connection
    const checkRes = await db.query(
      `SELECT * FROM relationship_connections 
       WHERE id = $1 AND status = 'active' AND (requester_id = $2 OR recipient_id = $2)`,
      [connectionId, userId]
    );

    if (checkRes.rows.length === 0) {
      return res.status(404).json({ message: 'Aktif bağlantı bulunamadı.' });
    }

    // 2. Query today's sync
    const todaySync = await db.query(
      'SELECT * FROM relationship_daily_syncs WHERE connection_id = $1 AND synced_date = CURRENT_DATE',
      [connectionId]
    );

    if (todaySync.rows.length > 0) {
      return res.json(todaySync.rows[0]);
    }

    // 3. No sync exists for today yet, check limits
    const plan = await getUserPlan(userId);
    const countRes = await db.query('SELECT COUNT(*) FROM relationship_daily_syncs WHERE connection_id = $1', [connectionId]);
    const syncCount = parseInt(countRes.rows[0].count);

    if (plan === 'free' && syncCount >= 3) {
      return res.status(403).json({
        message: 'Ücretsiz planda günlük uyum limiti doldu. Sınırsız günlük uyum, hava durumu ve zengin analizler için Selfplace Plus\'a geçebilirsiniz.',
        isPremiumLocked: true
      });
    }

    // 4. Gather user profile & check-in patterns (privacy aware)
    const conn = checkRes.rows[0];
    const isRequester = conn.requester_id === userId;
    const partnerId = isRequester ? conn.recipient_id : conn.requester_id;

    const privacyRes = await db.query(
      'SELECT * FROM relationship_privacy_settings WHERE connection_id = $1',
      [connectionId]
    );

    const myPrivacy = privacyRes.rows.find(r => r.user_id === userId) || {};
    const partnerPrivacy = privacyRes.rows.find(r => r.user_id === partnerId) || {};

    let userAMoods = [];
    if (!myPrivacy.exclude_checkins) {
      const moods = await db.query('SELECT mood FROM check_ins WHERE user_id = $1 ORDER BY created_at DESC LIMIT 3', [userId]);
      userAMoods = moods.rows.map(r => r.mood);
    }
    let userBMoods = [];
    if (!partnerPrivacy.exclude_checkins) {
      const moods = await db.query('SELECT mood FROM check_ins WHERE user_id = $1 ORDER BY created_at DESC LIMIT 3', [partnerId]);
      userBMoods = moods.rows.map(r => r.mood);
    }

    let userAPersonality = 'Bilinmiyor';
    if (!myPrivacy.exclude_personality) {
      const p = await db.query("SELECT result_data FROM personality_results WHERE user_id = $1 AND test_type = 'color' ORDER BY created_at DESC LIMIT 1", [userId]);
      if (p.rows.length > 0) userAPersonality = p.rows[0].result_data.title;
    }
    let userBPersonality = 'Bilinmiyor';
    if (!partnerPrivacy.exclude_personality) {
      const p = await db.query("SELECT result_data FROM personality_results WHERE user_id = $1 AND test_type = 'color' ORDER BY created_at DESC LIMIT 1", [partnerId]);
      if (p.rows.length > 0) userBPersonality = p.rows[0].result_data.title;
    }

    // Gather recent ritual answers for context if allowed
    let ritualAnswersText = '';
    const myRituals = await db.query(
      `SELECT r.prompt_tr, resp.response_text FROM relationship_rituals r
       JOIN relationship_ritual_responses resp ON r.id = resp.ritual_id
       WHERE r.connection_id = $1 AND resp.user_id = $2 AND resp.include_in_synthesis = true
       ORDER BY r.created_at DESC LIMIT 2`,
      [connectionId, userId]
    );
    if (myRituals.rows.length > 0) {
      ritualAnswersText += `User A recent reflection answers:\n` + myRituals.rows.map(r => `- Q: "${r.prompt_tr}" -> A: "${r.response_text}"`).join('\n');
    }
    const partnerRituals = await db.query(
      `SELECT r.prompt_tr, resp.response_text FROM relationship_rituals r
       JOIN relationship_ritual_responses resp ON r.id = resp.ritual_id
       WHERE r.connection_id = $1 AND resp.user_id = $2 AND resp.include_in_synthesis = true
       ORDER BY r.created_at DESC LIMIT 2`,
      [connectionId, partnerId]
    );
    if (partnerRituals.rows.length > 0) {
      ritualAnswersText += `\nUser B recent reflection answers:\n` + partnerRituals.rows.map(r => `- Q: "${r.prompt_tr}" -> A: "${r.response_text}"`).join('\n');
    }

    const systemPrompt = `You are "Selfplace", a relationship empathy guide. 
Analyze these aggregate communication patterns (no raw journals or chats are present):
User A Moods: [${userAMoods.join(', ')}], Personality: ${userAPersonality}
User B Moods: [${userBMoods.join(', ')}], Personality: ${userBPersonality}
${ritualAnswersText}

Synthesize a single JSON object. The object must contain exactly:
- "emotionalWeather": An atmospheric state choosing from: 'Sakin', 'Dingin', 'Yumuşak', 'Hassas', 'Derin', 'Hafif Yoğun', 'Yenileyici'.
- "relationshipEnergy": An atmospheric state choosing from: 'Huzurlu', 'Dengeli', 'Yumuşak', 'Yenileniyor', 'Mesafeli', 'Derin', 'Duygusal'.
- "generatedText": A warm, poetic, gentle 2-sentence Turkish guidance text guiding how they can support each other today. Do not diagnose, judge, or blame. Avoid percentages or competitive metrics. Example: "Bugün birbirinizin sessiz anlarına alan açmak dinlendirici olabilir. İkinizin de sakinleşmek için biraz zamana ihtiyacı var."

Respond ONLY with valid JSON.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: systemPrompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const parsed = JSON.parse(completion.choices[0].message.content);

    // Save daily sync
    const insertRes = await db.query(
      `INSERT INTO relationship_daily_syncs (connection_id, generated_text, emotional_weather, relationship_energy)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (connection_id, synced_date) DO UPDATE SET
         generated_text = EXCLUDED.generated_text,
         emotional_weather = EXCLUDED.emotional_weather,
         relationship_energy = EXCLUDED.relationship_energy
       RETURNING *`,
      [connectionId, parsed.generatedText, parsed.emotionalWeather, parsed.relationshipEnergy]
    );

    // Add event to timeline if weather changed
    const lastSync = await db.query(
      'SELECT emotional_weather FROM relationship_daily_syncs WHERE connection_id = $1 AND synced_date < CURRENT_DATE ORDER BY synced_date DESC LIMIT 1',
      [connectionId]
    );
    if (lastSync.rows.length === 0 || lastSync.rows[0].emotional_weather !== parsed.emotionalWeather) {
      await db.query(
        `INSERT INTO relationship_timeline (connection_id, event_type, title_tr, description_tr)
         VALUES ($1, 'weather_change', 'Duygusal Hava Değişti 🌤️', 'İlişki atmosferiniz bugün "${parsed.emotionalWeather}" durumuna evrildi.')`,
        [connectionId]
      );
    }

    res.json(insertRes.rows[0]);

  } catch (err) {
    console.error('[relationshipController] getDailySync error:', err);
    res.status(500).json({ message: 'Günlük uyum verisi oluşturulamadı.' });
  }
};

const RITUAL_PROMPTS = [
  "Bugün partnerinizde/yakınınızda en çok takdir ettiğiniz küçük şey neydi?",
  "Son zamanlarda zihninizi en çok meşgul eden ve onunla paylaşmak istediğiniz konu nedir?",
  "Bugün kendinizi onun yanında tam anlamıyla duyulmuş ve anlaşılmış hissettiniz mi?",
  "İlişkinizde son günlerde size kendinizi en çok güvende ve huzurlu hissettiren an hangisiydi?",
  "Bugün birlikte geçirdiğiniz ya da paylaştığınız hangi an size tebessüm ettirdi?",
  "Ona karşı duyduğunuz ama sıklıkla dile getirmeyi unuttuğunuz bir teşekkürünüz var mı?",
  "Bugün birbirinizin duygusal alanına ne kadar saygı gösterebildiniz?"
];

/**
 * Get active rituals for a connection
 * GET /api/relationships/:id/rituals
 */
exports.getRituals = async (req, res) => {
  const connectionId = req.params.id;
  const userId = req.user.id;

  try {
    // 1. Verify active connection
    const checkRes = await db.query(
      `SELECT c.*, 
              u1.username as req_username, u2.username as rec_username
       FROM relationship_connections c
       JOIN users u1 ON c.requester_id = u1.id
       JOIN users u2 ON c.recipient_id = u2.id
       WHERE c.id = $1 AND c.status = 'active' AND (c.requester_id = $2 OR c.recipient_id = $2)`,
      [connectionId, userId]
    );

    if (checkRes.rows.length === 0) {
      return res.status(404).json({ message: 'Aktif bağlantı bulunamadı.' });
    }

    const plan = await getUserPlan(userId);
    if (plan === 'free') {
      return res.status(403).json({ message: 'İlişki ritüelleri premium bir özelliktir.', isPremiumLocked: true });
    }

    // Get today's ritual prompt
    const today = new Date().toISOString().split('T')[0];
    let ritual = await db.query(
      'SELECT * FROM relationship_rituals WHERE connection_id = $1 AND created_at::date = $2',
      [connectionId, today]
    );

    if (ritual.rows.length === 0) {
      const promptIndex = new Date().getDate() % RITUAL_PROMPTS.length;
      const prompt = RITUAL_PROMPTS[promptIndex];
      const insert = await db.query(
        'INSERT INTO relationship_rituals (connection_id, prompt_tr) VALUES ($1, $2) RETURNING *',
        [connectionId, prompt]
      );
      ritual = insert;
    }

    const ritualId = ritual.rows[0].id;
    const promptText = ritual.rows[0].prompt_tr;

    // Get my response
    const myResponseRes = await db.query(
      'SELECT * FROM relationship_ritual_responses WHERE ritual_id = $1 AND user_id = $2',
      [ritualId, userId]
    );

    // Get if partner responded
    const conn = checkRes.rows[0];
    const isRequester = conn.requester_id === userId;
    const partnerId = isRequester ? conn.recipient_id : conn.requester_id;
    const partnerResponseRes = await db.query(
      'SELECT id FROM relationship_ritual_responses WHERE ritual_id = $1 AND user_id = $2',
      [ritualId, partnerId]
    );

    res.json({
      ritualId,
      prompt: promptText,
      myResponse: myResponseRes.rows[0] || null,
      partnerResponded: partnerResponseRes.rows.length > 0
    });

  } catch (err) {
    console.error('[relationshipController] getRituals error:', err);
    res.status(500).json({ message: 'Ritüeller yüklenemedi.' });
  }
};

/**
 * Submit response to daily ritual
 * POST /api/relationships/:id/rituals/:ritualId/respond
 */
exports.respondToRitual = async (req, res) => {
  const connectionId = req.params.id;
  const ritualId = req.params.ritualId;
  const { responseText, includeInSynthesis } = req.body;
  const userId = req.user.id;

  if (!responseText || responseText.trim() === '') {
    return res.status(400).json({ message: 'Cevap alanı boş olamaz.' });
  }

  try {
    // Verify user is in connection
    const checkRes = await db.query(
      'SELECT * FROM relationship_connections WHERE id = $1 AND status = \'active\' AND (requester_id = $2 OR recipient_id = $2)',
      [connectionId, userId]
    );

    if (checkRes.rows.length === 0) {
      return res.status(404).json({ message: 'Aktif bağlantı bulunamadı.' });
    }

    // Insert response
    const insertRes = await db.query(
      `INSERT INTO relationship_ritual_responses (ritual_id, user_id, response_text, include_in_synthesis)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (ritual_id, user_id) DO UPDATE SET
         response_text = EXCLUDED.response_text,
         include_in_synthesis = EXCLUDED.include_in_synthesis,
         created_at = NOW()
       RETURNING *`,
      [ritualId, userId, responseText.trim(), includeInSynthesis ?? true]
    );

    // Check if both responded to create timeline milestone
    const conn = checkRes.rows[0];
    const isRequester = conn.requester_id === userId;
    const partnerId = isRequester ? conn.recipient_id : conn.requester_id;
    const partnerResp = await db.query(
      'SELECT id FROM relationship_ritual_responses WHERE ritual_id = $1 AND user_id = $2',
      [ritualId, partnerId]
    );

    if (partnerResp.rows.length > 0) {
      await db.query(
        `INSERT INTO relationship_timeline (connection_id, event_type, title_tr, description_tr)
         VALUES ($1, 'ritual_done', 'Ortak Ritüel Tamamlandı ✨', 'Günün duygusal yansımasını iki taraf da tamamlayarak empati bağını pekiştirdi.')`,
        [connectionId]
      );
    }

    res.json({
      message: 'Ritüel cevabınız kaydedildi.',
      response: insertRes.rows[0]
    });

  } catch (err) {
    console.error('[relationshipController] respondToRitual error:', err);
    res.status(500).json({ message: 'Cevap kaydedilemedi.' });
  }
};

/**
 * Get timeline milestones for a connection
 * GET /api/relationships/:id/timeline
 */
exports.getTimeline = async (req, res) => {
  const connectionId = req.params.id;
  const userId = req.user.id;

  try {
    // 1. Verify active connection
    const checkRes = await db.query(
      'SELECT * FROM relationship_connections WHERE id = $1 AND status = \'active\' AND (requester_id = $2 OR recipient_id = $2)',
      [connectionId, userId]
    );

    if (checkRes.rows.length === 0) {
      return res.status(404).json({ message: 'Aktif bağlantı bulunamadı.' });
    }

    const plan = await getUserPlan(userId);
    if (plan === 'free') {
      return res.status(403).json({ message: 'İlişki zaman tüneli premium bir özelliktir.', isPremiumLocked: true });
    }

    // 2. Fetch timeline
    const result = await db.query(
      'SELECT * FROM relationship_timeline WHERE connection_id = $1 ORDER BY created_at DESC LIMIT 50',
      [connectionId]
    );

    res.json(result.rows);

  } catch (err) {
    console.error('[relationshipController] getTimeline error:', err);
    res.status(500).json({ message: 'Zaman tüneli yüklenemedi.' });
  }
};

/**
 * Get lightweight daily insight feed (3 whispers)
 * GET /api/relationships/:id/insight-feed
 */
exports.getInsightFeed = async (req, res) => {
  const connectionId = req.params.id;
  const userId = req.user.id;

  try {
    // 1. Verify active connection
    const checkRes = await db.query(
      "SELECT * FROM relationship_connections WHERE id = $1 AND status = 'active' AND (requester_id = $2 OR recipient_id = $2)",
      [connectionId, userId]
    );

    if (checkRes.rows.length === 0) {
      return res.status(404).json({ message: 'Aktif bağlantı bulunamadı.' });
    }

    const plan = await getUserPlan(userId);
    if (plan === 'free') {
      return res.status(403).json({ message: 'Uyum Fısıltıları premium bir özelliktir.', isPremiumLocked: true });
    }

    // 2. Fetch or generate the insights
    const insights = await getInsightFeed(connectionId);
    res.json(insights);

  } catch (err) {
    console.error('[relationshipController] getInsightFeed error:', err);
    res.status(500).json({ message: 'Uyum fısıltıları yüklenemedi.' });
  }
};
