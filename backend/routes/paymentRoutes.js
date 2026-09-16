const express = require('express');
const router = express.Router();
const {
  createPayment,
  getMyPayments,
  getPaymentById,
  getAllPayments,
  processRefund,
  getPaymentStats,
  getRevenueReport,
} = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/auth');
const { hasPermission } = require('../middleware/rbac');
const { paymentValidation } = require('../middleware/validate');
const { auditMiddleware } = require('../middleware/auditLog');

router.get('/admin/all', protect, authorize('super_admin', 'admin'), hasPermission('manage_payments'), getAllPayments);
router.put('/admin/:id/refund', protect, authorize('super_admin', 'admin'), hasPermission('manage_payments'), auditMiddleware('process_refund'), processRefund);
router.get('/admin/stats', protect, authorize('super_admin', 'admin'), hasPermission('view_analytics'), getPaymentStats);
router.get('/admin/revenue', protect, authorize('super_admin', 'admin'), hasPermission('view_analytics'), getRevenueReport);

router.post('/', protect, paymentValidation, auditMiddleware('create_payment'), createPayment);
router.get('/my', protect, getMyPayments);
router.get('/:id', protect, getPaymentById);

module.exports = router;
