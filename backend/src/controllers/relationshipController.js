const db = require('../config/db');
const OpenAI = require('openai');
const { getInsightFeed } = require('../services/emotionalContextBuilder');
const { generateRitualReflection } = require('../services/aiService');
const { getLanguage } = require('../utils/languageResolver');
const { getWeatherPresentation, getEnergyPresentation } = require('../utils/relationshipEnums');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function getUserPlan(userId) {
  const result = await db.query('SELECT plan_type FROM subscription_status WHERE user_id = $1', [userId]);
  if (result.rows.length === 0) return 'free';
  return result.rows[0].plan_type || 'free';
}

async function isSignatureConnection(connectionId) {
  try {
    const connRes = await db.query(
      'SELECT requester_id, recipient_id FROM relationship_connections WHERE id = $1',
      [connectionId]
    );
    if (connRes.rows.length === 0) return false;
    const { requester_id, recipient_id } = connRes.rows[0];
    
    const reqPlan = await getUserPlan(requester_id);
    const recPlan = await getUserPlan(recipient_id);
    
    return reqPlan === 'signature' || recPlan === 'signature';
  } catch (err) {
    console.error('isSignatureConnection error:', err);
    return false;
  }
}

/**
 * Send invitation to connect
 * POST /api/relationships/invite
 */
exports.sendInvite = async (req, res) => {
  const { email, connectionType, alias } = req.body;
  const requesterId = req.user.id;

  if (!email || !connectionType) {
    return res.status(400).json({ message: getLanguage(req) === 'en' ? 'Email address and relationship type are required.' : 'E-posta adresi ve ilişki türü gereklidir.' });
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
        return res.status(409).json({
          message: getLanguage(req) === 'en' ? 'The free plan includes 1 active connection. Upgrade to Selfplace Plus for unlimited connections.' : 'Ücretsiz planda yalnızca 1 aktif bağlantı kurabilirsiniz. Sınırsız bağlantı için planınızı Selfplace Plus\'a yükseltin.',
          isLimitReached: true
        });
      }
    }

    // 1. Find the recipient user
    const recipientRes = await db.query('SELECT id, username FROM users WHERE email = $1', [email.trim().toLowerCase()]);
    if (recipientRes.rows.length === 0) {
      return res.status(404).json({ message: getLanguage(req) === 'en' ? 'No user was found with this email address.' : 'Bu e-posta adresine sahip bir kullanıcı bulunamadı.' });
    }

    const recipientId = recipientRes.rows[0].id;

    // 2. Prevent self-invite
    if (recipientId === requesterId) {
      return res.status(400).json({ message: getLanguage(req) === 'en' ? 'You can\'t send a connection request to yourself.' : 'Kendinize bağlantı isteği gönderemezsiniz.' });
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
        return res.status(400).json({ message: getLanguage(req) === 'en' ? 'You already have an active connection with this user.' : 'Bu kullanıcıyla zaten aktif bir bağlantınız var.' });
      }
      if (conn.status === 'pending') {
        if (conn.requester_id === requesterId) {
          return res.status(400).json({ message: getLanguage(req) === 'en' ? 'You already have a pending request to this user.' : 'Bu kullanıcıya zaten beklemede olan bir isteğiniz var.' });
        } else {
          return res.status(400).json({ message: getLanguage(req) === 'en' ? 'This user has already sent you a request. Please accept it.' : 'Bu kullanıcıdan zaten beklemede olan bir istek aldınız. Lütfen kabul edin.' });
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
      message: getLanguage(req) === 'en' ? 'Connection request sent.' : 'Bağlantı isteği başarıyla gönderildi.',
      connectionId
    });

  } catch (err) {
    console.error('[relationshipController] sendInvite error:', err);
    res.status(500).json({ message: getLanguage(req) === 'en' ? 'Couldn\'t send the request. Please try again.' : 'İstek gönderilemedi. Lütfen tekrar deneyin.' });
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
    res.status(500).json({ message: getLanguage(req) === 'en' ? 'Couldn\'t load connections.' : 'Bağlantılar yüklenemedi.' });
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
    return res.status(400).json({ message: getLanguage(req) === 'en' ? 'Invalid action.' : 'Geçersiz işlem.' });
  }

  try {
    // Check if the connection exists and the current user is the recipient
    const checkRes = await db.query(
      'SELECT * FROM relationship_connections WHERE id = $1 AND recipient_id = $2 AND status = \'pending\'',
      [connectionId, userId]
    );

    if (checkRes.rows.length === 0) {
      return res.status(404).json({ message: getLanguage(req) === 'en' ? 'Connection request not found, or you don\'t have permission.' : 'Bağlantı isteği bulunamadı veya yetkiniz yok.' });
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
          return res.status(409).json({
            message: getLanguage(req) === 'en' ? 'The free plan includes 1 active connection. Upgrade your plan for unlimited connections.' : 'Ücretsiz planda yalnızca 1 aktif bağlantı kurabilirsiniz. Sınırsız bağlantı için planınızı yükseltin.',
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

      // Create shared timeline entry for the connection
      await db.query(
        `INSERT INTO relationship_timeline (connection_id, event_type, title_tr, description_tr, title_en, description_en)
         VALUES ($1, 'created', 'İlk Bağlantı Kuruldu 🌿', 'Selfplace üzerinde duygusal uyum yolculuğunuz başladı.', 'First Connection Established 🌿', 'Your emotional harmony journey began on Selfplace.')`,
        [connectionId]
      );

      // Track a personalized CONNECTION_CREATED event for each user so the
      // Conversation Director can mention it proactively in their next chat session.
      // The connection status is already 'active' above, so trackEvent will find it.
      const { trackEvent } = require('../services/eventEngine');
      const requesterId = checkRes.rows[0].requester_id;
      trackEvent(requesterId, 'CONNECTION_CREATED', 'major').catch(err =>
        console.error('[relationshipController] trackEvent (requester) error:', err.message)
      );
      trackEvent(userId, 'CONNECTION_CREATED', 'major').catch(err =>
        console.error('[relationshipController] trackEvent (recipient) error:', err.message)
      );

      return res.json({ message: getLanguage(req) === 'en' ? 'Connection accepted.' : 'Bağlantı başarıyla kabul edildi.' });
    } else {
      await db.query(
        `UPDATE relationship_connections 
         SET status = 'rejected', updated_at = NOW() 
         WHERE id = $1`,
        [connectionId]
      );
      return res.json({ message: getLanguage(req) === 'en' ? 'Connection request declined.' : 'Bağlantı isteği reddedildi.' });
    }

  } catch (err) {
    console.error('[relationshipController] respondInvite error:', err);
    res.status(500).json({ message: getLanguage(req) === 'en' ? 'Couldn\'t complete the action.' : 'İşlem tamamlanamadı.' });
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
      return res.status(404).json({ message: getLanguage(req) === 'en' ? 'Connection not found.' : 'Bağlantı bulunamadı.' });
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
      return res.status(400).json({ message: getLanguage(req) === 'en' ? 'No fields to update were provided.' : 'Güncellenecek alan belirtilmedi.' });
    }

    params.push(connectionId);
    await db.query(
      `UPDATE relationship_connections 
       SET ${updateFields.join(', ')}, updated_at = NOW() 
       WHERE id = $${paramIndex}`,
      params
    );

    res.json({ message: getLanguage(req) === 'en' ? 'Connection settings updated.' : 'Bağlantı ayarları güncellendi.' });

  } catch (err) {
    console.error('[relationshipController] updateSettings error:', err);
    res.status(500).json({ message: getLanguage(req) === 'en' ? 'Couldn\'t update settings.' : 'Ayarlar güncellenemedi.' });
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
      return res.status(404).json({ message: getLanguage(req) === 'en' ? 'Connection not found, or you don\'t have permission to remove it.' : 'Bağlantı bulunamadı veya silme yetkiniz yok.' });
    }

    // Hard delete to automatically cascade delete insights, privacy settings, relationship_context
    await db.query('DELETE FROM relationship_connections WHERE id = $1', [connectionId]);

    res.json({ message: getLanguage(req) === 'en' ? 'Connection removed.' : 'Bağlantı başarıyla kesildi.' });
  } catch (err) {
    console.error('[relationshipController] disconnect error:', err);
    res.status(500).json({ message: getLanguage(req) === 'en' ? 'Couldn\'t remove the connection.' : 'Bağlantı kesilemedi.' });
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
    res.status(500).json({ message: getLanguage(req) === 'en' ? 'Couldn\'t load privacy settings.' : 'Gizlilik ayarları getirilemedi.' });
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
      return res.status(404).json({ message: getLanguage(req) === 'en' ? 'Connection not found.' : 'Bağlantı bulunamadı.' });
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
      message: getLanguage(req) === 'en' ? 'Privacy boundaries updated.' : 'Gizlilik sınırları güncellendi.',
      settings: result.rows[0]
    });
  } catch (err) {
    console.error('[relationshipController] updatePrivacySettings error:', err);
    res.status(500).json({ message: getLanguage(req) === 'en' ? 'Couldn\'t update privacy settings.' : 'Gizlilik ayarları güncellenemedi.' });
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
      return res.status(404).json({ message: getLanguage(req) === 'en' ? 'Active connection not found.' : 'Aktif bağlantı bulunamadı.' });
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
        "SELECT result_data, test_type FROM personality_results WHERE user_id = $1 AND test_type IN ('color', 'journey') ORDER BY created_at DESC LIMIT 1",
        [userId]
      );
      if (myPersonality.rows.length > 0) {
        const row = myPersonality.rows[0];
        const p = row.result_data;
        if (row.test_type === 'journey') {
          const colorName = p.color_family?.name || 'Bilinmiyor';
          const colorHex = p.color_family?.hex || p.dominant_color || '#B3B3B3';
          myDossier += `DISC Kişilik Rengi: Dominant ${colorHex} (${colorName}).\n`;
        } else {
          myDossier += `DISC Kişilik Rengi: Dominant ${p.dominantColor} (${p.title}).\n`;
        }
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
        "SELECT result_data, test_type FROM personality_results WHERE user_id = $1 AND test_type IN ('color', 'journey') ORDER BY created_at DESC LIMIT 1",
        [partnerId]
      );
      if (partnerPersonality.rows.length > 0) {
        const row = partnerPersonality.rows[0];
        const p = row.result_data;
        if (row.test_type === 'journey') {
          const colorName = p.color_family?.name || 'Bilinmiyor';
          const colorHex = p.color_family?.hex || p.dominant_color || '#B3B3B3';
          partnerDossier += `DISC Kişilik Rengi: Dominant ${colorHex} (${colorName}).\n`;
        } else {
          partnerDossier += `DISC Kişilik Rengi: Dominant ${p.dominantColor} (${p.title}).\n`;
        }
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
    const rawLang = req.headers['x-app-language'] || req.headers['accept-language'] || req.query.lang;
    const isEn = (rawLang && String(rawLang).toLowerCase().startsWith('en'));
    const lang = isEn ? 'en' : 'tr';

    const cachedInsight = await db.query(
      `SELECT insight_text, generated_at, language FROM relationship_insights 
       WHERE connection_id = $1 AND for_user_id = $2 AND language = $3 AND language IS NOT NULL
       ORDER BY generated_at DESC LIMIT 1`,
      [connectionId, userId, lang]
    );

    const forceRefresh = req.query.refresh === 'true';
    if (cachedInsight.rows.length > 0 && !forceRefresh) {
      const insight = cachedInsight.rows[0];
      // 24 hour fresh cache window
      const isFresh = (new Date() - new Date(insight.generated_at)) < 24 * 60 * 60 * 1000;
      if (isFresh && insight.language === lang) {
        return res.json({ insightText: insight.insight_text, generatedAt: insight.generated_at });
      }
    }

    // 6. Generate new AI insight
    const connectionTypeStr = conn.connection_type === 'partner' ? (isEn ? 'Partner' : 'Partner') :
                              conn.connection_type === 'best_friend' ? (isEn ? 'Closest Friend' : 'En Yakın Arkadaş') :
                              conn.connection_type === 'family' ? (isEn ? 'Family Member' : 'Aile Üyesi') : (isEn ? 'Close Person' : 'Yakın Kişi');

    const systemPrompt = `You are "Selfplace", a highly emotionally intelligent and gentle relational empathy guide.
You are generating a private, reflective empathy insight for user "${myUsername}" regarding their connection with "${partnerName}" (Relationship Type: ${connectionTypeStr}).

CRITICAL SAFETY & PRIVACY RULES:
1. NEVER reveal any private content, journals, AI chats, check-in notes, or specific cards.
2. NEVER compare the users competitively or score them against each other.
3. NEVER take sides or judge their actions. Avoid blame completely.
4. DO NOT diagnose their relationship, tell them what to do, or suggest breaking up/connecting more dependency.
5. The guidance must feel gentle, warm, non-invasive, and focus on fostering mutual empathy and understanding.
6. Speak in ${isEn ? 'ENGLISH' : 'TURKISH'}. Keep it concise, warm, and comforting (exactly 3-4 sentences max).

Use the following profiles to synthesize communication insights:
${myDossier}

${partnerDossier}

Guide the user on how they can approach their interaction style, respect each other's emotional space, and bridge any compatibility differences based on their profiles in ${isEn ? 'ENGLISH' : 'TURKISH'}.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: systemPrompt }],
      temperature: 0.7,
    });

    const insightText = completion.choices[0].message.content;

    // Save insight to DB
    const insertInsight = await db.query(
      `INSERT INTO relationship_insights (connection_id, for_user_id, insight_text, language) 
       VALUES ($1, $2, $3, $4) 
       RETURNING generated_at`,
      [connectionId, userId, insightText, lang]
    );

    res.json({
      insightText,
      generatedAt: insertInsight.rows[0].generated_at
    });

  } catch (err) {
    console.error('[relationshipController] getInsight error:', err);
    res.status(500).json({ message: getLanguage(req) === 'en' ? 'The relationship insight can\'t be generated right now. Please try again later.' : 'İlişki içgörüsü şu an üretilemiyor, lütfen daha sonra tekrar deneyin.' });
  }
};

/**
 * Get daily relationship sync (weather, energy, guide)
 * GET /api/relationships/:id/daily-sync
 */
exports.getDailySync = async (req, res) => {
  const connectionId = req.params.id;
  const userId = req.user.id;
  const lang = getLanguage(req);
  const isEn = lang === 'en';

  try {
    // 1. Verify active connection
    const checkRes = await db.query(
      `SELECT * FROM relationship_connections 
       WHERE id = $1 AND status = 'active' AND (requester_id = $2 OR recipient_id = $2)`,
      [connectionId, userId]
    );

    if (checkRes.rows.length === 0) {
      return res.status(404).json({ message: isEn ? 'Active connection not found.' : 'Aktif bağlantı bulunamadı.' });
    }

    // 2. Query today's sync for this language
    const todaySync = await db.query(
      'SELECT * FROM relationship_daily_syncs WHERE connection_id = $1 AND synced_date = CURRENT_DATE AND language_code = $2',
      [connectionId, lang]
    );

    const isSig = await isSignatureConnection(connectionId);

    if (todaySync.rows.length > 0) {
      const row = todaySync.rows[0];
      // If the connection has Signature but the stored daily sync is missing signature fields,
      // let's force re-generate it. Otherwise, return the cached sync.
      if (isSig && !row.emotional_aura) {
        // Force regeneration to fill Signature fields
      } else {
        return res.json({
          ...row,
          emotional_weather: getWeatherPresentation(row.emotional_weather, lang),
          relationship_energy: getEnergyPresentation(row.relationship_energy, lang),
        });
      }
    }

    // 3. No sync exists for today yet, check limits
    const plan = await getUserPlan(userId);
    const countRes = await db.query('SELECT COUNT(*) FROM relationship_daily_syncs WHERE connection_id = $1', [connectionId]);
    const syncCount = parseInt(countRes.rows[0].count);

    if (plan === 'free' && syncCount >= 3) {
      return res.status(402).json({
        message: isEn 
          ? 'Daily sync limit reached on free plan. Upgrade to Selfplace Plus for unlimited daily sync, weather and deep insights.'
          : 'Ücretsiz planda günlük uyum limiti doldu. Sınırsız günlük uyum, hava durumu ve zengin analizler için Selfplace Plus\'a geçebilirsiniz.',
        isPremiumLocked: true
      });
    }

    // 4. Gather user profile & check-in patterns (privacy aware)
    const conn = checkRes.rows[0];
    const isRequester = conn.requester_id === userId;
    const partnerId = isRequester ? conn.recipient_id : conn.requester_alias;

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

    let userAPersonality = isEn ? 'Unknown' : 'Bilinmiyor';
    if (!myPrivacy.exclude_personality) {
      const p = await db.query(
        "SELECT result_data, test_type FROM personality_results WHERE user_id = $1 AND test_type IN ('color', 'journey') ORDER BY created_at DESC LIMIT 1",
        [userId]
      );
      if (p.rows.length > 0) {
        const row = p.rows[0];
        const data = row.result_data;
        userAPersonality = row.test_type === 'journey' ? (data.color_family?.name || (isEn ? 'Unknown' : 'Bilinmiyor')) : data.title;
      }
    }
    let userBPersonality = isEn ? 'Unknown' : 'Bilinmiyor';
    if (!partnerPrivacy.exclude_personality) {
      const p = await db.query(
        "SELECT result_data, test_type FROM personality_results WHERE user_id = $1 AND test_type IN ('color', 'journey') ORDER BY created_at DESC LIMIT 1",
        [partnerId]
      );
      if (p.rows.length > 0) {
        const row = p.rows[0];
        const data = row.result_data;
        userBPersonality = row.test_type === 'journey' ? (data.color_family?.name || (isEn ? 'Unknown' : 'Bilinmiyor')) : data.title;
      }
    }

    // Gather recent ritual answers for context if allowed
    let ritualAnswersText = '';
    const myRituals = await db.query(
      `SELECT r.prompt_tr, r.prompt_en, resp.response_text FROM relationship_rituals r
       JOIN relationship_ritual_responses resp ON r.id = resp.ritual_id
       WHERE r.connection_id = $1 AND resp.user_id = $2 AND resp.include_in_synthesis = true
       ORDER BY r.created_at DESC LIMIT 2`,
      [connectionId, userId]
    );
    if (myRituals.rows.length > 0) {
      ritualAnswersText += `User A recent reflection answers:\n` + myRituals.rows.map(r => `- Q: "${isEn ? (r.prompt_en || r.prompt_tr) : r.prompt_tr}" -> A: "${r.response_text}"`).join('\n');
    }
    const partnerRituals = await db.query(
      `SELECT r.prompt_tr, r.prompt_en, resp.response_text FROM relationship_rituals r
       JOIN relationship_ritual_responses resp ON r.id = resp.ritual_id
       WHERE r.connection_id = $1 AND resp.user_id = $2 AND resp.include_in_synthesis = true
       ORDER BY r.created_at DESC LIMIT 2`,
      [connectionId, partnerId]
    );
    if (partnerRituals.rows.length > 0) {
      ritualAnswersText += `\nUser B recent reflection answers:\n` + partnerRituals.rows.map(r => `- Q: "${isEn ? (r.prompt_en || r.prompt_tr) : r.prompt_tr}" -> A: "${r.response_text}"`).join('\n');
    }

    // 5. Gather historical memory and Daily Sync logs for continuity
    const pastSyncsRes = await db.query(
      `SELECT synced_date, emotional_weather, relationship_energy, emotional_aura, connection_state, relationship_rhythm, emotional_closeness 
       FROM relationship_daily_syncs 
       WHERE connection_id = $1 AND synced_date < CURRENT_DATE 
       ORDER BY synced_date DESC LIMIT 3`,
      [connectionId]
    );
    const pastSyncs = pastSyncsRes.rows;

    const pastEventsRes = await db.query(
      `SELECT event_type, title_tr, title_en, description_tr, description_en, created_at 
       FROM relationship_timeline 
       WHERE connection_id = $1 
       ORDER BY created_at DESC LIMIT 3`,
      [connectionId]
    );
    const pastEvents = pastEventsRes.rows;

    const pastCrystalsRes = await db.query(
      `SELECT summary, symbol, created_at 
       FROM couple_memories 
       WHERE connection_id = $1 AND memory_type = 'crystal' 
       ORDER BY created_at DESC LIMIT 3`,
      [connectionId]
    );
    const pastCrystals = pastCrystalsRes.rows;

    let historyContext = '';
    if (pastSyncs.length > 0) {
      historyContext += `### PAST DAILY SYNCS:\n`;
      pastSyncs.forEach((s, index) => {
        const dateStr = s.synced_date instanceof Date ? s.synced_date.toISOString().split('T')[0] : String(s.synced_date);
        historyContext += `- Day ${index + 1} (${dateStr}): Weather: ${getWeatherPresentation(s.emotional_weather, lang)}, Energy: ${getEnergyPresentation(s.relationship_energy, lang)}`;
        if (s.emotional_aura) {
          historyContext += `, Aura: ${s.emotional_aura}, State: ${s.connection_state}, Rhythm: ${s.relationship_rhythm}, Closeness: %${s.emotional_closeness}`;
        }
        historyContext += `\n`;
      });
    } else {
      historyContext += `### PAST DAILY SYNC: None (New relationship or first synthesis)\n`;
    }

    if (pastEvents.length > 0) {
      historyContext += `### RECENT RELATIONSHIP MILESTONES:\n`;
      pastEvents.forEach(e => {
        historyContext += `- [${e.event_type}] ${isEn ? (e.title_en || e.title_tr) : e.title_tr}: ${isEn ? (e.description_en || e.description_tr || '') : (e.description_tr || '')}\n`;
      });
    }

    if (pastCrystals.length > 0) {
      historyContext += `### ACCUMULATED EMOTIONAL MEMORY CRYSTALS:\n`;
      pastCrystals.forEach(c => {
        historyContext += `- "${c.summary}" (${c.symbol})\n`;
      });
    }

    const weatherOptions = isEn 
      ? "'Calm', 'Serene', 'Gentle', 'Tender', 'Deep', 'Mildly Intense', 'Renewing'"
      : "'Sakin', 'Dingin', 'Yumuşak', 'Hassas', 'Derin', 'Hafif Yoğun', 'Yenileyici'";
    const energyOptions = isEn
      ? "'Peaceful', 'Balanced', 'Soft', 'Renewing', 'Distant', 'Deep', 'Emotional'"
      : "'Huzurlu', 'Dengeli', 'Yumuşak', 'Yenileniyor', 'Mesafeli', 'Derin', 'Duygusal'";

    let systemPrompt;
    if (isSig) {
      systemPrompt = `You are "Selfplace", a relationship empathy guide. 
Analyze these aggregate communication patterns (no raw journals or chats are present):
User A Moods: [${userAMoods.join(', ')}], Personality: ${userAPersonality}
User B Moods: [${userBMoods.join(', ')}], Personality: ${userBPersonality}
${ritualAnswersText}

Recent relationship history:
${historyContext}

CRITICAL RULES FOR EMOTIONAL CONTINUITY AND INERTIA (SLOW DRIFT):
1. The emotional weather, relationship energy, emotional aura, connection state, and rhythm MUST NOT jump randomly. They must evolve progressively.
2. If past syncs exist, maintain atmospheric inertia. Keep the values identical or very close to yesterday's values unless there is a clear shift.
3. If there is no previous history, initialize them to balanced, gentle starting values.

Synthesize a single JSON object in ${isEn ? 'ENGLISH' : 'TURKISH'}. Since this is a Signature tier connection, you must return additional emotional aura, rhythm, and state dimensions.
The object must contain exactly:
- "emotionalWeather": An atmospheric state choosing from: ${weatherOptions}.
- "relationshipEnergy": An atmospheric state choosing from: ${energyOptions}.
- "generatedText": A warm, gentle 2-sentence ${isEn ? 'English' : 'Turkish'} guidance text guiding how they can support each other today. Do not diagnose, judge, or blame. Avoid percentages or competitive metrics.
- "emotionalAura": A short, beautiful emotional aura description in ${isEn ? 'English (e.g. Quiet Intimacy 🌙, Mutual Warmth 🌸)' : 'Turkish (e.g. Sessiz Yakınlık 🌙, Karşılıklı Şefkat 🌸)'}.
- "connectionState": A short state text describing the current stage of their connection in ${isEn ? 'English (e.g. Deepening Trust ✨, Slow Harmony 🌿)' : 'Turkish (e.g. Derinleşen Güven ✨, Yavaş Uyum 🌿)'}.
- "relationshipRhythm": A rhythm summary in ${isEn ? 'English (e.g. Growing Together 🌿, Balanced Flow 💫)' : 'Turkish (e.g. Birlikte Büyüyen Enerji 🌿, Dengeli Akış 💫)'}.
- "emotionalCloseness": An integer between 0 and 100 representing emotional closeness, computed based on vulnerability and affection.

Respond ONLY with valid JSON.`;
    } else {
      systemPrompt = `You are "Selfplace", a relationship empathy guide. 
Analyze these aggregate communication patterns:
User A Moods: [${userAMoods.join(', ')}], Personality: ${userAPersonality}
User B Moods: [${userBMoods.join(', ')}], Personality: ${userBPersonality}
${ritualAnswersText}

Recent relationship history:
${historyContext}

Synthesize a single JSON object in ${isEn ? 'ENGLISH' : 'TURKISH'}. The object must contain exactly:
- "emotionalWeather": An atmospheric state choosing from: ${weatherOptions}.
- "relationshipEnergy": An atmospheric state choosing from: ${energyOptions}.
- "generatedText": A warm, gentle 2-sentence ${isEn ? 'English' : 'Turkish'} guidance text guiding how they can support each other today.

Respond ONLY with valid JSON.`;
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: systemPrompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const parsed = JSON.parse(completion.choices[0].message.content);
    const finalWeather = getWeatherPresentation(parsed.emotionalWeather, lang);
    const finalEnergy = getEnergyPresentation(parsed.relationshipEnergy, lang);

    // Save daily sync with language_code
    const insertRes = await db.query(
      `INSERT INTO relationship_daily_syncs 
       (connection_id, generated_text, emotional_weather, relationship_energy, emotional_aura, connection_state, relationship_rhythm, emotional_closeness, language_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (connection_id, synced_date, language_code) DO UPDATE SET
         generated_text = EXCLUDED.generated_text,
         emotional_weather = EXCLUDED.emotional_weather,
         relationship_energy = EXCLUDED.relationship_energy,
         emotional_aura = COALESCE(EXCLUDED.emotional_aura, relationship_daily_syncs.emotional_aura),
         connection_state = COALESCE(EXCLUDED.connection_state, relationship_daily_syncs.connection_state),
         relationship_rhythm = COALESCE(EXCLUDED.relationship_rhythm, relationship_daily_syncs.relationship_rhythm),
         emotional_closeness = COALESCE(EXCLUDED.emotional_closeness, relationship_daily_syncs.emotional_closeness)
       RETURNING *`,
      [
        connectionId, 
        parsed.generatedText, 
        finalWeather, 
        finalEnergy,
        parsed.emotionalAura || null,
        parsed.connectionState || null,
        parsed.relationshipRhythm || null,
        parsed.emotionalCloseness || null,
        lang
      ]
    );

    const savedRow = insertRes.rows[0];

    // Add event to timeline if weather changed
    const lastSync = await db.query(
      'SELECT emotional_weather FROM relationship_daily_syncs WHERE connection_id = $1 AND synced_date < CURRENT_DATE AND language_code = $2 ORDER BY synced_date DESC LIMIT 1',
      [connectionId, lang]
    );
    if (lastSync.rows.length === 0 || lastSync.rows[0].emotional_weather !== finalWeather) {
      const { trackEvent } = require('../services/eventEngine');
      trackEvent(userId, 'weather_change', 'minor', {
        weather: getWeatherPresentation(finalWeather, 'tr'),
        weatherEn: getWeatherPresentation(finalWeather, 'en')
      }, null, null, connectionId).catch(err =>
        console.error('[relationshipController] trackEvent weather_change error:', err.message)
      );
    }

    res.json({
      ...savedRow,
      emotional_weather: getWeatherPresentation(savedRow.emotional_weather, lang),
      relationship_energy: getEnergyPresentation(savedRow.relationship_energy, lang),
    });

  } catch (err) {
    console.error('[relationshipController] getDailySync error:', err);
    console.error('DAILY SYNC UNHANDLED ERROR:', err.message);
    res.status(500).json({ message: isEn ? 'Could not generate daily sync.' : 'Günlük uyum verisi oluşturulamadı.' });
  }
};

const RITUAL_PROMPTS_TR = [
  "Bugün partnerinizde/yakınınızda en çok takdir ettiğiniz küçük şey neydi?",
  "Son zamanlarda zihninizi en çok meşgul eden ve onunla paylaşmak istediğiniz konu nedir?",
  "Bugün kendinizi onun yanında tam anlamıyla duyulmuş ve anlaşılmış hissettiniz mi?",
  "İlişkinizde son günlerde size kendinizi en çok güvende ve huzurlu hissettiren an hangisiydi?",
  "Bugün birlikte geçirdiğiniz ya da paylaştığınız hangi an size tebessüm ettirdi?",
  "Ona karşı duyduğunuz ama sıklıkla dile getirmeyi unuttuğunuz bir teşekkürünüz var mı?",
  "Bugün birbirinizin duygusal alanına ne kadar saygı gösterebildiniz?"
];

const RITUAL_PROMPTS_EN = [
  "What was a small thing you appreciated most about your partner/companion today?",
  "What has been occupying your mind lately that you would like to share with them?",
  "Did you feel truly heard and understood in their presence today?",
  "Which recent moment in your connection made you feel safest and most at peace?",
  "Which moment you shared or experienced together today made you smile?",
  "Is there a word of gratitude you feel towards them that you often forget to speak aloud?",
  "How well were you able to honor each other's emotional space today?"
];

const RITUAL_PROMPTS = RITUAL_PROMPTS_TR;

/**
 * Get active rituals for a connection
 * GET /api/relationships/:id/rituals
 */
exports.getRituals = async (req, res) => {
  const connectionId = req.params.id;
  const userId = req.user.id;
  const lang = getLanguage(req);
  const isEn = lang === 'en';

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
      return res.status(404).json({ message: isEn ? 'Active connection not found.' : 'Aktif bağlantı bulunamadı.' });
    }

    const plan = await getUserPlan(userId);
    if (plan === 'free') {
      return res.status(402).json({ message: isEn ? 'Relationship rituals is a premium feature.' : 'İlişki ritüelleri premium bir özelliktir.', isPremiumLocked: true });
    }

    // Get today's ritual prompt
    const today = new Date().toISOString().split('T')[0];
    let ritual = await db.query(
      'SELECT * FROM relationship_rituals WHERE connection_id = $1 AND created_at::date = $2',
      [connectionId, today]
    );

    if (ritual.rows.length === 0) {
      const promptIndex = new Date().getDate() % RITUAL_PROMPTS_TR.length;
      const promptTr = RITUAL_PROMPTS_TR[promptIndex];
      const promptEn = RITUAL_PROMPTS_EN[promptIndex];
      const insert = await db.query(
        'INSERT INTO relationship_rituals (connection_id, prompt_tr, prompt_en) VALUES ($1, $2, $3) RETURNING *',
        [connectionId, promptTr, promptEn]
      );
      ritual = insert;
    }

    const ritualId = ritual.rows[0].id;
    const promptIdx = RITUAL_PROMPTS_TR.indexOf(ritual.rows[0].prompt_tr);
    const promptText = isEn 
      ? (ritual.rows[0].prompt_en || (promptIdx !== -1 ? RITUAL_PROMPTS_EN[promptIdx] : RITUAL_PROMPTS_EN[new Date().getDate() % RITUAL_PROMPTS_EN.length]))
      : ritual.rows[0].prompt_tr;

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
      partnerResponded: partnerResponseRes.rows.length > 0,
      relationshipReflection: isEn
        ? (ritual.rows[0].relationship_reflection_en || ritual.rows[0].relationship_reflection || null)
        : (ritual.rows[0].relationship_reflection || ritual.rows[0].relationship_reflection_en || null),
      emotionalClimate: isEn
        ? (ritual.rows[0].emotional_climate_en || ritual.rows[0].emotional_climate || null)
        : (ritual.rows[0].emotional_climate || ritual.rows[0].emotional_climate_en || null),
      gentleSuggestion: isEn
        ? (ritual.rows[0].gentle_suggestion_en || ritual.rows[0].gentle_suggestion || null)
        : (ritual.rows[0].gentle_suggestion || ritual.rows[0].gentle_suggestion_en || null)
    });

  } catch (err) {
    console.error('[relationshipController] getRituals error:', err);
    res.status(500).json({ message: isEn ? 'Could not load rituals.' : 'Ritüeller yüklenemedi.' });
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
  const lang = getLanguage(req);
  const isEn = lang === 'en';

  if (!responseText || responseText.trim() === '') {
    return res.status(400).json({ message: getLanguage(req) === 'en' ? 'The answer can\'t be empty.' : 'Cevap alanı boş olamaz.' });
  }

  try {
    // Verify user is in connection
    const checkRes = await db.query(
      'SELECT * FROM relationship_connections WHERE id = $1 AND status = \'active\' AND (requester_id = $2 OR recipient_id = $2)',
      [connectionId, userId]
    );

    if (checkRes.rows.length === 0) {
      return res.status(404).json({ message: getLanguage(req) === 'en' ? 'Active connection not found.' : 'Aktif bağlantı bulunamadı.' });
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
      'SELECT id, response_text, include_in_synthesis FROM relationship_ritual_responses WHERE ritual_id = $1 AND user_id = $2',
      [ritualId, partnerId]
    );

    if (partnerResp.rows.length > 0) {
      const { trackEvent } = require('../services/eventEngine');
      trackEvent(userId, 'ritual_done', 'minor', {}, null, null, connectionId).catch(err =>
        console.error('[relationshipController] trackEvent ritual_done error:', err.message)
      );

      // Check if both opted in for synthesis
      const currentInclude = includeInSynthesis ?? true;
      const partnerInclude = partnerResp.rows[0].include_in_synthesis;

      if (currentInclude && partnerInclude) {
        try {
          // Fetch ritual prompt
          const ritualRes = await db.query(
            'SELECT prompt_tr, prompt_en FROM relationship_rituals WHERE id = $1',
            [ritualId]
          );
          
          if (ritualRes.rows.length > 0) {
            const promptText = isEn 
              ? (ritualRes.rows[0].prompt_en || ritualRes.rows[0].prompt_tr) 
              : ritualRes.rows[0].prompt_tr;
            
            // Trigger AI synthesis reflection
            const reflection = await generateRitualReflection(
              promptText,
              responseText.trim(),
              partnerResp.rows[0].response_text,
              lang
            );

            if (reflection) {
              if (isEn) {
                await db.query(
                  `UPDATE relationship_rituals
                   SET relationship_reflection_en = $1,
                       emotional_climate_en = $2,
                       gentle_suggestion_en = $3
                   WHERE id = $4`,
                  [
                    reflection.relationship_reflection,
                    reflection.emotional_climate,
                    reflection.gentle_suggestion,
                    ritualId
                  ]
                );
              } else {
                await db.query(
                  `UPDATE relationship_rituals
                   SET relationship_reflection = $1,
                       emotional_climate = $2,
                       gentle_suggestion = $3
                   WHERE id = $4`,
                  [
                    reflection.relationship_reflection,
                    reflection.emotional_climate,
                    reflection.gentle_suggestion,
                    ritualId
                  ]
                );
              }

              // Check if Signature connection and AI detected a memory crystal
              const isSig = await isSignatureConnection(connectionId);
              if (isSig && reflection.is_memory_crystal) {
                await db.query(
                  `INSERT INTO couple_memories (connection_id, memory_type, summary, participants, emotional_weight, resolved, symbol)
                   VALUES ($1, 'crystal', $2, 'both', 4, false, $3)`,
                  [
                    connectionId,
                    reflection.crystal_summary || 'Duygusal Paylaşım Anı',
                    reflection.crystal_symbol || 'sparkles'
                  ]
                );
              }
            }
          }
        } catch (aiErr) {
          console.error('[relationshipController] ritual reflection generation failed:', aiErr);
        }
      }
    }

    res.json({
      message: getLanguage(req) === 'en' ? 'Your ritual answer has been saved.' : 'Ritüel cevabınız kaydedildi.',
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

    const lang = getLanguage(req);
    const isEn = lang === 'en';

    if (checkRes.rows.length === 0) {
      return res.status(404).json({ message: isEn ? 'Active connection not found.' : 'Aktif bağlantı bulunamadı.' });
    }

    const plan = await getUserPlan(userId);

    if (plan === 'free') {
      return res.status(402).json({
        message: isEn ? 'The relationship time tunnel is a premium feature.' : 'İlişki zaman tüneli premium bir özelliktir.',
        isPremiumLocked: true
      });
    }

    // 2. Fetch timeline
    const result = await db.query(
      'SELECT * FROM relationship_timeline WHERE connection_id = $1 ORDER BY created_at DESC LIMIT 50',
      [connectionId]
    );

    const rows = result.rows.map(row => {
      if (!isEn) return row;
      let title = row.title_en || row.title_tr;
      let desc = row.description_en || row.description_tr;
      if (!row.title_en) {
        if (row.event_type === 'created' || row.event_type === 'CONNECTION_CREATED') {
          title = 'First Connection Established 🌿';
          desc = (desc || '')
            .replace('Selfplace üzerinde bağ kurdu.', 'connected on Selfplace.')
            .replace('Selfplace üzerinde bir araya geldi.', 'connected on Selfplace.')
            .replace(' ve ', ' and ');
        } else if (row.event_type === 'weather_change') {
        title = 'Emotional Weather Changed 🌤️';
        desc = (desc || '')
          .replace('Yeni atmosfer:', 'New atmosphere:')
          .replace('Hafif Yoğun', 'Mildly Intense')
          .replace('Durgun', 'Calm')
          .replace('Hassas', 'Sensitive')
          .replace('Güneşli', 'Sunny')
          .replace('Bulutlu', 'Cloudy')
          .replace('Yumuşak', 'Gentle');
      } else if (row.event_type === 'ritual_done') {
        title = 'Shared Ritual Completed ✨';
        desc = (desc || '').replace('Bugünün ritüelinde derinleşildi:', "Deepened in today's ritual:");
      } else if (row.event_type === 'garden_level_up') {
        title = 'Relationship Garden Leveled Up 🌱';
        desc = (desc || '')
          .replace('Bahçeniz Seviye', 'Your garden reached Level')
          .replace('oldu. Tebrikler!', 'congratulations!')
          .replace('İlişki bahçeniz büyüme göstererek Seviye', 'Your relationship garden grew to Level')
          .replace('oldu! Ortak çabalarınız meyvelerini veriyor.', '! Your shared efforts are bearing fruit.');
      } else if (row.event_type === 'level_up') {
        title = 'Relationship Level Milestone 🎉';
        desc = 'Your connection has reached a new depth.';
      } else if (row.event_type === 'CHECKIN_COMPLETED') {
        title = 'Emotion Shared 💭';
        desc = (desc || '').replace('günlük duygu durumunu paylaştı.', 'shared their daily emotional check-in.');
      } else if (row.event_type === 'PERSONALITY_COMPLETED') {
        title = 'Personality Test Completed 🧩';
        desc = (desc || '').replace('içsel kimlik arketipi testini tamamladı.', 'completed the inner identity archetype test.');
      } else if (row.event_type === 'JOURNAL_SHARED') {
        title = 'Journal Shared 📖';
        desc = (desc || '').replace('hislerini günlüğe yazarak paylaştı.', 'shared their feelings in a journal entry.');
      } else if (row.event_type === 'INVITATION_ACCEPTED') {
        title = 'Invitation Card Accepted 💌';
        desc = (desc || '').replace('dünkü davet kartı sorusunu yanıtlayarak tamamladı.', 'answered and completed the invitation card.');
      } else if (row.event_type === 'WEEKLY_INSIGHT_GENERATED') {
        title = 'Weekly Insight Ready ✨';
        desc = "This week's emotional synthesis for your relationship has been generated.";
      } else if (row.event_type === 'GOAL_COMPLETED') {
        title = 'Shared Goal Completed 🎉';
        desc = 'A shared goal has been successfully completed.';
      } else if (row.event_type === 'MOOD_IMPROVED') {
        title = 'Atmosphere Clearing ☀️';
        desc = 'The energy and closeness in the relationship atmosphere are rising.';
      } else if (row.event_type === 'MOOD_DECLINED') {
        title = 'Atmosphere Shifting ☁️';
        desc = 'A brief quiet or wave of tension is felt in the relationship atmosphere.';
      }
      }

      // Safety net: ensure no Turkish text leaks in English mode
      if (/[\u00c7\u00e7\u011e\u011f\u0130\u0131\u00d6\u00f6\u015e\u015f\u00dc\u00fc]/.test(title || '')) {
        title = 'Relationship Milestone ✨';
      }
      if (/[\u00c7\u00e7\u011e\u011f\u0130\u0131\u00d6\u00f6\u015e\u015f\u00dc\u00fc]/.test(desc || '')) {
        desc = 'A meaningful moment was shared in your relationship journey.';
      }

      return {
        ...row,
        title_tr: title,
        description_tr: desc,
        title,
        description: desc
      };
    });

    res.json(rows);

  } catch (err) {
    console.error('[relationshipController] getTimeline error:', err);
    const lang = getLanguage(req);
    res.status(500).json({ message: lang === 'en' ? 'Could not load time tunnel.' : 'Zaman tüneli yüklenemedi.' });
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

    const lang = getLanguage(req);
    const isEn = lang === 'en';

    if (checkRes.rows.length === 0) {
      return res.status(404).json({ message: isEn ? 'Active connection not found.' : 'Aktif bağlantı bulunamadı.' });
    }

    const plan = await getUserPlan(userId);
    if (plan === 'free') {
      return res.status(402).json({ message: isEn ? 'Harmony Whispers is a premium feature.' : 'Uyum Fısıltıları premium bir özelliktir.', isPremiumLocked: true });
    }

    // 2. Fetch or generate the insights
    const insights = await getInsightFeed(connectionId);
    res.json(insights);

  } catch (err) {
    console.error('[relationshipController] getInsightFeed error:', err);
    const lang = getLanguage(req);
    res.status(500).json({ message: lang === 'en' ? 'Could not load harmony whispers.' : 'Uyum fısıltıları yüklenemedi.' });
  }
};

/**
 * Get Memory Crystals (Anı Kristalleri)
 * GET /api/relationships/:id/crystals
 */
exports.getCrystals = async (req, res) => {
  const connectionId = req.params.id;
  const userId = req.user.id;

  try {
    // 1. Verify active connection
    const checkRes = await db.query(
      'SELECT status FROM relationship_connections WHERE id = $1 AND status = \'active\' AND (requester_id = $2 OR recipient_id = $2)',
      [connectionId, userId]
    );

    const lang = getLanguage(req);
    const isEn = lang === 'en';

    if (checkRes.rows.length === 0) {
      return res.status(404).json({ message: isEn ? 'Active connection not found.' : 'Aktif bağlantı bulunamadı.' });
    }

    // 2. Check Signature tier
    const isSig = await isSignatureConnection(connectionId);
    if (!isSig) {
      return res.status(402).json({ message: isEn ? 'Memory Crystals is exclusive to Signature level.' : 'Anı Kristalleri Signature seviyesine özel bir özelliktir.', isPremiumLocked: true });
    }

    // 3. Fetch crystals
    const result = await db.query(
      `SELECT id, summary, created_at, symbol FROM couple_memories 
       WHERE connection_id = $1 AND memory_type = 'crystal' 
       ORDER BY created_at DESC`,
      [connectionId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('[relationshipController] getCrystals error:', err);
    const lang = getLanguage(req);
    res.status(500).json({ message: lang === 'en' ? 'Could not load memory crystals.' : 'Anı kristalleri yüklenemedi.' });
  }
};

/**
 * Get Relationship Garden state
 * GET /api/relationships/:id/garden
 */
exports.getGardenState = async (req, res) => {
  const connectionId = req.params.id;
  const userId = req.user.id;
  const lang = getLanguage(req);
  const isEn = lang === 'en';

  try {
    // 1. Verify active connection
    const checkRes = await db.query(
      'SELECT status FROM relationship_connections WHERE id = $1 AND status = \'active\' AND (requester_id = $2 OR recipient_id = $2)',
      [connectionId, userId]
    );

    if (checkRes.rows.length === 0) {
      return res.status(404).json({ message: isEn ? 'Active connection not found.' : 'Aktif bağlantı bulunamadı.' });
    }

    // 2. Check Signature tier
    const isSig = await isSignatureConnection(connectionId);
    if (!isSig) {
      return res.status(402).json({ message: isEn ? 'Relationship Garden is exclusive to Signature level.' : 'İlişki Bahçesi Signature seviyesine özel bir özelliktir.', isPremiumLocked: true });
    }

    // 3. Query metrics
    const ritualsCountRes = await db.query(
      `SELECT COUNT(*) FROM relationship_ritual_responses rrr
       JOIN relationship_rituals rr ON rrr.ritual_id = rr.id
       WHERE rr.connection_id = $1`,
      [connectionId]
    );
    const totalRituals = parseInt(ritualsCountRes.rows[0].count, 10);

    const crystalsCountRes = await db.query(
      "SELECT COUNT(*) FROM couple_memories WHERE connection_id = $1 AND memory_type = 'crystal'",
      [connectionId]
    );
    const totalCrystals = parseInt(crystalsCountRes.rows[0].count, 10);

    const recentRes = await db.query(
      `SELECT COUNT(DISTINCT rrr.ritual_id) FROM relationship_ritual_responses rrr
       JOIN relationship_rituals rr ON rrr.ritual_id = rr.id
       WHERE rr.connection_id = $1 AND rrr.created_at > NOW() - INTERVAL '14 days'`,
      [connectionId]
    );
    const recentRitualsCount = parseInt(recentRes.rows[0].count, 10);

    // Calculate state
    let gardenState = 'peaceful_garden';
    if (recentRitualsCount >= 8) {
      gardenState = 'spring_bloom';
    } else if (recentRitualsCount >= 4) {
      gardenState = 'peaceful_garden';
    } else if (recentRitualsCount >= 1) {
      gardenState = 'warm_sunset';
    } else {
      gardenState = 'silent_winter';
    }

    // Adjust based on weather
    const latestSyncRes = await db.query(
      'SELECT emotional_weather FROM relationship_daily_syncs WHERE connection_id = $1 ORDER BY synced_date DESC LIMIT 1',
      [connectionId]
    );
    if (latestSyncRes.rows.length > 0) {
      const weather = latestSyncRes.rows[0].emotional_weather;
      if (weather === 'Hassas' || weather === 'Hafif Yoğun') {
        gardenState = 'rainy_reflection';
      } else if (weather === 'Yenileyici' || weather === 'Derin') {
        gardenState = 'healing_rain';
      }
    }

    // Load previous garden state to enforce inertia and monotonic growth
    const prevGardenRes = await db.query(
      'SELECT garden_state, growth_level FROM relationship_garden WHERE connection_id = $1',
      [connectionId]
    );
    
    const GARDEN_STATES = [
      'silent_winter',
      'rainy_reflection',
      'healing_rain',
      'warm_sunset',
      'peaceful_garden',
      'spring_bloom'
    ];

    let finalGardenState = gardenState;
    let prevGrowth = 1;

    if (prevGardenRes.rows.length > 0) {
      const prevState = prevGardenRes.rows[0].garden_state;
      prevGrowth = prevGardenRes.rows[0].growth_level || 1;
      
      const prevIdx = GARDEN_STATES.indexOf(prevState);
      const targetIdx = GARDEN_STATES.indexOf(gardenState);
      
      if (prevIdx !== -1 && targetIdx !== -1) {
        const diff = targetIdx - prevIdx;
        if (diff > 1) {
          finalGardenState = GARDEN_STATES[prevIdx + 1];
        } else if (diff < -1) {
          finalGardenState = GARDEN_STATES[prevIdx - 1];
        }
      }
    }

    // Growth level is calculated but cannot drop (monotonic)
    const calculatedGrowth = Math.max(1, Math.floor(totalRituals / 2) + totalCrystals * 3);
    const growthLevel = Math.max(prevGrowth, calculatedGrowth);

    if (growthLevel > prevGrowth) {
      // Check if this connection has already logged a level up for this level to prevent duplicate triggers
      const dupCheck = await db.query(
        `SELECT id FROM relationship_timeline 
         WHERE connection_id = $1 AND event_type = 'garden_level_up' AND description_tr LIKE $2`,
        [connectionId, `%Seviye ${growthLevel}%`]
      );
      if (dupCheck.rows.length === 0) {
        await db.query(
          `INSERT INTO relationship_timeline (connection_id, event_type, title_tr, description_tr, title_en, description_en)
           VALUES ($1, 'garden_level_up', 'Bahçe Seviyesi Yükseldi 🌱', $2, 'Relationship Garden Leveled Up 🌱', $3)`,
          [
            connectionId, 
            `İlişki bahçeniz büyüme göstererek Seviye ${growthLevel} oldu! Ortak çabalarınız meyvelerini veriyor.`,
            `Your relationship garden grew to Level ${growthLevel}! Your shared efforts are bearing fruit.`
          ]
        );
      }
    }

    const flowersCount = Math.min(20, Math.floor(totalRituals / 2));
    const treeHeight = Math.min(100, 10 + Math.floor(totalRituals / 3) * 15);
    const starsUnlocked = totalCrystals;

    // Save state
    await db.query(
      `INSERT INTO relationship_garden (connection_id, garden_state, growth_level)
       VALUES ($1, $2, $3)
       ON CONFLICT (connection_id) 
       DO UPDATE SET garden_state = EXCLUDED.garden_state, growth_level = EXCLUDED.growth_level, updated_at = NOW()`,
      [connectionId, finalGardenState, growthLevel]
    );

    res.json({
      connectionId,
      gardenState: finalGardenState,
      growthLevel,
      flowersCount,
      treeHeight,
      starsUnlocked,
      totalRituals,
      totalCrystals
    });
  } catch (err) {
    console.error('[relationshipController] getGardenState error:', err);
    const lang = getLanguage(req);
    res.status(500).json({ message: lang === 'en' ? 'Could not load relationship garden.' : 'İlişki bahçesi yüklenemedi.' });
  }
};
