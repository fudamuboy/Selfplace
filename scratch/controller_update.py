import re

with open('backend/src/controllers/personalityController.js', 'r') as f:
    content = f.read()

# Import color engine
content = content.replace(
    "const { generatePersonalityArchetype, generatePersonalityDrift } = require('../services/aiService');",
    "const { generatePersonalityArchetype, generatePersonalityDrift } = require('../services/aiService');\nconst { resolveColorFamily } = require('../services/personalityColorEngine');"
)

# Fix the resultData construction and drift logic
old_drift_block = """
    // --- DRIFT DETECTION ---
    const prevRes = await db.query(
      "SELECT result_data FROM personality_results WHERE user_id = $1 AND test_type = 'journey' ORDER BY created_at DESC LIMIT 1",
      [userId]
    );
    
    let driftInsight = null;
    if (prevRes.rows.length > 0) {
      const oldScores = prevRes.rows[0].result_data.scores;
      if (oldScores) {
        driftInsight = await generatePersonalityDrift(oldScores, scores);
      }
    }

    const resultData = {
      ...enrichedResult,
      scores,
      baseArchetype: bestArchetype.name,
      drift_insight: driftInsight
    };"""

new_drift_block = """
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
    };"""

content = content.replace(old_drift_block, new_drift_block)

with open('backend/src/controllers/personalityController.js', 'w') as f:
    f.write(content)

