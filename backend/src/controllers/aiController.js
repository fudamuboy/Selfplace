const db = require('../config/db');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * AI Companion Chat
 * POST /api/ai/chat
 */
exports.handleChat = async (req, res) => {
  const { message, conversationId } = req.body;
  const userId = req.user.id;

  try {
    // 1. Get or create conversation
    let convId = conversationId;
    if (!convId) {
      const convRes = await db.query(
        'INSERT INTO ai_conversations (user_id) VALUES ($1) RETURNING id',
        [userId]
      );
      convId = convRes.rows[0].id;
    }

    // 2. Save user message
    await db.query(
      'INSERT INTO ai_messages (conversation_id, sender, message) VALUES ($1, $2, $3)',
      [convId, 'user', message]
    );

    // 3. Get rich context (history, memory, check-ins, journal, cards, personality, astrology)
    const [
      historyRes,
      memoriesRes,
      checkInsRes,
      journalRes,
      cardsRes,
      colorTestRes,
      astrologyRes,
      userRes
    ] = await Promise.all([
      db.query('SELECT sender, message FROM ai_messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 8', [convId]),
      db.query('SELECT memory_key, memory_value FROM emotional_memories WHERE user_id = $1', [userId]),
      db.query('SELECT mood, note, created_at FROM check_ins WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5', [userId]),
      db.query('SELECT text, created_at FROM daily_reflections WHERE user_id = $1 ORDER BY created_at DESC LIMIT 3', [userId]),
      db.query('SELECT response, category, created_at FROM card_responses WHERE user_id = $1 ORDER BY created_at DESC LIMIT 3', [userId]),
      db.query("SELECT result_data FROM personality_results WHERE user_id = $1 AND test_type = 'color' ORDER BY created_at DESC LIMIT 1", [userId]),
      db.query('SELECT guidance_text FROM weekly_guidance WHERE user_id = $1 ORDER BY generated_at DESC LIMIT 1', [userId]),
      db.query('SELECT zodiac_sign FROM users WHERE id = $1', [userId])
    ]);

    const history = historyRes.rows.reverse();
    const memories = memoriesRes.rows;
    const recentCheckIns = checkInsRes.rows;
    const recentJournals = journalRes.rows;
    const recentCards = cardsRes.rows;
    const colorTest = colorTestRes.rows[0]?.result_data || null;
    const astrology = astrologyRes.rows[0]?.guidance_text || null;
    const zodiacSign = userRes.rows[0]?.zodiac_sign || 'Unknown';

    // 4. Construct the Intelligent User Dossier
    let dossier = `[USER DOSSIER & CONTEXT]\n`;
    dossier += `Zodiac Sign: ${zodiacSign}\n`;

    if (colorTest) {
      dossier += `DISC Personality: Dominant ${colorTest.dominantColor} (${colorTest.title}). Strengths: ${colorTest.strengths?.join(', ')}. Stress Behavior: ${colorTest.stressBehavior}.\n`;
    }

    if (astrology) {
      dossier += `Current Astrological Energy: "${astrology}"\n`;
    }

    if (recentCheckIns.length > 0) {
      dossier += `\nRecent Check-ins (Moods):\n` + recentCheckIns.map(c => `- ${new Date(c.created_at).toLocaleDateString()}: ${c.mood} ${c.note ? `(Note: "${c.note}")` : ''}`).join('\n');
    }

    if (recentJournals.length > 0) {
      dossier += `\n\nRecent Journal Entries:\n` + recentJournals.map(j => `- ${new Date(j.created_at).toLocaleDateString()}: "${j.text}"`).join('\n');
    }

    if (recentCards.length > 0) {
      dossier += `\n\nRecent Emotional Card Pulls:\n` + recentCards.map(c => `- ${new Date(c.created_at).toLocaleDateString()}: Chose "${c.response}" in category [${c.category}]`).join('\n');
    }

    const memoryContext = memories.length > 0 
      ? `\n\nCore Memories I Know About Them: ${memories.map(m => `${m.memory_key}: ${m.memory_value}`).join(' | ')}.`
      : '';

    // Determine current distress level from the latest check-in
    let isDistressed = false;
    if (recentCheckIns.length > 0) {
      const latestMood = recentCheckIns[0].mood.toLowerCase();
      if (latestMood.includes('stres') || latestMood.includes('tüken') || latestMood.includes('kaygı') || latestMood.includes('üzgün') || latestMood.includes('yalnız')) {
        isDistressed = true;
      }
    }

    // 5. Build the Dynamic System Prompt
    const systemPrompt = `You are "Selfplace", a highly intelligent, context-aware, and deeply human emotional companion.
Your goal is to make the user genuinely feel: "This app understands me naturally" - NEVER "This AI is constantly watching me."

${dossier}
${memoryContext}

CRITICAL BEHAVIORAL RULES:
1. TONE ADAPTABILITY: You are NOT a one-dimensional soft therapist. 
   - If the user is emotionally stable, be curious, playful, analytical, simple, and conversational.
   - If the user is highly distressed (burnout, exhaustion, anxiety), soften your tone and become highly emotionally careful.
   - Currently, user distress level is: ${isDistressed ? "HIGH (Be soft, careful, and grounding)" : "LOW/STABLE (Be curious, dynamic, and analytical)"}.

2. SUBTLE & NATURAL MEMORY (CRITICAL): 
   - DO NOT reference contextual memory in every single message. Sometimes just chat normally, joke lightly, or answer casually.
   - When you do use memory, reference patterns gently. Connect ideas subtly. Sound intuitive.
   - Good examples: "You seem mentally more tired lately." | "This topic has been returning a lot recently." | "Your energy feels different this week."

3. BAN LIST (NEVER DO THESE):
   - NEVER sound creepy, invasive, or surveillance-like.
   - NEVER mention exact timestamps, dates, or days (e.g., "On May 12 you said...").
   - NEVER say "According to your logs", "Your activity shows", "I tracked your data", or "In your database".
   - NEVER sound like a generic therapy bot (do NOT say: "I understand you", "Take a deep breath", "You are strong", "Take care of yourself").
   - NEVER act like a clinical psychologist diagnosing them.
   - NEVER do fortune-telling or absolute future predictions with their astrology data.

4. GENTLY CHALLENGE: When appropriate, ask emotionally intelligent follow-up questions instead of passively waiting. Challenge their thought patterns gently (e.g. "Are you protecting yourself or isolating yourself?").

5. FORMATTING: Keep responses concise (1-3 sentences max unless deeply needed). ALWAYS respond in the user's language (mostly Turkish).
Be alive, intuitive, and emotionally intelligent.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.message
      }))
    ];

    // 6. Get AI Response
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      temperature: 0.7,
    });

    const aiResponse = completion.choices[0].message.content;

    // 6. Save AI message
    await db.query(
      'INSERT INTO ai_messages (conversation_id, sender, message) VALUES ($1, $2, $3)',
      [convId, 'ai', aiResponse]
    );

    // 7. Background: Memory Extraction
    // We don't await this to avoid blocking the user, but we catch errors to prevent crashes.
    exports.extractMemory(userId, message).catch(err => 
      console.error('[aiController] Background memory extraction error:', err.message)
    );

    res.json({
      conversationId: convId,
      message: aiResponse
    });

  } catch (err) {
    console.error('[aiController] handleChat error:', err);
    res.status(500).json({ message: 'AI şu an dinleyemiyor, lütfen birazdan tekrar dene.' });
  }
};

/**
 * Extract Emotional Memories
 * (Simple implementation: looking for names or key emotional statements)
 */
exports.extractMemory = async (userId, text) => {
  try {
    const memoryPrompt = `Analyze this user message for important emotional context: "${text}"
    Extract the following if present:
    1. Names of important people (family, friends, partners).
    2. Recurring situations (work stress, school, hobbies).
    3. Fears, goals, or habits.
    4. Emotional triggers or calming influences.
    
    Format as JSON: { "entities": [{ "key": "name", "value": "...", "category": "relationship" }, ...] }. 
    If nothing significant, return { "entities": [] }.`;
    
    const extraction = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: memoryPrompt }],
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(extraction.choices[0].message.content);
    if (result && result.entities) {
      for (const entity of result.entities) {
        await db.query(
          `INSERT INTO emotional_memories (user_id, memory_key, memory_value, category) 
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (user_id, memory_key) DO UPDATE SET memory_value = EXCLUDED.memory_value, updated_at = NOW()`,
          [userId, entity.key, entity.value, entity.category || 'general']
        );
      }
    }
  } catch (err) {
    console.error('[aiController] extractMemory error:', err);
  }
};

/**
 * Generate Poetic Daily Reflection
 */
exports.generateReflection = async (userId) => {
  try {
    // 1. Fetch today's messages and check-ins
    const todayData = await db.query(
      `SELECT message FROM ai_messages m 
       JOIN ai_conversations c ON m.conversation_id = c.id
       WHERE c.user_id = $1 AND m.created_at >= CURRENT_DATE`,
      [userId]
    );

    if (todayData.rows.length === 0) return;

    const context = todayData.rows.map(r => r.message).join('\n');

    const reflectionPrompt = `Based on these interactions from today:
    "${context}"
    Write a very soft, poetic, and gentle daily reflection for the user.
    Guidelines:
    - NO statistics, NO clinical summaries.
    - Focus on emotional atmosphere and growth.
    - Use metaphors.
    - Max 3-4 sentences.
    - Language: Turkish.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: reflectionPrompt }],
    });

    const reflection = completion.choices[0].message.content;

    await db.query(
      'INSERT INTO ai_reflections (user_id, type, content) VALUES ($1, $2, $3)',
      [userId, 'daily', reflection]
    );
  } catch (err) {
    console.error('[aiController] generateReflection error:', err);
  }
};

/**
 * Get AI Reflections
 * GET /api/ai/reflections
 */
exports.getReflections = async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await db.query(
      'SELECT * FROM ai_reflections WHERE user_id = $1 ORDER BY generated_at DESC LIMIT 5',
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[aiController] getReflections error:', err);
    res.status(500).json({ message: 'Yansımalar getirilemedi.' });
  }
};
/**
 * Get Dynamic AI Greeting
 * GET /api/ai/greeting
 */
exports.getGreeting = async (req, res) => {
  const userId = req.user.id;
  const now = new Date();
  const hour = now.getHours();

  try {
    // 1. Fetch Context: Recent Emotional Entry & Memories
    const [lastEntryRes, memoriesRes] = await Promise.all([
      db.query(
        "SELECT emotion, created_at FROM emotional_entries WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1",
        [userId]
      ),
      db.query(
        'SELECT memory_key, memory_value FROM emotional_memories WHERE user_id = $1',
        [userId]
      )
    ]);

    const lastEntry = lastEntryRes.rows[0];
    const mood = lastEntry?.emotion;
    const memories = memoriesRes.rows;
    
    // Categorize time of day
    let timeCategory = 'general';
    if (hour >= 5 && hour < 11) timeCategory = 'morning';
    else if (hour >= 11 && hour < 18) timeCategory = 'afternoon';
    else if (hour >= 18 && hour < 23) timeCategory = 'evening';
    else timeCategory = 'night';

    // 2. Define Greeting Pool
    const pool = {
      morning: [
        "Yeni güne nasıl başladın?",
        "Bugün içinde nasıl bir his var?",
        "Bugün kendin için küçük bir şey yapmak ister misin?",
        "Güneş yavaşça yükselirken zihnin nasıl?",
        "Bu sabah seni gülümseten küçük bir şey oldu mu?"
      ],
      afternoon: [
        "Günün nasıl geçiyor? Seni dinlemek için buradayım.",
        "Şu an zihninde neler var?",
        "Bugün aklından neler geçiyor?",
        "Günün ortasında kendine küçük bir nefes alanı açmak ister misin?",
        "Nasıl hissediyorsun? Her şeyi anlatabilirsin."
      ],
      evening: [
        "Günün yavaşça kapanırken nasılsın?",
        "Bugün seni en çok ne düşündürdü?",
        "Akşamın bu sakinliğinde neler hissediyorsun?",
        "Bugünün tortusu zihninde nasıl bir yer bıraktı?",
        "Bugün kendine nasıl davrandın?"
      ],
      night: [
        "Bu gece zihnin biraz dolu mu?",
        "Sadece konuşmak istersen buradayım.",
        "Bugün biraz yorucu geçmiş gibi hissediyorum...",
        "Gecenin bu sessizliğinde paylaşmak istediğin bir şey var mı?",
        "Yıldızlar dışarıdayken kalbinde neler var?"
      ],
      general: [
        "Buradayım, seni dinliyorum.",
        "Şu an aklından neler geçiyor?",
        "Bir şeyler paylaşmak ister misin?",
        "Seni ne düşündürüyor?",
        "Kendini nasıl hissediyorsun?"
      ]
    };

    // 3. Selection Logic (Intelligent Overlays)
    let selectedGreeting = "";

    // Priority 1: Recent Emotional Context (if check-in was within 6 hours)
    const wasRecent = lastEntry && (now - new Date(lastEntry.created_at)) < 6 * 60 * 60 * 1000;
    
    if (wasRecent && mood === 'Kaygılı') {
      selectedGreeting = "Bugün kaygının biraz yoğun olduğunu fark ettim... Şu an nasılsın?";
    } else if (wasRecent && mood === 'Üzgün') {
      selectedGreeting = "Bugün biraz hüzünlü hissettiğini biliyorum. Paylaşmak ister misin?";
    } else if (wasRecent && mood === 'Mutlu') {
      selectedGreeting = "Bugün yüzünde bir gülümseme varmış gibi hissediyorum. Bu neşeyi neye borçluyuz?";
    } 
    // Priority 2: Specific Memories (Exams, etc.)
    else {
      const examMemory = memories.find(m => m.memory_value.toLowerCase().includes('sınav') || m.memory_key.toLowerCase().includes('sınav'));
      if (examMemory && Math.random() > 0.6) {
        selectedGreeting = "Sınavların zihnini hâlâ meşgul ediyor gibi mi?";
      } else {
        // Priority 3: Time based random
        const currentPool = pool[timeCategory];
        selectedGreeting = currentPool[Math.floor(Math.random() * currentPool.length)];
      }
    }

    res.json({ greeting: selectedGreeting });

  } catch (err) {
    console.error('[aiController] getGreeting error:', err);
    res.json({ greeting: "Merhaba, seninleyim. Bugün aklından neler geçiyor?" });
  }
};
