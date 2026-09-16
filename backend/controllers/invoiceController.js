const { query, queryOne, insert, execute } = require('../config/database');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { getPagination, paginationResponse, generateInvoiceNumber } = require('../utils/helpers');
const { sendInvoiceEmail } = require('../utils/email');

const getMyInvoices = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status = '' } = req.query;
  const { page: p, limit: l, offset } = getPagination(page, limit);

  let whereClause = 'WHERE i.user_id = ?';
  const params = [req.user.id];

  if (status) {
    whereClause += ' AND i.status = ?';
    params.push(status);
  }

  const countResult = await queryOne(
    `SELECT COUNT(*) AS total FROM invoices i ${whereClause}`,
    params
  );

  const invoices = await query(
    `SELECT i.*, b.booking_reference
     FROM invoices i
     JOIN bookings b ON i.booking_id = b.id
     ${whereClause}
     ORDER BY i.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, l, offset]
  );

  res.status(200).json({
    success: true,
    data: {
      invoices,
      pagination: paginationResponse(countResult.total, p, l),
    },
  });
});

const getInvoiceById = asyncHandler(async (req, res) => {
  const invoice = await queryOne(
    `SELECT i.*, b.booking_reference, b.check_in, b.check_out,
            u.first_name, u.last_name, u.email, u.phone, u.address,
            u.city, u.state, u.country, u.zip_code,
            r.room_number, rc.name AS room_category
     FROM invoices i
     JOIN bookings b ON i.booking_id = b.id
     JOIN users u ON i.user_id = u.id
     JOIN rooms r ON b.room_id = r.id
     JOIN room_categories rc ON r.category_id = rc.id
     WHERE i.id = ?`,
    [req.params.id]
  );

  if (!invoice) {
    throw new ApiError('Invoice not found', 404);
  }

  if (req.user.role !== 'admin' && req.user.role !== 'super_admin' && invoice.user_id !== req.user.id) {
    throw new ApiError('Not authorized to view this invoice', 403);
  }

  const payments = await query(
    `SELECT p.* FROM payments p
     WHERE p.booking_id = ? AND p.status = 'completed'
     ORDER BY p.created_at DESC`,
    [invoice.booking_id]
  );

  res.status(200).json({
    success: true,
    data: { invoice, payments },
  });
});

const generateInvoice = asyncHandler(async (req, res) => {
  const { bookingId } = req.body;

  const booking = await queryOne(
    `SELECT b.*, u.first_name, u.last_name, u.email
     FROM bookings b JOIN users u ON b.user_id = u.id
     WHERE b.id = ?`,
    [bookingId]
  );

  if (!booking) {
    throw new ApiError('Booking not found', 404);
  }

  if (req.user.role !== 'admin' && req.user.role !== 'super_admin' && booking.user_id !== req.user.id) {
    throw new ApiError('Not authorized to generate invoice for this booking', 403);
  }

  const existingInvoice = await queryOne(
    'SELECT id FROM invoices WHERE booking_id = ?',
    [bookingId]
  );

  if (existingInvoice) {
    throw new ApiError('Invoice already exists for this booking', 400);
  }

  const invoiceNumber = generateInvoiceNumber();
  const subtotal = parseFloat(booking.total_amount);
  const taxAmount = parseFloat(booking.tax_amount || 0);
  const discountAmount = parseFloat(booking.discount_amount || 0);
  const totalAmount = parseFloat(booking.final_amount);

  const invoiceId = await insert(
    `INSERT INTO invoices (invoice_number, booking_id, user_id, subtotal, tax_amount,
      discount_amount, total_amount, status, due_date, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', DATE_ADD(NOW(), INTERVAL 30 DAY), ?)`,
    [
      invoiceNumber,
      bookingId,
      booking.user_id,
      subtotal,
      taxAmount,
      discountAmount,
      totalAmount,
      null,
    ]
  );

  const invoice = await queryOne(
    `SELECT i.*, b.booking_reference
     FROM invoices i JOIN bookings b ON i.booking_id = b.id
     WHERE i.id = ?`,
    [invoiceId]
  );

  sendInvoiceEmail(booking.email, booking.first_name, {
    invoiceNumber,
    bookingReference: booking.booking_reference,
    subtotal,
    taxAmount,
    discountAmount,
    totalAmount,
  }).catch(() => {});

  res.status(201).json({
    success: true,
    message: 'Invoice generated successfully',
    data: { invoice },
  });
});

const getAllInvoices = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status = '', search = '' } = req.query;
  const { page: p, limit: l, offset } = getPagination(page, limit);

  let whereClause = 'WHERE 1=1';
  const params = [];

  if (status) {
    whereClause += ' AND i.status = ?';
    params.push(status);
  }

  if (search) {
    whereClause += ' AND (i.invoice_number LIKE ? OR b.booking_reference LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }

  const countResult = await queryOne(
    `SELECT COUNT(*) AS total FROM invoices i
     JOIN bookings b ON i.booking_id = b.id
     JOIN users u ON i.user_id = u.id
     ${whereClause}`,
    params
  );

  const invoices = await query(
    `SELECT i.*, b.booking_reference, u.first_name, u.last_name, u.email
     FROM invoices i
     JOIN bookings b ON i.booking_id = b.id
     JOIN users u ON i.user_id = u.id
     ${whereClause}
     ORDER BY i.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, l, offset]
  );

  res.status(200).json({
    success: true,
    data: {
      invoices,
      pagination: paginationResponse(countResult.total, p, l),
    },
  });
});

const updateInvoiceStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'paid', 'partial', 'overdue', 'cancelled'];

  if (!validStatuses.includes(status)) {
    throw new ApiError('Invalid invoice status', 400);
  }

  const invoice = await queryOne('SELECT id FROM invoices WHERE id = ?', [req.params.id]);
  if (!invoice) {
    throw new ApiError('Invoice not found', 404);
  }

  await execute('UPDATE invoices SET status = ? WHERE id = ?', [status, req.params.id]);

  const updatedInvoice = await queryOne(
    `SELECT i.*, b.booking_reference
     FROM invoices i JOIN bookings b ON i.booking_id = b.id
     WHERE i.id = ?`,
    [req.params.id]
  );

  res.status(200).json({
    success: true,
    message: 'Invoice status updated successfully',
    data: { invoice: updatedInvoice },
  });
});

module.exports = {
  getMyInvoices,
  getInvoiceById,
  generateInvoice,
  getAllInvoices,
  updateInvoiceStatus,
};
