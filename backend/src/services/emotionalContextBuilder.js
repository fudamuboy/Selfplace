const db = require('../config/db');
const OpenAI = require('openai');
const { buildCoupleMemoryDossier, getIndividualBehavioralDossier } = require('./coupleMemoryService');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function getUserPlan(userId) {
  const result = await db.query('SELECT plan_type FROM subscription_status WHERE user_id = $1', [userId]);
  if (result.rows.length === 0) return 'free';
  return result.rows[0].plan_type || 'free';
}

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
    const total = Object.values(counts).reduce((acc, curr) => acc + parseInt(curr || 0, 10), 0);
    const evolutionScore = total; // Simplified for brevity, original logic can be restored

    let level = 'NEW';
    if (evolutionScore >= 10 && evolutionScore < 30) level = 'LIGHT';
    else if (evolutionScore >= 30 && evolutionScore < 75) level = 'GROWING';
    else if (evolutionScore >= 75 && evolutionScore < 150) level = 'DEEP';
    else if (evolutionScore >= 150) level = 'IMMERSIVE';

    return { level, total, evolutionScore };
  } catch (err) {
    return { level: 'NEW', total: 0, evolutionScore: 0 };
  }
};

exports.buildEmotionalContext = async (userId) => {
  try {
    const plan = await getUserPlan(userId);
    const isFree = plan === 'free';
    const isPlus = plan === 'plus';
    const isSignature = plan === 'signature';

    const { level: emotionalDepthLevel, total: totalInteractions } = await exports.calculateDepthLevel(userId);

    // Fetch Connection Info First
    let hasPartner = false;
    let partnerId = null;
    let connectionId = null;
    let partnerPrivacy = { exclude_journals: false, exclude_cards: false, exclude_checkins: false };
    let myPrivacy = { exclude_checkins: false, exclude_journals: false, exclude_cards: false, exclude_ai_chat: false, exclude_personality: false };
    let conn = null;

    const connRes = await db.query(
      `SELECT c.id, c.requester_id, c.recipient_id, c.connection_type, c.created_at,
              c.requester_alias, c.recipient_alias,
              u1.username as req_username, u2.username as rec_username
       FROM relationship_connections c
       JOIN users u1 ON c.requester_id = u1.id
       JOIN users u2 ON c.recipient_id = u2.id
       WHERE (c.requester_id = $1 OR c.recipient_id = $1) AND c.status = 'active'
       LIMIT 1`,
      [userId]
    );

    if (connRes.rows.length > 0) {
      hasPartner = true;
      conn = connRes.rows[0];
      connectionId = conn.id;
      const isRequester = conn.requester_id === userId;
      partnerId = isRequester ? conn.recipient_id : conn.requester_id;

      // Get privacy settings
      const privacyRes = await db.query('SELECT * FROM relationship_privacy_settings WHERE connection_id = $1', [connectionId]);
      const myPrivRow = privacyRes.rows.find(r => r.user_id === userId);
      if (myPrivRow) myPrivacy = myPrivRow;
      const partnerPrivRow = privacyRes.rows.find(r => r.user_id === partnerId);
      if (partnerPrivRow) partnerPrivacy = partnerPrivRow;
    }

    // [APP ACTIVITY INTELLIGENCE]
    const activityRes = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM journal_entries WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '7 days') as recent_journals,
        (SELECT COUNT(*) FROM card_responses WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '7 days') as recent_cards,
        (SELECT COUNT(*) FROM relationship_ritual_responses WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '7 days') as recent_rituals
    `, [userId]);
    const activity = activityRes.rows[0];
    const activityStr = `Son 7 Günlük Aktivite: ${activity.recent_journals} Günlük, ${activity.recent_cards} Kart, ${activity.recent_rituals} Ritüel`;

    // ─────────────────────────────────────────────────────────────────
    // LAYER 1: INDIVIDUAL DOSSIER
    // ─────────────────────────────────────────────────────────────────
    const userRes = await db.query('SELECT username, zodiac_sign FROM users WHERE id = $1', [userId]);
    const user = userRes.rows[0] || {};

    let layer1 = `### [LAYER 1: BİREYSEL DOSYA]\n`;
    layer1 += `- Temel Kimlik: Burç ${user.zodiac_sign || 'Bilinmiyor'}\n`;
    layer1 += `- Uygulama Etkileşim Seviyesi: ${emotionalDepthLevel} (${activityStr})\n`;

    // Onboarding Goals (ALL TIERS - Free, Plus, Signature)
    const goalsRes = await db.query(`SELECT memory_value FROM emotional_memories WHERE user_id = $1 AND memory_key = 'onboarding_goals'`, [userId]);
    if (goalsRes.rows.length > 0) {
      layer1 += `- Onboarding Hedefleri: ${goalsRes.rows[0].memory_value}\n`;
    }

    // Check-ins (Moods)
    let isDistressed = false;
    let recentMoods = [];
    const checkInsRes = await db.query('SELECT mood, note FROM check_ins WHERE user_id = $1 ORDER BY created_at DESC LIMIT 3', [userId]);
    if (checkInsRes.rows.length > 0) {
      recentMoods = checkInsRes.rows.map(r => r.note ? `${r.mood} ("${r.note}")` : r.mood);
      layer1 += `- Son Duygu Durumları: ${recentMoods.join(', ')}\n`;
      
      const latestMood = checkInsRes.rows[0].mood.toLowerCase();
      const distressKeywords = ['stres', 'tüken', 'kaygı', 'üzgün', 'yalnız', 'kork', 'bık', 'yorgun'];
      isDistressed = distressKeywords.some(keyword => latestMood.includes(keyword));
    }

    if (!isFree) {
      // Compressed Journal Themes (Plus & Signature, respects privacy)
      if (!myPrivacy.exclude_journals) {
        const themesRes = await db.query(`SELECT memory_value FROM emotional_memories WHERE user_id = $1 AND memory_key = 'recent_journal_themes'`, [userId]);
        if (themesRes.rows.length > 0) {
          layer1 += `- Son Günlük Temaları: ${themesRes.rows[0].memory_value}\n`;
        }
      }

      // Compressed Card Themes (Plus & Signature, respects privacy)
      if (!myPrivacy.exclude_cards) {
        const cardThemesRes = await db.query(`SELECT memory_value FROM emotional_memories WHERE user_id = $1 AND memory_key = 'recent_card_themes'`, [userId]);
        if (cardThemesRes.rows.length > 0) {
          layer1 += `- Son Kart Temaları: ${cardThemesRes.rows[0].memory_value}\n`;
        }
      }

      // Compressed Advanced Check-in Themes (Plus & Signature, respects privacy)
      if (!myPrivacy.exclude_checkins) {
        const checkInThemesRes = await db.query(`SELECT memory_value FROM emotional_memories WHERE user_id = $1 AND memory_key = 'recent_checkin_themes'`, [userId]);
        if (checkInThemesRes.rows.length > 0) {
          layer1 += `- Son Gelişmiş Check-in Temaları: ${checkInThemesRes.rows[0].memory_value}\n`;
        }
      }

      // DISC / Journey Personality
      const colorRes = await db.query(
        "SELECT result_data, test_type FROM personality_results WHERE user_id = $1 AND test_type IN ('color', 'journey') ORDER BY created_at DESC LIMIT 1",
        [userId]
      );
      if (colorRes.rows.length > 0) {
        const row = colorRes.rows[0];
        const p = row.result_data;
        if (row.test_type === 'journey') {
          const colorName = p.color_family?.name || 'Bilinmiyor';
          const colorHex = p.color_family?.hex || p.dominant_color || '#B3B3B3';
          layer1 += `- DISC Kişilik Rengi: Dominant ${colorHex} (${colorName})\n`;
        } else {
          layer1 += `- DISC Kişilik Rengi: Dominant ${p.dominantColor} (${p.title})\n`;
        }
      }

      // Individual Behavioral Dossier
      const behavioralDossier = await getIndividualBehavioralDossier(userId);
      if (behavioralDossier) {
        layer1 += `\n${behavioralDossier}\n`;
      }
    }

    // ── Journey Identity Integration (ALL TIERS) ──────────────────────
    let journeyData = null;
    try {
      const journeyMemoryRes = await db.query(
        "SELECT memory_value FROM emotional_memories WHERE user_id = $1 AND memory_key = 'journey_identity_summary'",
        [userId]
      );
      if (journeyMemoryRes.rows.length > 0) {
        journeyData = JSON.parse(journeyMemoryRes.rows[0].memory_value);
      } else {
        // Fallback: fetch from personality_results and cache it
        const journeyRes = await db.query(
          "SELECT result_data FROM personality_results WHERE user_id = $1 AND test_type = 'journey' ORDER BY created_at DESC LIMIT 1",
          [userId]
        );
        if (journeyRes.rows.length > 0) {
          const rd = journeyRes.rows[0].result_data;
          journeyData = {
            archetype_name: rd.archetype_name,
            description: rd.description,
            strengths: rd.strengths,
            blind_spots: rd.blind_spots,
            scores: rd.scores
          };
          // Cache it
          await db.query(
            `INSERT INTO emotional_memories (user_id, memory_key, memory_value, category)
             VALUES ($1, 'journey_identity_summary', $2, 'individual')
             ON CONFLICT (user_id, memory_key)
             DO UPDATE SET memory_value = EXCLUDED.memory_value, updated_at = NOW()`,
            [userId, JSON.stringify(journeyData)]
          );
        }
      }

      if (journeyData) {
        layer1 += `\n[İÇSEL KİMLİK PROFİLİ]\n`;
        layer1 += `* Arketip: ${journeyData.archetype_name || 'Bilinmiyor'}\n`;
        layer1 += `* Profil: ${journeyData.description || ''}\n`;

        if (!isFree) {
          // Plus & Signature get Strengths & Blind Spots
          const strengthsList = Array.isArray(journeyData.strengths) 
            ? journeyData.strengths.slice(0, 3).map(s => `- ${s}`).join('\n  ') 
            : '';
          const blindSpotsList = Array.isArray(journeyData.blind_spots) 
            ? journeyData.blind_spots.slice(0, 2).map(b => `- ${b}`).join('\n  ') 
            : '';
          if (strengthsList) layer1 += `* Güçlü Yönler:\n  ${strengthsList}\n`;
          if (blindSpotsList) layer1 += `* Kör Noktalar:\n  ${blindSpotsList}\n`;
        }

        if (isSignature) {
          // Signature gets Emotional Tendencies / Dimension Synthesis
          const dimsSummary = summarizeEmotionalDimensions(journeyData.scores);
          if (dimsSummary) layer1 += `* Duygusal Eğilimler: ${dimsSummary}\n`;
        }
      }
    } catch (jErr) {
      console.error('[buildEmotionalContext] Journey integration error:', jErr.message);
    }

    // [Rest of buildEmotionalContext details...]
    let layer2 = '';

    if (hasPartner && conn) {
      const isRequester = conn.requester_id === userId;
      const partnerAlias = isRequester ? conn.recipient_alias : conn.requester_alias;
      const partnerName = partnerAlias || (isRequester ? conn.rec_username : conn.req_username);
      
      const durationMs = Date.now() - new Date(conn.created_at).getTime();
      const durationDays = Math.max(1, Math.floor(durationMs / (1000 * 60 * 60 * 24)));

      layer2 += `\n### [LAYER 2: ORTAK İLİŞKİ DOSYASI (ÜÇÜNCÜ VARLIK)]\n`;
      layer2 += `- İlişki Varlığı: ${conn.connection_type} (Partner: ${partnerName})\n`;
      layer2 += `- Beraberlik Süresi: ${durationDays} Gün\n`;

      if (!isFree) {
        // Daily Sync Weather
        const syncRes = await db.query(`SELECT emotional_weather, relationship_energy FROM relationship_daily_syncs WHERE connection_id = $1 ORDER BY synced_date DESC LIMIT 1`, [conn.id]);
        if (syncRes.rows.length > 0) {
          layer2 += `- Mevcut İlişki Havası: ${syncRes.rows[0].emotional_weather} (Enerji: ${syncRes.rows[0].relationship_energy})\n`;
        }

        // Shared Couple Memory Dossier (Replaces raw unresolved query)
        const coupleDossier = await buildCoupleMemoryDossier(conn.id);
        if (coupleDossier) {
          layer2 += `\n${coupleDossier}\n`;
        }
      }

      if (isSignature) {
        // Timeline & Milestones (Last 3)
        const timelineRes = await db.query(`SELECT title_tr FROM relationship_timeline WHERE connection_id = $1 ORDER BY created_at DESC LIMIT 3`, [conn.id]);
        if (timelineRes.rows.length > 0) {
          layer2 += `- Son Dönüm Noktaları: ${timelineRes.rows.map(r => r.title_tr).join(', ')}\n`;
        }

        // Garden Level
        const gardenRes = await db.query(`SELECT growth_level FROM relationship_garden WHERE connection_id = $1`, [conn.id]);
        if (gardenRes.rows.length > 0) {
          layer2 += `- İlişki Bahçesi Seviyesi: ${gardenRes.rows[0].growth_level}\n`;
        }

        // Shared Ritual Synthesis (Privacy Guarded)
        const ritualRes = await db.query(`
          SELECT r.prompt_tr, rr.response_text 
          FROM relationship_ritual_responses rr
          JOIN relationship_rituals r ON rr.ritual_id = r.id
          WHERE r.connection_id = $1 AND rr.include_in_synthesis = true AND rr.user_id = $2
          ORDER BY rr.created_at DESC LIMIT 1
        `, [conn.id, partnerId]);
        if (ritualRes.rows.length > 0 && !partnerPrivacy.exclude_journals) {
          layer2 += `- Partnerin Son Ritüel Yanıtı: "${ritualRes.rows[0].prompt_tr}" -> "${ritualRes.rows[0].response_text}"\n`;
        }
      }
    }

    return { 
      layer1_individual: layer1, 
      layer2_relationship: layer2, 
      isDistressed, 
      hasPartner, 
      partnerId,
      connectionId,
      planType: plan, 
      emotionalDepthLevel, 
      totalInteractions,
      recentActivity: activity, // Passing activity to AI Controller for Layer 3 rules
      journeyData
    };

  } catch (err) {
    console.error('[buildEmotionalContext] error:', err.message);
    throw err;
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
    // Privacy Consistency: check exclude_ai_chat
    const privacyRes = await db.query(
      `SELECT rps.exclude_ai_chat 
       FROM relationship_privacy_settings rps
       JOIN relationship_connections rc ON rps.connection_id = rc.id
       WHERE rps.user_id = $1 AND rc.status = 'active'`,
      [userId]
    );
    if (privacyRes.rows.length > 0 && privacyRes.rows[0].exclude_ai_chat) {
      console.log(`[emotionalContextBuilder] Privacy Guard: User ${userId} excluded AI chat. Skipping emotional continuity update.`);
      return;
    }

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

/**
 * Summarizes the 7 personality dimensions score object into a clean Turkish sentence.
 */
function summarizeEmotionalDimensions(scores) {
  if (!scores) return '';
  const parts = [];

  // 1. social_energy
  if (scores.social_energy > 2) {
    parts.push('sosyal ortamlardan ve aktif etkileşimlerden beslenen dışa dönük');
  } else if (scores.social_energy < -2) {
    parts.push('kendi başıma kalıp sessizce şarj olmayı tercih eden içe dönük');
  }

  // 2. emotional_expression
  if (scores.emotional_expression > 2) {
    parts.push('duygularını açıkça ve coşkuyla ifade etmeyi seçen');
  } else if (scores.emotional_expression < -2) {
    parts.push('hissiyatını önce kendi içinde derinlemesine işlemeye eğilimli');
  }

  // 3. conflict_style
  if (scores.conflict_style > 2) {
    parts.push('sorunları doğrudan ve anında yüzleşerek çözmek isteyen');
  } else if (scores.conflict_style < -2) {
    parts.push('gerginlik anlarında geri çekilmeyi ve zamana bırakmayı tercih eden kaçınmacı');
  }

  // 4. decision_style
  if (scores.decision_style > 2) {
    parts.push('kararlarında hislerine ve kalbinin sesine güvenen duygusal');
  } else if (scores.decision_style < -2) {
    parts.push('kararlarını rasyonel analizler ve mantık çerçevesinde şekillendiren');
  }

  // 5. attachment
  if (scores.attachment > 2) {
    parts.push('ilişkilerde yakınlık, güvence ve sık temas arayan');
  } else if (scores.attachment < -2) {
    parts.push('bireysel alanına ve bağımsızlığına son derece düşkün');
  }

  // 6. energy_rhythm
  if (scores.energy_rhythm > 2) {
    parts.push('dinamik ve yoğun duygusal ritimlere sahip');
  } else if (scores.energy_rhythm < -2) {
    parts.push('sakin, dingin ve dengeli bir yaşam temposunu benimseyen');
  }

  // 7. curiosity
  if (scores.curiosity > 2) {
    parts.push('merak duygusu yüksek, yeni deneyimlere ve keşiflere açık');
  } else if (scores.curiosity < -2) {
    parts.push('istikrarlı, düzenli ve planlı yapıları tercih eden');
  }

  if (parts.length === 0) return 'dengeli ve uyumlu';
  
  if (parts.length === 1) {
    return `Kullanıcı; ${parts[0]} bir yapıya sahiptir.`;
  }
  return `Kullanıcı; ${parts.slice(0, -1).join(', ')} ve ${parts[parts.length - 1]} bir yapıya sahiptir.`;
}

