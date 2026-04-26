const express = require('express');
const router = express.Router();
const insightController = require('../controllers/insightController');
const authenticateToken = require('../middleware/auth');

router.get('/weekly', authenticateToken, insightController.getWeeklyInsight);

module.exports = router;
