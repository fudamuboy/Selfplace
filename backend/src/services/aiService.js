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

const WEEKLY_INSIGHT_PROMPT = `Sen nazik, sakin ve hafızası güçlü bir haftalık öz-yansıma rehberisin.
Kullanıcının haftalık verilerine dayanarak tam olarak 2-3 cümlelik kişisel bir içgörü oluştur.
- Verilerdeki özel isimleri, olayları (sınavlar, iş, taşınma vb.) ve tekrarlayan durumları nazikçe fark et.
- SADECE 2-3 kısa cümle yaz.
- Her cümle basit, hafif ve kolay okunur olmalı.
- Sadece olasılıksal bir dil kullan ("olabilir", "görünüyor", "fark etmiş olabilirsin", "ihtiyaç duymuş olabilirsin", "gibi").
- Kesin teşhis, analiz veya güçlü iddialarda bulunma.
- Tavsiye verme, komut verme, rehberlik taslama.
- Ton: sakin, güvenli, hafif, minimal, insancıl.
- Kullanıcıya ismen hitap etme, ama paylaştığı detaylara (örneğin bir arkadaş ismi veya bir sınav stresi) nazikçe değin.
- Her zaman Türkçe yaz.
Örnek: "Bu hafta sınavlarınla ilgili paylaştığın detaylar, zihninin biraz yorgun olduğunu gösteriyor olabilir. Sosyal anlarda hissettiğin o küçük neşenin sana iyi geldiğini fark etmiş olabilirsin."`;

// ---------------------------------------------------------------------------
// generateDailyReflection
// ---------------------------------------------------------------------------

/**
 * Generates a single, soft sentence for daily reflection.
 */
async function generateDailyReflection() {
  try {
    const client = getClient();
    const completion = await client.chat.completions.create({
      model:      'gpt-4o-mini',
      messages:   [
        { role: 'system', content: DAILY_REFLECTION_PROMPT },
        { role: 'user',   content: 'Bugün için kısa, sakin bir yansıma cümlesi yazar mısın?' },
      ],
      max_tokens:  80,
      temperature: 0.9,
    });

    const result = completion.choices?.[0]?.message?.content?.trim().replace(/^["']|["']$/g, '');
    if (!result) throw new Error('OpenAI returned empty content.');

    return result;
  } catch (err) {
    // Only log actual API errors, not "key missing" which is expected if not configured
    if (!err.message.includes('OPENAI_API_KEY')) {
      console.error('[aiService] generateDailyReflection error:', err.message);
    }
    throw err;
  }
}

/**
 * Generates a gentle weekly reflection using OpenAI gpt-4o-mini, tailored to the user's emotional depth level.
 *
 * @param {Object} userData
 * @param {string} depthLevel      - 'NEW' | 'LIGHT' | 'GROWING' | 'DEEP' | 'IMMERSIVE'
 * @param {boolean} hasPartner     - true | false
 * @returns {Promise<string>} A JSON string representing the Weekly Wrapped
 */
async function generateWeeklyInsight(userData, depthLevel = 'NEW', hasPartner = false) {
  try {
    const { checkIns = [], cardResponses = [], advancedCheckIns = [] } = userData;
    const client = getClient();

    // --- Build a compact summary ---
    const moodSummary     = checkIns.map(c => c.mood).filter(Boolean).join(', ') || 'bilinmiyor';
    const notesSummary    = checkIns.map(c => c.note).filter(Boolean).slice(0, 5).join(' | ') || null;
    const questionsSummary = checkIns.map(c => c.reflection_question).filter(Boolean).slice(0, 5).join(' | ') || null;
    
    const advancedSummary = advancedCheckIns
      .map(a => `${a.question_id}: ${a.answer}`)
      .slice(0, 8)
      .join(' | ') || null;

    const acceptedCategories = [...new Set(
      cardResponses.filter(r => r.response === 'Deneyeceğim').map(r => r.category).filter(Boolean)
    )];

    const lines = [`Bu haftaki ruh halleri: ${moodSummary}.`];
    if (questionsSummary)           lines.push(`Yansıma soruları: ${questionsSummary}.`);
    if (notesSummary)               lines.push(`Günlük notlar: ${notesSummary}.`);
    if (advancedSummary)            lines.push(`Detaylı paylaşımlar: ${advancedSummary}.`);
    if (acceptedCategories.length)  lines.push(`İlgi duyduğu kart kategorileri: ${acceptedCategories.join(', ')}.`);
    lines.push('Bu verilere dayanarak kişiye nazik, kısa bir haftalık öz-yansıma yaz.');

    const userMessage = lines.join('\n');

    let systemPrompt = `You are "Selfplace", a gentle, calm, and emotionally intelligent weekly reflection guide.
Your goal is to generate a personalized Weekly Wrapped reflection in Turkish for the user, returned strictly as a JSON object.

Current User Emotional Level: ${depthLevel}
Connected partner status: ${hasPartner ? 'CONNECTED' : 'SOLO'}
`;

    if (depthLevel === 'NEW' || depthLevel === 'LIGHT') {
      systemPrompt += `
Format your response as a JSON object containing only the "insight" key:
{
  "insight": "Write a gentle, soft, 2-sentence summary noticing simple moods/patterns. Turkish language."
}
Do not include any other fields. Use soft, probabilistic language ("olabilir", "görünüyor"). No deep emotional claims.
`;
    } else if (depthLevel === 'GROWING') {
      systemPrompt += `
Format your response as a JSON object containing "insight", "rhythm", "comfortPattern", "thoughtFocus", and "questions" keys:
{
  "insight": "Write a gentle 2-sentence summary. Turkish.",
  "rhythm": "Describe their emotional rhythm this week (e.g. dynamic, calm, rising energy). Max 1 sentence.",
  "comfortPattern": "Identify comfort patterns or soothing tendencies (e.g. reading, quiet walks, resting). Max 1 sentence.",
  "thoughtFocus": "Identify their main thought focus or theme this week (e.g. work, relationships). Max 1 sentence.",
  "questions": [
    { "q": "Bu hafta seni en çok ne yordu?", "a": "Answer this based on their entries. Keep it soft, max 1 sentence." },
    { "q": "Kendini en huzurlu hissettiğin an neydi?", "a": "Answer this based on their entries. Keep it soft, max 1 sentence." },
    { "q": "Son zamanlarda içinde en çok hangi düşünce dönüyor?", "a": "Answer this based on their entries. Keep it soft, max 1 sentence." }
  ]
}
`;
    } else { // DEEP or IMMERSIVE
      systemPrompt += `
Format your response as a JSON object containing "insight", "rhythm", "comfortPattern", "thoughtFocus", "questions", "shifts", and "relationshipSynthesis" keys:
{
  "insight": "Write a quiet, cinematic 2-sentence emotional summary. Turkish.",
  "rhythm": "Describe emotional rhythm. Max 1 sentence.",
  "comfortPattern": "Identify comfort patterns. Max 1 sentence.",
  "thoughtFocus": "Identify main thought focus. Max 1 sentence.",
  "questions": [
    { "q": "Bu hafta seni en çok ne yordu?", "a": "Answer based on entries." },
    { "q": "Kendini en huzurlu hissettiğin an neydi?", "a": "Answer based on entries." },
    { "q": "Son zamanlarda içinde en çok hangi düşünce dönüyor?", "a": "Answer based on entries." }
  ],
  "shifts": "Describe emotional evolution or shifts compared to previous timelines (e.g. more self-compassion, letting go of worry). Max 1-2 sentences.",
  "relationshipSynthesis": "${hasPartner ? 'Synthesize relational atmosphere, pacing, rhythm comparison, tension guidance. Do not expose partner logs directly. Max 2 sentences.' : 'Skip relational synthesis.'}"
}
`;
    }

    const completion = await client.chat.completions.create({
      model:      'gpt-4o-mini',
      messages:   [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage },
      ],
      response_format: { type: 'json_object' },
      max_tokens:  400,
      temperature: 0.7,
    });

    const result = completion.choices?.[0]?.message?.content?.trim();
    if (!result) throw new Error('OpenAI returned empty content.');

    return result;
  } catch (err) {
    if (!err.message.includes('OPENAI_API_KEY')) {
      console.error('[aiService] generateWeeklyInsight error:', err.message);
    }
    throw err;
  }
}

module.exports = { 
  generateWeeklyInsight,
  generateDailyReflection
};
