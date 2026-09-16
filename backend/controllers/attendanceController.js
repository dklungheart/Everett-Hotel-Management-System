const { query, queryOne, insert, execute } = require('../config/database');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { getPagination, paginationResponse } = require('../utils/helpers');
const path = require('path');
const fs = require('fs');

const STAFF_ROLES = ['receptionist', 'housekeeping', 'restaurant_staff', 'manager'];

const ATTENDANCE_DIR = path.join(__dirname, '../uploads/attendance');

function photoUrl(file) {
  return file && file.filename ? `/uploads/attendance/${file.filename}` : null;
}

/**
 * Serve a private attendance photo. Access control:
 * - staff viewing their own photo
 * - admin/super_admin (any photo)
 * - manager (any photo)
 */
const getAttendancePhoto = asyncHandler(async (req, res) => {
  const { filename } = req.params;

  if (!filename || /\.\./.test(filename) || filename.includes('/') || filename.includes('\\')) {
    throw new ApiError('Invalid photo filename', 400);
  }

  const filePath = path.join(ATTENDANCE_DIR, filename);

  if (!fs.existsSync(filePath)) {
    throw new ApiError('Photo not found', 404);
  }

  const record = await queryOne(
    `SELECT a.id, a.employee_id, a.clock_in_photo, a.clock_out_photo,
            e.user_id AS employee_user_id
     FROM attendance a
     JOIN employees e ON a.employee_id = e.id
     WHERE a.clock_in_photo = ? OR a.clock_out_photo = ?`,
    [`/uploads/attendance/${filename}`, `/uploads/attendance/${filename}`]
  );

  const isAdmin = ['super_admin', 'admin', 'manager'].includes(req.user.role);
  const isOwner = record && record.employee_user_id === req.user.id;

  if (!isAdmin && !isOwner) {
    throw new ApiError('You are not authorized to view this photo', 403);
  }

  const ext = path.extname(filename).toLowerCase();
  const contentType =
    ext === '.png' ? 'image/png' :
    ext === '.gif' ? 'image/gif' :
    ext === '.webp' ? 'image/webp' : 'image/jpeg';

  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(filePath);
});

async function getEmployeeByUser(userId) {
  return queryOne(
    `SELECT e.id, e.employee_code, e.department, e.position, e.shift_start, e.shift_end, e.status,
            u.profile_photo
     FROM employees e
     JOIN users u ON e.user_id = u.id
     WHERE e.user_id = ?`,
    [userId]
  );
}

async function getGeofenceConfig() {
  const rows = await query(
    `SELECT setting_key, setting_value FROM system_settings
     WHERE setting_key IN ('hotel_latitude', 'hotel_longitude', 'geofence_radius_meters', 'attendance_block_remote')`
  );
  const cfg = { latitude: null, longitude: null, radiusMeters: 500, blockRemote: false };
  rows.forEach((r) => {
    if (r.setting_key === 'hotel_latitude') cfg.latitude = parseFloat(r.setting_value);
    else if (r.setting_key === 'hotel_longitude') cfg.longitude = parseFloat(r.setting_value);
    else if (r.setting_key === 'geofence_radius_meters') cfg.radiusMeters = parseFloat(r.setting_value) || 500;
    else if (r.setting_key === 'attendance_block_remote') cfg.blockRemote = String(r.setting_value).toLowerCase() === 'true';
  });
  return cfg;
}

function haversineMeters(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const first = String(forwarded).split(',')[0].trim();
    if (first) return first;
  }
  return req.ip || req.socket?.remoteAddress || null;
}

/**
 * Validate a clock-in/out location against the hotel geofence.
 * - If geofence not configured (no lat/lng), allow silently (remote=0).
 * - If coordinates missing, treat as remote (unverifiable).
 * - If out of radius: block when blockRemote is true, else flag is_remote=1.
 */
async function validateLocation(req) {
  const cfg = await getGeofenceConfig();
  const lat = req.body.latitude !== undefined && req.body.latitude !== '' ? parseFloat(req.body.latitude) : NaN;
  const lng = req.body.longitude !== undefined && req.body.longitude !== '' ? parseFloat(req.body.longitude) : NaN;
  const ip = getClientIp(req);

  if (isNaN(cfg.latitude) || isNaN(cfg.longitude)) {
    return { latitude: null, longitude: null, ip, isRemote: 0, distanceMeters: null };
  }

  if (isNaN(lat) || isNaN(lng)) {
    return { latitude: null, longitude: null, ip, isRemote: 1, distanceMeters: null };
  }

  const distance = haversineMeters(cfg.latitude, cfg.longitude, lat, lng);
  const isRemote = distance > cfg.radiusMeters ? 1 : 0;

  if (isRemote && cfg.blockRemote) {
    throw new ApiError(
      `Clock-in is only allowed within ${cfg.radiusMeters}m of the hotel (you are ${distance}m away).`,
      403
    );
  }

  return { latitude: lat, longitude: lng, ip, isRemote, distanceMeters: distance };
}

async function getTodayRecord(employeeId) {
  return queryOne(
    `SELECT a.*, e.shift_start, e.shift_end
     FROM attendance a
     JOIN employees e ON a.employee_id = e.id
     WHERE a.employee_id = ? AND a.work_date = CURDATE()`,
    [employeeId]
  );
}

const clockIn = asyncHandler(async (req, res) => {
  const employee = await getEmployeeByUser(req.user.id);
  if (!employee) {
    throw new ApiError('No employee profile is linked to your account.', 403);
  }
  if (employee.status !== 'active') {
    throw new ApiError('Your employee account is not active. Contact an administrator.', 403);
  }

  const existing = await getTodayRecord(employee.id);
  if (existing && existing.clock_in) {
    throw new ApiError('You have already clocked in for today.', 400);
  }

  const photo = photoUrl(req.file);
  let lateMinutes = 0;
  if (employee.shift_start) {
    lateMinutes = Math.max(0, Math.floor((new Date().getTime() - new Date(`1970-01-01T${employee.shift_start}:00`).getTime()) / 60000));
  }

  const geo = await validateLocation(req);

  const id = await insert(
    `INSERT INTO attendance (employee_id, work_date, clock_in, clock_in_photo,
       clock_in_lat, clock_in_lng, clock_in_ip, is_remote, method, status, late_minutes)
     VALUES (?, CURDATE(), NOW(), ?, ?, ?, ?, ?, 'face_photo', ?, ?)`,
    [employee.id, photo, geo.latitude, geo.longitude, geo.ip, geo.isRemote, lateMinutes > 0 ? 'late' : 'present', lateMinutes]
  );

  const record = await queryOne(
    `SELECT a.* FROM attendance a WHERE a.id = ?`,
    [id]
  );

  res.status(201).json({
    success: true,
    message: lateMinutes > 0
      ? `Clocked in successfully. You are ${lateMinutes} min late.`
      : 'Clocked in successfully. Welcome!',
    data: { attendance: record, employee },
  });
});

const clockOut = asyncHandler(async (req, res) => {
  const employee = await getEmployeeByUser(req.user.id);
  if (!employee) {
    throw new ApiError('No employee profile is linked to your account.', 403);
  }

  const record = await getTodayRecord(employee.id);
  if (!record || !record.clock_in) {
    throw new ApiError('You have not clocked in for today.', 400);
  }
  if (record.clock_out) {
    throw new ApiError('You have already clocked out for today.', 400);
  }

  const photo = photoUrl(req.file);

  let earlyLeaveMinutes = 0;
  if (employee.shift_end) {
    earlyLeaveMinutes = Math.max(0, Math.floor((new Date(`1970-01-01T${employee.shift_end}:00`).getTime() - new Date().getTime()) / 60000));
  }

  const geo = await validateLocation(req);

  const totalHours = await queryOne(
    `SELECT TIMESTAMPDIFF(MINUTE, clock_in, NOW()) / 60.0 AS hours FROM attendance WHERE id = ?`,
    [record.id]
  );

  await execute(
    `UPDATE attendance
     SET clock_out = NOW(), clock_out_photo = ?, clock_out_lat = ?, clock_out_lng = ?,
         clock_out_ip = ?, is_remote = CASE WHEN is_remote = 1 OR ? = 1 THEN 1 ELSE 0 END,
         early_leave_minutes = ?,
         total_hours = ?, status = CASE WHEN status = 'late' THEN 'late' ELSE 'present' END
     WHERE id = ?`,
    [photo, geo.latitude, geo.longitude, geo.ip, geo.isRemote, earlyLeaveMinutes, totalHours ? Math.round(totalHours.hours * 100) / 100 : null, record.id]
  );

  const updated = await queryOne(
    `SELECT a.* FROM attendance a WHERE a.id = ?`,
    [record.id]
  );

  res.status(200).json({
    success: true,
    message: 'Clocked out successfully. Have a great rest of your day!',
    data: { attendance: updated, employee },
  });
});

const getMyStatus = asyncHandler(async (req, res) => {
  const employee = await getEmployeeByUser(req.user.id);
  if (!employee) {
    throw new ApiError('No employee profile is linked to your account.', 403);
  }

  const today = await getTodayRecord(employee.id);
  const week = await query(
    `SELECT a.id, a.work_date, a.clock_in, a.clock_out, a.status, a.total_hours, a.late_minutes, a.early_leave_minutes
     FROM attendance a
     WHERE a.employee_id = ? AND a.work_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
     ORDER BY a.work_date DESC`,
    [employee.id]
  );

  res.status(200).json({
    success: true,
    data: { employee, today, week },
  });
});

const getAllAttendance = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    date = '',
    startDate = '',
    endDate = '',
    employee = '',
    department = '',
    status = '',
  } = req.query;
  const { page: p, limit: l, offset } = getPagination(page, limit);

  let whereClause = 'WHERE 1=1';
  const params = [];

  if (date) {
    whereClause += ' AND a.work_date = ?';
    params.push(date);
  }
  if (startDate && endDate) {
    whereClause += ' AND a.work_date BETWEEN ? AND ?';
    params.push(startDate, endDate);
  }
  if (employee) {
    whereClause += ' AND (u.first_name LIKE ? OR u.last_name LIKE ? OR e.employee_code LIKE ?)';
    const s = `%${employee}%`;
    params.push(s, s, s);
  }
  if (department) {
    whereClause += ' AND e.department = ?';
    params.push(department);
  }
  if (status) {
    whereClause += ' AND a.status = ?';
    params.push(status);
  }
  if (req.query.remote === '1' || req.query.remote === '0') {
    whereClause += ' AND a.is_remote = ?';
    params.push(Number(req.query.remote));
  }

  const countResult = await queryOne(
    `SELECT COUNT(*) AS total FROM attendance a
     JOIN employees e ON a.employee_id = e.id
     JOIN users u ON e.user_id = u.id ${whereClause}`,
    params
  );

  const records = await query(
    `SELECT a.id, a.work_date, a.clock_in, a.clock_out, a.clock_in_photo, a.clock_out_photo,
            a.method, a.status, a.late_minutes, a.early_leave_minutes, a.total_hours, a.notes,
            a.clock_in_lat, a.clock_in_lng, a.clock_out_lat, a.clock_out_lng,
            a.clock_in_ip, a.clock_out_ip, a.is_remote,
            e.employee_code, e.department, e.position, e.shift_start, e.shift_end,
            u.first_name, u.last_name, u.email, u.profile_photo
     FROM attendance a
     JOIN employees e ON a.employee_id = e.id
     JOIN users u ON e.user_id = u.id
     ${whereClause}
     ORDER BY a.work_date DESC, a.clock_in DESC
     LIMIT ? OFFSET ?`,
    [...params, l, offset]
  );

  res.status(200).json({
    success: true,
    data: { records, pagination: paginationResponse(countResult.total, p, l) },
  });
});

const getAttendanceStats = asyncHandler(async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);

  const totalEmployees = await queryOne('SELECT COUNT(*) AS total FROM employees WHERE status = \'active\'');

  const today = await queryOne(
    `SELECT COUNT(*) AS total FROM attendance WHERE work_date = ?`,
    [date]
  );

  const present = await queryOne(
    `SELECT COUNT(*) AS total FROM attendance WHERE work_date = ? AND status IN ('present', 'late')`,
    [date]
  );

  const onTime = await queryOne(
    `SELECT COUNT(*) AS total FROM attendance WHERE work_date = ? AND status = 'present'`,
    [date]
  );

  const late = await queryOne(
    `SELECT COUNT(*) AS total FROM attendance WHERE work_date = ? AND status = 'late'`,
    [date]
  );

  const notClocked = Math.max(0, totalEmployees.total - today.total);

  const departments = await query(
    `SELECT e.department, COUNT(a.id) AS clocked
     FROM employees e
     LEFT JOIN attendance a ON a.employee_id = e.id AND a.work_date = ?
     WHERE e.status = 'active'
     GROUP BY e.department`,
    [date]
  );

  res.status(200).json({
    success: true,
    data: {
      date,
      totalEmployees: totalEmployees.total,
      clockedIn: today.total,
      present: present.total,
      onTime: onTime.total,
      late: late.total,
      absent: notClocked,
      departments,
    },
  });
});

module.exports = {
  clockIn,
  clockOut,
  getMyStatus,
  getAllAttendance,
  getAttendanceStats,
  getAttendancePhoto,
};
