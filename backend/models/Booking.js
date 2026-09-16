/**
 * Booking Model - Everett Hotel Management System
 * Handles all database operations for bookings
 */

const { query, queryOne, insert, execute, transaction } = require('../config/database');
const { generateBookingReference, calculateNights, calculateBookingTotal } = require('../utils/helpers');

class Booking {
  /**
   * Find booking by ID with full details
   */
  static async findById(id) {
    const booking = await queryOne(
      `SELECT b.*, u.first_name, u.last_name, u.email, u.phone,
              r.room_number, rc.name AS room_category, rc.slug AS category_slug,
              g.first_name AS guest_first_name, g.last_name AS guest_last_name
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       JOIN rooms r ON b.room_id = r.id
       JOIN room_categories rc ON r.category_id = rc.id
       LEFT JOIN guests g ON b.guest_id = g.id
       WHERE b.id = ?`,
      [id]
    );

    if (booking) {
      booking.payments = await query(
        `SELECT * FROM payments WHERE booking_id = ? ORDER BY created_at DESC`,
        [id]
      );
      booking.invoice = await queryOne(
        `SELECT * FROM invoices WHERE booking_id = ?`,
        [id]
      );
    }

    return booking;
  }

  /**
   * Find booking by reference
   */
  static async findByReference(reference) {
    return queryOne(
      `SELECT b.*, u.first_name, u.last_name, u.email, u.phone,
              r.room_number, rc.name AS room_category
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       JOIN rooms r ON b.room_id = r.id
       JOIN room_categories rc ON r.category_id = rc.id
       WHERE b.booking_reference = ?`,
      [reference]
    );
  }

  /**
   * Get all bookings with filters
   */
  static async findAll({ page = 1, limit = 10, status = '', userId = '', search = '' } = {}) {
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (status) {
      whereClause += ' AND b.status = ?';
      params.push(status);
    }

    if (userId) {
      whereClause += ' AND b.user_id = ?';
      params.push(userId);
    }

    if (search) {
      whereClause += ' AND (b.booking_reference LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ? OR r.room_number LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    const countResult = await queryOne(
      `SELECT COUNT(*) AS total FROM bookings b
       JOIN users u ON b.user_id = u.id
       JOIN rooms r ON b.room_id = r.id
       ${whereClause}`,
      params
    );

    const offset = (page - 1) * limit;
    const bookings = await query(
      `SELECT b.*, u.first_name, u.last_name, u.email,
              r.room_number, rc.name AS room_category
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       JOIN rooms r ON b.room_id = r.id
       JOIN room_categories rc ON r.category_id = rc.id
       ${whereClause}
       ORDER BY b.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { bookings, total: countResult.total };
  }

  /**
   * Get user bookings
   */
  static async findByUser(userId, { page = 1, limit = 10, status = '' } = {}) {
    let whereClause = 'WHERE b.user_id = ?';
    const params = [userId];

    if (status) {
      whereClause += ' AND b.status = ?';
      params.push(status);
    }

    const countResult = await queryOne(
      `SELECT COUNT(*) AS total FROM bookings b ${whereClause}`,
      params
    );

    const offset = (page - 1) * limit;
    const bookings = await query(
      `SELECT b.*, r.room_number, rc.name AS room_category, rc.slug AS category_slug
       FROM bookings b
       JOIN rooms r ON b.room_id = r.id
       JOIN room_categories rc ON r.category_id = rc.id
       ${whereClause}
       ORDER BY b.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { bookings, total: countResult.total };
  }

  /**
   * Create a new booking
   */
  static async create(bookingData) {
    return transaction(async (connection) => {
      const nights = calculateNights(bookingData.checkIn, bookingData.checkOut);

      // Get room price
      const [roomResult] = await connection.execute(
        `SELECT r.price_per_night, rc.max_adults, rc.max_children
         FROM rooms r JOIN room_categories rc ON r.category_id = rc.id
         WHERE r.id = ? AND r.status = 'available' FOR UPDATE`,
        [bookingData.roomId]
      );

      if (!roomResult || roomResult.length === 0) {
        throw new Error('Room is not available for the selected dates');
      }

      const room = roomResult[0];
      const pricing = calculateBookingTotal(room.price_per_night, nights);

      const bookingReference = generateBookingReference();

      const [result] = await connection.execute(
        `INSERT INTO bookings (booking_reference, user_id, room_id, guest_id, check_in, check_out,
          adults, children_count, total_amount, tax_amount, final_amount, special_requests, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
          bookingReference,
          bookingData.userId,
          bookingData.roomId,
          bookingData.guestId || null,
          bookingData.checkIn,
          bookingData.checkOut,
          bookingData.adults || 1,
          bookingData.children || 0,
          pricing.subtotal,
          pricing.taxAmount,
          pricing.totalAmount,
          bookingData.specialRequests || null,
        ]
      );

      // Lock the room
      await connection.execute(
        "UPDATE rooms SET status = 'reserved' WHERE id = ?",
        [bookingData.roomId]
      );

      return this.findById(result.insertId);
    });
  }

  /**
   * Update booking status
   */
  static async updateStatus(id, status, reason = null) {
    const updates = ['status = ?'];
    const values = [status];

    if (status === 'cancelled') {
      updates.push('cancelled_at = NOW()');
      if (reason) {
        updates.push('cancellation_reason = ?');
        values.push(reason);
      }
    }

    values.push(id);
    await execute(
      `UPDATE bookings SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  /**
   * Cancel booking
   */
  static async cancel(id, userId, reason) {
    return transaction(async (connection) => {
      const [result] = await connection.execute(
        `SELECT b.*, r.room_id FROM bookings b
         WHERE b.id = ? AND b.user_id = ? AND b.status IN ('pending', 'confirmed') FOR UPDATE`,
        [id, userId]
      );

      if (!result || result.length === 0) {
        throw new Error('Booking not found or cannot be cancelled');
      }

      await connection.execute(
        `UPDATE bookings SET status = 'cancelled', cancellation_reason = ?, cancelled_at = NOW()
         WHERE id = ?`,
        [reason || null, id]
      );

      await connection.execute(
        "UPDATE rooms SET status = 'available' WHERE id = ?",
        [result[0].room_id]
      );

      return this.findById(id);
    });
  }

  /**
   * Check room availability
   */
  static async checkAvailability(roomId, checkIn, checkOut, excludeBookingId = null) {
    let sql = `
      SELECT COUNT(*) AS count FROM bookings
      WHERE room_id = ? AND status IN ('confirmed', 'checked_in', 'pending')
      AND check_in < ? AND check_out > ?`;
    const params = [roomId, checkOut, checkIn];

    if (excludeBookingId) {
      sql += ' AND id != ?';
      params.push(excludeBookingId);
    }

    const result = await queryOne(sql, params);
    return result.count === 0;
  }

  /**
   * Get booking statistics
   */
  static async getStats() {
    const total = await queryOne('SELECT COUNT(*) AS total FROM bookings');
    const byStatus = await query(
      'SELECT status, COUNT(*) AS count FROM bookings GROUP BY status'
    );
    const todayCheckIns = await queryOne(
      "SELECT COUNT(*) AS total FROM bookings WHERE check_in = CURDATE() AND status IN ('confirmed', 'checked_in')"
    );
    const todayCheckOuts = await queryOne(
      "SELECT COUNT(*) AS total FROM bookings WHERE check_out = CURDATE() AND status = 'checked_out'"
    );

    return {
      total: total.total,
      byStatus,
      todayCheckIns: todayCheckIns.total,
      todayCheckOuts: todayCheckOuts.total,
    };
  }
}

module.exports = Booking;
