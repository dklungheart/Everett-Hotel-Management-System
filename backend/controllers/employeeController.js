const { query, queryOne, insert, execute } = require('../config/database');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { getPagination, paginationResponse, generateEmployeeCode } = require('../utils/helpers');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const getAllEmployees = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = '', department = '', status = '' } = req.query;
  const { page: p, limit: l, offset } = getPagination(page, limit);

  let whereClause = 'WHERE 1=1';
  const params = [];

  if (search) {
    whereClause += ' AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR e.employee_code LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }

  if (department) {
    whereClause += ' AND e.department = ?';
    params.push(department);
  }

  if (status) {
    whereClause += ' AND e.status = ?';
    params.push(status);
  }

  const countResult = await queryOne(
    `SELECT COUNT(*) AS total FROM employees e JOIN users u ON e.user_id = u.id ${whereClause}`,
    params
  );

  const employees = await query(
    `SELECT e.id, e.employee_code, e.department, e.position, e.hire_date,
            e.salary, e.shift_start, e.shift_end, e.status,
            e.emergency_contact_name, e.emergency_contact_phone,
            u.first_name, u.last_name, u.email, u.phone, u.profile_photo
     FROM employees e
     JOIN users u ON e.user_id = u.id
     ${whereClause}
     ORDER BY e.hire_date DESC
     LIMIT ? OFFSET ?`,
    [...params, l, offset]
  );

  res.status(200).json({
    success: true,
    data: {
      employees,
      pagination: paginationResponse(countResult.total, p, l),
    },
  });
});

const getEmployeeById = asyncHandler(async (req, res) => {
  const employee = await queryOne(
    `SELECT e.id, e.employee_code, e.department, e.position, e.hire_date,
            e.salary, e.shift_start, e.shift_end, e.status,
            e.emergency_contact_name, e.emergency_contact_phone,
            u.first_name, u.last_name, u.email, u.phone, u.profile_photo
     FROM employees e
     JOIN users u ON e.user_id = u.id
     WHERE e.id = ?`,
    [req.params.id]
  );

  if (!employee) {
    throw new ApiError('Employee not found', 404);
  }

  const taskCount = await queryOne(
    `SELECT COUNT(*) AS total FROM housekeeping
     WHERE assigned_to = ? AND status != 'completed'`,
    [req.params.id]
  );

  res.status(200).json({
    success: true,
    data: {
      employee,
      pendingTasks: taskCount.total,
    },
  });
});

const createEmployee = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, phone, department, position, hireDate, salary,
    emergencyContact, emergencyPhone, role, password } = req.body;

  const existingEmail = await queryOne('SELECT id FROM users WHERE email = ?', [email]);
  if (existingEmail) {
    throw new ApiError('Email already registered', 400);
  }

  const roleIds = {
    admin: 1,
    customer: 2,
    receptionist: 3,
    housekeeping: 4,
    restaurant_staff: 5,
    manager: 6,
    super_admin: 7,
  };
  const roleName = (role || 'employee').toLowerCase();
  if (roleName === 'super_admin' && req.user.role !== 'super_admin') {
    throw new ApiError('Only a super admin can create super admin accounts', 403);
  }
  if (!(roleName in roleIds)) {
    throw new ApiError('Invalid role. Allowed: admin, manager, receptionist, housekeeping, restaurant_staff', 400);
  }
  const roleId = roleIds[roleName];

  const tempPassword = await bcrypt.hash(password || 'Welcome@123', 10);
  const profilePhoto = req.file ? `/uploads/${req.file.filename}` : null;
  const userId = await insert(
    `INSERT INTO users (first_name, last_name, email, phone, role_id, password_hash, is_verified, profile_photo)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
    [firstName, lastName, email, phone || null, roleId, tempPassword, profilePhoto]
  );

  const employeeId = await insert(
    `INSERT INTO employees (user_id, employee_code, department, position, hire_date, salary,
      emergency_contact_name, emergency_contact_phone, status)
     VALUES (?, 'PENDING', ?, ?, ?, ?, ?, ?, 'active')`,
    [userId, department || null, position || null, hireDate || null, salary || null,
      emergencyContact || null, emergencyPhone || null]
  );

  const employeeCode = generateEmployeeCode(employeeId);
  await execute('UPDATE employees SET employee_code = ? WHERE id = ?', [employeeCode, employeeId]);

  const employee = await queryOne(
    `SELECT e.id, e.employee_code, e.department, e.position, e.hire_date,
            e.salary, e.shift_start, e.shift_end, e.status,
            e.emergency_contact_name, e.emergency_contact_phone,
            u.first_name, u.last_name, u.email, u.phone, u.role_id, u.profile_photo,
            r.name AS role_name
     FROM employees e
     JOIN users u ON e.user_id = u.id
     LEFT JOIN roles r ON u.role_id = r.id
     WHERE e.id = ?`,
    [employeeId]
  );

  res.status(201).json({
    success: true,
    message: 'Employee created successfully',
    data: { employee },
  });
});

const updateEmployee = asyncHandler(async (req, res) => {
  const existing = await queryOne(
    'SELECT e.id, e.user_id FROM employees e WHERE e.id = ?',
    [req.params.id]
  );
  if (!existing) {
    throw new ApiError('Employee not found', 404);
  }

  const { firstName, lastName, email, phone, department, position, salary,
    emergencyContact, emergencyPhone, shiftStart, shiftEnd, status } = req.body;

  if (req.file) {
    const oldPhoto = await queryOne(
      'SELECT profile_photo FROM users WHERE id = ?',
      [existing.user_id]
    );
    const newPath = `/uploads/${req.file.filename}`;
    await execute('UPDATE users SET profile_photo = ? WHERE id = ?', [newPath, existing.user_id]);
    if (oldPhoto && oldPhoto.profile_photo && oldPhoto.profile_photo !== newPath) {
      const oldFile = path.join(__dirname, '..', oldPhoto.profile_photo.replace('/uploads/', 'uploads/'));
      try { fs.unlinkSync(oldFile); } catch (e) { /* ignore missing file */ }
    }
  }

  if (email) {
    const emailTaken = await queryOne(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [email, existing.user_id]
    );
    if (emailTaken) {
      throw new ApiError('Email already in use', 400);
    }
  }

  const userFields = [];
  const userValues = [];

  if (firstName !== undefined) { userFields.push('first_name = ?'); userValues.push(firstName); }
  if (lastName !== undefined) { userFields.push('last_name = ?'); userValues.push(lastName); }
  if (email !== undefined) { userFields.push('email = ?'); userValues.push(email); }
  if (phone !== undefined) { userFields.push('phone = ?'); userValues.push(phone); }

  if (userFields.length > 0) {
    userValues.push(existing.user_id);
    await execute(`UPDATE users SET ${userFields.join(', ')} WHERE id = ?`, userValues);
  }

  const empFields = [];
  const empValues = [];

  if (department !== undefined) { empFields.push('department = ?'); empValues.push(department); }
  if (position !== undefined) { empFields.push('position = ?'); empValues.push(position); }
  if (salary !== undefined) { empFields.push('salary = ?'); empValues.push(salary); }
  if (shiftStart !== undefined) { empFields.push('shift_start = ?'); empValues.push(shiftStart); }
  if (shiftEnd !== undefined) { empFields.push('shift_end = ?'); empValues.push(shiftEnd); }
  if (status !== undefined) { empFields.push('status = ?'); empValues.push(status); }
  if (emergencyContact !== undefined) { empFields.push('emergency_contact_name = ?'); empValues.push(emergencyContact); }
  if (emergencyPhone !== undefined) { empFields.push('emergency_contact_phone = ?'); empValues.push(emergencyPhone); }

  if (empFields.length > 0) {
    empValues.push(req.params.id);
    await execute(`UPDATE employees SET ${empFields.join(', ')} WHERE id = ?`, empValues);
  }

  if (userFields.length === 0 && empFields.length === 0) {
    throw new ApiError('No fields to update', 400);
  }

  const employee = await queryOne(
    `SELECT e.id, e.employee_code, e.department, e.position, e.hire_date,
            e.salary, e.shift_start, e.shift_end, e.status,
            e.emergency_contact_name, e.emergency_contact_phone,
            u.first_name, u.last_name, u.email, u.phone, u.profile_photo
     FROM employees e
     JOIN users u ON e.user_id = u.id
     WHERE e.id = ?`,
    [req.params.id]
  );

  res.status(200).json({
    success: true,
    message: 'Employee updated successfully',
    data: { employee },
  });
});

const deleteEmployee = asyncHandler(async (req, res) => {
  const employee = await queryOne(
    'SELECT e.id, e.user_id FROM employees e WHERE e.id = ?',
    [req.params.id]
  );
  if (!employee) {
    throw new ApiError('Employee not found', 404);
  }

  const activeTasks = await queryOne(
    `SELECT COUNT(*) AS total FROM housekeeping
     WHERE assigned_to = ? AND status IN ('pending', 'in_progress')`,
    [req.params.id]
  );

  if (activeTasks.total > 0) {
    throw new ApiError('Cannot delete employee with active tasks', 400);
  }

  const user = await queryOne(
    'SELECT profile_photo FROM users WHERE id = ?',
    [employee.user_id]
  );
  if (user && user.profile_photo) {
    const filePath = path.join(__dirname, '..', user.profile_photo.replace('/uploads/', 'uploads/'));
    try { fs.unlinkSync(filePath); } catch (e) { /* ignore missing file */ }
  }

  await execute('DELETE FROM employees WHERE id = ?', [req.params.id]);
  await execute('DELETE FROM users WHERE id = ?', [employee.user_id]);

  res.status(200).json({
    success: true,
    message: 'Employee deleted successfully',
  });
});

const getEmployeeStats = asyncHandler(async (req, res) => {
  const total = await queryOne('SELECT COUNT(*) AS total FROM employees');
  const active = await queryOne(
    "SELECT COUNT(*) AS total FROM employees WHERE status = 'active'"
  );
  const byDepartment = await query(
    `SELECT department, COUNT(*) AS count
     FROM employees WHERE status = 'active'
     GROUP BY department ORDER BY count DESC`
  );
  const byPosition = await query(
    `SELECT position, COUNT(*) AS count
     FROM employees WHERE status = 'active'
     GROUP BY position ORDER BY count DESC`
  );
  const averageSalary = await queryOne(
    "SELECT ROUND(AVG(salary), 2) AS avg FROM employees WHERE status = 'active'"
  );
  const newThisMonth = await queryOne(
    "SELECT COUNT(*) AS total FROM employees WHERE hire_date >= DATE_FORMAT(NOW(), '%Y-%m-01')"
  );

  res.status(200).json({
    success: true,
    data: {
      total: total.total,
      active: active.total,
      byDepartment,
      byPosition,
      averageSalary: averageSalary.avg || 0,
      newThisMonth: newThisMonth.total,
    },
  });
});

module.exports = {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeeStats,
};
