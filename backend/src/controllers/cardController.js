const db = require('../config/db');

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

exports.respondToCard = async (req, res) => {
  const { id } = req.params;
  const { response } = req.body;
  const userId = req.user.id;

  try {
    // Get card category first
    const cardInfo = await db.query('SELECT category FROM invitation_cards WHERE id = $1', [id]);
    if (cardInfo.rows.length === 0) {
      return res.status(404).json({ message: 'Kart bulunamadı.' });
    }
    const category = cardInfo.rows[0].category;

    const result = await db.query(
      'INSERT INTO card_responses (user_id, card_id, response, category) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, id, response, category]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Yanıt kaydedilemedi.' });
  }
};
