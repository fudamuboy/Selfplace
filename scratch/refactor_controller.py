import re

with open('backend/src/controllers/personalityController.js', 'r') as f:
    content = f.read()

# Add requires at the top
header = "const db = require('../config/db');\nconst { FULL_POOL, DIMENSIONS, BASE_ARCHETYPES } = require('../data/personalityQuestions');\nconst { generatePersonalityArchetype } = require('../services/aiService');\n"

content = re.sub(r'^const db = require\(\'../config/db\'\);', header, content)

# Replace getTest
get_test_new = """exports.getTest = async (req, res) => {
  const { type } = req.params;
  if (type !== 'journey') {
    return res.status(404).json({ success: false, message: 'Geçersiz test tipi. Sadece journey destekleniyor.' });
  }
  try {
    const testResponse = {
      id: 'journey',
      title: 'Selfplace Deep Personality Journey',
      description: 'Duygusal kimliğini ve ilişkisel enerjini keşfedeceğin derin bir yolculuk.'
    };
    
    // Pick 50 questions randomly
    const shuffled = [...FULL_POOL].sort(() => 0.5 - Math.random());
    testResponse.questions = shuffled.slice(0, 50);
    
    // Randomize options
    testResponse.questions = testResponse.questions.map(q => ({
      ...q,
      options: [...q.options].sort(() => 0.5 - Math.random())
    }));

    res.json({ success: true, test: testResponse });
  } catch (err) {
    console.error('[personalityController] getTest error:', err);
    res.status(500).json({ success: false, message: 'Sunucu hatası.' });
  }
};
"""

content = re.sub(r'exports\.getTest = async \(req, res\) => \{[\s\S]*?(?=exports\.submitTest =)', get_test_new, content)

# Replace submitTest
submit_test_new = """exports.submitTest = async (req, res) => {
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

    const resultData = {
      ...enrichedResult,
      scores,
      baseArchetype: bestArchetype.name
    };

    const insertRes = await db.query(
      'INSERT INTO personality_results (user_id, test_type, result_data, traits) VALUES ($1, $2, $3, $4) RETURNING id',
      [userId, 'journey', resultData, '{}']
    );

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
"""

content = re.sub(r'exports\.submitTest = async \(req, res\) => \{[\s\S]*?(?=exports\.getHistory =)', submit_test_new, content)

with open('backend/src/controllers/personalityController.js', 'w') as f:
    f.write(content)

