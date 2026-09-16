/**
 * ContactMessage Model - Everett Hotel Management System
 * Handles all database operations for contact messages
 */

const { query, queryOne, insert, execute } = require('../config/database');

class ContactMessage {
  /**
   * Find message by ID
   */
  static async findById(id) {
    return queryOne(
      `SELECT cm.*,
              r.first_name AS replied_by_first_name,
              r.last_name AS replied_by_last_name
       FROM contact_messages cm
       LEFT JOIN users u ON cm.user_id = u.id
       LEFT JOIN users r ON cm.replied_by = r.id
       WHERE cm.id = ?`,
      [id]
    );
  }

  /**
   * Get all messages with filters
   */
  static async findAll({ page = 1, limit = 10, status = '', category = '', search = '' } = {}) {
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (status) {
      whereClause += ' AND cm.status = ?';
      params.push(status);
    }

    if (category) {
      whereClause += ' AND cm.category = ?';
      params.push(category);
    }

    if (search) {
      whereClause += ' AND (cm.name LIKE ? OR cm.email LIKE ? OR cm.subject LIKE ? OR cm.message LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    const countResult = await queryOne(
      `SELECT COUNT(*) AS total FROM contact_messages cm ${whereClause}`,
      params
    );

    const offset = (page - 1) * limit;
    const messages = await query(
      `SELECT cm.*, r.first_name AS replied_by_first_name, r.last_name AS replied_by_last_name
       FROM contact_messages cm
       LEFT JOIN users r ON cm.replied_by = r.id
       ${whereClause}
       ORDER BY cm.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { messages, total: countResult.total };
  }

  /**
   * Create a new message
   */
  static async create(messageData) {
    const id = await insert(
      `INSERT INTO contact_messages (user_id, name, email, phone, subject, message,
        category, priority, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        messageData.userId || null,
        messageData.name,
        messageData.email,
        messageData.phone || null,
        messageData.subject,
        messageData.message,
        messageData.category || 'general',
        messageData.priority || 'normal',
        messageData.status || 'unread',
      ]
    );

    return this.findById(id);
  }

  /**
   * Update message status
   */
  static async updateStatus(id, status, repliedBy = null) {
    const updates = ['status = ?'];
    const values = [status];

    if (status === 'replied' && repliedBy) {
      updates.push('replied_by = ?', 'replied_at = NOW()');
      values.push(repliedBy);
    }

    values.push(id);
    await execute(
      `UPDATE contact_messages SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  /**
   * Update a message
   */
  static async update(id, messageData) {
    const fields = [];
    const values = [];

    const allowedFields = [
      'name', 'email', 'phone', 'subject', 'message',
      'category', 'priority', 'status', 'admin_reply',
    ];

    for (const field of allowedFields) {
      const camelField = field.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      if (messageData[camelField] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(messageData[camelField]);
      }
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    await execute(
      `UPDATE contact_messages SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  /**
   * Delete a message
   */
  static async delete(id) {
    return execute('DELETE FROM contact_messages WHERE id = ?', [id]);
  }

  /**
   * Get message statistics
   */
  static async getStats() {
    const total = await queryOne('SELECT COUNT(*) AS total FROM contact_messages');
    const unread = await queryOne(
      "SELECT COUNT(*) AS total FROM contact_messages WHERE status = 'unread'"
    );
    const replied = await queryOne(
      "SELECT COUNT(*) AS total FROM contact_messages WHERE status = 'replied'"
    );
    const byCategory = await query(
      'SELECT category, COUNT(*) AS count FROM contact_messages GROUP BY category'
    );
    const todayCount = await queryOne(
      'SELECT COUNT(*) AS total FROM contact_messages WHERE DATE(created_at) = CURDATE()'
    );

    return {
      total: total.total,
      unread: unread.total,
      replied: replied.total,
      todayCount: todayCount.total,
      byCategory,
    };
  }
}

module.exports = ContactMessage;
