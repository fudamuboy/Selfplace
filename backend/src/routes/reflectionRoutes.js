const express = require('express');
const router = express.Router();
const insightController = require('../controllers/insightController');
const authenticateToken = require('../middleware/auth');

// Daily Reflection (Hybrid AI + Persistence)
router.get('/daily', authenticateToken, insightController.getDailyReflection);

module.exports = router;
