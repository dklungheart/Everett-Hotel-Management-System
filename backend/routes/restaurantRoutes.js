const express = require('express');
const router = express.Router();
const {
  getMenuItems,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  createOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
  getOrderStats,
} = require('../controllers/restaurantController');
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const { hasPermission } = require('../middleware/rbac');
const {
  menuItemValidation,
  orderValidation,
} = require('../middleware/validate');
const {
  uploadMultiple,
  handleUploadError,
  validateUploadedImages,
} = require('../middleware/upload');
const { auditMiddleware } = require('../middleware/auditLog');

router.get('/orders/admin/all', protect, authorize('super_admin', 'admin'), hasPermission('manage_restaurant'), getAllOrders);
router.put('/orders/admin/:id/status', protect, authorize('super_admin', 'admin'), hasPermission('manage_restaurant'), auditMiddleware('update_order_status'), updateOrderStatus);
router.get('/orders/admin/stats', protect, authorize('super_admin', 'admin'), hasPermission('view_analytics'), getOrderStats);

router.get('/menu', optionalAuth, getMenuItems);
router.get('/menu/:id', optionalAuth, getMenuItemById);
router.post('/menu', protect, authorize('super_admin', 'admin'), hasPermission('manage_restaurant'), uploadMultiple, handleUploadError, validateUploadedImages, menuItemValidation, auditMiddleware('create_menu_item'), createMenuItem);
router.put('/menu/:id', protect, authorize('super_admin', 'admin'), hasPermission('manage_restaurant'), uploadMultiple, handleUploadError, validateUploadedImages, menuItemValidation, auditMiddleware('update_menu_item'), updateMenuItem);
router.delete('/menu/:id', protect, authorize('super_admin', 'admin'), hasPermission('manage_restaurant'), auditMiddleware('delete_menu_item'), deleteMenuItem);

router.post('/orders', protect, orderValidation, auditMiddleware('create_order'), createOrder);
router.get('/orders/my', protect, getMyOrders);

module.exports = router;
