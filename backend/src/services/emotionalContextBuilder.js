const db = require('../config/db');
const OpenAI = require('openai');
const { buildCoupleMemoryDossier, getIndividualBehavioralDossier } = require('./coupleMemoryService');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Resolves a user's subscription plan level
 */
async function getUserPlan(userId) {
  const result = await db.query('SELECT plan_type FROM subscription_status WHERE user_id = $1', [userId]);
  if (result.rows.length === 0) return 'free';
  return result.rows[0].plan_type || 'free';
}

/**
 * Dynamically calculates the user's Emotional Depth Level based on system-wide interaction points
 */
exports.calculateDepthLevel = async (userId) => {
  try {
    const plan = await getUserPlan(userId);

    const countsRes = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM check_ins WHERE user_id = $1) as checkins_count,
        (SELECT COUNT(*) FROM journal_entries WHERE user_id = $1) as journals_count,
        (SELECT COUNT(*) FROM card_responses WHERE user_id = $1) as cards_count,
        (SELECT COUNT(*) FROM daily_reflections WHERE user_id = $1) as reflections_count,
        (SELECT COUNT(*) FROM ai_messages m JOIN ai_conversations c ON m.conversation_id = c.id WHERE c.user_id = $1) as ai_messages_count,
        (SELECT COUNT(*) FROM relationship_ritual_responses WHERE user_id = $1) as rituals_count,
        (SELECT COUNT(DISTINCT DATE(created_at)) FROM check_ins WHERE user_id = $1) as checkin_days,
        (SELECT COUNT(DISTINCT DATE(created_at)) FROM journal_entries WHERE user_id = $1) as journal_days,
        (SELECT COUNT(*) FROM emotional_memories WHERE user_id = $1 AND category = 'continuity') as continuity_count,
        (SELECT EXTRACT(DAY FROM NOW() - created_at) FROM relationship_connections WHERE (requester_id = $1 OR recipient_id = $1) AND status = 'active' LIMIT 1) as connection_days
    `, [userId]);

    const counts = countsRes.rows[0] || {};
    const checkins_count = parseInt(counts.checkins_count || 0, 10);
    const journals_count = parseInt(counts.journals_count || 0, 10);
    const cards_count = parseInt(counts.cards_count || 0, 10);
    const reflections_count = parseInt(counts.reflections_count || 0, 10);
    const ai_messages_count = parseInt(counts.ai_messages_count || 0, 10);
    const rituals_count = parseInt(counts.rituals_count || 0, 10);
    const checkin_days = parseInt(counts.checkin_days || 0, 10);
    const journal_days = parseInt(counts.journal_days || 0, 10);
    const continuity_count = parseInt(counts.continuity_count || 0, 10);
    const connection_days = parseInt(counts.connection_days || 0, 10);

    // 1. Total Raw Interactions Count
    const total = checkins_count + journals_count + cards_count + reflections_count + ai_messages_count + rituals_count;

    // 2. Base Interaction Score (weighted by emotional depth required)
    const baseScore = (checkins_count * 1) + 
                      (journals_count * 2) + 
                      (cards_count * 1.5) + 
                      (reflections_count * 1) + 
                      (ai_messages_count * 0.5) + 
                      (rituals_count * 2);

    // 3. Consistency Score (weighting unique days of check-ins and journaling)
    const consistencyScore = (checkin_days * 3) + (journal_days * 5);

    // 4. Emotional Continuity Memory Boost (number of parsed and saved continuity traits)
    const continuityScore = continuity_count * 4;

    // 5. Relationship Continuity (active connection days bonus)
    const relationshipScore = connection_days ? Math.min(20, connection_days * 1.5) : 0;

    // 6. Premium Tier Acceleration (Signature & Plus users evolve naturally faster)
    let planBoost = 0;
    if (plan === 'plus') {
      planBoost = 15;
    } else if (plan === 'signature') {
      planBoost = 35;
    }

    // Combine all behaviors into a final evolution score
    const evolutionScore = baseScore + consistencyScore + continuityScore + relationshipScore + planBoost;

    let level = 'NEW';
    if (evolutionScore >= 10 && evolutionScore < 30) level = 'LIGHT';
    else if (evolutionScore >= 30 && evolutionScore < 75) level = 'GROWING';
    else if (evolutionScore >= 75 && evolutionScore < 150) level = 'DEEP';
    else if (evolutionScore >= 150) level = 'IMMERSIVE';

    console.log(`[SmartProgression] User: ${userId}, Total: ${total}, Score: ${evolutionScore}, Plan: ${plan}, Level: ${level}`);

    return { level, total, evolutionScore };
  } catch (err) {
    console.error('[calculateDepthLevel] error:', err.message);
    return { level: 'NEW', total: 0, evolutionScore: 0 };
  }
};

/**
 * Builds a dynamic, privacy-aware emotional context dossier for a user.
 * 
 * Context Priority Order:
 * 1. Current conversation flow (handled in controller)
 * 2. Recent user emotional state (moods, journals, cards)
 * 3. Relationship context (existence, type, weather, energy)
 * 4. Personality patterns (DISC, zodiac)
 * 5. Long-term emotional rhythm & memory patterns (Signature tier)
 */
exports.buildEmotionalContext = async (userId) => {
  try {
    const plan = await getUserPlan(userId);
    const isFree = plan === 'free';
    const isPlus = plan === 'plus';
    const isSignature = plan === 'signature';

    const { level: emotionalDepthLevel, total: totalInteractions } = await exports.calculateDepthLevel(userId);

    // 1. Resolve User Base Details (Astrology/Zodiac)
    const userRes = await db.query('SELECT username, zodiac_sign FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      return { dossier: '', isDistressed: false, hasPartner: false, planType: 'free', emotionalDepthLevel: 'NEW', totalInteractions: 0 };
    }
    const user = userRes.rows[0];

    // 2. Fetch User Emotional State based on subscription tier limits
    let checkIns = [];
    let journals = [];
    let cards = [];
    let generalMemories = [];
    let continuityMemories = [];
    let journeyTest = null;

    if (isFree) {
      // Free Tier: basic check-ins (only moods, no notes to keep context lightweight)
      const checkInsRes = await db.query(
        'SELECT mood, created_at FROM check_ins WHERE user_id = $1 ORDER BY created_at DESC LIMIT 3', 
        [userId]
      );
      checkIns = checkInsRes.rows;
    } else if (isPlus) {
      // Plus Tier: basic moods + notes, reflections, card responses
      const [checkInsRes, journalRes, cardsRes, colorRes, memoriesRes] = await Promise.all([
        db.query('SELECT mood, note, created_at FROM check_ins WHERE user_id = $1 ORDER BY created_at DESC LIMIT 3', [userId]),
        db.query('SELECT text, created_at FROM daily_reflections WHERE user_id = $1 ORDER BY created_at DESC LIMIT 2', [userId]),
        db.query('SELECT response, category, created_at FROM card_responses WHERE user_id = $1 ORDER BY created_at DESC LIMIT 2', [userId]),
        db.query("SELECT result_data FROM personality_results WHERE user_id = $1 AND test_type = 'journey' ORDER BY created_at DESC LIMIT 1", [userId]),
        db.query('SELECT memory_key, memory_value FROM emotional_memories WHERE user_id = $1', [userId])
      ]);

      checkIns = checkInsRes.rows;
      journals = journalRes.rows;
      cards = cardsRes.rows;
      journeyTest = colorRes.rows[0]?.result_data || null;

      // Only allow basic continuity keys for Plus
      const allowedPlusKeys = ['recent_emotional_tone', 'recurring_concerns', 'comforting_subjects'];
      const rawMemories = memoriesRes.rows;
      continuityMemories = rawMemories.filter(m => allowedPlusKeys.includes(m.memory_key));
      generalMemories = rawMemories.filter(m => !allowedPlusKeys.includes(m.memory_key) && m.category !== 'continuity');
    } else {
      // Signature Tier: Full details
      const [checkInsRes, journalRes, cardsRes, colorRes, memoriesRes] = await Promise.all([
        db.query('SELECT mood, note, created_at FROM check_ins WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5', [userId]),
        db.query('SELECT text, created_at FROM daily_reflections WHERE user_id = $1 ORDER BY created_at DESC LIMIT 3', [userId]),
        db.query('SELECT response, category, created_at FROM card_responses WHERE user_id = $1 ORDER BY created_at DESC LIMIT 3', [userId]),
        db.query("SELECT result_data FROM personality_results WHERE user_id = $1 AND test_type = 'journey' ORDER BY created_at DESC LIMIT 1", [userId]),
        db.query('SELECT memory_key, memory_value FROM emotional_memories WHERE user_id = $1', [userId])
      ]);

      checkIns = checkInsRes.rows;
      journals = journalRes.rows;
      cards = cardsRes.rows;
      journeyTest = colorRes.rows[0]?.result_data || null;

      const rawMemories = memoriesRes.rows;
      const continuityKeys = ['recent_emotional_tone', 'recurring_concerns', 'relationship_tension_patterns', 'comforting_subjects', 'emotional_habits'];
      continuityMemories = rawMemories.filter(m => continuityKeys.includes(m.memory_key));
      generalMemories = rawMemories.filter(m => !continuityKeys.includes(m.memory_key));
    }

    // Determine distress level from user's latest mood entry
    let isDistressed = false;
    if (checkIns.length > 0) {
      const latestMood = checkIns[0].mood.toLowerCase();
      const distressKeywords = ['stres', 'tüken', 'kaygı', 'üzgün', 'yalnız', 'kork', 'bık', 'yorgun'];
      isDistressed = distressKeywords.some(keyword => latestMood.includes(keyword));
    }

    // 3. Detect Active Relationship Connection
    const connRes = await db.query(
      `SELECT c.id, c.requester_id, c.recipient_id, c.connection_type, c.created_at,
              c.requester_alias, c.recipient_alias,
              u1.username as req_username, u1.zodiac_sign as req_zodiac,
              u2.username as rec_username, u2.zodiac_sign as rec_zodiac
       FROM relationship_connections c
       JOIN users u1 ON c.requester_id = u1.id
       JOIN users u2 ON c.recipient_id = u2.id
       WHERE (c.requester_id = $1 OR c.recipient_id = $1) AND c.status = 'active'
       LIMIT 1`,
      [userId]
    );

    let hasPartner = false;
    let relationshipDossier = '';
    let partnerId = null;

    if (connRes.rows.length > 0) {
      hasPartner = true;
      const conn = connRes.rows[0];
      const isRequester = conn.requester_id === userId;
      partnerId = isRequester ? conn.recipient_id : conn.requester_id;

      const partnerUsername = isRequester ? conn.rec_username : conn.req_username;
      const partnerZodiac = isRequester ? conn.rec_zodiac : conn.req_zodiac;
      const myAlias = isRequester ? conn.requester_alias : conn.recipient_alias;
      const partnerAlias = isRequester ? conn.recipient_alias : conn.requester_alias;
      const partnerName = partnerAlias || partnerUsername;

      // Calculate relationship duration
      const durationMs = Date.now() - new Date(conn.created_at).getTime();
      const durationDays = Math.max(1, Math.floor(durationMs / (1000 * 60 * 60 * 24)));

      relationshipDossier = `[ORTAKLIK & İLİŞKİ DETAYLARI]
- Ortaklık Aktif (Bağlantı Türü: ${conn.connection_type})
- Partner Nickname/Adı: ${partnerName}
- Beraberlik Süresi: ${durationDays} gündür bağlısınız.
`;

      if (!isFree) {
        // Fetch today's relationship atmosphere (daily sync)
        const dailySyncRes = await db.query(
          `SELECT emotional_weather, relationship_energy, generated_text
           FROM relationship_daily_syncs
           WHERE connection_id = $1 AND synced_date = CURRENT_DATE
           LIMIT 1`,
          [conn.id]
        );
        const sync = dailySyncRes.rows[0] || null;

        if (sync) {
          relationshipDossier += `- Günlük İlişki Atmosferi (Hava Durumu): ${sync.emotional_weather}\n`;
          relationshipDossier += `- Günlük İlişki Enerjisi: ${sync.relationship_energy}\n`;
          relationshipDossier += `- Günlük Uyum Sentezi: "${sync.generated_text}"\n`;
        }

        // Fetch partner's privacy boundaries
        const privacyRes = await db.query(
          'SELECT * FROM relationship_privacy_settings WHERE connection_id = $1',
          [conn.id]
        );
        const partnerPrivacy = privacyRes.rows.find(r => r.user_id === partnerId) || {
          exclude_checkins: false, exclude_journals: false, exclude_cards: false, exclude_ai_chat: false, exclude_personality: false
        };

        // Gather Partner context based on tier
        let partnerDetails = ``;
        if (!partnerPrivacy.exclude_personality) {
          partnerDetails += `Zodiac Sign: ${partnerZodiac || 'Bilinmiyor'}. `;
          if (isSignature) {
            const partnerColorRes = await db.query(
              "SELECT result_data FROM personality_results WHERE user_id = $1 AND test_type = 'color' ORDER BY created_at DESC LIMIT 1",
              [partnerId]
            );
            if (partnerColorRes.rows.length > 0) {
              const p = partnerColorRes.rows[0].result_data;
              partnerDetails += `DISC Kişilik Rengi: Dominant ${p.dominantColor} (${p.title}). `;
            }
          }
        }

        if (!partnerPrivacy.exclude_checkins) {
          const partnerCheckinsRes = await db.query(
            'SELECT mood FROM check_ins WHERE user_id = $1 ORDER BY created_at DESC LIMIT 3',
            [partnerId]
          );
          if (partnerCheckinsRes.rows.length > 0) {
            partnerDetails += `Son Duygu Durumları (Genel): ${partnerCheckinsRes.rows.map(r => r.mood).join(', ')}. `;
          }
        }

        if (isSignature && !partnerPrivacy.exclude_cards) {
          const partnerCardsRes = await db.query(
            'SELECT response, category FROM card_responses WHERE user_id = $1 ORDER BY created_at DESC LIMIT 2',
            [partnerId]
          );
          if (partnerCardsRes.rows.length > 0) {
            partnerDetails += `Son Eylemleri: ${partnerCardsRes.rows.map(r => `[${r.category}] ${r.response}`).join(' | ')}. `;
          }
        }

        if (partnerDetails) {
          relationshipDossier += `- Partnerin Genel Ritim Özeti (Gizlilik Sınırları Korunarak Sentezlendi): ${partnerDetails}\n`;
        }
      }
    }

    // 5. Compose the dynamic system prompt segment
    let dossier = `[KULLANICI DUYGUSAL PORTRESİ & AKILLI BAĞLAM]\n`;
    dossier += `Zodiac Sign: ${user.zodiac_sign || 'Bilinmiyor'}\n`;
    dossier += `Mevcut Abonelik Planı: ${plan.toUpperCase()}\n`;
    dossier += `Duygusal Olgunluk Seviyesi: ${emotionalDepthLevel} (${totalInteractions} toplam etkileşim)\n`;

    if (journeyTest) {
      dossier += `\n[KİŞİLİK EĞİLİMLERİ]\n`;
      dossier += `- Arketip: ${journeyTest.archetype_name} (${journeyTest.baseArchetype})\n`;
      
      const s = journeyTest.scores || {};
      if (s.emotional_expression < 0) dossier += `- Duygularını önce kendi içinde işlemeye eğilimli\n`;
      else if (s.emotional_expression > 0) dossier += `- Duygularını açıkça ve hemen dışa vurmaya yatkın\n`;
      
      if (s.conflict_style < 0) dossier += `- Gerilim ve çatışma anlarında geri çekilmeye/sessizleşmeye yatkın\n`;
      else if (s.conflict_style > 0) dossier += `- Çatışmaları anında çözmeye ve yüzleşmeye yatkın\n`;

      if (s.attachment > 0) dossier += `- İlişkilerde güvence ve duygusal netlik arayışı yüksek\n`;
      else if (s.attachment < 0) dossier += `- Kendi alanına ve bağımsızlığına oldukça düşkün\n`;

      if (s.energy_rhythm < 0) dossier += `- Sakin ve öngörülebilir bir hayat ritmini tercih ediyor\n`;
      else if (s.energy_rhythm > 0) dossier += `- Yoğun, dinamik ve coşkulu bir ritme sahip\n`;
    }

    if (checkIns.length > 0) {
      dossier += `\nSon Duygu Check-in Raporu:\n` + checkIns.map(c => `- ${new Date(c.created_at).toLocaleDateString('tr-TR')}: ${c.mood} ${c.note ? `("${c.note}")` : ''}`).join('\n');
    }

    if (journals.length > 0) {
      dossier += `\n\nSon Günlük Yansımaları (Özel Temalar):\n` + journals.map(j => `- "${j.text}"`).join('\n');
    }

    if (cards.length > 0) {
      dossier += `\n\nSon Ruhsal Eylem Seçimleri:\n` + cards.map(c => `- [${c.category}] -> "${c.response}"`).join('\n');
    }

    // Memory segment
    if (generalMemories.length > 0) {
      dossier += `\n\nZihinsel Bellek Kodları (Çıkarılan Anılar): ${generalMemories.map(m => `${m.memory_key}: ${m.memory_value}`).join(' | ')}`;
    }

    // Alignment of continuity memories
    if (continuityMemories.length > 0) {
      dossier += `\n\n[SÜREKLİ DUYGUSAL RİTİM & ALIŞKANLIKLAR (Continuous Memory)]\n`;
      continuityMemories.forEach(m => {
        const label = m.memory_key === 'recent_emotional_tone' ? 'Son Duygusal Ton' :
                      m.memory_key === 'recurring_concerns' ? 'Tekrarlayan Kaygılar/Konular' :
                      m.memory_key === 'relationship_tension_patterns' ? 'İlişkisel Tetikleyiciler' :
                      m.memory_key === 'comforting_subjects' ? 'Rahatlatıcı Unsurlar' : 'Duygusal Alışkanlıklar';
        dossier += `- ${label}: ${m.memory_value}\n`;
      });
    }

    // ── Individual Behavioral Memory (new layer) ──────────────────────────
    const behavioralDossier = await getIndividualBehavioralDossier(userId);
    if (behavioralDossier) {
      dossier += `\n\n${behavioralDossier}`;
    }

    // Extra dynamic summary for Signature plan
    if (isSignature) {
      dossier += `\n\n[SIGNATURE DEEP EMOTIONAL MEMORY]\n`;
      dossier += `- Uzun vadeli duygusal ritim analizi: Bu kullanıcı son dönemlerde duygusal derinliğini koruma eğiliminde. Bellekteki ilişkisel hassasiyetleri yüksek.\n`;
      if (hasPartner) {
        dossier += `- Derin Empati Bağlantısı: Partner ile kurulan bağın uzun dönemli süreklilik desenleri ve empati alışverişleri hafızada saklanıyor. Partnerin sessiz kaldığı durumlarda sakin ve kucaklayıcı yaklaşım sergilenmeli.\n`;
      }
    }

    if (relationshipDossier) {
      dossier += `\n${relationshipDossier}`;
    } else {
      dossier += `\n[YALNIZ KULLANICI MODU]\n- Bu kullanıcı şu an tek başına yol alıyor. İlişkisel tavsiyeler vermek yerine, kendisiyle kurduğu bağa odaklan, onu yalnız hissettirmeyen sıcak bir duygusal yoldaş ol.\n`;
    }

    // ── Shared Couple Memory (new layer — only when partner exists) ───────
    if (hasPartner && partnerId) {
      const coupleDossier = await buildCoupleMemoryDossier(connRes.rows[0].id);
      if (coupleDossier) {
        dossier += `\n\n${coupleDossier}`;
      }
    }

    // Resolve connectionId to pass to continuity engine
    const connectionId = (hasPartner && connRes.rows.length > 0) ? connRes.rows[0].id : null;

    // Resolve partner role (partner_a = requester, partner_b = recipient)
    let userRole = 'both';
    if (hasPartner && connRes.rows.length > 0) {
      userRole = connRes.rows[0].requester_id === userId ? 'partner_a' : 'partner_b';
    }

    const resultContext = {
      dossier,
      isDistressed,
      hasPartner,
      planType: plan,
      emotionalDepthLevel,
      totalInteractions,
      connectionId,
      userRole,
      partnerId,
    };
    
    console.log('[DEBUG] buildEmotionalContext output:', {
      isDistressed,
      hasPartner,
      planType: plan,
      dossierLength: dossier.length
    });

    return resultContext;

  } catch (error) {
    console.error('[emotionalContextBuilder] Error building context:', error);
    return { dossier: '', isDistressed: false, hasPartner: false };
  }
};

/**
 * Generates/Retrieves 3 lightweight relationship insights (whispers)
 * based on allowed database context.
 */
exports.getInsightFeed = async (connectionId) => {
  try {
    // 1. Verify connection and get today's record
    const todaySync = await db.query(
      'SELECT id, insight_feed, generated_text, emotional_weather, relationship_energy FROM relationship_daily_syncs WHERE connection_id = $1 AND synced_date = CURRENT_DATE',
      [connectionId]
    );

    if (todaySync.rows.length > 0 && todaySync.rows[0].insight_feed && todaySync.rows[0].insight_feed.length > 0) {
      return todaySync.rows[0].insight_feed;
    }

    // 2. No cached insight feed found. Retrieve privacy configuration and context for connection
    const connRes = await db.query('SELECT * FROM relationship_connections WHERE id = $1', [connectionId]);
    if (connRes.rows.length === 0) return [];
    const conn = connRes.rows[0];

    const privacyRes = await db.query('SELECT * FROM relationship_privacy_settings WHERE connection_id = $1', [connectionId]);
    
    // Default to strict if settings missing
    const myPrivacy = privacyRes.rows.find(r => r.user_id === conn.requester_id) || {};
    const partnerPrivacy = privacyRes.rows.find(r => r.user_id === conn.recipient_id) || {};

    let userAMoods = [];
    if (!myPrivacy.exclude_checkins) {
      const moods = await db.query('SELECT mood FROM check_ins WHERE user_id = $1 ORDER BY created_at DESC LIMIT 3', [conn.requester_id]);
      userAMoods = moods.rows.map(r => r.mood);
    }
    let userBMoods = [];
    if (!partnerPrivacy.exclude_checkins) {
      const moods = await db.query('SELECT mood FROM check_ins WHERE user_id = $1 ORDER BY created_at DESC LIMIT 3', [conn.recipient_id]);
      userBMoods = moods.rows.map(r => r.mood);
    }

    const weather = todaySync.rows[0]?.emotional_weather || 'Yumuşak';
    const energy = todaySync.rows[0]?.relationship_energy || 'Dengeli';
    const guideText = todaySync.rows[0]?.generated_text || '';

    // 3. Query OpenAI to synthesize exactly 3 short whispers
    const systemPrompt = `You are "Selfplace", a highly supportive relational empathy guide.
Based on the following relational details (no raw data or journals are exposed):
Relationship Type: ${conn.connection_type}
Atmospheric Weather: ${weather}
Relational Energy: ${energy}
Daily Guide: "${guideText}"
User A Mood Patterns: [${userAMoods.join(', ')}]
User B Mood Patterns: [${userBMoods.join(', ')}]

Synthesize exactly 3 extremely short, comforting, poetic Turkish relationship whispers/tips for the day.
- NEVER expose raw moods, names, or individual activities.
- Keep each tip under 10 words.
- Focus on emotional connection, space, and understanding.
- Examples: 
  "Bugün birbirinizi anlamak için sessizlik iyi gelebilir."
  "Küçük bir ilgi göstermek bağınızı tazeleyebilir."
  "İkiniz de bugün farklı şekillerde dinlenmek isteyebilirsiniz."

Respond ONLY with a valid JSON object containing a single array property "whispers":
{
  "whispers": [
    "Tip 1...",
    "Tip 2...",
    "Tip 3..."
  ]
}
Do not write markdown formatting or backticks.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: systemPrompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const parsed = JSON.parse(completion.choices[0].message.content);
    const whispers = parsed.whispers || [];

    // Ensure we have exactly 3 whispers
    const formattedWhispers = whispers.slice(0, 3);
    while (formattedWhispers.length < 3) {
      formattedWhispers.push("Bugün birbirinize şefkatle yaklaşmak iyi gelebilir. 🌿");
    }

    // 4. Update the relationship_daily_syncs cache
    if (todaySync.rows.length > 0) {
      await db.query(
        'UPDATE relationship_daily_syncs SET insight_feed = $1 WHERE id = $2',
        [JSON.stringify(formattedWhispers), todaySync.rows[0].id]
      );
    } else {
      await db.query(
        `INSERT INTO relationship_daily_syncs (connection_id, generated_text, emotional_weather, relationship_energy, insight_feed)
         VALUES ($1, $2, $3, $4, $5)`,
        [connectionId, guideText || 'Uyum sentezi yapılıyor.', weather, energy, JSON.stringify(formattedWhispers)]
      );
    }

    console.log('[DEBUG] getInsightFeed output:', formattedWhispers);
    return formattedWhispers;

  } catch (error) {
    console.error('[emotionalContextBuilder] Error generating insight feed:', error);
    return [
      "Bugün birbirinizi anlamak için sakinlik iyi gelebilir. 🌿",
      "Küçük bir şefkat adımı ilişkinizi besleyebilir. ✨",
      "Birbirinizin sessiz alanlarına saygı duymak bağınızı güçlendirir. 🤍"
    ];
  }
};

/**
 * Asynchronously summarizes and updates the user's ongoing emotional continuity memories.
 * Fired in the background after each message to maintain stateless context.
 */
exports.updateEmotionalContinuity = async (userId, currentMessage, history) => {
  try {
    // 1. Fetch current continuity memories to see existing context
    const existingRes = await db.query(
      "SELECT memory_key, memory_value FROM emotional_memories WHERE user_id = $1 AND category = 'continuity'",
      [userId]
    );
    const existing = {};
    existingRes.rows.forEach(r => {
      existing[r.memory_key] = r.memory_value;
    });

    // 2. Prepare chat history summary for prompt
    const historyText = history.map(h => `${h.sender === 'user' ? 'Kullanıcı' : 'Selfplace'}: ${h.message}`).join('\n');

    // 3. System Prompt for gpt-4o-mini
    const systemPrompt = `You are the emotional memory synthesis engine for "Selfplace", a calming emotional companion app.
Analyze the user's latest message and recent chat history to synthesize/update their ongoing emotional patterns.

Recent Chat History:
${historyText}

Current User Message:
"${currentMessage}"

Current Stored Memories:
${JSON.stringify(existing)}

Update the following keys if you detect changes or new emotional observations:
1. "recent_emotional_tone": Summarize the user's current emotional vibe, stress levels, and feelings (Turkish, 2-4 words, e.g. "Düşünceli ve yorgun" or "Sakin, dengeli").
2. "recurring_concerns": Identify ongoing worries, worries about work/health, or recurring topics (Turkish, e.g. "İş yoğunluğu, gelecek belirsizliği").
3. "relationship_tension_patterns": If they mention a connection/partner/close person, list emotional triggers, fears, or tensions (Turkish, e.g. "Partnerin sessizliğinden kaygılanmak").
4. "comforting_subjects": Mention what helps them calm down or makes them feel safe (Turkish, e.g. "Yalnız kalıp müzik dinlemek, yürüyüş yapmak").
5. "emotional_habits": Notice behavioral habits or patterns (Turkish, e.g. "Geceleri aşırı düşünme, stres anında sessizleşme").

Respond ONLY with a valid JSON object containing the updated keys (only output the keys that have changed or have new information):
{
  "recent_emotional_tone": "...",
  "recurring_concerns": "...",
  "relationship_tension_patterns": "...",
  "comforting_subjects": "...",
  "emotional_habits": "..."
}
If nothing has changed, output an empty object: {}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }],
      response_format: { type: 'json_object' },
      temperature: 0.5,
    });

    const updates = JSON.parse(completion.choices[0].message.content);

    // 4. Save updates to DB
    for (const [key, value] of Object.entries(updates)) {
      if (value && value.trim() !== '') {
        await db.query(
          `INSERT INTO emotional_memories (user_id, memory_key, memory_value, category)
           VALUES ($1, $2, $3, 'continuity')
           ON CONFLICT (user_id, memory_key) 
           DO UPDATE SET memory_value = EXCLUDED.memory_value, updated_at = NOW()`,
          [userId, key, value.trim()]
        );
      }
    }
  } catch (error) {
    console.error('[emotionalContextBuilder] Error updating emotional continuity:', error);
  }
};
