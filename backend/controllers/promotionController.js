const { query, queryOne, insert, execute } = require('../config/database');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { getPagination, paginationResponse } = require('../utils/helpers');

const validatePromoCode = asyncHandler(async (req, res) => {
  const { code, bookingAmount } = req.body;

  if (!code) {
    throw new ApiError('Promo code is required', 400);
  }

  const promo = await queryOne(
    `SELECT p.*,
            CASE
              WHEN p.end_date < NOW() THEN 'expired'
              WHEN p.start_date > NOW() THEN 'scheduled'
              WHEN p.max_uses > 0 AND p.used_count >= p.max_uses THEN 'exhausted'
              ELSE 'active'
            END AS availability_status
     FROM promotions p
     WHERE p.code = ?`,
    [code.toUpperCase()]
  );

  if (!promo) {
    throw new ApiError('Promo code not found', 404);
  }

  if (!promo.is_active) {
    throw new ApiError('Promo code is inactive', 400);
  }

  const now = new Date();
  if (new Date(promo.start_date) > now) {
    throw new ApiError('Promo code is not yet active', 400);
  }

  if (new Date(promo.end_date) < now) {
    throw new ApiError('Promo code has expired', 400);
  }

  if (promo.max_uses > 0 && promo.used_count >= promo.max_uses) {
    throw new ApiError('Promo code usage limit reached', 400);
  }

  if (promo.min_booking_amount > 0 && (!bookingAmount || bookingAmount < promo.min_booking_amount)) {
    throw new ApiError(`Minimum booking amount of $${promo.min_booking_amount} required`, 400);
  }

  let discount = 0;
  const amount = parseFloat(bookingAmount) || 0;

  if (promo.discount_type === 'percentage') {
    discount = (amount * promo.discount_value) / 100;
    if (promo.max_discount && discount > promo.max_discount) {
      discount = promo.max_discount;
    }
  } else {
    discount = promo.discount_value;
  }

  res.status(200).json({
    success: true,
    message: 'Promo code is valid',
    data: {
      valid: true,
      code: promo.code,
      title: promo.title,
      description: promo.description,
      discountType: promo.discount_type,
      discountValue: promo.discount_value,
      discount: parseFloat(discount.toFixed(2)),
      maxDiscount: promo.max_discount,
      minBookingAmount: promo.min_booking_amount,
      validUntil: promo.end_date,
    },
  });
});

const getAllPromotions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status = '', type = '', search = '' } = req.query;
  const { page: p, limit: l, offset } = getPagination(page, limit);

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
    whereClause += ' AND (p.code LIKE ? OR p.title LIKE ? OR p.description LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  const countResult = await queryOne(
    `SELECT COUNT(*) AS total FROM promotions p ${whereClause}`,
    params
  );

  const promotions = await query(
    `SELECT p.*,
            CASE
              WHEN p.end_date < NOW() THEN 'expired'
              WHEN p.start_date > NOW() THEN 'scheduled'
              WHEN p.max_uses > 0 AND p.used_count >= p.max_uses THEN 'exhausted'
              ELSE 'active'
            END AS availability_status
     FROM promotions p
     ${whereClause}
     ORDER BY p.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, l, offset]
  );

  res.status(200).json({
    success: true,
    data: {
      promotions,
      pagination: paginationResponse(countResult.total, p, l),
    },
  });
});

const createPromotion = asyncHandler(async (req, res) => {
  const { code, title, description, discountType, discountValue, maxDiscount,
    minBookingAmount, startDate, endDate, maxUses, isActive } = req.body;

  const existing = await queryOne('SELECT id FROM promotions WHERE code = ?', [code.toUpperCase()]);
  if (existing) {
    throw new ApiError('Promo code already exists', 400);
  }

  if (new Date(startDate) >= new Date(endDate)) {
    throw new ApiError('End date must be after start date', 400);
  }

  const promoId = await insert(
    `INSERT INTO promotions (code, title, description, discount_type, discount_value,
      max_discount, min_booking_amount, start_date, end_date, max_uses, used_count, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [
      code.toUpperCase(),
      title,
      description || null,
      discountType || 'percentage',
      discountValue,
      maxDiscount || null,
      minBookingAmount || 0,
      startDate,
      endDate,
      maxUses || 0,
      isActive !== undefined ? (isActive ? 1 : 0) : 1,
    ]
  );

  const promotion = await queryOne(
    `SELECT p.*,
            CASE
              WHEN p.end_date < NOW() THEN 'expired'
              WHEN p.start_date > NOW() THEN 'scheduled'
              WHEN p.max_uses > 0 AND p.used_count >= p.max_uses THEN 'exhausted'
              ELSE 'active'
            END AS availability_status
     FROM promotions p WHERE p.id = ?`,
    [promoId]
  );

  res.status(201).json({
    success: true,
    message: 'Promotion created successfully',
    data: { promotion },
  });
});

const updatePromotion = asyncHandler(async (req, res) => {
  const existing = await queryOne('SELECT id FROM promotions WHERE id = ?', [req.params.id]);
  if (!existing) {
    throw new ApiError('Promotion not found', 404);
  }

  const { code, title, description, discountType, discountValue, maxDiscount,
    minBookingAmount, startDate, endDate, maxUses, isActive } = req.body;

  if (code) {
    const dup = await queryOne('SELECT id FROM promotions WHERE code = ? AND id != ?', [code.toUpperCase(), req.params.id]);
    if (dup) {
      throw new ApiError('Promo code already exists', 400);
    }
  }

  const fields = [];
  const values = [];

  if (code !== undefined) { fields.push('code = ?'); values.push(code.toUpperCase()); }
  if (title !== undefined) { fields.push('title = ?'); values.push(title); }
  if (description !== undefined) { fields.push('description = ?'); values.push(description); }
  if (discountType !== undefined) { fields.push('discount_type = ?'); values.push(discountType); }
  if (discountValue !== undefined) { fields.push('discount_value = ?'); values.push(discountValue); }
  if (maxDiscount !== undefined) { fields.push('max_discount = ?'); values.push(maxDiscount); }
  if (minBookingAmount !== undefined) { fields.push('min_booking_amount = ?'); values.push(minBookingAmount); }
  if (startDate !== undefined) { fields.push('start_date = ?'); values.push(startDate); }
  if (endDate !== undefined) { fields.push('end_date = ?'); values.push(endDate); }
  if (maxUses !== undefined) { fields.push('max_uses = ?'); values.push(maxUses); }
  if (isActive !== undefined) { fields.push('is_active = ?'); values.push(isActive ? 1 : 0); }

  if (fields.length === 0) {
    throw new ApiError('No fields to update', 400);
  }

  values.push(req.params.id);
  await execute(`UPDATE promotions SET ${fields.join(', ')} WHERE id = ?`, values);

  const promotion = await queryOne(
    `SELECT p.*,
            CASE
              WHEN p.end_date < NOW() THEN 'expired'
              WHEN p.start_date > NOW() THEN 'scheduled'
              WHEN p.max_uses > 0 AND p.used_count >= p.max_uses THEN 'exhausted'
              ELSE 'active'
            END AS availability_status
     FROM promotions p WHERE p.id = ?`,
    [req.params.id]
  );

  res.status(200).json({
    success: true,
    message: 'Promotion updated successfully',
    data: { promotion },
  });
});

const deletePromotion = asyncHandler(async (req, res) => {
  const promo = await queryOne('SELECT id FROM promotions WHERE id = ?', [req.params.id]);
  if (!promo) {
    throw new ApiError('Promotion not found', 404);
  }

  await execute('UPDATE promotions SET is_active = 0 WHERE id = ?', [req.params.id]);

  res.status(200).json({
    success: true,
    message: 'Promotion deleted successfully',
  });
});

module.exports = {
  validatePromoCode,
  getAllPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
};
