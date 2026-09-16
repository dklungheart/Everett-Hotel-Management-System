const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { query, queryOne, insert, execute, transaction } = require('../config/database');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { generatePaymentReference } = require('../utils/helpers');
const { sendCardPaymentConfirmation, sendBankTransferInstructions, sendBankTransferConfirmation } = require('../utils/email');

// ─── Stripe Card Payments ────────────────────────────────────────

const createCardPaymentIntent = asyncHandler(async (req, res) => {
  const { bookingId, amount } = req.body;

  if (!bookingId || !amount) {
    throw new ApiError('Booking ID and amount are required', 400);
  }

  const booking = await queryOne(
    `SELECT b.*, u.first_name, u.last_name, u.email
     FROM bookings b JOIN users u ON b.user_id = u.id
     WHERE b.id = ? AND b.user_id = ?`,
    [bookingId, req.user.id]
  );

  if (!booking) {
    throw new ApiError('Booking not found', 404);
  }

  const totalPaid = await queryOne(
    "SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE booking_id = ? AND status = 'completed'",
    [bookingId]
  );

  const remainingAmount = parseFloat(booking.final_amount) - parseFloat(totalPaid.total);

  if (parseFloat(amount) > remainingAmount + 0.01) {
    throw new ApiError(`Amount exceeds remaining balance of KES ${remainingAmount.toFixed(2)}`, 400);
  }

  const paymentReference = generatePaymentReference();

  let paymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(parseFloat(amount) * 100),
      currency: 'kes',
      metadata: {
        bookingId: String(bookingId),
        paymentReference,
        guestName: `${booking.first_name} ${booking.last_name}`,
        bookingReference: booking.booking_reference,
      },
      description: `Everett Hotel - Booking ${booking.booking_reference}`,
    });
  } catch (error) {
    throw new ApiError('Card payments are currently unavailable. Please use M-Pesa or bank transfer.', 502);
  }

  const paymentId = await transaction(async (connection) => {
    const [result] = await connection.execute(
      `INSERT INTO payments (payment_reference, booking_id, user_id, amount, method, status, transaction_id, billing_name, notes)
       VALUES (?, ?, ?, ?, 'card', 'pending', ?, ?, ?)`,
      [
        paymentReference,
        bookingId,
        req.user.id,
        amount,
        paymentIntent.id,
        `${booking.first_name} ${booking.last_name}`,
        'Stripe Card Payment',
      ]
    );
    return result.insertId;
  });

  res.status(200).json({
    success: true,
    data: {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      paymentId,
      paymentReference,
      amount: parseFloat(amount),
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    },
  });
});

const confirmCardPayment = asyncHandler(async (req, res) => {
  const { paymentIntentId } = req.body;

  if (!paymentIntentId) {
    throw new ApiError('Payment Intent ID is required', 400);
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (!paymentIntent) {
    throw new ApiError('Payment intent not found', 404);
  }

  const payment = await queryOne(
    `SELECT p.*, b.booking_reference, u.first_name, u.email
     FROM payments p
     JOIN bookings b ON p.booking_id = b.id
     JOIN users u ON p.user_id = u.id
     WHERE p.transaction_id = ?`,
    [paymentIntentId]
  );

  if (!payment) {
    throw new ApiError('Payment record not found', 404);
  }

  if (payment.user_id !== req.user.id) {
    throw new ApiError('Not authorized', 403);
  }

  if (paymentIntent.status === 'succeeded') {
    await transaction(async (connection) => {
      await connection.execute(
        "UPDATE payments SET status = 'completed', paid_at = NOW() WHERE id = ?",
        [payment.id]
      );
    });

    sendCardPaymentConfirmation(payment.email, payment.first_name, {
      paymentReference: payment.payment_reference,
      bookingReference: payment.booking_reference,
      amount: payment.amount,
      last4: paymentIntent.payment_method
        ? (await stripe.paymentMethods.retrieve(paymentIntent.payment_method)).card?.last4 || '****'
        : '****',
      brand: paymentIntent.payment_method
        ? (await stripe.paymentMethods.retrieve(paymentIntent.payment_method)).card?.brand || 'Card'
        : 'Card',
    }).catch(() => {});

    res.status(200).json({
      success: true,
      message: 'Payment confirmed successfully',
      data: {
        status: 'completed',
        paymentReference: payment.payment_reference,
      },
    });
  } else {
    res.status(200).json({
      success: true,
      data: {
        status: paymentIntent.status,
        paymentReference: payment.payment_reference,
      },
    });
  }
});

const handleStripeWebhook = asyncHandler(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const payment = await queryOne(
      'SELECT * FROM payments WHERE transaction_id = ?',
      [paymentIntent.id]
    );
    if (payment && payment.status !== 'completed') {
      await transaction(async (connection) => {
        await connection.execute(
          "UPDATE payments SET status = 'completed', paid_at = NOW() WHERE id = ?",
          [payment.id]
        );
      });
    }
  } else if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object;
    const payment = await queryOne(
      'SELECT * FROM payments WHERE transaction_id = ?',
      [paymentIntent.id]
    );
    if (payment) {
      await transaction(async (connection) => {
        await connection.execute("UPDATE payments SET status = 'failed' WHERE id = ?", [payment.id]);
      });
    }
  }

  res.json({ received: true });
});

// ─── Bank Transfer ────────────────────────────────────────────────

const BANK_DETAILS = {
  bankName: 'Equity Bank Kenya',
  accountName: 'Everett Hotel Limited',
  accountNumber: '0123456789012',
  branch: 'Westlands',
  swiftCode: 'EQBLKEKA',
};

const initiateBankTransfer = asyncHandler(async (req, res) => {
  const { bookingId, amount, payerName } = req.body;

  if (!bookingId || !amount) {
    throw new ApiError('Booking ID and amount are required', 400);
  }

  const booking = await queryOne(
    `SELECT b.*, u.first_name, u.last_name, u.email
     FROM bookings b JOIN users u ON b.user_id = u.id
     WHERE b.id = ? AND b.user_id = ?`,
    [bookingId, req.user.id]
  );

  if (!booking) {
    throw new ApiError('Booking not found', 404);
  }

  const totalPaid = await queryOne(
    "SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE booking_id = ? AND status = 'completed'",
    [bookingId]
  );

  const remainingAmount = parseFloat(booking.final_amount) - parseFloat(totalPaid.total);

  if (parseFloat(amount) > remainingAmount + 0.01) {
    throw new ApiError(`Amount exceeds remaining balance of KES ${remainingAmount.toFixed(2)}`, 400);
  }

  const paymentReference = generatePaymentReference();
  const accountRef = `EVH-${booking.booking_reference}`.replace(/[^A-Z0-9-]/g, '');

  const paymentId = await transaction(async (connection) => {
    const [result] = await connection.execute(
      `INSERT INTO payments (payment_reference, booking_id, user_id, amount, method, status, billing_name, notes)
       VALUES (?, ?, ?, ?, 'bank_transfer', 'pending', ?, ?)`,
      [
        paymentReference,
        bookingId,
        req.user.id,
        amount,
        payerName || `${booking.first_name} ${booking.last_name}`,
        `Bank transfer initiated. Reference: ${accountRef}`,
      ]
    );
    return result.insertId;
  });

  sendBankTransferInstructions(booking.email, booking.first_name, {
    paymentReference,
    bookingReference: booking.booking_reference,
    amount: parseFloat(amount),
    bankDetails: BANK_DETAILS,
    accountRef,
  }).catch(() => {});

  res.status(200).json({
    success: true,
    message: 'Bank transfer instructions sent to your email',
    data: {
      paymentId,
      paymentReference,
      accountRef,
      bankDetails: BANK_DETAILS,
      amount: parseFloat(amount),
    },
  });
});

const getBankTransferDetails = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: { bankDetails: BANK_DETAILS },
  });
});

const approveBankTransfer = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const payment = await queryOne(
    `SELECT p.*, b.booking_reference, u.first_name, u.email
     FROM payments p
     JOIN bookings b ON p.booking_id = b.id
     JOIN users u ON p.user_id = u.id
     WHERE p.id = ? AND p.method = 'bank_transfer'`,
    [id]
  );

  if (!payment) {
    throw new ApiError('Bank transfer payment not found', 404);
  }

  if (payment.status === 'completed') {
    throw new ApiError('Payment already approved', 400);
  }

  if (payment.status === 'refunded') {
    throw new ApiError('Cannot approve a refunded payment', 400);
  }

  await transaction(async (connection) => {
    await connection.execute(
      "UPDATE payments SET status = 'completed', paid_at = NOW() WHERE id = ?",
      [payment.id]
    );
  });

  sendBankTransferConfirmation(payment.email, payment.first_name, {
    paymentReference: payment.payment_reference,
    bookingReference: payment.booking_reference,
    amount: payment.amount,
  }).catch(() => {});

  res.status(200).json({
    success: true,
    message: 'Bank transfer approved and payment completed',
    data: {
      payment: { ...payment, status: 'completed' },
    },
  });
});

module.exports = {
  createCardPaymentIntent,
  confirmCardPayment,
  handleStripeWebhook,
  initiateBankTransfer,
  getBankTransferDetails,
  approveBankTransfer,
};
