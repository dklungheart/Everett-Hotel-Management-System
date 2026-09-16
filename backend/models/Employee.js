/**
 * Employee Model - Everett Hotel Management System
 * Handles all database operations for employees
 */

const { query, queryOne, insert, execute } = require('../config/database');
const { generateEmployeeCode } = require('../utils/helpers');

class Employee {
  /**
   * Find employee by ID with user info
   */
  static async findById(id) {
    return queryOne(
      `SELECT e.*, u.first_name, u.last_name, u.email, u.phone, u.profile_photo,
              u.is_active AS user_active, d.name AS department_name
       FROM employees e
       JOIN users u ON e.user_id = u.id
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE e.id = ?`,
      [id]
    );
  }

  /**
   * Find employee by employee code
   */
  static async findByCode(employeeCode) {
    return queryOne(
      `SELECT e.*, u.first_name, u.last_name, u.email, u.phone, u.profile_photo,
              d.name AS department_name
       FROM employees e
       JOIN users u ON e.user_id = u.id
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE e.employee_code = ?`,
      [employeeCode]
    );
  }

  /**
   * Find employee by user ID
   */
  static async findByUserId(userId) {
    return queryOne(
      `SELECT e.*, u.first_name, u.last_name, u.email, u.phone,
              d.name AS department_name
       FROM employees e
       JOIN users u ON e.user_id = u.id
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE e.user_id = ?`,
      [userId]
    );
  }

  /**
   * Get all employees with filters
   */
  static async findAll({ page = 1, limit = 10, department = '', status = '', search = '' } = {}) {
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (department) {
      whereClause += ' AND d.slug = ?';
      params.push(department);
    }

    if (status === 'active') {
      whereClause += ' AND e.is_active = 1';
    } else if (status === 'inactive') {
      whereClause += ' AND e.is_active = 0';
    }

    if (search) {
      whereClause += ' AND (e.employee_code LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ? OR e.position LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    const countResult = await queryOne(
      `SELECT COUNT(*) AS total FROM employees e
       JOIN users u ON e.user_id = u.id
       LEFT JOIN departments d ON e.department_id = d.id
       ${whereClause}`,
      params
    );

    const offset = (page - 1) * limit;
    const employees = await query(
      `SELECT e.*, u.first_name, u.last_name, u.email, u.phone, u.profile_photo,
              d.name AS department_name
       FROM employees e
       JOIN users u ON e.user_id = u.id
       LEFT JOIN departments d ON e.department_id = d.id
       ${whereClause}
       ORDER BY e.hire_date DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { employees, total: countResult.total };
  }

  /**
   * Create a new employee
   */
  static async create(employeeData) {
    const id = await insert(
      `INSERT INTO employees (user_id, department_id, position, hire_date, salary,
        emergency_contact, emergency_phone, notes, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        employeeData.userId,
        employeeData.departmentId || null,
        employeeData.position,
        employeeData.hireDate || new Date().toISOString().split('T')[0],
        employeeData.salary || null,
        employeeData.emergencyContact || null,
        employeeData.emergencyPhone || null,
        employeeData.notes || null,
        employeeData.isActive !== undefined ? (employeeData.isActive ? 1 : 0) : 1,
      ]
    );

    const employeeCode = generateEmployeeCode(id);
    await execute(
      'UPDATE employees SET employee_code = ? WHERE id = ?',
      [employeeCode, id]
    );

    return this.findById(id);
  }

  /**
   * Update an employee
   */
  static async update(id, employeeData) {
    const fields = [];
    const values = [];

    const allowedFields = [
      'department_id', 'position', 'salary', 'emergency_contact',
      'emergency_phone', 'notes', 'is_active',
    ];

    for (const field of allowedFields) {
      const camelField = field.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      if (employeeData[camelField] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(employeeData[camelField]);
      }
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    await execute(
      `UPDATE employees SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  /**
   * Delete employee (soft delete)
   */
  static async delete(id) {
    await execute('UPDATE employees SET is_active = 0 WHERE id = ?', [id]);
  }

  /**
   * Get employee statistics
   */
  static async getStats() {
    const total = await queryOne('SELECT COUNT(*) AS total FROM employees');
    const active = await queryOne('SELECT COUNT(*) AS total FROM employees WHERE is_active = 1');
    const byDepartment = await query(
      `SELECT d.name AS department, COUNT(e.id) AS count
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE e.is_active = 1
       GROUP BY d.name`
    );

    return {
      total: total.total,
      active: active.total,
      byDepartment,
    };
  }
}

module.exports = Employee;
