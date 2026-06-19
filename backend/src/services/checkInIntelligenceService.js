const db = require('../config/db');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Category/keyword-based mapping for cost-control fallback (when < 3 responses)
const KEYWORD_THEME_MAPPING = [
  { keyword: 'minnettar', theme: 'Minnettarlık ve teşekkür' },
  { keyword: 'mutlu', theme: 'Pozitif anları fark etme' },
  { keyword: 'stres', theme: 'Zorlayıcı duygularla baş etme' },
  { keyword: 'kaygı', theme: 'Zorlayıcı duygularla baş etme' },
  { keyword: 'zor', theme: 'Zorlayıcı duygularla baş etme' },
  { keyword: 'yordu', theme: 'Zorlayıcı duygularla baş etme' },
  { keyword: 'beden', theme: 'Beden farkındalığı' },
  { keyword: 'hissediyorsun', theme: 'Duygusal farkındalık ve yansıma' }
];

/**
 * Strategy Overview:
 * 1. Fetch recent non-empty answers from the last 14 days.
 * 2. If responses count is 0, clear `recent_checkin_themes` to prevent stale themes from lingering.
 * 3. If responses count is 1 or 2, bypass the LLM and return a rule-based mapping (cost-control fallback).
 * 4. If responses count is >= 3, use OpenAI gpt-4o-mini to extract 1-3 high-level themes.
 * 5. Stored persistently in `emotional_memories` under `memory_key = 'recent_checkin_themes'` and `category = 'individual'`.
 * 6. Privacy: `exclude_checkins` is respected by `emotionalContextBuilder.js` to ensure themes don't bleed into partner prompts.
 * 7. Old themes prevention: The query strictly filters `created_at >= NOW() - INTERVAL '14 days'`.
 */
exports.extractCheckInThemes = async (userId) => {
  try {
    // 1. Fetch recent entries (last 14 days)
    const entriesRes = await db.query(
      `SELECT question_text, answer, created_at 
       FROM advanced_check_ins
       WHERE user_id = $1 
         AND answer IS NOT NULL 
         AND answer != ''
         AND created_at >= NOW() - INTERVAL '14 days'
       ORDER BY created_at DESC LIMIT 15`,
      [userId]
    );

    const entries = entriesRes.rows;

    if (entries.length === 0) {
      // Clear out the memory if no recent entries exist to prevent old themes from dominating
      await db.query(
        `DELETE FROM emotional_memories WHERE user_id = $1 AND memory_key = 'recent_checkin_themes'`,
        [userId]
      );
      return;
    }

    let themesStr = '';

    // 2. Rule-based Fallback (Cost-control)
    if (entries.length < 3) {
      console.log(`[checkInIntelligenceService] User ${userId}: Less than 3 check-in responses (${entries.length}). Applying rule-based fallback.`);
      const uniqueThemes = new Set();
      for (const entry of entries) {
        const textToMatch = `${entry.question_text.toLowerCase()} ${entry.answer.toLowerCase()}`;
        let matched = false;
        for (const item of KEYWORD_THEME_MAPPING) {
          if (textToMatch.includes(item.keyword)) {
            uniqueThemes.add(item.theme);
            matched = true;
            break;
          }
        }
        if (!matched) {
          uniqueThemes.add('Duygusal farkındalık ve yansıma');
        }
      }
      themesStr = Array.from(uniqueThemes).join(', ');
    } else {
      // 3. LLM-based Thematic Extraction (>= 3 entries)
      console.log(`[checkInIntelligenceService] User ${userId}: ${entries.length} check-in responses. Triggering GPT-4o-mini thematic extraction.`);
      const checkinText = entries.map(r => `Question: ${r.question_text}\nAnswer: ${r.answer}`).join('\n\n');

      const systemPrompt = `You are a psychological thematic analyzer.
Analyze the following user structured check-in reflection responses from the last 14 days.
Extract EXACTLY 1 to 3 core themes or emotional states the user is dealing with.
Keep each theme extremely short (3-6 words, in Turkish).
Examples: "İş yerinde stres ve kaygı", "İlişkilerde sınırlar koyma", "Kendine karşı minnettarlık".

Do NOT output raw questions or answers. Do NOT include dates.
Return ONLY a JSON object: { "themes": ["Theme 1", "Theme 2"] }`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: checkinText }
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
         VALUES ($1, 'recent_checkin_themes', $2, 'individual')
         ON CONFLICT (user_id, memory_key) 
         DO UPDATE SET memory_value = EXCLUDED.memory_value, updated_at = NOW()`,
         [userId, themesStr]
      );
    } else {
      await db.query(
        `DELETE FROM emotional_memories WHERE user_id = $1 AND memory_key = 'recent_checkin_themes'`,
        [userId]
      );
    }

  } catch (err) {
    console.error('[checkInIntelligenceService] Error extracting check-in themes:', err.message);
  }
};
