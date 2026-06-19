const db = require('../config/db');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Category-based mapping for cost-control fallback (when < 3 responses)
const CATEGORY_THEME_MAPPING = {
  'Öz-Şefkat': 'Öz-şefkat ve kendine nazik davranma',
  'Alan Aç': 'Kendine alan ve zaman ayırma',
  'Küçük Cesaret': 'Küçük cesaret adımları atma',
  'Hafiflik': 'Hayata hafiflik ve neşe katma',
  'Derinleş': 'Derinleşme ve duygusal farkındalık',
  'Dinlenme': 'Zihinsel ve bedensel dinlenme'
};

/**
 * Strategy Overview:
 * 1. Analyzes up to 5 card responses from the last 14 days.
 * 2. If responses count is 0, clear `recent_card_themes`.
 * 3. If responses count is 1 or 2, bypass the LLM and return a rule-based mapping (cost-control).
 * 4. If responses count is >= 3, use OpenAI gpt-4o-mini to extract 1-3 high-level themes.
 * 5. Stored persistently in `emotional_memories` under `memory_key = 'recent_card_themes'` and `category = 'individual'`.
 * 6. Privacy: `exclude_cards` is respected by `emotionalContextBuilder.js` to ensure themes don't bleed into partner prompts.
 * 7. Old themes prevention: The query strictly filters `created_at >= NOW() - INTERVAL '14 days'`.
 */
exports.extractCardThemes = async (userId) => {
  try {
    // 1. Fetch up to 5 entries from the last 14 days
    // Card responses are in card_responses. We want real responses, i.e. where response is not 'Seçildi' or empty
    const entriesRes = await db.query(
      `SELECT cr.response, ic.title, ic.content, ic.category, cr.created_at 
       FROM card_responses cr
       JOIN invitation_cards ic ON cr.card_id = ic.id
       WHERE cr.user_id = $1 
         AND cr.response != 'Seçildi'
         AND cr.created_at >= NOW() - INTERVAL '14 days'
       ORDER BY cr.created_at DESC LIMIT 5`,
      [userId]
    );

    const entries = entriesRes.rows;

    if (entries.length === 0) {
      // Clear out the memory if no recent entries exist to prevent old themes from dominating
      await db.query(
        `DELETE FROM emotional_memories WHERE user_id = $1 AND memory_key = 'recent_card_themes'`,
        [userId]
      );
      return;
    }

    let themesStr = '';

    // 2. Rule-based Fallback (Cost-control)
    if (entries.length < 3) {
      console.log(`[cardIntelligenceService] User ${userId}: Less than 3 card responses (${entries.length}). Applying rule-based clustering fallback.`);
      const uniqueThemes = new Set();
      for (const entry of entries) {
        const theme = CATEGORY_THEME_MAPPING[entry.category] || 'Kişisel farkındalık ve gelişim';
        uniqueThemes.add(theme);
      }
      themesStr = Array.from(uniqueThemes).join(', ');
    } else {
      // 3. LLM-based Thematic Extraction (>= 3 entries)
      console.log(`[cardIntelligenceService] User ${userId}: ${entries.length} card responses. Triggering GPT-4o-mini thematic extraction.`);
      const cardText = entries.map(r => `[Card Title: ${r.title} | Category: ${r.category} | Prompt: ${r.content}] User Response: ${r.response}`).join('\n\n');

      const systemPrompt = `You are a psychological thematic analyzer.
Analyze the following user card responses from the last 14 days.
Extract EXACTLY 1 to 3 core themes or emotional directions the user is dealing with or expressing in their card reflections.
Keep each theme extremely short (3-6 words, in Turkish).
Examples: "Öz-şefkat ve kendine alan tanıma", "Kişisel sınırlar üzerine düşünme", "Eyleme geçmek için cesaret bulma".

Do NOT output raw card contents. Do NOT include dates.
Return ONLY a JSON object: { "themes": ["Theme 1", "Theme 2"] }`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: cardText }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const parsed = JSON.parse(completion.choices[0].message.content);
      const themes = parsed.themes || [];
      if (themes.length > 0) {
        themesStr = themes.slice(0, 3).join(', ');
      }
    }

    // 4. Save to emotional_memories
    if (themesStr && themesStr.trim() !== '') {
      await db.query(
        `INSERT INTO emotional_memories (user_id, memory_key, memory_value, category)
         VALUES ($1, 'recent_card_themes', $2, 'individual')
         ON CONFLICT (user_id, memory_key) 
         DO UPDATE SET memory_value = EXCLUDED.memory_value, updated_at = NOW()`,
        [userId, themesStr]
      );
    } else {
      await db.query(
        `DELETE FROM emotional_memories WHERE user_id = $1 AND memory_key = 'recent_card_themes'`,
        [userId]
      );
    }

  } catch (err) {
    console.error('[cardIntelligenceService] Error extracting card themes:', err.message);
  }
};
