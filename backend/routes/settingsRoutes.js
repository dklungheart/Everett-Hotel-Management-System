const express = require('express');
const router = express.Router();
const {
  getAllSettings,
  getSettingByKey,
  updateSetting,
  bulkUpdateSettings,
} = require('../controllers/settingsController');
const { protect, authorize } = require('../middleware/auth');
const { hasPermission } = require('../middleware/rbac');
const { auditMiddleware } = require('../middleware/auditLog');

router.get('/', protect, authorize('super_admin', 'admin'), hasPermission('manage_settings'), getAllSettings);
router.get('/:key', protect, authorize('super_admin', 'admin'), hasPermission('manage_settings'), getSettingByKey);

router.put('/:key', protect, authorize('super_admin', 'admin'), hasPermission('manage_settings'), auditMiddleware('update_setting'), updateSetting);
router.put('/bulk', protect, authorize('super_admin', 'admin'), hasPermission('manage_settings'), auditMiddleware('bulk_update_settings'), bulkUpdateSettings);

module.exports = router;
