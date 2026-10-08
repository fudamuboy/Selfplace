const crypto = require('crypto');
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const db = require('../config/db');
const { ZODIAC_PROFILES } = require('../utils/astrologyProfiles');
const {
  ZODIAC_NAME_MAP,
  ZODIAC_PROFILE_EN_MAP,
  toCanonicalTurkishZodiac,
  toCanonicalEnglishZodiac,
  getZodiacFromDate,
  translateAstrologyEventName,
  translateAstrologyEvent,
  translateZodiacProfile
} = require('../utils/astrologyLocalization');
const { getLanguage } = require('../utils/languageResolver');

const ZODIAC_EN_MAP = ZODIAC_NAME_MAP;

async function resolveUserZodiac(userId) {
  const userRes = await db.query('SELECT zodiac_sign, birth_date FROM users WHERE id = $1', [userId]);
  const user = userRes.rows[0];
  if (!user) return null;

  let zodiacSign = user.zodiac_sign;
  if (!zodiacSign && user.birth_date) {
    zodiacSign = getZodiacFromDate(user.birth_date);
    if (zodiacSign) {
      db.query('UPDATE users SET zodiac_sign = $1 WHERE id = $2', [zodiacSign, userId]).catch(() => {});
    }
  }

  return zodiacSign ? toCanonicalTurkishZodiac(zodiacSign) : null;
}

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

const EMOTIONAL_WEATHER = ['sunny', 'gentle_rain', 'soft_clouds', 'clear_sky', 'starlight'];

function getLocalFallbackWhisper(zodiacSign, timeOfDay, isEn = false) {
  const signLabel = isEn ? (ZODIAC_EN_MAP[zodiacSign] || zodiacSign) : zodiacSign;
  const fallbacksTR = {
    morning: [
      `Güne başlarken ${signLabel} enerjisi seni biraz daha kendi merkezine çekiyor olabilir. Sessizliği dinlemek iyi gelebilir.`,
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

  const fallbacksEN = {
    morning: [
      `As the day begins, the energy of ${signLabel} might be gently pulling you toward your center. Listening to the quiet feels grounding.`,
      `Your mind may feel a bit clearer and hopeful today. Try taking your steps gently.`,
      `Finding your own rhythm in the morning stillness can transform the rest of your day.`
    ],
    afternoon: [
      `As daytime fatigue accumulates, taking a brief moment to breathe will help restore your energy.`,
      `In the midday rush, notice the value of small connections. Sometimes a smile changes everything.`,
      `Right now, the clouds of thought in your mind seem ready to gently disperse.`
    ],
    evening: [
      `With the arrival of evening, you might want to extend a little extra softness to yourself. Protecting your boundaries is comforting.`,
      `As the day slows down, you might long to feel emotionally safe and sheltered.`,
      `You worked hard today. Now is the time to retreat into a calm space that belongs only to you.`
    ],
    night: [
      `As night sets in, try letting go of today's weight. The stars support your serenity.`,
      `These are the hours when thoughts run deep. Perhaps it is best to leave certain questions for tomorrow.`,
      `In the quiet darkness of night, focus on feeling that quiet hope that is uniquely yours.`
    ]
  };

  const pool = isEn ? fallbacksEN[timeOfDay] || fallbacksEN['afternoon'] : fallbacksTR[timeOfDay] || fallbacksTR['afternoon'];
  return pool[Math.floor(Math.random() * pool.length)];
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
      awarenessScore: 50
    };

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
      
      const stressKeywords = ['Yorgun', 'Kaygılı', 'Kızgın', 'Stresli', 'Bunalmış', 'Üzgün', 'Öfkeli', 'Tükenmiş', 'Korkmuş', 'Tired', 'Anxious', 'Angry'];
      context.stressIndicators = context.dominantThemes.filter(e => stressKeywords.includes(e));
    }

    const insightRes = await db.query(
      `SELECT text FROM weekly_insights WHERE user_id = $1 ORDER BY generated_at DESC LIMIT 1`,
      [userId]
    );
    if (insightRes.rows.length > 0) {
      context.weeklyInsight = insightRes.rows[0].text;
      context.growthThemes.push('Genel kişisel analiz çıkarımları aktif');
    }

    const journalRes = await db.query(
      `SELECT prompt, content, emotion 
       FROM emotional_entries 
       WHERE user_id = $1 AND source_type = 'journal' AND created_at > CURRENT_TIMESTAMP - INTERVAL '14 days'
       ORDER BY created_at DESC LIMIT 3`,
      [userId]
    );
    
    if (journalRes.rows.length > 0) {
      context.journalThemes = journalRes.rows.map(r => r.prompt || r.emotion || 'Günlük Girdisi');
      
      const relationKeywords = ['partner', 'ilişki', 'sevgili', 'aşk', 'evlilik', 'kavga', 'iletişim', 'relationship', 'friend'];
      const textCorpus = journalRes.rows.map(r => (r.content || '').toLowerCase()).join(' ');
      
      const foundRelations = relationKeywords.filter(k => textCorpus.includes(k));
      if (foundRelations.length > 0) {
        context.relationshipReflections = foundRelations;
      }
    }

    const totalReflections = await db.query(
      `SELECT COUNT(*) FROM emotional_entries WHERE user_id = $1`, [userId]
    );
    const count = parseInt(totalReflections.rows[0].count);
    context.awarenessScore = Math.min(100, Math.max(10, count * 2));

    return context;
  } catch (err) {
    console.error('[Astrology Context Gather Error]', err);
    return null;
  }
}

/**
 * AI Synthesis Engine for Astrology (Weekly)
 */
async function generateAstrologySynthesis(zodiacSign, element, activeEvents, recentMood, colorResult, recentHistory = [], personalContext = null, language = 'tr') {
  const isEn = language === 'en';
  try {
    const profile = ZODIAC_PROFILES[zodiacSign] || ZODIAC_PROFILES["Ateş"];
    
    let dossier = `[USER CONTEXT]\nZodiac Sign: ${zodiacSign} (${ZODIAC_EN_MAP[zodiacSign] || zodiacSign})\n`;
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
Your goal is to write a deeply personal, emotionally intelligent, and psychologically nuanced weekly reflection for the user in ${isEn ? 'ENGLISH' : 'TURKISH'}.

${dossier}

[ZODIAC PSYCHOLOGICAL PROFILE: ${zodiacSign}]
Core Traits: ${profile.core}
Inner Conflict: ${profile.emotionalConflict}
Stress Behavior: ${profile.stressBehavior}
Relational Style: ${profile.relationalTendency}
Writing Rhythm: ${profile.writingStyle}
${historyConstraint}
CRITICAL RULES:
1. NO GENERIC ASTROLOGY: You must write specifically in the style and psychological tone of ${zodiacSign}. Do not sound like a generic horoscope.
2. NO BANNED CLICHES: Never use generic horoscope cliches like "be gentle with yourself", "listen to your inner voice", "new opportunities await". Be intimate and observant.
3. NO FORTUNE TELLING: Do not predict the future. Focus purely on emotional reflection and symbolic guidance based on the current sky and their mood.
4. TONE: Premium, subtle, empathetic, intimate, atmospheric, and human-written in ${isEn ? 'ENGLISH' : 'TURKISH'}.
5. LANGUAGE: ${isEn ? 'ENGLISH (en)' : 'TURKISH (tr)'}.
6. OUTPUT FORMAT: You MUST return ONLY a valid JSON object with the following exact keys (no extra text, no markdown blocks). Write 1-2 concise, flowing sentences per category in ${isEn ? 'ENGLISH' : 'TURKISH'}:
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
    const fallbackSign = isEn ? (ZODIAC_EN_MAP[zodiacSign] || zodiacSign) : (zodiacSign || 'Dostum');
    const text = JSON.stringify({
      GeneralTheme: isEn 
        ? `Dear ${fallbackSign}, the current energies in the sky highlight meaningful transformations in your inner world. Take care to stay in your own rhythm.`
        : `Sevgili ${zodiacSign || 'Dostum'}, gökyüzündeki mevcut enerjiler şu an iç dünyanda önemli dönüşümlere işaret ediyor. Kendi ritminde kalmaya özen göster.`,
      Love: isEn 
        ? "Give yourself and your loved ones space to communicate with calm understanding."
        : "Kendine ve sevdiklerine sakin bir anlayışla iletişim kurma alanı tanı.",
      Career: isEn 
        ? "Focus on steady, intentional progress rather than rushing decisions."
        : "Kararları aceleye getirmek yerine istikrarlı ve bilinçli ilerlemeye odaklan.",
      Money: isEn 
        ? "A mindful approach to resources brings inner peace and stability."
        : "Kaynaklarına özenli yaklaşmak içsel huzur ve denge getirir.",
      SocialLife: isEn 
        ? "Meaningful quality matters more than crowded interactions right now."
        : "Kalabalık etkileşimler yerine derin ve samimi paylaşımlar sana daha iyi gelecektir.",
      HealthEnergy: isEn 
        ? "Listen to what your body is asking for: rest, hydration, and gentle movement."
        : "Bedeninin ihtiyaçlarına kulak ver: dinlenme, su ve nazik hareketler.",
      AttentionAreas: isEn 
        ? "Be mindful of reacting impulsively when feeling emotionally fatigued."
        : "Duygusal olarak yorgun hissettiğinde fevri tepkiler vermemeye dikkat et.",
      LuckyAreas: isEn 
        ? "Moments of quiet clarity and honest reflection bring genuine luck."
        : "Sessiz netlik anları ve kendine dürüstlük gerçek bir şans kapısı aralar.",
      WeeklyAdvice: isEn 
        ? "Take things one breath at a time; you do not need to solve everything today."
        : "Her şeyi adım adım ele al; bugün her şeyi çözmek zorunda değilsin."
    });
    return { text, content_hash: crypto.createHash('sha256').update(text).digest('hex') };
  }
}

/**
 * AI Synthesis Engine for Astrology (Daily Whisper)
 */
async function generateDailyWhisper(zodiacSign, element, activeEvents, recentMood, recentHistory = [], language = 'tr') {
  const isEn = language === 'en';
  const timeOfDay = getTimeOfDay();
  const weather = EMOTIONAL_WEATHER[Math.floor(Math.random() * EMOTIONAL_WEATHER.length)];

  try {
    let dossier = `[USER CONTEXT]\nZodiac Sign: ${zodiacSign} (${ZODIAC_EN_MAP[zodiacSign] || zodiacSign})\nElement: ${element}\nTime of Day: ${timeOfDay}\nEmotional Weather Target: ${weather}\n`;
    
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
Your goal is to write a highly atmospheric, short, and poetic daily observation for the user in ${isEn ? 'ENGLISH' : 'TURKISH'}.

${dossier}
${historyConstraint}
CRITICAL RULES:
1. FOCUS ON TIME & WEATHER: Tailor the observation subtly to "${timeOfDay}" and "${weather}".
2. NO GENERIC ASTROLOGY: Do not use horoscope cliches. Be intimate, observant, softly human.
3. LENGTH: Maximum 2 sentences. Around 30-60 words. Keep it elegant and quickly readable.
4. TONE: Atmospheric, calm, poetic, soft. 
5. LANGUAGE: ${isEn ? 'ENGLISH (en)' : 'TURKISH (tr)'}.`;

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
    const text = getLocalFallbackWhisper(zodiacSign, timeOfDay, isEn);
    return { text, content_hash: crypto.createHash('sha256').update(text).digest('hex'), weather: 'calm' };
  }
}

async function ensureDailyWhisper(userId, zodiacSign, language = 'tr') {
  const isEn = language === 'en';
  const whisperRes = await db.query(
    "SELECT * FROM daily_whisper WHERE user_id = $1 AND language = $2 AND language IS NOT NULL AND expires_at > CURRENT_TIMESTAMP ORDER BY generated_at DESC LIMIT 1",
    [userId, language]
  );

  if (whisperRes.rows.length > 0 && whisperRes.rows[0].language === language) {
    return {
      whisperText: whisperRes.rows[0].whisper_text,
      weather: whisperRes.rows[0].emotional_weather,
      generatedAt: whisperRes.rows[0].generated_at,
      isNew: false
    };
  }

  const canonicalSign = toCanonicalTurkishZodiac(zodiacSign);
  const profileRes = await db.query('SELECT element FROM zodiac_profiles WHERE sign = $1', [canonicalSign]);
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

  const historyRes = await db.query(
    "SELECT whisper_text FROM daily_whisper WHERE user_id = $1 ORDER BY generated_at DESC LIMIT 7",
    [userId]
  );
  const recentHistory = historyRes.rows.map(r => r.whisper_text);

  const { text, content_hash, weather } = await generateDailyWhisper(canonicalSign, element, activeEvents, recentMood, recentHistory, language);

  await db.query(
    `INSERT INTO daily_whisper 
    (user_id, zodiac_sign, whisper_text, mood_context, emotional_weather, content_hash, expires_at, language) 
    VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP + INTERVAL '24 hours', $7)`,
    [userId, canonicalSign, text, recentMood, weather, content_hash, language]
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
  const lang = getLanguage(req);
  const isEn = lang === 'en';

  try {
    const zodiacSign = await resolveUserZodiac(userId);

    if (!zodiacSign) {
      return res.json({
        success: true,
        data: {
          zodiacSign: null,
          userZodiac: null,
          event_name: isEn ? 'The Sky' : 'Gökyüzü',
          preview_text: isEn 
            ? 'Your sky observations will appear here once you add your date of birth ✨'
            : 'Doğum tarihini eklediğinde gökyüzü yorumların burada görünecek ✨'
        }
      });
    }

    const whisperData = await ensureDailyWhisper(userId, zodiacSign, lang);

    const eventsRes = await db.query(
      "SELECT event_name FROM astrology_events WHERE is_active = true AND CURRENT_TIMESTAMP BETWEEN date_start AND date_end ORDER BY date_start ASC LIMIT 1"
    );
    const rawEventName = eventsRes.rows.length > 0 ? eventsRes.rows[0].event_name : (isEn ? 'Sky Serenity' : 'Gökyüzü Dingin');
    const eventName = translateAstrologyEventName(rawEventName, isEn);

    const responseData = {
      success: true,
      data: {
        zodiacSign: isEn ? (toCanonicalEnglishZodiac(zodiacSign) || zodiacSign) : zodiacSign,
        event_name: eventName,
        preview_text: whisperData.whisperText,
        generatedAt: whisperData.generatedAt,
      }
    };
    
    res.json(responseData);
  } catch (err) {
    console.error('[Astrology Home Error]', err);
    res.status(500).json({ success: false, message: isEn ? 'Could not load energy.' : 'Enerji alınamadı.' });
  }
};

/**
 * GET /api/astrology/daily
 * Daily emotional whisper engine
 */
exports.getDailyWhisper = async (req, res) => {
  const userId = req.user.id;
  const lang = getLanguage(req);
  const isEn = lang === 'en';

  try {
    const zodiacSign = await resolveUserZodiac(userId);

    if (!zodiacSign) {
      return res.json({
        success: true,
        data: { 
          whisperText: isEn 
            ? 'Your daily energies will appear here once you add your date of birth ✨'
            : 'Doğum tarihini eklediğinde günlük enerjilerin burada görünecek ✨' 
        }
      });
    }

    const whisperData = await ensureDailyWhisper(userId, zodiacSign, lang);

    res.json({
      success: true,
      data: whisperData
    });
  } catch (err) {
    console.error('[Astrology Daily Error]', err);
    res.status(500).json({ success: false, message: isEn ? 'Could not load daily energy.' : 'Günlük enerji alınamadı.' });
  }
};

/**
 * GET /api/astrology/weekly
 * Generates the deeply personalized Weekly Insight dashboard payload
 */
exports.getWeeklyGuidance = async (req, res) => {
  const userId = req.user.id;
  const lang = getLanguage(req);
  const isEn = lang === 'en';

  try {
    const zodiacSign = await resolveUserZodiac(userId);

    if (!zodiacSign) {
      return res.json({
        success: true,
        data: {
          zodiacProfile: null,
          activeEvents: [],
          aiGuidance: isEn 
            ? 'Your sky observations will appear here once you add your date of birth ✨'
            : 'Doğum tarihini eklediğinde gökyüzü yorumların burada görünecek ✨'
        }
      });
    }

    const profileRes = await db.query('SELECT * FROM zodiac_profiles WHERE sign = $1', [zodiacSign]);
    let profile = profileRes.rows[0];
    if (!profile) {
      profile = {
        sign: zodiacSign,
        element: 'Ateş',
        modality: 'Öncü',
        ruling_planet: 'Mars',
        strengths: ['Cesaret', 'Liderlik'],
        weaknesses: ['Sabırsızlık'],
        core_needs: 'Harekete geçmek.',
        stress_response: 'Stres altında sabırsız olabilir.'
      };
    }

    const eventsRes = await db.query(
      "SELECT * FROM astrology_events WHERE is_active = true AND CURRENT_TIMESTAMP BETWEEN date_start AND date_end"
    );
    const activeEvents = eventsRes.rows.length > 0 ? eventsRes.rows : [{
      event_name: isEn ? 'Moon in Cancer' : 'Ay Yengeç Burcunda',
      description: isEn 
        ? 'Emotional needs and a sense of belonging come into focus. Grounding yourself and dedicating time to home will feel deeply restoring.'
        : 'Duygusal ihtiyaçların ve aidiyet duygun ön planda. Köklenmek ve evine vakit ayırmak sana çok iyi gelecek.'
    }];

    const moodRes = await db.query(
      'SELECT mood FROM check_ins WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );
    const recentMood = moodRes.rows[0]?.mood || null;

    const colorRes = await db.query(
      "SELECT result_data, test_type FROM personality_results WHERE user_id = $1 AND test_type IN ('color', 'journey') ORDER BY created_at DESC LIMIT 1",
      [userId]
    );
    let colorResult = null;
    if (colorRes.rows.length > 0) {
      const row = colorRes.rows[0];
      const p = row.result_data;
      if (row.test_type === 'journey') {
        colorResult = {
          dominantColor: p.color_family?.hex || p.dominant_color || '#B3B3B3',
          title: p.color_family?.name || 'Bilinmiyor'
        };
      } else {
        colorResult = p;
      }
    }

    const guidanceRes = await db.query(
      "SELECT * FROM weekly_guidance WHERE user_id = $1 AND language = $2 AND language IS NOT NULL AND expires_at > CURRENT_TIMESTAMP ORDER BY generated_at DESC LIMIT 1",
      [userId, lang]
    );

    let finalGuidanceText = '';

    if (guidanceRes.rows.length > 0 && guidanceRes.rows[0].language === lang) {
      finalGuidanceText = guidanceRes.rows[0].guidance_text;
    } else {
      const historyRes = await db.query(
        "SELECT guidance_text FROM weekly_guidance WHERE user_id = $1 ORDER BY generated_at DESC LIMIT 3",
        [userId]
      );
      const recentHistory = historyRes.rows.map(r => r.guidance_text);
      const personalContext = await gatherPersonalContext(userId);

      const { text, content_hash } = await generateAstrologySynthesis(
        zodiacSign, 
        profile?.element || 'Ateş', 
        activeEvents, 
        recentMood, 
        colorResult, 
        recentHistory,
        personalContext,
        lang
      );
      finalGuidanceText = text;
      
      const eventSeed = activeEvents.length > 0 ? activeEvents[0].event_name : 'Gökyüzü';

      await db.query(
        `INSERT INTO weekly_guidance 
        (user_id, zodiac_sign, guidance_text, event_seed, content_hash, expires_at, language) 
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP + INTERVAL '7 days', $6)`,
        [userId, zodiacSign, finalGuidanceText, eventSeed, content_hash, lang]
      );
    }

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
        zodiacProfile: translateZodiacProfile(profile, isEn),
        activeEvents: (activeEvents || []).map(e => translateAstrologyEvent(e, isEn)),
        aiGuidance: parsedGuidance
      }
    });

  } catch (err) {
    console.error('[Astrology Weekly Error]', err);
    res.status(500).json({ success: false, message: isEn ? 'Could not analyze weekly guidance.' : 'Haftalık enerji analiz edilemedi.' });
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
