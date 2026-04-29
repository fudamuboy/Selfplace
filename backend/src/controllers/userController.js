const db = require('../config/db');

// ---------------------------------------------------------------------------
// GET /api/user/export-data
// ---------------------------------------------------------------------------
exports.exportData = async (req, res) => {
  const userId = req.user.id;
  try {
    const [user, checkIns, cardResponses, dailyReflections, weeklyInsights] = await Promise.all([
      db.query('SELECT username, email, created_at FROM users WHERE id = $1', [userId]),
      db.query('SELECT mood, reflection_question, note, created_at FROM check_ins WHERE user_id = $1 ORDER BY created_at DESC', [userId]),
      db.query('SELECT category, response, created_at FROM card_responses WHERE user_id = $1 ORDER BY created_at DESC', [userId]),
      db.query('SELECT text, created_at FROM daily_reflections WHERE user_id = $1 ORDER BY created_at DESC', [userId]),
      db.query('SELECT text, generated_at FROM weekly_insights WHERE user_id = $1 ORDER BY generated_at DESC', [userId])
    ]);

    res.json({
      profile: user.rows[0],
      checkIns: checkIns.rows,
      cardResponses: cardResponses.rows,
      dailyReflections: dailyReflections.rows,
      weeklyInsights: weeklyInsights.rows
    });
  } catch (err) {
    console.error('[userController] exportData error:', err.message);
    res.status(500).json({ message: 'Veriler dışa aktarılırken bir hata oluştu.' });
  }
};

// ---------------------------------------------------------------------------
// DELETE /api/user/delete-data
// ---------------------------------------------------------------------------
exports.deletePersonalData = async (req, res) => {
  const userId = req.user.id;
  try {
    await Promise.all([
      db.query('DELETE FROM check_ins WHERE user_id = $1', [userId]),
      db.query('DELETE FROM card_responses WHERE user_id = $1', [userId]),
      db.query('DELETE FROM daily_reflections WHERE user_id = $1', [userId]),
      db.query('DELETE FROM weekly_insights WHERE user_id = $1', [userId])
    ]);
    res.json({ message: 'Tüm kişisel verileriniz başarıyla silindi.' });
  } catch (err) {
    console.error('[userController] deletePersonalData error:', err.message);
    res.status(500).json({ message: 'Veriler silinirken bir hata oluştu.' });
  }
};

// ---------------------------------------------------------------------------
// DELETE /api/user/delete-account
// ---------------------------------------------------------------------------
exports.deleteAccount = async (req, res) => {
  const userId = req.user.id;
  try {
    // Due to ON DELETE CASCADE in schema, deleting user will delete all related data
    await db.query('DELETE FROM users WHERE id = $1', [userId]);
    res.json({ message: 'Hesabınız ve tüm verileriniz başarıyla silindi.' });
  } catch (err) {
    console.error('[userController] deleteAccount error:', err.message);
    res.status(500).json({ message: 'Hesap silinirken bir hata oluştu.' });
  }
};
