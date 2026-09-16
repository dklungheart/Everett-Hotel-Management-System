/**
 * Promotion Model - Everett Hotel Management System
 * Handles all database operations for promotions and promo codes
 */

const { query, queryOne, insert, execute } = require('../config/database');
const { generateSlug } = require('../utils/helpers');

class Promotion {
  /**
   * Find promotion by ID
   */
  static async findById(id) {
    return queryOne(
      `SELECT p.*,
              CASE
                WHEN p.end_date < NOW() THEN 'expired'
                WHEN p.start_date > NOW() THEN 'scheduled'
                WHEN p.max_uses > 0 AND p.current_uses >= p.max_uses THEN 'exhausted'
                ELSE 'active'
              END AS availability_status
       FROM promotions p
       WHERE p.id = ?`,
      [id]
    );
  }

  /**
   * Find promotion by code
   */
  static async findByCode(code) {
    return queryOne(
      `SELECT p.*,
              CASE
                WHEN p.end_date < NOW() THEN 'expired'
                WHEN p.start_date > NOW() THEN 'scheduled'
                WHEN p.max_uses > 0 AND p.current_uses >= p.max_uses THEN 'exhausted'
                ELSE 'active'
              END AS availability_status
       FROM promotions p
       WHERE p.code = ?`,
      [code]
    );
  }

  /**
   * Validate a promo code for a given booking
   */
  static async validateCode(code, bookingAmount = 0) {
    const promo = await this.findByCode(code);

    if (!promo) {
      return { valid: false, message: 'Promo code not found' };
    }

    if (!promo.is_active) {
      return { valid: false, message: 'Promo code is inactive' };
    }

    const now = new Date();
    if (new Date(promo.start_date) > now) {
      return { valid: false, message: 'Promo code is not yet active' };
    }

    if (new Date(promo.end_date) < now) {
      return { valid: false, message: 'Promo code has expired' };
    }

    if (promo.max_uses > 0 && promo.current_uses >= promo.max_uses) {
      return { valid: false, message: 'Promo code usage limit reached' };
    }

    if (promo.min_amount > 0 && bookingAmount < promo.min_amount) {
      return {
        valid: false,
        message: `Minimum booking amount of $${promo.min_amount} required`,
      };
    }

    let discount = 0;
    if (promo.discount_type === 'percentage') {
      discount = (bookingAmount * promo.discount_value) / 100;
      if (promo.max_discount && discount > promo.max_discount) {
        discount = promo.max_discount;
      }
    } else {
      discount = promo.discount_value;
    }

    return {
      valid: true,
      promotion: promo,
      discount: parseFloat(discount.toFixed(2)),
      discountType: promo.discount_type,
      discountValue: promo.discount_value,
    };
  }

  /**
   * Get all promotions with filters
   */
  static async findAll({ page = 1, limit = 10, status = '', type = '', search = '' } = {}) {
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (status === 'active') {
      whereClause += " AND p.is_active = 1 AND p.end_date >= NOW() AND p.start_date <= NOW()";
    } else if (status === 'expired') {
      whereClause += ' AND p.end_date < NOW()';
    } else if (status === 'scheduled') {
      whereClause += ' AND p.start_date > NOW()';
    } else if (status === 'inactive') {
      whereClause += ' AND p.is_active = 0';
    }

    if (type) {
      whereClause += ' AND p.discount_type = ?';
      params.push(type);
    }

    if (search) {
      whereClause += ' AND (p.code LIKE ? OR p.name LIKE ? OR p.description LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    const countResult = await queryOne(
      `SELECT COUNT(*) AS total FROM promotions p ${whereClause}`,
      params
    );

    const offset = (page - 1) * limit;
    const promotions = await query(
      `SELECT p.*,
              CASE
                WHEN p.end_date < NOW() THEN 'expired'
                WHEN p.start_date > NOW() THEN 'scheduled'
                WHEN p.max_uses > 0 AND p.current_uses >= p.max_uses THEN 'exhausted'
                ELSE 'active'
              END AS availability_status
       FROM promotions p
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { promotions, total: countResult.total };
  }

  /**
   * Get currently active promotions
   */
  static async findActive() {
    return query(
      `SELECT * FROM promotions
       WHERE is_active = 1 AND start_date <= NOW() AND end_date >= NOW()
       AND (max_uses = 0 OR current_uses < max_uses)
       ORDER BY discount_value DESC`
    );
  }

  /**
   * Create a promotion
   */
  static async create(promoData) {
    const id = await insert(
      `INSERT INTO promotions (code, name, description, discount_type, discount_value,
        max_discount, min_amount, start_date, end_date, max_uses, current_uses,
        applicable_room_types, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [
        promoData.code.toUpperCase(),
        promoData.name,
        promoData.description || null,
        promoData.discountType || 'percentage',
        promoData.discountValue,
        promoData.maxDiscount || null,
        promoData.minAmount || 0,
        promoData.startDate,
        promoData.endDate,
        promoData.maxUses || 0,
        promoData.applicableRoomTypes || null,
        promoData.isActive !== undefined ? (promoData.isActive ? 1 : 0) : 1,
      ]
    );

    return this.findById(id);
  }

  /**
   * Update a promotion
   */
  static async update(id, promoData) {
    const fields = [];
    const values = [];

    const allowedFields = [
      'code', 'name', 'description', 'discount_type', 'discount_value',
      'max_discount', 'min_amount', 'start_date', 'end_date', 'max_uses',
      'applicable_room_types', 'is_active',
    ];

    for (const field of allowedFields) {
      const camelField = field.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      if (promoData[camelField] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(promoData[camelField]);
      }
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    await execute(
      `UPDATE promotions SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  /**
   * Increment usage count
   */
  static async incrementUsage(id) {
    await execute(
      'UPDATE promotions SET current_uses = current_uses + 1 WHERE id = ?',
      [id]
    );
    return this.findById(id);
  }

  /**
   * Delete promotion
   */
  static async delete(id) {
    await execute('UPDATE promotions SET is_active = 0 WHERE id = ?', [id]);
  }

  /**
   * Get promotion statistics
   */
  static async getStats() {
    const total = await queryOne('SELECT COUNT(*) AS total FROM promotions');
    const active = await queryOne(
      "SELECT COUNT(*) AS total FROM promotions WHERE is_active = 1 AND start_date <= NOW() AND end_date >= NOW()"
    );
    const totalDiscountGiven = await queryOne(
      'SELECT COALESCE(SUM(current_uses), 0) AS total FROM promotions'
    );

    return {
      total: total.total,
      active: active.total,
      totalUsage: totalDiscountGiven.total,
    };
  }
}

module.exports = Promotion;
