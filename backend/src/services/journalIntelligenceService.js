const db = require('../config/db');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Strategy Overview:
 * 1. Analyzes up to 5 journal entries from the last 14 days.
 * 2. Uses gpt-4o-mini to extract max 3 high-level themes.
 * 3. Token budget: ~50 tokens per prompt injection.
 * 4. Regenerated asynchronously after create/update journal events.
 * 5. Stored persistently in `emotional_memories` under `memory_key = 'recent_journal_themes'` (No on-demand LLM costs).
 * 6. Privacy: `exclude_journals` is respected by `emotionalContextBuilder.js` to ensure themes don't bleed into partner prompts.
 * 7. Old themes prevention: The query strictly filters `created_at >= NOW() - INTERVAL '14 days'`. If no entries, the memory is cleared.
 */
exports.extractJournalThemes = async (userId) => {
  try {
    // 1. Fetch up to 5 entries from the last 14 days
    const entriesRes = await db.query(
      `SELECT title, content, created_at 
       FROM journal_entries 
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '14 days'
       ORDER BY created_at DESC LIMIT 5`,
      [userId]
    );

    if (entriesRes.rows.length === 0) {
      // Clear out the memory if no recent entries exist to prevent old themes from dominating
      await db.query(
        `DELETE FROM emotional_memories WHERE user_id = $1 AND memory_key = 'recent_journal_themes'`,
        [userId]
      );
      return;
    }

    const journalText = entriesRes.rows.map(r => `[${r.created_at.toISOString().split('T')[0]}] ${r.title}: ${r.content}`).join('\n\n');

    // 2. Summarize themes
    const systemPrompt = `You are a psychological thematic analyzer.
Analyze the following private journal entries from the last 14 days.
Extract EXACTLY 1 to 3 core themes or emotional states the user is dealing with.
Keep each theme extremely short (3-6 words, in Turkish).
Examples: "İş yerinde yoğun stres", "Kişisel gelişim arzusu", "İlişkide iletişim problemleri".

Do NOT output raw journal content. Do NOT include dates.
Return ONLY a JSON object: { "themes": ["Theme 1", "Theme 2"] }`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: journalText }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const parsed = JSON.parse(completion.choices[0].message.content);
    const themes = parsed.themes || [];

    if (themes.length > 0) {
      const themesStr = themes.slice(0, 3).join(', ');
      
      // 5. Store persistently
      await db.query(
        `INSERT INTO emotional_memories (user_id, memory_key, memory_value, category)
         VALUES ($1, 'recent_journal_themes', $2, 'individual')
         ON CONFLICT (user_id, memory_key) 
         DO UPDATE SET memory_value = EXCLUDED.memory_value, updated_at = NOW()`,
        [userId, themesStr]
      );
    }

  } catch (err) {
    console.error('[journalIntelligenceService] Error extracting journal themes:', err.message);
  }
};
