const express = require('express');
const router = express.Router();
const {
  dailyReport,
  weeklyReport,
  monthlyReport,
  annualReport,
  revenueReport,
  bookingReport,
  occupancyReport,
  employeeReport,
} = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');
const { hasPermission } = require('../middleware/rbac');

router.get('/daily', protect, authorize('super_admin', 'admin'), hasPermission('view_reports'), dailyReport);
router.get('/weekly', protect, authorize('super_admin', 'admin'), hasPermission('view_reports'), weeklyReport);
router.get('/monthly', protect, authorize('super_admin', 'admin'), hasPermission('view_reports'), monthlyReport);
router.get('/annual', protect, authorize('super_admin', 'admin'), hasPermission('view_reports'), annualReport);
router.get('/revenue', protect, authorize('super_admin', 'admin'), hasPermission('view_reports'), revenueReport);
router.get('/bookings', protect, authorize('super_admin', 'admin'), hasPermission('view_reports'), bookingReport);
router.get('/occupancy', protect, authorize('super_admin', 'admin'), hasPermission('view_reports'), occupancyReport);
router.get('/employees', protect, authorize('super_admin', 'admin'), hasPermission('view_reports'), employeeReport);

module.exports = router;
