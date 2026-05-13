const express = require('express');
const router = express.Router();
const journalController = require('../controllers/journalController');
const authenticateToken = require('../middleware/auth');

router.use(authenticateToken);

router.post('/', journalController.createEntry);
router.get('/', journalController.getEntries);
router.get('/:id', journalController.getEntryById);
router.put('/:id', journalController.updateEntry);
router.delete('/:id', journalController.deleteEntry);

module.exports = router;
