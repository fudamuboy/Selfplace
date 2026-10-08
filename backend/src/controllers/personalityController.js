const db = require('../config/db');
const { FULL_POOL, DIMENSIONS, BASE_ARCHETYPES, localizeQuestion } = require('../data/personalityQuestions');
const { generatePersonalityArchetype, generatePersonalityDrift } = require('../services/aiService');
const { resolveColorFamily, localizeColorFamily } = require('../services/personalityColorEngine');
const { getLanguage } = require('../utils/languageResolver');

exports.getTest = async (req, res) => {
  const { type } = req.params;
  const lang = getLanguage(req);
  const isEn = lang === 'en';

  if (type !== 'journey') {
    return res.status(404).json({ success: false, message: isEn ? 'Invalid test type.' : 'Geçersiz test tipi. Sadece journey destekleniyor.' });
  }
  try {
    const sessionFingerprint = `journey_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const testResponse = {
      id: 'journey',
      title: 'Selfplace Deep Personality Journey',
      description: isEn 
        ? 'A deep journey to explore your emotional identity and relational energy.'
        : 'Duygusal kimliğini ve ilişkisel enerjini keşfedeceğin derin bir yolculuk.',
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
        selectedQuestions.push(localizeQuestion(chosen, isEn));
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

    

    res.json({ success: true, test: testResponse });
  } catch (err) {
    console.error('[personalityController] getTest error:', err);
    res.status(500).json({ success: false, message: isEn ? 'Server error.' : 'Sunucu hatası.' });
  }
};
exports.submitTest = async (req, res) => {
  const { type } = req.params;
  const { answers } = req.body; 
  const userId = req.user.id;
  const lang = getLanguage(req);
  const isEn = lang === 'en';

  if (type !== 'journey') {
    return res.status(404).json({ success: false, message: isEn ? 'Invalid test type.' : 'Geçersiz test tipi.' });
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

    const rawLang = req.headers['x-app-language'] || req.headers['accept-language'] || req.query.lang;
    const lang = (rawLang && String(rawLang).toLowerCase().startsWith('en')) ? 'en' : 'tr';

    // Generate hybrid enriched archetype via AI
    const enrichedResult = await generatePersonalityArchetype(bestArchetype, scores, lang);

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
        driftData = await generatePersonalityDrift(oldScores, scores, lang);
      }
    }

    const translationPayload = {
      archetype_name: enrichedResult.archetype_name,
      description: enrichedResult.description,
      relationship_style: enrichedResult.relationship_style,
      strengths: enrichedResult.strengths,
      blind_spots: enrichedResult.blind_spots,
      communication_energy: enrichedResult.communication_energy,
      evolution_summary: driftData ? driftData.evolution_summary : null,
      dominant_shift: driftData ? driftData.dominant_shift : null
    };

    const resultData = {
      ...enrichedResult,
      original_language: lang,
      scores,
      baseArchetype: bestArchetype.name,
      baseArchetypeId: bestArchetype.id,
      color_family: colorData, // Contains name, hex, symbol
      dominant_color: colorData.hex, // Compatibility with existing UI
      dimension_drift: dimensionDrift,
      evolution_summary: driftData ? driftData.evolution_summary : null,
      dominant_shift: driftData ? driftData.dominant_shift : null,
      translations: {
        [lang]: translationPayload
      }
    };

    const insertRes = await db.query(
      'INSERT INTO personality_results (user_id, test_type, result_data, traits) VALUES ($1, $2, $3, $4) RETURNING id',
      [userId, 'journey', resultData, '{}']
    );

    // Track Personality Completed Event
    const { trackEvent } = require('../services/eventEngine');
    trackEvent(userId, 'PERSONALITY_COMPLETED', 'major', { test_type: 'journey' }).catch(err =>
      console.error('[personalityController] trackEvent error:', err.message)
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
    res.status(500).json({ success: false, message: lang === 'en' ? 'Could not save results.' : 'Sonuçlar kaydedilemedi.' });
  }
};

const ARCHETYPE_EN_FALLBACKS = {
  moonwater: {
    name: 'Shadow Water (Moonwater)',
    description: 'Calm, deep, and reflective. Feeling quietly, protecting your own space while offering endless tenderness to loved ones.',
    relationship_style: 'Values quiet depth and mutual trust.',
    strengths: ['Deep empathy', 'Emotional calmness', 'Loyalty'],
    blind_spots: ['Withdrawing too quickly', 'Hesitation to voice needs'],
    communication_energy: 'Gentle, thoughtful, and measured.'
  },
  wildfire: {
    name: 'Fire Spirit (Wildfire)',
    description: 'Passionate, energetic, and expressive. Living emotions intensely, bringing warmth and light to every shared space.',
    relationship_style: 'Spontaneous, vibrant, and deeply expressive.',
    strengths: ['Infectious enthusiasm', 'Courageous honesty', 'Passion'],
    blind_spots: ['Impatience', 'Overwhelming emotional intensity'],
    communication_energy: 'Direct, lively, and warm.'
  },
  earthanchor: {
    name: 'Deep Roots (Earth Anchor)',
    description: 'Grounded, rational, and reassuring. Standing firm through storms, acting as a safe haven for loved ones.',
    relationship_style: 'Reliable, steady, and protective.',
    strengths: ['Stability', 'Practical support', 'Patience'],
    blind_spots: ['Resistance to change', 'Emotional hesitation'],
    communication_energy: 'Calm, grounded, and clear.'
  },
  windseeker: {
    name: 'Wind Seeker',
    description: 'Curious, free-spirited, and exploratory. Choosing discovery and mental freedom over rigidity.',
    relationship_style: 'Playful, intellectually stimulating, and open.',
    strengths: ['Adaptability', 'Curiosity', 'Fresh perspectives'],
    blind_spots: ['Restlessness', 'Difficulty with long pauses'],
    communication_energy: 'Light, engaging, and dynamic.'
  },
  starweaver: {
    name: 'Star Weaver',
    description: 'Dreamer, introspective, and idealistic. Viewing the world not just as it is, but as it could be.',
    relationship_style: 'Romantic, imaginative, and deeply devoted.',
    strengths: ['Creativity', 'Visionary insight', 'Tenderness'],
    blind_spots: ['Perfectionist ideals', 'Sensory overload'],
    communication_energy: 'Poetic, gentle, and reflective.'
  }
};

const ARCHETYPE_TR_FALLBACKS = {
  moonwater: {
    name: 'Gölge Suyu',
    description: 'Sakin, derin ve yansıtıcı. Sessizce hisseden, kendi alanını koruyan ama sevdiklerine sonsuz şefkat sunan bir yapı.',
    relationship_style: 'Sessiz derinliğe ve karşılıklı güvene değer verir.',
    strengths: ['Derin empati', 'Duygusal dinginlik', 'Bağlılık'],
    blind_spots: ['Hızlıca içine kapanma', 'İhtiyaçları dile getirmede çekingenlik'],
    communication_energy: 'Nazik, düşünceli ve ölçülü.'
  },
  wildfire: {
    name: 'Ateş Ruhu',
    description: 'Tutkulu, enerjik ve dışa dönük. Duygularını yoğun yaşayan, coşkulu ve girdiği ortamı aydınlatan bir enerji.',
    relationship_style: 'Doğal, canlı ve son derece ifade dolu.',
    strengths: ['Bulaşıcı coşku', 'Cesur dürüstlük', 'Tutku'],
    blind_spots: ['Sabırsızlık', 'Aşırı duygusal yoğunluk'],
    communication_energy: 'Doğrudan, canlı ve samimi.'
  },
  earthanchor: {
    name: 'Köklenmiş Çınar',
    description: 'Mantıklı, sakin, güven veren. Fırtınalarda savrulmayan, sevdiklerine güvenli bir liman olan kararlı bir duruş.',
    relationship_style: 'Güvenilir, kararlı ve koruyucu.',
    strengths: ['İstikrar', 'Pratik destek', 'Sabır'],
    blind_spots: ['Değişime direnç', 'Duygusal tereddüt'],
    communication_energy: 'Sakin, ayakları yere basan ve net.'
  },
  windseeker: {
    name: 'Rüzgar Gezgini',
    description: 'Meraklı, özgür ruhlu ve keşifçi. Bağlanmaktan çok deneyimlemeyi seçen, sınırları sevmeyen bir hava enerjisi.',
    relationship_style: 'Neşeli, zihinsel olarak uyarıcı ve açık.',
    strengths: ['Uyum yeteneği', 'Merak', 'Taze bakış açıları'],
    blind_spots: ['Huzursuzluk', 'Uzun duraksamalarda zorlanma'],
    communication_energy: 'Hafif, katılımcı ve dinamik.'
  },
  starweaver: {
    name: 'Yıldız Dokuyucu',
    description: 'Hayalperest, içe dönük ve idealist. Dünyayı olduğu gibi değil, olabileceği gibi gören zengin bir iç dünya.',
    relationship_style: 'Romantik, hayal gücü yüksek ve derinden bağlı.',
    strengths: ['Yaratıcılık', 'Vizyoner içgörü', 'Şefkat'],
    blind_spots: ['Mükemmeliyetçi idealler', 'Duyusal aşırı yüklenme'],
    communication_energy: 'Şiirsel, nazik ve yansıtıcı.'
  }
};

const KNOWN_ARCHETYPE_MAP = {
  'Passionate Flame': { tr: 'Ateş Yüreği', en: 'Passionate Flame' },
  'Fiery Spirit': { tr: 'Ateş Ruhu', en: 'Fiery Spirit' },
  'Fire Spirit (Wildfire)': { tr: 'Ateş Ruhu (Wildfire)', en: 'Fire Spirit (Wildfire)' },
  'Ateş Yüreği': { tr: 'Ateş Yüreği', en: 'Passionate Flame' },
  'Ateş Ruhu (Wildfire)': { tr: 'Ateş Ruhu (Wildfire)', en: 'Fire Spirit (Wildfire)' },
  'Ateş Ruhu': { tr: 'Ateş Ruhu', en: 'Fiery Spirit' },
  'Grounded Guardian': { tr: 'Köklenmiş Muhafız', en: 'Grounded Guardian' },
  'Deep Roots (Earth Anchor)': { tr: 'Köklenmiş Çınar (Earth Anchor)', en: 'Deep Roots (Earth Anchor)' },
  'Köklenmiş Çınar (Earth Anchor)': { tr: 'Köklenmiş Çınar (Earth Anchor)', en: 'Deep Roots (Earth Anchor)' },
  'Köklenmiş Muhafız': { tr: 'Köklenmiş Muhafız', en: 'Grounded Guardian' },
  'Shadow Water (Moonwater)': { tr: 'Gölge Suyu (Moonwater)', en: 'Shadow Water (Moonwater)' },
  'Gölge Suyu (Moonwater)': { tr: 'Gölge Suyu (Moonwater)', en: 'Shadow Water (Moonwater)' },
  'Sakin Gözlemci': { tr: 'Sakin Gözlemci', en: 'Calm Observer' },
  'Calm Observer': { tr: 'Sakin Gözlemci', en: 'Calm Observer' },
  'Wind Seeker': { tr: 'Rüzgar Gezgini', en: 'Wind Seeker' },
  'Rüzgar Gezgini': { tr: 'Rüzgar Gezgini', en: 'Wind Seeker' },
  'Star Weaver': { tr: 'Yıldız Dokuyucu', en: 'Star Weaver' },
  'Yıldız Dokuyucu': { tr: 'Yıldız Dokuyucu', en: 'Star Weaver' }
};

async function localizePersonalityResult(row, targetLang) {
  if (!row || !row.result_data) return row;
  const isEn = targetLang === 'en';
  const data = row.result_data;

  // Localize color family
  const localizedColorFamily = data.color_family ? localizeColorFamily(data.color_family, isEn) : data.color_family;

  // Helper to compute localized dominant shift if missing or mismatched
  const computeDominantShift = (lang) => {
    if (data.dimension_drift && typeof data.dimension_drift === 'object') {
      const sorted = Object.entries(data.dimension_drift).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
      const topDrift = sorted[0];
      if (topDrift && Math.abs(topDrift[1]) > 0) {
        if (lang === 'en') {
          const dimMap = {
            curiosity: 'curiosity & exploration',
            attachment: 'attachment need',
            energy_rhythm: 'energy rhythm',
            social_energy: 'social energy',
            conflict_style: 'conflict style',
            decision_style: 'decision-making style',
            emotional_expression: 'emotional expression'
          };
          const dimLabel = dimMap[topDrift[0]] || 'emotional balance';
          const direction = topDrift[1] > 0 ? 'a noticeable rise' : 'a natural calming';
          return `The most noticeable change occurred in your ${dimLabel}, showing ${direction}. This reflects evolving emotional dynamics and a deeper self-connection.`;
        } else {
          const dimMap = {
            curiosity: 'merak ve keşif',
            attachment: 'bağlanma ihtiyacı',
            energy_rhythm: 'enerji ritmi',
            social_energy: 'sosyal enerji',
            conflict_style: 'çatışma tarzı',
            decision_style: 'karar verme tarzı',
            emotional_expression: 'duygusal ifade'
          };
          const dimLabel = dimMap[topDrift[0]] || 'duygusal denge';
          const direction = topDrift[1] > 0 ? 'belirgin yükseliş' : 'doğal bir sakinleşme';
          return `En belirgin değişim ${dimLabel} alanında yaşandı ve ${direction} gösterdi. Bu durum, yaşama karşı yenilenen bir canlılık ve derinleşen duygusal bağları yansıtıyor.`;
        }
      }
    }
    return lang === 'en'
      ? 'A balanced and gentle shift is reflected in your inner rhythm.'
      : 'İçsel ritmindeki dengeli değişim dikkat çekiyor.';
  };

  // If translations for targetLang already exist, merge and ensure all fields are localized
  if (data.translations && data.translations[targetLang]) {
    const translation = data.translations[targetLang];
    const resolvedShift = translation.dominant_shift || computeDominantShift(targetLang);
    return {
      ...row,
      result_data: {
        ...data,
        ...translation,
        dominant_shift: resolvedShift,
        archetype_name: translation.archetype_name || (KNOWN_ARCHETYPE_MAP[data.archetype_name]?.[targetLang] || data.archetype_name),
        color_family: localizedColorFamily
      }
    };
  }

  // Detect whether the original row was English or Turkish
  const isOriginalEnglish = data.original_language === 'en' || (
    data.archetype_name && (
      KNOWN_ARCHETYPE_MAP[data.archetype_name]?.en === data.archetype_name &&
      KNOWN_ARCHETYPE_MAP[data.archetype_name]?.tr !== data.archetype_name
    )
  );

  // If viewing in Turkish and original was already Turkish
  if (!isEn && !isOriginalEnglish) {
    return {
      ...row,
      result_data: {
        ...data,
        archetype_name: KNOWN_ARCHETYPE_MAP[data.archetype_name]?.tr || data.archetype_name,
        color_family: localizedColorFamily
      }
    };
  }

  // If viewing in English and original was already English
  if (isEn && isOriginalEnglish) {
    return {
      ...row,
      result_data: {
        ...data,
        archetype_name: KNOWN_ARCHETYPE_MAP[data.archetype_name]?.en || data.archetype_name,
        color_family: localizedColorFamily
      }
    };
  }

  // If target is English and English translation is missing:
  if (isEn) {
    try {
      const baseArch = BASE_ARCHETYPES.find(a => 
        (data.baseArchetypeId && a.id === data.baseArchetypeId) || 
        (data.baseArchetype && (a.name === data.baseArchetype || a.id === data.baseArchetype))
      ) || BASE_ARCHETYPES[0];

      let enDrift = null;
      if (data.dimension_drift && typeof data.dimension_drift === 'object') {
        const sorted = Object.entries(data.dimension_drift).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
        const topDrift = sorted[0];
        if (topDrift && Math.abs(topDrift[1]) > 0) {
          const dimMap = {
            curiosity: 'curiosity & exploration',
            attachment: 'attachment need',
            energy_rhythm: 'energy rhythm',
            social_energy: 'social energy',
            conflict_style: 'conflict style',
            decision_style: 'decision-making style',
            emotional_expression: 'emotional expression'
          };
          const dimLabel = dimMap[topDrift[0]] || 'emotional balance';
          const direction = topDrift[1] > 0 ? 'a noticeable rise' : 'a natural calming';
          enDrift = `The most noticeable change occurred in your ${dimLabel}, showing ${direction}. This reflects evolving emotional dynamics and a deeper self-connection.`;
        }
      }

      let enEnriched = null;
      if (data.scores) {
        try {
          enEnriched = await generatePersonalityArchetype(baseArch, data.scores, 'en');
        } catch {
          enEnriched = null;
        }
      }

      if (!enEnriched) {
        const fallback = ARCHETYPE_EN_FALLBACKS[baseArch.id] || ARCHETYPE_EN_FALLBACKS.moonwater;
        enEnriched = {
          archetype_name: KNOWN_ARCHETYPE_MAP[data.archetype_name]?.en || fallback.name,
          description: fallback.description,
          relationship_style: fallback.relationship_style,
          strengths: fallback.strengths,
          blind_spots: fallback.blind_spots,
          communication_energy: fallback.communication_energy,
          dominant_shift: enDrift || 'A balanced and gentle shift is reflected in your inner rhythm.',
          evolution_summary: 'A distinct evolution is observed in your emotional style, transitioning into a more mindful and harmonious rhythm over time.'
        };
      } else {
        enEnriched.dominant_shift = enDrift || enEnriched.dominant_shift || 'A balanced and gentle shift is reflected in your inner rhythm.';
        enEnriched.evolution_summary = enEnriched.evolution_summary || 'A distinct evolution is observed in your emotional style, transitioning into a more mindful and harmonious rhythm over time.';
      }

      const updatedTranslations = {
        ...(data.translations || {}),
        [data.original_language || 'tr']: {
          archetype_name: data.archetype_name,
          description: data.description,
          relationship_style: data.relationship_style,
          strengths: data.strengths,
          blind_spots: data.blind_spots,
          communication_energy: data.communication_energy,
          evolution_summary: data.evolution_summary,
          dominant_shift: data.dominant_shift
        },
        en: enEnriched
      };

      const updatedResultData = {
        ...data,
        translations: updatedTranslations
      };

      // Persist in background so next read is instant and original result is preserved
      db.query('UPDATE personality_results SET result_data = $1 WHERE id = $2', [updatedResultData, row.id]).catch(() => {});

      return {
        ...row,
        result_data: {
          ...data,
          ...enEnriched,
          color_family: localizedColorFamily,
          translations: updatedTranslations
        }
      };
    } catch (err) {
      console.error('[personalityController] localizePersonalityResult EN error:', err.message);
      const baseArch = BASE_ARCHETYPES[0];
      const fallback = ARCHETYPE_EN_FALLBACKS[baseArch.id];
      return {
        ...row,
        result_data: {
          ...data,
          archetype_name: fallback.name,
          description: fallback.description,
          color_family: localizedColorFamily
        }
      };
    }
  }

  // Target is Turkish and Turkish translation is missing (original was in English):
  if (!isEn) {
    try {
      const baseArch = BASE_ARCHETYPES.find(a => 
        (data.baseArchetypeId && a.id === data.baseArchetypeId) || 
        (data.baseArchetype && (a.name === data.baseArchetype || a.id === data.baseArchetype))
      ) || BASE_ARCHETYPES[0];

      const trFallback = ARCHETYPE_TR_FALLBACKS[baseArch.id] || ARCHETYPE_TR_FALLBACKS.wildfire;

      let trDrift = null;
      if (data.dimension_drift && typeof data.dimension_drift === 'object') {
        const sorted = Object.entries(data.dimension_drift).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
        const topDrift = sorted[0];
        if (topDrift && Math.abs(topDrift[1]) > 0) {
          const dimMap = {
            curiosity: 'merak ve keşif',
            attachment: 'bağlanma ihtiyacı',
            energy_rhythm: 'enerji ritmi',
            social_energy: 'sosyal enerji',
            conflict_style: 'çatışma tarzı',
            decision_style: 'karar verme tarzı',
            emotional_expression: 'duygusal ifade'
          };
          const dimLabel = dimMap[topDrift[0]] || 'duygusal denge';
          const direction = topDrift[1] > 0 ? 'belirgin yükseliş' : 'doğal bir sakinleşme';
          trDrift = `En belirgin değişim ${dimLabel} alanında yaşandı ve ${direction} gösterdi. Bu durum, yaşama karşı yenilenen bir canlılık ve derinleşen duygusal bağları yansıtıyor.`;
        }
      }

      const trPayload = {
        archetype_name: KNOWN_ARCHETYPE_MAP[data.archetype_name]?.tr || trFallback.name,
        description: trFallback.description,
        relationship_style: trFallback.relationship_style,
        strengths: trFallback.strengths,
        blind_spots: trFallback.blind_spots,
        communication_energy: trFallback.communication_energy,
        dominant_shift: trDrift || 'İçsel ritmindeki dengeli değişim dikkat çekiyor.',
        evolution_summary: 'Duygusal tarzında belirgin bir değişim gözlemleniyor. İçsel dinamiklerin zamanla daha farkındalıklı ve dengeli bir ritme evriliyor.'
      };

      const updatedTranslations = {
        ...(data.translations || {}),
        [data.original_language || 'en']: {
          archetype_name: data.archetype_name,
          description: data.description,
          relationship_style: data.relationship_style,
          strengths: data.strengths,
          blind_spots: data.blind_spots,
          communication_energy: data.communication_energy,
          evolution_summary: data.evolution_summary,
          dominant_shift: data.dominant_shift
        },
        tr: trPayload
      };

      const updatedResultData = {
        ...data,
        translations: updatedTranslations
      };

      // Persist in background so next read is instant
      db.query('UPDATE personality_results SET result_data = $1 WHERE id = $2', [updatedResultData, row.id]).catch(() => {});

      return {
        ...row,
        result_data: {
          ...data,
          ...trPayload,
          color_family: localizedColorFamily,
          translations: updatedTranslations
        }
      };
    } catch (err) {
      console.error('[personalityController] localizePersonalityResult TR error:', err.message);
      const trFallback = ARCHETYPE_TR_FALLBACKS.wildfire;
      return {
        ...row,
        result_data: {
          ...data,
          archetype_name: trFallback.name,
          description: trFallback.description,
          color_family: localizedColorFamily
        }
      };
    }
  }

  return {
    ...row,
    result_data: {
      ...data,
      color_family: localizedColorFamily
    }
  };
}

exports.getHistory = async (req, res) => {
  const userId = req.user.id;
  const lang = getLanguage(req);
  try {
    const historyRes = await db.query(
      'SELECT id, test_type, result_data, created_at FROM personality_results WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    const localizedRows = await Promise.all(
      historyRes.rows.map(row => localizePersonalityResult(row, lang))
    );

    // Group by test type
    const mbtiHistory = localizedRows.filter(r => r.test_type === 'mbti');
    const colorHistory = localizedRows.filter(r => r.test_type === 'color');
    const journeyHistory = localizedRows.filter(r => r.test_type === 'journey');

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
      message: lang === 'en' ? 'Evolution data could not be loaded.' : 'Gelişim verileri yüklenemedi.'
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
  const lang = getLanguage(req);
  const isEn = lang === 'en';
  try {
    const resultRes = await db.query(
      'SELECT id, test_type, result_data, created_at FROM personality_results WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (resultRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: isEn ? 'Result not found.' : 'Sonuç bulunamadı.' });
    }

    const localizedResult = await localizePersonalityResult(resultRes.rows[0], lang);

    res.json({ success: true, result: localizedResult });
  } catch (err) {
    console.error('[personalityController] getResult error:', err);
    res.status(500).json({ success: false, message: isEn ? 'Could not get result.' : 'Sonuç alınamadı.' });
  }
};
