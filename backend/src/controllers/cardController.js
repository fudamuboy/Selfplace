const db = require('../config/db');
const emotionalController = require('./emotionalController');
const { extractCardThemes } = require('../services/cardIntelligenceService');

exports.getAllCards = async (req, res) => {
  try {
    const result = await db.query('SELECT id, title, content, category FROM invitation_cards');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Kartlar getirilemedi.' });
  }
};

exports.getRandomCard = async (req, res) => {
  const userId = req.user.id;

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
      return res.status(404).json({ message: 'Kart bulunamadı.' });
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

    res.json(selectedCard);
  } catch (err) {
    res.status(500).json({ message: 'Kart getirilemedi.' });
  }
};

exports.getInteractiveCards = async (req, res) => {
  const userId = req.user.id;
  const { localDate } = req.query;
  
  try {
    const dateToCompare = localDate || new Date().toISOString().split('T')[0];
    
    // 1. Check if a card was ALREADY SELECTED today
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
      return res.json({
        alreadySelected: true,
        cards: [{
          id: sel.card_id,
          title: sel.title,
          content: sel.content,
          category: sel.card_category
        }]
      });
    }

    // 2. Check if a DAILY SET already exists for today
    const dailySetRes = await db.query(
      `SELECT ds.card_id as id, ic.title, ic.content, ic.category 
       FROM daily_card_sets ds
       JOIN invitation_cards ic ON ds.card_id = ic.id
       WHERE ds.user_id = $1 AND ds.daily_card_date = $2::date
       ORDER BY ds.daily_card_slot ASC`,
      [userId, dateToCompare]
    );

    if (dailySetRes.rows.length === 3) {
      console.log(`[CARD-SYSTEM] User ${userId}: Returning persisted daily set for ${dateToCompare}`);
      return res.json({
        alreadySelected: false,
        cards: dailySetRes.rows
      });
    }

    // 3. GENERATE NEW SET
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
      return res.status(404).json({ message: 'Yeterli kart bulunamadı.' });
    }

    const preferences = prefRes.rows.reduce((acc, curr) => {
      acc[curr.category] = parseInt(curr.score);
      return acc;
    }, {});

    const history = historyRes.rows;
    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Apply 14-day cooldown
    let availableCards = allCards.filter(card => {
      const record = history.find(h => h.card_id === card.id);
      if (record && new Date(record.completed_at) > fourteenDaysAgo) {
        console.log(`[CARD-SYSTEM] User ${userId}: Card ID ${card.id} excluded: completed within last 14 days.`);
        return false;
      }
      return true;
    });

    // Fallback logic: if less than 3 cards remain, reshuffle but exclude last 5
    if (availableCards.length < 3) {
      console.log(`[CARD-SYSTEM] User ${userId}: Pool exhausted (${availableCards.length} left). Triggering reshuffle excluding last 5.`);
      const last5Ids = history.slice(0, 5).map(h => h.card_id);
      availableCards = allCards.filter(card => {
        if (last5Ids.includes(card.id)) {
          console.log(`[CARD-SYSTEM] User ${userId}: Card ID ${card.id} excluded: recently completed (fallback rule).`);
          return false;
        }
        return true;
      });
    }

    // If STILL less than 3 cards (extremely small total pool), just use all cards
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

    console.log(`[CARD-SYSTEM] User ${userId}: Generated new set ->`, selectedCards.map(c => c.id));

    // Save to daily_card_sets
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
      cards: selectedCards
    });
  } catch (err) {
    console.error('[CARD-SYSTEM] Error getting interactive cards:', err.message);
    res.status(500).json({ message: 'Kartlar getirilemedi.' });
  }
};

exports.selectInteractiveCard = async (req, res) => {
  const { cardId, localDate } = req.body;
  const userId = req.user.id;
  const dateToSave = localDate || new Date().toISOString().split('T')[0];

  try {
    const existing = await db.query(
      "SELECT id FROM card_responses WHERE user_id = $1 AND response = 'Seçildi' AND local_date::date = $2::date",
      [userId, dateToSave]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'Bugün zaten bir kart seçtin.' });
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
    console.log(`[CARD-SYSTEM] User ${userId}: Card ID ${cardId} marked as completed.`);

    await emotionalController.syncEntry(
      userId,
      'card',
      'Motive',
      cardInfo.rows[0]?.title || 'Kart Seçildi',
      'Bu kartı bugün için seçtim.',
      { card_id: cardId, action: 'select' }
    );

    res.status(201).json(insertRes.rows[0]);
  } catch (err) {
    console.error('[CARD-SYSTEM] Error selecting card:', err.message);
    res.status(500).json({ message: 'Seçim kaydedilemedi.' });
  }
};

exports.respondToCard = async (req, res) => {
  const { id } = req.params;
  const { response } = req.body;
  const userId = req.user?.id;

  try {
    const cardId = parseInt(id);
    const uId = parseInt(userId);

    const cardInfo = await db.query('SELECT title, category FROM invitation_cards WHERE id = $1', [cardId]);
    if (cardInfo.rows.length === 0) {
      return res.status(404).json({ message: 'Kart bulunamadı.' });
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
      title || 'Kart Yanıtı',
      response,
      { card_id: cardId, action: 'respond' }
    );

    // Asynchronously update thematic card memories
    extractCardThemes(uId).catch(err => console.error('[cardController] extractCardThemes error:', err));

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Yanıt kaydedilemedi.' });
  }
};

exports.getCardResponses = async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await db.query(
      `SELECT cr.id, cr.card_id, cr.response, cr.created_at, ic.title, ic.content 
       FROM card_responses cr
       JOIN invitation_cards ic ON cr.card_id = ic.id
       WHERE cr.user_id = $1
       ORDER BY cr.created_at DESC LIMIT 50`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Kart yanıtları getirilemedi.' });
  }
};
