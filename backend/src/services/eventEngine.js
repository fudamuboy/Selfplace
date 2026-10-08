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

    // 2. Resolve Turkish and English event descriptions
    const customTitleEn = metadata?.customTitleEn || metadata?.titleEn || null;
    const customDescriptionEn = metadata?.customDescriptionEn || metadata?.descriptionEn || null;
    let titleTr = customTitle;
    let descriptionTr = customDescription;
    let titleEn = customTitleEn;
    let descriptionEn = customDescriptionEn;

    if (!titleTr || !descriptionTr || !titleEn || !descriptionEn) {
      const userRes = await db.query('SELECT username FROM users WHERE id = $1', [userId]);
      const username = userRes.rows[0]?.username || 'Kullanıcı';

      const isRequester = conn.requester_id === userId;
      const partnerAlias = isRequester ? conn.recipient_alias : conn.requester_alias;
      const partnerName = partnerAlias || (isRequester ? conn.rec_username : conn.req_username) || 'Ortağınız';

      switch (eventType) {
        case 'CONNECTION_CREATED':
          titleTr = titleTr || 'İlişki Bağlantısı Kuruldu 🌿';
          descriptionTr = descriptionTr || `${username} ve ${partnerName} Selfplace üzerinde bir araya geldi.`;
          titleEn = titleEn || 'First Connection Established 🌿';
          descriptionEn = descriptionEn || `${username} and ${partnerName} connected on Selfplace.`;
          break;
        case 'CHECKIN_COMPLETED':
          titleTr = titleTr || 'Duygu Paylaşımı Yapıldı 💭';
          descriptionTr = descriptionTr || `${username} günlük duygu durumunu paylaştı.`;
          titleEn = titleEn || 'Emotion Shared 💭';
          descriptionEn = descriptionEn || `${username} shared their daily emotional check-in.`;
          break;
        case 'PERSONALITY_COMPLETED':
          titleTr = titleTr || 'Kişilik Testi Tamamlandı 🧩';
          descriptionTr = descriptionTr || `${username} içsel kimlik arketipi testini tamamladı.`;
          titleEn = titleEn || 'Personality Test Completed 🧩';
          descriptionEn = descriptionEn || `${username} completed the inner identity archetype test.`;
          break;
        case 'JOURNAL_SHARED':
          titleTr = titleTr || 'Günlük Paylaşıldı 📖';
          descriptionTr = descriptionTr || `${username} hislerini günlüğe yazarak paylaştı.`;
          titleEn = titleEn || 'Journal Shared 📖';
          descriptionEn = descriptionEn || `${username} shared their feelings in a journal entry.`;
          break;
        case 'INVITATION_ACCEPTED':
          titleTr = titleTr || 'Davet Kartı Kabul Edildi 💌';
          descriptionTr = descriptionTr || `${username} dünkü davet kartı sorusunu yanıtlayarak tamamladı.`;
          titleEn = titleEn || 'Invitation Card Accepted 💌';
          descriptionEn = descriptionEn || `${username} answered and completed the invitation card.`;
          break;
        case 'WEEKLY_INSIGHT_GENERATED':
          titleTr = titleTr || 'Haftalık İçgörü Raporu Hazır ✨';
          descriptionTr = descriptionTr || `İlişkiniz için bu haftanın duygusal analiz sentezi oluşturuldu.`;
          titleEn = titleEn || 'Weekly Insight Ready ✨';
          descriptionEn = descriptionEn || `This week's emotional synthesis for your relationship has been generated.`;
          break;
        case 'GOAL_COMPLETED':
          titleTr = titleTr || 'Ortak Hedef Tamamlandı 🎉';
          descriptionTr = descriptionTr || `Belirlediğiniz bir ortak hedef başarıyla tamamlandı.`;
          titleEn = titleEn || 'Shared Goal Completed 🎉';
          descriptionEn = descriptionEn || `A shared goal has been successfully completed.`;
          break;
        case 'MOOD_IMPROVED':
          titleTr = titleTr || 'Hava Durumu İyileşiyor ☀️';
          descriptionTr = descriptionTr || `İlişki atmosferindeki enerji ve yakınlık düzeyi yükseliyor.`;
          titleEn = titleEn || 'Atmosphere Clearing ☀️';
          descriptionEn = descriptionEn || `The energy and closeness in the relationship atmosphere are rising.`;
          break;
        case 'MOOD_DECLINED':
          titleTr = titleTr || 'Hava Değişimi ☁️';
          descriptionTr = descriptionTr || `İlişki atmosferinde küçük bir durağanlık veya stres dalgası hissediliyor.`;
          titleEn = titleEn || 'Atmosphere Shifting ☁️';
          descriptionEn = descriptionEn || `A brief quiet or wave of tension is felt in the relationship atmosphere.`;
          break;
        case 'weather_change':
          titleTr = titleTr || 'Duygusal Hava Değişti 🌤️';
          descriptionTr = descriptionTr || (metadata.weather ? `İlişki atmosferiniz bugün "${metadata.weather}" durumuna evrildi.` : 'İlişki atmosferiniz bugün yeni bir duruma evrildi.');
          titleEn = titleEn || 'Emotional Weather Changed 🌤️';
          descriptionEn = descriptionEn || (metadata.weatherEn || metadata.weather ? `Your relational atmosphere evolved to "${metadata.weatherEn || metadata.weather}" today.` : 'Your relational atmosphere evolved to a new state today.');
          break;
        case 'ritual_done':
          titleTr = titleTr || 'Ortak Ritüel Tamamlandı ✨';
          descriptionTr = descriptionTr || 'Günün duygusal yansımasını iki taraf da tamamlayarak empati bağını pekiştirdi.';
          titleEn = titleEn || 'Shared Ritual Completed ✨';
          descriptionEn = descriptionEn || 'Both partners completed today\'s emotional reflection, strengthening your bond.';
          break;
        default:
          titleTr = titleTr || eventType;
          descriptionTr = descriptionTr || metadata.description || 'Yeni bir uygulama içi aktivite tamamlandı.';
          titleEn = titleEn || customTitleEn || customTitle || eventType;
          descriptionEn = descriptionEn || customDescriptionEn || customDescription || metadata.description_en || metadata.description || 'A new in-app activity was completed.';
      }
    }

    // 3. Insert event into relationship_timeline with bilingual titles and descriptions
    await db.query(
      `INSERT INTO relationship_timeline (connection_id, event_type, title_tr, description_tr, title_en, description_en, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [connectionId, eventType, titleTr, descriptionTr, titleEn, descriptionEn]
    );
  } catch (err) {
    console.error('[EventEngine] Error tracking event:', err.message);
  }
}

module.exports = {
  trackEvent,
};
