const { query, queryOne, insert, execute } = require('../config/database');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { getPagination, paginationResponse } = require('../utils/helpers');

const getProfile = asyncHandler(async (req, res) => {
  const user = await queryOne(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.address,
            u.city, u.state, u.country, u.zip_code, u.profile_photo,
            u.is_active, u.is_verified, u.last_login, u.created_at,
            r.name AS role_name
     FROM users u LEFT JOIN roles r ON u.role_id = r.id
     WHERE u.id = ?`,
    [req.user.id]
  );

  if (!user) {
    throw new ApiError('User not found', 404);
  }

  res.status(200).json({
    success: true,
    data: { user },
  });
});

const updateProfile = asyncHandler(async (req, res) => {
  const { firstName, lastName, phone, address, city, state, country, zipCode } = req.body;

  const fields = [];
  const values = [];

  if (firstName !== undefined) { fields.push('first_name = ?'); values.push(firstName); }
  if (lastName !== undefined) { fields.push('last_name = ?'); values.push(lastName); }
  if (phone !== undefined) { fields.push('phone = ?'); values.push(phone); }
  if (address !== undefined) { fields.push('address = ?'); values.push(address); }
  if (city !== undefined) { fields.push('city = ?'); values.push(city); }
  if (state !== undefined) { fields.push('state = ?'); values.push(state); }
  if (country !== undefined) { fields.push('country = ?'); values.push(country); }
  if (zipCode !== undefined) { fields.push('zip_code = ?'); values.push(zipCode); }

  if (fields.length === 0) {
    throw new ApiError('No fields to update', 400);
  }

  values.push(req.user.id);
  await execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);

  const user = await queryOne(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.address,
            u.city, u.state, u.country, u.zip_code, u.profile_photo,
            r.name AS role_name
     FROM users u LEFT JOIN roles r ON u.role_id = r.id
     WHERE u.id = ?`,
    [req.user.id]
  );

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: { user },
  });
});

const uploadPhoto = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError('Please upload an image file', 400);
  }

  const photoPath = `/uploads/${req.file.filename}`;
  await execute('UPDATE users SET profile_photo = ? WHERE id = ?', [photoPath, req.user.id]);

  const user = await queryOne(
    'SELECT id, first_name, last_name, email, profile_photo FROM users WHERE id = ?',
    [req.user.id]
  );

  res.status(200).json({
    success: true,
    message: 'Photo uploaded successfully',
    data: { user },
  });
});

const getAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = '', role = '' } = req.query;
  const { page: p, limit: l, offset } = getPagination(page, limit);

  let whereClause = 'WHERE 1=1';
  const params = [];

  if (search) {
    whereClause += ' AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  if (role) {
    whereClause += ' AND r.name = ?';
    params.push(role);
  }

  const countResult = await queryOne(
    `SELECT COUNT(*) AS total FROM users u LEFT JOIN roles r ON u.role_id = r.id ${whereClause}`,
    params
  );

  const users = await query(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.city, u.country,
            u.profile_photo, u.is_active, u.is_verified, u.last_login, u.created_at,
            r.name AS role_name
     FROM users u LEFT JOIN roles r ON u.role_id = r.id
     ${whereClause}
     ORDER BY u.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, l, offset]
  );

  res.status(200).json({
    success: true,
    data: {
      users,
      pagination: paginationResponse(countResult.total, p, l),
    },
  });
});

const getUserById = asyncHandler(async (req, res) => {
  const user = await queryOne(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.address,
            u.city, u.state, u.country, u.zip_code, u.profile_photo,
            u.is_active, u.is_verified, u.last_login, u.created_at,
            r.name AS role_name
     FROM users u LEFT JOIN roles r ON u.role_id = r.id
     WHERE u.id = ?`,
    [req.params.id]
  );

  if (!user) {
    throw new ApiError('User not found', 404);
  }

  const bookingCount = await queryOne(
    'SELECT COUNT(*) AS total FROM bookings WHERE user_id = ?',
    [req.params.id]
  );

  res.status(200).json({
    success: true,
    data: {
      user,
      bookingCount: bookingCount.total,
    },
  });
});

const updateUser = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, phone, roleId, isActive, address, city, state, country, zipCode } = req.body;

  const existing = await queryOne(
    `SELECT u.id, u.is_active, r.name AS role_name
     FROM users u LEFT JOIN roles r ON u.role_id = r.id
     WHERE u.id = ?`,
    [req.params.id]
  );
  if (!existing) {
    throw new ApiError('User not found', 404);
  }

  // Security: role escalation guards
  const isSelf = existing.id === req.user.id;
  const targetRole = existing.role_name;
  const requesterRole = req.user.role;

  if (roleId !== undefined) {
    const newRole = await queryOne('SELECT name FROM roles WHERE id = ?', [roleId]);
    if (!newRole) {
      throw new ApiError('Invalid role', 400);
    }
    // Only super_admin may assign super_admin or admin roles
    if (['super_admin', 'admin'].includes(newRole.name) && requesterRole !== 'super_admin') {
      throw new ApiError('Only a super admin can assign admin or super admin roles.', 403);
    }
    // Cannot change your own role
    if (isSelf) {
      throw new ApiError('You cannot change your own role.', 403);
    }
    // Non-super-admin cannot modify a super admin account
    if (targetRole === 'super_admin' && requesterRole !== 'super_admin') {
      throw new ApiError('Only a super admin can modify super admin accounts.', 403);
    }
  }

  // Security: admins cannot deactivate themselves
  if (isSelf && isActive === false) {
    throw new ApiError('You cannot deactivate your own account.', 403);
  }

  if (email) {
    const emailTaken = await queryOne('SELECT id FROM users WHERE email = ? AND id != ?', [email, req.params.id]);
    if (emailTaken) {
      throw new ApiError('Email already in use', 400);
    }
  }

  const fields = [];
  const values = [];

  if (firstName !== undefined) { fields.push('first_name = ?'); values.push(firstName); }
  if (lastName !== undefined) { fields.push('last_name = ?'); values.push(lastName); }
  if (email !== undefined) { fields.push('email = ?'); values.push(email); }
  if (phone !== undefined) { fields.push('phone = ?'); values.push(phone); }
  if (roleId !== undefined) { fields.push('role_id = ?'); values.push(roleId); }
  if (isActive !== undefined) { fields.push('is_active = ?'); values.push(isActive ? 1 : 0); }
  if (address !== undefined) { fields.push('address = ?'); values.push(address); }
  if (city !== undefined) { fields.push('city = ?'); values.push(city); }
  if (state !== undefined) { fields.push('state = ?'); values.push(state); }
  if (country !== undefined) { fields.push('country = ?'); values.push(country); }
  if (zipCode !== undefined) { fields.push('zip_code = ?'); values.push(zipCode); }

  if (fields.length === 0) {
    throw new ApiError('No fields to update', 400);
  }

  values.push(req.params.id);
  await execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);

  const user = await queryOne(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.phone,
            u.is_active, u.is_verified, u.created_at,
            r.name AS role_name
     FROM users u LEFT JOIN roles r ON u.role_id = r.id
     WHERE u.id = ?`,
    [req.params.id]
  );

  res.status(200).json({
    success: true,
    message: 'User updated successfully',
    data: { user },
  });
});

const deleteUser = asyncHandler(async (req, res) => {
  const user = await queryOne(
    `SELECT u.id, u.email, r.name AS role_name
     FROM users u LEFT JOIN roles r ON u.role_id = r.id
     WHERE u.id = ?`,
    [req.params.id]
  );
  if (!user) {
    throw new ApiError('User not found', 404);
  }

  // Cannot delete your own account
  if (user.id === req.user.id) {
    throw new ApiError('You cannot delete your own account.', 403);
  }

  // Only super_admin may delete super admin or admin accounts
  if (['super_admin', 'admin'].includes(user.role_name) && req.user.role !== 'super_admin') {
    throw new ApiError('Only a super admin can delete admin or super admin accounts.', 403);
  }

  const hasBookings = await queryOne(
    "SELECT COUNT(*) AS total FROM bookings WHERE user_id = ? AND status IN ('pending', 'confirmed')",
    [req.params.id]
  );

  if (hasBookings.total > 0) {
    throw new ApiError('Cannot delete user with active bookings', 400);
  }

  await execute('DELETE FROM users WHERE id = ?', [req.params.id]);

  res.status(200).json({
    success: true,
    message: 'User deleted successfully',
  });
});

const getUserStats = asyncHandler(async (req, res) => {
  const total = await queryOne('SELECT COUNT(*) AS total FROM users');
  const active = await queryOne('SELECT COUNT(*) AS total FROM users WHERE is_active = 1');
  const verified = await queryOne('SELECT COUNT(*) AS total FROM users WHERE is_verified = 1');
  const newThisMonth = await queryOne(
    "SELECT COUNT(*) AS total FROM users WHERE created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')"
  );
  const byRole = await query(
    `SELECT r.name AS role, COUNT(u.id) AS count
     FROM users u LEFT JOIN roles r ON u.role_id = r.id
     GROUP BY r.name`
  );
  const recentRegistrations = await query(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.created_at, r.name AS role_name
     FROM users u LEFT JOIN roles r ON u.role_id = r.id
     ORDER BY u.created_at DESC LIMIT 10`
  );

  res.status(200).json({
    success: true,
    data: {
      total: total.total,
      active: active.total,
      verified: verified.total,
      newThisMonth: newThisMonth.total,
      byRole,
      recentRegistrations,
    },
  });
});

module.exports = {
  getProfile,
  updateProfile,
  uploadPhoto,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUserStats,
};
