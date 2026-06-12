import re

with open('backend/src/services/aiService.js', 'r') as f:
    content = f.read()

drift_func = """
// ---------------------------------------------------------------------------
// generatePersonalityDrift
// ---------------------------------------------------------------------------
async function generatePersonalityDrift(oldScores, newScores) {
  try {
    const client = getClient();
    const systemPrompt = `You are "Selfplace", a calm, emotionally intelligent personality guide.
The user has retaken their personality journey. We want to observe how their emotional energy has subtly shifted.

Old Scores: ${JSON.stringify(oldScores)}
New Scores: ${JSON.stringify(newScores)}

DO NOT use diagnostic, medical, or judgmental language (e.g., "better", "worse", "improved", "declined").
DO NOT use clinical terms like "avoidant" or "unstable".
Use poetic, atmospheric, and soft emotional language (e.g., "Son zamanlarda duygularını daha sessiz ama daha net yaşamaya başladığın hissediliyor.").

Write a single, beautiful 1-2 sentence observation in Turkish about how their emotional style is evolving based on the differences in scores. If the scores are almost identical, mention how their core energy remains deeply rooted and stable.

Respond ONLY with a valid JSON object containing a "drift_insight" string field:
{
  "drift_insight": "..."
}`;

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }],
      response_format: { type: 'json_object' },
      max_tokens: 200,
      temperature: 0.7,
    });

    const result = completion.choices?.[0]?.message?.content?.trim();
    if (!result) return null;

    return JSON.parse(result).drift_insight;
  } catch (err) {
    console.error('[aiService] generatePersonalityDrift error:', err.message);
    return null; // Graceful fallback
  }
}

"""

# Insert before module.exports
content = content.replace("module.exports = {", drift_func + "module.exports = {")

# Add to exports
content = content.replace("generatePersonalityArchetype\n};", "generatePersonalityArchetype,\n  generatePersonalityDrift\n};")

with open('backend/src/services/aiService.js', 'w') as f:
    f.write(content)
