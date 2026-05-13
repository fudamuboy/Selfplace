const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const authenticateToken = require('../middleware/auth');

router.use(authenticateToken);

router.post('/chat', aiController.handleChat);
router.get('/greeting', aiController.getGreeting);
router.get('/reflections', aiController.getReflections);

module.exports = router;
