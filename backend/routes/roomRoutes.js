const express = require('express');
const router = express.Router();
const {
  getAllRooms,
  getAvailableRooms,
  getCategories,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  createCategory,
  updateCategory,
  deleteCategory,
  getRoomStats,
} = require('../controllers/roomController');
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const { hasPermission } = require('../middleware/rbac');
const {
  roomValidation,
  roomCategoryValidation,
} = require('../middleware/validate');
const {
  uploadMultiple,
  handleUploadError,
  validateUploadedImages,
} = require('../middleware/upload');
const { auditMiddleware } = require('../middleware/auditLog');

router.get('/stats/admin', protect, authorize('super_admin', 'admin'), hasPermission('view_analytics'), getRoomStats);

router.get('/available', optionalAuth, getAvailableRooms);
router.get('/categories', optionalAuth, getCategories);

router.get('/', optionalAuth, getAllRooms);
router.get('/:id', optionalAuth, getRoomById);

router.post('/', protect, authorize('super_admin', 'admin'), hasPermission('manage_rooms'), uploadMultiple, handleUploadError, validateUploadedImages, roomValidation, auditMiddleware('create_room'), createRoom);
router.put('/:id', protect, authorize('super_admin', 'admin'), hasPermission('manage_rooms'), uploadMultiple, handleUploadError, validateUploadedImages, roomValidation, auditMiddleware('update_room'), updateRoom);
router.delete('/:id', protect, authorize('super_admin', 'admin'), hasPermission('manage_rooms'), auditMiddleware('delete_room'), deleteRoom);

router.post('/categories', protect, authorize('super_admin', 'admin'), hasPermission('manage_rooms'), roomCategoryValidation, auditMiddleware('create_room_category'), createCategory);
router.put('/categories/:id', protect, authorize('super_admin', 'admin'), hasPermission('manage_rooms'), roomCategoryValidation, auditMiddleware('update_room_category'), updateCategory);
router.delete('/categories/:id', protect, authorize('super_admin', 'admin'), hasPermission('manage_rooms'), auditMiddleware('delete_room_category'), deleteCategory);

module.exports = router;
