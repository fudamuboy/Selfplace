const db = require('../config/db');
const bcrypt = require('bcrypt');

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

// ---------------------------------------------------------------------------
// PUT /api/user/change-password
// ---------------------------------------------------------------------------
exports.changePassword = async (req, res) => {
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body;

  try {
    // Get user
    const userRes = await db.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, userRes.rows[0].password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Mevcut şifre hatalı.' });
    }

    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedNewPassword, userId]);

    res.json({ message: 'Şifreniz başarıyla değiştirildi.' });
  } catch (err) {
    console.error('[userController] changePassword error:', err.message);
    res.status(500).json({ message: 'Şifre değiştirilirken bir hata oluştu.' });
  }
};
