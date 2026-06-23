const db = require('../config/db');

exports.createAdvancedCheckIn = async (req, res) => {
  const { answers } = req.body;
  const userId = req.user.id;

  if (!answers || typeof answers !== 'object') {
    return res.status(400).json({ message: 'Geçersiz veri formatı. (answers JSON objesi olmalı)' });
  }

  try {
    const result = await db.query(
      'INSERT INTO advanced_check_ins (user_id, answers) VALUES ($1, $2) RETURNING *',
      [userId, JSON.stringify(answers)]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[advancedCheckInController] createAdvancedCheckIn error:', err.message);
    res.status(500).json({ 
      message: 'Gelişmiş check-in kaydedilemedi.'
    });
  }
};

exports.getAdvancedCheckIns = async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await db.query('SELECT * FROM advanced_check_ins WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    res.json(result.rows);
  } catch (err) {
    console.error('[advancedCheckInController] getAdvancedCheckIns error:', err.message);
    res.status(500).json({ 
      message: 'Veriler getirilemedi.'
    });
  }
};

exports.getAdvancedCheckInById = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  try {
    const result = await db.query('SELECT * FROM advanced_check_ins WHERE id = $1 AND user_id = $2', [id, userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Kayıt bulunamadı.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[advancedCheckInController] getAdvancedCheckInById error:', err.message);
    res.status(500).json({ 
      message: 'Veri getirilemedi.'
    });
  }
};
