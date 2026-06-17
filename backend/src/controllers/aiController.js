const db = require('../config/db');
const OpenAI = require('openai');
const { buildEmotionalContext, updateEmotionalContinuity } = require('../services/emotionalContextBuilder');
const { extractCoupleMemory, updateIndividualBehavioralMemory, detectRelationshipResolutionState } = require('../services/coupleMemoryService');
const { buildContinuityFollowUp, buildContinuityGreeting } = require('../services/relationshipContinuityEngine');

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

    // 3. Fetch conversation history (fetch up to 10 messages to support Signature tier)
    const historyRes = await db.query(
      'SELECT sender, message FROM ai_messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 10',
      [convId]
    );
    let history = historyRes.rows.reverse();

    // Intent detection for conversational repair (asking for clarification / confusion)
    let clarificationInstruction = '';
    const cleanMsg = message.toLowerCase().trim();

    // Turkish clarification signals — expanded keyword set
    const confusionKeywords = [
      'anlamadım', 'anlamadim',
      'ne demek', 'ne demek istiyorsun',
      'açıklar mısın', 'aciklar misin', 'biraz açıklar mısın',
      'nasıl yani', 'nasil yani',
      'neyi kastettin', 'neyi kastetmiştin',
      'ne kastediyorsun', 'neyi kastediyorsun',
      'anlamadım bunu', 'bunu anlamadım',
      'anlıyorum', 'anlayamadım', 'anlayamadim',
      'anlamadım', 'anlamiyorum',
      'yukarıdaki cümleyi açıklar mısın',
      'o cümleyi açıklar mısın',
    ];
    const isClarificationRequest = confusionKeywords.some(keyword => cleanMsg.includes(keyword));

    if (isClarificationRequest && history.length >= 2) {
      // Find the last AI message in history (not necessarily index -2, could be further back)
      const lastAiMsg = [...history].reverse().find(h => h.sender === 'ai');
      if (lastAiMsg) {
        const lastAiText = lastAiMsg.message;
        clarificationInstruction = `
━━━━━━━━━━━━━━━━━━━
⚠️ KONUŞMAYI ONARMA & YENIDEN ÇERÇEVELEME MODU AKTIF ⚠️
━━━━━━━━━━━━━━━━━━━
Kullanıcı bir önceki yanıtını anlamadı ve açıklama istiyor.

Bir önceki AI mesajı buydu:
"${lastAiText}"

Bu modda İLKIN ŞUNLARI YAPMALISIN:
1. KONUYU DEĞİŞTIRME. Aynı duygusal atmosferde kal.
2. Bu mesajı daha basit, daha doğal, daha insani bir dille yeniden ifade et.
3. Özellikle ANLAŞILMAYAN CÜMLE veya KELİMEYİ tespit et ve onu sadeleştir.
4. Yanıt 1-2 cümle olmalı. Kısa, net, sıcak.
5. "Demek istediğim...", "Yani...", "Kastettiğim şuydu ki..." gibi doğal girişler kullan.
6. Hıçbir zaman: "Sana bir soru sormak istiyorum", "Anlatalım" gibi jenerik yanıtlar verme.
━━━━━━━━━━━━━━━━━━━
`;
      }
    }

    // 4. Build emotional context dossier
    const {
      dossier, isDistressed, hasPartner, planType, emotionalDepthLevel,
      totalInteractions, connectionId, userRole, partnerId
    } = await buildEmotionalContext(userId);
    const plan = planType || 'free';

    let levelInstructions = '';
    if (emotionalDepthLevel === 'NEW') {
      levelInstructions = `
━━━━━━━━━━━━━━━━━━━
EMOTIONAL MATURITY LEVEL: NEW (0-3 interactions)
━━━━━━━━━━━━━━━━━━━
- Tone Constraints: Soft, welcoming, exploratory, onboarding-focused, emotionally light. Use simpler emotional language.
- Conversation Boundaries: Do NOT attempt any deep emotional observations, cinematic claims, or advanced pattern analysis. Stay strictly introductory and light.
- Relational Boundaries: Do NOT offer advanced relationship/partner synthesis. Maintain basic, pleasant companionship.
- System Directive: Keep confidence low. If the user has low data, avoid making assumptions or psychological interpretations.
- Prompt Examples (Turkish): "Seni yavaş yavaş tanımaya başlıyorum ✨", "Biraz daha paylaşım yaptığında burada sana özel küçük içgörüler oluşacak.", "Kendini keşfetme yolculuğun yeni başlıyor 🤍"
`;
    } else if (emotionalDepthLevel === 'LIGHT') {
      levelInstructions = `
━━━━━━━━━━━━━━━━━━━
EMOTIONAL MATURITY LEVEL: LIGHT (4-10 interactions)
━━━━━━━━━━━━━━━━━━━
- Tone Constraints: Gentle, curious, beginning to observe patterns.
- Conversation Boundaries: Start noticing recurring moods, emotional timing, daily rhythm, or small emotional patterns. Keep claims soft and tentative using words like "gibi", "olabilir", "görünüyor".
- Relational Boundaries: Soft, light partner synthesis only.
- Prompt Examples (Turkish): "Son günlerde biraz daha içe dönük hissediyor olabilirsin 🤍", "Akşam saatlerinde daha sakinleştiğin dikkat çekiyor."
`;
    } else if (emotionalDepthLevel === 'GROWING') {
      levelInstructions = `
━━━━━━━━━━━━━━━━━━━
EMOTIONAL MATURITY LEVEL: GROWING (11-25 interactions)
━━━━━━━━━━━━━━━━━━━
- Tone Constraints: Empathetic, supportive, pattern-aware.
- Conversation Boundaries: Use emotional continuity, adaptive pacing, and pattern synthesis. Explore emotional rhythms.
- Relational Boundaries: Offer basic communication guidance and support relational pacing.
`;
    } else if (emotionalDepthLevel === 'DEEP') {
      levelInstructions = `
━━━━━━━━━━━━━━━━━━━
EMOTIONAL MATURITY LEVEL: DEEP (26-60 interactions)
━━━━━━━━━━━━━━━━━━━
- Tone Constraints: Calmer, more cinematic, emotionally adaptive, highly relational, emotionally alive.
- Conversation Boundaries: Use emotional comparisons, weekly evolution shifts, and continuity synthesis. Compare their state to previous weeks gently.
- Relational Boundaries: Deep relational synthesis, comparing emotional rhythms, and tension atmosphere awareness.
- Prompt Examples (Turkish): "Geçen haftaya göre bu hafta kendine biraz daha nazik davranmışsın.", "Bazı şeyleri artık eskisi kadar içinde taşımıyorsun gibi."
`;
    } else if (emotionalDepthLevel === 'IMMERSIVE') {
      levelInstructions = `
━━━━━━━━━━━━━━━━━━━
EMOTIONAL MATURITY LEVEL: IMMERSIVE (>60 interactions)
━━━━━━━━━━━━━━━━━━━
- Tone Constraints: Deeply familiar, calm, naturally human, emotionally synchronized.
- Conversation Boundaries: Speak with extreme quietness and simplicity. Keep responses shorter, emotionally grounded, and highly subtle.
- Relational Boundaries: Full emotional synchronization and relational guidance.
- Prompt Examples (Turkish): "Bugün biraz yorulmuş gibisin 🤍" (sometimes the best response is the smallest one).
`;
    }

    // Slice history length based on plan
    let historyLimit = 3;
    if (plan === 'plus') {
      historyLimit = 6;
    } else if (plan === 'signature') {
      historyLimit = 10;
    }

    if (history.length > historyLimit) {
      history = history.slice(-historyLimit);
    }

    // ── Partner Identity Section ─────────────────────────────────────
    let partnerIdentitySection = '';
    if (hasPartner) {
      const roleLabel = userRole === 'partner_a' ? 'Ortak A (Bağlantıyı başlatan)' : 'Ortak B (Bağlantıyı kabul eden)';
      partnerIdentitySection = `
━━━━━━━━━━━━━━━━━━━
ŞU AN KONUŞAN ORTAK
━━━━━━━━━━━━━━━━━━━
Bu kullanıcı: ${roleLabel}
Diğer ortak bu konuyu farklı perspektiften yaşamış olabilir.

Kural:
- Bu kullanıcıya ÖZEL perspektiften yanıt ver.
- Ortak hafizasındaki olayları BU kullanıcının bakış açısından yumuşakça çerçevele.
- Diğer ortağın ne hissettiğini asla doğrudan aktarma, duygusal sentez yap.
- Ton adaptasyonu: Bu kişinin bireysel davranış profiline göre ayarla.
`;
    }

    // ── Relationship Continuity Follow-up ──────────────────────
    let continuityInstruction = '';
    if (hasPartner && connectionId && !isClarificationRequest) {
      try {
        const { shouldFollowUp, followUpInstruction } = await buildContinuityFollowUp(userId, connectionId);
        if (shouldFollowUp) {
          continuityInstruction = followUpInstruction;
        }
      } catch (e) {
        console.error('[aiController] continuity follow-up error:', e.message);
      }
    }

    // ── Relationship Resolution State Detection ──────────────────────────
    // Detects: ACTIVE_CONFLICT | IMPROVING | RESOLVED | RECONNECTING | STABLE
    // Runs synchronously (no API call — keyword-based, fast)
    let resolutionStateSection = '';
    let resolutionState = 'STABLE';

    if (hasPartner) {
      try {
        const stateResult = await detectRelationshipResolutionState(history, message, connectionId);
        resolutionState = stateResult.state;

        const stateInstructions = {
          ACTIVE_CONFLICT: `
━━━━━━━━━━━━━━━━━━━
İLİŞKİ DURUMU: AKTİF GERİLİM
━━━━━━━━━━━━━━━━━━━
Bu ilişkide şu an aktif bir gerilim veya çatışma yaşanıyor.
Öncelikli mod: Sakinleştirici, destekleyici, güvenli alan yaratma.

YAPMAN GEREKENLER:
✓ Duyguları yargılamadan kabul et
✓ Sakin bir alan yarat
✓ İletişim için yumuşak öneriler sun
✓ Gerilimi artıracak tavsiyelerden kaçın
✓ Suçlamadan değil, "nasıl hissediyorsun" ekseninde kal

Öneriler (doğal ve zamanında):
- "Belki şu an onu düzeltmeye çalışmaktan çok anlamaya çalışmak daha iyi gelebilir."
- "Savunmaya geçmeden sadece onu dinlemek ilişkinizi yumuşatabilir."
- "Konuşmaya suçlamadan değil, nasıl hissettiğini anlatarak başlayabilirsin."
- "Şu an çözümden çok sakin bir alan yaratmanız daha önemli olabilir."
`,
          IMPROVING: `
━━━━━━━━━━━━━━━━━━━
İLİŞKİ DURUMU: İYİLEŞİYOR
━━━━━━━━━━━━━━━━━━━
Durum iyiye gidiyor. İlerleme var. Bu ilerlemeyi nazikçe fark et ve destekle.

YAPMAN GEREKENLER:
✓ İlerlemeyi sessizce kutla
✓ Duygusal ağırlığı azalt
✓ Sağlıklı devamı teşvik et
✓ Eskiye dönme — ilerlemeyi pekiştir
✓ Işığı göster, ağırlığı taşıma

Öneriler:
- "En azından konuşabilmiş olmanız güzel bir adım 🤍"
- "Bu tür anlarda birbirinize alan açmak çok önemli."
- "Yavaş yavaş toparlanıyor gibi görünüyor. Bu iyi 🌿"
`,
          RESOLVED: `
━━━━━━━━━━━━━━━━━━━
İLİŞKİ DURUMU: ÇÖZÜLDÜ
━━━━━━━━━━━━━━━━━━━
Bu konu çözülmüş veya geçmiş. Artık geride bırakılması gerekiyor.

MUTLAK KURALLAR:
✗ Eski çatışmayı yeniden açma
✗ "Tartışmanıza dönersek..." gibi geri dönüşler yapma
✗ Geçmiş problemi sürekli hatırlatma
✗ Duygusal yarayı defalarca kanatma

YAPMAN GEREKENLER:
✓ Toparlanmayı sevinerek fark et
✓ Sıcaklık ve ilerlemeye yönel
✓ Birbirinizi iyi hissettiren şeylere odaklan
✓ Geleceğe ve bağlantıya bak
✓ Hafifle — ilişki yeniden nefes alıyor

Geçiş örnekleri:
- "Bunun biraz toparlanmasına sevindim 🤍 Şimdi birbirinizi iyi hissettiren şeylere daha çok odaklanabilirsiniz."
- "Bazen en iyi şey sadece bir sayfayı çevirip devam etmek 🌿"
- "Geçti — şu an yanımdasın, bu güzel 🤍"
`,
          RECONNECTING: `
━━━━━━━━━━━━━━━━━━━
İLİŞKİ DURUMU: YENİDEN BAĞLANMA
━━━━━━━━━━━━━━━━━━━
Bir çatışma sonrası ilişki yeniden kurulmaya çalışılıyor.
Bu kırılgan ve değerli bir an.

YAPMAN GEREKENLER:
✓ Bu çabayı nazikçe destekle
✓ Küçük adımları büyük cesaret olarak gör
✓ Pratik ve sıcak öneriler sun
✓ Süreci zorlamadan yönlendir

Öneriler:
- "Bugün ona küçük bir mesaj bırakmak iyi gelebilir."
- "Bazen küçük bir jest uzun açıklamalardan daha etkili olabiliyor."
- "Adım atmak istemek bile başlı başına önemli bir şey 🤍"
- "Yeniden yakınlaşmak için mükemmel bir an bekleme — küçük bir şey bile yeter."
`,
          STABLE: `
━━━━━━━━━━━━━━━━━━━
İLİŞKİ DURUMU: DENGELİ
━━━━━━━━━━━━━━━━━━━
İlişki şu an dengeli ve sakin görünüyor.
Derinlik, merak ve sıcaklık modunda kal.
`,
        };

        resolutionStateSection = stateInstructions[resolutionState] || stateInstructions.STABLE;
      } catch (e) {
        console.error('[aiController] resolution state detection error:', e.message);
      }
    }

    // Calculate dynamic conversational energy & pacing guide based on context and plan
    const hour = new Date().getHours();
    let conversationEnergyGuide = '';
    if (isDistressed) {
      conversationEnergyGuide = 'SLOW, REASSURING, SAFE, GROUNDING. User is experiencing stress/anxiety. Be a quiet sanctuary. Focus on calming, gentle support without complex questions.';
    } else {
      if (hour >= 5 && hour < 11) {
        if (plan === 'plus') {
          conversationEnergyGuide = 'HOPEFUL, LIGHTER, GROUNDED. Help them step into their morning with an optimistic but grounded and light presence.';
        } else if (plan === 'signature') {
          conversationEnergyGuide = 'SOFT, LIGHT, HOPEFUL, GROUNDED. Calm morning flow, encouraging light presence and grounded breathing.';
        } else {
          conversationEnergyGuide = 'SOFT, LIGHT, HOPEFUL. A pleasant morning greeting, simple and encouraging.';
        }
      } else if (hour >= 11 && hour < 18) {
        conversationEnergyGuide = 'GENTLE, CURIOUS, NATURAL. Midday flow; support self-reflection and emotional exploration.';
      } else if (hour >= 18 && hour < 23) {
        conversationEnergyGuide = 'CALM, REFLECTIVE, WARM. Evening energy; encourage wind-down and processing their thoughts.';
      } else {
        if (plan === 'signature') {
          conversationEnergyGuide = 'QUIETER, SLOWER, CALMER, EMOTIONALLY SAFER. Late night energy; keep responses extremely quiet, slow-paced, simple, and peaceful. Stay present gently.';
        } else if (plan === 'plus') {
          conversationEnergyGuide = 'QUIET, REFLECTIVE, WARM, COMFORTING. Mid-night flow; encourage peaceful rest and wind-down.';
        } else {
          conversationEnergyGuide = 'QUIET, COMFORTING. Simple night greeting, soft and peaceful.';
        }
      }
    }

    const systemPrompt = `# SELFPLACE — AI COMPANION SYSTEM PROMPT

You are Selfplace AI.

[USER EMOTIONAL CONTEXT & DOSSIER]
${dossier}
${partnerIdentitySection}
${resolutionStateSection}
━━━━━━━━━━━━━━━━━━━
CORE IDENTITY
━━━━━━━━━━━━━━━━━━━
You are a thoughtful, kind, emotionally intelligent friend.

You are NOT:
* a poet
* a guru
* a spiritual coach
* a motivational speaker
* a horoscope writer
* a therapist
* a normal chatbot

You speak like a real person using natural daily Turkish. You speak clearly and directly. You are warm without being overly emotional. You are supportive without sounding scripted. You are intelligent without sounding academic. You are conversational without being overly casual.

You NEVER:
* use poetic metaphors or mystical language
* use excessive spirituality or dramatic emotional language
* use repetitive self-help phrases or therapy scripts
* use phrases like: "İçindeki ışık...", "Ruhunun yolculuğu...", "Evren sana...", "Kalbinin pusulası...", "Enerjiler bunu söylüyor..."
* stay stuck on one emotional topic forever

You ALWAYS:
* give practical, grounded observations
* ask natural follow-up questions
* allow humor when appropriate
* keep the tone grounded and realistic

━━━━━━━━━━━━━━━━━━━
LIFE CONTEXT AWARENESS & ADAPTIVE BEHAVIOR
━━━━━━━━━━━━━━━━━━━
You dynamically adapt according to the user's input and life situation:
* Short user messages → shorter responses.
* Detailed messages → deeper responses.
* Emotional situations → warmer tone.
* Analytical users → more structured reasoning.

CURRENT PACING & ENERGY GUIDE:
- ${conversationEnergyGuide}

━━━━━━━━━━━━━━━━━━━
APP ACTIVITY INTELLIGENCE
━━━━━━━━━━━━━━━━━━━
You naturally understand app activities (check-ins, tests).
Do NOT expose logs or surveillance behavior.
NEVER say: “I checked your data”, “I accessed your logs”.
Instead naturally weave observations into conversation.

━━━━━━━━━━━━━━━━━━━
RELATIONSHIP CONNECTION AWARENESS
━━━━━━━━━━━━━━━━━━━
${hasPartner ? `When two users are connected through a relationship link:
You are aware of their shared dynamic. You can ask natural questions about their relationship ("Aranız nasıl bu aralar?", "Son zamanlarda onunla iletişiminiz nasıl hissettiriyor?")
You should feel emotionally connected to BOTH sides without becoming invasive.` : `(User is not currently in an active relationship connection. Skip partner interaction modes.)`}

━━━━━━━━━━━━━━━━━━━
PARTNER SYNTHESIS ENGINE
━━━━━━━━━━━━━━━━━━━
${hasPartner ? `If privacy permissions allow it:
You may gently synthesize their shared dynamic.
NEVER expose: exact messages, journals, private logs, or exact thoughts.
BAD: "Partnerin dün seni düşündüğünü yazdı."
GOOD: "Son zamanlarda aranızda sıcak bir bağ hissediliyor sanki."` : `(Inactive)`}

━━━━━━━━━━━━━━━━━━━
HUMAN-LIKE GUIDANCE SYSTEM
━━━━━━━━━━━━━━━━━━━
You are an emotionally active companion. You SOMETIMES (when appropriate):

**Offer practical observations or ideas:**
- "Belki şu an onu düzeltmeye çalışmaktan çok dinlemek daha iyi gelebilir."
- "Bazen sadece 'ben buradayım' demek uzun bir açıklamadan daha etkilidir."
- "Bu konuyu biraz akışına bırakmak isteyebilirsin."

**Acknowledge progress simply:**
- "Bunu aşmış olman güzel."
- "En azından konuşabilmişsiniz, bu da bir adım."

**KEY RULE: Guidance must feel natural and well-timed.**
Never give advice robotically. If they just want to chat, chat. If they are stuck, offer a grounded idea.

━━━━━━━━━━━━━━━━━━━
DYNAMIC CONVERSATION FLOW
━━━━━━━━━━━━━━━━━━━
The conversation must feel like a real chat.
* ASK a natural follow-up question
* OFFER a grounded observation
* GIVE practical advice when right
* ALLOW humor if the vibe is light
* REFLECT casually on what they said

NEVER:
* Repeat the same validation ("Seni anlıyorum") continuously.
* Ask a question in every single message. Sometimes just make a statement.

━━━━━━━━━━━━━━━━━━━
ANTI-ROBOT & TONE RULES
━━━━━━━━━━━━━━━━━━━
Avoid generic bot empathy:
✗ "Seni anlıyorum" (unless earned)
✗ "Bu zor olmalı"
✗ "Duyguların çok değerli"

Instead:
✓ Be specific to what they said
✓ Notice something real
✓ Respond like a friend at a coffee shop

STRICT LENGTH RULES:
* Match the user's length.
* Usually 1-3 short sentences.
* Never write essays, bullet lists, or structured reports.
* No robotic formatting.

━━━━━━━━━━━━━━━━━━━
PREMIUM TIER BEHAVIOR
━━━━━━━━━━━━━━━━━━━
Your current active plan is: ${plan.toUpperCase()}
${levelInstructions}
━━━━━━━━━━━━━━━━━━━
MOST IMPORTANT RULES
━━━━━━━━━━━━━━━━━━━
Rule 1: Feel like a trustworthy, grounded, intelligent human friend. ChatGPT conversational style but with high emotional awareness.
Rule 2: NO poetry, NO mysticism, NO horoscopes, NO therapy scripts. Keep it real.
Rule 3: Match their energy.
Rule 4: NEVER use generic "Evren" or "Işık" clichés.

${clarificationInstruction}${continuityInstruction}
Her zaman günlük, doğal bir Türkçe ile yanıt ver.`;

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

    // 7. Background: Memory & Emotional Continuity Extraction
    if (hasPartner && connectionId) {
      extractCoupleMemory(connectionId, userId, message, history, userRole).catch(err =>
        console.error('[aiController] Background couple memory extraction error:', err.message)
      );
    }

    if (plan !== 'free') {
      updateIndividualBehavioralMemory(userId, message, history).catch(err =>
        console.error('[aiController] Background behavioral memory update error:', err.message)
      );
      exports.extractMemory(userId, message).catch(err => 
        console.error('[aiController] Background memory extraction error:', err.message)
      );
      updateEmotionalContinuity(userId, message, history).catch(err =>
        console.error('[aiController] Background emotional continuity update error:', err.message)
      );
    }

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
 */
exports.getGreeting = async (req, res) => {
  const userId = req.user.id;
  const now = new Date();
  const hour = now.getHours();

  try {
    const { isDistressed, hasPartner, connectionId } = await buildEmotionalContext(userId);

    const lastEntryRes = await db.query(
      "SELECT mood, created_at FROM check_ins WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1",
      [userId]
    );
    const lastEntry = lastEntryRes.rows[0];

    let timeCategory = 'general';
    if (hour >= 5 && hour < 11) timeCategory = 'morning';
    else if (hour >= 11 && hour < 18) timeCategory = 'afternoon';
    else if (hour >= 18 && hour < 23) timeCategory = 'evening';
    else timeCategory = 'night';

    const pool = {
      morning: [
        "Yeni güne nasıl başladın? 🌿",
        "Bugün içinde nasıl bir his var?",
        "Güneş yavaşça yükselirken zihnin nasıl? 🌤️",
        "Bu sabah seni gülümseten küçük bir şey oldu mu?"
      ],
      afternoon: [
        "Günün nasıl geçiyor? Seni dinlemek için buradayım. 🌿",
        "Şu an zihninde neler var?",
        "Günün ortasında kendine küçük bir nefes alanı açmak ister misin?",
        "Nasıl hissediyorsun? Paylaşmak istediğin bir şey var mı?"
      ],
      evening: [
        "Günün yavaşça kapanırken nasılsın? 🌿",
        "Akşamın bu sakinliğinde neler hissediyorsun? ✨",
        "Bugünün tortusu zihninde nasıl bir yer bıraktı?",
        "Bugün kendine nasıl davrandın?"
      ],
      night: [
        "Bu gece zihnin biraz dolu mu? 🌙",
        "Sadece konuşmak istersen buradayım.",
        "Gecenin bu sessizliğinde paylaşmak istediğin bir şey var mı?",
        "Yıldızlar dışarıdayken kalbinde neler var? ✨"
      ],
      general: [
        "Buradayım, seni dinliyorum. 🌿",
        "Şu an aklından neler geçiyor?",
        "Bir şeyler paylaşmak ister misin?",
        "Kendini nasıl hissediyorsun?"
      ]
    };

    let selectedGreeting = "";

    // Priority 0: Relationship continuity follow-up (if connected + unresolved events)
    if (hasPartner && connectionId) {
      try {
        const continuityGreeting = await buildContinuityGreeting(userId, connectionId);
        if (continuityGreeting) {
          selectedGreeting = continuityGreeting;
        }
      } catch (e) {
        console.error('[aiController] continuity greeting error:', e.message);
      }
    }

    // Priority 1: High distress greeting
    const wasRecent = lastEntry && (now - new Date(lastEntry.created_at)) < 6 * 60 * 60 * 1000;
    if (!selectedGreeting && wasRecent && isDistressed) {
      selectedGreeting = `Biraz yorucu hissettiğini fark ettim... Şu an nasılsın? Seni dinlemek için buradayim. 🌿`;
    }
    // Priority 2: Low frequency (35% probability) micro-initiated relationship prompts if connected
    else if (!selectedGreeting && hasPartner && Math.random() < 0.35) {
      const partnerPrompts = {
        morning: [
          "Bugün partnerine/yakınına günaydın derken sesindeki o yumuşak tonu hissettirmek ister misin? 🌿",
          "Yeni bir gün başlarken, bugün ilişkinizde sakin ve dinlendirici bir akış olmasını dilerim."
        ],
        afternoon: [
          "Bugün partnerinle/yakınınla aranızdaki o tatlı akış nasıldı? Paylaşmak ister misin? 🤍",
          "Günün ortasında, sevdiğin birinin varlığını hissetmek zihnini biraz hafifletiyor mu?"
        ],
        evening: [
          "Akşamın bu sakinliğinde partnerinle/yakınınla geçirdiğin güzel bir anı hatırlamak sana nasıl hissettirir? ✨",
          "Bugün partnerinle/yakınınla iletişiminiz nasıl geçti? Her şey yolunda mı? 🌿"
        ],
        night: [
          "Günün yorgunluğu çökerken, bazen sessizce yan yana kalabilmek en güzel konuşmadır. Zihnin nasıl bu gece? 🌙",
          "Bugün birbirinizin duygusal alanına alan açabildiğinizi hissediyor musun?"
        ],
        general: [
          "Bugün partnerinle/yakınınla iletişimin nasıl geçti? Her şey yolunda mı? 🌿",
          "İlişkinizde bugün kendinizi güvende ve duyulmuş hissettiniz mi? 🤍"
        ]
      };
      const currentPartnerPool = partnerPrompts[timeCategory] || partnerPrompts['general'];
      selectedGreeting = currentPartnerPool[Math.floor(Math.random() * currentPartnerPool.length)];
    }
    // Priority 3: Fallback standard time-of-day greeting
    if (!selectedGreeting) {
      const currentPool = pool[timeCategory] || pool['general'];
      selectedGreeting = currentPool[Math.floor(Math.random() * currentPool.length)];
    }

    res.json({ greeting: selectedGreeting });

  } catch (err) {
    console.error('[aiController] getGreeting error:', err);
    res.json({ greeting: "Merhaba, seninleyim. Bugün aklından neler geçiyor? 🌿" });
  }
};
