/**
 * Notification Model - Everett Hotel Management System
 * Handles all database operations for notifications
 */

const { query, queryOne, insert, execute } = require('../config/database');

class Notification {
  /**
   * Find notification by ID
   */
  static async findById(id) {
    return queryOne(
      `SELECT n.*, u.first_name, u.last_name
       FROM notifications n
       LEFT JOIN users u ON n.user_id = u.id
       WHERE n.id = ?`,
      [id]
    );
  }

  /**
   * Get notifications for a user
   */
  static async findByUser(userId, { page = 1, limit = 10, read = '' } = {}) {
    let whereClause = 'WHERE n.user_id = ?';
    const params = [userId];

    if (read === 'true') {
      whereClause += ' AND n.is_read = 1';
    } else if (read === 'false') {
      whereClause += ' AND n.is_read = 0';
    }

    const countResult = await queryOne(
      `SELECT COUNT(*) AS total FROM notifications n ${whereClause}`,
      params
    );

    const offset = (page - 1) * limit;
    const notifications = await query(
      `SELECT n.*
       FROM notifications n
       ${whereClause}
       ORDER BY n.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { notifications, total: countResult.total };
  }

  /**
   * Get all notifications with filters
   */
  static async findAll({ page = 1, limit = 10, type = '', read = '', search = '' } = {}) {
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (type) {
      whereClause += ' AND n.type = ?';
      params.push(type);
    }

    if (read === 'true') {
      whereClause += ' AND n.is_read = 1';
    } else if (read === 'false') {
      whereClause += ' AND n.is_read = 0';
    }

    if (search) {
      whereClause += ' AND (n.title LIKE ? OR n.message LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s);
    }

    const countResult = await queryOne(
      `SELECT COUNT(*) AS total FROM notifications n ${whereClause}`,
      params
    );

    const offset = (page - 1) * limit;
    const notifications = await query(
      `SELECT n.*, u.first_name, u.last_name
       FROM notifications n
       LEFT JOIN users u ON n.user_id = u.id
       ${whereClause}
       ORDER BY n.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { notifications, total: countResult.total };
  }

  /**
   * Get unread notification count for a user
   */
  static async getUnreadCount(userId) {
    const result = await queryOne(
      'SELECT COUNT(*) AS total FROM notifications WHERE user_id = ? AND is_read = 0',
      [userId]
    );
    return result.total;
  }

  /**
   * Create a notification
   */
  static async create(notificationData) {
    const id = await insert(
      `INSERT INTO notifications (user_id, type, title, message, link, data, is_read)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [
        notificationData.userId,
        notificationData.type || 'info',
        notificationData.title,
        notificationData.message,
        notificationData.link || null,
        notificationData.data ? JSON.stringify(notificationData.data) : null,
      ]
    );

    return this.findById(id);
  }

  /**
   * Create bulk notifications (for multiple users)
   */
  static async createBulk(userIds, notificationData) {
    const ids = [];
    for (const userId of userIds) {
      const id = await insert(
        `INSERT INTO notifications (user_id, type, title, message, link, data, is_read)
         VALUES (?, ?, ?, ?, ?, ?, 0)`,
        [
          userId,
          notificationData.type || 'info',
          notificationData.title,
          notificationData.message,
          notificationData.link || null,
          notificationData.data ? JSON.stringify(notificationData.data) : null,
        ]
      );
      ids.push(id);
    }
    return ids;
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(id) {
    await execute('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);
    return this.findById(id);
  }

  /**
   * Mark all user notifications as read
   */
  static async markAllAsRead(userId) {
    return execute(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
      [userId]
    );
  }

  /**
   * Delete a notification
   */
  static async delete(id) {
    return execute('DELETE FROM notifications WHERE id = ?', [id]);
  }

  /**
   * Delete all notifications for a user
   */
  static async deleteAllForUser(userId) {
    return execute('DELETE FROM notifications WHERE user_id = ?', [userId]);
  }

  /**
   * Get notification statistics
   */
  static async getStats() {
    const total = await queryOne('SELECT COUNT(*) AS total FROM notifications');
    const unread = await queryOne('SELECT COUNT(*) AS total FROM notifications WHERE is_read = 0');
    const byType = await query(
      'SELECT type, COUNT(*) AS count FROM notifications GROUP BY type'
    );

    return {
      total: total.total,
      unread: unread.total,
      byType,
    };
  }
}

module.exports = Notification;
