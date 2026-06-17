const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const astrologyController = require('../controllers/astrologyController');

// GET /api/astrology/home
router.get('/home', authMiddleware, astrologyController.getHomeWidget);

// GET /api/astrology/weekly
router.get('/weekly', authMiddleware, astrologyController.getWeeklyGuidance);

// GET /api/astrology/daily
router.get('/daily', authMiddleware, astrologyController.getDailyWhisper);

// POST /api/astrology/admin/refresh/:userId
// (In production, you'd add an adminMiddleware here)
router.post('/admin/refresh/:userId', astrologyController.refreshWeeklyGuidance);

module.exports = router;
