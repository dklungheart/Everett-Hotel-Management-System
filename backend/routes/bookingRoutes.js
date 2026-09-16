const express = require('express');
const router = express.Router();
const {
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
  getAllBookings,
  updateBookingStatus,
  sendCheckoutSms,
  getBookingStats,
  checkAvailability,
} = require('../controllers/bookingController');
const { protect, authorize } = require('../middleware/auth');
const { hasPermission } = require('../middleware/rbac');
const { bookingValidation } = require('../middleware/validate');
const { auditMiddleware } = require('../middleware/auditLog');

router.get('/availability/check', checkAvailability);

router.get('/admin/all', protect, authorize('super_admin', 'admin', 'receptionist', 'manager'), hasPermission('manage_bookings'), getAllBookings);
router.put('/admin/:id/status', protect, authorize('super_admin', 'admin', 'receptionist', 'manager'), hasPermission('manage_bookings'), auditMiddleware('admin_update_booking_status'), updateBookingStatus);
router.post('/admin/:id/send-sms', protect, authorize('super_admin', 'admin', 'receptionist', 'manager'), hasPermission('manage_bookings'), auditMiddleware('admin_send_checkout_sms'), sendCheckoutSms);
router.get('/admin/stats', protect, authorize('super_admin', 'admin'), hasPermission('view_analytics'), getBookingStats);

router.post('/', protect, bookingValidation, auditMiddleware('create_booking'), createBooking);
router.get('/my', protect, getMyBookings);
router.get('/:id', protect, getBookingById);
router.put('/:id/cancel', protect, auditMiddleware('cancel_booking'), cancelBooking);

module.exports = router;
