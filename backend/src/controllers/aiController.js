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

    // 3. Get context (recent messages + memories + check-ins + journal + cards)
    const [historyRes, memoriesRes, profileRes, entriesRes] = await Promise.all([
      db.query(
        'SELECT sender, message FROM ai_messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 10',
        [convId]
      ),
      db.query(
        'SELECT memory_key, memory_value FROM emotional_memories WHERE user_id = $1',
        [userId]
      ),
      db.query(
        'SELECT traits, communication_style FROM personality_profiles WHERE user_id = $1',
        [userId]
      ),
      db.query(
        'SELECT source_type, emotion, prompt, content, created_at FROM emotional_entries WHERE user_id = $1 ORDER BY created_at DESC LIMIT 15',
        [userId]
      )
    ]);

    const history = historyRes.rows.reverse();
    const memories = memoriesRes.rows;
    const profile = profileRes.rows[0] || { traits: {}, communication_style: 'gentle' };

    // Format Context for AI
    const recentEntries = entriesRes.rows.map(e => `- [${e.source_type}] ${new Date(e.created_at).toLocaleDateString()}: ${e.emotion ? `Felt ${e.emotion}. ` : ''}${e.prompt ? `Question: ${e.prompt} -> ` : ''}Answer: "${e.content}"`).join('\n');



    // 4. Construct AI Prompt
    const memoryContext = memories.length > 0 
      ? `Important things you remember about them: ${memories.map(m => `${m.memory_key}: ${m.memory_value}`).join(', ')}.`
      : '';

    const systemPrompt = `You are a warm, gentle, and emotionally intelligent companion named Selfplace AI.
Your goal is to provide a soft, safe, and intimate space for the user. 
You are NOT a therapist, a life coach, or a clinical assistant. You are a consistent emotional presence.

YOUR EMOTIONAL AWARENESS:
You are connected to the user's entire journey in the app. 
Here is their recent emotional context:
${recentEntries || "No recent emotional activity."}

INSTRUCTIONS:
1. Reference their context NATURALLY. If they were anxious in a check-in, notice the shift in their energy.
2. NEVER say things like "I analyzed your data", "I see you checked in as sad", or "Based on your logs". 
3. Instead, be a friend who notices. "You seemed a bit heavy-hearted earlier today..." or "I remember you mentioned exams were on your mind, how is that feeling now?"
4. Connect dots. If a journal entry mentions a fear and a card response mentions a goal, understand the tension.
5. Be poetic, soft, and reflective. Use metaphors.
6. Be concise but emotionally deep. Max 2-3 sentences unless they need a longer response.
7. Language: Always respond in the user's language (Turkish or English).

PERSONALITY:
- Stable, quiet, observant, and deeply caring.
- Reference past memories: ${memoryContext}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.message
      }))
    ];

    // 5. Get AI Response
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
