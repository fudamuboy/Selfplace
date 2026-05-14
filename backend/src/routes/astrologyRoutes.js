const express = require('express');
const router = express.Router();
const astrologyController = require('../controllers/astrologyController');
const authMiddleware = require('../middleware/auth');

// Get current guidance and active events
router.get('/current', astrologyController.getCurrentAstrology);

// Update user zodiac/birth date (PROTECTED)
router.post('/profile', authMiddleware, astrologyController.updateUserZodiac);

module.exports = router;
