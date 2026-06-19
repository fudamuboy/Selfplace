const db = require('../config/db');

/**
 * Strategy Overview for Active Relationship Event Engine:
 * 1. Triggering Events: connection created, weather change, ritual completion, milestones.
 * 2. Duplicate Prevention: `acknowledged_user_ids` ensures each user only hears the trigger once.
 * 3. Eligible Duration: Events from the last 3 days (`NOW() - INTERVAL '3 days'`).
 * 4. Partner Visibility: Each user independently gets notified based on their own chat activity.
 * 5. Privacy: Follows standard connection rules. Private data is not exposed in the trigger.
 * 6. Priority: `ORDER BY created_at DESC LIMIT 1` (Only the most recent event triggers to prevent flooding).
 */

exports.buildEventTrigger = async (userId, connectionId) => {
  try {
    // Fetch the most recent unacknowledged event from the last 3 days
    const eventRes = await db.query(
      `SELECT id, event_type, title_tr, description_tr 
       FROM relationship_timeline 
       WHERE connection_id = $1 
         AND created_at >= NOW() - INTERVAL '3 days'
         AND NOT ($2 = ANY(acknowledged_user_ids))
       ORDER BY created_at DESC LIMIT 1`,
      [connectionId, userId]
    );

    if (eventRes.rows.length === 0) {
      return { hasEvent: false, triggerInstruction: '' };
    }

    const event = eventRes.rows[0];

    // Mark as acknowledged for this specific user
    await db.query(
      `UPDATE relationship_timeline 
       SET acknowledged_user_ids = array_append(acknowledged_user_ids, $1) 
       WHERE id = $2`,
      [userId, event.id]
    );

    // Build the AI instruction block based on event type
    let instructionText = '';
    
    switch (event.event_type) {
      case 'created':
        instructionText = 'Partnerinle Selfplace üzerindeki bağlantın yeni kuruldu. Bu çok güzel bir adım! Bu sohbete başlarken bu ortak yolculuğun başlangıcını sıcak ve samimi bir dille kutla.';
        break;
      case 'weather_change':
        instructionText = `İlişkinizin duygusal havası yakın zamanda "${event.description_tr}" olarak değişti. Bunu doğal bir şekilde fark et ve nasıl hissettiklerini sor.`;
        break;
      case 'ritual_done':
        instructionText = 'Partnerinle birlikte ortak bir ritüeli yeni tamamladınız. İkinizin de duygusal bağınıza zaman ayırmasını takdir et ve bu çabanın güzelliğinden bahset.';
        break;
      case 'garden_level_up':
      case 'level_up':
        instructionText = 'İlişki bahçenizde yeni bir seviyeye ulaştınız! Bu büyümeyi ve ortak emeğinizi kutla.';
        break;
      default:
        instructionText = `Yeni bir dönüm noktası: ${event.title_tr}. ${event.description_tr}. Bunu sohbette doğal bir şekilde kutla veya değin.`;
    }

    const triggerInstruction = `
━━━━━━━━━━━━━━━━━━━
✨ AKTİF İLİŞKİ OLAYI ✨
━━━━━━━━━━━━━━━━━━━
Sistem Bildirimi: ${instructionText}

KURAL: Bu bildirimi konuşmanın başlangıcına doğal bir şekilde entegre et. Robotik bir rapor gibi değil, içten bir yoldaş gibi söyle.
`;

    return { hasEvent: true, triggerInstruction };

  } catch (err) {
    console.error('[relationshipEventEngine] Error building event trigger:', err.message);
    return { hasEvent: false, triggerInstruction: '' };
  }
};
