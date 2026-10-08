const db = require('../config/db');
const { getLanguage } = require('../utils/languageResolver');
const { localizeEmotionalEntry } = require('../utils/emotionalLocalization');

/**
 * Get Unified Emotional Timeline
 * GET /api/emotional/timeline
 */
exports.getTimeline = async (req, res) => {
  const userId = req.user.id;
  const lang = getLanguage(req);
  const isEn = lang === 'en';
  try {
    const result = await db.query(
      'SELECT id, source_type, emotion, prompt, content, created_at FROM emotional_entries WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [userId]
    );
    const rows = result.rows.map(row => localizeEmotionalEntry(row, isEn));
    res.json(rows);
  } catch (err) {
    console.error('[emotionalController] getTimeline error:', err);
    res.status(500).json({ message: isEn ? 'Could not load timeline.' : 'Zaman akışı getirilemedi.' });
  }
};

/**
 * Helper function to sync any emotional event to the unified table
 */
exports.syncEntry = async (userId, sourceType, emotion, prompt, content, metadata = {}) => {
  try {
    await db.query(
      'INSERT INTO emotional_entries (user_id, source_type, emotion, prompt, content, metadata) VALUES ($1, $2, $3, $4, $5, $6)',
      [userId, sourceType, emotion, prompt, content, JSON.stringify(metadata)]
    );
  } catch (err) {
    console.error(`[EMOTIONAL-SYNC] Error syncing ${sourceType}:`, err.message);
  }
};
