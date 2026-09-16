/**
 * Room Model - Everett Hotel Management System
 * Handles all database operations for rooms
 */

const { query, queryOne, insert, execute } = require('../config/database');

class Room {
  /**
   * Find room by ID with category info
   */
  static async findById(id) {
    const room = await queryOne(
      `SELECT r.*, rc.name AS category_name, rc.slug AS category_slug,
              rc.description AS category_description, rc.max_adults, rc.max_children,
              rc.bed_type, rc.room_size
       FROM rooms r
       JOIN room_categories rc ON r.category_id = rc.id
       WHERE r.id = ?`,
      [id]
    );

    if (room) {
      room.amenities = await query(
        `SELECT a.id, a.name, a.icon
         FROM amenities a
         JOIN room_amenities ra ON a.id = ra.amenity_id
         WHERE ra.room_id = ?`,
        [id]
      );

      room.images = await query(
        'SELECT * FROM room_images WHERE room_id = ? ORDER BY sort_order',
        [id]
      );
    }

    return room;
  }

  /**
   * Find room by room number
   */
  static async findByNumber(roomNumber) {
    return queryOne('SELECT * FROM rooms WHERE room_number = ?', [roomNumber]);
  }

  /**
   * Get all rooms with filters
   */
  static async findAll({ page = 1, limit = 10, category = '', status = '', floor = '', search = '' } = {}) {
    let whereClause = 'WHERE r.is_active = 1';
    const params = [];

    if (category) {
      whereClause += ' AND rc.slug = ?';
      params.push(category);
    }

    if (status) {
      whereClause += ' AND r.status = ?';
      params.push(status);
    }

    if (floor) {
      whereClause += ' AND r.floor = ?';
      params.push(floor);
    }

    if (search) {
      whereClause += ' AND (r.room_number LIKE ? OR rc.name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    const countResult = await queryOne(
      `SELECT COUNT(*) AS total FROM rooms r
       JOIN room_categories rc ON r.category_id = rc.id
       ${whereClause}`,
      params
    );

    const offset = (page - 1) * limit;
    const rooms = await query(
      `SELECT r.id, r.room_number, r.floor, r.status, r.price_per_night, r.image,
              rc.name AS category_name, rc.slug AS category_slug, rc.bed_type, rc.room_size
       FROM rooms r
       JOIN room_categories rc ON r.category_id = rc.id
       ${whereClause}
       ORDER BY r.room_number ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { rooms, total: countResult.total };
  }

  /**
   * Get available rooms for given dates
   */
  static async findAvailable({ checkIn, checkOut, category = '', adults = 1, children = 0 } = {}) {
    let whereClause = `
      WHERE r.is_active = 1 AND r.status = 'available'
      AND rc.max_adults >= ? AND rc.max_children >= ?`;

    const params = [adults, children];

    if (category) {
      whereClause += ' AND rc.slug = ?';
      params.push(category);
    }

    if (checkIn && checkOut) {
      whereClause += `
        AND r.id NOT IN (
          SELECT b.room_id FROM bookings b
          WHERE b.status IN ('confirmed', 'checked_in')
          AND b.check_in < ? AND b.check_out > ?
        )`;
      params.push(checkOut, checkIn);
    }

    return query(
      `SELECT r.*, rc.name AS category_name, rc.slug AS category_slug,
              rc.description AS category_description, rc.max_adults, rc.max_children,
              rc.bed_type, rc.room_size
       FROM rooms r
       JOIN room_categories rc ON r.category_id = rc.id
       ${whereClause}
       ORDER BY r.price_per_night ASC`,
      params
    );
  }

  /**
   * Create a new room
   */
  static async create(roomData) {
    const id = await insert(
      `INSERT INTO rooms (room_number, category_id, floor, price_per_night, description, image, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        roomData.roomNumber,
        roomData.categoryId,
        roomData.floor || 1,
        roomData.pricePerNight,
        roomData.description || null,
        roomData.image || null,
        roomData.status || 'available',
      ]
    );

    // Add amenities
    if (roomData.amenities && roomData.amenities.length > 0) {
      for (const amenityId of roomData.amenities) {
        await insert(
          'INSERT INTO room_amenities (room_id, amenity_id) VALUES (?, ?)',
          [id, amenityId]
        );
      }
    }

    return this.findById(id);
  }

  /**
   * Update a room
   */
  static async update(id, roomData) {
    const fields = [];
    const values = [];

    const allowedFields = ['room_number', 'category_id', 'floor', 'price_per_night', 'description', 'image', 'status', 'is_active'];

    for (const field of allowedFields) {
      const camelField = field.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      if (roomData[camelField] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(roomData[camelField]);
      }
    }

    if (fields.length > 0) {
      values.push(id);
      await execute(`UPDATE rooms SET ${fields.join(', ')} WHERE id = ?`, values);
    }

    // Update amenities if provided
    if (roomData.amenities) {
      await execute('DELETE FROM room_amenities WHERE room_id = ?', [id]);
      for (const amenityId of roomData.amenities) {
        await insert(
          'INSERT INTO room_amenities (room_id, amenity_id) VALUES (?, ?)',
          [id, amenityId]
        );
      }
    }

    return this.findById(id);
  }

  /**
   * Update room status
   */
  static async updateStatus(id, status) {
    await execute('UPDATE rooms SET status = ? WHERE id = ?', [status, id]);
  }

  /**
   * Delete room (soft delete)
   */
  static async delete(id) {
    await execute('UPDATE rooms SET is_active = 0 WHERE id = ?', [id]);
  }

  /**
   * Get room statistics
   */
  static async getStats() {
    const total = await queryOne('SELECT COUNT(*) AS total FROM rooms WHERE is_active = 1');
    const byStatus = await query(
      'SELECT status, COUNT(*) AS count FROM rooms WHERE is_active = 1 GROUP BY status'
    );
    const byCategory = await query(
      `SELECT rc.name AS category, COUNT(r.id) AS count
       FROM rooms r
       JOIN room_categories rc ON r.category_id = rc.id
       WHERE r.is_active = 1
       GROUP BY rc.name`
    );

    return {
      total: total.total,
      byStatus,
      byCategory,
    };
  }
}

module.exports = Room;
