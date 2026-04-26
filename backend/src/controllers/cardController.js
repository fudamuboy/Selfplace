const db = require('../config/db');

exports.getRandomCard = async (req, res) => {
  const userId = req.user.id;

  try {
    // 1. Analyze user preferences from past responses
    const prefResult = await db.query(
      `SELECT category, 
              SUM(CASE WHEN response = 'Deneyeceğim' THEN 1 WHEN response = 'Bana göre değil' THEN -2 ELSE 0 END) as score
       FROM card_responses
       WHERE user_id = $1
       GROUP BY category`,
      [userId]
    );

    const preferences = prefResult.rows;
    let excludedCategories = preferences.filter(p => p.score <= -4).map(p => p.category);

    // 2. Fetch a random card, avoiding excluded categories and recently seen cards
    let query = 'SELECT * FROM cards';
    let params = [];

    if (excludedCategories.length > 0) {
      query += ' WHERE category NOT IN (' + excludedCategories.map((_, i) => `$${i + 1}`).join(',') + ')';
      params = excludedCategories;
    }

    query += ' ORDER BY RANDOM() LIMIT 1';

    const cardResult = await db.query(query, params);
    
    if (cardResult.rows.length === 0) {
      // Fallback if all categories are excluded (should be rare)
      const fallback = await db.query('SELECT * FROM cards ORDER BY RANDOM() LIMIT 1');
      return res.json(fallback.rows[0]);
    }

    res.json(cardResult.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Kart getirilemedi.' });
  }
};

exports.submitResponse = async (req, res) => {
  const { id } = req.params;
  const { response } = req.body;
  const userId = req.user.id;

  try {
    // Get card category first
    const cardInfo = await db.query('SELECT category FROM cards WHERE id = $1', [id]);
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
