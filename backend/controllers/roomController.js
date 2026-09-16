const { query, queryOne, insert, execute } = require('../config/database');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { getPagination, paginationResponse, generateSlug } = require('../utils/helpers');

const getAllRooms = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, category = '', status = '', floor = '', search = '' } = req.query;
  const { page: p, limit: l, offset } = getPagination(page, limit);

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

  const rooms = await query(
    `SELECT r.id, r.room_number, r.floor, r.status, r.price_per_night, r.description, r.image,
            rc.name AS category_name, rc.slug AS category_slug, rc.bed_type, rc.room_size
     FROM rooms r
     JOIN room_categories rc ON r.category_id = rc.id
     ${whereClause}
     ORDER BY r.room_number ASC
     LIMIT ? OFFSET ?`,
    [...params, l, offset]
  );

  res.status(200).json({
    success: true,
    data: {
      rooms,
      pagination: paginationResponse(countResult.total, p, l),
    },
  });
});

const getRoomById = asyncHandler(async (req, res) => {
  const room = await queryOne(
    `SELECT r.*, rc.name AS category_name, rc.slug AS category_slug,
            rc.description AS category_description, rc.max_adults, rc.max_children,
            rc.bed_type, rc.room_size
     FROM rooms r
     JOIN room_categories rc ON r.category_id = rc.id
     WHERE r.id = ?`,
    [req.params.id]
  );

  if (!room) {
    throw new ApiError('Room not found', 404);
  }

  room.amenities = await query(
    `SELECT a.id, a.name, a.icon
     FROM amenities a
     JOIN room_amenities ra ON a.id = ra.amenity_id
     WHERE ra.room_id = ?`,
    [req.params.id]
  );

  room.images = await query(
    'SELECT * FROM room_images WHERE room_id = ? ORDER BY sort_order',
    [req.params.id]
  );

  res.status(200).json({
    success: true,
    data: { room },
  });
});

const getAvailableRooms = asyncHandler(async (req, res) => {
  const { checkIn, checkOut, category = '', adults = 1, children = 0 } = req.query;

  if (!checkIn || !checkOut) {
    throw new ApiError('Check-in and check-out dates are required', 400);
  }

  if (new Date(checkIn) >= new Date(checkOut)) {
    throw new ApiError('Check-out must be after check-in', 400);
  }

  let whereClause = `
    WHERE r.is_active = 1 AND r.status = 'available'
    AND rc.max_adults >= ? AND rc.max_children >= ?`;
  const params = [parseInt(adults, 10), parseInt(children, 10)];

  if (category) {
    whereClause += ' AND rc.slug = ?';
    params.push(category);
  }

  whereClause += `
    AND r.id NOT IN (
      SELECT b.room_id FROM bookings b
      WHERE b.status IN ('confirmed', 'checked_in', 'pending')
      AND b.check_in < ? AND b.check_out > ?
    )`;
  params.push(checkOut, checkIn);

  const rooms = await query(
    `SELECT r.*, rc.name AS category_name, rc.slug AS category_slug,
            rc.description AS category_description, rc.max_adults, rc.max_children,
            rc.bed_type, rc.room_size
     FROM rooms r
     JOIN room_categories rc ON r.category_id = rc.id
     ${whereClause}
     ORDER BY r.price_per_night ASC`,
    params
  );

  res.status(200).json({
    success: true,
    data: { rooms, count: rooms.length },
  });
});

const createRoom = asyncHandler(async (req, res) => {
  const { roomNumber, categoryId, floor, pricePerNight, description, status, amenities } = req.body;

  const existing = await queryOne('SELECT id FROM rooms WHERE room_number = ?', [roomNumber]);
  if (existing) {
    throw new ApiError('Room number already exists', 400);
  }

  const category = await queryOne('SELECT id FROM room_categories WHERE id = ?', [categoryId]);
  if (!category) {
    throw new ApiError('Room category not found', 404);
  }

  const roomId = await insert(
    `INSERT INTO rooms (room_number, category_id, floor, price_per_night, description, image, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      roomNumber,
      categoryId,
      floor || 1,
      pricePerNight,
      description || null,
      req.file ? `/uploads/${req.file.filename}` : null,
      status || 'available',
    ]
  );

  if (amenities && amenities.length > 0) {
    for (const amenityId of amenities) {
      await insert('INSERT INTO room_amenities (room_id, amenity_id) VALUES (?, ?)', [roomId, amenityId]);
    }
  }

  const room = await queryOne(
    `SELECT r.*, rc.name AS category_name, rc.slug AS category_slug
     FROM rooms r JOIN room_categories rc ON r.category_id = rc.id WHERE r.id = ?`,
    [roomId]
  );

  res.status(201).json({
    success: true,
    message: 'Room created successfully',
    data: { room },
  });
});

const updateRoom = asyncHandler(async (req, res) => {
  const existing = await queryOne('SELECT id FROM rooms WHERE id = ?', [req.params.id]);
  if (!existing) {
    throw new ApiError('Room not found', 404);
  }

  const { roomNumber, categoryId, floor, pricePerNight, description, status, amenities, isActive } = req.body;

  if (roomNumber) {
    const dup = await queryOne('SELECT id FROM rooms WHERE room_number = ? AND id != ?', [roomNumber, req.params.id]);
    if (dup) {
      throw new ApiError('Room number already exists', 400);
    }
  }

  const fields = [];
  const values = [];

  if (roomNumber !== undefined) { fields.push('room_number = ?'); values.push(roomNumber); }
  if (categoryId !== undefined) { fields.push('category_id = ?'); values.push(categoryId); }
  if (floor !== undefined) { fields.push('floor = ?'); values.push(floor); }
  if (pricePerNight !== undefined) { fields.push('price_per_night = ?'); values.push(pricePerNight); }
  if (description !== undefined) { fields.push('description = ?'); values.push(description); }
  if (status !== undefined) { fields.push('status = ?'); values.push(status); }
  if (isActive !== undefined) { fields.push('is_active = ?'); values.push(isActive ? 1 : 0); }
  if (req.file) { fields.push('image = ?'); values.push(`/uploads/${req.file.filename}`); }

  if (fields.length > 0) {
    values.push(req.params.id);
    await execute(`UPDATE rooms SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  if (amenities) {
    await execute('DELETE FROM room_amenities WHERE room_id = ?', [req.params.id]);
    for (const amenityId of amenities) {
      await insert('INSERT INTO room_amenities (room_id, amenity_id) VALUES (?, ?)', [req.params.id, amenityId]);
    }
  }

  const room = await queryOne(
    `SELECT r.*, rc.name AS category_name, rc.slug AS category_slug
     FROM rooms r JOIN room_categories rc ON r.category_id = rc.id WHERE r.id = ?`,
    [req.params.id]
  );

  res.status(200).json({
    success: true,
    message: 'Room updated successfully',
    data: { room },
  });
});

const deleteRoom = asyncHandler(async (req, res) => {
  const room = await queryOne('SELECT id FROM rooms WHERE id = ?', [req.params.id]);
  if (!room) {
    throw new ApiError('Room not found', 404);
  }

  const activeBooking = await queryOne(
    "SELECT COUNT(*) AS total FROM bookings WHERE room_id = ? AND status IN ('pending', 'confirmed', 'checked_in')",
    [req.params.id]
  );

  if (activeBooking.total > 0) {
    throw new ApiError('Cannot delete room with active bookings', 400);
  }

  await execute('UPDATE rooms SET is_active = 0 WHERE id = ?', [req.params.id]);

  res.status(200).json({
    success: true,
    message: 'Room deleted successfully',
  });
});

const getRoomStats = asyncHandler(async (req, res) => {
  const total = await queryOne('SELECT COUNT(*) AS total FROM rooms WHERE is_active = 1');
  const byStatus = await query(
    'SELECT status, COUNT(*) AS count FROM rooms WHERE is_active = 1 GROUP BY status'
  );
  const byCategory = await query(
    `SELECT rc.name AS category, COUNT(r.id) AS count
     FROM rooms r JOIN room_categories rc ON r.category_id = rc.id
     WHERE r.is_active = 1 GROUP BY rc.name`
  );
  const occupancyRate = await queryOne(
    `SELECT ROUND(
       (SELECT COUNT(*) FROM rooms WHERE status = 'occupied' AND is_active = 1) /
       NULLIF((SELECT COUNT(*) FROM rooms WHERE is_active = 1), 0) * 100, 2
     ) AS rate`
  );
  const averagePrice = await queryOne(
    'SELECT ROUND(AVG(price_per_night), 2) AS avg_price FROM rooms WHERE is_active = 1'
  );

  res.status(200).json({
    success: true,
    data: {
      total: total.total,
      byStatus,
      byCategory,
      occupancyRate: occupancyRate.rate || 0,
      averagePrice: averagePrice.avg_price || 0,
    },
  });
});

const getCategories = asyncHandler(async (req, res) => {
  const categories = await query(
    `SELECT rc.*, COUNT(r.id) AS room_count
     FROM room_categories rc
     LEFT JOIN rooms r ON rc.id = r.category_id AND r.is_active = 1
     WHERE rc.is_active = 1
     GROUP BY rc.id
     ORDER BY rc.sort_order ASC, rc.name ASC`
  );

  res.status(200).json({
    success: true,
    data: { categories },
  });
});

const createCategory = asyncHandler(async (req, res) => {
  const { name, description, pricePerNight, maxAdults, maxChildren, bedType, roomSize, sortOrder } = req.body;

  const slug = generateSlug(name);

  const existing = await queryOne('SELECT id FROM room_categories WHERE slug = ?', [slug]);
  if (existing) {
    throw new ApiError('Category with similar name already exists', 400);
  }

  const categoryId = await insert(
    `INSERT INTO room_categories (name, slug, description, base_price, max_adults,
      max_children, bed_type, room_size, image, sort_order, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      name,
      slug,
      description || null,
      pricePerNight,
      maxAdults || 2,
      maxChildren || 1,
      bedType || 'queen',
      roomSize || null,
      req.file ? `/uploads/${req.file.filename}` : null,
      sortOrder || 0,
    ]
  );

  const category = await queryOne('SELECT * FROM room_categories WHERE id = ?', [categoryId]);

  res.status(201).json({
    success: true,
    message: 'Category created successfully',
    data: { category },
  });
});

const updateCategory = asyncHandler(async (req, res) => {
  const existing = await queryOne('SELECT id FROM room_categories WHERE id = ?', [req.params.id]);
  if (!existing) {
    throw new ApiError('Category not found', 404);
  }

  const { name, description, pricePerNight, maxAdults, maxChildren, bedType, roomSize, sortOrder, isActive } = req.body;

  const fields = [];
  const values = [];

  if (name !== undefined) { fields.push('name = ?'); values.push(name); fields.push('slug = ?'); values.push(generateSlug(name)); }
  if (description !== undefined) { fields.push('description = ?'); values.push(description); }
  if (pricePerNight !== undefined) { fields.push('price_per_night = ?'); values.push(pricePerNight); }
  if (maxAdults !== undefined) { fields.push('max_adults = ?'); values.push(maxAdults); }
  if (maxChildren !== undefined) { fields.push('max_children = ?'); values.push(maxChildren); }
  if (bedType !== undefined) { fields.push('bed_type = ?'); values.push(bedType); }
  if (roomSize !== undefined) { fields.push('room_size = ?'); values.push(roomSize); }
  if (sortOrder !== undefined) { fields.push('sort_order = ?'); values.push(sortOrder); }
  if (isActive !== undefined) { fields.push('is_active = ?'); values.push(isActive ? 1 : 0); }
  if (req.file) { fields.push('image = ?'); values.push(`/uploads/${req.file.filename}`); }

  if (fields.length > 0) {
    values.push(req.params.id);
    await execute(`UPDATE room_categories SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  const category = await queryOne('SELECT * FROM room_categories WHERE id = ?', [req.params.id]);

  res.status(200).json({
    success: true,
    message: 'Category updated successfully',
    data: { category },
  });
});

const deleteCategory = asyncHandler(async (req, res) => {
  const category = await queryOne('SELECT id FROM room_categories WHERE id = ?', [req.params.id]);
  if (!category) {
    throw new ApiError('Category not found', 404);
  }

  const roomCount = await queryOne(
    "SELECT COUNT(*) AS total FROM rooms WHERE category_id = ? AND is_active = 1",
    [req.params.id]
  );

  if (roomCount.total > 0) {
    throw new ApiError('Cannot delete category with active rooms', 400);
  }

  await execute('UPDATE room_categories SET is_active = 0 WHERE id = ?', [req.params.id]);

  res.status(200).json({
    success: true,
    message: 'Category deleted successfully',
  });
});

module.exports = {
  getAllRooms,
  getRoomById,
  getAvailableRooms,
  createRoom,
  updateRoom,
  deleteRoom,
  getRoomStats,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
