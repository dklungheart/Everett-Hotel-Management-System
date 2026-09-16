const { queryOne, insert, execute, query, transaction } = require('../config/database');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { getPagination, paginationResponse } = require('../utils/helpers');
const { initiateSTKPush, checkTransactionStatus, processCallback } = require('../utils/mpesa');
const { sendMpesaPaymentConfirmation, sendPaymentFailedNotification } = require('../utils/email');

const initiatePayment = asyncHandler(async (req, res) => {
  const { bookingId, phoneNumber, amount } = req.body;

  if (!bookingId || !phoneNumber || !amount) {
    throw new ApiError('Booking ID, phone number, and amount are required', 400);
  }

  const booking = await queryOne(
    `SELECT b.*, u.first_name, u.last_name
     FROM bookings b JOIN users u ON b.user_id = u.id
     WHERE b.id = ? AND b.user_id = ?`,
    [bookingId, req.user.id]
  );

  if (!booking) {
    throw new ApiError('Booking not found', 404);
  }

  if (!['pending', 'confirmed'].includes(booking.status)) {
    throw new ApiError('Booking is not in a payable status', 400);
  }

  const totalPaid = await queryOne(
    "SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE booking_id = ? AND status = 'completed'",
    [bookingId]
  );

  const remainingAmount = parseFloat(booking.final_amount) - parseFloat(totalPaid.total);

  if (parseFloat(amount) > remainingAmount + 0.01) {
    throw new ApiError(`Amount exceeds remaining balance of KES ${remainingAmount.toFixed(2)}`, 400);
  }

  const paymentReference = `PAY-MP-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

  const paymentId = await transaction(async (connection) => {
    const [result] = await connection.execute(
      `INSERT INTO payments (payment_reference, booking_id, user_id, amount, method, status, billing_name, notes)
       VALUES (?, ?, ?, ?, 'mpesa', 'pending', ?, ?)`,
      [paymentReference, bookingId, req.user.id, amount, `${booking.first_name} ${booking.last_name}`, 'M-Pesa STK Push']
    );
    return result.insertId;
  });

  const accountRef = booking.booking_reference || paymentReference;
  let stkResponse;
  try {
    stkResponse = await initiateSTKPush(
      phoneNumber,
      amount,
      accountRef,
      `Everett Hotel - Booking ${booking.booking_reference}`
    );
  } catch (error) {
    await transaction(async (connection) => {
      await connection.execute("UPDATE payments SET status = 'failed', notes = CONCAT(COALESCE(notes, ''), ' Error: ', ?) WHERE id = ?", [error.message || 'Network error', paymentId]);
    });
    throw new ApiError('M-Pesa is temporarily unavailable. Please try again later or use bank transfer.', 502);
  }

  if (!stkResponse.success) {
    await transaction(async (connection) => {
      await connection.execute("UPDATE payments SET status = 'failed' WHERE id = ?", [paymentId]);
    });
    throw new ApiError('M-Pesa STK push failed. Please try again.', 400);
  }

  await transaction(async (connection) => {
    await connection.execute(
      "UPDATE mpesa_transactions SET payment_id = ? WHERE checkout_request_id = ?",
      [paymentId, stkResponse.checkoutRequestId]
    );
  });

  res.status(200).json({
    success: true,
    message: 'Please check your phone for the M-Pesa payment prompt',
    data: {
      paymentId,
      paymentReference,
      checkoutRequestId: stkResponse.checkoutRequestId,
      merchantRequestId: stkResponse.merchantRequestId,
      customerMessage: stkResponse.customerMessage,
    },
  });
});

const checkPaymentStatus = asyncHandler(async (req, res) => {
  const { checkoutRequestId } = req.params;

  const txn = await queryOne(
    "SELECT * FROM mpesa_transactions WHERE checkout_request_id = ?",
    [checkoutRequestId]
  );

  if (!txn) {
    throw new ApiError('Transaction not found', 404);
  }

  let status = txn.status;
  if (status === 'pending') {
    const mpesaStatus = await checkTransactionStatus(checkoutRequestId);
    const resultCode = mpesaStatus?.ResultDescription?.includes('The service request is processed successfully')
      ? 0 : -1;
    if (resultCode === 0) {
      status = 'completed';
    }
  }

  res.status(200).json({
    success: true,
    data: {
      status,
      checkoutRequestId,
      mpesaReceiptNumber: txn.mpesa_receipt_number,
      amount: txn.amount,
      phoneNumber: txn.phone_number,
      accountReference: txn.account_reference,
    },
  });
});

const handleMpesaCallback = asyncHandler(async (req, res) => {
  try {
    const result = await processCallback(req.body);

  if (result.success) {
    console.log(`M-Pesa payment confirmed: ${result.receiptNumber} - KES ${result.amount}`);

    if (result.paymentId) {
      await transaction(async (connection) => {
        await connection.execute(
          "UPDATE payments SET status = 'completed', paid_at = NOW() WHERE id = ?",
          [result.paymentId]
        );
      });

      const payment = await queryOne(
        `SELECT p.*, b.booking_reference, u.first_name, u.email
         FROM payments p
         JOIN bookings b ON p.booking_id = b.id
         JOIN users u ON p.user_id = u.id
         WHERE p.id = ?`,
        [result.paymentId]
      );
      if (payment) {
        sendMpesaPaymentConfirmation(payment.email, payment.first_name, {
          paymentReference: payment.payment_reference,
          bookingReference: payment.booking_reference,
          amount: payment.amount,
          receiptNumber: result.receiptNumber,
          phoneNumber: result.phoneNumber,
        }).catch(() => {});
      }
    }
  } else {
    console.log(`M-Pesa payment failed: ${result.message}`);
    if (result.paymentId) {
      await transaction(async (connection) => {
        await connection.execute(
          "UPDATE payments SET status = 'failed', notes = CONCAT(COALESCE(notes, ''), ' Failed: ', ?) WHERE id = ?",
          [result.message || 'M-Pesa callback failure', result.paymentId]
        );
      });
    }
    }

    res.status(200).json({ ResultCode: 0, ResultDesc: 'Success' });
  } catch (error) {
    console.error('M-Pesa callback error:', error.message);
    res.status(200).json({ ResultCode: 0, ResultDesc: 'Success' });
  }
});

const getMyTransactions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const { page: p, limit: l, offset } = getPagination(page, limit);

  const countResult = await queryOne(
    'SELECT COUNT(*) AS total FROM mpesa_transactions WHERE user_id = ? OR payment_id IN (SELECT id FROM payments WHERE user_id = ?)',
    [req.user.id, req.user.id]
  );

  const transactions = await query(
    `SELECT mt.*, p.payment_reference, p.booking_id, b.booking_reference
     FROM mpesa_transactions mt
     LEFT JOIN payments p ON mt.payment_id = p.id
     LEFT JOIN bookings b ON p.booking_id = b.id
     WHERE mt.user_id = ? OR mt.phone_number IN (SELECT phone FROM users WHERE id = ?)
     ORDER BY mt.created_at DESC
     LIMIT ? OFFSET ?`,
    [req.user.id, req.user.id, l, offset]
  );

  res.status(200).json({
    success: true,
    data: {
      transactions,
      pagination: paginationResponse(countResult.total, p, l),
    },
  });
});

const getAllTransactions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status = '', search = '' } = req.query;
  const { page: p, limit: l, offset } = getPagination(page, limit);

  let whereClause = 'WHERE 1=1';
  const params = [];

  if (status) {
    whereClause += ' AND mt.status = ?';
    params.push(status);
  }

  if (search) {
    whereClause += ' AND (mt.mpesa_receipt_number LIKE ? OR mt.phone_number LIKE ? OR mt.account_reference LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  const countResult = await queryOne(
    `SELECT COUNT(*) AS total FROM mpesa_transactions mt ${whereClause}`,
    params
  );

  const transactions = await query(
    `SELECT mt.*, p.payment_reference, p.booking_id, b.booking_reference, u.first_name, u.last_name, u.email
     FROM mpesa_transactions mt
     LEFT JOIN payments p ON mt.payment_id = p.id
     LEFT JOIN bookings b ON p.booking_id = b.id
     LEFT JOIN users u ON p.user_id = u.id
     ${whereClause}
     ORDER BY mt.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, l, offset]
  );

  res.status(200).json({
    success: true,
    data: {
      transactions,
      pagination: paginationResponse(countResult.total, p, l),
    },
  });
});

const getMpesaStats = asyncHandler(async (req, res) => {
  const totalTransactions = await queryOne(
    'SELECT COUNT(*) AS total FROM mpesa_transactions'
  );
  const completedTransactions = await queryOne(
    "SELECT COUNT(*) AS total, COALESCE(SUM(amount), 0) AS totalAmount FROM mpesa_transactions WHERE status = 'completed'"
  );
  const pendingTransactions = await queryOne(
    "SELECT COUNT(*) AS total FROM mpesa_transactions WHERE status = 'pending'"
  );
  const failedTransactions = await queryOne(
    "SELECT COUNT(*) AS total FROM mpesa_transactions WHERE status = 'failed'"
  );
  const todayTransactions = await queryOne(
    "SELECT COUNT(*) AS total, COALESCE(SUM(amount), 0) AS totalAmount FROM mpesa_transactions WHERE status = 'completed' AND DATE(created_at) = CURDATE()"
  );

  res.status(200).json({
    success: true,
    data: {
      totalTransactions: totalTransactions.total,
      completedTransactions: completedTransactions.total,
      completedAmount: completedTransactions.totalAmount,
      pendingTransactions: pendingTransactions.total,
      failedTransactions: failedTransactions.total,
      todayTransactions: todayTransactions.total,
      todayAmount: todayTransactions.totalAmount,
    },
  });
});

module.exports = {
  initiatePayment,
  checkPaymentStatus,
  handleMpesaCallback,
  getMyTransactions,
  getAllTransactions,
  getMpesaStats,
};
