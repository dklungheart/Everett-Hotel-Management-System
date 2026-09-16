const express = require('express');
const router = express.Router();
const {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeeStats,
} = require('../controllers/employeeController');
const { protect, authorize } = require('../middleware/auth');
const { hasPermission } = require('../middleware/rbac');
const { employeeValidation } = require('../middleware/validate');
const {
  uploadProfilePhoto,
  handleUploadError,
  validateUploadedImages,
} = require('../middleware/upload');
const { auditMiddleware } = require('../middleware/auditLog');

router.get('/stats/admin', protect, authorize('super_admin', 'admin'), hasPermission('view_analytics'), getEmployeeStats);

router.get('/', protect, authorize('super_admin', 'admin'), hasPermission('manage_employees'), getAllEmployees);
router.get('/:id', protect, authorize('super_admin', 'admin'), hasPermission('manage_employees'), getEmployeeById);
router.post('/', protect, authorize('super_admin', 'admin'), hasPermission('manage_employees'), uploadProfilePhoto, handleUploadError, validateUploadedImages, employeeValidation, auditMiddleware('create_employee'), createEmployee);

router.put('/:id', protect, authorize('super_admin', 'admin'), hasPermission('manage_employees'), uploadProfilePhoto, handleUploadError, validateUploadedImages, employeeValidation, auditMiddleware('update_employee'), updateEmployee);
router.delete('/:id', protect, authorize('super_admin', 'admin'), hasPermission('manage_employees'), auditMiddleware('delete_employee'), deleteEmployee);

module.exports = router;
