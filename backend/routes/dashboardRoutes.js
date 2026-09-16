const express = require('express');
const router = express.Router();
const {
  getExecutiveDashboard,
  getOccupancyChart,
  getRevenueChart,
} = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/auth');
const { hasPermission } = require('../middleware/rbac');

router.get('/executive', protect, authorize('super_admin', 'admin', 'receptionist', 'housekeeping', 'restaurant_staff', 'manager'), hasPermission('view_dashboard'), getExecutiveDashboard);
router.get('/occupancy', protect, authorize('super_admin', 'admin', 'receptionist', 'housekeeping', 'restaurant_staff', 'manager'), hasPermission('view_dashboard'), getOccupancyChart);
router.get('/revenue', protect, authorize('super_admin', 'admin', 'receptionist', 'housekeeping', 'restaurant_staff', 'manager'), hasPermission('view_dashboard'), getRevenueChart);

module.exports = router;
