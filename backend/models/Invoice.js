/**
 * Invoice Model - Everett Hotel Management System
 * Handles all database operations for invoices
 */

const { query, queryOne, insert, execute, transaction } = require('../config/database');
const { generateInvoiceNumber } = require('../utils/helpers');

class Invoice {
  /**
   * Find invoice by ID with full details
   */
  static async findById(id) {
    return queryOne(
      `SELECT i.*, b.booking_reference, b.check_in, b.check_out, b.total_amount,
              r.room_number, rc.name AS room_category,
              u.first_name, u.last_name, u.email, u.phone
       FROM invoices i
       JOIN bookings b ON i.booking_id = b.id
       JOIN rooms r ON b.room_id = r.id
       JOIN room_categories rc ON r.category_id = rc.id
       JOIN users u ON b.user_id = u.id
       WHERE i.id = ?`,
      [id]
    );
  }

  /**
   * Find invoice by invoice number
   */
  static async findByInvoiceNumber(invoiceNumber) {
    return queryOne(
      `SELECT i.*, b.booking_reference, b.check_in, b.check_out, b.total_amount,
              r.room_number, rc.name AS room_category,
              u.first_name, u.last_name, u.email, u.phone
       FROM invoices i
       JOIN bookings b ON i.booking_id = b.id
       JOIN rooms r ON b.room_id = r.id
       JOIN room_categories rc ON r.category_id = rc.id
       JOIN users u ON b.user_id = u.id
       WHERE i.invoice_number = ?`,
      [invoiceNumber]
    );
  }

  /**
   * Get all invoices with filters
   */
  static async findAll({ page = 1, limit = 10, status = '', userId = '', search = '' } = {}) {
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (status) {
      whereClause += ' AND i.status = ?';
      params.push(status);
    }

    if (userId) {
      whereClause += ' AND b.user_id = ?';
      params.push(userId);
    }

    if (search) {
      whereClause += ' AND (i.invoice_number LIKE ? OR b.booking_reference LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    const countResult = await queryOne(
      `SELECT COUNT(*) AS total FROM invoices i
       JOIN bookings b ON i.booking_id = b.id
       JOIN users u ON b.user_id = u.id
       ${whereClause}`,
      params
    );

    const offset = (page - 1) * limit;
    const invoices = await query(
      `SELECT i.*, b.booking_reference, b.check_in, b.check_out,
              r.room_number, rc.name AS room_category,
              u.first_name, u.last_name, u.email
       FROM invoices i
       JOIN bookings b ON i.booking_id = b.id
       JOIN rooms r ON b.room_id = r.id
       JOIN room_categories rc ON r.category_id = rc.id
       JOIN users u ON b.user_id = u.id
       ${whereClause}
       ORDER BY i.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { invoices, total: countResult.total };
  }

  /**
   * Generate invoice from a booking
   */
  static async generateFromBooking(bookingId) {
    return transaction(async (connection) => {
      const existing = await queryOne(
        'SELECT id FROM invoices WHERE booking_id = ?',
        [bookingId]
      );
      if (existing) {
        throw new Error('Invoice already exists for this booking');
      }

      const [bookingRows] = await connection.execute(
        `SELECT b.*, r.price_per_night, rc.name AS room_category,
                u.first_name, u.last_name, u.email
         FROM bookings b
         JOIN rooms r ON b.room_id = r.id
         JOIN room_categories rc ON r.category_id = rc.id
         JOIN users u ON b.user_id = u.id
         WHERE b.id = ?`,
        [bookingId]
      );

      if (!bookingRows || bookingRows.length === 0) {
        throw new Error('Booking not found');
      }

      const booking = bookingRows[0];
      const invoiceNumber = generateInvoiceNumber();

      const [result] = await connection.execute(
        `INSERT INTO invoices (invoice_number, booking_id, subtotal, tax_amount,
          discount_amount, total_amount, due_date, status)
         VALUES (?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY), 'pending')`,
        [
          invoiceNumber,
          bookingId,
          booking.total_amount,
          booking.tax_amount,
          0,
          booking.final_amount,
        ]
      );

      return this.findById(result.insertId);
    });
  }

  /**
   * Update invoice status
   */
  static async updateStatus(id, status) {
    const updates = ['status = ?'];
    const values = [status];

    if (status === 'paid') {
      updates.push('paid_at = NOW()');
    } else if (status === 'overdue') {
      updates.push('due_date = NOW()');
    }

    values.push(id);
    await execute(
      `UPDATE invoices SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  /**
   * Update invoice
   */
  static async update(id, invoiceData) {
    const fields = [];
    const values = [];

    const allowedFields = [
      'subtotal', 'tax_amount', 'discount_amount', 'total_amount',
      'due_date', 'notes', 'status',
    ];

    for (const field of allowedFields) {
      const camelField = field.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      if (invoiceData[camelField] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(invoiceData[camelField]);
      }
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    await execute(
      `UPDATE invoices SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  /**
   * Delete invoice
   */
  static async delete(id) {
    return execute('DELETE FROM invoices WHERE id = ?', [id]);
  }

  /**
   * Get invoice statistics
   */
  static async getStats() {
    const total = await queryOne('SELECT COUNT(*) AS total FROM invoices');
    const byStatus = await query(
      'SELECT status, COUNT(*) AS count, SUM(total_amount) AS amount FROM invoices GROUP BY status'
    );
    const totalRevenue = await queryOne(
      "SELECT COALESCE(SUM(total_amount), 0) AS total FROM invoices WHERE status = 'paid'"
    );

    return {
      total: total.total,
      byStatus,
      totalRevenue: totalRevenue.total,
    };
  }
}

module.exports = Invoice;
