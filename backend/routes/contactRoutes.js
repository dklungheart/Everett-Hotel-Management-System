const express = require('express');
const router = express.Router();
const {
  sendMessage,
  getAllMessages,
  updateMessageStatus,
  deleteMessage,
} = require('../controllers/contactController');
const { protect, authorize } = require('../middleware/auth');
const { hasPermission } = require('../middleware/rbac');
const { contactValidation } = require('../middleware/validate');
const { auditMiddleware } = require('../middleware/auditLog');

router.post('/', contactValidation, auditMiddleware('submit_contact'), sendMessage);

router.get('/admin/all', protect, authorize('super_admin', 'admin'), hasPermission('manage_contacts'), getAllMessages);
router.put('/admin/:id/status', protect, authorize('super_admin', 'admin'), hasPermission('manage_contacts'), auditMiddleware('update_contact_status'), updateMessageStatus);
router.delete('/admin/:id', protect, authorize('super_admin', 'admin'), hasPermission('manage_contacts'), auditMiddleware('delete_contact'), deleteMessage);

module.exports = router;
