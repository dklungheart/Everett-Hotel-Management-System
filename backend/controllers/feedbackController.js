const { query, queryOne, insert, execute } = require('../config/database');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

/**
 * Create feedback entry (called when checkout SMS is sent)
 */
const createFeedbackEntry = asyncHandler(async (req, res) => {
  const { bookingReference, guestName, guestPhone } = req.body;

  if (!bookingReference || !guestName) {
    throw new ApiError('Booking reference and guest name are required', 400);
  }

  const id = await insert(
    `INSERT INTO guest_feedback (booking_reference, guest_name, guest_phone)
     VALUES (?, ?, ?)`,
    [bookingReference, guestName, guestPhone || null]
  );

  res.status(201).json({
    success: true,
    data: { id, bookingReference },
  });
});

/**
 * Submit rating (public endpoint — no auth required)
 */
const submitRating = asyncHandler(async (req, res) => {
  const { bookingReference, guestName, rating, comment } = req.body;

  if (!bookingReference || !guestName || rating === undefined) {
    throw new ApiError('Booking reference, guest name, and rating are required', 400);
  }

  const numRating = parseInt(rating, 10);
  if (isNaN(numRating) || numRating < 1 || numRating > 10) {
    throw new ApiError('Rating must be a number between 1 and 10', 400);
  }

  const existing = await queryOne(
    'SELECT id FROM guest_feedback WHERE booking_reference = ? AND guest_name = ? AND is_submitted = 1',
    [bookingReference, guestName]
  );

  if (existing) {
    throw new ApiError('You have already submitted feedback for this stay', 400);
  }

  const existingEntry = await queryOne(
    'SELECT id FROM guest_feedback WHERE booking_reference = ? AND guest_name = ?',
    [bookingReference, guestName]
  );

  if (existingEntry) {
    await execute(
      'UPDATE guest_feedback SET rating = ?, comment = ?, is_submitted = 1 WHERE id = ?',
      [numRating, comment || null, existingEntry.id]
    );
  } else {
    await insert(
      `INSERT INTO guest_feedback (booking_reference, guest_name, rating, comment, is_submitted)
       VALUES (?, ?, ?, ?, 1)`,
      [bookingReference, guestName, numRating, comment || null]
    );
  }

  res.status(200).json({
    success: true,
    message: 'Thank you for your feedback! We appreciate you choosing Everett Hotel.',
  });
});

/**
 * Get feedback for admin (requires auth)
 */
const getAllFeedback = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, rating = '' } = req.query;
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE is_submitted = 1';
  const params = [];

  if (rating) {
    whereClause += ' AND rating = ?';
    params.push(parseInt(rating, 10));
  }

  const [countResult] = await query(
    `SELECT COUNT(*) AS total FROM guest_feedback ${whereClause}`,
    params
  );

  const feedback = await query(
    `SELECT * FROM guest_feedback ${whereClause}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, parseInt(limit, 10), offset]
  );

  const [avgResult] = await query(
    'SELECT AVG(rating) AS avg_rating, COUNT(*) AS total FROM guest_feedback WHERE is_submitted = 1'
  );

  res.status(200).json({
    success: true,
    data: {
      feedback,
      averageRating: parseFloat(avgResult[0].avg_rating || 0).toFixed(1),
      totalFeedback: avgResult[0].total,
      pagination: {
        total: countResult[0].total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(countResult[0].total / limit),
      },
    },
  });
});

module.exports = {
  createFeedbackEntry,
  submitRating,
  getAllFeedback,
};
