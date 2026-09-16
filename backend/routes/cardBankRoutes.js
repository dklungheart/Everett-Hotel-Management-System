const express = require('express');
const router = express.Router();
const {
  createCardPaymentIntent,
  confirmCardPayment,
  initiateBankTransfer,
  getBankTransferDetails,
  approveBankTransfer,
} = require('../controllers/cardBankController');
const { protect, authorize } = require('../middleware/auth');
const { hasPermission } = require('../middleware/rbac');

// Card payments
router.post('/card/create-intent', protect, createCardPaymentIntent);
router.post('/card/confirm', protect, confirmCardPayment);

// Bank transfers
router.post('/bank-transfer/initiate', protect, initiateBankTransfer);
router.get('/bank-transfer/details', getBankTransferDetails);

// Admin: approve bank transfer
router.put('/bank-transfer/:id/approve', protect, authorize('super_admin', 'admin'), hasPermission('manage_payments'), approveBankTransfer);

module.exports = router;
