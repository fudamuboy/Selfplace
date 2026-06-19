const db = require('../config/db');
const { FULL_POOL, DIMENSIONS, BASE_ARCHETYPES } = require('../data/personalityQuestions');
const { generatePersonalityArchetype, generatePersonalityDrift } = require('../services/aiService');
const { resolveColorFamily } = require('../services/personalityColorEngine');

console.log(
  '[PERSONALITY ENGINE]',
  FULL_POOL.length,
  FULL_POOL.slice(0, 5).map(q => q.id)
);

exports.getTest = async (req, res) => {
  const { type } = req.params;
  if (type !== 'journey') {
    return res.status(404).json({ success: false, message: 'Geçersiz test tipi. Sadece journey destekleniyor.' });
  }
  try {
    const sessionFingerprint = `journey_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const testResponse = {
      id: 'journey',
      title: 'Selfplace Deep Personality Journey',
      description: 'Duygusal kimliğini ve ilişkisel enerjini keşfedeceğin derin bir yolculuk.',
      sessionFingerprint
    };
    
    // Deduplicate the pool
    const uniquePoolMap = new Map();
    for (const q of FULL_POOL) {
      if (!uniquePoolMap.has(q.id)) {
        uniquePoolMap.set(q.id, q);
      }
    }
    const uniquePool = Array.from(uniquePoolMap.values());

    // Group questions by dimension
    const questionsByDimension = {};
    DIMENSIONS.forEach(d => {
      questionsByDimension[d] = [];
    });

    uniquePool.forEach(q => {
      const dim = q.dimension || 'social_energy';
      if (!questionsByDimension[dim]) {
        questionsByDimension[dim] = [];
      }
      questionsByDimension[dim].push(q);
    });

    // Shuffle each dimension group to ensure randomness
    DIMENSIONS.forEach(d => {
      questionsByDimension[d].sort(() => 0.5 - Math.random());
    });

    // Build the 50-question queue using dimension rotation and semantic protection
    const selectedQuestions = [];
    const usedQuestionIds = new Set();
    const usedSemanticTags = new Set();
    const recentTypes = [];

    // We will cycle through the 7 dimensions
    const rotation = [...DIMENSIONS];

    for (let i = 0; i < 50; i++) {
      const targetDim = rotation[i % rotation.length];
      const candidates = questionsByDimension[targetDim] || [];
      let chosen = null;

      // 1. Strict try: Unused ID, no semantic overlap, type variation (different from immediately preceding type)
      for (const q of candidates) {
        if (usedQuestionIds.has(q.id)) continue;

        const hasSemanticOverlap = q.semanticTags && q.semanticTags.some(tag => usedSemanticTags.has(tag));
        if (hasSemanticOverlap) continue;

        const isConsecutiveType = recentTypes.length > 0 && recentTypes[recentTypes.length - 1] === q.type;
        if (isConsecutiveType) continue;

        chosen = q;
        break;
      }

      // 2. Relaxed type variety, but keep strict semantic check
      if (!chosen) {
        for (const q of candidates) {
          if (usedQuestionIds.has(q.id)) continue;

          const hasSemanticOverlap = q.semanticTags && q.semanticTags.some(tag => usedSemanticTags.has(tag));
          if (hasSemanticOverlap) continue;

          chosen = q;
          break;
        }
      }

      // 3. Fallback: Pick any unused question in this dimension (ignore semantic overlap)
      if (!chosen) {
        for (const q of candidates) {
          if (!usedQuestionIds.has(q.id)) {
            chosen = q;
            break;
          }
        }
      }

      // 4. Ultimate fallback: Pick any unused question from the entire pool
      if (!chosen) {
        for (const q of uniquePool) {
          if (!usedQuestionIds.has(q.id)) {
            chosen = q;
            break;
          }
        }
      }

      if (chosen) {
        selectedQuestions.push(chosen);
        usedQuestionIds.add(chosen.id);
        if (chosen.semanticTags) {
          chosen.semanticTags.forEach(tag => usedSemanticTags.add(tag));
        }
        recentTypes.push(chosen.type);
        if (recentTypes.length > 3) {
          recentTypes.shift();
        }
      }
    }

    testResponse.questions = selectedQuestions;

    console.log(
      '[ACTIVE TEST PAYLOAD]',
      selectedQuestions.map(q => q.id)
    );

    res.json({ success: true, test: testResponse });
  } catch (err) {
    console.error('[personalityController] getTest error:', err);
    res.status(500).json({ success: false, message: 'Sunucu hatası.' });
  }
};
exports.submitTest = async (req, res) => {
  const { type } = req.params;
  const { answers } = req.body; 
  const userId = req.user.id;

  if (type !== 'journey') {
    return res.status(404).json({ success: false, message: 'Geçersiz test tipi.' });
  }

  try {
    let scores = {};
    DIMENSIONS.forEach(d => scores[d] = 0);

    // Calculate scores based on the answers
    for (const qId in answers) {
      const q = FULL_POOL.find(x => x.id === qId);
      if (q) {
        const optionIndex = answers[qId];
        const selectedOption = q.options[optionIndex];
        if (selectedOption && selectedOption.weights) {
          for (const [dim, weight] of Object.entries(selectedOption.weights)) {
            scores[dim] += weight;
          }
        }
      }
    }

    // Determine Base Archetype by finding the closest match
    let bestArchetype = BASE_ARCHETYPES[0];
    let maxMatchScore = -999;

    for (const arch of BASE_ARCHETYPES) {
      let matchScore = 0;
      for (const [dim, expectedSign] of Object.entries(arch.conditions)) {
        if (expectedSign > 0 && scores[dim] > 0) matchScore += scores[dim];
        if (expectedSign < 0 && scores[dim] < 0) matchScore += Math.abs(scores[dim]);
        if (expectedSign === 0 && Math.abs(scores[dim]) <= 1) matchScore += 1;
      }
      if (matchScore > maxMatchScore) {
        maxMatchScore = matchScore;
        bestArchetype = arch;
      }
    }

    // Generate hybrid enriched archetype via AI
    const enrichedResult = await generatePersonalityArchetype(bestArchetype, scores);


    // --- DYNAMIC COLOR RESOLUTION ---
    const colorData = resolveColorFamily(scores);

    // --- DRIFT DETECTION & EVOLUTION TIMELINE ---
    const prevRes = await db.query(
      "SELECT result_data FROM personality_results WHERE user_id = $1 AND test_type = 'journey' ORDER BY created_at DESC LIMIT 1",
      [userId]
    );
    
    let driftData = null;
    let dimensionDrift = {};
    if (prevRes.rows.length > 0) {
      const oldScores = prevRes.rows[0].result_data.scores;
      if (oldScores) {
        // Calculate numerical drift
        for (const [dim, val] of Object.entries(scores)) {
          dimensionDrift[dim] = val - (oldScores[dim] || 0);
        }
        driftData = await generatePersonalityDrift(oldScores, scores);
      }
    }

    const resultData = {
      ...enrichedResult,
      scores,
      baseArchetype: bestArchetype.name,
      color_family: colorData, // Contains name, hex, symbol
      dominant_color: colorData.hex, // Compatibility with existing UI
      dimension_drift: dimensionDrift,
      evolution_summary: driftData ? driftData.evolution_summary : null,
      dominant_shift: driftData ? driftData.dominant_shift : null
    };

    const insertRes = await db.query(
      'INSERT INTO personality_results (user_id, test_type, result_data, traits) VALUES ($1, $2, $3, $4) RETURNING id',
      [userId, 'journey', resultData, '{}']
    );

    // Persistent Caching: Cache journey_identity_summary in emotional_memories
    try {
      const identitySummary = {
        archetype_name: resultData.archetype_name,
        description: resultData.description,
        strengths: resultData.strengths,
        blind_spots: resultData.blind_spots,
        scores: resultData.scores
      };
      await db.query(
        `INSERT INTO emotional_memories (user_id, memory_key, memory_value, category)
         VALUES ($1, 'journey_identity_summary', $2, 'individual')
         ON CONFLICT (user_id, memory_key) 
         DO UPDATE SET memory_value = EXCLUDED.memory_value, updated_at = NOW()`,
        [userId, JSON.stringify(identitySummary)]
      );
      console.log(`[personalityController] Cached journey_identity_summary for User ${userId}`);
    } catch (cacheErr) {
      console.error('[personalityController] Error caching journey_identity_summary:', cacheErr.message);
    }

    res.json({
      success: true,
      result: resultData,
      id: insertRes.rows[0].id
    });

  } catch (err) {
    console.error('[personalityController] submitTest error:', err);
    res.status(500).json({ success: false, message: 'Sonuçlar kaydedilemedi.' });
  }
};
exports.getHistory = async (req, res) => {
  const userId = req.user.id;
  try {
    const historyRes = await db.query(
      'SELECT id, test_type, result_data, created_at FROM personality_results WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    // Group by test type
    const mbtiHistory = historyRes.rows.filter(r => r.test_type === 'mbti');
    const colorHistory = historyRes.rows.filter(r => r.test_type === 'color');
    const journeyHistory = historyRes.rows.filter(r => r.test_type === 'journey');

    res.json({
      success: true,
      mbti: mbtiHistory,
      color: colorHistory,
      journey: journeyHistory
    });
  } catch (err) {
    console.error('[Emotional Evolution ERROR]', err);
    res.status(500).json({
      success: false,
      message: 'Evolution data could not be loaded.'
    });
  }
};

/**
 * GET /api/personality/history/:id
 * Get a specific test result by ID
 */
exports.getResult = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  try {
    const resultRes = await db.query(
      'SELECT id, test_type, result_data, created_at FROM personality_results WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (resultRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Sonuç bulunamadı.' });
    }

    res.json({ success: true, result: resultRes.rows[0] });
  } catch (err) {
    console.error('[personalityController] getResult error:', err);
    res.status(500).json({ success: false, message: 'Sonuç alınamadı.' });
  }
};
