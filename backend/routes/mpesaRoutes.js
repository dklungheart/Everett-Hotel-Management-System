const express = require('express');
const router = express.Router();
const {
  initiatePayment,
  checkPaymentStatus,
  handleMpesaCallback,
  getMyTransactions,
  getAllTransactions,
  getMpesaStats,
} = require('../controllers/mpesaController');
const { protect, authorize } = require('../middleware/auth');
const { hasPermission } = require('../middleware/rbac');

router.post('/callback', handleMpesaCallback);

router.get('/admin/all', protect, authorize('super_admin', 'admin'), hasPermission('manage_payments'), getAllTransactions);
router.get('/admin/stats', protect, authorize('super_admin', 'admin'), hasPermission('view_analytics'), getMpesaStats);

router.post('/pay', protect, initiatePayment);
router.get('/status/:checkoutRequestId', protect, checkPaymentStatus);
router.get('/my', protect, getMyTransactions);

module.exports = router;
