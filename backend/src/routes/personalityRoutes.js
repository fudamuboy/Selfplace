const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const personalityController = require('../controllers/personalityController');

// GET /api/personality/ping
router.get('/ping', (req, res) => {
  res.json({ success: true, message: 'Personality routes working' });
});

// GET /api/personality/tests/:type
router.get('/tests/:type', authMiddleware, personalityController.getTest);

// POST /api/personality/tests/:type/submit
router.post('/tests/:type/submit', authMiddleware, personalityController.submitTest);

// GET /api/personality/history
router.get('/history', authMiddleware, personalityController.getHistory);

// GET /api/personality/history/:id
router.get('/history/:id', authMiddleware, personalityController.getResult);

module.exports = router;
