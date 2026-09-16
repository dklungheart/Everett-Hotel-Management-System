/**
 * User Model - Everett Hotel Management System
 * Handles all database operations for users
 */

const { query, queryOne, insert, execute, transaction } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  /**
   * Find user by ID
   */
  static async findById(id) {
    return queryOne(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.address,
              u.city, u.state, u.country, u.zip_code, u.profile_photo,
              u.is_active, u.is_verified, u.last_login, u.created_at,
              r.name AS role_name, r.id AS role_id
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [id]
    );
  }

  /**
   * Find user by email
   */
  static async findByEmail(email) {
    return queryOne(
      `SELECT u.*, r.name AS role_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.email = ?`,
      [email]
    );
  }

  /**
   * Create a new user
   */
  static async create(userData) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(userData.password, salt);

    const id = await insert(
      `INSERT INTO users (first_name, last_name, email, password_hash, phone, role_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userData.firstName,
        userData.lastName,
        userData.email,
        passwordHash,
        userData.phone || null,
        userData.roleId || 2,
      ]
    );

    return this.findById(id);
  }

  /**
   * Update user profile
   */
  static async update(id, userData) {
    const fields = [];
    const values = [];

    const allowedFields = [
      'first_name', 'last_name', 'phone', 'address',
      'city', 'state', 'country', 'zip_code', 'profile_photo',
    ];

    for (const field of allowedFields) {
      const camelField = field.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      if (userData[camelField] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(userData[camelField]);
      }
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    await execute(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  /**
   * Update password
   */
  static async updatePassword(id, newPassword) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    await execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, id]);
  }

  /**
   * Verify password
   */
  static async verifyPassword(email, password) {
    const user = await queryOne(
      'SELECT * FROM users WHERE email = ? AND is_active = 1',
      [email]
    );

    if (!user) return null;

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return null;

    return user;
  }

  /**
   * Get all users with pagination
   */
  static async findAll({ page = 1, limit = 10, search = '', role = '' } = {}) {
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (role) {
      whereClause += ' AND r.name = ?';
      params.push(role);
    }

    const countResult = await queryOne(
      `SELECT COUNT(*) AS total FROM users u LEFT JOIN roles r ON u.role_id = r.id ${whereClause}`,
      params
    );

    const offset = (page - 1) * limit;
    const users = await query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.city, u.country,
              u.profile_photo, u.is_active, u.is_verified, u.created_at, u.last_login,
              r.name AS role_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { users, total: countResult.total };
  }

  /**
   * Update last login
   */
  static async updateLastLogin(id) {
    await execute('UPDATE users SET last_login = NOW() WHERE id = ?', [id]);
  }

  /**
   * Set user active status
   */
  static async setActive(id, isActive) {
    await execute('UPDATE users SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, id]);
  }

  /**
   * Set user verified status
   */
  static async setVerified(id) {
    await execute('UPDATE users SET is_verified = 1 WHERE id = ?', [id]);
  }

  /**
   * Delete user
   */
  static async delete(id) {
    return execute('DELETE FROM users WHERE id = ?', [id]);
  }

  /**
   * Count total users
   */
  static async count() {
    const result = await queryOne('SELECT COUNT(*) AS total FROM users');
    return result.total;
  }

  /**
   * Get user statistics
   */
  static async getStats() {
    const total = await this.count();
    const active = await queryOne('SELECT COUNT(*) AS total FROM users WHERE is_active = 1');
    const verified = await queryOne('SELECT COUNT(*) AS total FROM users WHERE is_verified = 1');
    const byRole = await query(
      `SELECT r.name AS role, COUNT(u.id) AS count
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       GROUP BY r.name`
    );

    return {
      total,
      active: active.total,
      verified: verified.total,
      byRole,
    };
  }
}

module.exports = User;
