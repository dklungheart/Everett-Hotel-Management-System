const express = require('express');
const router = express.Router();
const {
  getMyInvoices,
  getInvoiceById,
  generateInvoice,
  getAllInvoices,
  updateInvoiceStatus,
} = require('../controllers/invoiceController');
const { protect, authorize } = require('../middleware/auth');
const { hasPermission } = require('../middleware/rbac');
const { auditMiddleware } = require('../middleware/auditLog');

router.get('/admin/all', protect, authorize('super_admin', 'admin'), hasPermission('manage_invoices'), getAllInvoices);
router.put('/admin/:id/status', protect, authorize('super_admin', 'admin'), hasPermission('manage_invoices'), auditMiddleware('update_invoice_status'), updateInvoiceStatus);

router.post('/generate/:bookingId', protect, authorize('super_admin', 'admin'), hasPermission('manage_invoices'), auditMiddleware('generate_invoice'), generateInvoice);

router.get('/my', protect, getMyInvoices);
router.get('/:id', protect, getInvoiceById);

module.exports = router;
