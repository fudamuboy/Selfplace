const db = require('../config/db');
const OpenAI = require('openai');
const { ZODIAC_PROFILES } = require('../utils/astrologyProfiles');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * AI Synthesis Engine for Astrology
 */
async function generateAstrologySynthesis(zodiacSign, element, activeEvents, recentMood, colorResult) {
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

CRITICAL RULES:
1. NO GENERIC ASTROLOGY: You must write specifically in the style and psychological tone of ${zodiacSign}. Do not sound like a generic horoscope.
2. NO BANNED CLICHES: Never use phrases like "kendine karşı nazik ol", "güvenlik ihtiyacın artabilir", "topraklanma zamanı", "iç sesini dinle".
3. NO FORTUNE TELLING: Do not predict the future (e.g. "A new job is coming"). Focus purely on emotional reflection and symbolic guidance based on the current sky and their mood.
4. TONE: Premium, subtle, empathetic, and human-written. Keep it emotionally intelligent but NOT overwhelming or excessively poetic. Do NOT sound like an AI generating endless paragraphs.
5. LENGTH: 2 to 3 concise, naturally flowing sentences. Give the user emotional breathing space.
6. LANGUAGE: Turkish.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: systemPrompt }],
      temperature: 0.8,
    });

    return completion.choices[0].message.content;
  } catch (err) {
    console.error('[Astrology AI Error]', err);
    // Silent fallback if API fails
    return `Sevgili ${zodiacSign}, gökyüzündeki mevcut enerjiler şu an iç dünyanda önemli dönüşümlere işaret ediyor. Kendi ritminde kalmaya özen göster.`;
  }
}

/**
 * GET /api/astrology/home
 * Lightweight widget data for the home screen
 */
exports.getHomeWidget = async (req, res) => {
  const userId = req.user.id;

  try {
    // 1. Get user's zodiac sign
    const userRes = await db.query('SELECT zodiac_sign FROM users WHERE id = $1', [userId]);
    const zodiacSign = userRes.rows[0]?.zodiac_sign;

    if (!zodiacSign) {
      return res.json({
        success: true,
        data: null // They haven't set their birthday yet
      });
    }

    // 2. Fetch current active astrology event
    const eventsRes = await db.query(
      "SELECT event_name, description FROM astrology_events WHERE is_active = true AND CURRENT_TIMESTAMP BETWEEN date_start AND date_end ORDER BY date_start ASC LIMIT 1"
    );
    
    // Fallback static event if nothing matches current date in DB
    const event = eventsRes.rows.length > 0 ? eventsRes.rows[0] : {
      event_name: 'Gökyüzü Dingin',
      description: 'Gezegenler sakin seyrinde. İçsel huzuruna odaklanmak için harika bir gün.'
    };

    res.json({
      success: true,
      data: {
        zodiacSign,
        event_name: event.event_name,
        preview_text: `Bugün ${event.event_name} etkisinde ${zodiacSign} enerjin ön planda. ${event.description.substring(0, 50)}...`
      }
    });

  } catch (err) {
    console.error('[Astrology Home Error]', err);
    res.status(500).json({ success: false, message: 'Enerji alınamadı.' });
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
      return res.status(400).json({ success: false, message: 'Doğum tarihi bulunamadı.' });
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
      // 7. Generate New Synthesis via OpenAI
      finalGuidanceText = await generateAstrologySynthesis(zodiacSign, profile?.element || 'Ateş', activeEvents, recentMood, colorResult);
      
      // Save to database
      await db.query(
        "INSERT INTO weekly_guidance (user_id, zodiac_sign, guidance_text, expires_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP + INTERVAL '7 days')",
        [userId, zodiacSign, finalGuidanceText]
      );
    }

    res.json({
      success: true,
      data: {
        zodiacProfile: profile,
        activeEvents,
        aiGuidance: finalGuidanceText
      }
    });

  } catch (err) {
    console.error('[Astrology Weekly Error]', err);
    res.status(500).json({ success: false, message: 'Haftalık enerji analiz edilemedi.' });
  }
};
