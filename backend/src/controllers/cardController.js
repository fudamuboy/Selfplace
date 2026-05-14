const db = require('../config/db');
const emotionalController = require('./emotionalController');

exports.getAllCards = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM invitation_cards');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Kartlar getirilemedi.' });
  }
};

exports.getRandomCard = async (req, res) => {
  const userId = req.user.id;

  try {
    // 1. Fetch all cards and user preferences
    const [cardsRes, prefRes] = await Promise.all([
      db.query('SELECT * FROM invitation_cards'),
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

    // 2. Assign weights to cards
    // Base weight is 10. Adjust based on category score.
    const weightedCards = allCards.map(card => {
      const score = preferences[card.category] || 0;
      // Weight can't go below 1 (to keep variety)
      const weight = Math.max(1, 10 + score);
      return { ...card, weight };
    });

    // 3. Pick a card using weighted randomness
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
    console.error(err);
    res.status(500).json({ message: 'Kart getirilemedi.' });
  }
};

exports.getInteractiveCards = async (req, res) => {
  const userId = req.user.id;
  const { localDate } = req.query; // Expecting YYYY-MM-DD
  
  try {
    // 1. Check if user already selected a card TODAY (using localDate if provided)
    const dateToCompare = localDate || new Date().toISOString().split('T')[0];
    
    const todaySelection = await db.query(
      `SELECT cr.*, ic.title, ic.content, ic.category as card_category 
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

    // 2. If no selection today, pick 3 random distinct cards using weights
    const [cardsRes, prefRes] = await Promise.all([
      db.query('SELECT * FROM invitation_cards'),
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
    if (allCards.length < 3) {
      return res.status(404).json({ message: 'Yeterli kart bulunamadı.' });
    }

    const preferences = prefRes.rows.reduce((acc, curr) => {
      acc[curr.category] = parseInt(curr.score);
      return acc;
    }, {});

    const weightedCards = allCards.map(card => {
      const score = preferences[card.category] || 0;
      const weight = Math.max(1, 10 + score);
      return { ...card, weight };
    });

    const selectedCards = [];
    const availableCards = [...weightedCards];

    for (let i = 0; i < 3; i++) {
      const totalWeight = availableCards.reduce((sum, card) => sum + card.weight, 0);
      let random = Math.random() * totalWeight;
      
      let selectedIdx = 0;
      for (let j = 0; j < availableCards.length; j++) {
        if (random < availableCards[j].weight) {
          selectedIdx = j;
          break;
        }
        random -= availableCards[j].weight;
      }
      
      selectedCards.push(availableCards[selectedIdx]);
      availableCards.splice(selectedIdx, 1);
    }

    res.json({
      alreadySelected: false,
      cards: selectedCards
    });
  } catch (err) {
    res.status(500).json({ message: 'Kartlar getirilemedi.' });
  }
};

exports.selectInteractiveCard = async (req, res) => {
  const { cardId, localDate } = req.body;
  const userId = req.user.id;
  const dateToSave = localDate || new Date().toISOString().split('T')[0];

  try {
    // 1. Check if user already selected a card TODAY (prevention)
    const existing = await db.query(
      "SELECT id FROM card_responses WHERE user_id = $1 AND response = 'Seçildi' AND local_date::date = $2::date",
      [userId, dateToSave]
    );

    if (existing.rows.length > 0) {
      console.warn(`[cardController] User ${userId} attempted double selection for ${dateToSave}`);
      return res.status(409).json({ message: 'Bugün zaten bir kart seçtin.' });
    }

    // 2. Record the selection
    const result = await db.query(
      'INSERT INTO card_responses (user_id, card_id, response, category, local_date) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [userId, cardId, 'Seçildi', 'Interactive', dateToSave]
    );

    // Sync to unified emotional timeline
    const cardInfo = await db.query('SELECT title, content FROM invitation_cards WHERE id = $1', [cardId]);
    await emotionalController.syncEntry(
      userId,
      'card',
      'Motive',
      cardInfo.rows[0]?.title || 'Kart Seçildi',
      'Bu kartı bugün için seçtim.',
      { card_id: cardId, action: 'select' }
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Seçim kaydedilemedi.' });
  }
};


exports.respondToCard = async (req, res) => {
  const { id } = req.params;
  const { response } = req.body;
  const userId = req.user?.id;
  
  console.log(`[respondToCard] ENTRY - CardID: ${id}, UserID: ${userId}, Response: ${response}`);

  try {
    const cardId = parseInt(id);
    const uId = parseInt(userId);

    // 1. Verify user exists (Foreign Key safety)
    const userCheck = await db.query('SELECT id FROM users WHERE id = $1', [uId]);
    if (userCheck.rows.length === 0) {
      console.warn(`[respondToCard] User ${uId} not found in database.`);
      return res.status(404).json({ 
        message: 'Kullanıcı bulunamadı.', 
        error: 'User ID in token does not exist in database.',
        userId: uId 
      });
    }

    // 2. Get card category
    const cardInfo = await db.query('SELECT category FROM invitation_cards WHERE id = $1', [cardId]);
    if (cardInfo.rows.length === 0) {
      return res.status(404).json({ message: 'Kart bulunamadı.' });
    }
    const category = cardInfo.rows[0].category;

    const result = await db.query(
      'INSERT INTO card_responses (user_id, card_id, response, category) VALUES ($1, $2, $3, $4) RETURNING *',
      [uId, cardId, response, category]
    );

    // Sync to unified emotional timeline
    const cardInfoDetail = await db.query('SELECT title FROM invitation_cards WHERE id = $1', [cardId]);
    await emotionalController.syncEntry(
      uId,
      'card',
      'Motive',
      cardInfoDetail.rows[0]?.title || 'Kart Yanıtı',
      response,
      { card_id: cardId, action: 'respond' }
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ 
      message: 'Yanıt kaydedilemedi.'
    });
  }
};

exports.getCardResponses = async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await db.query(
      `SELECT cr.*, ic.title, ic.content 
       FROM card_responses cr
       JOIN invitation_cards ic ON cr.card_id = ic.id
       WHERE cr.user_id = $1
       ORDER BY cr.created_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[cardController] getCardResponses error:', err);
    res.status(500).json({ message: 'Kart yanıtları getirilemedi.' });
  }
};
