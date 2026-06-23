const db = require('../config/db');
const emotionalController = require('./emotionalController');
const { extractJournalThemes } = require('../services/journalIntelligenceService');

exports.createEntry = async (req, res) => {
  const { title, content } = req.body;
  const userId = req.user.id;

  if (!title && !content) {
    return res.status(400).json({ message: 'Lütfen başlık veya içerik giriniz.' });
  }

  const finalContent = content || '';

  try {
    const result = await db.query(
      'INSERT INTO journal_entries (user_id, title, content) VALUES ($1, $2, $3) RETURNING *',
      [userId, title, finalContent]
    );

    // Sync to unified emotional timeline
    await emotionalController.syncEntry(
      userId,
      'journal',
      'Sakin', // Journal entries are calm by default unless analyzed
      title || 'Günlük Yazısı',
      finalContent,
      { journal_id: result.rows[0].id }
    );

    // Asynchronously update thematic AI memory
    extractJournalThemes(userId).catch(err => console.error('[journalController] extractJournalThemes error:', err));

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[journalController] createEntry error:', err.message);
    res.status(500).json({ 
      message: 'Günlük kaydedilemedi.'
    });
  }
};

exports.getEntries = async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await db.query('SELECT * FROM journal_entries WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    res.json(result.rows);
  } catch (err) {
    console.error('[journalController] getEntries error:', err.message);
    res.status(500).json({ 
      message: 'Veriler getirilemedi.'
    });
  }
};

exports.getEntryById = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  try {
    const result = await db.query('SELECT * FROM journal_entries WHERE id = $1 AND user_id = $2', [id, userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Kayıt bulunamadı.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[journalController] getEntryById error:', err.message);
    res.status(500).json({ 
      message: 'Veri getirilemedi.'
    });
  }
};

exports.updateEntry = async (req, res) => {
  const { id } = req.params;
  const { title, content } = req.body;
  const userId = req.user.id;

  if (!title && !content) {
    return res.status(400).json({ message: 'Lütfen başlık veya içerik giriniz.' });
  }

  const finalContent = content || '';

  try {
    const result = await db.query(
      'UPDATE journal_entries SET title = $1, content = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 AND user_id = $4 RETURNING *',
      [title, finalContent, id, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Kayıt bulunamadı veya yetkiniz yok.' });
    }
    // Asynchronously update thematic AI memory
    extractJournalThemes(userId).catch(err => console.error('[journalController] extractJournalThemes error:', err));

    res.json(result.rows[0]);
  } catch (err) {
    console.error('[journalController] updateEntry error:', err.message);
    res.status(500).json({ 
      message: 'Günlük güncellenemedi.'
    });
  }
};

exports.deleteEntry = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  try {
    const result = await db.query('DELETE FROM journal_entries WHERE id = $1 AND user_id = $2 RETURNING *', [id, userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Kayıt bulunamadı veya yetkiniz yok.' });
    }
    // Asynchronously update thematic AI memory (in case deletion cleared all recent entries)
    extractJournalThemes(userId).catch(err => console.error('[journalController] extractJournalThemes error:', err));

    res.json({ message: 'Kayıt başarıyla silindi.' });
  } catch (err) {
    console.error('[journalController] deleteEntry error:', err.message);
    res.status(500).json({ 
      message: 'Kayıt silinemedi.'
    });
  }
};
