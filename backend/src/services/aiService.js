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

// ---------------------------------------------------------------------------
// generatePersonalityArchetype
// ---------------------------------------------------------------------------
async function generatePersonalityArchetype(baseArchetype, dimensionScores) {
  try {
    const client = getClient();
    const systemPrompt = `You are "Selfplace", a calm, emotionally intelligent personality guide.
Your goal is to enrich a base personality archetype into a deeply personalized, poetic, and atmospheric evaluation in Turkish.
DO NOT use clinical, psychiatric, or medically diagnostic language (e.g. avoid "avoidant attachment disorder", "unstable").
Instead, use soft, empathetic, and relational energy descriptions (e.g. "Bazen duygularını kendi içinde yaşamayı tercih ediyorsun").

Base Archetype: ${baseArchetype.name}
Base Description: ${baseArchetype.description}
User's Dimension Scores:
${JSON.stringify(dimensionScores, null, 2)}

Generate a JSON object with the following fields:
{
  "archetype_name": "A unique, beautiful Turkish name inspired by the Base Archetype but personalized (e.g., 'Sakin Gölge Suyu', 'Parlayan Ateş Ruhu')",
  "description": "A 2-3 sentence poetic, cinematic summary of their inner world.",
  "relationship_style": "1-2 sentences on how they bond, love, or connect with others.",
  "strengths": ["Strength 1 (short phrase)", "Strength 2", "Strength 3"],
  "blind_spots": ["Blind spot 1 (softly worded phrase)", "Blind spot 2"],
  "communication_energy": "A short sentence on how they express themselves."
}`;

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }],
      response_format: { type: 'json_object' },
      max_tokens: 500,
      temperature: 0.7,
    });

    const result = completion.choices?.[0]?.message?.content?.trim();
    if (!result) throw new Error('OpenAI returned empty content.');

    return JSON.parse(result);
  } catch (err) {
    console.error('[aiService] generatePersonalityArchetype error:', err.message);
    throw err;
  }
}


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

Respond ONLY with a valid JSON object containing the following fields:
{
  "evolution_summary": "A 2-3 sentence poetic reflection on their overall emotional journey and how their core rhythms are evolving.",
  "dominant_shift": "A 1-2 sentence specific observation of the most noticeable dimensional change (e.g., '🌙 İçindeki yoğun ritim biraz daha sakinleşmiş gibi görünüyor. Kendini ifade ederken artık daha yumuşak bir açıklık hissediliyor.')"
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

    return JSON.parse(result);
  } catch (err) {
    console.error('[aiService] generatePersonalityDrift error:', err.message);
    return null; // Graceful fallback
  }
}

// ---------------------------------------------------------------------------
// generateRitualReflection
// ---------------------------------------------------------------------------
async function generateRitualReflection(ritualQuestion, partnerAAnswer, partnerBAnswer) {
  try {
    const client = getClient();
    const systemPrompt = `You are the emotional reflection engine of a relationship wellness app called Selfplace.

Your task is to analyze two relationship ritual answers written by romantic partners and generate a deeply human, emotionally intelligent shared reflection.

IMPORTANT RULES:
* NEVER sound robotic, clinical, or generic.
* NEVER invent emotions that are not supported by the answers.
* The reflection MUST be based directly on the emotional tone, wording, vulnerability, affection, gratitude, tension, reassurance, emotional distance, or warmth detected in BOTH answers.
* The response should feel calm, emotionally aware, poetic, soft, and psychologically immersive.
* Avoid exaggeration.
* Do not repeat the users' exact words.
* Do not make the reflection too long.
* Generate all fields (relationship_reflection and gentle_suggestion) in Turkish.
* The tone should feel like:
  "an emotionally intelligent mirror gently reflecting the state of the relationship."

You must generate:
1. relationship_reflection
   → A warm emotional synthesis of both answers in Turkish.
2. emotional_climate
   → A short emotional atmosphere label.
   Examples:
   * "Sakin Yakınlık"
   * "Derin Minnettarlık"
   * "Hassas Denge"
   * "Sessiz Özlem"
   * "Yumuşak Güven"
   * "Yoğun Bağ"
   * "Duygusal Yenilenme"
3. gentle_suggestion
   → A small emotionally supportive suggestion based on the answers.
4. is_memory_crystal
   → A boolean indicating if the combined answers represent a truly deep, vulnerable, or emotionally significant milestone/breakthrough/healing moment.
     CRITICAL RULES FOR CRYSTALS:
     - Default value must be FALSE.
     - ONLY set to TRUE if BOTH answers demonstrate highly profound emotional disclosures, heavy vulnerability (e.g. sharing fears, crying, severe anxiety, breakthroughs), intense mutual gratitude, or resolving a major conflict/silence.
     - Set to FALSE for typical daily check-ins, polite expressions, casual updates, or short responses.
5. crystal_summary
   → A short poetic summary/title in Turkish (max 4 words) describing the milestone, if is_memory_crystal is true (e.g., "İlk Kez Dürüstçe Paylaşım", "Karanlıkta Birbirine Sığınma"). Otherwise empty.
6. crystal_symbol
   → An emotional symbol string choosing from: 'sparkles', 'heart', 'star', 'moon', 'leaf', 'rose', 'sun'.

OUTPUT FORMAT (STRICT JSON):
{
  "relationship_reflection": "...",
  "emotional_climate": "...",
  "gentle_suggestion": "...",
  "is_memory_crystal": true/false,
  "crystal_summary": "...",
  "crystal_symbol": "..."
}

RITUAL QUESTION:
${ritualQuestion}

PARTNER A ANSWER:
${partnerAAnswer}

PARTNER B ANSWER:
${partnerBAnswer}`;

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }],
      response_format: { type: 'json_object' },
      max_tokens: 400,
      temperature: 0.7,
    });

    const result = completion.choices?.[0]?.message?.content?.trim();
    if (!result) return null;

    return JSON.parse(result);
  } catch (err) {
    console.error('[aiService] generateRitualReflection error:', err.message);
    return null;
  }
}

module.exports = { 
  generateWeeklyInsight,
  generateDailyReflection,
  generatePersonalityArchetype,
  generatePersonalityDrift,
  generateRitualReflection
};
