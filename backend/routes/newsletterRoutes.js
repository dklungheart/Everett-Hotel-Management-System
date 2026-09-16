const express = require('express');
const router = express.Router();
const {
  subscribe,
  unsubscribe,
  getAllSubscribers,
  deleteSubscriber,
} = require('../controllers/newsletterController');
const { protect, authorize } = require('../middleware/auth');
const { hasPermission } = require('../middleware/rbac');
const { newsletterValidation } = require('../middleware/validate');
const { auditMiddleware } = require('../middleware/auditLog');

router.post('/subscribe', newsletterValidation, auditMiddleware('newsletter_subscribe'), subscribe);
router.post('/unsubscribe', auditMiddleware('newsletter_unsubscribe'), unsubscribe);

router.get('/admin/all', protect, authorize('super_admin', 'admin'), hasPermission('manage_newsletter'), getAllSubscribers);
router.delete('/admin/:id', protect, authorize('super_admin', 'admin'), hasPermission('manage_newsletter'), auditMiddleware('delete_subscriber'), deleteSubscriber);

module.exports = router;
