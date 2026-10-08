const db = require('../config/db');
const emotionalController = require('./emotionalController');
const { extractCardThemes } = require('../services/cardIntelligenceService');
const { getLanguage } = require('../utils/languageResolver');

const CARD_EN_MAP = {
  'Küçük Bir Nezaket': { title: 'Gentle Kindness', content: 'Do a small, gentle thing for yourself today.', category: 'Self-Compassion' },
  'İç Sesin': { title: 'Your Inner Voice', content: 'Try speaking a bit more softly with your inner voice.', category: 'Self-Compassion' },
  'Sessizlik Anı': { title: 'Moment of Silence', content: 'Open up a quiet 20-minute space for yourself today.', category: 'Make Space' },
  'Küçük Bir Seçim': { title: 'A Small Choice', content: 'Make a small choice without putting yourself second.', category: 'Make Space' },
  'Nazik Bir Başlangıç': { title: 'A Gentle Start', content: 'Begin gently today with something you have postponed.', category: 'Small Courage' },
  'Sessiz İfade': { title: 'Quiet Expression', content: 'Try calmly expressing a thought you usually keep inside.', category: 'Small Courage' },
  'Çocukluk Anısı': { title: 'Childhood Memory', content: 'Recall something you loved as a child, even if small.', category: 'Lightness' },
  'Amaçsız Yürüyüş': { title: 'Aimless Walk', content: 'Try taking a short, aimless walk.', category: 'Lightness' },
  'Tetikleyici': { title: 'The Trigger', content: 'What might be triggering you today?', category: 'Deepen' },
  'Zihin Akışı': { title: 'Mind Flow', content: 'Is there something you have been overthinking lately?', category: 'Deepen' },
  'Dinlenme Hakkı': { title: 'Permission to Rest', content: 'Try viewing rest as something you truly deserve today.', category: 'Rest' },
  'Kısa Bir Mola': { title: 'A Short Pause', content: 'Give yourself permission to take a brief pause.', category: 'Rest' },
};

function localizeCard(card, lang = 'tr') {
  if (!card || lang !== 'en') return card;
  const mapped = CARD_EN_MAP[card.title];
  if (mapped) {
    return {
      ...card,
      title: mapped.title,
      content: mapped.content,
      category: mapped.category
    };
  }
  return card;
}

exports.getAllCards = async (req, res) => {
  const lang = getLanguage(req);
  try {
    const result = await db.query('SELECT id, title, content, category FROM invitation_cards');
    res.json(result.rows.map(c => localizeCard(c, lang)));
  } catch (err) {
    res.status(500).json({ message: lang === 'en' ? 'Could not load cards.' : 'Kartlar getirilemedi.' });
  }
};

exports.getRandomCard = async (req, res) => {
  const userId = req.user.id;
  const lang = getLanguage(req);

  try {
    const [cardsRes, prefRes] = await Promise.all([
      db.query('SELECT id, title, content, category FROM invitation_cards'),
      db.query(
        `SELECT category, 
                SUM(CASE WHEN response = 'Deneyeceğim' THEN 2 WHEN response = 'Bana göre değil' THEN -1 ELSE 0 END) as score
         FROM card_responses
         WHERE user_id = $1
         GROUP BY category`,
        [userId]
      )
    ]);

    const allCards = cardsRes.rows;
    const preferences = prefRes.rows.reduce((acc, curr) => {
      acc[curr.category] = parseInt(curr.score);
      return acc;
    }, {});

    if (allCards.length === 0) {
      return res.status(404).json({ message: lang === 'en' ? 'Card not found.' : 'Kart bulunamadı.' });
    }

    const weightedCards = allCards.map(card => {
      const score = preferences[card.category] || 0;
      const weight = Math.max(1, 10 + score);
      return { ...card, weight };
    });

    const totalWeight = weightedCards.reduce((sum, card) => sum + card.weight, 0);
    let random = Math.random() * totalWeight;
    
    let selectedCard = weightedCards[0];
    for (const card of weightedCards) {
      if (random < card.weight) {
        selectedCard = card;
        break;
      }
      random -= card.weight;
    }

    res.json(localizeCard(selectedCard, lang));
  } catch (err) {
    res.status(500).json({ message: lang === 'en' ? 'Could not load card.' : 'Kart getirilemedi.' });
  }
};

exports.getInteractiveCards = async (req, res) => {
  const userId = req.user.id;
  const { localDate } = req.query;
  const lang = getLanguage(req);
  
  try {
    const dateToCompare = localDate || new Date().toISOString().split('T')[0];
    
    const todaySelection = await db.query(
      `SELECT cr.card_id, ic.title, ic.content, ic.category as card_category 
       FROM card_responses cr
       JOIN invitation_cards ic ON cr.card_id = ic.id
       WHERE cr.user_id = $1 
         AND cr.response = 'Seçildi' 
         AND cr.local_date::date = $2::date`,
      [userId, dateToCompare]
    );

    if (todaySelection.rows.length > 0) {
      const sel = todaySelection.rows[0];
      const localized = localizeCard({
        id: sel.card_id,
        title: sel.title,
        content: sel.content,
        category: sel.card_category
      }, lang);

      return res.json({
        alreadySelected: true,
        cards: [localized]
      });
    }

    const dailySetRes = await db.query(
      `SELECT ds.card_id as id, ic.title, ic.content, ic.category 
       FROM daily_card_sets ds
       JOIN invitation_cards ic ON ds.card_id = ic.id
       WHERE ds.user_id = $1 AND ds.daily_card_date = $2::date
       ORDER BY ds.daily_card_slot ASC`,
      [userId, dateToCompare]
    );

    if (dailySetRes.rows.length === 3) {
      return res.json({
        alreadySelected: false,
        cards: dailySetRes.rows.map(c => localizeCard(c, lang))
      });
    }

    const [cardsRes, prefRes, historyRes] = await Promise.all([
      db.query('SELECT id, title, content, category FROM invitation_cards'),
      db.query(
        `SELECT category, 
                SUM(CASE WHEN response = 'Deneyeceğim' THEN 2 WHEN response = 'Bana göre değil' THEN -1 ELSE 0 END) as score
         FROM card_responses
         WHERE user_id = $1
         GROUP BY category`,
        [userId]
      ),
      db.query('SELECT card_id, completed_at FROM invitation_card_history WHERE user_id = $1 ORDER BY completed_at DESC', [userId])
    ]);

    const allCards = cardsRes.rows;
    if (allCards.length < 3) {
      return res.status(404).json({ message: lang === 'en' ? 'Not enough cards.' : 'Yeterli kart bulunamadı.' });
    }

    const preferences = prefRes.rows.reduce((acc, curr) => {
      acc[curr.category] = parseInt(curr.score);
      return acc;
    }, {});

    const history = historyRes.rows;
    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    let availableCards = allCards.filter(card => {
      const record = history.find(h => h.card_id === card.id);
      if (record && new Date(record.completed_at) > fourteenDaysAgo) {
        return false;
      }
      return true;
    });

    if (availableCards.length < 3) {
      const last5Ids = history.slice(0, 5).map(h => h.card_id);
      availableCards = allCards.filter(card => {
        if (last5Ids.includes(card.id)) {
          return false;
        }
        return true;
      });
    }

    if (availableCards.length < 3) {
      availableCards = [...allCards];
    }

    const weightedCards = availableCards.map(card => {
      const score = preferences[card.category] || 0;
      const weight = Math.max(1, 10 + score);
      return { ...card, weight };
    });

    const selectedCards = [];
    const pool = [...weightedCards];

    for (let i = 0; i < 3; i++) {
      if (pool.length === 0) break;
      const totalWeight = pool.reduce((sum, card) => sum + card.weight, 0);
      let random = Math.random() * totalWeight;
      
      let selectedIdx = 0;
      for (let j = 0; j < pool.length; j++) {
        if (random < pool[j].weight) {
          selectedIdx = j;
          break;
        }
        random -= pool[j].weight;
      }
      
      selectedCards.push(pool[selectedIdx]);
      pool.splice(selectedIdx, 1);
    }

    for (let i = 0; i < selectedCards.length; i++) {
      await db.query(
        `INSERT INTO daily_card_sets (user_id, card_id, daily_card_date, daily_card_slot)
         VALUES ($1, $2, $3::date, $4)
         ON CONFLICT (user_id, daily_card_date, daily_card_slot) 
         DO UPDATE SET card_id = EXCLUDED.card_id, created_at = CURRENT_TIMESTAMP`,
        [userId, selectedCards[i].id, dateToCompare, i + 1]
      );
    }

    res.json({
      alreadySelected: false,
      cards: selectedCards.map(c => localizeCard(c, lang))
    });
  } catch (err) {
    console.error('[CARD-SYSTEM] Error getting interactive cards:', err.message);
    res.status(500).json({ message: lang === 'en' ? 'Could not load cards.' : 'Kartlar getirilemedi.' });
  }
};

exports.selectInteractiveCard = async (req, res) => {
  const { cardId, localDate } = req.body;
  const userId = req.user.id;
  const dateToSave = localDate || new Date().toISOString().split('T')[0];
  const lang = getLanguage(req);
  const isEn = lang === 'en';

  try {
    const existing = await db.query(
      "SELECT id FROM card_responses WHERE user_id = $1 AND response = 'Seçildi' AND local_date::date = $2::date",
      [userId, dateToSave]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ message: isEn ? 'You have already selected a card today.' : 'Bugün zaten bir kart seçtin.' });
    }

    const [insertRes, cardInfo] = await Promise.all([
      db.query(
        'INSERT INTO card_responses (user_id, card_id, response, category, local_date) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [userId, cardId, 'Seçildi', 'Interactive', dateToSave]
      ),
      db.query('SELECT title FROM invitation_cards WHERE id = $1', [cardId])
    ]);

    // Record completion in history for cooldowns
    await db.query(
      'INSERT INTO invitation_card_history (user_id, card_id) VALUES ($1, $2)',
      [userId, cardId]
    );

    // Track Invitation Accepted Event
    const { trackEvent } = require('../services/eventEngine');
    trackEvent(userId, 'INVITATION_ACCEPTED', 'minor', { cardId, title: cardInfo.rows[0]?.title }).catch(err =>
      console.error('[cardController] trackEvent error:', err.message)
    );

    await emotionalController.syncEntry(
      userId,
      'card',
      'Motive',
      cardInfo.rows[0]?.title || (isEn ? 'Card Selected' : 'Kart Seçildi'),
      isEn ? 'I chose this card for today.' : 'Bu kartı bugün için seçtim.',
      { card_id: cardId, action: 'select' }
    );

    res.status(201).json(insertRes.rows[0]);
  } catch (err) {
    console.error('[CARD-SYSTEM] Error selecting card:', err.message);
    res.status(500).json({ message: isEn ? 'Could not save selection.' : 'Seçim kaydedilemedi.' });
  }
};

exports.respondToCard = async (req, res) => {
  const { id } = req.params;
  const { response } = req.body;
  const userId = req.user?.id;
  const lang = getLanguage(req);
  const isEn = lang === 'en';

  try {
    const cardId = parseInt(id);
    const uId = parseInt(userId);

    const cardInfo = await db.query('SELECT title, category FROM invitation_cards WHERE id = $1', [cardId]);
    if (cardInfo.rows.length === 0) {
      return res.status(404).json({ message: isEn ? 'Card not found.' : 'Kart bulunamadı.' });
    }
    const { title, category } = cardInfo.rows[0];

    const result = await db.query(
      'INSERT INTO card_responses (user_id, card_id, response, category) VALUES ($1, $2, $3, $4) RETURNING id',
      [uId, cardId, response, category]
    );

    await emotionalController.syncEntry(
      uId,
      'card',
      'Motive',
      title || (isEn ? 'Card Response' : 'Kart Yanıtı'),
      response,
      { card_id: cardId, action: 'respond' }
    );

    // Asynchronously update thematic card memories
    extractCardThemes(uId).catch(err => console.error('[cardController] extractCardThemes error:', err));

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: isEn ? 'Could not save response.' : 'Yanıt kaydedilemedi.' });
  }
};

exports.getCardResponses = async (req, res) => {
  const userId = req.user.id;
  const lang = getLanguage(req);
  const isEn = lang === 'en';

  try {
    const result = await db.query(
      `SELECT cr.id, cr.card_id, cr.response, cr.created_at, ic.title, ic.content 
       FROM card_responses cr
       JOIN invitation_cards ic ON cr.card_id = ic.id
       WHERE cr.user_id = $1
       ORDER BY cr.created_at DESC LIMIT 50`,
      [userId]
    );
    res.json(result.rows.map(c => localizeCard(c, lang)));
  } catch (err) {
    res.status(500).json({ message: isEn ? 'Could not load card responses.' : 'Kart yanıtları getirilemedi.' });
  }
};
