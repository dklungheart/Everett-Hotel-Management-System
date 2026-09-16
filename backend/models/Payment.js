/**
 * Payment Model - Everett Hotel Management System
 * Handles all database operations for payments
 */

const { query, queryOne, insert, execute } = require('../config/database');
const { generatePaymentReference } = require('../utils/helpers');

class Payment {
  /**
   * Find payment by ID
   */
  static async findById(id) {
    return queryOne(
      `SELECT p.*, b.booking_reference, u.first_name, u.last_name, u.email
       FROM payments p
       JOIN bookings b ON p.booking_id = b.id
       JOIN users u ON p.user_id = u.id
       WHERE p.id = ?`,
      [id]
    );
  }

  /**
   * Find payment by reference
   */
  static async findByReference(reference) {
    return queryOne(
      `SELECT p.*, b.booking_reference, u.first_name, u.last_name, u.email
       FROM payments p
       JOIN bookings b ON p.booking_id = b.id
       JOIN users u ON p.user_id = u.id
       WHERE p.payment_reference = ?`,
      [reference]
    );
  }

  /**
   * Get all payments with filters
   */
  static async findAll({ page = 1, limit = 10, status = '', method = '', bookingId = '' } = {}) {
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (status) {
      whereClause += ' AND p.status = ?';
      params.push(status);
    }

    if (method) {
      whereClause += ' AND p.method = ?';
      params.push(method);
    }

    if (bookingId) {
      whereClause += ' AND p.booking_id = ?';
      params.push(bookingId);
    }

    const countResult = await queryOne(
      `SELECT COUNT(*) AS total FROM payments p ${whereClause}`,
      params
    );

    const offset = (page - 1) * limit;
    const payments = await query(
      `SELECT p.*, b.booking_reference, u.first_name, u.last_name, u.email
       FROM payments p
       JOIN bookings b ON p.booking_id = b.id
       JOIN users u ON p.user_id = u.id
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { payments, total: countResult.total };
  }

  /**
   * Get payments by user
   */
  static async findByUser(userId, { page = 1, limit = 10 } = {}) {
    const countResult = await queryOne(
      'SELECT COUNT(*) AS total FROM payments WHERE user_id = ?',
      [userId]
    );

    const offset = (page - 1) * limit;
    const payments = await query(
      `SELECT p.*, b.booking_reference
       FROM payments p
       JOIN bookings b ON p.booking_id = b.id
       WHERE p.user_id = ?
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    return { payments, total: countResult.total };
  }

  /**
   * Create a new payment
   */
  static async create(paymentData) {
    const paymentReference = generatePaymentReference();

    const id = await insert(
      `INSERT INTO payments (payment_reference, booking_id, user_id, amount, method, status, transaction_id, billing_name, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        paymentReference,
        paymentData.bookingId,
        paymentData.userId,
        paymentData.amount,
        paymentData.method,
        paymentData.status || 'pending',
        paymentData.transactionId || null,
        paymentData.billingName || null,
        paymentData.notes || null,
      ]
    );

    return this.findById(id);
  }

  /**
   * Update payment status
   */
  static async updateStatus(id, status, transactionId = null) {
    const updates = ['status = ?'];
    const values = [status];

    if (status === 'completed') {
      updates.push('paid_at = NOW()');
    }

    if (transactionId) {
      updates.push('transaction_id = ?');
      values.push(transactionId);
    }

    values.push(id);
    await execute(
      `UPDATE payments SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  /**
   * Get total revenue
   */
  static async getTotalRevenue(startDate = null, endDate = null) {
    let sql = "SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE status = 'completed'";
    const params = [];

    if (startDate) {
      sql += ' AND paid_at >= ?';
      params.push(startDate);
    }

    if (endDate) {
      sql += ' AND paid_at <= ?';
      params.push(endDate);
    }

    const result = await queryOne(sql, params);
    return result.total;
  }

  /**
   * Get revenue by method
   */
  static async getRevenueByMethod() {
    return query(
      `SELECT method, COUNT(*) AS count, SUM(amount) AS total
       FROM payments WHERE status = 'completed'
       GROUP BY method ORDER BY total DESC`
    );
  }

  /**
   * Get daily revenue
   */
  static async getDailyRevenue(days = 30) {
    return query(
      `SELECT DATE(paid_at) AS date, SUM(amount) AS revenue, COUNT(*) AS count
       FROM payments WHERE status = 'completed'
       AND paid_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY DATE(paid_at) ORDER BY date ASC`,
      [days]
    );
  }

  /**
   * Payment statistics
   */
  static async getStats() {
    const totalRevenue = await this.getTotalRevenue();
    const totalPayments = await queryOne('SELECT COUNT(*) AS total FROM payments');
    const pendingPayments = await queryOne(
      "SELECT COUNT(*) AS total FROM payments WHERE status = 'pending'"
    );

    return {
      totalRevenue,
      totalPayments: totalPayments.total,
      pendingPayments: pendingPayments.total,
      revenueByMethod: await this.getRevenueByMethod(),
    };
  }
}

module.exports = Payment;
