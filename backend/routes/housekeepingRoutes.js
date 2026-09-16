const express = require('express');
const router = express.Router();
const {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  assignTask,
  updateTaskStatus,
  getMyTasks,
} = require('../controllers/housekeepingController');
const { protect, authorize } = require('../middleware/auth');
const { hasPermission } = require('../middleware/rbac');
const { housekeepingValidation } = require('../middleware/validate');
const { auditMiddleware } = require('../middleware/auditLog');

router.get('/my', protect, getMyTasks);

router.get('/', protect, authorize('super_admin', 'admin', 'housekeeping'), hasPermission('manage_housekeeping'), getAllTasks);
router.get('/:id', protect, authorize('super_admin', 'admin', 'housekeeping'), hasPermission('manage_housekeeping'), getTaskById);

router.post('/', protect, authorize('super_admin', 'admin'), hasPermission('manage_housekeeping'), housekeepingValidation, auditMiddleware('create_housekeeping_task'), createTask);
router.put('/:id', protect, authorize('super_admin', 'admin'), hasPermission('manage_housekeeping'), housekeepingValidation, auditMiddleware('update_housekeeping_task'), updateTask);
router.put('/:id/assign', protect, authorize('super_admin', 'admin'), hasPermission('manage_housekeeping'), auditMiddleware('assign_housekeeping_task'), assignTask);
router.put('/:id/status', protect, authorize('super_admin', 'admin', 'housekeeping'), hasPermission('manage_housekeeping'), auditMiddleware('update_housekeeping_status'), updateTaskStatus);

module.exports = router;
