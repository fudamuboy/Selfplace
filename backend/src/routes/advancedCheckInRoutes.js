const express = require('express');
const router = express.Router();
const advancedCheckInController = require('../controllers/advancedCheckInController');
const authenticateToken = require('../middleware/auth');

router.use(authenticateToken);

router.post('/', advancedCheckInController.createAdvancedCheckIn);
router.get('/', advancedCheckInController.getAdvancedCheckIns);
router.get('/:id', advancedCheckInController.getAdvancedCheckInById);

module.exports = router;
