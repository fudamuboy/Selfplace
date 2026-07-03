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
  current_energy: 'MEDIUM'
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
async function getBrainDirectives(userId, connectionId, currentMessage, history, plan, isDistressed) {
  try {
    const state = await getBrainState(userId);
    const energy = calculateEnergy(isDistressed, state, plan);
    state.current_energy = energy;
    
    let unseenEvents = [];
    let pendingFollowUp = null;

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
    const cleanMsg = currentMessage.toLowerCase().trim();
    const isGreetingOrGeneral = cleanMsg.length <= 15 || 
      ['merhaba', 'selam', 'hey', 'nasılsın', 'nasilsin', 'naber', 'slm', 'mrb', 'günaydın', 'iyi akşamlar'].some(kw => cleanMsg.includes(kw));

    let planInstruction = '';
    let selectedMode = '';
    let selectedTopic = 'user_message';
    let selectedGoal = 'Support';

    if (unseenEvents.length > 0 && !state.last_topics.includes('timeline_event')) {
      const primaryEvent = unseenEvents[0];
      const eventDesc = `${primaryEvent.title_tr} (${primaryEvent.description_tr})`;
      selectedMode = 'celebration';
      selectedTopic = 'timeline_event';
      selectedGoal = 'Celebrate';
      
      if (isGreetingOrGeneral) {
        planInstruction = `Kullanıcı genel bir selam verdi veya kısa bir giriş yaptı. 
Önceliğin, yeni gerçekleşen şu önemli olayı doğrudan kutlamak/bahsetmektir: "${eventDesc}".
Sohbete bu olaydan bahsederek başla, ardından kullanıcının mesajına kısaca değin.`;
      } else {
        planInstruction = `Kullanıcı özel bir konudan veya sorudan bahsediyor.
Önce kullanıcının mesajındaki konuya odaklan ve yanıt ver. Yanıtın sonuna doğru, yeni gerçekleşen şu önemli olayı da doğal bir şekilde entegre et: "${eventDesc}".`;
      }
    } else if (pendingFollowUp) {
      selectedMode = 'reflection';
      selectedTopic = 'follow_up';
      selectedGoal = 'Reflect';
      planInstruction = `Geçmişten gelen bekleyen bir takip konun var: "${pendingFollowUp}".
Kullanıcının mesajını samimiyetle yanıtladıktan sonra, bu takip konusunun nasıl gittiğini veya durumunu nazikçe sor.`;
    } else {
      // Surprise Engine
      if (plan === 'signature' && !isDistressed && Math.random() < 0.10 && state.current_energy === 'HIGH' && isGreetingOrGeneral) {
        selectedMode = 'games';
        selectedTopic = 'surprise_engine';
        selectedGoal = 'Play';
        planInstruction = `Bugün enerjik bir moddasın. Doğrudan standart bir soru sormak yerine kısa, eğlenceli ve sıra dışı bir etkileşim başlat. (Örn: Eğlenceli bir psikoloji sorusu, minik bir zihinsel meydan okuma veya neşeli bir şaka). Kullanıcının mesajına kısaca cevap verdikten sonra bu sürprizi sun.`;
      } else {
        selectedMode = selectMode(energy, state, plan);
        selectedTopic = 'casual_chat';
        selectedGoal = 'Listen';
        
        let styleTip = '';
        if (selectedMode === 'humour') styleTip = 'Yanıtına doğal ve ince bir mizah/neşe kat.';
        else if (selectedMode === 'reflection') styleTip = 'Daha derin, iç gözlem yaptıracak açık uçlu bir soruyla destekle.';
        else if (selectedMode === 'advice') styleTip = 'Eğer kullanıcının mesajı uyuyorsa, hafif bir rehberlik veya perspektif sun.';
        else if (selectedMode === 'support') styleTip = 'Şefkatli, onaylayıcı ve rahatlatıcı bir ton kullan.';
        else if (selectedMode === 'games') styleTip = 'Eğlenceli ve oyunsal bir üslup takın.';
        else if (selectedMode === 'challenges') styleTip = 'Kullanıcıyı nazikçe motive edecek küçük bir meydan okuma yap.';
        
        planInstruction = `Doğal sohbete devam et. Ekstra bir proaktif olay bulunmuyor. Seçilen mod: ${selectedMode.toUpperCase()}. ${styleTip}`;
      }
    }

    const directorDossier = `
━━━━━━━━━━━━━━━━━━━
CONVERSATION BRAIN DIRECTIVE
━━━━━━━━━━━━━━━━━━━
[ENERJİ SEVİYESİ]: ${energy}
[AKTİF MOD]: ${selectedMode.toUpperCase()}
[HEDEF]: ${selectedGoal}

[PLANLAMA]:
${planInstruction}

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
        selectedGoal
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
