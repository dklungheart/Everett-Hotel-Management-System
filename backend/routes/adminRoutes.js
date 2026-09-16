const express = require('express');
const router = express.Router();
const {
  adminDashboard,
  getAdminProfile,
  systemHealth,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');
const { hasPermission } = require('../middleware/rbac');

router.get('/dashboard', protect, authorize('super_admin', 'admin'), hasPermission('view_analytics'), adminDashboard);
router.get('/profile', protect, authorize('super_admin', 'admin'), getAdminProfile);
router.get('/health', protect, authorize('super_admin', 'admin'), systemHealth);

module.exports = router;
