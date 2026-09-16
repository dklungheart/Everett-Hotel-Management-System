const express = require('express');
const router = express.Router();
const {
  getMyNotifications,
  markAsRead,
  markAllRead,
  deleteNotification,
} = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');
const { auditMiddleware } = require('../middleware/auditLog');

router.get('/', protect, getMyNotifications);
router.put('/read-all', protect, auditMiddleware('mark_all_notifications_read'), markAllRead);
router.put('/:id/read', protect, auditMiddleware('mark_notification_read'), markAsRead);
router.delete('/:id', protect, auditMiddleware('delete_notification'), deleteNotification);

module.exports = router;
