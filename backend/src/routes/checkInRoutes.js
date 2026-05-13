const express = require('express');
const router = express.Router();
const checkInController = require('../controllers/checkInController');
const authenticateToken = require('../middleware/auth');

router.use(authenticateToken);

router.get('/question', checkInController.getRandomQuestion);
router.get('/advanced', checkInController.getAdvancedCheckIns);
router.post('/advanced', checkInController.createAdvancedCheckIn);
router.post('/', checkInController.createCheckIn);
router.get('/', checkInController.getCheckIns);
router.get('/:id', checkInController.getCheckInById);
router.delete('/:id', checkInController.deleteCheckIn);

module.exports = router;
