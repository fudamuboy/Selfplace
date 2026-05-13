const express = require('express');
const router = express.Router();
const emotionalController = require('../controllers/emotionalController');
const authenticateToken = require('../middleware/auth');

router.use(authenticateToken);

router.get('/ping', (req, res) => res.json({ message: 'emotional api ok' }));
router.get('/timeline', emotionalController.getTimeline);

module.exports = router;
