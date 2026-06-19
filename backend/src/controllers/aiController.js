const db = require('../config/db');
const OpenAI = require('openai');
const { buildEmotionalContext, updateEmotionalContinuity } = require('../services/emotionalContextBuilder');
const { extractCoupleMemory, updateIndividualBehavioralMemory, detectRelationshipResolutionState } = require('../services/coupleMemoryService');
const { buildContinuityFollowUp, buildContinuityGreeting } = require('../services/relationshipContinuityEngine');
const { buildEventTrigger } = require('../services/relationshipEventEngine');

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

    // ── Relationship Continuity Follow-up ──────────────────────
    let continuityInstruction = '';
    let eventTriggerInstruction = '';
    
    // Continuity and Event Triggers are premium features (Plus/Signature)
    if (hasPartner && connectionId && !isClarificationRequest && plan !== 'free') {
      try {
        const { shouldFollowUp, followUpInstruction } = await buildContinuityFollowUp(userId, connectionId);
        if (shouldFollowUp) {
          continuityInstruction = followUpInstruction;
        }

        const { hasEvent, triggerInstruction } = await buildEventTrigger(userId, connectionId);
        if (hasEvent) {
          eventTriggerInstruction = triggerInstruction;
        }
      } catch (e) {
        console.error('[aiController] continuity/event error:', e.message);
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

    // ── LAYER 3: Conversation Intent & Mode Switcher ─────────────────
    let conversationMode = 'COMPANION';
    
    // Check if Reflection Mode (user is reflecting on journals/cards or mood is reflective)
    const isReflective = recentActivity && (recentActivity.recent_journals > 0 || recentActivity.recent_cards > 0);
    if (isReflective && !isDistressed) {
      conversationMode = 'REFLECTION';
    }

    // Support Mode overrides everything if there's conflict or distress
    if (isDistressed || resolutionState === 'ACTIVE_CONFLICT') {
      conversationMode = 'SUPPORT';
    }
    
    let modeRules = '';
    if (conversationMode === 'SUPPORT') {
      modeRules = `
- MOD: DESTEK (SUPPORT)
- Kullanıcı stresli veya üzgün. Çözüm sunmaya çalışma, sadece duygusal olarak yanında ol.
- Terapist gibi değil, şefkatli bir yoldaş gibi dinle ve alanı güvenli tut.
`;
    } else if (conversationMode === 'REFLECTION') {
      modeRules = `
- MOD: İÇSEL YANSIMA (REFLECTION)
- Kullanıcı son zamanlarda içsel çalışmalar (günlük/kart) yapıyor veya derin bir modda.
- Derin, düşündürücü ve zihin açıcı doğal sorular sor. Kendi gerçeğini bulmasına yardımcı ol.
`;
    } else {
      modeRules = `
- MOD: YOLDAŞLIK (COMPANION / CURIOSITY-FIRST)
- Kullanıcı rahat. Terapist veya koç modunu KESİNLİKLE KAPAT.
- Yürüyüş yap, nefes al, meditasyon yap gibi klişe öneriler YASAK.
- Gerçekten meraklı bir arkadaş ol. Anıları, hedefleri, güncel ilgileri hakkında ilginç sorular sor.
- Sohbetin sıradan, canlı ve insan gibi akmasını sağla.
`;
    }

    let layer3 = `### [LAYER 3: CONVERSATION INTENT & SİSTEM YÖNERGELERİ]\n`;
    layer3 += modeRules;
    layer3 += `\n${eventTriggerInstruction}`;
    layer3 += `\n${continuityInstruction}`;
    layer3 += `\n${resolutionStateSection}`;
    layer3 += `\n- Denge Kuralı: İlişki konuları sohbete tamamen hakim olmamalı (maks %30). Bireysel hayata da odaklan.`;
    layer3 += `\n- Geçmiş Hafıza Kuralı: Eski ve çözülmüş sorunları tekrar ısıtıp gündeme getirme.`;
    layer3 += `\n- Onboarding Hedefleri Rehberi: Kullanıcının onboarding hedeflerini (Layer 1 içindeki Onboarding Hedefleri alanını) sohbette doğrudan telaffuz etmeden veya kullanıcıya hatırlatmadan, uzun vadeli rehberlik sinyalleri olarak kullan. Bu hedefler; soru sorma tarzını, merak duyulan konuları, sunulan önerileri ve ilişki tavsiyelerini arka planda şekillendirmelidir (örneğin stres azaltma hedefi varsa daha sakinleştirici ve hafif yönlendirmeler yap, kendini anlama hedefi varsa derin öz-yansıma soruları sor).`;
    layer3 += `\n- Enerji & Zaman Rehberi: ${conversationEnergyGuide}`;
    layer3 += `\n${partnerIdentitySection}`;

    // Add Journey Personality behavioral directives if data exists
    if (journeyData && journeyData.scores) {
      const sc = journeyData.scores;
      let behavioralDirectives = `\n━━━━━━━━━━━━━━━━━━━\nKULLANICI KİŞİLİK REHBERİ (BEHAVIORAL DIRECTIVES)\n━━━━━━━━━━━━━━━━━━━\n`;
      
      // 1. Adapt pacing to the user's Journey profile (energy_rhythm)
      if (sc.energy_rhythm > 2) {
        behavioralDirectives += `- İletişim Temposu: Kullanıcı dinamik ve yoğun duygusal ritimlere sahip. Konuşma temposunu canlı, uyanık, akıcı ve aktif tut.\n`;
      } else if (sc.energy_rhythm < -2) {
        behavioralDirectives += `- İletişim Temposu: Kullanıcı sakin, dingin ve dengeli ritimleri tercih ediyor. Yanıtlarını daha yavaş, son derece dengeli, huzurlu, gürültüsüz ve kelime sayısı az tut.\n`;
      } else {
        behavioralDirectives += `- İletişim Temposu: Dengeli ve doğal bir tempoda kal.\n`;
      }

      // 2. Adapt reflection depth to the user's curiosity score
      if (sc.curiosity > 2) {
        behavioralDirectives += `- Derinlik: Kullanıcı merak duygusu yüksek, yeni deneyimlere ve keşiflere açık. Daha derin içgörüler sun, yüzeysel kalma, düşündürücü açık uçlu sorular sor.\n`;
      } else if (sc.curiosity < -2) {
        behavioralDirectives += `- Derinlik: Kullanıcı istikrarlı, düzenli ve planlı yapıları tercih eden biri. Çok soyut teorilere veya fazla felsefi/derin analizlere girmeden net, pratik ve somut kal.\n`;
      }

      // 3. Adapt emotional validation style to the user's attachment style
      if (sc.attachment > 2) {
        behavioralDirectives += `- Duygusal Doğrulama: Kullanıcı yakınlık, güvence ve sık temas arayan bir yapıya sahip. Yanıtlarında şefkati, duygusal güvenceyi, desteği ve yanında olduğunu açıkça hissettir.\n`;
      } else if (sc.attachment < -2) {
        behavioralDirectives += `- Duygusal Doğrulama: Kullanıcı bireysel alanına ve bağımsızlığına son derece düşkün. Duygusal sınırlarına saygı duy, yapışkan veya aşırı şefkatli/korumacı bir ton kullanmaktan kaçın.\n`;
      }

      // 4. Adapt communication style to the user's emotional expression tendency
      if (sc.emotional_expression > 2) {
        behavioralDirectives += `- İletişim Stili: Kullanıcı duygularını açıkça ifade eden ve paylaşan biri. Sen de hislerine ortak ol, sıcak ve samimi duygusal ifadeler kullan.\n`;
      } else if (sc.emotional_expression < -2) {
        behavioralDirectives += `- İletişim Stili: Kullanıcı duygularını kendi içinde yaşamaya eğilimli ve kapalı. Duygularını zorlama, üstüne gitme, daha mesafeli ama güven veren sakin bir tonda kal.\n`;
      }
      
      layer3 += behavioralDirectives;
    }

    const systemPrompt = `# SELFPLACE — AI COMPANION (3-LAYER DOSSIER ARCHITECTURE)

Sen Selfplace'in yapay zeka yoldaşısın. Aşağıdaki katmanları referans alarak yanıt üret:

${layer1_individual}

${layer2_relationship}

${layer3}

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
    } else {
      console.log(`[aiController] Privacy Guard: exclude_ai_chat is active for User ${userId}. Skipping all background memory extraction tasks.`);
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
      console.log(`[aiController] Privacy Guard: User ${userId} excluded AI chat. Skipping individual memory extraction.`);
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
