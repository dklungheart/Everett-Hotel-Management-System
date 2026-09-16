const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  uploadPhoto,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUserStats,
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const { hasPermission } = require('../middleware/rbac');
const { changePassword } = require('../controllers/authController');
const { changePasswordValidation } = require('../middleware/validate');
const {
  uploadProfilePhoto,
  handleUploadError,
  validateUploadedImages,
} = require('../middleware/upload');
const { auditMiddleware } = require('../middleware/auditLog');

router.put('/password', protect, changePasswordValidation, auditMiddleware('change_password'), changePassword);

router.get('/stats/admin', protect, authorize('super_admin', 'admin'), hasPermission('view_analytics'), getUserStats);

router.get('/profile', protect, getProfile);
router.put('/profile', protect, auditMiddleware('update_profile'), updateProfile);
router.put('/profile/photo', protect, uploadProfilePhoto, handleUploadError, validateUploadedImages, auditMiddleware('upload_photo'), uploadPhoto);

router.get('/', protect, authorize('super_admin', 'admin'), hasPermission('manage_users'), getAllUsers);
router.get('/:id', protect, authorize('super_admin', 'admin'), hasPermission('manage_users'), getUserById);
router.put('/:id', protect, authorize('super_admin', 'admin'), hasPermission('manage_users'), auditMiddleware('admin_update_user'), updateUser);
router.delete('/:id', protect, authorize('super_admin', 'admin'), hasPermission('manage_users'), auditMiddleware('admin_delete_user'), deleteUser);

module.exports = router;
