const OpenAI = require('openai');

// ---------------------------------------------------------------------------
// Lazy singleton – server boots cleanly even when the key is missing/invalid
// ---------------------------------------------------------------------------
let _openai = null;

function getClient() {
  if (!_openai) {
    const key = process.env.OPENAI_API_KEY;
    if (!key || key === 'your_openai_api_key_here') {
      throw new Error('[aiService] OPENAI_API_KEY is not configured.');
    }
    _openai = new OpenAI({ apiKey: key });
    console.log('[aiService] OpenAI client initialised (model: gpt-4o-mini)');
  }
  return _openai;
}

// ---------------------------------------------------------------------------
// System prompts
// ---------------------------------------------------------------------------

const DAILY_REFLECTION_PROMPT = `Sen sakinleştirici bir öz-yansıma rehberisin.
Kullanıcıya günü için çok kısa, yumuşak ve yargısız bir cümle yaz.
- Sadece 1 kısa cümle.
- Ton: yumuşak, sakin, yargısız, yönlendirici olmayan.
- Tavsiye verme, soru sorma.
- Her zaman Türkçe yaz.
Örnek: "Bugün duygularını fark etmek için küçük bir alan açabilirsin."`;

const WEEKLY_INSIGHT_PROMPT = `Sen nazik bir haftalık öz-yansıma rehberisin.
Kullanıcının haftalık verilerine dayanarak 2-3 cümlelik bir içgörü oluştur.
- Sadece olasılıksal bir dil kullan ("olabilir", "görünüyor", "fark etmiş olabilirsin" gibi).
- Kesin teşhis veya güçlü iddialarda bulunma.
- Tavsiye verme.
- Ton: sakin, güvenli, destekleyici, minimal.
- Her zaman Türkçe yaz.
En fazla 3 cümle.`;

// ---------------------------------------------------------------------------
// generateDailyReflection
// ---------------------------------------------------------------------------

/**
 * Generates a single, soft sentence for daily reflection.
 */
async function generateDailyReflection() {
  try {
    const completion = await getClient().chat.completions.create({
      model:      'gpt-4o-mini',
      messages:   [
        { role: 'system', content: DAILY_REFLECTION_PROMPT },
        { role: 'user',   content: 'Bugün için kısa, sakin bir yansıma cümlesi yazar mısın?' },
      ],
      max_tokens:  80,
      temperature: 0.9,
    });

    const result = completion.choices?.[0]?.message?.content?.trim().replace(/^["']|["']$/g, '');
    if (!result) throw new Error('[aiService] OpenAI returned empty content.');

    return result;
  } catch (err) {
    console.error('[aiService] generateDailyReflection error:', err.message);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// generateWeeklyInsight
// ---------------------------------------------------------------------------

/**
 * Generates a gentle weekly reflection using OpenAI gpt-4o-mini.
 *
 * @param {Object} userData
 * @param {Array}  userData.checkIns       - last 7 days check-ins
 * @param {Array}  userData.cardResponses  - last 7 days card responses
 * @returns {Promise<string>} A 2-3 sentence Turkish reflection
 */
async function generateWeeklyInsight(userData) {
  const { checkIns = [], cardResponses = [] } = userData;

  // --- Build a compact, sanitised data summary ---
  const moodSummary     = checkIns.map(c => c.mood).filter(Boolean).join(', ') || 'bilinmiyor';
  const notesSummary    = checkIns.map(c => c.note).filter(Boolean).slice(0, 5).join(' | ') || null;
  const questionsSummary = checkIns.map(c => c.reflection_question).filter(Boolean).slice(0, 5).join(' | ') || null;

  const acceptedCategories = [...new Set(
    cardResponses.filter(r => r.response === 'Deneyeceğim').map(r => r.category).filter(Boolean)
  )];

  // --- Compose prompt ---
  const lines = [`Bu haftaki ruh halleri: ${moodSummary}.`];
  if (questionsSummary)           lines.push(`Yansıma soruları: ${questionsSummary}.`);
  if (notesSummary)               lines.push(`Günlük notlar: ${notesSummary}.`);
  if (acceptedCategories.length)  lines.push(`İlgi duyduğu kart kategorileri: ${acceptedCategories.join(', ')}.`);
  lines.push('Bu verilere dayanarak kişiye nazik, kısa bir haftalık öz-yansıma yaz.');

  const userMessage = lines.join('\n');

  // --- Call API ---
  const completion = await getClient().chat.completions.create({
    model:      'gpt-4o-mini',
    messages:   [
      { role: 'system', content: WEEKLY_INSIGHT_PROMPT },
      { role: 'user',   content: userMessage },
    ],
    max_tokens:  150,
    temperature: 0.8,
  });

  const result = completion.choices?.[0]?.message?.content?.trim().replace(/^["']|["']$/g, '');

  if (!result) throw new Error('[aiService] OpenAI returned empty content.');

  console.log('[aiService] Weekly AI response:', result);
  return result;
}

module.exports = { 
  generateWeeklyInsight,
  generateDailyReflection
};
