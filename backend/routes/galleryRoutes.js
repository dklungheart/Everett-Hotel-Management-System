const express = require('express');
const router = express.Router();
const {
  getAllImages,
  getImageById,
  uploadImage,
  updateImage,
  deleteImage,
} = require('../controllers/galleryController');
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const { hasPermission } = require('../middleware/rbac');
const { galleryValidation } = require('../middleware/validate');
const {
  uploadMultiple,
  handleUploadError,
  validateUploadedImages,
} = require('../middleware/upload');
const { auditMiddleware } = require('../middleware/auditLog');

router.get('/', optionalAuth, getAllImages);
router.get('/:id', optionalAuth, getImageById);
router.post('/', protect, authorize('super_admin', 'admin'), hasPermission('manage_gallery'), uploadMultiple, handleUploadError, validateUploadedImages, galleryValidation, auditMiddleware('create_gallery_item'), uploadImage);

router.put('/:id', protect, authorize('super_admin', 'admin'), hasPermission('manage_gallery'), uploadMultiple, handleUploadError, validateUploadedImages, galleryValidation, auditMiddleware('update_gallery_item'), updateImage);
router.delete('/:id', protect, authorize('super_admin', 'admin'), hasPermission('manage_gallery'), auditMiddleware('delete_gallery_item'), deleteImage);

module.exports = router;
