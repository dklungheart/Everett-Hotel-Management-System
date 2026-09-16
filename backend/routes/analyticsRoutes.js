const express = require('express');
const router = express.Router();
const {
  dashboardStats,
  revenueAnalytics,
  bookingAnalytics,
  occupancyAnalytics,
  topRooms,
  recentActivity,
} = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/auth');
const { hasPermission } = require('../middleware/rbac');

router.get('/dashboard', protect, authorize('super_admin', 'admin'), hasPermission('view_analytics'), dashboardStats);
router.get('/revenue', protect, authorize('super_admin', 'admin'), hasPermission('view_analytics'), revenueAnalytics);
router.get('/bookings', protect, authorize('super_admin', 'admin'), hasPermission('view_analytics'), bookingAnalytics);
router.get('/occupancy', protect, authorize('super_admin', 'admin'), hasPermission('view_analytics'), occupancyAnalytics);
router.get('/top-rooms', protect, authorize('super_admin', 'admin'), hasPermission('view_analytics'), topRooms);
router.get('/recent-activity', protect, authorize('super_admin', 'admin'), hasPermission('view_analytics'), recentActivity);

module.exports = router;
