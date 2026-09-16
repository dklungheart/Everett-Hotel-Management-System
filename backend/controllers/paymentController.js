const { query, queryOne, insert, execute, transaction } = require('../config/database');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { getPagination, paginationResponse, generatePaymentReference } = require('../utils/helpers');

const createPayment = asyncHandler(async (req, res) => {
  const { bookingId, amount, method, transactionId, billingName, notes } = req.body;

  const payment = await transaction(async (connection) => {
    const [bookingResults] = await connection.execute(
      `SELECT b.*, u.first_name, u.last_name
       FROM bookings b JOIN users u ON b.user_id = u.id
       WHERE b.id = ? AND b.user_id = ? FOR UPDATE`,
      [bookingId, req.user.id]
    );

    if (!bookingResults || bookingResults.length === 0) {
      throw new ApiError('Booking not found', 404);
    }

    const booking = bookingResults[0];

    const [paidResults] = await connection.execute(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE booking_id = ? AND status = 'completed'",
      [bookingId]
    );

    const remainingAmount = parseFloat(booking.final_amount) - parseFloat(paidResults[0].total);

    if (parseFloat(amount) > remainingAmount + 0.01) {
      throw new ApiError(`Amount exceeds remaining balance of $${remainingAmount.toFixed(2)}`, 400);
    }

    const paymentReference = generatePaymentReference();

    const [result] = await connection.execute(
      `INSERT INTO payments (payment_reference, booking_id, user_id, amount, method, status, transaction_id, billing_name, notes)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
      [paymentReference, bookingId, req.user.id, amount, method, transactionId || null, billingName || null, notes || null]
    );

    const [paymentRows] = await connection.execute(
      `SELECT p.*, b.booking_reference
       FROM payments p JOIN bookings b ON p.booking_id = b.id
       WHERE p.id = ?`,
      [result.insertId]
    );

    return paymentRows[0];
  });

  res.status(201).json({
    success: true,
    message: 'Payment initiated successfully',
    data: { payment },
  });
});

const getMyPayments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const { page: p, limit: l, offset } = getPagination(page, limit);

  const countResult = await queryOne(
    'SELECT COUNT(*) AS total FROM payments WHERE user_id = ?',
    [req.user.id]
  );

  const payments = await query(
    `SELECT p.*, b.booking_reference
     FROM payments p JOIN bookings b ON p.booking_id = b.id
     WHERE p.user_id = ?
     ORDER BY p.created_at DESC
     LIMIT ? OFFSET ?`,
    [req.user.id, l, offset]
  );

  res.status(200).json({
    success: true,
    data: {
      payments,
      pagination: paginationResponse(countResult.total, p, l),
    },
  });
});

const getPaymentById = asyncHandler(async (req, res) => {
  const payment = await queryOne(
    `SELECT p.*, b.booking_reference, b.user_id, u.first_name, u.last_name, u.email
     FROM payments p
     JOIN bookings b ON p.booking_id = b.id
     JOIN users u ON p.user_id = u.id
     WHERE p.id = ?`,
    [req.params.id]
  );

  if (!payment) {
    throw new ApiError('Payment not found', 404);
  }

  if (req.user.role !== 'admin' && req.user.role !== 'super_admin' && payment.user_id !== req.user.id) {
    throw new ApiError('Not authorized to view this payment', 403);
  }

  res.status(200).json({
    success: true,
    data: { payment },
  });
});

const getAllPayments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status = '', method = '', search = '' } = req.query;
  const { page: p, limit: l, offset } = getPagination(page, limit);

  let whereClause = 'WHERE 1=1';
  const params = [];

  if (status) {
    whereClause += ' AND p.status = ?';
    params.push(status);
  }

  if (method) {
    whereClause += ' AND p.method = ?';
    params.push(method);
  }

  if (search) {
    whereClause += ' AND (p.payment_reference LIKE ? OR b.booking_reference LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }

  const countResult = await queryOne(
    `SELECT COUNT(*) AS total FROM payments p
     JOIN bookings b ON p.booking_id = b.id
     JOIN users u ON p.user_id = u.id
     ${whereClause}`,
    params
  );

  const payments = await query(
    `SELECT p.*, b.booking_reference, u.first_name, u.last_name, u.email
     FROM payments p
     JOIN bookings b ON p.booking_id = b.id
     JOIN users u ON p.user_id = u.id
     ${whereClause}
     ORDER BY p.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, l, offset]
  );

  res.status(200).json({
    success: true,
    data: {
      payments,
      pagination: paginationResponse(countResult.total, p, l),
    },
  });
});

const processRefund = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const updatedPayment = await transaction(async (connection) => {
    const [paymentRows] = await connection.execute(
      `SELECT p.*, b.id AS booking_id, b.user_id
       FROM payments p JOIN bookings b ON p.booking_id = b.id
       WHERE p.id = ? FOR UPDATE`,
      [req.params.id]
    );

    if (!paymentRows || paymentRows.length === 0) {
      throw new ApiError('Payment not found', 404);
    }

    const payment = paymentRows[0];

    if (payment.status !== 'completed') {
      throw new ApiError('Only completed payments can be refunded', 400);
    }

    await connection.execute(
      "UPDATE payments SET status = 'refunded', notes = CONCAT(COALESCE(notes, ''), ' Refund reason: ', ?) WHERE id = ?",
      [reason || 'No reason provided', req.params.id]
    );

    const [updatedRows] = await connection.execute(
      `SELECT p.*, b.booking_reference
       FROM payments p JOIN bookings b ON p.booking_id = b.id
       WHERE p.id = ?`,
      [req.params.id]
    );

    return updatedRows[0];
  });

  res.status(200).json({
    success: true,
    message: 'Refund processed successfully',
    data: { payment: updatedPayment },
  });
});

const getPaymentStats = asyncHandler(async (req, res) => {
  const totalRevenue = await queryOne(
    "SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE status = 'completed'"
  );
  const totalPayments = await queryOne('SELECT COUNT(*) AS total FROM payments');
  const pendingPayments = await queryOne(
    "SELECT COUNT(*) AS total FROM payments WHERE status = 'pending'"
  );
  const completedPayments = await queryOne(
    "SELECT COUNT(*) AS total FROM payments WHERE status = 'completed'"
  );
  const refundedPayments = await queryOne(
    "SELECT COUNT(*) AS total FROM payments WHERE status = 'refunded'"
  );
  const totalRefunded = await queryOne(
    "SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE status = 'refunded'"
  );
  const revenueByMethod = await query(
    `SELECT method, COUNT(*) AS count, SUM(amount) AS total
     FROM payments WHERE status = 'completed'
     GROUP BY method ORDER BY total DESC`
  );
  const todayRevenue = await queryOne(
    "SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE status = 'completed' AND DATE(paid_at) = CURDATE()"
  );

  res.status(200).json({
    success: true,
    data: {
      totalRevenue: totalRevenue.total,
      totalPayments: totalPayments.total,
      pendingPayments: pendingPayments.total,
      completedPayments: completedPayments.total,
      refundedPayments: refundedPayments.total,
      totalRefunded: totalRefunded.total,
      todayRevenue: todayRevenue.total,
      revenueByMethod,
    },
  });
});

const getRevenueReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, period = 'daily' } = req.query;

  let dateFilter = '';
  const params = [];

  if (startDate) {
    dateFilter += ' AND paid_at >= ?';
    params.push(startDate);
  }
  if (endDate) {
    dateFilter += ' AND paid_at <= ?';
    params.push(endDate);
  }

  let groupBy;
  let dateFormat;

  switch (period) {
    case 'monthly':
      dateFormat = "DATE_FORMAT(paid_at, '%Y-%m')";
      groupBy = 'GROUP BY DATE_FORMAT(paid_at, "%Y-%m") ORDER BY DATE_FORMAT(paid_at, "%Y-%m") ASC';
      break;
    case 'yearly':
      dateFormat = "DATE_FORMAT(paid_at, '%Y')";
      groupBy = 'GROUP BY DATE_FORMAT(paid_at, "%Y") ORDER BY DATE_FORMAT(paid_at, "%Y") ASC';
      break;
    default:
      dateFormat = 'DATE(paid_at)';
      groupBy = 'GROUP BY DATE(paid_at) ORDER BY DATE(paid_at) ASC';
  }

  const revenueData = await query(
    `SELECT ${dateFormat} AS period, SUM(amount) AS revenue, COUNT(*) AS payment_count
     FROM payments WHERE status = 'completed' ${dateFilter}
     ${groupBy}`,
    params
  );

  const totalRevenue = revenueData.reduce((sum, row) => sum + parseFloat(row.revenue), 0);
  const totalPayments = revenueData.reduce((sum, row) => sum + row.payment_count, 0);

  const topMethods = await query(
    `SELECT method, COUNT(*) AS count, SUM(amount) AS total
     FROM payments WHERE status = 'completed' ${dateFilter}
     GROUP BY method ORDER BY total DESC`,
    params
  );

  res.status(200).json({
    success: true,
    data: {
      revenueData,
      totalRevenue,
      totalPayments,
      topMethods,
    },
  });
});

module.exports = {
  createPayment,
  getMyPayments,
  getPaymentById,
  getAllPayments,
  processRefund,
  getPaymentStats,
  getRevenueReport,
};
