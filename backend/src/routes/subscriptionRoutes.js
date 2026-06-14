const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const authenticateToken = require('../middleware/auth');

/**
 * GET  /api/subscriptions/status
 * Lightweight subscription state check — used on app wake.
 * No Apple round-trip; reads directly from DB with auto-expiry enforcement.
 */
router.get('/status', authenticateToken, subscriptionController.getSubscriptionStatus);

/**
 * POST /api/subscriptions/verify
 * Validates an Apple In-App Purchase receipt with Apple servers.
 * Updates the user's subscription plan and expiry in the database.
 * Must be called after every successful purchase.
 */
router.post('/verify', authenticateToken, subscriptionController.verifyAppleReceipt);

/**
 * POST /api/subscriptions/restore
 * Restores a previous Apple subscription — same validation flow as /verify.
 * Used by the "Restore Purchases" button and on app reinstall.
 */
router.post('/restore', authenticateToken, subscriptionController.restorePurchases);

module.exports = router;
