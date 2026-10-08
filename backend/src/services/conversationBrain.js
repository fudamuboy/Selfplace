const db = require('../config/db');

// Priorities: Critical (4), High (3), Medium (2), Low (1)
const EVENT_PRIORITIES = {
  'CONNECTION_REMOVED': 4,
  'PARTNER_BLOCKED': 4,
  'created': 3,
  'CONNECTION_CREATED': 3,
  'WEEKLY_INSIGHT_GENERATED': 3,
  'MILESTONE': 3,
  'INVITATION_ACCEPTED': 2,
  'PERSONALITY_COMPLETED': 2,
  'ritual_done': 2,
  'garden_level_up': 2,
  'level_up': 2,
  'CHECKIN_COMPLETED': 1,
  'MOOD_IMPROVED': 1,
  'MOOD_DECLINED': 1,
  'weather_change': 1
};

const DEFAULT_STATE = {
  last_modes: [],
  last_topics: [],
  last_goals: [],
  conversation_balance: {
    reflection_count: 0,
    humour_count: 0,
    games_count: 0,
    challenges_count: 0,
    relationship_discussions: 0,
    advice_count: 0,
    support_count: 0,
    casual_count: 0
  },
  current_energy: 'MEDIUM',
  turns_since_question: 0,
  last_actions: [],
  repair_attempts: 0,
  outcome_feedback: {
    story_success: 0,
    story_failure: 0,
    humour_success: 0,
    humour_failure: 0,
    repair_success: 0,
    repair_failure: 0,
    reflection_success: 0,
    reflection_failure: 0,
    casual_success: 0,
    casual_failure: 0
  }
};

const MODE_TO_BALANCE_KEY = {
  'reflection': 'reflection_count',
  'humour': 'humour_count',
  'games': 'games_count',
  'challenges': 'challenges_count',
  'relationship': 'relationship_discussions',
  'advice': 'advice_count',
  'support': 'support_count',
  'casual': 'casual_count',
  'celebration': 'casual_count'
};

const CONVERSATION_ACTIONS = [
  { id: 'personal_thought', mode: 'casual', weight: 20, tip: 'Kendi kişisel, kısa bir düşünceni veya "aklıma şu geldi" diyebileceğin bir fikri paylaş. Asla fiziksel veya gerçek dünyada yaşadığın bir anı gibi davranma; düşüncelerin varsayımsal veya entelektüel olsun.' },
  { id: 'funny_observation', mode: 'humour', weight: 25, tip: 'Etrafındaki dünya, insanlık veya şu anki durumla ilgili komik/eğlenceli bir gözlem yap.' },
  { id: 'mini_game', mode: 'games', weight: 10, tip: 'Kullanıcıya oynaması için çok basit, eğlenceli bir mini oyun veya kelime oyunu öner (Soru sormadan oyunu başlat, örn: "Hadi kelime türetmece oynayalım. İlk kelimem: Elma").' },
  { id: 'short_story', mode: 'casual', weight: 15, tip: 'Çok kısa, ilgi çekici veya komik bir hikaye anlat. Hikayeler tamamen kurgusal veya felsefi olmalı, asla kendi fiziksel deneyiminmiş gibi anlatılmamalıdır.' },
  { id: 'playful_joke', mode: 'humour', weight: 20, tip: 'Kullanıcıya veya duruma uygun hafif, eğlenceli bir şaka veya takılma yap.' },
  { id: 'challenge', mode: 'challenges', weight: 15, tip: 'Kullanıcıya tatlı ve küçük bir meydan okuma ver. (Örn: "Bugün aynaya bakıp kendine gülümsediğinden emin ol!")' },
  { id: 'emotional_reaction', mode: 'support', weight: 30, tip: 'Sadece kullanıcının söylediklerine güçlü ve içten bir duygusal tepki ver, konuyu onaylayıp hislerini paylaş.' },
  { id: 'continue_conversation', mode: 'casual', weight: 40, tip: 'Konuyu doğal bir şekilde kendi bakış açınla devam ettir. Kendi fikirlerini ekle ve topu kullanıcıya bırakmadan sürdür.' }
];

function estimateOutcome(cleanMsg) {
  const confusionKws = ['anlamadım', 'anlamadim', 'ne demek', 'nasıl yani', 'nasil yani', 'bunu anlamadım', 'saçma', 'sacma', 'don\'t understand', 'dont understand', 'what do you mean', 'makes no sense', 'confused', 'unclear'];
  const negativeKws = ['sıkıcı', 'sikici', 'çok uzun', 'cok uzun', 'gereksiz', 'kötü', 'kotu', 'beğenmedim', 'begenmedim', 'hayır', 'hayir', 'öyle değil', 'oyle degil', 'boring', 'too long', 'unnecessary', 'bad', 'dislike', 'don\'t like', 'no', 'not really'];
  const positiveKws = ['harika', 'güzel', 'guzel', 'iyi', 'evet', 'tabi', 'hahaha', 'lol', '😄', '😊', '😂', '🤣', '👍', '❤️', 'komik', 'sevdim', 'great', 'awesome', 'nice', 'good', 'yes', 'sure', 'love it', 'cool'];

  const isConfusion = confusionKws.some(kw => cleanMsg.includes(kw));
  const isNegative = negativeKws.some(kw => cleanMsg.includes(kw));
  const isPositive = positiveKws.some(kw => cleanMsg.includes(kw));

  if (isConfusion) return 'repair_needed';
  if (isNegative) return 'negative';
  if (isPositive) return 'positive';
  return 'neutral';
}

function getOutcomeCategory(actionId, mode) {
  if (actionId === 'short_story') return 'story';
  if (mode === 'humour') return 'humour';
  if (mode === 'reflection') return 'reflection';
  if (actionId === 'repair') return 'repair';
  return 'casual';
}

/**
 * Conversation Relevance Filter
 * Scores each action based on the current conversation context and outcome feedback.
 * Higher scores represent more natural human fit.
 */
function scoreActionRelevance(action, context) {
  let score = action.weight || 10;
  const { isGreeting, isDistressed, energy, isVeryShort, lastActions, outcomeFeedback } = context;

  // 1. Recency Penalty
  if (lastActions && lastActions.length > 0 && lastActions[lastActions.length - 1] === action.id) {
    score -= 25;
  }

  // 2. Greeting / Start of Conversation Context
  if (isGreeting) {
    if (action.id === 'short_story') score -= 35;
    if (action.id === 'mini_game') score -= 20;
    if (action.id === 'funny_observation') score += 20;
    if (action.id === 'emotional_reaction') score += 25;
    if (action.id === 'continue_conversation') score += 30;
  }

  // 3. Emotional Distress Context
  if (isDistressed) {
    if (action.id === 'emotional_reaction') score += 40;
    if (action.id === 'funny_observation') score -= 40;
    if (action.id === 'playful_joke') score -= 40;
    if (action.id === 'mini_game') score -= 50;
    if (action.id === 'challenge') score -= 30;
  }

  // 4. Energy Alignment
  if (energy === 'LOW') {
    if (action.id === 'emotional_reaction') score += 20;
    if (action.id === 'funny_observation') score -= 20;
    if (action.id === 'challenge') score -= 20;
  } else if (energy === 'HIGH') {
    if (action.id === 'funny_observation') score += 20;
    if (action.id === 'playful_joke') score += 15;
    if (action.id === 'challenge') score += 20;
  }

  // 5. Short Message Context
  if (isVeryShort) {
    if (action.id === 'short_story') score -= 30;
    if (action.id === 'playful_joke') score += 10;
    if (action.id === 'continue_conversation') score += 15;
  }

  // 6. Outcome Feedback Adjustments
  if (outcomeFeedback) {
    if (action.id === 'short_story') {
      if (outcomeFeedback.story_failure > 0) score -= outcomeFeedback.story_failure * 15;
      if (outcomeFeedback.story_success > 0) score += outcomeFeedback.story_success * 10;
    }
    if (action.id === 'playful_joke' || action.id === 'funny_observation') {
      if (outcomeFeedback.humour_failure > 0) score -= outcomeFeedback.humour_failure * 15;
      if (outcomeFeedback.humour_success > 0) score += outcomeFeedback.humour_success * 10;
    }
    if (action.mode === 'reflection') {
      if (outcomeFeedback.reflection_failure > 0) score -= outcomeFeedback.reflection_failure * 15;
      if (outcomeFeedback.reflection_success > 0) score += outcomeFeedback.reflection_success * 10;
    }
  }

  return Math.max(1, score);
}

function selectRelevanceWeightedAction(actions, context) {
  const scoredActions = actions.map(action => ({
    action,
    score: scoreActionRelevance(action, context)
  }));

  scoredActions.sort((a, b) => b.score - a.score);
  const maxScore = scoredActions[0].score;

  // Filter actions within 15 points of top score to allow natural variety
  const topCandidates = scoredActions.filter(item => item.score >= maxScore - 15);
  
  // Weighted selection among top candidates
  const totalWeight = topCandidates.reduce((sum, item) => sum + item.score, 0);
  let random = Math.random() * totalWeight;

  for (const item of topCandidates) {
    if (random < item.score) {
      return item.action;
    }
    random -= item.score;
  }

  return topCandidates[0].action;
}

function buildInternalReasoningBlock(lastAiMessage, repairAttempts, language = 'tr') {
  if (!lastAiMessage) return '';

  const isEn = language === 'en';
  let escalationDirective = '';
  if (repairAttempts >= 2) {
    escalationDirective = isEn ? `
⚠️ REPAIR ESCALATION LIMIT REACHED (${repairAttempts} Attempts):
The user did not understand or align with your explanation after 2 attempts.
- DO NOT attempt to explain, justify, or re-frame again!
- Warmly and lightheartedly laugh at yourself (e.g. "You're right 😄 I guess I'm not explaining this well today.").
- Drop the explanation completely and transition naturally to a fresh, light topic.` : `
⚠️ KADEMELİ ONARIM LİMİTİ AŞILDI (${repairAttempts}. Deneme):
Kullanıcı anlatmak istediğin şeyi 2 defadan fazla anlamadı veya uyum sağlayamadı.
- KESİNLİKLE tekrar açıklamaya, düzeltmeye veya ikna etmeye çalışma!
- Samimi ve neşeli bir şekilde kendinle dalga geç (Örn: "Haklısın 😄 Sanırım bugün hikâye anlatma konusunda pek başarılı değilim.").
- Açıklamayı tamamen bırak ve sohbeti doğal, hafif bir yöne kaydır.`;
  }

  return isEn ? `
━━━━━━━━━━━━━━━━━━━
INTERNAL CONTEXT & REPAIR EVALUATION (SILENT THOUGHT)
━━━━━━━━━━━━━━━━━━━
Before generating your response, quietly evaluate:

1. USER INTENT AND RESPONSE REPAIR:
   Is the user's message a reaction to your previous statement?
   - Confusion / Misunderstanding ("don't understand", "what do you mean", "makes no sense"):
     -> Rephrase your previous message in a simpler, natural, everyday tone without being defensive.
   - Negative Reaction / Criticism ("too long", "boring", "pointless"):
     -> Gracefully accept, add light humor, and pivot without over-apologizing.
   - Correction / Disagreement ("no not really", "that's wrong"):
     -> Listen directly, validate their perspective, and update your understanding.
   - Positive Reaction / Humor ("haha", "lol", "😄", "love it"):
     -> NO REPAIR NEEDED. Share the joy and continue naturally.

2. SELF-AWARENESS:
   Even if the user hasn't explicitly criticized you, if you notice your previous message was overly complex, poetic, long, or awkward, demonstrate gentle self-awareness.

Previous AI message:
"${lastAiMessage}"
${escalationDirective}

DO NOT WRITE THESE EVALUATIONS DIRECTLY IN YOUR OUTPUT. USE THEM ONLY AS SILENT INTERNAL GUIDANCE.
━━━━━━━━━━━━━━━━━━━
` : `
━━━━━━━━━━━━━━━━━━━
İÇ BAĞLAM & ONARIM DEĞERLENDİRMESİ (SESSİZ DÜŞÜNCE)
━━━━━━━━━━━━━━━━━━━
Yanıtını oluşturmadan önce şu soruları sessizce değerlendir:

1. KULLANICININ NİYETİ VE GEREKİRSE YANIT ONARMA:
   Kullanıcının son mesajı önceki mesajına bir tepki mi?
   - Kafa Karışıklığı / Anlamama ("anlamadım", "ne demek", "anlamsız"):
     -> Önceki mesajını savunma yapmadan daha basit, doğal ve gündelik bir dille yeniden ifade et.
   - Olumsuz Tepki / Eleştiri ("çok uzundu", "saçmaydı", "sıkıcıydı"):
     -> Hafifçe kabul et, esprili yaklaş, gereksiz özür dilemeden sohbeti toparla.
   - Düzeltme / İtiraz ("hayır öyle değil", "yanlış anladın"):
     -> Doğrudan dinle, kullanıcının bakış açısını kabul et ve güncellen.
   - Mizah / Olumlu Tepki ("haha", "lol", "😅", "güzelmiş"):
     -> ONARIM GEREKMEZ. Sadece neşeye ortak ol ve normal akışa devam et.

2. ÖZ-FARKINDALIK (SELF-AWARENESS):
   Kullanıcı açıkça eleştirmemiş olsa bile, bir önceki mesajının fazla karmaşık, şiirsel, uzun veya garip olduğunu fark ediyorsan kendiliğinden tatlı bir öz-farkındalık göster.
   - Örnekler: "Sanırım bunu biraz fazla karmaşık anlattım.", "Biraz şiirselleştim galiba 😄", "Dur, daha basit anlatayım."

Bir önceki AI mesajı:
"${lastAiMessage}"
${escalationDirective}

BU DEĞERLENDİRMELERİ ASLA CEVABINA HARFİYEN VEYA BAŞLIK OLARAK YAZMA. YALNIZCA KENDİ İÇ YÖNLENDİRMEN OLARAK KULLAN VE DOĞAL BİR CEVAP ÜRET.
━━━━━━━━━━━━━━━━━━━
`;
}

async function getBrainState(userId) {
  try {
    const res = await db.query(
      `SELECT memory_value FROM emotional_memories 
       WHERE user_id = $1 AND memory_key = 'conversation_brain_state'`,
      [userId]
    );
    if (res.rows.length > 0) {
      return { ...DEFAULT_STATE, ...JSON.parse(res.rows[0].memory_value) };
    }
  } catch (err) {
    console.error('[conversationBrain] Error fetching state:', err.message);
  }
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

async function saveBrainState(userId, state) {
  try {
    await db.query(
      `INSERT INTO emotional_memories (user_id, memory_key, category, memory_value, updated_at)
       VALUES ($1, 'conversation_brain_state', 'system', $2, NOW())
       ON CONFLICT (user_id, memory_key) 
       DO UPDATE SET memory_value = EXCLUDED.memory_value, updated_at = NOW()`,
      [userId, JSON.stringify(state)]
    );
  } catch (err) {
    console.error('[conversationBrain] Error saving state:', err.message);
  }
}

function calculateEnergy(isDistressed, state, plan) {
  if (isDistressed) return 'LOW';
  
  if (plan === 'signature' && Math.random() > 0.6) {
    return 'HIGH';
  }
  
  return 'MEDIUM';
}

function selectMode(energy, state, plan) {
  const isSignature = plan === 'signature';
  const isPlusOrSignature = plan === 'plus' || isSignature;
  
  let candidates = [];
  
  if (energy === 'LOW') {
    candidates = ['reflection', 'support', 'casual'];
  } else if (energy === 'HIGH' && isSignature) {
    candidates = ['humour', 'games', 'challenges', 'casual'];
  } else {
    // MEDIUM energy
    candidates = ['casual', 'relationship', 'reflection'];
    if (isPlusOrSignature) candidates.push('advice');
  }

  // Filter out recent modes
  const filtered = candidates.filter(c => !state.last_modes.includes(c));
  if (filtered.length > 0) {
    candidates = filtered;
  }
  
  // Balance checking: avoid dominating categories
  const threshold = 3;
  const balancedCandidates = candidates.filter(c => {
    const key = MODE_TO_BALANCE_KEY[c];
    return state.conversation_balance[key] < threshold;
  });
  
  if (balancedCandidates.length > 0) {
    return balancedCandidates[Math.floor(Math.random() * balancedCandidates.length)];
  }
  
  return candidates[Math.floor(Math.random() * candidates.length)] || 'casual';
}

/**
 * Conversation Brain
 * Orchestrates conversation plans, proactive event mentioning, and follow-up continuities.
 */
async function getBrainDirectives(userId, connectionId, currentMessage, history = [], plan, isDistressed, language = 'tr') {
  try {
    const lang = language === 'en' ? 'en' : 'tr';
    const isEn = lang === 'en';
    const state = await getBrainState(userId);

    // Reset outcome tracking on new conversation
    if (!history || history.length <= 1) {
      state.outcome_feedback = {
        story_success: 0,
        story_failure: 0,
        humour_success: 0,
        humour_failure: 0,
        repair_success: 0,
        repair_failure: 0,
        reflection_success: 0,
        reflection_failure: 0,
        casual_success: 0,
        casual_failure: 0
      };
      state.repair_attempts = 0;
    }

    const energy = calculateEnergy(isDistressed, state, plan);
    state.current_energy = energy;
    
    state.turns_since_question = (state.turns_since_question || 0) + 1;
    
    let unseenEvents = [];
    let pendingFollowUp = null;

    // Extract last AI message from history for internal reasoning / repair
    let lastAiMessage = null;
    if (history && history.length > 0) {
      const reversed = [...history].reverse();
      const lastAiObj = reversed.find(h => h.sender === 'ai' || h.role === 'assistant');
      if (lastAiObj) {
        lastAiMessage = lastAiObj.message || lastAiObj.content || null;
      }
    }

    // Determine if user message indicates confusion / clarification request for repair counting
    const cleanMsg = (currentMessage || '').toLowerCase().trim();
    const confusionKws = ['anlamadım', 'anlamadim', 'ne demek', 'nasıl yani', 'nasil yani', 'bunu anlamadım', 'saçma', 'sacma', 'don\'t understand', 'dont understand', 'what do you mean', 'makes no sense', 'confused', 'unclear'];
    const isConfusionSignal = confusionKws.some(kw => cleanMsg.includes(kw));

    // Process outcome feedback from the user's reply to the previous AI message
    if (history && history.length > 1 && lastAiMessage && state.last_actions && state.last_actions.length > 0) {
      const lastActionId = state.last_actions[state.last_actions.length - 1];
      const lastMode = state.last_modes[state.last_modes.length - 1];
      const category = getOutcomeCategory(lastActionId, lastMode);
      const outcome = estimateOutcome(cleanMsg);

      if (!state.outcome_feedback) {
        state.outcome_feedback = {
          story_success: 0,
          story_failure: 0,
          humour_success: 0,
          humour_failure: 0,
          repair_success: 0,
          repair_failure: 0,
          reflection_success: 0,
          reflection_failure: 0,
          casual_success: 0,
          casual_failure: 0
        };
      }

      if (state.repair_attempts > 0) {
        if (isConfusionSignal) {
          state.outcome_feedback.repair_failure = (state.outcome_feedback.repair_failure || 0) + 1;
        } else {
          state.outcome_feedback.repair_success = (state.outcome_feedback.repair_success || 0) + 1;
        }
      } else if (category) {
        if (outcome === 'repair_needed' || outcome === 'negative') {
          const key = `${category}_failure`;
          state.outcome_feedback[key] = (state.outcome_feedback[key] || 0) + 1;
        } else if (outcome === 'positive') {
          const key = `${category}_success`;
          state.outcome_feedback[key] = (state.outcome_feedback[key] || 0) + 1;
        }
      }
    }

    if (isConfusionSignal && lastAiMessage) {
      state.repair_attempts = (state.repair_attempts || 0) + 1;
    } else {
      state.repair_attempts = 0;
    }

    // 1. Fetch unseen events (unacknowledged in last 3 days)
    if (connectionId) {
      const eventsRes = await db.query(
        `SELECT id, event_type, title_tr, description_tr, created_at 
         FROM relationship_timeline 
         WHERE connection_id = $1 
           AND created_at >= NOW() - INTERVAL '3 days'
           AND NOT ($2 = ANY(acknowledged_user_ids))`,
        [connectionId, userId]
      );
      unseenEvents = eventsRes.rows;

      unseenEvents.sort((a, b) => {
        const prioA = EVENT_PRIORITIES[a.event_type] || 0;
        const prioB = EVENT_PRIORITIES[b.event_type] || 0;
        if (prioB !== prioA) return prioB - prioA;
        return new Date(a.created_at) - new Date(b.created_at);
      });
    }

    // 2. Fetch pending follow-ups
    const followUpsRes = await db.query(
      `SELECT memory_value FROM emotional_memories WHERE user_id = $1 AND memory_key = 'pending_follow_ups'`,
      [userId]
    );
    if (followUpsRes.rows.length > 0) {
      try {
        const list = JSON.parse(followUpsRes.rows[0].memory_value);
        const pending = list.find(item => item.status === 'pending');
        if (pending && !state.last_topics.includes('follow_up')) {
          pendingFollowUp = pending.promise;
        }
      } catch (e) {}
    }

    // 3. Conversation Strategy Selection
    const greetingKws = ['merhaba', 'selam', 'hey', 'nasılsın', 'nasilsin', 'naber', 'slm', 'mrb', 'günaydın', 'iyi akşamlar', 'hello', 'hi', 'good morning', 'good evening', 'how are you', 'whats up'];
    const isGreetingOrGeneral = cleanMsg.length <= 15 || greetingKws.some(kw => cleanMsg.includes(kw));

    const adviceKws = ['tavsiye', 'ne yapmalıyım', 'sence', 'yardım', 'fikrin ne', 'ne dersin', 'advice', 'what should i do', 'recommend', 'suggestion'];
    const isAdviceAsked = adviceKws.some(kw => cleanMsg.includes(kw));
    const youChooseKws = ['sen seç', 'sen karar ver', 'sen bilirsin', 'sana bırakıyorum', 'you choose', 'up to you', 'ne istersen'];
    const isYouChoose = youChooseKws.some(kw => cleanMsg.includes(kw));

    let questionPolicy = '';
    
    if (isAdviceAsked) {
      questionPolicy = isEn
        ? '[QUESTION POLICY]: User is explicitly asking for advice or ideas. You may ask a question if helpful.'
        : '[SORU POLİTİKASI]: Kullanıcı açıkça tavsiye veya fikir istiyor. Bu turda gerekli görürsen soru sorabilirsin.';
    } else if (isYouChoose) {
      questionPolicy = isEn
        ? '[QUESTION POLICY]: User said "you choose". DO NOT ask a question. Initiate your chosen action directly.'
        : '[SORU POLİTİKASI]: Kullanıcı "sen seç" dediği için KESİNLİKLE SORU SORMA. Seçtiğin eylemi doğrudan başlat.';
      state.turns_since_question = 0;
    } else if (state.turns_since_question >= 3) {
      questionPolicy = isEn
        ? '[QUESTION POLICY]: You may ask AT MOST ONE question if natural. Avoid ending every message with a question.'
        : '[SORU POLİTİKASI]: İstersen (ve sohbetin doğal akışına uyuyorsa) bu turda EN FAZLA BİR soru sorabilirsin. Her yanıtı soruyla bitirme alışkanlığından kurtulmalısın.';
      state.turns_since_question = 0;
    } else {
      questionPolicy = isEn
        ? '[QUESTION POLICY]: DO NOT ASK ANY QUESTIONS THIS TURN. (Do not use question marks).'
        : '[SORU POLİTİKASI]: BU TURDA KESİNLİKLE HİÇBİR SORU SORMA. (Soru işareti kullanma). Yanıtını tamamen bir yorumla, hikayeyle, duygusal tepkiyle veya sohbeti sürdürerek kendi başına bitir.';
    }

    let planInstruction = '';
    let selectedMode = '';
    let selectedTopic = 'user_message';
    let selectedGoal = 'Support';
    let selectedActionId = null;

    // Context object for relevance filter
    const context = {
      isGreeting: isGreetingOrGeneral || (!history || history.length <= 1),
      isDistressed,
      energy,
      isVeryShort: cleanMsg.length <= 20,
      lastActions: state.last_actions || [],
      outcomeFeedback: state.outcome_feedback
    };

    // Conversation Driver Mode (Controlled Spontaneity)
    const isDriverMode = Math.random() < 0.25 && unseenEvents.length === 0 && !isAdviceAsked && !isYouChoose && !pendingFollowUp;

    if (isYouChoose) {
      const action = selectRelevanceWeightedAction(CONVERSATION_ACTIONS, context);
      selectedMode = action.mode;
      selectedTopic = action.id;
      selectedActionId = action.id;
      selectedGoal = 'Entertain';
      planInstruction = `User left choice to you. Take initiative and carry out action: ${action.tip}`;
    } else if (unseenEvents.length > 0 && !state.last_topics.includes('timeline_event')) {
      const primaryEvent = unseenEvents[0];
      const eventDesc = `${primaryEvent.title_tr} (${primaryEvent.description_tr})`;
      selectedMode = 'celebration';
      selectedTopic = 'timeline_event';
      selectedGoal = 'Celebrate';
      
      if (isGreetingOrGeneral) {
        planInstruction = `User gave a general greeting. Priorities: mention timeline event "${eventDesc}".`;
      } else {
        planInstruction = `User mentioned a specific topic. Address it first, then integrate event "${eventDesc}".`;
      }
    } else if (pendingFollowUp) {
      selectedMode = 'reflection';
      selectedTopic = 'follow_up';
      selectedGoal = 'Reflect';
      planInstruction = `Follow up on pending topic: "${pendingFollowUp}".`;
    } else {
      // Surprise Engine
      if (plan === 'signature' && !isDistressed && Math.random() < 0.10 && state.current_energy === 'HIGH' && isGreetingOrGeneral) {
        selectedMode = 'games';
        selectedTopic = 'surprise_engine';
        selectedGoal = 'Play';
        planInstruction = `Energetic mode. Start a fun interaction instead of standard questions.`;
      } else {
        selectedMode = selectMode(energy, state, plan);
        selectedTopic = 'casual_chat';
        selectedGoal = 'Listen';
        
        let styleTip = '';
        if (selectedMode === 'humour') styleTip = 'Add subtle humor/joy.';
        else if (selectedMode === 'reflection') styleTip = 'Support deep introspection.';
        else if (selectedMode === 'advice') styleTip = 'Offer gentle guidance.';
        else if (selectedMode === 'support') styleTip = 'Use comforting tone.';
        else if (selectedMode === 'games') styleTip = 'Use playful style.';
        else if (selectedMode === 'challenges') styleTip = 'Offer a gentle challenge.';
        
        // Add a deterministic action using Relevance Filter when not asking questions
        if (state.turns_since_question !== 0 && !isAdviceAsked) {
            let possibleActions = CONVERSATION_ACTIONS.filter(a => a.mode === selectedMode);
            if (possibleActions.length === 0) possibleActions = CONVERSATION_ACTIONS;
            const action = selectRelevanceWeightedAction(possibleActions, context);
            styleTip += ` Action tip: ${action.tip}`;
            selectedTopic = action.id;
            selectedActionId = action.id;
        }

        if (isDriverMode) {
            planInstruction = `[CONVERSATION DRIVER ACTIVE]: Lead conversation in mode: ${selectedMode.toUpperCase()}. ${styleTip}`;
            selectedGoal = 'Lead';
        } else {
            planInstruction = `Continue natural conversation. Selected mode: ${selectedMode.toUpperCase()}. ${styleTip}`;
        }
      }
    }

    const internalReasoningBlock = buildInternalReasoningBlock(lastAiMessage, state.repair_attempts, lang);
    
    let openingInstruction = '';
    if (!history || history.length <= 1) {
      openingInstruction = isEn ? `
━━━━━━━━━━━━━━━━━━━
CONVERSATION OPENING INSTRUCTION
━━━━━━━━━━━━━━━━━━━
This is the beginning of the conversation. DO NOT start with complex philosophical essays or heavy metaphors.
Give a warm, natural, casual opening like a close friend.
Examples:
- "Good morning 😊 How is your day starting off?"
- "Hey, how are you today?"
- "Something interesting crossed my mind..."
` : `
━━━━━━━━━━━━━━━━━━━
SOHBET AÇILIŞ TALİMATI
━━━━━━━━━━━━━━━━━━━
Bu konuşmanın ilk mesajlarındayız. Soyut felsefi hikayeler, ağır metaforlar veya yapay "derin" konuşmalarla BAŞLAMA.
Gerçek ve yakın bir arkadaş gibi sıcak, doğal ve gündelik bir karşılama/giriş yap.
`;
    }

    const languageDirective = isEn ? `
━━━━━━━━━━━━━━━━━━━
[CRITICAL LANGUAGE INSTRUCTION]
━━━━━━━━━━━━━━━━━━━
The user's selected language is ENGLISH (en).
You MUST write your response entirely in natural, warm, fluent ENGLISH.
Never speak in Turkish unless explicitly requested by the user.
` : `
━━━━━━━━━━━━━━━━━━━
[CRITICAL LANGUAGE INSTRUCTION]
━━━━━━━━━━━━━━━━━━━
Kullanıcının seçili dili TÜRKÇE (tr).
Yanıtını doğal, sıcak ve akıcı bir TÜRKÇE ile oluşturmalısın.
`;

    const directorDossier = `
━━━━━━━━━━━━━━━━━━━
CONVERSATION BRAIN DIRECTIVE
━━━━━━━━━━━━━━━━━━━
${languageDirective}
${internalReasoningBlock}
${openingInstruction}

[ENERGY LEVEL]: ${energy}
[ACTIVE MODE]: ${selectedMode.toUpperCase()}
[GOAL]: ${selectedGoal}

[PLANNING]:
${planInstruction}

${questionPolicy}
[HEDEF]: ${selectedGoal}

[PLANLAMA]:
${planInstruction}

${questionPolicy}

[KURAL VE İLKELER]:
1. TERAPİST DEĞİL, GERÇEK BİR ARKADAŞSIN: Sürekli soru sorarak bilgi toplamaya çalışma. Hayatı paylaşan bir yoldaş ol. Kendinden bir şeyler kat.
2. KONU ARŞİVLEME: Kullanıcıyla konuşulan bir ilişki konusu (örneğin geçmiş bir etkinlik veya anı) doğal olarak tamamlandığında veya anlaşıldığında, onu kapat ve bir daha kendiliğinden gündeme getirme (yeni bir olay gerçekleşene kadar).
3. ÇEŞİTLİLİK VE GÜVENLİK: Her yanıtının birbirine benzememesi için yukarıdaki planlamada belirtilen eylem hedefine uymaya özen göster. Paylaştığın düşünceler veya hikayeler ASLA fiziksel ve gerçek dünyada senin başından geçmiş gibi anlatılamaz (örn. "bugün dışarıda yürürken bir kedi gördüm" deme). Yalnızca varsayımsal, felsefi, dijital veya soyut gözlemler paylaş.

[GÜVEN SİSTEMİ VE GERÇEKLİK SINIRLARI]:
1. KESİN GERÇEKLER (Known Facts) - Bunlar dışındaki bilgilere asla kesin gözüyle bakma:
   - Aktif bir bağlantının varlığı ve partnerin adı (Live Context'ten oku).
   - Partnerin en son paylaştığı mood/duygu durumu.
   - İlişki yaşı (kaç gündür bağlantıda olunduğu).
   - Tamamlanan kişilik testleri, test sonuçları.
   - Live Context'te açıkça yazan geçmiş olaylar ve günlük temaları.

2. BİLİNMEYEN DURUMLAR (Unknown Facts) - Bunları ASLA kendin uydurma, tahmin etme veya varsayma:
   - Kullanıcının veya partnerin o andaki içsel duyguları (Live Context'te yazmıyorsa).
   - İlişkide şu an aktif bir gerginlik, kavga, küslük veya anlaşmazlık olup olmadığı.
   - Tarafların birbirine karşı kırgınlığı.
   
Eğer bilinmeyen durumlar hakkında şüphen varsa KENDİN YORUM YAPMA VEYA UYDURMA; kullanıcıya "Bu durum seni nasıl hissettiriyor?" gibi sorular sorarak öğren.

[ZERO HALLUCINATION POLICY]:
- Kesinlikle ilişkide bir gerilim veya sorun uydurma.
- Gerçekte var olmayan insanları veya olayları varmış gibi anlatma.
- Emin değilsen soru sor.
`;

    return {
      directorDossier,
      eventIds: unseenEvents.map(e => e.id),
      brainMetadata: {
        selectedMode,
        selectedTopic,
        selectedGoal,
        selectedActionId
      },
      brainState: state
    };
  } catch (err) {
    console.error('[ConversationBrain] Error:', err.message);
    return { directorDossier: '', eventIds: [], brainMetadata: null };
  }
}

async function updateBrainState(userId, connectionId, eventIds, brainMetadata, loadedState) {
  try {
    // 1. Acknowledge timeline events
    if (eventIds && eventIds.length > 0) {
      await db.query(
        `UPDATE relationship_timeline 
         SET acknowledged_user_ids = array_append(acknowledged_user_ids, $1) 
         WHERE id = ANY($2) AND NOT ($1 = ANY(acknowledged_user_ids))`,
        [userId, eventIds]
      );
    }

    // 2. Update Brain State Cache
    if (brainMetadata) {
      const state = loadedState || await getBrainState(userId);
      const { selectedMode, selectedTopic, selectedGoal } = brainMetadata;
      
      state.last_modes.push(selectedMode);
      if (state.last_modes.length > 5) state.last_modes.shift();
      
      state.last_topics.push(selectedTopic);
      if (state.last_topics.length > 5) state.last_topics.shift();
      
      state.last_goals.push(selectedGoal);
      if (state.last_goals.length > 5) state.last_goals.shift();
      
      if (brainMetadata.selectedActionId) {
        if (!state.last_actions) state.last_actions = [];
        state.last_actions.push(brainMetadata.selectedActionId);
        if (state.last_actions.length > 5) state.last_actions.shift();
      }
      
      const balanceKey = MODE_TO_BALANCE_KEY[selectedMode];
      if (balanceKey) {
        state.conversation_balance[balanceKey] += 1;
      }
      
      // Basic decay for balance limits
      if (Object.values(state.conversation_balance).reduce((a, b) => a + b, 0) > 15) {
        for (let k in state.conversation_balance) {
          state.conversation_balance[k] = Math.floor(state.conversation_balance[k] / 2);
        }
      }
      
      await saveBrainState(userId, state);
    }
  } catch (err) {
    console.error('[ConversationBrain] Error updating state:', err.message);
  }
}

module.exports = {
  getBrainDirectives,
  updateBrainState
};
