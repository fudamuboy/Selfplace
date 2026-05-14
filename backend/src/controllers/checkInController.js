const db = require('../config/db');
const emotionalController = require('./emotionalController');

exports.getRandomQuestion = async (req, res) => {
  try {
    const result = await db.query('SELECT id, question_text FROM reflection_questions ORDER BY RANDOM() LIMIT 1');

    res.json(result.rows[0]);
  } catch (err) {
    console.error('[checkInController] getRandomQuestion error:', err.message);
    res.status(500).json({ 
      message: 'Soru getirilemedi.'

    });
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

    // Sync to unified emotional timeline
    await emotionalController.syncEntry(
      userId, 
      'checkin', 
      mood, 
      reflection_question || 'Günlük Check-in', 
      note, 
      { check_in_id: result.rows[0].id }
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[checkInController] createCheckIn error:', err.message);
    res.status(500).json({ 
      message: 'Check-in kaydedilemedi.'

    });
  }
};

exports.getCheckIns = async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await db.query('SELECT id, mood, reflection_question, note, created_at FROM check_ins WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [userId]);

    res.json(result.rows);
  } catch (err) {
    console.error('[checkInController] getCheckIns error:', err.message);
    res.status(500).json({ 
      message: 'Veriler getirilemedi.'

    });
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
    console.error('[checkInController] getCheckInById error:', err.message);
    res.status(500).json({ 
      message: 'Veri getirilemedi.'

    });
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
    console.error('[checkInController] deleteCheckIn error:', err.message);
    res.status(500).json({ 
      message: 'Kayıt silinemedi.'

    });
  }
};
exports.createAdvancedCheckIn = async (req, res) => {


  const { emotion } = req.body;
  const userId = req.user.id;

  // STEP 1 — FORCE SAFE ANSWERS
  const safeAnswers = Array.isArray(req.body.answers) ? req.body.answers : [];
  


  const selectedMoodLabel = emotion || 'Sakin';

  try {
    // 2. Create a base check-in entry for this advanced session
    const baseResult = await db.query(
      'INSERT INTO check_ins (user_id, mood, reflection_question, note) VALUES ($1, $2, $3, $4) RETURNING id',
      [userId, selectedMoodLabel, 'Gelişmiş Paylaşım', 'Detaylı duygusal yansıma.']
    );
    const checkInId = baseResult.rows[0].id;

    // 3. Insert all answers into advanced_check_ins
    // STEP 7 — FINAL SAFE NORMALIZATION
    const normalizedAnswers = safeAnswers.map(item => ({
      question: typeof item.question === "string" ? item.question.trim() : "",
      answer: typeof item.answer === "string" ? item.answer.trim() : ""
    }));

    const queries = normalizedAnswers.map((item) => {
      return db.query(
        'INSERT INTO advanced_check_ins (user_id, check_in_id, question_id, question_text, answer, answers) VALUES ($1, $2, $3, $4, $5, $6)',
        [userId, checkInId, 'advanced', item.question, item.answer, JSON.stringify(normalizedAnswers)]
      );
    });

    await Promise.all(queries);

    // 4. Sync to unified emotional timeline
    const summaryContent = normalizedAnswers.map(a => `${a.question}: ${a.answer}`).join('\n');
    
    await emotionalController.syncEntry(
      userId,
      'reflection',
      selectedMoodLabel,
      'Gelişmiş Paylaşım',
      summaryContent,
      { check_in_id: checkInId }
    );

    res.status(201).json({ success: true, checkInId });
  } catch (err) {
    return res.status(500).json({
      message: "Kaydedilirken bir hata oluştu."
    });
  }
};


exports.getAdvancedCheckIns = async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await db.query(
      `SELECT a.*, c.mood 
       FROM advanced_check_ins a
       JOIN check_ins c ON a.check_in_id = c.id
       WHERE a.user_id = $1 
       AND a.question_id != 'selected_mood'
       ORDER BY a.created_at DESC 
       LIMIT 30`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[checkInController] getAdvancedCheckIns error:', err.message);
    res.status(500).json({ message: 'Veriler getirilemedi.' });
  }
};
