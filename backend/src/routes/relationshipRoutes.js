const express = require('express');
const router = express.Router();
const relationshipController = require('../controllers/relationshipController');
const authenticateToken = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(authenticateToken);

// Invite routes
router.post('/invite', relationshipController.sendInvite);
router.get('/', relationshipController.getConnections);
router.put('/:id/respond', relationshipController.respondInvite);
router.put('/:id/settings', relationshipController.updateSettings);
router.delete('/:id', relationshipController.disconnect);

// Privacy settings routes
router.get('/:id/privacy', relationshipController.getPrivacySettings);
router.put('/:id/privacy', relationshipController.updatePrivacySettings);

// AI Insight route
router.get('/:id/insight', relationshipController.getInsight);

// Phase 2 additions
router.get('/:id/daily-sync', relationshipController.getDailySync);
router.get('/:id/rituals', relationshipController.getRituals);
router.post('/:id/rituals/:ritualId/respond', relationshipController.respondToRitual);
router.get('/:id/timeline', relationshipController.getTimeline);

// Phase 3 additions
router.get('/:id/insight-feed', relationshipController.getInsightFeed);

// Signature Tier additions
router.get('/:id/crystals', relationshipController.getCrystals);
router.get('/:id/garden', relationshipController.getGardenState);

module.exports = router;
