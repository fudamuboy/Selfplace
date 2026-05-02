const db = require('../config/db');
const { generateWeeklyInsight, generateDailyReflection } = require('../services/aiService');

// ---------------------------------------------------------------------------
// Fallbacks
// ---------------------------------------------------------------------------

const DAILY_FALLBACKS = [
  "Bugün kendine biraz daha nazik davranman gerekmiş olabilir.",
  "Bugün kısa bir mola vermek sana iyi gelebilir.",
  "Bugün duygularını fark etmek için küçük bir alan açabilirsin.",
  "Zihnindeki düşüncelerin sadece birer bulut gibi geçip gitmesine izin ver.",
  "Küçük bir adımın, büyük değişimlerin başlangıcı olabileceğini hatırla."
];

function getRandomDailyFallback() {
  return DAILY_FALLBACKS[Math.floor(Math.random() * DAILY_FALLBACKS.length)];
}

/**
 * Rule-based fallback for weekly insight – deterministic.
 */
function ruleBasedWeekly(checkIns, cardResponses) {
  if (checkIns.length < 2) {
    return "Kendini tanıma yolculuğun küçük adımlarla başlar. Birkaç check-in sonrası burada sana küçük içgörüler göstereceğim.";
  }

  const favCategory = cardResponses
    .filter(r => r.response === 'Deneyeceğim')
    .reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + 1;
      return acc;
    }, {});

  const topCategory = Object.keys(favCategory).reduce(
    (a, b) => (favCategory[a] > favCategory[b] ? a : b),
    null
  );

  const moodCounts = checkIns.reduce((acc, curr) => {
    acc[curr.mood] = (acc[curr.mood] || 0) + 1;
    return acc;
  }, {});
  const topMood = Object.keys(moodCounts).reduce(
    (a, b) => (moodCounts[a] > moodCounts[b] ? a : b),
    'Sakin'
  );

  if (topCategory === 'Küçük Cesaret') {
    return "Bu hafta yeni adımlar atmaya daha açık olmuş olabilirsin. Küçük cesaret anlarının sana iyi geldiği görünüyor.";
  } else if (topCategory === 'Dinlenme') {
    return "Son günlerde dinlenme ihtiyacı daha belirgin hale gelmiş olabilir. Kendine mola vermenin değerli olduğunu fark etmiş olabilirsin.";
  } else if (topCategory === 'Öz-Şefkat') {
    return "Kendine karşı daha yumuşak olduğun anlar bu hafta öne çıkmış olabilir. İç sesinin biraz daha sakinleştiği görünüyor.";
  } else if (topMood === 'Yorgun') {
    return "Bu hafta bedenin biraz daha fazla sessizliğe ihtiyaç duymuş olabilir. Kendini dinleme isteğinin arttığı bir dönemden geçiyor olabilirsin.";
  } else if (topMood === 'Mutlu') {
    return "Haftanın genelinde enerjinin biraz daha yükseldiğini hissetmiş olabilirsin. Yaşamın ritmine daha kolay uyum sağladığın görünüyor.";
  } else {
    return "Bu hafta kendine biraz daha alan açmaya ihtiyaç duymuş olabilirsin. Sakinlik ve denge arayışı bu günlerde daha görünür görünüyor.";
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchUserWeeklyData(userId) {
  const [checkInsRes, cardRes] = await Promise.all([
    db.query(
      `SELECT mood, reflection_question, note, created_at
       FROM check_ins
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '7 days'
       ORDER BY created_at ASC`,
      [userId]
    ),
    db.query(
      `SELECT category, response
       FROM card_responses
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '7 days'`,
      [userId]
    ),
  ]);

  return {
    checkIns:      checkInsRes.rows,
    cardResponses: cardRes.rows,
  };
}

// ---------------------------------------------------------------------------
// GET /api/reflections/daily
// ---------------------------------------------------------------------------

exports.getDailyReflection = async (req, res) => {
  const userId = req.user.id;
  
  try {
    // 1. Check if reflection exists for today
    const existing = await db.query(
      'SELECT text FROM daily_reflections WHERE user_id = $1 AND created_at = CURRENT_DATE LIMIT 1',
      [userId]
    );

    if (existing.rows.length > 0) {
      return res.json({ reflection: existing.rows[0].text, source: 'cache' });
    }

    // 2. Generate new one
    let reflection;
    let source = 'ai';

    try {
      reflection = await generateDailyReflection();
      // Store in DB
      await db.query(
        'INSERT INTO daily_reflections (user_id, text) VALUES ($1, $2) ON CONFLICT (user_id, created_at) DO NOTHING',
        [userId, reflection]
      );
    } catch (aiErr) {
      console.error('[insightController] Daily AI failed, using fallback:', aiErr.message);
      reflection = getRandomDailyFallback();
      source = 'fallback';
    }

    res.json({ reflection, source });

  } catch (err) {
    console.error('[insightController] getDailyReflection error:', err.message);
    res.status(500).json({ message: 'Günlük yansıma oluşturulurken bir hata oluştu.' });
  }
};

// ---------------------------------------------------------------------------
// GET /api/insights/weekly
// ---------------------------------------------------------------------------

exports.getWeeklyInsight = async (req, res) => {
  const userId = req.user.id;

  try {
    // 1. Check if insight exists (less than 7 days old)
    const existing = await db.query(
      'SELECT text, generated_at FROM weekly_insights WHERE user_id = $1 ORDER BY generated_at DESC LIMIT 1',
      [userId]
    );

    if (existing.rows.length > 0) {
      const lastGenerated = new Date(existing.rows[0].generated_at);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      if (lastGenerated > sevenDaysAgo) {
        return res.json({ insight: existing.rows[0].text, source: 'cache' });
      }
    }

    // 2. Generate new one
    const userData = await fetchUserWeeklyData(userId);
    const { checkIns, cardResponses } = userData;

    // Not enough data fallback
    if (checkIns.length < 2) {
      return res.json({
        insight: "Kendini tanıma yolculuğun küçük adımlarla başlar. Birkaç check-in sonrası burada sana küçük içgörüler göstereceğim.",
        source: 'placeholder',
      });
    }

    let insight;
    let source = 'ai';

    try {
      insight = await generateWeeklyInsight(userData);
      // Store in DB
      await db.query(
        'INSERT INTO weekly_insights (user_id, text) VALUES ($1, $2)',
        [userId, insight]
      );
    } catch (aiErr) {
      console.error('[insightController] Weekly AI failed, using fallback:', aiErr.message);
      insight = ruleBasedWeekly(checkIns, cardResponses);
      source = 'rule-fallback';
    }

    res.json({ insight, source });

  } catch (err) {
    console.error('[insightController] getWeeklyInsight error:', err.message);
    res.status(500).json({ message: 'İçgörü oluşturulurken bir hata oluştu.' });
  }
};

// ---------------------------------------------------------------------------
// GET /api/insights/stats
// ---------------------------------------------------------------------------

exports.getStats = async (req, res) => {
  const userId = req.user.id;

  try {
    const { checkIns } = await fetchUserWeeklyData(userId);
    
    const count = checkIns.length;
    
    let topMood = null;
    if (count > 0) {
      const moodCounts = checkIns.reduce((acc, curr) => {
        acc[curr.mood] = (acc[curr.mood] || 0) + 1;
        return acc;
      }, {});
      topMood = Object.keys(moodCounts).reduce(
        (a, b) => (moodCounts[a] > moodCounts[b] ? a : b)
      );
    }

    res.json({
      checkInCount: count,
      topMood: topMood
    });

  } catch (err) {
    console.error('[insightController] getStats error:', err.message);
    res.status(500).json({ message: 'İstatistikler alınırken bir hata oluştu.' });
  }
};
// ---------------------------------------------------------------------------
// GET /api/insights/patterns
// ---------------------------------------------------------------------------

exports.getPatterns = async (req, res) => {
  const userId = req.user.id;

  try {
    // 1. Fetch data from last 14 days
    const [checkInsRes, cardRes] = await Promise.all([
      db.query(
        `SELECT mood, note, created_at
         FROM check_ins
         WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '14 days'`,
        [userId]
      ),
      db.query(
        `SELECT category, response
         FROM card_responses
         WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '14 days'`,
        [userId]
      ),
    ]);

    const checkIns = checkInsRes.rows;
    const cardResponses = cardRes.rows;

    if (checkIns.length < 3) {
      return res.json({
        patterns: [],
        checkInCount: checkIns.length,
        message: "Kendini anlamaya başlıyorsun...",
        subtitle: "Devam ettikçe seni daha iyi anlayacak."
      });
    }

    const patterns = [];

    // --- Logic for Mood Patterns ---
    const moodCounts = checkIns.reduce((acc, curr) => {
      acc[curr.mood] = (acc[curr.mood] || 0) + 1;
      return acc;
    }, {});

    const entriesCount = checkIns.length;
    
    if (moodCounts['Sakin'] > entriesCount * 0.4) {
      const variations = [
        "Sakin hissettiğin anlar bu hafta daha fazla öne çıkmış olabilir.",
        "İç huzuru bulduğun anlar son zamanlarda daha sık uğramış görünüyor.",
        "Sakinlik teması son günlerinde daha belirgin hale gelmiş olabilir."
      ];
      patterns.push(variations[Math.floor(Math.random() * variations.length)]);
    }

    if (moodCounts['Yorgun'] > entriesCount * 0.4) {
      const variations = [
        "Yorgunluk teması son check-inlerinde biraz daha görünür olmuş olabilir.",
        "Bu günlerde bedenin veya zihnin biraz daha fazla dinlenmeye ihtiyaç duyuyor olabilir.",
        "Son zamanlarda enerjinin biraz düşük olduğu anlar daha çok dikkat çekmiş görünüyor."
      ];
      patterns.push(variations[Math.floor(Math.random() * variations.length)]);
    }

    if (Object.keys(moodCounts).length >= 4) {
      const variations = [
        "Son günlerde enerjinin biraz dalgalı olduğu görünüyor olabilir.",
        "Duygularının biraz daha değişken olduğu bir dönemden geçiyor olabilirsin.",
        "Farklı duyguların iç içe geçtiği bir hafta olmuş olabilir."
      ];
      patterns.push(variations[Math.floor(Math.random() * variations.length)]);
    }

    // --- Logic for Card Interactions ---
    const favoriteCategory = cardResponses
      .filter(r => r.response === 'Deneyeceğim')
      .reduce((acc, curr) => {
        acc[curr.category] = (acc[curr.category] || 0) + 1;
        return acc;
      }, {});

    const topCategory = Object.keys(favoriteCategory).reduce(
      (a, b) => (favoriteCategory[a] > favoriteCategory[b] ? a : b),
      null
    );

    if (topCategory === 'Dinlenme') {
      const variations = [
        "Dinlenme davetlerine daha açık olduğun bir dönemden geçiyor olabilirsin.",
        "Durup nefes alma ihtiyacı son zamanlarda daha çok karşılık bulmuş görünüyor.",
        "Kendine mola verme teması senin için daha öncelikli hale gelmiş olabilir."
      ];
      patterns.push(variations[Math.floor(Math.random() * variations.length)]);
    }

    if (topCategory === 'Küçük Cesaret') {
      const variations = [
        "Küçük cesaret kartları sende daha fazla karşılık bulmuş olabilir.",
        "Yeni adımlar atma isteği son günlerde daha görünür olmuş görünüyor.",
        "Kendine doğru küçük ama cesur adımlar attığın bir hafta olmuş olabilir."
      ];
      patterns.push(variations[Math.floor(Math.random() * variations.length)]);
    }

    // --- Journaling Patterns (Simple keyword check) ---
    const allNotes = checkIns.map(c => c.note).filter(Boolean).join(' ').toLowerCase();
    if (allNotes.includes('zaman') || allNotes.includes('alan')) {
      const variations = [
        "Kendine alan açma teması son zamanlarda daha çok karşına çıkmış olabilir.",
        "Zamanı kendine ayırma isteği düşüncelerinde daha sık yer bulmuş görünüyor.",
        "Kendinle baş başa kalma ihtiyacı son notlarında daha görünür olmuş olabilir."
      ];
      patterns.push(variations[Math.floor(Math.random() * variations.length)]);
    }

    // Limit to 3 patterns and ensure variation
    const selectedPatterns = patterns
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);

    res.json({
      patterns: selectedPatterns,
      message: selectedPatterns.length === 0 ? "Biraz daha paylaştıkça burada sana özel küçük farkındalıklar oluşacak ✨" : null,
      subtitle: selectedPatterns.length === 0 ? "Devam ettikçe seni daha iyi anlayacak." : null
    });

  } catch (err) {
    console.error('[insightController] getPatterns error:', err.message);
    res.status(500).json({ message: 'Farkındalıklar alınırken bir hata oluştu.' });
  }
};
