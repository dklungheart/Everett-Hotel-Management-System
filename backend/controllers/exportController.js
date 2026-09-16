const { query, queryOne } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');
const {
  generateBookingReportPdf,
  generatePaymentReportPdf,
  generateBookingReportExcel,
  generatePaymentReportExcel,
} = require('../utils/exports');

const exportBookings = asyncHandler(async (req, res) => {
  const { format = 'pdf', status = '', startDate, endDate } = req.query;

  let whereClause = 'WHERE 1=1';
  const params = [];

  if (status) {
    whereClause += ' AND b.status = ?';
    params.push(status);
  }
  if (startDate) {
    whereClause += ' AND b.created_at >= ?';
    params.push(startDate);
  }
  if (endDate) {
    whereClause += ' AND b.created_at <= ?';
    params.push(endDate);
  }

  const bookings = await query(
    `SELECT b.*, u.first_name, u.last_name, u.email,
            r.room_number, rc.name AS room_category
     FROM bookings b
     JOIN users u ON b.user_id = u.id
     JOIN rooms r ON b.room_id = r.id
     JOIN room_categories rc ON r.category_id = rc.id
     ${whereClause}
     ORDER BY b.created_at DESC`,
    params
  );

  const summary = {
    totalBookings: bookings.length,
    totalRevenue: bookings.reduce((sum, b) => sum + parseFloat(b.final_amount || 0), 0),
    averageValue: bookings.length > 0
      ? bookings.reduce((sum, b) => sum + parseFloat(b.final_amount || 0), 0) / bookings.length
      : 0,
  };

  if (format === 'excel') {
    return generateBookingReportExcel(res, bookings, summary);
  }

  return generateBookingReportPdf(res, bookings, summary);
});

const exportPayments = asyncHandler(async (req, res) => {
  const { format = 'pdf', status = '', method = '', startDate, endDate } = req.query;

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
  if (startDate) {
    whereClause += ' AND p.created_at >= ?';
    params.push(startDate);
  }
  if (endDate) {
    whereClause += ' AND p.created_at <= ?';
    params.push(endDate);
  }

  const payments = await query(
    `SELECT p.*, b.booking_reference, u.first_name, u.last_name, u.email
     FROM payments p
     JOIN bookings b ON p.booking_id = b.id
     JOIN users u ON p.user_id = u.id
     ${whereClause}
     ORDER BY p.created_at DESC`,
    params
  );

  const summary = {
    totalPayments: payments.length,
    totalRevenue: payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0),
    pendingPayments: payments.filter(p => p.status === 'pending').length,
  };

  if (format === 'excel') {
    return generatePaymentReportExcel(res, payments, summary);
  }

  return generatePaymentReportPdf(res, payments, summary);
});

module.exports = {
  exportBookings,
  exportPayments,
};
