/**
 * coupleMemoryService.js
 * 
 * Manages two memory layers for the Relationship Intelligence system:
 * 
 * 1. Shared Couple Memory (couple_memories table)
 *    - Stores emotional events per relationship: conflicts, reconciliations,
 *      milestones, recurring issues, positive moments, communication patterns, goals
 *    - Belongs to the connection, not an individual user
 * 
 * 2. Individual Behavioral Memory (individual_behavioral_memory table)
 *    - Per-user emotional/behavioral trait tracking
 *    - reassurance_seeking, conflict_style, avoidance_tendency, etc.
 * 
 * All outputs are in Turkish.
 */

const db = require('../config/db');
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Constants ────────────────────────────────────────────────────────────────

const MEMORY_TYPES = [
  'conflict',
  'reconciliation',
  'milestone',
  'recurring_issue',
  'positive_moment',
  'communication_pattern',
  'relationship_goal',
];

const BEHAVIORAL_TRAITS = [
  'reassurance_seeking',    // Sık güvence arayışı
  'conflict_style',         // Çatışma yaklaşım tarzı
  'avoidance_tendency',     // Kaçınma eğilimi
  'emotional_dependency',   // Duygusal bağımlılık düzeyi
  'communication_preference', // İletişim tercihi (doğrudan/dolaylı)
  'emotional_goals',        // Kişisel duygusal hedefler
];

// Turkish labels for dossier display
const MEMORY_TYPE_LABELS = {
  conflict: 'Çatışma',
  reconciliation: 'Uzlaşma',
  milestone: 'İlişki Dönüm Noktası',
  recurring_issue: 'Tekrarlayan Sorun',
  positive_moment: 'Olumlu An',
  communication_pattern: 'İletişim Deseni',
  relationship_goal: 'İlişki Hedefi',
};

const TRAIT_LABELS = {
  reassurance_seeking: 'Güvence Arayışı',
  conflict_style: 'Çatışma Tarzı',
  avoidance_tendency: 'Kaçınma Eğilimi',
  emotional_dependency: 'Duygusal Bağ Yoğunluğu',
  communication_preference: 'İletişim Tercihi',
  emotional_goals: 'Duygusal Hedefler',
};

// ─── Shared Couple Memory ─────────────────────────────────────────────────────

/**
 * Extracts relationship events from the current conversation and saves them
 * as shared couple memories. Runs in the background — non-blocking.
 * 
 * @param {number} connectionId  - Relationship connection ID
 * @param {number} userId        - ID of the partner currently speaking
 * @param {string} message       - Latest user message
 * @param {Array}  history       - Recent conversation history [{sender, message}]
 * @param {string} userRole      - 'partner_a' or 'partner_b'
 */
exports.extractCoupleMemory = async (connectionId, userId, message, history, userRole = 'both') => {
  try {
    // ── Privacy Enforcement ──────────────────────────────────────────
    const privacyRes = await db.query(
      'SELECT exclude_ai_chat FROM relationship_privacy_settings WHERE connection_id = $1 AND user_id = $2',
      [connectionId, userId]
    );
    if (privacyRes.rows.length > 0 && privacyRes.rows[0].exclude_ai_chat) {
      console.log(`[coupleMemoryService] Privacy Guard: User ${userId} excluded AI chat. Skipping memory extraction.`);
      return;
    }
    // ─────────────────────────────────────────────────────────────────

    const historyText = history
      .slice(-6)
      .map(h => `${h.sender === 'user' ? 'Kullanıcı' : 'Selfplace'}: ${h.message}`)
      .join('\n');

    const systemPrompt = `Sen Selfplace'in ilişki hafızası analiz motorusun.
Kullanıcının son mesajını ve konuşma geçmişini analiz et.
İlişkiyle ilgili ÖNEMLİ duygusal olayları tespit et.

Tespit edebileceğin olay türleri:
- "conflict": Tartışma, gerginlik, anlaşmazlık
- "reconciliation": Barışma, özür, yumuşama
- "milestone": Önemli ilişki anı (ilk buluşma, karar, söz, vs.)
- "recurring_issue": Tekrar eden sorun veya şikayet
- "positive_moment": Güzel an, teşekkür, sevgi ifadesi
- "communication_pattern": İletişim biçimi ile ilgili gözlem
- "relationship_goal": İlişkiyle ilgili belirtilen hedef veya istek

Kurallar:
- Sadece gerçekten belirtilen olayları kaydet. Tahmin yapma.
- Özet kısa, Türkçe ve duygusal olmalı (max 30 kelime).
- Önemsiz sıradan mesajlar için boş dizi döndür.
- emotional_weight: 1 (hafif) - 5 (çok yoğun)
- resolved: eğer olay çözülmüş/geçmiş görünüyorsa true

Konuşma geçmişi:
${historyText}

Son kullanıcı mesajı:
"${message}"

Sadece geçerli JSON döndür:
{
  "events": [
    {
      "memory_type": "conflict",
      "summary": "Türkçe kısa özet...",
      "emotional_weight": 3,
      "resolved": false
    }
  ]
}
Olay yoksa: { "events": [] }`;

    const result = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const parsed = JSON.parse(result.choices[0].message.content);
    const events = parsed.events || [];

    let hasResolution = false;

    for (const event of events) {
      if (!MEMORY_TYPES.includes(event.memory_type)) continue;
      if (!event.summary || event.summary.trim().length < 5) continue;

      const isResolved = Boolean(event.resolved) || event.memory_type === 'reconciliation';
      if (isResolved) {
        hasResolution = true;
      }

      await db.query(
        `INSERT INTO couple_memories 
           (connection_id, memory_type, summary, participants, emotional_weight, resolved)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          connectionId,
          event.memory_type,
          event.summary.trim(),
          userRole,
          Math.min(5, Math.max(1, parseInt(event.emotional_weight) || 3)),
          Boolean(event.resolved),
        ]
      );
    }

    if (hasResolution) {
      // Auto-resolve any past conflicts that are still active
      await db.query(
         `UPDATE couple_memories 
          SET resolved = true 
          WHERE connection_id = $1 AND memory_type = 'conflict' AND resolved = false`,
         [connectionId]
      );
      console.log(`[coupleMemoryService] Auto-resolved past conflicts for connection ${connectionId}`);
    }

    if (events.length > 0) {
      console.log(`[coupleMemoryService] Saved ${events.length} couple memory event(s) for connection ${connectionId}`);
    }
  } catch (err) {
    console.error('[coupleMemoryService] extractCoupleMemory error:', err.message);
  }
};

/**
 * Builds a Turkish dossier of shared couple memories for system prompt injection.
 * Fetches the most emotionally significant recent memories.
 * 
 * @param {number} connectionId
 * @returns {string} Formatted Turkish dossier segment
 */
exports.buildCoupleMemoryDossier = async (connectionId) => {
  try {
    // Fetch the most recent + highest weight memories (limit 8)
    const result = await db.query(
      `SELECT memory_type, summary, emotional_weight, resolved, created_at
       FROM couple_memories
       WHERE connection_id = $1
       ORDER BY emotional_weight DESC, created_at DESC
       LIMIT 8`,
      [connectionId]
    );

    if (result.rows.length === 0) return '';

    const unresolvedConflicts = result.rows.filter(r => r.memory_type === 'conflict' && !r.resolved);
    const resolvedConflicts = result.rows.filter(r => r.memory_type === 'conflict' && r.resolved);
    const reconciliations = result.rows.filter(r => r.memory_type === 'reconciliation');
    const recurringIssues = result.rows.filter(r => r.memory_type === 'recurring_issue');
    const goals = result.rows.filter(r => r.memory_type === 'relationship_goal');
    const positive = result.rows.filter(r => r.memory_type === 'positive_moment');
    const milestones = result.rows.filter(r => r.memory_type === 'milestone');
    const patterns = result.rows.filter(r => r.memory_type === 'communication_pattern');

    let dossier = `[ORTAK HAFIZA — ÇİFT BELLEK SİSTEMİ]\n`;

    if (unresolvedConflicts.length > 0) {
      dossier += `- ⚠️ Çözülmemiş Gerilim(ler):\n`;
      unresolvedConflicts.forEach(m => {
        dossier += `  • "${m.summary}" (Yoğunluk: ${m.emotional_weight}/5)\n`;
      });
    }

    if (resolvedConflicts.length > 0) {
      dossier += `- ✅ Geçmiş / Çözülmüş Sorun(lar):\n`;
      resolvedConflicts.slice(0, 2).forEach(m => {
        dossier += `  • "${m.summary}" (Geçmişte yaşandı ama çözüldü)\n`;
      });
    }

    if (reconciliations.length > 0) {
      dossier += `- 🌿 Son Uzlaşma/Yumuşama:\n`;
      reconciliations.slice(0, 2).forEach(m => {
        dossier += `  • "${m.summary}"\n`;
      });
    }

    if (recurringIssues.length > 0) {
      dossier += `- 🔁 Tekrarlayan Konu:\n`;
      recurringIssues.slice(0, 2).forEach(m => {
        dossier += `  • "${m.summary}"\n`;
      });
    }

    if (goals.length > 0) {
      dossier += `- 🎯 İlişki Hedefleri:\n`;
      goals.slice(0, 2).forEach(m => {
        dossier += `  • "${m.summary}"\n`;
      });
    }

    if (positive.length > 0) {
      dossier += `- 🤍 Son Güzel An:\n`;
      positive.slice(0, 2).forEach(m => {
        dossier += `  • "${m.summary}"\n`;
      });
    }

    if (milestones.length > 0) {
      dossier += `- ✨ Önemli Dönüm Noktaları:\n`;
      milestones.slice(0, 2).forEach(m => {
        dossier += `  • "${m.summary}"\n`;
      });
    }

    if (patterns.length > 0) {
      dossier += `- 💬 İletişim Deseni:\n`;
      patterns.slice(0, 2).forEach(m => {
        dossier += `  • "${m.summary}"\n`;
      });
    }

    dossier += `\nÖnemli Kural: Bu hafızayı doğrudan alıntı yapmadan, yumuşak duygusal sentezle kullan.\n`;
    dossier += `ASLA: "Tartıştığınızı yazmıştın" veya "şunu söyledin" deme.\n`;
    dossier += `EVET: "Son zamanlarda aranızda biraz gerginlik hissediliyordu..." gibi dolaylı, nazik yaklaşım.\n`;

    return dossier;
  } catch (err) {
    console.error('[coupleMemoryService] buildCoupleMemoryDossier error:', err.message);
    return '';
  }
};

// ─── Individual Behavioral Memory ────────────────────────────────────────────

/**
 * Extracts behavioral/emotional traits from the conversation and upserts
 * them into individual_behavioral_memory. Runs in background.
 * 
 * @param {number} userId
 * @param {string} message
 * @param {Array}  history
 */
exports.updateIndividualBehavioralMemory = async (userId, message, history) => {
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
      console.log(`[coupleMemoryService] Privacy Guard: User ${userId} excluded AI chat. Skipping individual behavioral memory update.`);
      return;
    }

    // Fetch current traits for context
    const existing = await db.query(
      'SELECT trait_key, trait_value, confidence FROM individual_behavioral_memory WHERE user_id = $1',
      [userId]
    );
    const currentTraits = {};
    existing.rows.forEach(r => { currentTraits[r.trait_key] = { value: r.trait_value, confidence: r.confidence }; });

    const historyText = history
      .slice(-6)
      .map(h => `${h.sender === 'user' ? 'Kullanıcı' : 'Selfplace'}: ${h.message}`)
      .join('\n');

    const systemPrompt = `Sen Selfplace'in bireysel davranış analizi motorusun.
Kullanıcının mesajlarını analiz ederek duygusal/davranışsal eğilimlerini tespit et.

Mevcut bilinen özellikler:
${JSON.stringify(currentTraits, null, 2)}

Tespit edilecek özellikler (sadece gerçekten gözlemlenenleri güncelle):
- "reassurance_seeking": Güvence arayışı düzeyi (Düşük/Orta/Yüksek + kısa açıklama)
- "conflict_style": Çatışma yaklaşımı (Kaçınmacı/Uzlaşmacı/Yüzleşmeci + kısa açıklama)
- "avoidance_tendency": Duygusal kaçınma eğilimi (Var/Zaman zaman/Yok + kısa açıklama)
- "emotional_dependency": Duygusal bağ yoğunluğu (Yüksek/Orta/Bağımsız + kısa açıklama)
- "communication_preference": İletişim tercihi (Doğrudan/Dolaylı/Yazılı/Sözlü + kısa açıklama)
- "emotional_goals": Kişisel duygusal hedefler (Türkçe kısa cümle)

Kurallar:
- Sadece gerçekten gözlemlenen özellikleri güncelle.
- confidence: 0-100 (tahmin gücü - düşük veriyle düşük tut)
- Türkçe ve kısa tut (max 15 kelime per trait)

Konuşma geçmişi:
${historyText}

Son mesaj: "${message}"

Sadece geçerli JSON döndür (sadece değişen/yeni özellikler):
{
  "updates": [
    { "trait_key": "conflict_style", "trait_value": "Kaçınmacı — tartışmadan uzaklaşmayı tercih ediyor", "confidence": 65 }
  ]
}
Değişiklik yoksa: { "updates": [] }`;

    const result = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const parsed = JSON.parse(result.choices[0].message.content);
    const updates = parsed.updates || [];

    for (const update of updates) {
      if (!BEHAVIORAL_TRAITS.includes(update.trait_key)) continue;
      if (!update.trait_value || update.trait_value.trim().length < 3) continue;

      await db.query(
        `INSERT INTO individual_behavioral_memory (user_id, trait_key, trait_value, confidence)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, trait_key)
         DO UPDATE SET 
           trait_value = EXCLUDED.trait_value,
           confidence = EXCLUDED.confidence,
           updated_at = NOW()`,
        [
          userId,
          update.trait_key,
          update.trait_value.trim(),
          Math.min(100, Math.max(0, parseInt(update.confidence) || 50)),
        ]
      );
    }

    if (updates.length > 0) {
      console.log(`[coupleMemoryService] Updated ${updates.length} behavioral trait(s) for user ${userId}`);
    }
  } catch (err) {
    console.error('[coupleMemoryService] updateIndividualBehavioralMemory error:', err.message);
  }
};

/**
 * Builds a Turkish dossier of individual behavioral traits for system prompt injection.
 * 
 * @param {number} userId
 * @returns {string} Formatted Turkish dossier segment
 */
exports.getIndividualBehavioralDossier = async (userId) => {
  try {
    const result = await db.query(
      `SELECT trait_key, trait_value, confidence
       FROM individual_behavioral_memory
       WHERE user_id = $1
       ORDER BY confidence DESC, updated_at DESC`,
      [userId]
    );

    if (result.rows.length === 0) return '';

    let dossier = `[BİREYSEL DAVRANIŞ PROFİLİ]\n`;
    result.rows.forEach(row => {
      const label = TRAIT_LABELS[row.trait_key] || row.trait_key;
      // Only include traits with meaningful confidence
      if (row.confidence >= 35) {
        dossier += `- ${label}: ${row.trait_value}\n`;
      }
    });

    dossier += `\nBu profili yanıt tonunu, soruların şeklini ve duygusal çerçevelemeyi ayarlamak için kullan.\n`;

    return dossier;
  } catch (err) {
    console.error('[coupleMemoryService] getIndividualBehavioralDossier error:', err.message);
    return '';
  }
};

// ─── Relationship Resolution State Engine ────────────────────────────────────

/**
 * Detects the current relationship resolution state from recent conversation
 * and stored couple memories. Uses keyword signals — no extra API call.
 *
 * States:
 *   ACTIVE_CONFLICT   — tension, argument, hurt feelings ongoing
 *   IMPROVING         — situation getting better, soft progress detected
 *   RESOLVED          — user indicates problem is over / settled
 *   RECONNECTING      — after conflict, both trying to rebuild closeness
 *   STABLE            — no active conflict, neutral/positive atmosphere
 *
 * @param {Array}  history      - Recent conversation [{sender, message}]
 * @param {string} latestMsg    - The current user message
 * @param {number|null} connectionId - For memory cross-check
 * @returns {{ state: string, label: string, confidence: number }}
 */
exports.detectRelationshipResolutionState = async (history, latestMsg, connectionId) => {
  const defaultState = { state: 'STABLE', label: 'Dengeli', confidence: 50 };

  try {
    // Combine last 6 messages + latest for signal scanning
    const recentTexts = [
      ...history.slice(-6).map(h => h.message),
      latestMsg,
    ].join(' ').toLowerCase();

    // ── Keyword signal groups (Turkish) ────────────────────────────────────

    const resolvedSignals = [
      'hallettik', 'çözdük', 'tamam artık', 'düzeldi', 'toparladı', 'barıştık',
      'özür diledik', 'özür diledi', 'geçti', 'geçmiş olsun', 'iyi oldu',
      'düzeldik', 'anlaştık', 'artık iyi', 'her şey yolunda', 'her şey düzeldi',
      'sorun kalmadı', 'çözüme kavuştuk', 'konuştuk ve hallettik',
    ];

    const improvingSignals = [
      'biraz daha iyi', 'az da olsa', 'toparlanıyor', 'iyileşiyor',
      'konuştuk', 'açıkça konuştuk', 'anlaşmaya çalışıyoruz',
      'daha iyi hissediyorum', 'daha sakin', 'yumuşadı', 'yumuşadık',
      'en azından', 'adım attık', 'bir adım', 'açılmaya başladı',
      'biraz rahatlattı', 'anlayış gösterdi', 'dinledi',
    ];

    const reconnectingSignals = [
      'yeniden başlamak', 'yeni sayfa', 'sıfırlamak', 'tekrar yakınlaşmak',
      'eskisi gibi olmak', 'bağı güçlendirmek', 'birbirimize yakınlaşmak',
      'yeniden bağlanmak', 'tekrar konuşmak istiyorum', 'barışmak istiyorum',
      'özür dilemek istiyorum', 'adım atmak istiyorum',
    ];

    const activeConflictSignals = [
      'hâlâ tartışıyoruz', 'hâlâ kızgın', 'hâlâ darıldım', 'hâlâ küskün',
      'çözülmedi', 'devam ediyor', 'daha da kötü', 'daha da kötüleşti',
      'anlamıyor', 'dinlemiyor', 'konuşmuyor', 'kaçıyor', 'cevap vermiyor',
      'çok sinirli', 'çok üzüldüm', 'ağladım', 'çok zor', 'dayanamıyorum',
      'bitecek mi', 'bu ilişki', 'ayrılmak', 'bıkmak',
    ];

    // Score each state
    const score = {
      RESOLVED: resolvedSignals.filter(s => recentTexts.includes(s)).length,
      IMPROVING: improvingSignals.filter(s => recentTexts.includes(s)).length,
      RECONNECTING: reconnectingSignals.filter(s => recentTexts.includes(s)).length,
      ACTIVE_CONFLICT: activeConflictSignals.filter(s => recentTexts.includes(s)).length,
    };

    // ── Cross-check with stored couple memory ──────────────────────────────
    let memoryConflictBoost = 0;
    let memoryResolvedBoost = 0;

    if (connectionId) {
      const memRes = await db.query(
        `SELECT memory_type, resolved FROM couple_memories
         WHERE connection_id = $1
         ORDER BY created_at DESC LIMIT 5`,
        [connectionId]
      );
      memRes.rows.forEach(row => {
        if (row.memory_type === 'conflict' && !row.resolved) memoryConflictBoost += 1;
        if (row.memory_type === 'reconciliation') memoryResolvedBoost += 1;
        if (row.memory_type === 'conflict' && row.resolved) memoryResolvedBoost += 0.5;
      });
    }

    score.ACTIVE_CONFLICT += memoryConflictBoost;
    score.RESOLVED += memoryResolvedBoost * 0.5;

    // Pick highest score
    const winner = Object.entries(score).sort((a, b) => b[1] - a[1])[0];
    const [winnerState, winnerScore] = winner;

    if (winnerScore === 0) return defaultState;

    const labels = {
      ACTIVE_CONFLICT: 'Aktif Çatışma',
      IMPROVING: 'İyileşiyor',
      RESOLVED: 'Çözüldü',
      RECONNECTING: 'Yeniden Bağlanma',
      STABLE: 'Dengeli',
    };

    const confidence = Math.min(95, 40 + winnerScore * 15);

    console.log(`[coupleMemoryService] Resolution state: ${winnerState} (score=${winnerScore}, confidence=${confidence}%)`);

    return {
      state: winnerState,
      label: labels[winnerState] || 'Dengeli',
      confidence,
    };
  } catch (err) {
    console.error('[coupleMemoryService] detectRelationshipResolutionState error:', err.message);
    return defaultState;
  }
};

