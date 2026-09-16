const express = require('express');
const router = express.Router();
const {
  clockIn,
  clockOut,
  getMyStatus,
  getAllAttendance,
  getAttendanceStats,
  getAttendancePhoto,
} = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/auth');
const { hasPermission } = require('../middleware/rbac');
const {
  uploadAttendancePhoto,
  handleUploadError,
  validateUploadedImages,
} = require('../middleware/upload');
const { auditMiddleware } = require('../middleware/auditLog');

const STAFF_ROLES = ['super_admin', 'admin', 'receptionist', 'housekeeping', 'restaurant_staff', 'manager'];

router.get('/photo/:filename', protect, authorize(...STAFF_ROLES), getAttendancePhoto);

router.post(
  '/clock-in',
  protect,
  authorize(...STAFF_ROLES),
  uploadAttendancePhoto,
  handleUploadError,
  validateUploadedImages,
  auditMiddleware('clock_in_attendance'),
  clockIn
);

router.post(
  '/clock-out',
  protect,
  authorize(...STAFF_ROLES),
  uploadAttendancePhoto,
  handleUploadError,
  validateUploadedImages,
  auditMiddleware('clock_out_attendance'),
  clockOut
);

router.get('/my-status', protect, authorize(...STAFF_ROLES), getMyStatus);

router.get('/admin/stats', protect, authorize('super_admin', 'admin'), hasPermission('manage_employees'), getAttendanceStats);

router.get('/admin', protect, authorize('super_admin', 'admin'), hasPermission('manage_employees'), getAllAttendance);

module.exports = router;
