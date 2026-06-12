import re

with open('backend/src/controllers/personalityController.js', 'r') as f:
    content = f.read()

# Update import
content = content.replace("const { generatePersonalityArchetype } = require('../services/aiService');", "const { generatePersonalityArchetype, generatePersonalityDrift } = require('../services/aiService');")

# Find where resultData is prepared
old_block = """    const resultData = {
      ...enrichedResult,
      scores,
      baseArchetype: bestArchetype.name
    };"""

new_block = """
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

content = content.replace(old_block, new_block)

with open('backend/src/controllers/personalityController.js', 'w') as f:
    f.write(content)

