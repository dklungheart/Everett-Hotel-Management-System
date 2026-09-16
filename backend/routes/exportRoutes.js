const express = require('express');
const router = express.Router();
const {
  exportBookings,
  exportPayments,
} = require('../controllers/exportController');
const { protect, authorize } = require('../middleware/auth');
const { hasPermission } = require('../middleware/rbac');

router.get('/bookings', protect, authorize('super_admin', 'admin'), hasPermission('manage_bookings'), exportBookings);
router.get('/payments', protect, authorize('super_admin', 'admin'), hasPermission('manage_payments'), exportPayments);

module.exports = router;
