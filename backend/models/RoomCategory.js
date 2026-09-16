/**
 * RoomCategory Model - Everett Hotel Management System
 * Handles all database operations for room categories
 */

const { query, queryOne, insert, execute } = require('../config/database');
const { generateSlug } = require('../utils/helpers');

class RoomCategory {
  /**
   * Find category by ID
   */
  static async findById(id) {
    return queryOne(
      `SELECT rc.*, COUNT(r.id) AS room_count
       FROM room_categories rc
       LEFT JOIN rooms r ON rc.id = r.category_id AND r.is_active = 1
       WHERE rc.id = ?
       GROUP BY rc.id`,
      [id]
    );
  }

  /**
   * Find category by slug
   */
  static async findBySlug(slug) {
    return queryOne('SELECT * FROM room_categories WHERE slug = ?', [slug]);
  }

  /**
   * Get all categories with pagination and filtering
   */
  static async findAll({ page = 1, limit = 10, search = '', status = '' } = {}) {
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (rc.name LIKE ? OR rc.description LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern);
    }

    if (status === 'active') {
      whereClause += ' AND rc.is_active = 1';
    } else if (status === 'inactive') {
      whereClause += ' AND rc.is_active = 0';
    }

    const countResult = await queryOne(
      `SELECT COUNT(*) AS total FROM room_categories rc ${whereClause}`,
      params
    );

    const offset = (page - 1) * limit;
    const categories = await query(
      `SELECT rc.*, COUNT(r.id) AS room_count
       FROM room_categories rc
       LEFT JOIN rooms r ON rc.id = r.category_id AND r.is_active = 1
       ${whereClause}
       GROUP BY rc.id
       ORDER BY rc.sort_order ASC, rc.name ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { categories, total: countResult.total };
  }

  /**
   * Get all active categories (no pagination)
   */
  static async findActive() {
    return query(
      `SELECT rc.*, COUNT(r.id) AS room_count
       FROM room_categories rc
       LEFT JOIN rooms r ON rc.id = r.category_id AND r.is_active = 1
       WHERE rc.is_active = 1
       GROUP BY rc.id
       ORDER BY rc.sort_order ASC, rc.name ASC`
    );
  }

  /**
   * Create a new category
   */
  static async create(categoryData) {
    const slug = categoryData.slug || generateSlug(categoryData.name);

    const id = await insert(
      `INSERT INTO room_categories (name, slug, description, price_per_night, max_adults,
        max_children, bed_type, room_size, image, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        categoryData.name,
        slug,
        categoryData.description || null,
        categoryData.pricePerNight,
        categoryData.maxAdults || 2,
        categoryData.maxChildren || 1,
        categoryData.bedType || 'queen',
        categoryData.roomSize || null,
        categoryData.image || null,
        categoryData.sortOrder || 0,
        categoryData.isActive !== undefined ? (categoryData.isActive ? 1 : 0) : 1,
      ]
    );

    return this.findById(id);
  }

  /**
   * Update a category
   */
  static async update(id, categoryData) {
    const fields = [];
    const values = [];

    const allowedFields = [
      'name', 'slug', 'description', 'price_per_night', 'max_adults',
      'max_children', 'bed_type', 'room_size', 'image', 'sort_order', 'is_active',
    ];

    for (const field of allowedFields) {
      const camelField = field.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      if (categoryData[camelField] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(categoryData[camelField]);
      }
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    await execute(
      `UPDATE room_categories SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  /**
   * Delete category (soft delete)
   */
  static async delete(id) {
    await execute('UPDATE room_categories SET is_active = 0 WHERE id = ?', [id]);
  }

  /**
   * Get category statistics
   */
  static async getStats() {
    const total = await queryOne('SELECT COUNT(*) AS total FROM room_categories');
    const active = await queryOne('SELECT COUNT(*) AS total FROM room_categories WHERE is_active = 1');
    const withRooms = await queryOne(
      `SELECT COUNT(DISTINCT rc.id) AS total
       FROM room_categories rc
       JOIN rooms r ON rc.id = r.category_id AND r.is_active = 1`
    );

    return {
      total: total.total,
      active: active.total,
      withRooms: withRooms.total,
    };
  }
}

module.exports = RoomCategory;
