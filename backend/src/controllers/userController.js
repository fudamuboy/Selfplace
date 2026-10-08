const db = require('../config/db');
const bcrypt = require('bcrypt');
const { getLanguage } = require('../utils/languageResolver');

// ---------------------------------------------------------------------------
// GET /api/user/export-data
// ---------------------------------------------------------------------------
exports.exportData = async (req, res) => {
  const userId = req.user.id;
  const lang = getLanguage(req);
  const isEn = lang === 'en';
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
    res.status(500).json({ message: isEn ? 'An error occurred while exporting data.' : 'Veriler dışa aktarılırken bir hata oluştu.' });
  }
};

// ---------------------------------------------------------------------------
// DELETE /api/user/delete-data
// ---------------------------------------------------------------------------
exports.deletePersonalData = async (req, res) => {
  const userId = req.user.id;
  const lang = getLanguage(req);
  const isEn = lang === 'en';
  try {
    await Promise.all([
      db.query('DELETE FROM check_ins WHERE user_id = $1', [userId]),
      db.query('DELETE FROM card_responses WHERE user_id = $1', [userId]),
      db.query('DELETE FROM daily_reflections WHERE user_id = $1', [userId]),
      db.query('DELETE FROM weekly_insights WHERE user_id = $1', [userId]),
      db.query("DELETE FROM emotional_memories WHERE user_id = $1 AND memory_key IN ('recent_journal_themes', 'recent_card_themes')", [userId])
    ]);
    res.json({ message: isEn ? 'All personal data deleted successfully.' : 'Tüm kişisel verileriniz başarıyla silindi.' });
  } catch (err) {
    console.error('[userController] deletePersonalData error:', err.message);
    res.status(500).json({ message: isEn ? 'An error occurred while deleting data.' : 'Veriler silinirken bir hata oluştu.' });
  }
};

// ---------------------------------------------------------------------------
// DELETE /api/user/delete-account
// ---------------------------------------------------------------------------
exports.deleteAccount = async (req, res) => {
  const userId = req.user.id;
  const lang = getLanguage(req);
  const isEn = lang === 'en';
  try {
    // Due to ON DELETE CASCADE in schema, deleting user will delete all related data
    await db.query('DELETE FROM users WHERE id = $1', [userId]);
    res.json({ message: isEn ? 'Your account and all data have been deleted successfully.' : 'Hesabınız ve tüm verileriniz başarıyla silindi.' });
  } catch (err) {
    console.error('[userController] deleteAccount error:', err.message);
    res.status(500).json({ message: isEn ? 'An error occurred while deleting account.' : 'Hesap silinirken bir hata oluştu.' });
  }
};

// ---------------------------------------------------------------------------
// PUT /api/user/change-password
// ---------------------------------------------------------------------------
exports.changePassword = async (req, res) => {
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body;
  const lang = getLanguage(req);
  const isEn = lang === 'en';

  try {
    // Get user
    const userRes = await db.query('SELECT password FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ message: isEn ? 'User not found.' : 'Kullanıcı bulunamadı.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, userRes.rows[0].password);
    if (!isMatch) {
      return res.status(400).json({ message: isEn ? 'Current password is incorrect.' : 'Mevcut şifre hatalı.' });
    }

    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    await db.query('UPDATE users SET password = $1 WHERE id = $2', [hashedNewPassword, userId]);

    res.json({ message: isEn ? 'Password changed successfully.' : 'Şifreniz başarıyla değiştirildi.' });
  } catch (err) {
    console.error('[userController] changePassword error:', err.message);
    res.status(500).json({ message: isEn ? 'An error occurred while changing password.' : 'Şifre değiştirilirken bir hata oluştu.' });
  }
};

// ---------------------------------------------------------------------------
// PUT /api/user/profile
// ---------------------------------------------------------------------------
exports.updateProfile = async (req, res) => {
  const userId = req.user.id;
  const { birth_date, zodiac_sign, onboarding_goals, preferred_language } = req.body;
  const lang = getLanguage(req);
  const isEn = lang === 'en';

  try {
    const validPrefLang = preferred_language
      ? (String(preferred_language).toLowerCase().startsWith('en') ? 'en' : 'tr')
      : null;

    let updateRes;
    if (validPrefLang) {
      updateRes = await db.query(
        'UPDATE users SET birth_date = $1, zodiac_sign = $2, preferred_language = $3 WHERE id = $4 RETURNING *',
        [birth_date, zodiac_sign, validPrefLang, userId]
      );
    } else {
      updateRes = await db.query(
        'UPDATE users SET birth_date = $1, zodiac_sign = $2 WHERE id = $3 RETURNING *',
        [birth_date, zodiac_sign, userId]
      );
    }

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ message: isEn ? 'User not found.' : 'Kullanıcı bulunamadı.' });
    }

    if (onboarding_goals && Array.isArray(onboarding_goals)) {
      if (onboarding_goals.length > 0) {
        await db.query(
          `INSERT INTO emotional_memories (user_id, memory_key, memory_value, category)
           VALUES ($1, 'onboarding_goals', $2, 'individual')
           ON CONFLICT (user_id, memory_key) 
           DO UPDATE SET memory_value = EXCLUDED.memory_value, updated_at = NOW()`,
          [userId, onboarding_goals.join(', ')]
        );
      } else {
        await db.query(
          `DELETE FROM emotional_memories WHERE user_id = $1 AND memory_key = 'onboarding_goals'`,
          [userId]
        );
      }
    }

    const updatedUser = updateRes.rows[0];
    delete updatedUser.password;

    // Fetch updated onboarding goals
    const goalsRes = await db.query("SELECT memory_value FROM emotional_memories WHERE user_id = $1 AND memory_key = 'onboarding_goals'", [userId]);
    updatedUser.onboarding_goals = goalsRes.rows.length > 0 ? goalsRes.rows[0].memory_value.split(', ') : [];

    res.json({ message: isEn ? 'Profile updated successfully.' : 'Profil güncellendi.', user: updatedUser });
  } catch (err) {
    console.error('[userController] updateProfile error:', err.message);
    res.status(500).json({ message: isEn ? 'An error occurred while updating profile.' : 'Profil güncellenirken bir hata oluştu.' });
  }
};

// ---------------------------------------------------------------------------
// PUT /api/user/language
// ---------------------------------------------------------------------------
exports.updateLanguage = async (req, res) => {
  const userId = req.user.id;
  const { language } = req.body;
  const lang = getLanguage(req);
  const isEn = lang === 'en';
  const targetLang = (language && String(language).toLowerCase().startsWith('en')) ? 'en' : 'tr';
  try {
    await db.query('UPDATE users SET preferred_language = $1 WHERE id = $2', [targetLang, userId]);
    res.json({
      success: true,
      message: isEn ? 'Language preference updated.' : 'Dil tercihi güncellendi.',
      preferred_language: targetLang
    });
  } catch (err) {
    console.error('[userController] updateLanguage error:', err.message);
    res.status(500).json({ message: isEn ? 'Could not update language preference.' : 'Dil tercihi güncellenemedi.' });
  }
};

// ---------------------------------------------------------------------------
// GET /api/user/subscription
// ---------------------------------------------------------------------------
exports.getSubscription = async (req, res) => {
  const userId = req.user.id;
  const lang = getLanguage(req);
  const isEn = lang === 'en';
  try {
    const result = await db.query(
      'SELECT plan_type, is_active, expires_at FROM subscription_status WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({ plan_type: 'free', is_active: true });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('[userController] getSubscription error:', err.message);
    res.status(500).json({ message: isEn ? 'Could not load subscription details.' : 'Abonelik bilgileri getirilemedi.' });
  }
};
