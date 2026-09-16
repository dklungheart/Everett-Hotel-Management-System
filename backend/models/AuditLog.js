/**
 * AuditLog Model - Everett Hotel Management System
 * Handles all database operations for audit logs
 */

const { query, queryOne, insert, execute } = require('../config/database');

class AuditLog {
  /**
   * Find log by ID
   */
  static async findById(id) {
    return queryOne(
      `SELECT al.*, u.first_name, u.last_name, u.email
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE al.id = ?`,
      [id]
    );
  }

  /**
   * Get all audit logs with filters
   */
  static async findAll({ page = 1, limit = 10, action = '', entity = '', userId = '', search = '' } = {}) {
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (action) {
      whereClause += ' AND al.action = ?';
      params.push(action);
    }

    if (entity) {
      whereClause += ' AND al.entity_type = ?';
      params.push(entity);
    }

    if (userId) {
      whereClause += ' AND al.user_id = ?';
      params.push(userId);
    }

    if (search) {
      whereClause += ' AND (al.description LIKE ? OR al.entity_type LIKE ? OR u.email LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    const countResult = await queryOne(
      `SELECT COUNT(*) AS total FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ${whereClause}`,
      params
    );

    const offset = (page - 1) * limit;
    const logs = await query(
      `SELECT al.*, u.first_name, u.last_name, u.email
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { logs, total: countResult.total };
  }

  /**
   * Get logs by user
   */
  static async findByUser(userId, { page = 1, limit = 10 } = {}) {
    const countResult = await queryOne(
      'SELECT COUNT(*) AS total FROM audit_logs WHERE user_id = ?',
      [userId]
    );

    const offset = (page - 1) * limit;
    const logs = await query(
      `SELECT * FROM audit_logs
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    return { logs, total: countResult.total };
  }

  /**
   * Get logs by entity
   */
  static async findByEntity(entityType, entityId, { page = 1, limit = 10 } = {}) {
    let whereClause = 'WHERE al.entity_type = ?';
    const params = [entityType];

    if (entityId) {
      whereClause += ' AND al.entity_id = ?';
      params.push(entityId);
    }

    const countResult = await queryOne(
      `SELECT COUNT(*) AS total FROM audit_logs al ${whereClause}`,
      params
    );

    const offset = (page - 1) * limit;
    const logs = await query(
      `SELECT al.*, u.first_name, u.last_name, u.email
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { logs, total: countResult.total };
  }

  /**
   * Create an audit log entry
   */
  static async create(logData) {
    const id = await insert(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id,
        description, old_values, new_values, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        logData.userId || null,
        logData.action,
        logData.entityType,
        logData.entityId || null,
        logData.description || null,
        logData.oldValues ? JSON.stringify(logData.oldValues) : null,
        logData.newValues ? JSON.stringify(logData.newValues) : null,
        logData.ipAddress || null,
        logData.userAgent || null,
      ]
    );

    return this.findById(id);
  }

  /**
   * Delete a log
   */
  static async delete(id) {
    return execute('DELETE FROM audit_logs WHERE id = ?', [id]);
  }

  /**
   * Delete old logs
   */
  static async deleteOlderThan(days = 90) {
    return execute(
      'DELETE FROM audit_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
      [days]
    );
  }

  /**
   * Get audit statistics
   */
  static async getStats() {
    const total = await queryOne('SELECT COUNT(*) AS total FROM audit_logs');
    const todayCount = await queryOne(
      'SELECT COUNT(*) AS total FROM audit_logs WHERE DATE(created_at) = CURDATE()'
    );
    const byAction = await query(
      'SELECT action, COUNT(*) AS count FROM audit_logs GROUP BY action ORDER BY count DESC'
    );
    const byEntity = await query(
      'SELECT entity_type, COUNT(*) AS count FROM audit_logs GROUP BY entity_type ORDER BY count DESC'
    );

    return {
      total: total.total,
      todayCount: todayCount.total,
      byAction,
      byEntity,
    };
  }
}

module.exports = AuditLog;
