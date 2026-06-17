const db = require('../config/db');
const { generateWeeklyInsight, generateDailyReflection } = require('../services/aiService');
const { calculateDepthLevel, buildEmotionalContext } = require('../services/emotionalContextBuilder');

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
  try {
    const result = await db.query(
      `SELECT source_type, emotion, prompt, content, created_at
       FROM emotional_entries
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '7 days'
       ORDER BY created_at ASC`,
      [userId]
    );

    return {
      entries: result.rows,
      checkIns: result.rows.filter(r => r.source_type === 'checkin' || r.source_type === 'reflection').map(r => ({ mood: r.emotion, note: r.content })),
      advancedCheckIns: result.rows.filter(r => r.source_type === 'reflection').map(r => ({ question_id: r.prompt, answer: r.content })),
      cardResponses: result.rows.filter(r => r.source_type === 'card').map(r => ({ response: r.content, category: 'General' }))
    };
  } catch (err) {
    console.error('[insightController] fetchUserWeeklyData error:', err.message);
    return { entries: [], checkIns: [], cardResponses: [], advancedCheckIns: [] };
  }
}

// ---------------------------------------------------------------------------
// GET /api/reflections/daily
// ---------------------------------------------------------------------------

exports.getDailyReflection = async (req, res) => {
  const userId = req.user.id;
  
  try {
    // 1. Fetch Context: Recent Emotional Entry & Memories
    const [lastEntryRes, memoriesRes] = await Promise.all([
      db.query(
        "SELECT emotion FROM emotional_entries WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1",
        [userId]
      ),
      db.query(
        'SELECT memory_key, memory_value FROM emotional_memories WHERE user_id = $1',
        [userId]
      )
    ]);

    const mood = lastEntryRes.rows[0]?.emotion;
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
    res.status(500).json({ 
      message: 'Günlük yansıma oluşturulurken bir hata oluştu.'
    });
  }
};

// ---------------------------------------------------------------------------
// GET /api/insights/weekly
// ---------------------------------------------------------------------------

exports.getWeeklyInsight = async (req, res) => {
  const userId = req.user.id;

  try {
    const { level: depthLevel } = await calculateDepthLevel(userId);
    const connCheck = await db.query(
      "SELECT 1 FROM relationship_connections WHERE (requester_id = $1 OR recipient_id = $1) AND status = 'active' LIMIT 1",
      [userId]
    );
    const hasPartner = connCheck.rows.length > 0;

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
        let insightData = {};
        try {
          insightData = JSON.parse(existing.rows[0].text);
        } catch (_e) {
          insightData = { insight: existing.rows[0].text };
        }
        return res.json({
          ...insightData,
          depthLevel,
          source: 'cache'
        });
      }
    }

    // 2. Generate new one
    let userData;
    try {
      userData = await fetchUserWeeklyData(userId);
    } catch (dataErr) {
      console.error('[insightController] fetch error, using fallback:', dataErr.message);
      return res.json({ 
        insight: ruleBasedWeekly([], []), 
        depthLevel,
        source: 'error-fallback' 
      });
    }

    const { checkIns, cardResponses, entries } = userData;

    // Not enough data fallback
    if (entries.length < 2) {
      return res.json({
        insight: "Kendini tanıma yolculuğun küçük adımlarla başlar. Birkaç check-in sonrası burada sana küçük içgörüler göstereceğim.",
        source: 'placeholder',
        depthLevel,
        rhythm: null,
        comfortPattern: null,
        thoughtFocus: null,
        questions: [],
        shifts: null
      });
    }

    let insight;
    let source = 'ai';

    try {
      insight = await generateWeeklyInsight(userData, depthLevel, hasPartner);
      console.log('[DEBUG] generateWeeklyInsight generated:', insight);
      // Store in DB
      await db.query(
        'INSERT INTO weekly_insights (user_id, text) VALUES ($1, $2)',
        [userId, insight]
      );
    } catch (aiErr) {
      console.error('[insightController] Weekly AI failed, using fallback:', aiErr.message);
      const fallbackText = ruleBasedWeekly(checkIns, cardResponses);
      insight = JSON.stringify({ insight: fallbackText });
      source = 'rule-fallback';
    }

    let resultPayload = {};
    try {
      resultPayload = JSON.parse(insight);
    } catch (_e) {
      resultPayload = { insight };
    }

    res.json({
      ...resultPayload,
      depthLevel,
      source
    });

  } catch (err) {
    console.error('[insightController] getWeeklyInsight error:', err.message);
    res.json({ 
      insight: "Bu hafta kendine biraz daha alan açmaya ihtiyaç duymuş olabilirsin. Sakinlik ve denge arayışı bu günlerde daha görünür görünüyor.", 
      depthLevel: 'NEW',
      source: 'final-fallback' 
    });
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
    res.status(500).json({ 
      message: 'İstatistikler alınırken bir hata oluştu.'
    });
  }
};
// ---------------------------------------------------------------------------
// GET /api/insights/patterns
// ---------------------------------------------------------------------------

exports.getPatterns = async (req, res) => {
  const userId = req.user.id;

  try {
    // Fetch data from unified entries last 14 days
    const result = await db.query(
      `SELECT source_type, emotion, prompt, content, created_at
       FROM emotional_entries
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '14 days'
       ORDER BY created_at ASC`,
      [userId]
    );

    const entries = result.rows;

    if (entries.length < 5) {
      return res.json({
        patterns: [],
        checkInCount: entries.length,
        message: "Kendini anlamaya başlıyorsun...",
        subtitle: "Biraz daha paylaştıkça burada sana özel küçük farkındalıklar oluşacak ✨"
      });
    }

    const patterns = [];
    const moods = entries.map(e => e.emotion).filter(Boolean);
    const content = entries.map(e => e.content).filter(Boolean).join(' ').toLowerCase();

    // --- Logic for Mood Patterns ---
    const moodCounts = moods.reduce((acc, mood) => {
      acc[mood] = (acc[mood] || 0) + 1;
      return acc;
    }, {});

    if (moodCounts['Sakin'] > moods.length * 0.4) {
      patterns.push("Sakinlik ve iç huzur son günlerinde daha belirgin hale gelmiş olabilir.");
    }
    if (moodCounts['Yorgun'] > moods.length * 0.4) {
      patterns.push("Bu günlerde bedenin biraz daha fazla dinlenmeye ihtiyaç duyuyor olabilir.");
    }
    if (moodCounts['Kaygılı'] > moods.length * 0.3) {
      patterns.push("Zihnini meşgul eden bazı düşüncelerin son zamanlarda daha sık uğradığı görünüyor.");
    }

    // --- Content Based Patterns ---
    if (content.includes('zaman') || content.includes('alan')) {
      patterns.push("Kendine alan açma ve zaman ayırma isteği son paylaşımlarında öne çıkıyor.");
    }
    if (content.includes('arkadaş') || content.includes('aile')) {
      patterns.push("Sosyal etkileşimlerin ve ilişkilerin bu hafta senin için önemli bir yer tutmuş olabilir.");
    }

    // Limit to 3 patterns
    const selectedPatterns = patterns
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);

    res.json({
      patterns: selectedPatterns,
      message: selectedPatterns.length === 0 ? "Duygularını dinlemeye devam ediyoruz ✨" : null,
      subtitle: "Küçük adımlar büyük değişimler getirir."
    });

  } catch (err) {
    res.status(500).json({ message: 'Örüntüler analiz edilirken bir hata oluştu.' });
  }
};

// ---------------------------------------------------------------------------
// GET /api/insights/journey
// ---------------------------------------------------------------------------

exports.getJourneyStats = async (req, res) => {
  const userId = req.user.id;

  try {
    // 1. Current Week Stats
    const currentWeekRes = await db.query(
      `SELECT source_type, emotion
       FROM emotional_entries
       WHERE user_id = $1 AND created_at >= date_trunc('week', CURRENT_DATE)`,
      [userId]
    );

    const checkinCount = currentWeekRes.rows.filter(r => r.source_type === 'checkin' || r.source_type === 'reflection').length;
    const cardsCount = currentWeekRes.rows.filter(r => r.source_type === 'card').length;
    const journalCount = currentWeekRes.rows.filter(r => r.source_type === 'journal').length;

    // 2. Previous Week Stats for Progression
    const prevWeekRes = await db.query(
      `SELECT source_type, emotion
       FROM emotional_entries
       WHERE user_id = $1 
         AND created_at >= date_trunc('week', CURRENT_DATE - INTERVAL '1 week')
         AND created_at < date_trunc('week', CURRENT_DATE)`,
      [userId]
    );

    const prevCheckinCount = prevWeekRes.rows.filter(r => r.source_type === 'checkin' || r.source_type === 'reflection').length;
    const prevJournalCount = prevWeekRes.rows.filter(r => r.source_type === 'journal').length;

    const totalCurrent = checkinCount + journalCount;
    const totalPrev = prevCheckinCount + prevJournalCount;

    let progressionText = "Kendini tanıma yolculuğunda yeni bir haftaya başlıyorsun.";
    if (totalCurrent > totalPrev && totalCurrent > 3) {
      progressionText = "Son haftalarda kendini ifade etme biçiminde güzel bir derinlik oluşuyor.";
    } else if (totalCurrent < totalPrev && totalCurrent <= 1) {
      progressionText = "Bu hafta biraz daha sessizdin. Bazen geri çekilmek de yolculuğun bir parçası.";
    } else if (totalCurrent >= 3) {
      progressionText = "Bu hafta kendinle güçlü bir bağ kurmuşsun. Düşüncelerine dikkatle yaklaşman güzel bir derinlik yaratıyor.";
    } else if (totalCurrent > 0) {
      progressionText = "Kendine alan tanıman yolculuğunun çok değerli bir parçası.";
    }

    // 3. Archive Aggregation
    // We fetch all weekly insights generated BEFORE the start of this week
    const archiveRes = await db.query(
      `SELECT id, text, generated_at
       FROM weekly_insights
       WHERE user_id = $1 AND generated_at < date_trunc('week', CURRENT_DATE)
       ORDER BY generated_at DESC`,
      [userId]
    );

    const archive = [];
    for (const row of archiveRes.rows) {
      // Calculate 7-day window prior to generated_at to get the dominant mood and counts
      const pastEntriesRes = await db.query(
        `SELECT source_type, emotion 
         FROM emotional_entries
         WHERE user_id = $1 
           AND created_at >= $2::timestamp - INTERVAL '7 days'
           AND created_at < $2::timestamp`,
        [userId, row.generated_at]
      );

      const pastEntries = pastEntriesRes.rows;
      const pastCheckins = pastEntries.filter(r => r.source_type === 'checkin' || r.source_type === 'reflection').length;
      const pastJournals = pastEntries.filter(r => r.source_type === 'journal').length;

      const moods = pastEntries.map(e => e.emotion).filter(Boolean);
      let dominantMood = 'Sakin';
      if (moods.length > 0) {
        const moodCounts = moods.reduce((acc, mood) => {
          acc[mood] = (acc[mood] || 0) + 1;
          return acc;
        }, {});
        dominantMood = Object.keys(moodCounts).reduce((a, b) => moodCounts[a] > moodCounts[b] ? a : b);
      }

      let insightData = {};
      try {
        insightData = JSON.parse(row.text);
      } catch (e) {
        insightData = { insight: row.text };
      }

      // Title parsing
      let themeTitle = "Duygularınla yüzleşmeye başladığın hafta";
      if (insightData.depthLevel === 'NEW' || insightData.depthLevel === 'LIGHT') themeTitle = "Kendine doğru sessiz bir adım";
      if (insightData.depthLevel === 'GROWING') themeTitle = "Duygularınla yüzleşmeye başladığın hafta";
      if (insightData.depthLevel === 'DEEP') themeTitle = "İçe dönüş ve farkındalık haftası";
      if (insightData.depthLevel === 'IMMERSIVE') themeTitle = "Kendi gerçeğinle bağ kurduğun hafta";

      // Soft reflection sentence
      let reflectionSentence = insightData.insight 
        ? (insightData.insight.length > 75 ? insightData.insight.substring(0, 75) + '...' : insightData.insight)
        : "Bu hafta kendine karşı dürüst görünüyordun.";

      archive.push({
        id: row.id,
        date: row.generated_at,
        themeTitle,
        dominantMood,
        checkinCount: pastCheckins,
        journalCount: pastJournals,
        reflectionSentence
      });
    }

    res.json({
      success: true,
      stats: {
        checkinCount,
        cardsCount,
        journalCount
      },
      progressionText,
      archive,
      hasArchive: archive.length > 0
    });

  } catch (err) {
    console.error('[insightController] getJourneyStats error:', err);
    res.status(500).json({ success: false, message: 'Yolculuk verileri alınamadı.' });
  }
};
