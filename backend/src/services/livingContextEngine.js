const db = require('../config/db');
const { calculateDepthLevel } = require('./emotionalContextBuilder');
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Summarizes the 7 personality dimensions scores into a readable sentence.
 */
function summarizeDimensions(scores) {
  if (!scores) return '';
  const dims = [];
  if (scores.extroversion > 2) dims.push('Dışa dönük ve sosyal');
  else if (scores.extroversion < -2) dims.push('İçe dönük ve sakin');

  if (scores.stability > 2) dims.push('Duygusal olarak dengeli');
  else if (scores.stability < -2) dims.push('Duygusal dalgalanmalara açık');

  if (scores.closeness > 2) dims.push('Sıcak ve yakınlık arayan');
  else if (scores.closeness < -2) dims.push('Bağımsızlığına düşkün');

  return dims.join(', ');
}

/**
 * Builds a comprehensive, real-time structured context for the AI companion.
 *
 * @param {number} userId - ID of the user requesting context
 * @returns {Promise<string>} - Formatted SELFPLACE LIVE CONTEXT string
 */
async function getLivingContext(userId, language = 'tr') {
  try {
    // 1. Fetch User details
    const userRes = await db.query(
      `SELECT u.username, u.zodiac_sign, s.plan_type 
       FROM users u
       LEFT JOIN subscription_status s ON u.id = s.user_id
       WHERE u.id = $1`,
      [userId]
    );
    if (userRes.rows.length === 0) return '';
    const user = userRes.rows[0];
    const planType = user.plan_type || 'free';

    // 2. Fetch User depth level and interactions
    const depthInfo = await calculateDepthLevel(userId);
    const depthLevel = depthInfo.level || 'NEW';

    // 3. Fetch active connection
    const connRes = await db.query(
      `SELECT c.id, c.requester_id, c.recipient_id, c.connection_type, c.created_at,
              c.requester_alias, c.recipient_alias,
              u1.username as req_username, u2.username as rec_username
       FROM relationship_connections c
       JOIN users u1 ON c.requester_id = u1.id
       JOIN users u2 ON c.recipient_id = u2.id
       WHERE (c.requester_id = $1 OR c.recipient_id = $1) AND c.status = 'active'
       LIMIT 1`,
      [userId]
    );

    let hasPartner = false;
    let partnerId = null;
    let connectionId = null;
    let partnerName = '';
    let connectionType = '';
    let connectionAgeDays = 0;
    let connectionDate = '';

    if (connRes.rows.length > 0) {
      hasPartner = true;
      const conn = connRes.rows[0];
      connectionId = conn.id;
      connectionType = conn.connection_type;
      connectionDate = conn.created_at;
      const isRequester = conn.requester_id === userId;
      partnerId = isRequester ? conn.recipient_id : conn.requester_id;
      const partnerAlias = isRequester ? conn.recipient_alias : conn.requester_alias;
      partnerName = partnerAlias || (isRequester ? conn.rec_username : conn.req_username);

      const durationMs = Date.now() - new Date(conn.created_at).getTime();
      connectionAgeDays = Math.max(1, Math.floor(durationMs / (1000 * 60 * 60 * 24)));
    }

    // Define all independent query promises to execute in parallel
    const promises = [
      // 1. User profile details
      db.query(`SELECT traits, communication_style FROM personality_profiles WHERE user_id = $1`, [userId]),
      // 2. Love language & attachment styles
      db.query(`SELECT user_id, memory_key, memory_value FROM emotional_memories WHERE user_id IN ($1, $2) AND memory_key IN ('love_languages', 'attachment_style', 'love_language', 'attachment_styles')`, [userId, partnerId || 0]),
      // 3. Archetypes
      db.query(`SELECT user_id, result_data FROM personality_results WHERE user_id IN ($1, $2) AND test_type = 'journey' ORDER BY created_at DESC`, [userId, partnerId || 0]),
      // 4. Mood history (user check-ins)
      db.query(`SELECT mood, note, created_at FROM check_ins WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5`, [userId]),
      // 5. Journal themes
      db.query(`SELECT memory_value FROM emotional_memories WHERE user_id = $1 AND memory_key = 'recent_journal_themes'`, [userId]),
      // 6. Last weekly insight
      db.query(`SELECT text, generated_at FROM weekly_insights WHERE user_id = $1 ORDER BY generated_at DESC LIMIT 1`, [userId]),
      // 7. Follow-up promises
      db.query(`SELECT memory_value FROM emotional_memories WHERE user_id = $1 AND memory_key = 'pending_follow_ups'`, [userId]),
      // 8. Continuity details
      db.query(`SELECT memory_key, memory_value FROM emotional_memories WHERE user_id = $1 AND category = 'continuity'`, [userId]),
      // 9. Preferences/behavioral memories
      db.query(`SELECT trait_key, trait_value FROM individual_behavioral_memory WHERE user_id = $1`, [userId]),
      
      // Conditional partner/connection queries
      hasPartner ? db.query(`SELECT traits, communication_style FROM personality_profiles WHERE user_id = $1`, [partnerId]) : Promise.resolve(null),
      hasPartner ? db.query(`SELECT event_type, title_tr, description_tr, created_at FROM relationship_timeline WHERE connection_id = $1 ORDER BY created_at ASC`, [connectionId]) : Promise.resolve(null),
      hasPartner ? db.query(`SELECT mood, note, created_at FROM check_ins WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5`, [partnerId]) : Promise.resolve(null),
      hasPartner ? db.query(`SELECT COUNT(*) as count FROM invitation_card_history WHERE user_id IN ($1, $2)`, [userId, partnerId]) : Promise.resolve(null),
      hasPartner ? db.query(`SELECT COUNT(*) as count FROM card_responses WHERE user_id IN ($1, $2)`, [userId, partnerId]) : Promise.resolve(null),
      hasPartner ? db.query(`SELECT memory_type, summary, resolved, emotional_weight FROM couple_memories WHERE connection_id = $1`, [connectionId]) : Promise.resolve(null),
      hasPartner ? db.query(`SELECT emotional_weather, relationship_energy, emotional_aura, connection_state, relationship_rhythm, emotional_closeness FROM relationship_daily_syncs WHERE connection_id = $1 ORDER BY synced_date DESC LIMIT 1`, [connectionId]) : Promise.resolve(null),
      hasPartner ? db.query(`SELECT user_id, exclude_checkins, exclude_journals, exclude_cards, exclude_ai_chat, exclude_personality FROM relationship_privacy_settings WHERE connection_id = $1`, [connectionId]) : Promise.resolve(null),
    ];

    const [
      userProfileRes,
      memoryRes,
      archetypeRes,
      myMoodsRes,
      journalThemesRes,
      weeklyInsightRes,
      followUpsRes,
      continuityRes,
      behavioralRes,
      partnerProfileRes,
      eventsRes,
      partnerMoodsRes,
      acceptedCardsRes,
      responsesRes,
      cmRes,
      weatherRes,
      privacyRes,
    ] = await Promise.all(promises);

    const userProfile = userProfileRes.rows[0] || { traits: {}, communication_style: 'gentle' };

    // Resolve partner privacy settings
    let partnerPrivacy = { exclude_checkins: false, exclude_journals: false, exclude_cards: false, exclude_ai_chat: false, exclude_personality: false };
    if (hasPartner && privacyRes && privacyRes.rows.length > 0) {
      const row = privacyRes.rows.find(r => r.user_id === partnerId);
      if (row) {
        partnerPrivacy = {
          exclude_checkins: !!row.exclude_checkins,
          exclude_journals: !!row.exclude_journals,
          exclude_cards: !!row.exclude_cards,
          exclude_ai_chat: !!row.exclude_ai_chat,
          exclude_personality: !!row.exclude_personality,
        };
      }
    }

    // 5. Partner's profile details
    let partnerProfile = { traits: {}, communication_style: 'gentle' };
    if (hasPartner && partnerProfileRes && partnerProfileRes.rows.length > 0 && !partnerPrivacy.exclude_personality) {
      partnerProfile = partnerProfileRes.rows[0];
    }

    // 6. Fetch Love Language & Attachment Style
    let myLoveLanguage = 'Belirtilmedi';
    let partnerLoveLanguage = partnerPrivacy.exclude_personality ? 'Gizli' : 'Belirtilmedi';
    let myAttachmentStyle = 'Belirtilmedi';
    let partnerAttachmentStyle = partnerPrivacy.exclude_personality ? 'Gizli' : 'Belirtilmedi';

    memoryRes.rows.forEach(r => {
      const key = r.memory_key.toLowerCase();
      if (r.user_id === userId) {
        if (key.includes('love')) myLoveLanguage = r.memory_value;
        if (key.includes('attachment')) myAttachmentStyle = r.memory_value;
      } else if (!partnerPrivacy.exclude_personality) {
        if (key.includes('love')) partnerLoveLanguage = r.memory_value;
        if (key.includes('attachment')) partnerAttachmentStyle = r.memory_value;
      }
    });

    // 7. Fetch Archetypes
    let myArchetype = 'Bilinmiyor';
    let partnerArchetype = partnerPrivacy.exclude_personality ? 'Gizli' : 'Bilinmiyor';
    archetypeRes.rows.forEach(r => {
      const arch = r.result_data?.archetype_name || r.result_data?.baseArchetype;
      if (r.user_id === userId) myArchetype = arch || myArchetype;
      else if (!partnerPrivacy.exclude_personality) partnerArchetype = arch || partnerArchetype;
    });

    // 8. Fetch Timeline Events
    let timelineEvents = (eventsRes && eventsRes.rows) || [];

    // 9. Fetch Mood History
    let myMoods = myMoodsRes.rows;
    let partnerMoods = [];
    if (partnerMoodsRes && partnerMoodsRes.rows && !partnerPrivacy.exclude_checkins) {
      partnerMoods = partnerMoodsRes.rows;
    }

    // 10. Fetch Card Activity
    let invitationCardsStats = 'Seçilen/Tamamlanan davet kartı yok.';
    if (hasPartner && acceptedCardsRes && responsesRes) {
      if (partnerPrivacy.exclude_cards) {
        invitationCardsStats = 'Gizli (Gizlilik Ayarları Nedeniyle)';
      } else {
        invitationCardsStats = `Toplam Seçilen/Yanıtlanan Kart: ${responsesRes.rows[0]?.count || 0}, Tamamlanan Davet Geçmişi: ${acceptedCardsRes.rows[0]?.count || 0}`;
      }
    }

    // 11. Fetch Journal themes
    let journalThemes = 'Bulunmuyor';
    if (journalThemesRes.rows.length > 0) {
      journalThemes = journalThemesRes.rows[0].memory_value;
    }

    // 12. Fetch last Weekly Insight
    let weeklyInsightText = 'Henüz haftalık içgörü oluşmadı.';
    if (weeklyInsightRes.rows.length > 0) {
      weeklyInsightText = weeklyInsightRes.rows[0].text;
    }

    // 13. Fetch Goals, Open loops, and Memories
    let goals = [];
    let openConflicts = [];
    let resolvedConflicts = [];
    let positiveMoments = [];
    let reconciliations = [];

    if (hasPartner && cmRes) {
      cmRes.rows.forEach(r => {
        if (r.memory_type === 'relationship_goal') goals.push(r.summary);
        else if (r.memory_type === 'conflict') {
          if (r.resolved) resolvedConflicts.push(r.summary);
          else openConflicts.push(`${r.summary} (Yoğunluk: ${r.emotional_weight}/5)`);
        } else if (r.memory_type === 'positive_moment') {
          positiveMoments.push(r.summary);
        } else if (r.memory_type === 'reconciliation') {
          reconciliations.push(r.summary);
        }
      });
    }

    // 14. Fetch Health indicators
    let relationshipHealth = 'Sakin / Dengeli';
    if (hasPartner && weatherRes && weatherRes.rows.length > 0) {
      const w = weatherRes.rows[0];
      relationshipHealth = `Hava: ${w.emotional_weather || 'Açık'}, Enerji: ${w.relationship_energy || 'Nötr'}, Aura: ${w.emotional_aura || 'Nötr'}, Durum: ${w.connection_state || 'STABLE'}, Ritim: ${w.relationship_rhythm || 'Uyumlu'}, Yakınlık Skoru: ${w.emotional_closeness || 50}/100`;
    }

    // 15. Fetch Follow-up promises
    let pendingFollowUps = [];
    if (followUpsRes.rows.length > 0) {
      try {
        pendingFollowUps = JSON.parse(followUpsRes.rows[0].memory_value);
      } catch (e) {
        pendingFollowUps = [];
      }
    }

    // 16. Fetch continuity details
    let recentEmotionalTone = 'Sakin';
    let recurringConcerns = 'Yok';
    let comfortingSubjects = 'Yok';
    continuityRes.rows.forEach(r => {
      if (r.memory_key === 'recent_emotional_tone') recentEmotionalTone = r.memory_value;
      if (r.memory_key === 'recurring_concerns') recurringConcerns = r.memory_value;
      if (r.memory_key === 'comforting_subjects') comfortingSubjects = r.memory_value;
    });

    // 17. Fetch known preferences/behavioral memories
    let behavioralDossier = 'Yok';
    if (behavioralRes.rows.length > 0) {
      behavioralDossier = behavioralRes.rows.map(r => `${r.trait_key}: ${r.trait_value}`).join(', ');
    }

    // Format timeline text
    const timelineText = timelineEvents.length > 0
      ? timelineEvents.map(e => `- [${new Date(e.created_at).toLocaleDateString('tr-TR')}] ${e.title_tr}: ${e.description_tr || ''}`).join('\n')
      : '- İlk bağlantı dışında henüz önemli bir olay kaydedilmedi.';

    if (language === 'en') {
      const enTimelineText = timelineEvents.length > 0
        ? timelineEvents.map(e => `- [${new Date(e.created_at).toLocaleDateString('en-US')}] ${e.title_tr}: ${e.description_tr || ''}`).join('\n')
        : '- Aside from the initial connection, no significant events have occurred yet.';

      return `
========================================
SELFPLACE LIVE CONTEXT (REAL-TIME SYSTEM STATE)
========================================

[User Information]
- Username: ${user.username}
- Zodiac Sign: ${user.zodiac_sign || 'Not specified'}
- Subscription Plan: ${planType.toUpperCase()}
- App Depth Level: ${depthLevel} (Total Interactions)
- DISC Personality Archetype: ${myArchetype}
- Love Language: ${myLoveLanguage}
- Attachment Style: ${myAttachmentStyle}
- Communication Style: ${userProfile.communication_style || 'gentle'}
- Known Behavioral Patterns: ${behavioralDossier}

[Partner & Relationship Status]
- Partner Name: ${hasPartner ? partnerName : 'No Connection'}
- Relationship Type: ${connectionType || 'No Connection'}
- Connection Date: ${connectionDate ? new Date(connectionDate).toLocaleDateString('en-US') : 'No Connection'}
- Relationship Age (Days): ${connectionAgeDays} days
- Partner DISC Archetype: ${hasPartner ? partnerArchetype : 'Unknown'}
- Partner Love Language: ${hasPartner ? partnerLoveLanguage : 'Not specified'}
- Partner Attachment Style: ${hasPartner ? partnerAttachmentStyle : 'Not specified'}
- Partner Communication Style: ${hasPartner ? partnerProfile.communication_style : 'gentle'}

[Relationship Health Indicators & Atmosphere]
- ${relationshipHealth}

[Recent Emotions (Last 5 Days)]
- User: ${myMoods.length > 0 ? (myMoods.map(m => `${new Date(m.created_at).toLocaleDateString('en-US')}: ${m.mood}${m.note ? ` ("${m.note}")` : ''}`).join(' | ')) : 'No emotion records'}
- Partner: ${hasPartner && partnerMoods.length > 0 ? (partnerMoods.map(m => `${new Date(m.created_at).toLocaleDateString('en-US')}: ${m.mood}${m.note ? ` ("${m.note}")` : ''}`).join(' | ')) : 'No emotion records'}

[Interactive Invitation Card Activity]
- ${invitationCardsStats}

[Journaling & Themes]
- Journal Themes: ${journalThemes}

[Relationship Goals]
${goals.length > 0 ? goals.map(g => `- ${g}`).join('\n') : '- No shared goals set yet.'}

[Emotional Open Loops & Conflicts (Resolved & Unresolved)]
- Unresolved Tensions: ${openConflicts.length > 0 ? openConflicts.join(', ') : 'None'}
- Resolved Past Issues: ${resolvedConflicts.length > 0 ? resolvedConflicts.join(', ') : 'None'}
- Recent Reconciliations: ${reconciliations.length > 0 ? reconciliations.join(', ') : 'None'}
- Shared Positive Moments: ${positiveMoments.length > 0 ? positiveMoments.join(', ') : 'None'}

[Weekly Analysis & Insights]
- Latest Report Summary: ${weeklyInsightText}

[Mandatory AI Follow-ups & Pending Promises]
${pendingFollowUps.length > 0 ? pendingFollowUps.map(f => `- [${f.status === 'pending' ? 'PENDING PROMISE' : 'COMPLETED'}] ${f.promise} (Created: ${new Date(f.created_at).toLocaleDateString('en-US')})`).join('\n') : '- No pending AI follow-ups or promises.'}

[Emotional Continuity (Memory)]
- Current Emotional Tone: ${recentEmotionalTone}
- Recurring Personal Concerns: ${recurringConcerns}
- Comforting Subjects & Activities: ${comfortingSubjects}

[CHRONOLOGICAL RELATIONSHIP TIMELINE]
${enTimelineText}
========================================
`;
    }

    // Construct the structured prompt context dossier (Turkish)
    let contextStr = `
========================================
SELFPLACE LIVE CONTEXT (GERÇEK ZAMANLI SİTEM DURUMU)
========================================

[Kullanıcı Bilgileri]
- Kullanıcı Adı: ${user.username}
- Burç: ${user.zodiac_sign || 'Belirtilmedi'}
- Üyelik Planı: ${planType.toUpperCase()}
- Uygulama Derinlik Seviyesi: ${depthLevel} (Toplam Etkileşim)
- DISC Kişilik Arketipi: ${myArchetype}
- Aşk Dili: ${myLoveLanguage}
- Bağlanma Stili: ${myAttachmentStyle}
- İletişim Tarzı: ${userProfile.communication_style || 'gentle'}
- Bilinen Davranış Kalıpları: ${behavioralDossier}

[Partner & İlişki Durumu]
- Partner Adı: ${hasPartner ? partnerName : 'Bağlantı Yok'}
- İlişki Türü: ${connectionType || 'Bağlantı Yok'}
- Bağlantı Tarihi: ${connectionDate ? new Date(connectionDate).toLocaleDateString('tr-TR') : 'Bağlantı Yok'}
- İlişki Yaşı (Gün): ${connectionAgeDays} gün
- Partner DISC Arketipi: ${hasPartner ? partnerArchetype : 'Bilinmiyor'}
- Partner Aşk Dili: ${hasPartner ? partnerLoveLanguage : 'Belirtilmedi'}
- Partner Bağlanma Stili: ${hasPartner ? partnerAttachmentStyle : 'Belirtilmedi'}
- Partner İletişim Tarzı: ${hasPartner ? partnerProfile.communication_style : 'gentle'}

[İlişki Sağlık Göstergeleri & Hava Durumu]
- ${relationshipHealth}

[Duygu Paylaşım Geçmişi (Son 5 Gün)]
- Kullanıcı: ${myMoods.length > 0 ? (myMoods.map(m => `${new Date(m.created_at).toLocaleDateString('tr-TR')}: ${m.mood}${m.note ? ` ("${m.note}")` : ''}`).join(' | ')) : 'Duygu bilgisi yok'}
- Partner: ${hasPartner && partnerMoods.length > 0 ? (partnerMoods.map(m => `${new Date(m.created_at).toLocaleDateString('tr-TR')}: ${m.mood}${m.note ? ` ("${m.note}")` : ''}`).join(' | ')) : 'Duygu bilgisi yok'}

[İnteraktif Davet Kartı Aktivitesi]
- ${invitationCardsStats}

[Günlük Yazma ve Temalar]
- Günlük Temaları: ${journalThemes}

[İlişki Hedefleri]
${goals.length > 0 ? goals.map(g => `- ${g}`).join('\n') : '- Belirlenmiş ortak hedef yok.'}

[Duygusal Açık Döngüler & Çatışmalar (Açık ve Çözülmüş Sorunlar)]
- Çözülmemiş Gerilimler: ${openConflicts.length > 0 ? openConflicts.join(', ') : 'Yok'}
- Geçmişte Çözülmüş Sorunlar: ${resolvedConflicts.length > 0 ? resolvedConflicts.join(', ') : 'Yok'}
- Son Uzlaşmalar/Yumuşamalar: ${reconciliations.length > 0 ? reconciliations.join(', ') : 'Yok'}
- Paylaşılan Pozitif Anlar: ${positiveMoments.length > 0 ? positiveMoments.join(', ') : 'Yok'}

[Haftalık Analiz & İçgörüler]
- Son Rapor Özeti: ${weeklyInsightText}

[Zorunlu AI Takip Konuları & Bekleyen Sözler]
${pendingFollowUps.length > 0 ? pendingFollowUps.map(f => `- [${f.status === 'pending' ? 'BEKLEYEN SÖZ' : 'TAMAMLANDI'}] ${f.promise} (Oluşturulma: ${new Date(f.created_at).toLocaleDateString('tr-TR')})`).join('\n') : '- Bekleyen bir AI takibi veya sözü yok.'}

[Duygusal Süreklilik (Hafıza)]
- Mevcut Duygusal Ton: ${recentEmotionalTone}
- Tekrarlayan Bireysel Kaygılar: ${recurringConcerns}
- Rahatlatıcı Konular & Aktiviteler: ${comfortingSubjects}

[KRONOLOJİK İLİŞKİ ZAMAN ÇİZGESİ (Chronological Event Timeline)]
${timelineText}
========================================
`;
    return contextStr;
  } catch (err) {
    console.error('[LivingContextEngine] Error building context:', err.message);
    return '';
  }
}

/**
 * Updates, creates, and completes follow-ups and promises between AI and User.
 */
async function updateFollowUpsAndPromises(userId, currentMessage, aiResponse) {
  try {
    // 1. Fetch current follow-ups
    const existingRes = await db.query(
      `SELECT memory_value FROM emotional_memories WHERE user_id = $1 AND memory_key = 'pending_follow_ups'`,
      [userId]
    );

    let list = [];
    if (existingRes.rows.length > 0) {
      try {
        list = JSON.parse(existingRes.rows[0].memory_value);
      } catch (e) {
        list = [];
      }
    }

    const pendingList = list.filter(item => item.status === 'pending');
    if (pendingList.length === 0 && (!aiResponse || aiResponse.trim() === '')) return;

    // 2. Query OpenAI to extract resolutions and new promises
    const prompt = `Kullanıcı Mesajı: "${currentMessage}"
AI Yanıtı: "${aiResponse || ''}"
Mevcut Bekleyen AI Sözleri (Takip Konuları): ${JSON.stringify(pendingList)}

Görevin:
1. Kullanıcı mesajında, AI yanıtında veya konuşmada "Mevcut Bekleyen AI Sözleri" listesindeki konulardan herhangi birinin konuşulup konuşulmadığını, cevaplanıp cevaplanmadığını ya da ele alınıp alınmadığını tespit et.
Örneğin: Eğer bekleyen söz "toplantının nasıl geçtiğini sormak" ise ve kullanıcı "Toplantı harika geçti!" diyorsa veya AI "Toplantı nasıl geçti?" diye sormuşsa, bu söz ele alınmış/çözülmüş demektir. Bu durumda o sözün "id" değerini "resolvedIds" dizisine ekle.
2. AI'ın yeni yanıtında ("${aiResponse || ''}") geleceğe dair yeni bir takip sözü veya soru sorma taahhüdü verip vermediğini tespit et. Varsa, bunu "newPromise" alanına kısa ve net bir Türkçe cümle olarak yaz. (Örn: "Yarın modunu sormak", "Hafta sonu planını sormak").

Döneceğin JSON formatı:
{
  "resolvedIds": ["id1", "id2"],
  "newPromise": "..." (yeni taahhüt yoksa null veya "")
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const result = JSON.parse(completion.choices[0].message.content);
    let changed = false;

    // Resolve completed follow-ups
    if (Array.isArray(result.resolvedIds) && result.resolvedIds.length > 0) {
      list = list.map(item => {
        if (result.resolvedIds.includes(item.id)) {
          changed = true;
          return { ...item, status: 'completed', completed_at: new Date().toISOString() };
        }
        return item;
      });
    }

    // Add new follow-ups
    if (result.newPromise && result.newPromise.trim() !== '') {
      list.push({
        id: Date.now().toString(),
        promise: result.newPromise.trim(),
        created_at: new Date().toISOString(),
        status: 'pending'
      });
      changed = true;
    }

    // Keep last 15 items to avoid database bloat
    if (list.length > 15) {
      list = list.slice(-15);
    }

    if (changed) {
      await db.query(
        `INSERT INTO emotional_memories (user_id, memory_key, memory_value, category)
         VALUES ($1, 'pending_follow_ups', $2, 'continuity')
         ON CONFLICT (user_id, memory_key) 
         DO UPDATE SET memory_value = EXCLUDED.memory_value, updated_at = NOW()`,
        [userId, JSON.stringify(list)]
      );
    }
  } catch (error) {
    console.error('[LivingContextEngine] Error updating follow ups:', error.message);
  }
}

module.exports = {
  getLivingContext,
  updateFollowUpsAndPromises,
};
