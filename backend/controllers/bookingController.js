const { query, queryOne, insert, execute, transaction } = require('../config/database');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { getPagination, paginationResponse, generateBookingReference, calculateNights, calculateBookingTotal } = require('../utils/helpers');
const { sendBookingConfirmation, sendBookingCancellation } = require('../utils/email');
const { sendCheckoutThankYou } = require('../utils/sms');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const createBooking = asyncHandler(async (req, res) => {
  const { roomId, checkIn, checkOut, adults, children, specialRequests } = req.body;

  if (new Date(checkIn) >= new Date(checkOut)) {
    throw new ApiError('Check-out must be after check-in', 400);
  }

  if (new Date(checkIn) < new Date().setHours(0, 0, 0, 0)) {
    throw new ApiError('Check-in date cannot be in the past', 400);
  }

  let bookingUserId = req.user.id;

  const booking = await transaction(async (connection) => {
    const nights = calculateNights(checkIn, checkOut);

    const guest = req.body.guest;
    const isStaff = ['admin', 'super_admin', 'receptionist'].includes(req.user.role);
    if (guest && isStaff) {
      const gFirstName = ((guest.firstName || guest.first_name) || '').trim();
      const gLastName = ((guest.lastName || guest.last_name) || '').trim();
      if (!gFirstName || !gLastName) {
        throw new ApiError('Guest first and last name are required', 400);
      }
      let gEmail = ((guest.email || '') || '').trim().toLowerCase();
      if (!gEmail) {
        gEmail = 'walkin' + Date.now() + '@everetthotel.local';
      }
      const gPhone = ((guest.phone || '') || '').trim() || null;

      const [existingGuest] = await connection.execute(
        'SELECT id FROM users WHERE email = ?',
        [gEmail]
      );
      if (existingGuest.length > 0) {
        bookingUserId = existingGuest[0].id;
      } else {
        const dummyPassword = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
        const [insertGuest] = await connection.execute(
          `INSERT INTO users (first_name, last_name, email, password_hash, phone, role_id, is_active, is_verified)
           VALUES (?, ?, ?, ?, ?, 2, 1, 1)`,
          [gFirstName, gLastName, gEmail, dummyPassword, gPhone]
        );
        bookingUserId = insertGuest.insertId;
      }
    }

    const [roomResults] = await connection.execute(
      `SELECT r.price_per_night, rc.max_adults, rc.max_children, rc.name AS category_name
       FROM rooms r JOIN room_categories rc ON r.category_id = rc.id
       WHERE r.id = ? AND r.is_active = 1 AND r.status = 'available' FOR UPDATE`,
      [roomId]
    );

    if (!roomResults || roomResults.length === 0) {
      throw new ApiError('Room is not available', 400);
    }

    const room = roomResults[0];

    if (adults > room.max_adults) {
      throw new ApiError(`This room allows a maximum of ${room.max_adults} adults`, 400);
    }
    if ((children || 0) > room.max_children) {
      throw new ApiError(`This room allows a maximum of ${room.max_children} children`, 400);
    }

    const [conflictResults] = await connection.execute(
      `SELECT COUNT(*) AS count FROM bookings
       WHERE room_id = ? AND status IN ('pending', 'confirmed', 'checked_in')
       AND check_in < ? AND check_out > ?`,
      [roomId, checkOut, checkIn]
    );

    if (conflictResults[0].count > 0) {
      throw new ApiError('Room is not available for the selected dates', 400);
    }

    const pricing = calculateBookingTotal(room.price_per_night, nights);
    const bookingReference = generateBookingReference();

    const [result] = await connection.execute(
      `INSERT INTO bookings (booking_reference, user_id, room_id, check_in, check_out,
        adults, children_count, total_amount, tax_amount, final_amount, special_requests, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        bookingReference,
        bookingUserId,
        roomId,
        checkIn,
        checkOut,
        adults || 1,
        children || 0,
        pricing.subtotal,
        pricing.taxAmount,
        pricing.totalAmount,
        specialRequests || null,
      ]
    );

    await connection.execute("UPDATE rooms SET status = 'reserved' WHERE id = ?", [roomId]);

    const [createdBooking] = await connection.execute(
      `SELECT b.*, r.room_number, rc.name AS room_category
       FROM bookings b
       JOIN rooms r ON b.room_id = r.id
       JOIN room_categories rc ON r.category_id = rc.id
       WHERE b.id = ?`,
      [result.insertId]
    );

    return createdBooking[0];
  });

  const user = await queryOne('SELECT first_name, email FROM users WHERE id = ?', [bookingUserId]);
  if (user && !/\.local$/.test(user.email)) {
    sendBookingConfirmation(user.email, user.first_name, {
      bookingReference: booking.booking_reference,
      roomNumber: booking.room_number,
      roomCategory: booking.room_category,
      checkIn: booking.check_in,
      checkOut: booking.check_out,
      adults: booking.adults,
      children: booking.children_count,
      finalAmount: booking.final_amount,
    }).catch(() => {});
  }

  res.status(201).json({
    success: true,
    message: 'Booking created successfully',
    data: { booking },
  });
});

const getMyBookings = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status = '' } = req.query;
  const { page: p, limit: l, offset } = getPagination(page, limit);

  let whereClause = 'WHERE b.user_id = ?';
  const params = [req.user.id];

  if (status) {
    whereClause += ' AND b.status = ?';
    params.push(status);
  }

  const countResult = await queryOne(
    `SELECT COUNT(*) AS total FROM bookings b ${whereClause}`,
    params
  );

  const bookings = await query(
    `SELECT b.*, r.room_number, rc.name AS room_category, rc.slug AS category_slug
     FROM bookings b
     JOIN rooms r ON b.room_id = r.id
     JOIN room_categories rc ON r.category_id = rc.id
     ${whereClause}
     ORDER BY b.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, l, offset]
  );

  res.status(200).json({
    success: true,
    data: {
      bookings,
      pagination: paginationResponse(countResult.total, p, l),
    },
  });
});

const getBookingById = asyncHandler(async (req, res) => {
  const booking = await queryOne(
    `SELECT b.*, u.first_name, u.last_name, u.email, u.phone,
            r.room_number, rc.name AS room_category, rc.slug AS category_slug
     FROM bookings b
     JOIN users u ON b.user_id = u.id
     JOIN rooms r ON b.room_id = r.id
     JOIN room_categories rc ON r.category_id = rc.id
     WHERE b.id = ?`,
    [req.params.id]
  );

  if (!booking) {
    throw new ApiError('Booking not found', 404);
  }

  if (req.user.role !== 'admin' && req.user.role !== 'super_admin' && booking.user_id !== req.user.id) {
    throw new ApiError('Not authorized to view this booking', 403);
  }

  booking.payments = await query(
    'SELECT * FROM payments WHERE booking_id = ? ORDER BY created_at DESC',
    [req.params.id]
  );

  res.status(200).json({
    success: true,
    data: { booking },
  });
});

const cancelBooking = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const booking = await queryOne(
    `SELECT b.* FROM bookings b
     WHERE b.id = ? AND b.user_id = ?`,
    [req.params.id, req.user.id]
  );

  if (!booking) {
    throw new ApiError('Booking not found', 404);
  }

  if (!['pending', 'confirmed'].includes(booking.status)) {
    throw new ApiError('Booking cannot be cancelled in its current status', 400);
  }

  await transaction(async (connection) => {
    await connection.execute(
      "UPDATE bookings SET status = 'cancelled', cancellation_reason = ?, cancelled_at = NOW() WHERE id = ?",
      [reason || null, req.params.id]
    );
    await connection.execute("UPDATE rooms SET status = 'available' WHERE id = ?", [booking.room_id]);
  });

  const updatedBooking = await queryOne(
    `SELECT b.*, r.room_number, rc.name AS room_category
     FROM bookings b
     JOIN rooms r ON b.room_id = r.id
     JOIN room_categories rc ON r.category_id = rc.id
     WHERE b.id = ?`,
    [req.params.id]
  );

  const user = await queryOne('SELECT first_name, email FROM users WHERE id = ?', [req.user.id]);
  if (user) {
    sendBookingCancellation(user.email, user.first_name, {
      bookingReference: updatedBooking.booking_reference,
      roomNumber: updatedBooking.room_number,
      roomCategory: updatedBooking.room_category,
      checkIn: updatedBooking.check_in,
      checkOut: updatedBooking.check_out,
    }).catch(() => {});
  }

  res.status(200).json({
    success: true,
    message: 'Booking cancelled successfully',
    data: { booking: updatedBooking },
  });
});

const getAllBookings = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status = '', search = '', checkIn = '', checkOut = '' } = req.query;
  const { page: p, limit: l, offset } = getPagination(page, limit);

  let whereClause = 'WHERE 1=1';
  const params = [];

  if (status) {
    whereClause += ' AND b.status = ?';
    params.push(status);
  }

  if (search) {
    whereClause += ' AND (b.booking_reference LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ? OR r.room_number LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }

  if (checkIn) {
    whereClause += ' AND b.check_in >= ?';
    params.push(checkIn);
  }

  if (checkOut) {
    whereClause += ' AND b.check_out <= ?';
    params.push(checkOut);
  }

  const countResult = await queryOne(
    `SELECT COUNT(*) AS total FROM bookings b
     JOIN users u ON b.user_id = u.id
     JOIN rooms r ON b.room_id = r.id
     ${whereClause}`,
    params
  );

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
    [...params, l, offset]
  );

  res.status(200).json({
    success: true,
    data: {
      bookings,
      pagination: paginationResponse(countResult.total, p, l),
    },
  });
});

const updateBookingStatus = asyncHandler(async (req, res) => {
  const { status, reason } = req.body;
  const validStatuses = ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'];

  if (!validStatuses.includes(status)) {
    throw new ApiError('Invalid booking status', 400);
  }

  const booking = await queryOne(
    'SELECT b.* FROM bookings b WHERE b.id = ?',
    [req.params.id]
  );

  if (!booking) {
    throw new ApiError('Booking not found', 404);
  }

  await transaction(async (connection) => {
    const updates = ['status = ?'];
    const values = [status];

    if (status === 'cancelled') {
      updates.push('cancelled_at = NOW()');
      if (reason) {
        updates.push('cancellation_reason = ?');
        values.push(reason);
      }
    }

    values.push(req.params.id);
    await connection.execute(
      `UPDATE bookings SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    if (status === 'confirmed') {
      await connection.execute("UPDATE rooms SET status = 'reserved' WHERE id = ?", [booking.room_id]);
    } else if (status === 'checked_in') {
      await connection.execute("UPDATE rooms SET status = 'occupied' WHERE id = ?", [booking.room_id]);
    } else if (status === 'checked_out' || status === 'cancelled') {
      await connection.execute("UPDATE rooms SET status = 'available' WHERE id = ?", [booking.room_id]);
    }
  });

  const updatedBooking = await queryOne(
    `SELECT b.*, u.first_name, u.last_name, u.email, u.phone,
            r.room_number, rc.name AS room_category
     FROM bookings b
     JOIN users u ON b.user_id = u.id
     JOIN rooms r ON b.room_id = r.id
     JOIN room_categories rc ON r.category_id = rc.id
     WHERE b.id = ?`,
    [req.params.id]
  );

  res.status(200).json({
    success: true,
    message: 'Booking status updated successfully',
    data: { booking: updatedBooking },
  });
});

const sendCheckoutSms = asyncHandler(async (req, res) => {
  const booking = await queryOne(
    `SELECT b.*, u.first_name, u.last_name, u.email, u.phone
     FROM bookings b
     JOIN users u ON b.user_id = u.id
     WHERE b.id = ?`,
    [req.params.id]
  );

  if (!booking) {
    throw new ApiError('Booking not found', 404);
  }

  if (!booking.phone) {
    throw new ApiError('This guest has no phone number on file to send the SMS to.', 400);
  }

  const result = await sendCheckoutThankYou(booking.phone, booking.first_name, booking.booking_reference);

  if (!result.success) {
    throw new ApiError(result.error || 'SMS could not be sent', 502);
  }

  res.status(200).json({
    success: true,
    message: 'Checkout SMS sent successfully',
    data: {
      bookingReference: booking.booking_reference,
      phone: booking.phone,
    },
  });
});

const getBookingStats = asyncHandler(async (req, res) => {
  const total = await queryOne('SELECT COUNT(*) AS total FROM bookings');
  const byStatus = await query(
    'SELECT status, COUNT(*) AS count FROM bookings GROUP BY status'
  );
  const todayCheckIns = await queryOne(
    "SELECT COUNT(*) AS total FROM bookings WHERE check_in = CURDATE() AND status IN ('confirmed', 'checked_in')"
  );
  const todayCheckOuts = await queryOne(
    "SELECT COUNT(*) AS total FROM bookings WHERE check_out = CURDATE() AND status IN ('checked_in', 'checked_out')"
  );
  const thisMonth = await queryOne(
    "SELECT COUNT(*) AS total FROM bookings WHERE created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')"
  );
  const totalRevenue = await queryOne(
    "SELECT COALESCE(SUM(final_amount), 0) AS total FROM bookings WHERE status IN ('confirmed', 'checked_in', 'checked_out')"
  );
  const averageBookingValue = await queryOne(
    "SELECT COALESCE(AVG(final_amount), 0) AS avg FROM bookings WHERE status IN ('confirmed', 'checked_in', 'checked_out')"
  );

  res.status(200).json({
    success: true,
    data: {
      total: total.total,
      byStatus,
      todayCheckIns: todayCheckIns.total,
      todayCheckOuts: todayCheckOuts.total,
      thisMonth: thisMonth.total,
      totalRevenue: totalRevenue.total,
      averageBookingValue: averageBookingValue.avg,
    },
  });
});

const checkAvailability = asyncHandler(async (req, res) => {
  const { roomId, checkIn, checkOut, excludeBookingId } = req.query;

  if (!roomId || !checkIn || !checkOut) {
    throw new ApiError('Room ID, check-in, and check-out dates are required', 400);
  }

  let sql = `
    SELECT COUNT(*) AS count FROM bookings
    WHERE room_id = ? AND status IN ('pending', 'confirmed', 'checked_in')
    AND check_in < ? AND check_out > ?`;
  const params = [roomId, checkOut, checkIn];

  if (excludeBookingId) {
    sql += ' AND id != ?';
    params.push(excludeBookingId);
  }

  const result = await queryOne(sql, params);

  res.status(200).json({
    success: true,
    data: {
      available: result.count === 0,
      roomId: parseInt(roomId, 10),
      checkIn,
      checkOut,
    },
  });
});

module.exports = {
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
  getAllBookings,
  updateBookingStatus,
  sendCheckoutSms,
  getBookingStats,
  checkAvailability,
};
