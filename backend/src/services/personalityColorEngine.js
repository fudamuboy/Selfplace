/**
 * Selfplace Personality Color Engine
 * Resolves dimensional scores into emotional color families securely and consistently.
 */

const COLOR_FAMILIES = {
  MOON_BLUE: {
    id: 'moon_blue',
    hex: '#4FD8FF', // Deep Blue / Soft Cyan / Indigo
    name: 'Moon Blue',
    symbol: '🌙',
    description: 'introspective, emotionally deep, calm rhythm, quiet attachment'
  },
  EMBER_ORANGE: {
    id: 'ember_orange',
    hex: '#FF6B6B', // Orange / Ember / Warm Red
    name: 'Ember Orange',
    symbol: '🔥',
    description: 'expressive, emotionally intense, passionate, socially warm'
  },
  SAGE_GREEN: {
    id: 'sage_green',
    hex: '#74B688', // Green / Sage / Moss
    name: 'Sage Green',
    symbol: '🌿',
    description: 'grounding, nurturing, emotionally stabilizing, relationally calm'
  },
  GOLDEN_AMBER: {
    id: 'golden_amber',
    hex: '#FFB84D', // Amber / Gold / Electric Yellow
    name: 'Golden Amber',
    symbol: '☀️',
    description: 'curious, mentally exploratory, energetic, socially adaptive'
  },
  VIOLET_MIST: {
    id: 'violet_mist',
    hex: '#A78BFA', // Purple / Lavender / Cosmic Indigo
    name: 'Violet Mist',
    symbol: '✨',
    description: 'imaginative, emotionally abstract, dreamy, poetic inner world'
  }
};

/**
 * Calculates the dominant color family based on the 7 dimensional scores.
 * Uses a soft heuristic matching to prevent chaotic color swings.
 */
function resolveColorFamily(scores) {
  // Extract scores with fallbacks
  const s = {
    social_energy: scores.social_energy || 0,
    emotional_expression: scores.emotional_expression || 0,
    conflict_style: scores.conflict_style || 0,
    decision_style: scores.decision_style || 0,
    attachment: scores.attachment || 0,
    energy_rhythm: scores.energy_rhythm || 0,
    curiosity: scores.curiosity || 0
  };

  // Scoring weights for each color family
  let scoresMatch = {
    moon_blue: 0,
    ember_orange: 0,
    sage_green: 0,
    golden_amber: 0,
    violet_mist: 0
  };

  // 1. MOON BLUE: introspective (<0), emotionally deep/calm (<0 rhythm), quiet attachment (<0)
  if (s.social_energy < 0) scoresMatch.moon_blue += Math.abs(s.social_energy) * 1.5;
  if (s.energy_rhythm < 0) scoresMatch.moon_blue += Math.abs(s.energy_rhythm) * 1.5;
  if (s.emotional_expression < 0) scoresMatch.moon_blue += Math.abs(s.emotional_expression);
  if (s.attachment < 0) scoresMatch.moon_blue += Math.abs(s.attachment);

  // 2. EMBER ORANGE: expressive (>0), passionate/intense rhythm (>0), socially warm (>0)
  if (s.emotional_expression > 0) scoresMatch.ember_orange += s.emotional_expression * 1.5;
  if (s.social_energy > 0) scoresMatch.ember_orange += s.social_energy * 1.2;
  if (s.energy_rhythm > 0) scoresMatch.ember_orange += s.energy_rhythm * 1.2;
  if (s.conflict_style > 0) scoresMatch.ember_orange += s.conflict_style; // assertive

  // 3. SAGE GREEN: grounding/stable (0 or slightly negative rhythm), nurturing (attachment >0), calm conflict (<0)
  if (s.conflict_style <= 0) scoresMatch.sage_green += Math.abs(s.conflict_style) * 1.5;
  if (s.attachment > 0) scoresMatch.sage_green += s.attachment * 1.5;
  if (s.decision_style < 0) scoresMatch.sage_green += Math.abs(s.decision_style); // empathetic decisions

  // 4. GOLDEN AMBER: curious (>0), mentally exploratory, energetic rhythm (>0)
  if (s.curiosity > 0) scoresMatch.golden_amber += s.curiosity * 2.0;
  if (s.energy_rhythm > 0) scoresMatch.golden_amber += s.energy_rhythm;
  if (s.social_energy > 0) scoresMatch.golden_amber += s.social_energy;

  // 5. VIOLET MIST: imaginative/abstract (curiosity >0 but rhythm calm), dreamy decisions (>0 intuition/abstract)
  // Assuming decision_style > 0 is abstract/intuition, and curiosity > 0
  if (s.decision_style > 0) scoresMatch.violet_mist += s.decision_style * 1.5;
  if (s.curiosity > 0) scoresMatch.violet_mist += s.curiosity * 1.2;
  if (s.emotional_expression < 0) scoresMatch.violet_mist += Math.abs(s.emotional_expression);

  // Find the highest score
  let maxScore = -1;
  let bestMatch = 'moon_blue';

  for (const [family, score] of Object.entries(scoresMatch)) {
    if (score > maxScore) {
      maxScore = score;
      bestMatch = family;
    }
  }

  // Return the resolved color object
  return COLOR_FAMILIES[bestMatch.toUpperCase()];
}

module.exports = {
  COLOR_FAMILIES,
  resolveColorFamily
};
