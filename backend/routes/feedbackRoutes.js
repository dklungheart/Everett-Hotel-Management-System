const express = require('express');
const router = express.Router();
const { submitRating, getAllFeedback } = require('../controllers/feedbackController');
const { protect, authorize } = require('../middleware/auth');

router.post('/submit', submitRating);
router.get('/admin', protect, authorize('admin', 'super_admin', 'manager'), getAllFeedback);

module.exports = router;
