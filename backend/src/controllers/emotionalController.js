const db = require('../config/db');

/**
 * Get Unified Emotional Timeline
 * GET /api/emotional/timeline
 */
exports.getTimeline = async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await db.query(
      'SELECT * FROM emotional_entries WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[emotionalController] getTimeline error:', err);
    res.status(500).json({ message: 'Zaman akışı getirilemedi.' });
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
    console.log(`[EMOTIONAL-SYNC] Synced ${sourceType} for user ${userId}`);
  } catch (err) {
    console.error(`[EMOTIONAL-SYNC] Error syncing ${sourceType}:`, err.message);
  }
};
