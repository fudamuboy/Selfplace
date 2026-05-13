const express = require('express');
const router = express.Router();
const cardController = require('../controllers/cardController');
const authenticateToken = require('../middleware/auth');

router.use(authenticateToken);

router.get('/ping', (req, res) => res.json({ message: 'cards api ok' }));
router.get('/responses', cardController.getCardResponses);
router.get('/random', cardController.getRandomCard);
router.get('/interactive', cardController.getInteractiveCards);
router.get('/', cardController.getAllCards);
router.post('/interactive/select', cardController.selectInteractiveCard);
router.post('/:id/response', cardController.respondToCard);

module.exports = router;
