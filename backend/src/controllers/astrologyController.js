const pool = require('../config/db');
const { getZodiacSign } = require('../utils/zodiac');

/**
 * Get current astrology events and personalized zodiac guidance
 */
exports.getCurrentAstrology = async (req, res) => {
  const userId = req.user?.id;
  const now = new Date();

  try {
    // Parallelize all queries for maximum speed
    const [userRes, eventsRes] = await Promise.all([
      userId ? pool.query('SELECT zodiac_sign FROM users WHERE id = $1', [userId]) : Promise.resolve({ rows: [] }),
      pool.query(`
        SELECT event_type, message_tr, symbol, priority 
        FROM astrology_events 
        WHERE (start_date <= $1 AND (end_date IS NULL OR end_date >= $1))
        ORDER BY created_at ASC
      `, [now])
    ]);

    const userZodiac = userRes.rows[0]?.zodiac_sign;

    // Fetch guidance only if zodiac is available (second stage if needed, but keeping it fast)
    let zodiacGuidance = null;
    if (userZodiac) {
      const guidanceRes = await pool.query(`
        SELECT guidance_tr, period_name 
        FROM zodiac_guidance 
        WHERE zodiac_sign = $1
        ORDER BY created_at DESC LIMIT 1
      `, [userZodiac]);
      
      zodiacGuidance = guidanceRes.rows[0];
    }

    res.status(200).json({
      success: true,
      events: eventsRes.rows,
      zodiacGuidance: zodiacGuidance || null,
      userZodiac,
      energy: {
        title: "Günün Enerjisi",
        message: "Bugün küçük niyetler kurmak için güzel bir gün olabilir 🌿"
      }
    });
  } catch (err) {
    res.status(200).json({
      success: true,
      events: [],
      zodiacGuidance: null,
      energy: {
        title: "Günün Enerjisi",
        message: "Bugün küçük niyetler kurmak için güzel bir gün olabilir 🌿"
      }
    });
  }
};

/**
 * Update user zodiac info (Automated via birth_date)
 */
exports.updateUserZodiac = async (req, res) => {
  const userId = req.user.id;
  const { birth_date } = req.body;

  if (!birth_date) {
    return res.status(400).json({ error: 'Birth date is required.' });
  }

  const zodiac_sign = getZodiacSign(birth_date);

  try {
    await pool.query(
      'UPDATE users SET birth_date = $1, zodiac_sign = $2 WHERE id = $3',
      [birth_date, zodiac_sign, userId]
    );
    res.json({ 
      message: 'Profile updated intelligently.',
      zodiac_sign 
    });
  } catch (err) {
    res.status(500).json({ error: 'Profile could not be updated.' });
  }
};
