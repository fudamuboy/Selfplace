const express = require('express');
const router = express.Router();
const cardController = require('../controllers/cardController');
const authenticateToken = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', cardController.getAllCards);
router.get('/random', cardController.getRandomCard);
router.post('/:id/response', cardController.respondToCard);

module.exports = router;
