/**
 * relationshipContinuityEngine.js
 * 
 * Analyzes couple memory and individual context to decide whether the AI
 * should proactively follow up on a past relationship event.
 * 
 * Outputs a Turkish follow-up directive that is injected into the system prompt
 * before response generation — creating the experience that the AI "remembers".
 * 
 * Cooldown system: each couple memory has a `last_referenced_at` timestamp.
 * A memory won't be surfaced again within 12 hours of its last reference.
 * 
 * All output is in Turkish.
 */

const db = require('../config/db');

// Cooldown: 12 hours in milliseconds
const COOLDOWN_MS = 12 * 60 * 60 * 1000;

/**
 * Determines whether the AI should proactively follow up on a relationship event,
 * and if so, returns the instruction to inject into the system prompt.
 * 
 * Priority order:
 * 1. Unresolved conflict (high emotional weight first)
 * 2. Recent reconciliation not yet acknowledged
 * 3. Relationship goal not revisited in > 3 days
 * 4. Recurring issue that appears repeatedly
 * 5. Positive moment worth celebrating/reinforcing
 * 
 * @param {number} userId         - Current speaking user ID
 * @param {number|null} connectionId - Relationship connection ID (null if solo)
 * @returns {{ shouldFollowUp: boolean, followUpInstruction: string, triggeredMemoryId: number|null }}
 */
exports.buildContinuityFollowUp = async (userId, connectionId) => {
  const empty = { shouldFollowUp: false, followUpInstruction: '', triggeredMemoryId: null };

  if (!connectionId) return empty;

  try {
    const now = new Date();

    // ── 1. Fetch candidate memories (not recently referenced) ──────────────
    const memResult = await db.query(
      `SELECT id, memory_type, summary, emotional_weight, resolved, created_at, last_referenced_at
       FROM couple_memories
       WHERE connection_id = $1
         AND (
           last_referenced_at IS NULL
           OR last_referenced_at < NOW() - INTERVAL '12 hours'
         )
       ORDER BY emotional_weight DESC, created_at DESC
       LIMIT 15`,
      [connectionId]
    );

    const memories = memResult.rows;
    if (memories.length === 0) return empty;

    // ── 2. Priority selection ──────────────────────────────────────────────

    let selectedMemory = null;
    let instructionTemplate = '';

    // Priority 1: Unresolved conflict
    const unresolvedConflict = memories.find(
      m => m.memory_type === 'conflict' && !m.resolved
    );
    if (unresolvedConflict) {
      selectedMemory = unresolvedConflict;
      instructionTemplate = `DUYGUSAL SÜREKLİLİK TAKİBİ — ÇÖZÜLMEMEM GERİLİM
Daha önce bu ilişkide çözüme kavuşmamış bir gerginlik tespit edildi.
Bu yanıtta, DOĞAL bir şekilde şu an nasıl hissedildiklerini sor.
ASLA "tartıştınız" veya "problem vardı" gibi ifadeler kullanma.
Bunun yerine yumuşak, doğal bir merak göster:
Örnek: "Son zamanlarda biraz hassas bir dönem geçiriliyormuş gibi hissettim. Şu an nasıl?"
Örnek: "Aranızdaki o biraz gergin hava dağıldı mı acaba?"
Bu soruyu yanıtın başında DEĞİL, doğal bir geçişle içine yedirmeye çalış.`;
    }

    // Priority 2: Recent reconciliation (within 48 hours, not acknowledged)
    if (!selectedMemory) {
      const recentReconciliation = memories.find(m => {
        if (m.memory_type !== 'reconciliation') return false;
        const ageMs = now - new Date(m.created_at);
        return ageMs < 48 * 60 * 60 * 1000; // within 48 hours
      });
      if (recentReconciliation) {
        selectedMemory = recentReconciliation;
        instructionTemplate = `DUYGUSAL SÜREKLİLİK TAKİBİ — UZLAŞMA SONRASI
Son zamanlarda bu ilişkide olumlu bir yumuşama/uzlaşma yaşandığı sinyalleri var.
Bu yanıtta, nazikçe bu ilerlemeyi fark et ve onları destekle.
ASLA "barıştınız" veya "özür dilediniz" deme. Doğal, nazik bir farkındalık göster:
Örnek: "Birbirinize biraz daha yumuşak yaklaştığınızı hissediyorum. 🤍"
Örnek: "Aranızdaki o sıcaklık geri geliyor gibi... Şu an nasıl hissediyorsun?"
Yanıtın içine doğal yedirmeye çalış, başlık gibi koyma.`;
      }
    }

    // Priority 3: Relationship goal not revisited in > 3 days
    if (!selectedMemory) {
      const oldGoal = memories.find(m => {
        if (m.memory_type !== 'relationship_goal') return false;
        const ageMs = now - new Date(m.created_at);
        return ageMs > 3 * 24 * 60 * 60 * 1000; // older than 3 days
      });
      if (oldGoal) {
        selectedMemory = oldGoal;
        instructionTemplate = `DUYGUSAL SÜREKLİLİK TAKİBİ — İLİŞKİ HEDEFİ TAKİBİ
Bu ilişkide önceden belirtilmiş bir hedef veya istek vardı.
Bu yanıtta nazikçe nasıl ilerlediğini sor.
ASLA "hedef koydunuz" veya "şunu istediniz" deme. Meraklı ve destekleyici ol:
Örnek: "Birbirinizi daha iyi anlamaya çalışma konusunda nasıl ilerliyorsunuz?"
Örnek: "Birlikte daha sakin iletişim kurmak istediğinizi hissettiriyordu. Şu an nasıl hissediyorsun?"
Yanıtın içine doğal yedirmeye çalış.`;
      }
    }

    // Priority 4: Recurring issue (appeared more than once)
    if (!selectedMemory) {
      const recurringCounts = {};
      memories.forEach(m => {
        if (m.memory_type === 'recurring_issue') {
          recurringCounts[m.id] = (recurringCounts[m.id] || 0) + 1;
        }
      });
      const recurringIssue = memories.find(m => m.memory_type === 'recurring_issue');
      if (recurringIssue) {
        selectedMemory = recurringIssue;
        instructionTemplate = `DUYGUSAL SÜREKLİLİK TAKİBİ — TEKRARLAYAN KONU
Bu ilişkide tekrar eden bir konu ya da tema tespit edildi.
Yanıtında bu konuya yumuşakça değin, ancak doğrudan isimlendir:
Örnek: "Son zamanlarda bazı konuların tekrar tekrar gündeme geldiği hissediliyor..."
Örnek: "Bazı şeyler çözülmeden askıda kalıyor gibi görünüyor. Bu nasıl hissettiriyor?"`;
      }
    }

    // Priority 5: Positive moment worth reinforcing
    if (!selectedMemory) {
      const positiveMoment = memories.find(m => m.memory_type === 'positive_moment');
      if (positiveMoment) {
        selectedMemory = positiveMoment;
        instructionTemplate = `DUYGUSAL SÜREKLİLİK TAKİBİ — OLUMLU AN
Son zamanlarda bu ilişkide güzel bir an veya ilerleme yaşandı.
Yanıtında bunu hafifçe fark et ve pekiştir:
Örnek: "Aranızda güzel bir enerji hissediyorum son zamanlarda. 🤍"
Örnek: "Birbirinize iyi davrandığınız anlar artıyor gibi..."`;
      }
    }

    if (!selectedMemory) return empty;

    // ── 3. Mark memory as referenced (update cooldown) ────────────────────
    await db.query(
      'UPDATE couple_memories SET last_referenced_at = NOW() WHERE id = $1',
      [selectedMemory.id]
    );

    const followUpInstruction = `
━━━━━━━━━━━━━━━━━━━
${instructionTemplate}
━━━━━━━━━━━━━━━━━━━
Bu direktif mevcut yanıtın bir parçası olarak DOĞAL ve YUMUŞAK biçimde uygulanmalıdır.
Yanıt yine de 1-3 cümle sınırında kalmalıdır.
Kullanıcının mevcut mesajına önce yanıt ver, sonra doğal geçişle bunu yedirmeyi dene.
`;

    console.log(`[continuityEngine] Follow-up triggered: type=${selectedMemory.memory_type}, memoryId=${selectedMemory.id}`);

    return {
      shouldFollowUp: true,
      followUpInstruction,
      triggeredMemoryId: selectedMemory.id,
    };
  } catch (err) {
    console.error('[continuityEngine] buildContinuityFollowUp error:', err.message);
    return empty;
  }
};

/**
 * Builds a proactive continuity-aware greeting for the getGreeting endpoint.
 * Returns null if no follow-up is warranted (caller falls back to standard pool).
 * 
 * @param {number} userId
 * @param {number|null} connectionId
 * @returns {string|null} Turkish greeting string or null
 */
exports.buildContinuityGreeting = async (userId, connectionId) => {
  if (!connectionId) return null;

  try {
    const now = new Date();

    // Fetch the highest-priority unacknowledged memory for greeting
    const result = await db.query(
      `SELECT id, memory_type, summary, emotional_weight, resolved, created_at, last_referenced_at
       FROM couple_memories
       WHERE connection_id = $1
         AND (
           last_referenced_at IS NULL
           OR last_referenced_at < NOW() - INTERVAL '12 hours'
         )
       ORDER BY
         CASE memory_type
           WHEN 'conflict' THEN 1
           WHEN 'reconciliation' THEN 2
           WHEN 'recurring_issue' THEN 3
           WHEN 'relationship_goal' THEN 4
           WHEN 'positive_moment' THEN 5
           ELSE 6
         END,
         emotional_weight DESC,
         created_at DESC
       LIMIT 1`,
      [connectionId]
    );

    if (result.rows.length === 0) return null;

    const memory = result.rows[0];

    // Mark as referenced
    await db.query(
      'UPDATE couple_memories SET last_referenced_at = NOW() WHERE id = $1',
      [memory.id]
    );

    // Build appropriate greeting based on type
    const greetings = {
      conflict: [
        'Son zamanlarda aranızda biraz gergin bir hava hissediliyordu… Şu an nasıl hissediyorsun? 🌿',
        'Geçen konuşmandan sonra ne değişti acaba? Nasılsın? 🤍',
      ],
      reconciliation: [
        'Aranızdaki o sıcaklığın geri döndüğünü hissediyorum. Nasılsın bugün? 🤍',
        'Birbirinize biraz daha yumuşak yaklaştığınızı seziyorum… İyi geliyor mu bu? 🌿',
      ],
      recurring_issue: [
        'Bazı konular zihninizde askıda kalıyor gibi… Bu konuda bugün nasılsın? 🌿',
        'Geçen zamanda konuştuğumuz bazı şeyler hâlâ içinde dönüyor mu? 🤍',
      ],
      relationship_goal: [
        'Birbirinizi daha iyi anlamak için çaba harcıyordunuz… Bu yolculuk nasıl gidiyor? 🌿',
        'Belirledikleriniz doğrultusunda ilerleme var mı? Şu an nasıl hissediyorsun? 🤍',
      ],
      positive_moment: [
        'Son zamanlarda aranızda güzel bir enerji var gibi hissediyorum. 🤍 Nasılsın bugün?',
        'Birbirinize iyi davrandığınız anlar çoğalıyor gibi… Şu an nasılsın? ✨',
      ],
      communication_pattern: [
        'Birbirinizle iletişim şekliniz değişiyor mu? Nasıl hissediyorsun? 🌿',
      ],
      milestone: [
        'İlişkinizde önemli bir dönemden geçiyorsunuz gibi hissediyorum… Şu an nasılsın? 🤍',
      ],
    };

    const pool = greetings[memory.memory_type] || ['Bugün nasıl hissediyorsun? İlişkindeki o enerji devam ediyor mu? 🌿'];
    return pool[Math.floor(Math.random() * pool.length)];
  } catch (err) {
    console.error('[continuityEngine] buildContinuityGreeting error:', err.message);
    return null;
  }
};
