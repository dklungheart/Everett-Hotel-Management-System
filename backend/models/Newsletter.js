/**
 * Newsletter Model - Everett Hotel Management System
 * Handles all database operations for newsletter subscribers
 */

const { query, queryOne, insert, execute } = require('../config/database');

class Newsletter {
  /**
   * Find subscriber by ID
   */
  static async findById(id) {
    return queryOne(
      `SELECT ns.*, u.first_name, u.last_name, u.email AS user_email
       FROM newsletter_subscribers ns
       LEFT JOIN users u ON ns.user_id = u.id
       WHERE ns.id = ?`,
      [id]
    );
  }

  /**
   * Find subscriber by email
   */
  static async findByEmail(email) {
    return queryOne(
      'SELECT * FROM newsletter_subscribers WHERE email = ?',
      [email]
    );
  }

  /**
   * Get all subscribers with filters
   */
  static async findAll({ page = 1, limit = 10, status = '', search = '' } = {}) {
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (status === 'active') {
      whereClause += ' AND ns.is_active = 1';
    } else if (status === 'inactive') {
      whereClause += ' AND ns.is_active = 0';
    }

    if (search) {
      whereClause += ' AND (ns.email LIKE ? OR ns.name LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s);
    }

    const countResult = await queryOne(
      `SELECT COUNT(*) AS total FROM newsletter_subscribers ns ${whereClause}`,
      params
    );

    const offset = (page - 1) * limit;
    const subscribers = await query(
      `SELECT ns.*
       FROM newsletter_subscribers ns
       ${whereClause}
       ORDER BY ns.subscribed_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { subscribers, total: countResult.total };
  }

  /**
   * Get all active subscribers
   */
  static async findActive() {
    return query(
      `SELECT * FROM newsletter_subscribers
       WHERE is_active = 1
       ORDER BY subscribed_at DESC`
    );
  }

  /**
   * Subscribe to newsletter
   */
  static async subscribe(subscriberData) {
    const existing = await this.findByEmail(subscriberData.email);

    if (existing) {
      if (!existing.is_active) {
        await execute(
          'UPDATE newsletter_subscribers SET is_active = 1, unsubscribed_at = NULL WHERE id = ?',
          [existing.id]
        );
        return this.findById(existing.id);
      }
      return existing;
    }

    const id = await insert(
      `INSERT INTO newsletter_subscribers (user_id, email, name, is_active, subscribed_at)
       VALUES (?, ?, ?, 1, NOW())`,
      [
        subscriberData.userId || null,
        subscriberData.email,
        subscriberData.name || null,
      ]
    );

    return this.findById(id);
  }

  /**
   * Unsubscribe from newsletter
   */
  static async unsubscribe(email) {
    await execute(
      'UPDATE newsletter_subscribers SET is_active = 0, unsubscribed_at = NOW() WHERE email = ? AND is_active = 1',
      [email]
    );
    return this.findByEmail(email);
  }

  /**
   * Update subscriber
   */
  static async update(id, subscriberData) {
    const fields = [];
    const values = [];

    const allowedFields = ['name', 'email', 'is_active'];

    for (const field of allowedFields) {
      const camelField = field.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      if (subscriberData[camelField] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(subscriberData[camelField]);
      }
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    await execute(
      `UPDATE newsletter_subscribers SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  /**
   * Delete subscriber
   */
  static async delete(id) {
    return execute('DELETE FROM newsletter_subscribers WHERE id = ?', [id]);
  }

  /**
   * Get newsletter statistics
   */
  static async getStats() {
    const total = await queryOne('SELECT COUNT(*) AS total FROM newsletter_subscribers');
    const active = await queryOne(
      'SELECT COUNT(*) AS total FROM newsletter_subscribers WHERE is_active = 1'
    );
    const thisMonth = await queryOne(
      'SELECT COUNT(*) AS total FROM newsletter_subscribers WHERE subscribed_at >= DATE_FORMAT(NOW(), "%Y-%m-01")'
    );

    return {
      total: total.total,
      active: active.total,
      inactive: total.total - active.total,
      newThisMonth: thisMonth.total,
    };
  }
}

module.exports = Newsletter;
