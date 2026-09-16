const express = require('express');
const router = express.Router();
const {
  getAllItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  getLowStock,
  getSuppliers,
  createSupplier,
} = require('../controllers/inventoryController');
const { protect, authorize } = require('../middleware/auth');
const { hasPermission } = require('../middleware/rbac');
const {
  inventoryValidation,
  supplierValidation,
} = require('../middleware/validate');
const { auditMiddleware } = require('../middleware/auditLog');

router.get('/low-stock/admin', protect, authorize('super_admin', 'admin'), hasPermission('manage_inventory'), getLowStock);
router.get('/suppliers/admin', protect, authorize('super_admin', 'admin'), hasPermission('manage_inventory'), getSuppliers);
router.post('/suppliers/admin', protect, authorize('super_admin', 'admin'), hasPermission('manage_inventory'), supplierValidation, auditMiddleware('create_supplier'), createSupplier);

router.get('/', protect, authorize('super_admin', 'admin'), hasPermission('manage_inventory'), getAllItems);
router.get('/:id', protect, authorize('super_admin', 'admin'), hasPermission('manage_inventory'), getItemById);

router.post('/', protect, authorize('super_admin', 'admin'), hasPermission('manage_inventory'), inventoryValidation, auditMiddleware('create_inventory_item'), createItem);
router.put('/:id', protect, authorize('super_admin', 'admin'), hasPermission('manage_inventory'), inventoryValidation, auditMiddleware('update_inventory_item'), updateItem);
router.delete('/:id', protect, authorize('super_admin', 'admin'), hasPermission('manage_inventory'), auditMiddleware('delete_inventory_item'), deleteItem);

module.exports = router;
