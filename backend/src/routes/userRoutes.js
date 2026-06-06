const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authenticateToken = require('../middleware/auth');

router.get('/export-data', authenticateToken, userController.exportData);
router.delete('/delete-data', authenticateToken, userController.deletePersonalData);
router.delete('/delete-account', authenticateToken, userController.deleteAccount);
router.put('/change-password', authenticateToken, userController.changePassword);
router.put('/profile', authenticateToken, userController.updateProfile);
router.get('/subscription', authenticateToken, userController.getSubscription);
router.put('/subscription', authenticateToken, userController.updateSubscription);

module.exports = router;
