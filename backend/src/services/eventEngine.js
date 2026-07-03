const db = require('../config/db');

/**
 * Event Engine
 * Registers in-app actions as timeline events to update relationship context and keep the AI updated.
 *
 * Priorities:
 * - Critical: connection removed (cannot be persisted on timeline due to connection delete cascade, handled at connection level)
 * - Major: connection created, weekly insight generated, compatibility completed
 * - Minor: check-in completed, journal entry shared, invitation accepted, goal completed
 * - Silent: slight mood fluctuations (not persisted to timeline to keep it clean)
 */
async function trackEvent(userId, eventType, priority = 'minor', metadata = {}, customTitle = null, customDescription = null, overrideConnectionId = null) {
  try {
    // 1. Find the relationship connection for this user.
    //    If overrideConnectionId is supplied (e.g. called right after activation), use it directly
    //    instead of the active-connection lookup so there is no timing race.
    let conn;
    let connectionId = overrideConnectionId;

    if (connectionId) {
      const connRes = await db.query(
        `SELECT id, requester_id, recipient_id, requester_alias, recipient_alias 
         FROM relationship_connections WHERE id = $1`,
        [connectionId]
      );
      if (connRes.rows.length === 0) {
        return;
      }
      conn = connRes.rows[0];
    } else {
      const connRes = await db.query(
        `SELECT id, requester_id, recipient_id, requester_alias, recipient_alias 
         FROM relationship_connections 
         WHERE (requester_id = $1 OR recipient_id = $1) AND status = 'active'
         LIMIT 1`,
        [userId]
      );
      if (connRes.rows.length === 0) {
        return;
      }
      conn = connRes.rows[0];
      connectionId = conn.id;
    }

    // 2. Resolve Turkish event descriptions
    let titleTr = customTitle;
    let descriptionTr = customDescription;

    if (!titleTr || !descriptionTr) {
      const userRes = await db.query('SELECT username FROM users WHERE id = $1', [userId]);
      const username = userRes.rows[0]?.username || 'Kullanıcı';

      const isRequester = conn.requester_id === userId;
      const partnerAlias = isRequester ? conn.recipient_alias : conn.requester_alias;
      const partnerName = partnerAlias || (isRequester ? conn.rec_username : conn.req_username) || 'Ortağınız';

      switch (eventType) {
        case 'CONNECTION_CREATED':
          titleTr = 'İlişki Bağlantısı Kuruldu 🌿';
          descriptionTr = `${username} ve ${partnerName} Selfplace üzerinde bir araya geldi.`;
          break;
        case 'CHECKIN_COMPLETED':
          titleTr = 'Duygu Paylaşımı Yapıldı 💭';
          descriptionTr = `${username} günlük duygu durumunu paylaştı.`;
          break;
        case 'PERSONALITY_COMPLETED':
          titleTr = 'Kişilik Testi Tamamlandı 🧩';
          descriptionTr = `${username} içsel kimlik arketipi testini tamamladı.`;
          break;
        case 'JOURNAL_SHARED':
          titleTr = 'Günlük Paylaşıldı 📖';
          descriptionTr = `${username} hislerini günlüğe yazarak paylaştı.`;
          break;
        case 'INVITATION_ACCEPTED':
          titleTr = 'Davet Kartı Kabul Edildi 💌';
          descriptionTr = `${username} dünkü davet kartı sorusunu yanıtlayarak tamamladı.`;
          break;
        case 'WEEKLY_INSIGHT_GENERATED':
          titleTr = 'Haftalık İçgörü Raporu Hazır ✨';
          descriptionTr = `İlişkiniz için bu haftanın duygusal analiz sentezi oluşturuldu.`;
          break;
        case 'GOAL_COMPLETED':
          titleTr = 'Ortak Hedef Tamamlandı 🎉';
          descriptionTr = `Belirlediğiniz bir ortak hedef başarıyla tamamlandı.`;
          break;
        case 'MOOD_IMPROVED':
          titleTr = 'Hava Durumu İyileşiyor☀️';
          descriptionTr = `İlişki atmosferindeki enerji ve yakınlık düzeyi yükseliyor.`;
          break;
        case 'MOOD_DECLINED':
          titleTr = 'Hava Değişimi ☁️';
          descriptionTr = `İlişki atmosferinde küçük bir durağanlık veya stres dalgası hissediliyor.`;
          break;
        default:
          titleTr = eventType;
          descriptionTr = metadata.description || 'Yeni bir uygulama içi aktivite tamamlandı.';
      }
    }

    // 3. Insert event into relationship_timeline
    await db.query(
      `INSERT INTO relationship_timeline (connection_id, event_type, title_tr, description_tr, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [connectionId, eventType, titleTr, descriptionTr]
    );
  } catch (err) {
    console.error('[EventEngine] Error tracking event:', err.message);
  }
}

module.exports = {
  trackEvent,
};
