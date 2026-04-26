const db = require('../config/db');

exports.getRandomQuestion = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM reflection_questions ORDER BY RANDOM() LIMIT 1');
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Soru getirilemedi.' });
  }
};

exports.createCheckIn = async (req, res) => {
  const { mood, reflection_question, note } = req.body;
  const userId = req.user.id;

  try {
    const result = await db.query(
      'INSERT INTO check_ins (user_id, mood, reflection_question, note) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, mood, reflection_question, note]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Check-in kaydedilemedi.' });
  }
};

exports.getCheckIns = async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await db.query('SELECT * FROM check_ins WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Veriler getirilemedi.' });
  }
};

exports.getCheckInById = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  try {
    const result = await db.query('SELECT * FROM check_ins WHERE id = $1 AND user_id = $2', [id, userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Kayıt bulunamadı.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Veri getirilemedi.' });
  }
};

exports.deleteCheckIn = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  try {
    const result = await db.query('DELETE FROM check_ins WHERE id = $1 AND user_id = $2 RETURNING *', [id, userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Kayıt bulunamadı veya yetkiniz yok.' });
    }
    res.json({ message: 'Kayıt başarıyla silindi.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Kayıt silinemedi.' });
  }
};
