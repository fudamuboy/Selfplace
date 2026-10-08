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
  }
  return _openai;
}

// ---------------------------------------------------------------------------
// System prompts
// ---------------------------------------------------------------------------

const DAILY_REFLECTION_PROMPT_TR = `Sen güvenilir, zeki ve sıcak bir arkadaşsın.
Kullanıcıya günü için çok kısa, gerçekçi ve destekleyici bir cümle yaz.
- Sadece 1 kısa cümle.
- Ton: günlük konuşma dili, net, arkadaşça, gerçekçi.
- Şiirsel metaforlardan, spiritüel veya "guru" tarzı dilden kesinlikle kaçın.
- Tavsiye verme, soru sorma.
- Her zaman doğal Türkçe yaz.
Örnek: "Bugün kendine biraz daha fazla zaman ayırman iyi olabilir."`;

const DAILY_REFLECTION_PROMPT_EN = `You are a reliable, thoughtful, and warm friend.
Write a very brief, grounded, and supportive sentence for the user's day.
- Exactly 1 short sentence.
- Tone: warm, conversational, clear, realistic, gentle.
- DO NOT use poetic metaphors, spiritual guruspeak, or self-help cliches.
- Do not give unsolicited advice or ask questions.
- Always write in natural, fluent English.
Example: "It might feel good to give yourself a little extra quiet time today."`;

// ---------------------------------------------------------------------------
// generateDailyReflection
// ---------------------------------------------------------------------------

/**
 * Generates a single, soft sentence for daily reflection.
 */
async function generateDailyReflection(language = 'tr') {
  const isEn = language === 'en';
  try {
    const client = getClient();
    const completion = await client.chat.completions.create({
      model:      'gpt-4o-mini',
      messages:   [
        { role: 'system', content: isEn ? DAILY_REFLECTION_PROMPT_EN : DAILY_REFLECTION_PROMPT_TR },
        { role: 'user',   content: isEn ? 'Could you write a short, calm daily reflection for today?' : 'Bugün için kısa, sakin bir yansıma cümlesi yazar mısın?' },
      ],
      max_tokens:  80,
      temperature: 0.9,
    });

    const result = completion.choices?.[0]?.message?.content?.trim().replace(/^["']|["']$/g, '');
    if (!result) throw new Error('OpenAI returned empty content.');

    return result;
  } catch (err) {
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
 * @param {string} language        - 'tr' | 'en'
 * @returns {Promise<string>} A JSON string representing the Weekly Wrapped
 */
async function generateWeeklyInsight(userData, depthLevel = 'NEW', hasPartner = false, language = 'tr') {
  const isEn = language === 'en';
  try {
    const { checkIns = [], cardResponses = [], advancedCheckIns = [] } = userData;
    const client = getClient();

    // --- Build a compact summary ---
    const moodSummary     = checkIns.map(c => c.mood).filter(Boolean).join(', ') || (isEn ? 'unknown' : 'bilinmiyor');
    const notesSummary    = checkIns.map(c => c.note).filter(Boolean).slice(0, 5).join(' | ') || null;
    const questionsSummary = checkIns.map(c => c.reflection_question).filter(Boolean).slice(0, 5).join(' | ') || null;
    
    const advancedSummary = advancedCheckIns
      .map(a => `${a.question_id}: ${a.answer}`)
      .slice(0, 8)
      .join(' | ') || null;

    const acceptedCategories = [...new Set(
      cardResponses.filter(r => r.response === 'Deneyeceğim' || r.response === 'I will try').map(r => r.category).filter(Boolean)
    )];

    const lines = isEn 
      ? [`Moods this week: ${moodSummary}.`] 
      : [`Bu haftaki ruh halleri: ${moodSummary}.`];
    if (questionsSummary)           lines.push(isEn ? `Reflection questions: ${questionsSummary}.` : `Yansıma soruları: ${questionsSummary}.`);
    if (notesSummary)               lines.push(isEn ? `Daily notes: ${notesSummary}.` : `Günlük notlar: ${notesSummary}.`);
    if (advancedSummary)            lines.push(isEn ? `Detailed reflections: ${advancedSummary}.` : `Detaylı paylaşımlar: ${advancedSummary}.`);
    if (acceptedCategories.length)  lines.push(isEn ? `Interested card categories: ${acceptedCategories.join(', ')}.` : `İlgi duyduğu kart kategorileri: ${acceptedCategories.join(', ')}.`);
    lines.push(isEn ? 'Based on this data, write a gentle, short weekly self-reflection.' : 'Bu verilere dayanarak kişiye nazik, kısa bir haftalık öz-yansıma yaz.');

    const userMessage = lines.join('\n');

    let systemPrompt = `You are "Selfplace", a thoughtful, grounded, emotionally intelligent friend.
Your goal is to generate a personalized Weekly Wrapped reflection in ${isEn ? 'ENGLISH' : 'TURKISH'} for the user, returned strictly as a JSON object.
Use natural daily conversational language. DO NOT use poetic metaphors, spiritual guruspeak, or dramatic emotional language.

Current User Emotional Level: ${depthLevel}
Connected partner status: ${hasPartner ? 'CONNECTED' : 'SOLO'}
Target Language: ${isEn ? 'ENGLISH (en)' : 'TURKISH (tr)'}
`;

    if (depthLevel === 'NEW' || depthLevel === 'LIGHT') {
      systemPrompt += `
Format your response as a JSON object containing only the "insight" key:
{
  "insight": "Write a grounded, natural 2-sentence summary noticing simple moods/patterns. ${isEn ? 'English language.' : 'Turkish language.'}"
}
Do not include any other fields. Use realistic, probabilistic language (${isEn ? '"seems like", "might have"' : '"olabilir", "görünüyor"'}). No overly deep emotional claims.
`;
    } else if (depthLevel === 'GROWING') {
      systemPrompt += `
Format your response as a JSON object containing "insight", "rhythm", "comfortPattern", "thoughtFocus", and "questions" keys:
{
  "insight": "Write a grounded 2-sentence summary in ${isEn ? 'English' : 'Turkish'}.",
  "rhythm": "Describe their rhythm this week naturally (e.g. busy, calm, steady). Max 1 sentence.",
  "comfortPattern": "Identify practical comfort patterns (e.g. quiet walks, reading, resting). Max 1 sentence.",
  "thoughtFocus": "Identify their main thought focus or theme this week (e.g. work, relationships, self-care). Max 1 sentence.",
  "questions": [
    { "q": "${isEn ? 'What drained your energy most this week?' : 'Bu hafta seni en çok ne yordu?'}", "a": "Answer based on their entries. Keep it conversational, max 1 sentence." },
    { "q": "${isEn ? 'When did you feel most at peace?' : 'Kendini en huzurlu hissettiğin an neydi?'}", "a": "Answer based on their entries. Keep it conversational, max 1 sentence." },
    { "q": "${isEn ? 'What thought has been lingering in your mind lately?' : 'Son zamanlarda içinde en çok hangi düşünce dönüyor?'}", "a": "Answer based on their entries. Keep it conversational, max 1 sentence." }
  ]
}
`;
    } else { // DEEP or IMMERSIVE
      systemPrompt += `
Format your response as a JSON object containing "insight", "rhythm", "comfortPattern", "thoughtFocus", "questions", "shifts", and "relationshipSynthesis" keys:
{
  "insight": "Write a grounded, natural 2-sentence emotional summary in ${isEn ? 'English' : 'Turkish'}.",
  "rhythm": "Describe emotional rhythm naturally. Max 1 sentence.",
  "comfortPattern": "Identify comfort patterns. Max 1 sentence.",
  "thoughtFocus": "Identify main thought focus. Max 1 sentence.",
  "questions": [
    { "q": "${isEn ? 'What drained your energy most this week?' : 'Bu hafta seni en çok ne yordu?'}", "a": "Answer based on entries." },
    { "q": "${isEn ? 'When did you feel most at peace?' : 'Kendini en huzurlu hissettiğin an neydi?'}", "a": "Answer based on entries." },
    { "q": "${isEn ? 'What thought has been lingering in your mind lately?' : 'Son zamanlarda içinde en çok hangi düşünce dönüyor?'}", "a": "Answer based on entries." }
  ],
  "shifts": "Describe evolution or shifts naturally compared to previous timelines. Max 1-2 sentences.",
  "relationshipSynthesis": "${hasPartner ? 'Synthesize relational atmosphere, pacing, tension naturally without poetry. Max 2 sentences.' : 'Skip relational synthesis.'}"
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
async function generatePersonalityArchetype(baseArchetype, dimensionScores, language = 'tr') {
  const isEn = language === 'en';
  try {
    const client = getClient();
    const systemPrompt = `You are "Selfplace", a calm, emotionally intelligent personality guide.
Your goal is to enrich a base personality archetype into a deeply personalized and grounded evaluation in ${isEn ? 'ENGLISH' : 'TURKISH'}.
DO NOT use clinical, psychiatric, or medically diagnostic language (e.g. avoid "avoidant attachment disorder", "unstable").
Instead, use natural, empathetic, and realistic descriptions (e.g. ${isEn ? '"Sometimes you prefer processing feelings quietly on your own"' : '"Bazen duygularını kendi içinde yaşamayı tercih ediyorsun"'}).

Base Archetype: ${baseArchetype.name}
Base Description: ${baseArchetype.description}
User's Dimension Scores:
${JSON.stringify(dimensionScores, null, 2)}
Language: ${isEn ? 'ENGLISH (en)' : 'TURKISH (tr)'}

Generate a JSON object with the following fields:
{
  "archetype_name": "${isEn ? 'A unique English name inspired by the Base Archetype (e.g. Calm Observer, Gentle Connector)' : 'A unique Turkish name inspired by the Base Archetype'}",
  "description": "A 2-3 sentence grounded, realistic summary of their inner world in ${isEn ? 'English' : 'Turkish'}.",
  "relationship_style": "1-2 sentences on how they naturally bond, love, or connect with others in ${isEn ? 'English' : 'Turkish'}.",
  "strengths": ["${isEn ? 'Strength 1 in English' : 'Strength 1 in Turkish'}", "Strength 2", "Strength 3"],
  "blind_spots": ["${isEn ? 'Blind spot 1 in English' : 'Blind spot 1 in Turkish'}", "Blind spot 2"],
  "communication_energy": "A short realistic sentence on how they express themselves in ${isEn ? 'English' : 'Turkish'}."
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
async function generatePersonalityDrift(oldScores, newScores, language = 'tr') {
  const isEn = language === 'en';
  try {
    const client = getClient();
    const systemPrompt = `You are "Selfplace", a calm, emotionally intelligent personality guide.
The user has retaken their personality journey. We want to observe how their emotional energy has subtly shifted.

Old Scores: ${JSON.stringify(oldScores)}
New Scores: ${JSON.stringify(newScores)}
Language: ${isEn ? 'ENGLISH (en)' : 'TURKISH (tr)'}

DO NOT use diagnostic, medical, or judgmental language (e.g., "better", "worse", "improved", "declined").
DO NOT use clinical terms like "avoidant" or "unstable".
Use grounded, clear, and natural conversational language in ${isEn ? 'ENGLISH' : 'TURKISH'}. NO poetic metaphors.

Write a single, grounded 1-2 sentence observation in ${isEn ? 'English' : 'Turkish'} about how their emotional style is evolving. If the scores are almost identical, mention how their core energy remains deeply rooted and stable.

Respond ONLY with a valid JSON object containing:
{
  "evolution_summary": "A 2-3 sentence natural reflection on their overall emotional journey in ${isEn ? 'English' : 'Turkish'}.",
  "dominant_shift": "A 1-2 sentence specific realistic observation of the most noticeable dimensional change in ${isEn ? 'English' : 'Turkish'}."
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
    return null;
  }
}

// ---------------------------------------------------------------------------
// generateRitualReflection
// ---------------------------------------------------------------------------
async function generateRitualReflection(ritualQuestion, partnerAAnswer, partnerBAnswer, language = 'tr') {
  const isEn = language === 'en';
  try {
    const client = getClient();
    const systemPrompt = `You are the emotional reflection engine of a relationship wellness app called Selfplace.

Your task is to analyze two relationship ritual answers written by romantic partners and generate a deeply human, grounded shared reflection in ${isEn ? 'ENGLISH' : 'TURKISH'}.

IMPORTANT RULES:
* NEVER sound robotic, clinical, or generic.
* NEVER invent emotions that are not supported by the answers.
* The reflection MUST be based directly on the emotional tone, wording, vulnerability, affection, gratitude, tension, reassurance, emotional distance, or warmth detected in BOTH answers.
* The response should feel natural, conversational, and emotionally aware. NO poetic metaphors.
* Avoid exaggeration.
* Do not repeat the users' exact words.
* Do not make the reflection too long.
* Generate all fields (relationship_reflection, emotional_climate, gentle_suggestion, crystal_summary) in ${isEn ? 'ENGLISH' : 'TURKISH'}.

You must generate:
1. relationship_reflection
   → A warm, grounded emotional synthesis of both answers in ${isEn ? 'English' : 'Turkish'}.
2. emotional_climate
   → A short emotional atmosphere label in ${isEn ? 'English' : 'Turkish'}.
   Examples ${isEn ? '(e.g. "Calm Intimacy", "Grounded Gratitude", "Gentle Balance", "Open Communication")' : '(e.g. "Sakin Yakınlık", "Gerçekçi Minnettarlık", "Hassas Denge")'}.
3. gentle_suggestion
   → A practical, supportive suggestion in ${isEn ? 'English' : 'Turkish'}.
4. is_memory_crystal
   → A boolean indicating if the combined answers represent a milestone/breakthrough/healing moment.
5. crystal_summary
   → A short summary/title in ${isEn ? 'English' : 'Turkish'} (max 4 words) if is_memory_crystal is true. Otherwise empty.
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
