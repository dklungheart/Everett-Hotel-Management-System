/**
 * Review Model - Everett Hotel Management System
 * Handles all database operations for reviews
 */

const { query, queryOne, insert, execute } = require('../config/database');

class Review {
  /**
   * Find review by ID with full details
   */
  static async findById(id) {
    return queryOne(
      `SELECT rv.*, u.first_name, u.last_name, u.profile_photo,
              b.booking_reference, r.room_number, rc.name AS room_category
       FROM reviews rv
       JOIN users rv_user ON rv.user_id = rv_user.id
       JOIN bookings b ON rv.booking_id = b.id
       JOIN rooms r ON b.room_id = r.id
       JOIN room_categories rc ON r.category_id = rc.id
       LEFT JOIN users u ON rv.user_id = u.id
       WHERE rv.id = ?`,
      [id]
    );
  }

  /**
   * Get all reviews with filters
   */
  static async findAll({ page = 1, limit = 10, rating = '', roomId = '', userId = '', status = '', search = '' } = {}) {
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (rating) {
      whereClause += ' AND rv.rating = ?';
      params.push(rating);
    }

    if (roomId) {
      whereClause += ' AND b.room_id = ?';
      params.push(roomId);
    }

    if (userId) {
      whereClause += ' AND rv.user_id = ?';
      params.push(userId);
    }

    if (status) {
      whereClause += ' AND rv.status = ?';
      params.push(status);
    }

    if (search) {
      whereClause += ' AND (rv.title LIKE ? OR rv.comment LIKE ? OR u.first_name LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    const countResult = await queryOne(
      `SELECT COUNT(*) AS total FROM reviews rv
       JOIN users u ON rv.user_id = u.id
       JOIN bookings b ON rv.booking_id = b.id
       ${whereClause}`,
      params
    );

    const offset = (page - 1) * limit;
    const reviews = await query(
      `SELECT rv.*, u.first_name, u.last_name, u.profile_photo,
              r.room_number, rc.name AS room_category, b.booking_reference
       FROM reviews rv
       JOIN users u ON rv.user_id = u.id
       JOIN bookings b ON rv.booking_id = b.id
       JOIN rooms r ON b.room_id = r.id
       JOIN room_categories rc ON r.category_id = rc.id
       ${whereClause}
       ORDER BY rv.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { reviews, total: countResult.total };
  }

  /**
   * Get reviews for a room
   */
  static async findByRoom(roomId, { page = 1, limit = 10 } = {}) {
    const countResult = await queryOne(
      `SELECT COUNT(*) AS total FROM reviews rv
       JOIN bookings b ON rv.booking_id = b.id
       WHERE b.room_id = ? AND rv.status = 'approved'`,
      [roomId]
    );

    const offset = (page - 1) * limit;
    const reviews = await query(
      `SELECT rv.*, u.first_name, u.last_name, u.profile_photo
       FROM reviews rv
       JOIN users u ON rv.user_id = u.id
       JOIN bookings b ON rv.booking_id = b.id
       WHERE b.room_id = ? AND rv.status = 'approved'
       ORDER BY rv.created_at DESC
       LIMIT ? OFFSET ?`,
      [roomId, limit, offset]
    );

    return { reviews, total: countResult.total };
  }

  /**
   * Get reviews by user
   */
  static async findByUser(userId, { page = 1, limit = 10 } = {}) {
    const countResult = await queryOne(
      'SELECT COUNT(*) AS total FROM reviews WHERE user_id = ?',
      [userId]
    );

    const offset = (page - 1) * limit;
    const reviews = await query(
      `SELECT rv.*, r.room_number, rc.name AS room_category, b.booking_reference
       FROM reviews rv
       JOIN bookings b ON rv.booking_id = b.id
       JOIN rooms r ON b.room_id = r.id
       JOIN room_categories rc ON r.category_id = rc.id
       WHERE rv.user_id = ?
       ORDER BY rv.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    return { reviews, total: countResult.total };
  }

  /**
   * Create a new review
   */
  static async create(reviewData) {
    const id = await insert(
      `INSERT INTO reviews (user_id, booking_id, title, comment, rating,
        cleanliness_rating, service_rating, location_rating, value_rating, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reviewData.userId,
        reviewData.bookingId,
        reviewData.title || null,
        reviewData.comment,
        reviewData.rating,
        reviewData.cleanlinessRating || null,
        reviewData.serviceRating || null,
        reviewData.locationRating || null,
        reviewData.valueRating || null,
        reviewData.status || 'pending',
      ]
    );

    return this.findById(id);
  }

  /**
   * Update a review
   */
  static async update(id, reviewData) {
    const fields = [];
    const values = [];

    const allowedFields = [
      'title', 'comment', 'rating', 'cleanliness_rating',
      'service_rating', 'location_rating', 'value_rating', 'status',
    ];

    for (const field of allowedFields) {
      const camelField = field.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      if (reviewData[camelField] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(reviewData[camelField]);
      }
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    await execute(
      `UPDATE reviews SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  /**
   * Approve/reject a review
   */
  static async updateStatus(id, status) {
    await execute('UPDATE reviews SET status = ? WHERE id = ?', [status, id]);
    return this.findById(id);
  }

  /**
   * Delete review
   */
  static async delete(id) {
    return execute('DELETE FROM reviews WHERE id = ?', [id]);
  }

  /**
   * Get average rating
   */
  static async getAverageRating(roomId = null) {
    let sql = 'SELECT AVG(rating) AS average_rating, COUNT(*) AS total_reviews FROM reviews';
    const params = [];

    if (roomId) {
      sql += ` JOIN bookings b ON reviews.booking_id = b.id WHERE b.room_id = ? AND reviews.status = 'approved'`;
      params.push(roomId);
    } else {
      sql += " WHERE status = 'approved'";
    }

    return queryOne(sql, params);
  }

  /**
   * Get rating distribution
   */
  static async getRatingDistribution(roomId = null) {
    let sql = 'SELECT rating, COUNT(*) AS count FROM reviews';
    const params = [];

    if (roomId) {
      sql += ` JOIN bookings b ON reviews.booking_id = b.id WHERE b.room_id = ? AND reviews.status = 'approved'`;
      params.push(roomId);
    } else {
      sql += " WHERE status = 'approved'";
    }

    sql += ' GROUP BY rating ORDER BY rating DESC';

    return query(sql, params);
  }

  /**
   * Get review statistics
   */
  static async getStats() {
    const total = await queryOne('SELECT COUNT(*) AS total FROM reviews');
    const pending = await queryOne(
      "SELECT COUNT(*) AS total FROM reviews WHERE status = 'pending'"
    );
    const approved = await queryOne(
      "SELECT COUNT(*) AS total FROM reviews WHERE status = 'approved'"
    );
    const averageRating = await queryOne(
      "SELECT AVG(rating) AS average FROM reviews WHERE status = 'approved'"
    );

    return {
      total: total.total,
      pending: pending.total,
      approved: approved.total,
      averageRating: parseFloat(averageRating.average) || 0,
    };
  }
}

module.exports = Review;
