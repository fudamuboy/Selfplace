const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const personalityController = require('../controllers/personalityController');

// GET /api/personality/tests/:type
router.get('/tests/:type', authMiddleware, personalityController.getTest);

// POST /api/personality/tests/:type/submit
router.post('/tests/:type/submit', authMiddleware, personalityController.submitTest);

// GET /api/personality/history
router.get('/history', authMiddleware, personalityController.getHistory);

module.exports = router;
