/**
 * Gallery Model - Everett Hotel Management System
 * Handles all database operations for gallery images
 */

const { query, queryOne, insert, execute } = require('../config/database');

class Gallery {
  /**
   * Find image by ID
   */
  static async findById(id) {
    return queryOne(
      `SELECT g.*, c.name AS category_name, u.first_name, u.last_name
       FROM gallery g
       LEFT JOIN gallery_categories c ON g.category_id = c.id
       LEFT JOIN users u ON g.uploaded_by = u.id
       WHERE g.id = ?`,
      [id]
    );
  }

  /**
   * Get all gallery images with filters
   */
  static async findAll({ page = 1, limit = 10, category = '', featured = '', search = '' } = {}) {
    let whereClause = 'WHERE g.is_active = 1';
    const params = [];

    if (category) {
      whereClause += ' AND c.slug = ?';
      params.push(category);
    }

    if (featured === 'true') {
      whereClause += ' AND g.is_featured = 1';
    } else if (featured === 'false') {
      whereClause += ' AND g.is_featured = 0';
    }

    if (search) {
      whereClause += ' AND (g.title LIKE ? OR g.caption LIKE ? OR g.alt_text LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    const countResult = await queryOne(
      `SELECT COUNT(*) AS total FROM gallery g
       LEFT JOIN gallery_categories c ON g.category_id = c.id
       ${whereClause}`,
      params
    );

    const offset = (page - 1) * limit;
    const images = await query(
      `SELECT g.*, c.name AS category_name
       FROM gallery g
       LEFT JOIN gallery_categories c ON g.category_id = c.id
       ${whereClause}
       ORDER BY g.sort_order ASC, g.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { images, total: countResult.total };
  }

  /**
   * Get featured images
   */
  static async findFeatured(limit = 10) {
    return query(
      `SELECT g.*, c.name AS category_name
       FROM gallery g
       LEFT JOIN gallery_categories c ON g.category_id = c.id
       WHERE g.is_active = 1 AND g.is_featured = 1
       ORDER BY g.sort_order ASC
       LIMIT ?`,
      [limit]
    );
  }

  /**
   * Create a gallery image
   */
  static async create(imageData) {
    const id = await insert(
      `INSERT INTO gallery (title, caption, alt_text, image_url, thumbnail_url,
        category_id, uploaded_by, sort_order, is_featured, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        imageData.title,
        imageData.caption || null,
        imageData.altText || imageData.title,
        imageData.imageUrl,
        imageData.thumbnailUrl || null,
        imageData.categoryId || null,
        imageData.uploadedBy || null,
        imageData.sortOrder || 0,
        imageData.isFeatured !== undefined ? (imageData.isFeatured ? 1 : 0) : 0,
        imageData.isActive !== undefined ? (imageData.isActive ? 1 : 0) : 1,
      ]
    );

    return this.findById(id);
  }

  /**
   * Update a gallery image
   */
  static async update(id, imageData) {
    const fields = [];
    const values = [];

    const allowedFields = [
      'title', 'caption', 'alt_text', 'image_url', 'thumbnail_url',
      'category_id', 'sort_order', 'is_featured', 'is_active',
    ];

    for (const field of allowedFields) {
      const camelField = field.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      if (imageData[camelField] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(imageData[camelField]);
      }
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    await execute(
      `UPDATE gallery SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  /**
   * Delete image (soft delete)
   */
  static async delete(id) {
    await execute('UPDATE gallery SET is_active = 0 WHERE id = ?', [id]);
  }

  /**
   * Hard delete image
   */
  static async hardDelete(id) {
    return execute('DELETE FROM gallery WHERE id = ?', [id]);
  }

  /**
   * Get gallery statistics
   */
  static async getStats() {
    const total = await queryOne('SELECT COUNT(*) AS total FROM gallery WHERE is_active = 1');
    const featured = await queryOne(
      'SELECT COUNT(*) AS total FROM gallery WHERE is_active = 1 AND is_featured = 1'
    );
    const byCategory = await query(
      `SELECT c.name AS category, COUNT(g.id) AS count
       FROM gallery g
       LEFT JOIN gallery_categories c ON g.category_id = c.id
       WHERE g.is_active = 1
       GROUP BY c.name`
    );

    return {
      total: total.total,
      featured: featured.total,
      byCategory,
    };
  }
}

module.exports = Gallery;
