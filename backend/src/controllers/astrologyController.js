const db = require('../config/db');

/**
 * Mocks an AI synthesis engine based on user context.
 * In a production env, this string would be generated via OpenAI/Gemini.
 */
function generateMockAISynthesis(zodiacSign, element, activeEvents, recentMood, colorResult) {
  let intro = `Sevgili ${zodiacSign}, gökyüzünde şu an ${activeEvents.map(e => e.event_name).join(' ve ')} enerjileri hakim.`;
  
  let moodReflection = '';
  if (recentMood) {
    if (['Huzurlu', 'Mutlu', 'Enerjik'].includes(recentMood)) {
      moodReflection = ` İçindeki bu dingin ve pozitif enerji, gökyüzünün sana sunduğu potansiyeli en iyi şekilde kullanmanı sağlıyor.`;
    } else if (['Yorgun', 'Kaygılı', 'Hüzünlü'].includes(recentMood)) {
      moodReflection = ` Son günlerde hissettiğin o tatlı yorgunluk ve içe dönme isteği, aslında ruhunun dinlenmek için senden izin istemesi.`;
    } else {
      moodReflection = ` İç dünyanda hissettiğin dalgalanmalar, evrenin doğal ritmiyle tamamen uyum içinde.`;
    }
  }

  let elementReflection = '';
  if (element === 'Su') elementReflection = ` Su elementinin derin sezgileri, bu dönemde rasyonel zihninden çok kalbinin sesine güvenmen gerektiğini fısıldıyor.`;
  else if (element === 'Toprak') elementReflection = ` Toprak elementinin o sağlam kökleri, fırtınalar ne kadar sert olursa olsun seni güvende tutuyor.`;
  else if (element === 'Ateş') elementReflection = ` Ateş elementinin getirdiği o yüksek yaşam coşkusu, önündeki tüm engelleri birer basamağa dönüştürüyor.`;
  else if (element === 'Hava') elementReflection = ` Hava elementinin berrak zihni, karmaşık görünen olayların ardındaki asıl resmi görmeni kolaylaştırıyor.`;

  let eventReflection = '';
  if (activeEvents.length > 0) {
    eventReflection = ` Özellike ${activeEvents[0].event_name} etkisiyle; ${activeEvents[0].description.toLowerCase()}`;
  }

  let colorReflection = '';
  if (colorResult) {
    colorReflection = ` Baskın olan ${colorResult.dominantColor} enerjin, bu süreçte senin en büyük içsel pusulan olacak.`;
  }

  return `${intro}${moodReflection}${elementReflection}${eventReflection}${colorReflection} Kendine karşı nazik olmayı unutma. 🌿`;
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
      // 7. Generate New Synthesis (Simulating AI via rules for MVP)
      finalGuidanceText = generateMockAISynthesis(zodiacSign, profile?.element || 'Ateş', activeEvents, recentMood, colorResult);
      
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
