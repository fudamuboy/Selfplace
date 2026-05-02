const express = require('express');
const router = express.Router();
const insightController = require('../controllers/insightController');
const authenticateToken = require('../middleware/auth');

// Weekly Insight (Hybrid AI + Persistence)
router.get('/weekly', authenticateToken, insightController.getWeeklyInsight);

// Stats for Profile
router.get('/stats', authenticateToken, insightController.getStats);

// Pattern Awareness (Gentle observations)
router.get('/patterns', authenticateToken, insightController.getPatterns);

module.exports = router;
