const db = require('../config/db');
const OpenAI = require('openai');
const crypto = require('crypto');
const { ZODIAC_PROFILES } = require('../utils/astrologyProfiles');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const EMOTIONAL_WEATHER = [
  'calm', 'hopeful', 'introspective', 'socially open', 'dreamy',
  'emotionally protective', 'motivational', 'soft romantic', 'reflective', 'energetic'
];

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

function getLocalFallbackWhisper(zodiacSign, timeOfDay) {
  const fallbacks = {
    morning: [
      `Güne başlarken ${zodiacSign} enerjisi seni biraz daha kendi merkezine çekiyor olabilir. Sessizliği dinlemek iyi gelebilir.`,
      `Bugün zihnin biraz daha açık ve umutlu hissedebilir. Adımlarını sakince atmaya çalış.`,
      `Sabahın dinginliğinde kendi ritmini bulman, günün geri kalanını değiştirebilir.`
    ],
    afternoon: [
      `Günün yorgunluğu birikirken, kısa bir an durup nefes almak enerjini toparlamana yardımcı olacaktır.`,
      `Gün ortası koşuşturmacasında küçük bağlantıların değerini fark et. Bazen bir tebessüm her şeyi değiştirir.`,
      `Şu an zihnindeki düşünce bulutları biraz daha dağılmaya hazır gibi görünüyor.`
    ],
    evening: [
      `Akşamın çöküşüyle birlikte kendine biraz daha şefkat göstermek isteyebilirsin. Sınırlarını korumak güzeldir.`,
      `Günün hareketliliği yavaşlarken, duygusal olarak biraz daha güvenli hissetmek isteyebilirsin.`,
      `Bugün yoruldun. Artık sadece kendine ait, sakin bir alana çekilme zamanı.`
    ],
    night: [
      `Gece yavaşlarken, bugünün ağırlığını zihninde bırakmaya çalış. Yıldızlar sakinliğini destekliyor.`,
      `Düşüncelerin en yoğun olduğu saatler. Belki de bazı soruları sabaha bırakmak en iyisidir.`,
      `Gece karanlığında, içinde sadece sana ait olan sessiz umudu hissetmeye odaklan.`
    ]
  };
  const options = fallbacks[timeOfDay] || fallbacks['afternoon'];
  return options[Math.floor(Math.random() * options.length)];
}

async function gatherPersonalContext(userId) {
  try {
    const context = {
      recentMoods: [],
      dominantThemes: [],
      stressIndicators: [],
      journalThemes: [],
      weeklyInsight: null,
      relationshipReflections: [],
      growthThemes: [],
      awarenessScore: 50 // Default
    };

    // 1 & 2: Recent moods & dominant themes (Last 7 days)
    const moodRes = await db.query(
      `SELECT emotion, COUNT(*) as count 
       FROM emotional_entries 
       WHERE user_id = $1 AND source_type IN ('checkin', 'reflection') AND created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
       GROUP BY emotion ORDER BY count DESC`,
      [userId]
    );
    
    if (moodRes.rows.length > 0) {
      context.recentMoods = moodRes.rows.map(r => `${r.emotion} (${r.count})`);
      context.dominantThemes = moodRes.rows.slice(0, 3).map(r => r.emotion);
      
      const stressKeywords = ['Yorgun', 'Kaygılı', 'Kızgın', 'Stresli', 'Bunalmış', 'Üzgün', 'Öfkeli', 'Tükenmiş', 'Korkmuş'];
      context.stressIndicators = context.dominantThemes.filter(e => stressKeywords.includes(e));
    }

    // 3: Weekly Insight Summary
    const insightRes = await db.query(
      `SELECT text FROM weekly_insights WHERE user_id = $1 ORDER BY generated_at DESC LIMIT 1`,
      [userId]
    );
    if (insightRes.rows.length > 0) {
      context.weeklyInsight = insightRes.rows[0].text;
      context.growthThemes.push('Genel kişisel analiz çıkarımları aktif');
    }

    // 4 & 8: Recent Journal Themes & Relationship Reflections
    const journalRes = await db.query(
      `SELECT prompt, content, emotion 
       FROM emotional_entries 
       WHERE user_id = $1 AND source_type = 'journal' AND created_at > CURRENT_TIMESTAMP - INTERVAL '14 days'
       ORDER BY created_at DESC LIMIT 3`,
      [userId]
    );
    
    if (journalRes.rows.length > 0) {
      context.journalThemes = journalRes.rows.map(r => r.prompt || r.emotion || 'Günlük Girdisi');
      
      const relationKeywords = ['partner', 'ilişki', 'sevgili', 'aşk', 'evlilik', 'kavga', 'iletişim'];
      const textCorpus = journalRes.rows.map(r => (r.content || '').toLowerCase()).join(' ');
      
      const foundRelations = relationKeywords.filter(k => textCorpus.includes(k));
      if (foundRelations.length > 0) {
        context.relationshipReflections = foundRelations;
      }
    }

    // 6: Emotional Awareness Score
    const totalReflections = await db.query(
      `SELECT COUNT(*) FROM emotional_entries WHERE user_id = $1`, [userId]
    );
    const count = parseInt(totalReflections.rows[0].count);
    context.awarenessScore = Math.min(100, Math.max(10, count * 2)); // Simple scale

    return context;
  } catch (err) {
    console.error('[Astrology Context Gather Error]', err);
    return null;
  }
}

/**
 * AI Synthesis Engine for Astrology (Weekly)
 */
async function generateAstrologySynthesis(zodiacSign, element, activeEvents, recentMood, colorResult, recentHistory = [], personalContext = null) {
  try {
    const profile = ZODIAC_PROFILES[zodiacSign] || ZODIAC_PROFILES["Ateş"]; // Fallback if missing
    
    let dossier = `[USER CONTEXT]\nZodiac Sign: ${zodiacSign}\n`;
    dossier += `Element: ${element}\n`;
    
    if (activeEvents && activeEvents.length > 0) {
      dossier += `Current Sky: ${activeEvents[0].event_name} - ${activeEvents[0].description}\n`;
    }
    if (recentMood) {
      dossier += `Recent Emotional State: ${recentMood}\n`;
    }
    if (colorResult) {
      dossier += `DISC Personality: ${colorResult.dominantColor} (${colorResult.title})\n`;
    }

    if (personalContext) {
      dossier += `\n[PERSONAL DATA CONTEXT]\n`;
      if (personalContext.recentMoods.length > 0) dossier += `Last 7 days moods: ${personalContext.recentMoods.join(', ')}\n`;
      if (personalContext.stressIndicators.length > 0) dossier += `Current stress indicators: ${personalContext.stressIndicators.join(', ')}\n`;
      if (personalContext.journalThemes.length > 0) dossier += `Recent journal themes: ${personalContext.journalThemes.join(', ')}\n`;
      if (personalContext.weeklyInsight) dossier += `Weekly insight summary: ${personalContext.weeklyInsight}\n`;
      if (personalContext.relationshipReflections.length > 0) dossier += `Recent relationship reflections: ${personalContext.relationshipReflections.join(', ')}\n`;
      dossier += `Emotional awareness score: ${personalContext.awarenessScore}/100\n`;
    }

    let historyConstraint = '';
    if (recentHistory && recentHistory.length > 0) {
      historyConstraint = `\n[STRICTLY FORBIDDEN THEMES & PHRASING]\nYou MUST NOT reuse the phrasing, emotional openings, or exact structure of the following recent guidances:\n`;
      recentHistory.forEach((text, i) => {
        historyConstraint += `- "${typeof text === 'object' ? JSON.stringify(text).substring(0,100) : text}"\n`;
      });
      historyConstraint += `Create something entirely fresh in structure, rhythm, and tone.\n`;
    }

    const systemPrompt = `You are the premium emotional astrology engine of Selfplace.
Your goal is to write a deeply personal, emotionally intelligent, and psychologically nuanced weekly reflection for the user.

${dossier}

[ZODIAC PSYCHOLOGICAL PROFILE: ${zodiacSign}]
Core Traits: ${profile.core}
Inner Conflict: ${profile.emotionalConflict}
Stress Behavior: ${profile.stressBehavior}
Relational Style: ${profile.relationalTendency}
Key Vocabulary (use subtly in Turkish): ${profile.vocabulary?.join(', ')}
Writing Rhythm: ${profile.writingStyle}
${historyConstraint}
CRITICAL RULES:
1. NO GENERIC ASTROLOGY: You must write specifically in the style and psychological tone of ${zodiacSign}. Do not sound like a generic horoscope.
2. NO BANNED CLICHES: Never use phrases like "kendine karşı nazik ol", "güvenlik ihtiyacın artabilir", "topraklanma zamanı", "iç sesini dinle", "yeni fırsatlar seni bekliyor", "enerjin yüksek olabilir".
3. NO FORTUNE TELLING: Do not predict the future. Focus purely on emotional reflection and symbolic guidance based on the current sky and their mood.
4. PERSONAL DATA USAGE: The personal data context provided MUST subtly influence your interpretation. Do NOT explicitly state "Because you felt anxious..." or "Your data shows...". Instead, naturally adapt the interpretation. If they showed anxiety, emphasize grounding. If they showed motivation, emphasize expansion. The astrology must remain the primary framework.
5. TONE: Premium, subtle, empathetic, intimate, atmospheric, and human-written. Keep it emotionally intelligent but NOT overwhelming or excessively poetic.
6. LANGUAGE: Turkish.
7. OUTPUT FORMAT: You MUST return ONLY a valid JSON object with the following exact keys (no extra text, no markdown blocks). Write 1-2 concise, flowing sentences per category:
{
  "GeneralTheme": "...",
  "Love": "...",
  "Career": "...",
  "Money": "...",
  "SocialLife": "...",
  "HealthEnergy": "...",
  "AttentionAreas": "...",
  "LuckyAreas": "...",
  "WeeklyAdvice": "..."
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: systemPrompt }],
      temperature: 0.8,
      response_format: { type: "json_object" }
    });

    const text = completion.choices[0].message.content;
    const content_hash = crypto.createHash('sha256').update(text).digest('hex');

    return { text, content_hash };
  } catch (err) {
    console.error('[Astrology AI Error]', err);
    // Silent fallback if API fails
    const text = JSON.stringify({
      GeneralTheme: `Sevgili ${zodiacSign || 'Dostum'}, gökyüzündeki mevcut enerjiler şu an iç dünyanda önemli dönüşümlere işaret ediyor. Kendi ritminde kalmaya özen göster.`
    });
    return { text, content_hash: crypto.createHash('sha256').update(text).digest('hex') };
  }
}

/**
 * AI Synthesis Engine for Astrology (Daily Whisper)
 */
async function generateDailyWhisper(zodiacSign, element, activeEvents, recentMood, recentHistory = []) {
  const timeOfDay = getTimeOfDay();
  const weather = EMOTIONAL_WEATHER[Math.floor(Math.random() * EMOTIONAL_WEATHER.length)];

  try {
    let dossier = `[USER CONTEXT]\nZodiac Sign: ${zodiacSign}\nElement: ${element}\nTime of Day: ${timeOfDay}\nEmotional Weather Target: ${weather}\n`;
    
    if (activeEvents && activeEvents.length > 0) {
      dossier += `Current Sky Context: ${activeEvents[0].event_name}\n`;
    }
    if (recentMood) {
      dossier += `Recent Mood: ${recentMood}\n`;
    }

    let historyConstraint = '';
    if (recentHistory && recentHistory.length > 0) {
      historyConstraint = `\n[STRICTLY FORBIDDEN THEMES & PHRASING]\nYou MUST NOT reuse the phrasing, emotional openings, or exact structure of the following recent daily whispers:\n`;
      recentHistory.forEach((text, i) => {
        historyConstraint += `- "${text}"\n`;
      });
      historyConstraint += `Create something entirely fresh in structure, rhythm, and tone.\n`;
    }

    const systemPrompt = `You are the daily emotional whisper engine of Selfplace.
Your goal is to write a highly atmospheric, short, and poetic daily observation for the user.

${dossier}
${historyConstraint}
CRITICAL RULES:
1. FOCUS ON TIME & WEATHER: Tailor the observation subtly to the "${timeOfDay}" and the "${weather}" emotional weather.
2. NO GENERIC ASTROLOGY: Do not use horoscope cliches like "yeni fırsatlar", "enerjin yüksek", "duygularını dinle". Be intimate, observant, softly human.
3. LENGTH: Maximum 2 sentences. Around 30-60 words. Keep it elegant and quickly readable. Do not write paragraphs.
4. TONE: Atmospheric, calm, poetic, soft. 
5. LANGUAGE: Turkish.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }],
      temperature: 0.9,
    });

    const text = completion.choices[0].message.content;
    const content_hash = crypto.createHash('sha256').update(text).digest('hex');

    return { text, content_hash, weather };
  } catch (err) {
    console.error('[Astrology Daily AI Error]', err);
    const text = getLocalFallbackWhisper(zodiacSign, timeOfDay);
    return { text, content_hash: crypto.createHash('sha256').update(text).digest('hex'), weather: 'calm' };
  }
}

async function ensureDailyWhisper(userId, zodiacSign) {
  // 1. Check if we already have a valid whisper for today
  const whisperRes = await db.query(
    "SELECT * FROM daily_whisper WHERE user_id = $1 AND expires_at > CURRENT_TIMESTAMP ORDER BY generated_at DESC LIMIT 1",
    [userId]
  );

  if (whisperRes.rows.length > 0) {
    return {
      whisperText: whisperRes.rows[0].whisper_text,
      weather: whisperRes.rows[0].emotional_weather,
      generatedAt: whisperRes.rows[0].generated_at,
      isNew: false
    };
  }

  // 2. Fetch required context
  const profileRes = await db.query('SELECT element FROM zodiac_profiles WHERE sign = $1', [zodiacSign]);
  const element = profileRes.rows[0]?.element || 'Ateş';

  const eventsRes = await db.query(
    "SELECT * FROM astrology_events WHERE is_active = true AND CURRENT_TIMESTAMP BETWEEN date_start AND date_end LIMIT 1"
  );
  const activeEvents = eventsRes.rows;

  const moodRes = await db.query(
    'SELECT mood FROM check_ins WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
    [userId]
  );
  const recentMood = moodRes.rows[0]?.mood || null;

  // 3. Fetch recent history for anti-repetition (last 7 whispers)
  const historyRes = await db.query(
    "SELECT whisper_text FROM daily_whisper WHERE user_id = $1 ORDER BY generated_at DESC LIMIT 7",
    [userId]
  );
  const recentHistory = historyRes.rows.map(r => r.whisper_text);

  // 4. Generate new whisper
  const { text, content_hash, weather } = await generateDailyWhisper(zodiacSign, element, activeEvents, recentMood, recentHistory);

  // 5. Save to DB (expires in 24h)
  await db.query(
    `INSERT INTO daily_whisper 
    (user_id, zodiac_sign, whisper_text, mood_context, emotional_weather, content_hash, expires_at) 
    VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP + INTERVAL '24 hours')`,
    [userId, zodiacSign, text, recentMood, weather, content_hash]
  );

  return {
    whisperText: text,
    weather,
    generatedAt: new Date().toISOString(),
    isNew: true
  };
}

/**
 * GET /api/astrology/home
 * Lightweight widget data for the home screen
 */
exports.getHomeWidget = async (req, res) => {
  const userId = req.user.id;

  try {
    const userRes = await db.query('SELECT zodiac_sign FROM users WHERE id = $1', [userId]);
    const zodiacSign = userRes.rows[0]?.zodiac_sign;

    if (!zodiacSign) {
      return res.json({
        success: true,
        data: {
          zodiacSign: null,
          userZodiac: null,
          event_name: 'Gökyüzü',
          preview_text: 'Doğum tarihini eklediğinde gökyüzü yorumların burada görünecek ✨'
        }
      });
    }

    const whisperData = await ensureDailyWhisper(userId, zodiacSign);

    const eventsRes = await db.query(
      "SELECT event_name FROM astrology_events WHERE is_active = true AND CURRENT_TIMESTAMP BETWEEN date_start AND date_end ORDER BY date_start ASC LIMIT 1"
    );
    const eventName = eventsRes.rows.length > 0 ? eventsRes.rows[0].event_name : 'Gökyüzü Dingin';

    const responseData = {
      success: true,
      data: {
        zodiacSign,
        event_name: eventName,
        preview_text: whisperData.whisperText,
        generatedAt: whisperData.generatedAt,
      }
    };
    
    res.json(responseData);
  } catch (err) {
    console.error('[Astrology Home Error]', err);
    res.status(500).json({ success: false, message: 'Enerji alınamadı.' });
  }
};

/**
 * GET /api/astrology/daily
 * Daily emotional whisper engine
 */
exports.getDailyWhisper = async (req, res) => {
  const userId = req.user.id;

  try {
    const userRes = await db.query('SELECT zodiac_sign FROM users WHERE id = $1', [userId]);
    const zodiacSign = userRes.rows[0]?.zodiac_sign;

    if (!zodiacSign) {
      return res.json({
        success: true,
        data: { whisperText: 'Doğum tarihini eklediğinde günlük enerjilerin burada görünecek ✨' }
      });
    }

    const whisperData = await ensureDailyWhisper(userId, zodiacSign);

    res.json({
      success: true,
      data: whisperData
    });
  } catch (err) {
    console.error('[Astrology Daily Error]', err);
    res.status(500).json({ success: false, message: 'Günlük enerji alınamadı.' });
  }
};

/**
 * GET /api/astrology/weekly
 * Generates the deeply personalized Weekly Insight dashboard payload
 */
exports.getWeeklyGuidance = async (req, res) => {
  const userId = req.user.id;

  try {
    // 1. Get User Data
    const userRes = await db.query('SELECT zodiac_sign FROM users WHERE id = $1', [userId]);
    const zodiacSign = userRes.rows[0]?.zodiac_sign;

    if (!zodiacSign) {
      return res.json({
        success: true,
        data: {
          zodiacProfile: null,
          activeEvents: [],
          aiGuidance: 'Doğum tarihini eklediğinde gökyüzü yorumların burada görünecek ✨'
        }
      });
    }

    // 2. Get Zodiac Profile
    const profileRes = await db.query('SELECT * FROM zodiac_profiles WHERE sign = $1', [zodiacSign]);
    const profile = profileRes.rows[0];

    // 3. Get Current Active Events
    const eventsRes = await db.query(
      "SELECT * FROM astrology_events WHERE is_active = true AND CURRENT_TIMESTAMP BETWEEN date_start AND date_end"
    );
    // If no active events, fake one for MVP so the UI doesn't look empty
    const activeEvents = eventsRes.rows.length > 0 ? eventsRes.rows : [{
      event_name: 'Ay Yengeç Burcunda',
      description: 'Duygusal ihtiyaçların ve aidiyet duygun ön planda. Köklenmek ve evine vakit ayırmak sana çok iyi gelecek.'
    }];

    // 4. Get Latest Mood
    const moodRes = await db.query(
      'SELECT mood FROM check_ins WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );
    const recentMood = moodRes.rows[0]?.mood || null;

    // 5. Get Latest Personality Test Result (Color)
    const colorRes = await db.query(
      "SELECT result_data FROM personality_results WHERE user_id = $1 AND test_type = 'color' ORDER BY created_at DESC LIMIT 1",
      [userId]
    );
    const colorResult = colorRes.rows[0]?.result_data || null;

    // 6. Check if we already generated guidance for this week
    const guidanceRes = await db.query(
      "SELECT * FROM weekly_guidance WHERE user_id = $1 AND expires_at > CURRENT_TIMESTAMP ORDER BY generated_at DESC LIMIT 1",
      [userId]
    );

    let finalGuidanceText = '';

    if (guidanceRes.rows.length > 0) {
      finalGuidanceText = guidanceRes.rows[0].guidance_text;
    } else {
      // 7. Fetch recent history for anti-repetition (last 3 weeks)
      const historyRes = await db.query(
        "SELECT guidance_text FROM weekly_guidance WHERE user_id = $1 ORDER BY generated_at DESC LIMIT 3",
        [userId]
      );
      const recentHistory = historyRes.rows.map(r => r.guidance_text);

      // 8. Gather Deep Personal Context
      const personalContext = await gatherPersonalContext(userId);

      // 9. Generate New Synthesis via OpenAI
      const { text, content_hash } = await generateAstrologySynthesis(
        zodiacSign, 
        profile?.element || 'Ateş', 
        activeEvents, 
        recentMood, 
        colorResult, 
        recentHistory,
        personalContext
      );
      finalGuidanceText = text;
      
      const eventSeed = activeEvents.length > 0 ? activeEvents[0].event_name : 'Gökyüzü';

      // Save to database
      await db.query(
        `INSERT INTO weekly_guidance 
        (user_id, zodiac_sign, guidance_text, event_seed, content_hash, expires_at) 
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP + INTERVAL '7 days')`,
        [userId, zodiacSign, finalGuidanceText, eventSeed, content_hash]
      );
    }

    // Try to parse JSON. If it fails, return as plain string (legacy support)
    let parsedGuidance = finalGuidanceText;
    try {
      if (finalGuidanceText.trim().startsWith('{')) {
        parsedGuidance = JSON.parse(finalGuidanceText);
      }
    } catch (e) {
      console.warn('[Astrology] Could not parse guidance text as JSON, sending as string.');
    }

    res.json({
      success: true,
      data: {
        zodiacProfile: profile,
        activeEvents,
        aiGuidance: parsedGuidance
      }
    });

  } catch (err) {
    console.error('[Astrology Weekly Error]', err);
    res.status(500).json({ success: false, message: 'Haftalık enerji analiz edilemedi.' });
  }
};

/**
 * POST /api/astrology/admin/refresh/:userId
 * Admin endpoint to force delete and regenerate a user's weekly guidance cache
 */
exports.refreshWeeklyGuidance = async (req, res) => {
  const targetUserId = req.params.userId;
  
  try {
    // Delete existing cache
    await db.query("DELETE FROM weekly_guidance WHERE user_id = $1", [targetUserId]);
    
    // Call getWeeklyGuidance logic (mocking req/res to reuse it or just return success)
    // To keep it simple, just return success so the app will fetch a fresh one on next load.
    res.json({
      success: true,
      message: `User ${targetUserId}'s weekly guidance cache has been cleared.`
    });
  } catch (err) {
    console.error('[Astrology Admin Error]', err);
    res.status(500).json({ success: false, message: 'Could not refresh cache.' });
  }
};
