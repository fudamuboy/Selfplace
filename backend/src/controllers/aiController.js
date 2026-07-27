const db = require('../config/db');
const OpenAI = require('openai');
const { buildEmotionalContext, updateEmotionalContinuity } = require('../services/emotionalContextBuilder');
const { extractCoupleMemory, updateIndividualBehavioralMemory, detectRelationshipResolutionState } = require('../services/coupleMemoryService');
// relationshipEventEngine (buildEventTrigger) removed — Conversation Director is the sole event pipeline.

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
      layer1_individual, 
      layer2_relationship, 
      isDistressed, 
      hasPartner, 
      connectionId,
      planType: plan, 
      emotionalDepthLevel, 
      totalInteractions,
      recentActivity,
      journeyData
    } = await buildEmotionalContext(userId);

    let userRole = 'both';
    if (hasPartner && connectionId) {
      const connRes = await db.query('SELECT requester_id FROM relationship_connections WHERE id = $1', [connectionId]);
      if (connRes.rows.length > 0) {
        userRole = userId === connRes.rows[0].requester_id ? 'partner_a' : 'partner_b';
      }
    }

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

    let userProfileDirectives = '';
    userProfileDirectives += `\n- Denge Kuralı: İlişki konuları sohbete tamamen hakim olmamalı (maks %30). Bireysel hayata da odaklan.`;
    userProfileDirectives += `\n- Geçmiş Hafıza Kuralı: Eski ve çözülmüş sorunları tekrar ısıtıp gündeme getirme.`;

    userProfileDirectives += `\n${partnerIdentitySection}`;

    // Add Journey Personality behavioral directives if data exists
    if (journeyData && journeyData.scores) {
      const sc = journeyData.scores;
      let behavioralDirectives = `\n━━━━━━━━━━━━━━━━━━━\nKULLANICI KİŞİLİK REHBERİ (BEHAVIORAL DIRECTIVES)\n━━━━━━━━━━━━━━━━━━━\n`;
      
      if (sc.energy_rhythm > 2) behavioralDirectives += `- İletişim Temposu: Kullanıcı dinamik ve yoğun duygusal ritimlere sahip. Konuşma temposunu canlı, uyanık, akıcı ve aktif tut.\n`;
      else if (sc.energy_rhythm < -2) behavioralDirectives += `- İletişim Temposu: Kullanıcı sakin, dingin ve dengeli ritimleri tercih ediyor. Yanıtlarını daha yavaş, son derece dengeli, huzurlu, gürültüsüz ve kelime sayısı az tut.\n`;
      else behavioralDirectives += `- İletişim Temposu: Dengeli ve doğal bir tempoda kal.\n`;

      if (sc.curiosity > 2) behavioralDirectives += `- Derinlik: Merak duygusu yüksek. Daha derin içgörüler sun, yüzeysel kalma, açık uçlu sorular sor.\n`;
      else if (sc.curiosity < -2) behavioralDirectives += `- Derinlik: İstikrarlı ve düzenli yapıları tercih ediyor. Felsefi analizlere girmeden net ve pratik kal.\n`;

      if (sc.attachment > 2) behavioralDirectives += `- Duygusal Doğrulama: Yakınlık arayan bir yapı. Şefkati ve güvenceyi açıkça hissettir.\n`;
      else if (sc.attachment < -2) behavioralDirectives += `- Duygusal Doğrulama: Bağımsızlığına düşkün. Duygusal sınırlarına saygı duy, yapışkan olma.\n`;

      if (sc.emotional_expression > 2) behavioralDirectives += `- İletişim Stili: Duygularını açıkça ifade eden biri. Sen de hislerine ortak ol, sıcak ifadeler kullan.\n`;
      else if (sc.emotional_expression < -2) behavioralDirectives += `- İletişim Stili: Kendi içinde yaşamaya eğilimli. Üstüne gitme, daha mesafeli ama güven veren sakin bir tonda kal.\n`;
      
      userProfileDirectives += behavioralDirectives;
    }

    const { getLivingContext } = require('../services/livingContextEngine');
    const { getBrainDirectives } = require('../services/conversationBrain');
    const { getEntityKnowledge } = require('../services/entityKnowledgeLayer');

    // Run EKL in parallel with Living Context and Brain — zero added latency
    const [liveContext, brainRes, ekl] = await Promise.all([
      getLivingContext(userId),
      getBrainDirectives(userId, connectionId, message, history, plan, isDistressed),
      getEntityKnowledge(message)
    ]);
    const { directorDossier, eventIds, brainMetadata, brainState } = brainRes;

    // ── Build confidence-aware EKL block ─────────────────────────────
    let entityKnowledgeSection = '';
    if (ekl && ekl.entityFound) {
      const locationLine = [ekl.city, ekl.district].filter(Boolean).join(' / ');
      if (ekl.confidence >= 0.80) {
        // High confidence — Brain should state facts directly
        entityKnowledgeSection = `
━━━━━━━━━━━━━━━━━━━
ENTITY KNOWLEDGE LAYER
━━━━━━━━━━━━━━━━━━━
Kullanıcının mesajında doğrulanmış bir varlık tespit edildi.
Güven seviyesi YÜKSEK — bilgiyi doğrudan ve kesin bir dille kullan.
Örnek ton: "${ekl.canonicalName}${locationLine ? ` ${locationLine}'de` : ''} bulunan..."

Varlık: ${ekl.canonicalName} (${ekl.entityType})
${locationLine ? `Konum: ${locationLine}` : ''}
Özet: ${ekl.summary}
Kaynak: ${ekl.sourceType} | Güncellik: ${ekl.freshness} | Güven: ${ekl.confidence}
━━━━━━━━━━━━━━━━━━━`;
      } else {
        // Medium confidence — Brain should use tentative language
        entityKnowledgeSection = `
━━━━━━━━━━━━━━━━━━━
ENTITY KNOWLEDGE LAYER
━━━━━━━━━━━━━━━━━━━
Kullanıcının mesajında muhtemelen gerçek bir varlık var.
Güven seviyesi ORTA — bilgiyi yumuşak ve tahmin modunda sun.
Örnek ton: "Sanırım ${ekl.canonicalName ? ekl.canonicalName + "'i" : 'bunu'} kastediyorsun..."

Varlık: ${ekl.canonicalName || '(belirsiz)'} (${ekl.entityType})
${locationLine ? `Konum (tahmini): ${locationLine}` : ''}
Özet: ${ekl.summary}
Kaynak: ${ekl.sourceType} | Güncellik: ${ekl.freshness} | Güven: ${ekl.confidence}
━━━━━━━━━━━━━━━━━━━`;
      }
    }

    const systemPrompt = `# SELFPLACE — AI COMPANION WITH LIVING CONTEXT & EVENT INTELLIGENCE

Aşağıdaki "SELFPLACE LIVE CONTEXT" verilerini kaynak alarak kullanıcıyla doğal, samimi bir Türkçe ile konuş:

${liveContext}

${directorDossier}

${entityKnowledgeSection}

${userProfileDirectives}

━━━━━━━━━━━━━━━━━━━
HALÜSİNASYON ENGELLEME VE GERÇEKLİK KURALLARI (STRICT REALITY DIRECTIVES)
━━━━━━━━━━━━━━━━━━━
1. Yalnızca yukarıdaki "SELFPLACE LIVE CONTEXT" ve "ENTITY KNOWLEDGE LAYER" içinde sağlanan gerçek verileri temel al. Bu verilerde yer almayan hiçbir ilişki durumunu, tartışmayı, gerilimi, duyguyu, günlük girdisini, anıyı veya kişiyi kendin UYDURMA (hallucination kesinlikle yasaktır).
2. Entity Knowledge Layer'dan gelen bilgileri doğal bir şekilde konuşmaya entegre et; asla ham JSON veya teknik başlık gösterme.
3. Eğer bir bilgi (örneğin partnerin ne hissettiği, aranızda gerginlik olup olmadığı) Live Context içinde bulunmuyorsa, tahmin etme, uydurma; gerekirse kullanıcıya doğrudan ama nazikçe sor.
4. Partnerden bahsederken "arkadaşın", "eşin" veya "ortağın" gibi jenerik kelimeler kullanma. Live Context'te partnerin adı belirtilmişse (örn: "Android"), ona mutlaka ismiyle hitap et.
5. Bilgi Öncelik Sıralaması:
   1. Entity Knowledge Layer (doğrulanmış gerçek dünya bilgisi)
   2. Canlı uygulama durumu (Live Context)
   3. İlişki hafızası
   4. Kayıtlı duygusal bellek
   5. Mevcut konuşma geçmişi
   6. Kendi yapay zeka çıkarımların

━━━━━━━━━━━━━━━━━━━
PROAKTİF FARKINDALIK (EVENT-DRIVEN CONVERSATION)
━━━━━━━━━━━━━━━━━━━
- Eğer Kronolojik İlişki Zaman Çizelgesi'nde (Timeline) yeni bir olay (örn: yeni bağlantı kurulması, partnerin testi bitirmesi, check-in yapması, yeni haftalık rapor oluşması) varsa ve bu henüz konuşulmadıysa, söze doğal bir şekilde bu olayla gir (Örn: "Android ile bağlandığınızı fark ettim bugün, çok sevindim ❤️" veya "Bugün ikiniz de yansımayı tamamlamışsınız, harika görünüyorsunuz.").

━━━━━━━━━━━━━━━━━━━
CORE IDENTITY
━━━━━━━━━━━━━━━━━━━
You are a thoughtful, kind, emotionally intelligent friend.
You speak like a real person using natural daily Turkish.
You NEVER use poetic metaphors, mystical language, or repetitive self-help scripts (e.g. "İçindeki ışık", "Evren", "Derin bir nefes al").

STRICT LENGTH RULES:
* Match the user's length (usually 1-3 short sentences).
* Never write essays, bullet lists, or structured reports.
* Sometimes just make a statement instead of always asking a question.

Rule 2: NO poetry, NO mysticism, NO horoscopes, NO therapy scripts. Keep it real.
Rule 3: Match their energy.
Rule 4: NEVER use generic "Evren" or "Işık" clichés.

${clarificationInstruction}
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

    // 6b. Acknowledge timeline events and update Brain State
    const { updateBrainState } = require('../services/conversationBrain');
    try {
      await updateBrainState(userId, connectionId, eventIds, brainMetadata, brainState);
    } catch (brainErr) {
      console.error('[aiController] Failsafe: brain state update failed:', brainErr.message);
    }

    // 7. Background: Memory & Emotional Continuity Extraction
    let excludeAiChat = false;
    if (connectionId) {
      const privacyRes = await db.query(
        'SELECT exclude_ai_chat FROM relationship_privacy_settings WHERE connection_id = $1 AND user_id = $2',
        [connectionId, userId]
      );
      if (privacyRes.rows.length > 0 && privacyRes.rows[0].exclude_ai_chat) {
        excludeAiChat = true;
      }
    }

    if (!excludeAiChat) {
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

      // Update follow-ups and promises in the background
      const { updateFollowUpsAndPromises } = require('../services/livingContextEngine');
      updateFollowUpsAndPromises(userId, message, aiResponse).catch(err =>
        console.error('[aiController] Background follow ups update error:', err.message)
      );
    } else {
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
    // Privacy Consistency: check exclude_ai_chat
    const privacyRes = await db.query(
      `SELECT rps.exclude_ai_chat 
       FROM relationship_privacy_settings rps
       JOIN relationship_connections rc ON rps.connection_id = rc.id
       WHERE rps.user_id = $1 AND rc.status = 'active'`,
      [userId]
    );
    if (privacyRes.rows.length > 0 && privacyRes.rows[0].exclude_ai_chat) {
      return;
    }

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
  try {
    const { isDistressed, hasPartner, connectionId, planType: plan } = await buildEmotionalContext(userId);

    const { getBrainDirectives, updateBrainState } = require('../services/conversationBrain');
    
    // Pass empty history, treat "selam" as the generic trigger
    const { directorDossier, eventIds, brainMetadata, brainState } = await getBrainDirectives(userId, connectionId, "selam", [], plan, isDistressed);

    // Save the Brain's state so it accurately registers it picked a greeting mode
    if (brainMetadata) {
      await updateBrainState(userId, connectionId, eventIds, brainMetadata, brainState);
    }

    const systemPrompt = `# SELFPLACE GREETING GENERATOR
Aşağıdaki "CONVERSATION BRAIN DIRECTIVE" yönergelerine uyarak kullanıcıyı kısa, doğal ve samimi bir Türkçe ile karşıla.
Terapist veya koç gibi değil, gerçek ve şefkatli bir arkadaş gibi konuş.
Sadece 1-2 cümlelik kısa bir karşılama yaz.

${directorDossier}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: systemPrompt }],
      temperature: 0.7,
      max_tokens: 150
    });

    const aiResponse = completion.choices[0].message.content;
    res.json({ greeting: aiResponse });

  } catch (err) {
    console.error('[aiController] getGreeting error:', err);
    res.json({ greeting: "Merhaba, seninleyim. Bugün aklından neler geçiyor? 🌿" });
  }
};
