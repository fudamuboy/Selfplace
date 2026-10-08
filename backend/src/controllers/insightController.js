const db = require('../config/db');
const { generateWeeklyInsight, generateDailyReflection } = require('../services/aiService');
const { calculateDepthLevel } = require('../services/emotionalContextBuilder');
const { getLanguage } = require('../utils/languageResolver');

// ---------------------------------------------------------------------------
// Fallbacks
// ---------------------------------------------------------------------------

const DAILY_FALLBACKS_TR = [
  "Bugün kendine biraz daha nazik davranman gerekmiş olabilir.",
  "Bugün kısa bir mola vermek sana iyi gelebilir.",
  "Bugün duygularını fark etmek için küçük bir alan açabilirsin.",
  "Zihnindeki düşüncelerin sadece birer bulut gibi geçip gitmesine izin ver.",
  "Küçük bir adımın, büyük değişimlerin başlangıcı olabileceğini hatırla."
];

const DAILY_FALLBACKS_EN = [
  "You might need to be a little extra gentle with yourself today.",
  "Taking a short pause today might feel deeply refreshing.",
  "You can open a small space today to notice how you feel.",
  "Allow the thoughts in your mind to pass by like quiet clouds.",
  "Remember that a tiny step can be the beginning of meaningful change."
];

function getRandomDailyFallback(isEn = false) {
  const list = isEn ? DAILY_FALLBACKS_EN : DAILY_FALLBACKS_TR;
  return list[Math.floor(Math.random() * list.length)];
}

/**
 * Rule-based fallback for weekly insight – deterministic.
 */
function ruleBasedWeekly(checkIns, cardResponses, isEn = false) {
  if (checkIns.length < 2) {
    return isEn 
      ? "Your self-discovery journey begins with small steps. After a few check-ins, you will find personal insights here."
      : "Kendini tanıma yolculuğun küçük adımlarla başlar. Birkaç check-in sonrası burada sana küçük içgörüler göstereceğim.";
  }

  const favCategory = cardResponses
    .filter(r => r.response === 'Deneyeceğim' || r.response === 'I will try')
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

  if (topCategory === 'Küçük Cesaret' || topCategory === 'Small Courage') {
    return isEn ? "You may have been more open to taking new steps this week. Small moments of courage seem to do you good." : "Bu hafta yeni adımlar atmaya daha açık olmuş olabilirsin. Küçük cesaret anlarının sana iyi geldiği görünüyor.";
  } else if (topCategory === 'Dinlenme' || topCategory === 'Rest') {
    return isEn ? "The need for rest may have become more apparent recently. You might have noticed how valuable taking a pause is." : "Son günlerde dinlenme ihtiyacı daha belirgin hale gelmiş olabilir. Kendine mola vermenin değerli olduğunu fark etmiş olabilirsin.";
  } else if (topCategory === 'Öz-Şefkat' || topCategory === 'Self-Compassion') {
    return isEn ? "Moments of being softer with yourself may have stood out this week. Your inner voice seems a bit calmer." : "Kendine karşı daha yumuşak olduğun anlar bu hafta öne çıkmış olabilir. İç sesinin biraz daha sakinleştiği görünüyor.";
  } else if (topMood === 'Yorgun' || topMood === 'Tired') {
    return isEn ? "Your body might have needed a bit more silence this week. You could be passing through a period of wanting to listen to yourself." : "Bu hafta bedenin biraz daha fazla sessizliğe ihtiyaç duymuş olabilir. Kendini dinleme isteğinin arttığı bir dönemden geçiyor olabilirsin.";
  } else if (topMood === 'Mutlu' || topMood === 'Happy') {
    return isEn ? "You may have felt your overall energy rising throughout the week. You seem to adapt more easily to life's rhythm." : "Haftanın genelinde enerjinin biraz daha yükseldiğini hissetmiş olabilirsin. Yaşamın ritmine daha kolay uyum sağladığın görünüyor.";
  } else {
    return isEn ? "You might have needed to open a bit more space for yourself this week. A search for calm and balance seems visible." : "Bu hafta kendine biraz daha alan açmaya ihtiyaç duymuş olabilirsin. Sakinlik ve denge arayışı bu günlerde daha görünür görünüyor.";
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
  const lang = getLanguage(req);
  const isEn = lang === 'en';
  
  try {
    const existing = await db.query(
      'SELECT text FROM daily_reflections WHERE user_id = $1 AND created_at = CURRENT_DATE AND language = $2 AND language IS NOT NULL LIMIT 1',
      [userId, lang]
    );

    if (existing.rows.length > 0) {
      return res.json({ reflection: existing.rows[0].text, source: 'cache' });
    }

    let reflection;
    let source = 'ai';

    try {
      reflection = await generateDailyReflection(lang);
      try {
        await db.query(
          `INSERT INTO daily_reflections (user_id, text, language, language_code) 
           VALUES ($1, $2, $3, $3) 
           ON CONFLICT (user_id, created_at, language) DO UPDATE SET text = EXCLUDED.text, language_code = EXCLUDED.language_code`,
          [userId, reflection, lang]
        );
      } catch (_insertErr) {
        console.warn('[insightController] Reflection insert warning:', _insertErr.message);
      }
    } catch (aiErr) {
      console.error('[insightController] Daily AI failed, using fallback:', aiErr.message);
      reflection = getRandomDailyFallback(isEn);
      source = 'fallback';
    }

    res.json({ reflection, source });

  } catch (err) {
    res.status(500).json({ 
      message: isEn ? 'An error occurred while creating daily reflection.' : 'Günlük yansıma oluşturulurken bir hata oluştu.'
    });
  }
};

// ---------------------------------------------------------------------------
// GET /api/insights/weekly
// ---------------------------------------------------------------------------

exports.getWeeklyInsight = async (req, res) => {
  const userId = req.user.id;
  const lang = getLanguage(req);
  const isEn = lang === 'en';

  try {
    const { level: depthLevel } = await calculateDepthLevel(userId);
    const connCheck = await db.query(
      "SELECT 1 FROM relationship_connections WHERE (requester_id = $1 OR recipient_id = $1) AND status = 'active' LIMIT 1",
      [userId]
    );
    const hasPartner = connCheck.rows.length > 0;

    const existing = await db.query(
      'SELECT text, generated_at, language FROM weekly_insights WHERE user_id = $1 AND language = $2 AND language IS NOT NULL ORDER BY generated_at DESC LIMIT 1',
      [userId, lang]
    );

    if (existing.rows.length > 0) {
      const lastGenerated = new Date(existing.rows[0].generated_at);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      if (lastGenerated > sevenDaysAgo && existing.rows[0].language === lang) {
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

    let userData;
    try {
      userData = await fetchUserWeeklyData(userId);
    } catch (dataErr) {
      console.error('[insightController] fetch error, using fallback:', dataErr.message);
      return res.json({ 
        insight: ruleBasedWeekly([], [], isEn), 
        depthLevel,
        source: 'error-fallback' 
      });
    }

    const { checkIns, cardResponses, entries } = userData;

    if (entries.length < 2) {
      return res.json({
        insight: isEn 
          ? "Your self-discovery journey begins with small steps. After a few check-ins, you will find personal insights here."
          : "Kendini tanıma yolculuğun küçük adımlarla başlar. Birkaç check-in sonrası burada sana küçük içgörüler göstereceğim.",
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
      insight = await generateWeeklyInsight(userData, depthLevel, hasPartner, lang);
      await db.query(
        'INSERT INTO weekly_insights (user_id, text, language) VALUES ($1, $2, $3)',
        [userId, insight, lang]
      );

      const { trackEvent } = require('../services/eventEngine');
      trackEvent(userId, 'WEEKLY_INSIGHT_GENERATED', 'major', {}).catch(err =>
        console.error('[insightController] trackEvent error:', err.message)
      );
    } catch (aiErr) {
      console.error('[insightController] Weekly AI failed, using fallback:', aiErr.message);
      const fallbackText = ruleBasedWeekly(checkIns, cardResponses, isEn);
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
      insight: isEn 
        ? "You might have needed to open a bit more space for yourself this week. A search for calm and balance seems visible."
        : "Bu hafta kendine biraz daha alan açmaya ihtiyaç duymuş olabilirsin. Sakinlik ve denge arayışı bu günlerde daha görünür görünüyor.", 
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
  const lang = getLanguage(req);
  const isEn = lang === 'en';

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
      message: isEn ? 'Error loading statistics.' : 'İstatistikler alınırken bir hata oluştu.'
    });
  }
};

// ---------------------------------------------------------------------------
// GET /api/insights/patterns
// ---------------------------------------------------------------------------

exports.getPatterns = async (req, res) => {
  const userId = req.user.id;
  const lang = getLanguage(req);
  const isEn = lang === 'en';

  try {
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
        message: isEn ? "Beginning to understand yourself..." : "Kendini anlamaya başlıyorsun...",
        subtitle: isEn ? "As you share a bit more, personal insights will form here ✨" : "Biraz daha paylaştıkça burada sana özel küçük farkındalıklar oluşacak ✨"
      });
    }

    const patterns = [];
    const moods = entries.map(e => e.emotion).filter(Boolean);
    const content = entries.map(e => e.content).filter(Boolean).join(' ').toLowerCase();

    const moodCounts = moods.reduce((acc, mood) => {
      acc[mood] = (acc[mood] || 0) + 1;
      return acc;
    }, {});

    if (moodCounts['Sakin'] > moods.length * 0.4 || moodCounts['Calm'] > moods.length * 0.4) {
      patterns.push(isEn ? "Calmness and inner peace may have become more prominent in your recent days." : "Sakinlik ve iç huzur son günlerinde daha belirgin hale gelmiş olabilir.");
    }
    if (moodCounts['Yorgun'] > moods.length * 0.4 || moodCounts['Tired'] > moods.length * 0.4) {
      patterns.push(isEn ? "Your body might be needing a bit more rest during these days." : "Bu günlerde bedenin biraz daha fazla dinlenmeye ihtiyaç duyuyor olabilir.");
    }
    if (moodCounts['Kaygılı'] > moods.length * 0.3 || moodCounts['Anxious'] > moods.length * 0.3) {
      patterns.push(isEn ? "Thoughts occupying your mind seem to be visiting more frequently lately." : "Zihnini meşgul eden bazı düşüncelerin son zamanlarda daha sık uğradığı görünüyor.");
    }

    if (content.includes('zaman') || content.includes('time') || content.includes('alan') || content.includes('space')) {
      patterns.push(isEn ? "The desire to open space for yourself stands out in your recent notes." : "Kendine alan açma ve zaman ayırma isteği son paylaşımlarında öne çıkıyor.");
    }

    const selectedPatterns = patterns
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);

    res.json({
      patterns: selectedPatterns,
      message: selectedPatterns.length === 0 ? (isEn ? "Continuing to listen to your emotions ✨" : "Duygularını dinlemeye devam ediyoruz ✨") : null,
      subtitle: isEn ? "Small steps bring great changes." : "Küçük adımlar büyük değişimler getirir."
    });

  } catch (err) {
    res.status(500).json({ message: isEn ? 'Error analyzing patterns.' : 'Örüntüler analiz edilirken bir hata oluştu.' });
  }
};

// ---------------------------------------------------------------------------
// GET /api/insights/journey
// ---------------------------------------------------------------------------

exports.getJourneyStats = async (req, res) => {
  const userId = req.user.id;
  const lang = getLanguage(req);
  const isEn = lang === 'en';

  try {
    const currentWeekRes = await db.query(
      `SELECT source_type, emotion
       FROM emotional_entries
       WHERE user_id = $1 AND created_at >= date_trunc('week', CURRENT_DATE)`,
      [userId]
    );

    const checkinCount = currentWeekRes.rows.filter(r => r.source_type === 'checkin' || r.source_type === 'reflection').length;
    const cardsCount = currentWeekRes.rows.filter(r => r.source_type === 'card').length;
    const journalCount = currentWeekRes.rows.filter(r => r.source_type === 'journal').length;

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

    let progressionText = isEn 
      ? "You are beginning a new week in your self-discovery journey." 
      : "Kendini tanıma yolculuğunda yeni bir haftaya başlıyorsun.";

    if (totalCurrent > totalPrev && totalCurrent > 3) {
      progressionText = isEn 
        ? "A lovely depth has been forming in how you express yourself over recent weeks." 
        : "Son haftalarda kendini ifade etme biçiminde güzel bir derinlik oluşuyor.";
    } else if (totalCurrent < totalPrev && totalCurrent <= 1) {
      progressionText = isEn 
        ? "You were a bit quieter this week. Sometimes stepping back is a valuable part of the journey." 
        : "Bu hafta biraz daha sessizdin. Bazen geri çekilmek de yolculuğun bir parçası.";
    } else if (totalCurrent >= 3) {
      progressionText = isEn 
        ? "You built a strong connection with yourself this week. Approaching your thoughts attentively creates a lovely depth." 
        : "Bu hafta kendinle güçlü bir bağ kurmuşsun. Düşüncelerine dikkatle yaklaşman güzel bir derinlik yaratıyor.";
    } else if (totalCurrent > 0) {
      progressionText = isEn 
        ? "Giving yourself space is a deeply valuable part of your journey." 
        : "Kendine alan tanıman yolculuğunun çok değerli bir parçası.";
    }

    const archiveRes = await db.query(
      `SELECT id, text, generated_at, language
       FROM weekly_insights
       WHERE user_id = $1 AND generated_at < date_trunc('week', CURRENT_DATE)
       ORDER BY generated_at DESC`,
      [userId]
    );

    const archive = [];
    for (const row of archiveRes.rows) {
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

      const MOOD_TR_TO_EN = {
        'Mutlu': 'Happy', 'Üzgün': 'Sad', 'Kızgın': 'Angry',
        'Kaygılı': 'Anxious', 'Yorgun': 'Tired', 'Hassas': 'Sensitive',
        'Motive': 'Motivated', 'Sakin': 'Calm'
      };
      const moods = pastEntries.map(e => e.emotion).filter(Boolean);
      let dominantMoodRaw = 'Sakin';
      if (moods.length > 0) {
        const moodCounts = moods.reduce((acc, mood) => {
          acc[mood] = (acc[mood] || 0) + 1;
          return acc;
        }, {});
        dominantMoodRaw = Object.keys(moodCounts).reduce((a, b) => moodCounts[a] > moodCounts[b] ? a : b);
      }
      const dominantMood = isEn
        ? (MOOD_TR_TO_EN[dominantMoodRaw] || dominantMoodRaw)
        : dominantMoodRaw;

      let insightData = {};
      try {
        insightData = JSON.parse(row.text);
      } catch (e) {
        insightData = { insight: row.text };
      }

      let themeTitle = isEn ? "The week you began facing your feelings" : "Duygularınla yüzleşmeye başladığın hafta";
      if (insightData.depthLevel === 'NEW' || insightData.depthLevel === 'LIGHT') {
        themeTitle = isEn ? "A quiet step towards yourself" : "Kendine doğru sessiz bir adım";
      } else if (insightData.depthLevel === 'GROWING') {
        themeTitle = isEn ? "The week you began facing your feelings" : "Duygularınla yüzleşmeye başladığın hafta";
      } else if (insightData.depthLevel === 'DEEP') {
        themeTitle = isEn ? "A week of turning inward and awareness" : "İçe dönüş ve farkındalık haftası";
      } else if (insightData.depthLevel === 'IMMERSIVE') {
        themeTitle = isEn ? "The week you connected with your own truth" : "Kendi gerçeğinle bağ kurduğun hafta";
      }

      // Only use stored insight text if its language matches the active request language.
      // If the row was generated in a different language (e.g. Turkish cache for an English request),
      // fall back to a localized placeholder instead of serving Turkish prose to an English user.
      const rowLang = row.language || 'tr';
      const insightTextRaw = (rowLang === lang && insightData.insight) ? insightData.insight : null;
      let reflectionSentence = insightTextRaw
        ? (insightTextRaw.length > 75 ? insightTextRaw.substring(0, 75) + '...' : insightTextRaw)
        : (isEn ? "You seemed honest with yourself this week." : "Bu hafta kendine karşı dürüst görünüyordun.");

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
    res.status(500).json({ success: false, message: isEn ? 'Could not load journey stats.' : 'Yolculuk verileri alınamadı.' });
  }
};
