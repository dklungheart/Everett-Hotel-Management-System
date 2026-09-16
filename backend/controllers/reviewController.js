const { query, queryOne, insert, execute } = require('../config/database');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { getPagination, paginationResponse } = require('../utils/helpers');

const createReview = asyncHandler(async (req, res) => {
  const { rating, title, comment, roomId, bookingId } = req.body;

  if (bookingId) {
    const booking = await queryOne(
      `SELECT id FROM bookings
       WHERE id = ? AND user_id = ? AND status IN ('checked_out', 'confirmed')`,
      [bookingId, req.user.id]
    );

    if (!booking) {
      throw new ApiError('Booking not found or not eligible for review', 400);
    }

    const existingReview = await queryOne(
      'SELECT id FROM reviews WHERE booking_id = ? AND user_id = ?',
      [bookingId, req.user.id]
    );

    if (existingReview) {
      throw new ApiError('You have already reviewed this booking', 400);
    }
  }

  const reviewId = await insert(
    `INSERT INTO reviews (user_id, room_id, booking_id, rating, title, comment, is_approved)
     VALUES (?, ?, ?, ?, ?, ?, 0)`,
    [req.user.id, roomId || null, bookingId || null, rating, title || null, comment || null]
  );

  const review = await queryOne(
    `SELECT rv.*, u.first_name, u.last_name
     FROM reviews rv JOIN users u ON rv.user_id = u.id
     WHERE rv.id = ?`,
    [reviewId]
  );

  res.status(201).json({
    success: true,
    message: 'Review submitted successfully. It will be visible after approval.',
    data: { review },
  });
});

const getMyReviews = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const { page: p, limit: l, offset } = getPagination(page, limit);

  const countResult = await queryOne(
    'SELECT COUNT(*) AS total FROM reviews WHERE user_id = ?',
    [req.user.id]
  );

  const reviews = await query(
    `SELECT rv.*, r.room_number, rc.name AS room_category
     FROM reviews rv
     LEFT JOIN rooms r ON rv.room_id = r.id
     LEFT JOIN room_categories rc ON r.category_id = rc.id
     WHERE rv.user_id = ?
     ORDER BY rv.created_at DESC
     LIMIT ? OFFSET ?`,
    [req.user.id, l, offset]
  );

  res.status(200).json({
    success: true,
    data: {
      reviews,
      pagination: paginationResponse(countResult.total, p, l),
    },
  });
});

const getAllReviews = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, rating = '', status = 'approved', roomId = '' } = req.query;
  const { page: p, limit: l, offset } = getPagination(page, limit);

  let whereClause = 'WHERE 1=1';
  const params = [];

  if (status) {
    whereClause += ' AND rv.is_approved = ?';
    params.push(status === 'approved' ? 1 : 0);
  }

  if (rating) {
    whereClause += ' AND rv.rating = ?';
    params.push(rating);
  }

  if (roomId) {
    whereClause += ' AND rv.room_id = ?';
    params.push(roomId);
  }

  const countResult = await queryOne(
    `SELECT COUNT(*) AS total FROM reviews rv ${whereClause}`,
    params
  );

  const reviews = await query(
    `SELECT rv.*, u.first_name, u.last_name,
            r.room_number, rc.name AS room_category
     FROM reviews rv
     JOIN users u ON rv.user_id = u.id
     LEFT JOIN rooms r ON rv.room_id = r.id
     LEFT JOIN room_categories rc ON r.category_id = rc.id
     ${whereClause}
     ORDER BY rv.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, l, offset]
  );

  const avgRating = await queryOne(
    'SELECT AVG(rating) AS avg_rating, COUNT(*) AS total FROM reviews WHERE is_approved = 1',
    []
  );

  const distribution = await query(
    'SELECT rating, COUNT(*) AS count FROM reviews WHERE is_approved = 1 GROUP BY rating',
    []
  );
  const ratingDistribution = {};
  distribution.forEach((d) => { ratingDistribution[d.rating] = d.count; });

  res.status(200).json({
    success: true,
    data: {
      reviews,
      averageRating: parseFloat(avgRating.avg_rating || 0).toFixed(1),
      totalReviews: avgRating.total,
      ratingDistribution,
      pagination: paginationResponse(countResult.total, p, l),
    },
  });
});

const getAllReviewsAdmin = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status = '', rating = '', search = '' } = req.query;
  const { page: p, limit: l, offset } = getPagination(page, limit);

  let whereClause = 'WHERE 1=1';
  const params = [];

  if (status === 'approved' || status === 'rejected') {
    whereClause += ' AND rv.is_approved = ?';
    params.push(status === 'approved' ? 1 : 0);
  }

  if (rating) {
    whereClause += ' AND rv.rating = ?';
    params.push(rating);
  }

  if (search) {
    whereClause += ' AND (rv.title LIKE ? OR rv.comment LIKE ? OR CONCAT(u.first_name, " ", u.last_name) LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  const countResult = await queryOne(
    `SELECT COUNT(*) AS total FROM reviews rv JOIN users u ON rv.user_id = u.id ${whereClause}`,
    params
  );

  const reviews = await query(
    `SELECT rv.*, u.first_name, u.last_name, u.profile_photo,
            r.room_number, rc.name AS room_category
     FROM reviews rv
     JOIN users u ON rv.user_id = u.id
     LEFT JOIN rooms r ON rv.room_id = r.id
     LEFT JOIN room_categories rc ON r.category_id = rc.id
     ${whereClause}
     ORDER BY rv.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, l, offset]
  );

  const stats = await queryOne(
    `SELECT COUNT(*) AS total,
            SUM(is_approved = 1) AS approved,
            SUM(is_approved = 0) AS pending,
            AVG(CASE WHEN is_approved = 1 THEN rating END) AS average_rating
     FROM reviews`,
    []
  );

  res.status(200).json({
    success: true,
    data: {
      reviews,
      stats: {
        total: stats.total,
        approved: stats.approved,
        pending: stats.pending,
        averageRating: parseFloat(stats.average_rating || 0).toFixed(1),
      },
      pagination: paginationResponse(countResult.total, p, l),
    },
  });
});

const updateReviewStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!status || !['approved', 'rejected'].includes(status)) {
    throw new ApiError('Status must be approved or rejected', 400);
  }

  const review = await queryOne('SELECT id FROM reviews WHERE id = ?', [req.params.id]);
  if (!review) {
    throw new ApiError('Review not found', 404);
  }

  await execute(
    'UPDATE reviews SET is_approved = ? WHERE id = ?',
    [status === 'approved' ? 1 : 0, req.params.id]
  );

  const updatedReview = await queryOne(
    `SELECT rv.*, u.first_name, u.last_name
     FROM reviews rv JOIN users u ON rv.user_id = u.id
     WHERE rv.id = ?`,
    [req.params.id]
  );

  res.status(200).json({
    success: true,
    message: `Review ${status === 'approved' ? 'approved' : 'rejected'} successfully`,
    data: { review: updatedReview },
  });
});

const toggleReviewFeature = asyncHandler(async (req, res) => {
  const review = await queryOne('SELECT id, is_featured FROM reviews WHERE id = ?', [req.params.id]);
  if (!review) {
    throw new ApiError('Review not found', 404);
  }

  const newValue = review.is_featured ? 0 : 1;
  await execute('UPDATE reviews SET is_featured = ? WHERE id = ?', [newValue, req.params.id]);

  res.status(200).json({
    success: true,
    message: newValue ? 'Review featured on homepage' : 'Review removed from featured',
    data: { isFeatured: !!newValue },
  });
});

const respondToReview = asyncHandler(async (req, res) => {
  const { response } = req.body;

  if (!response || !response.trim()) {
    throw new ApiError('Response text is required', 400);
  }

  const review = await queryOne('SELECT id FROM reviews WHERE id = ?', [req.params.id]);
  if (!review) {
    throw new ApiError('Review not found', 404);
  }

  await execute(
    'UPDATE reviews SET response = ?, responded_by = ?, responded_at = NOW() WHERE id = ?',
    [response, req.user.id, req.params.id]
  );

  const updatedReview = await queryOne(
    `SELECT rv.*, u.first_name, u.last_name
     FROM reviews rv JOIN users u ON rv.user_id = u.id
     WHERE rv.id = ?`,
    [req.params.id]
  );

  res.status(200).json({
    success: true,
    message: 'Response added successfully',
    data: { review: updatedReview },
  });
});

const deleteReview = asyncHandler(async (req, res) => {
  const review = await queryOne('SELECT id FROM reviews WHERE id = ?', [req.params.id]);
  if (!review) {
    throw new ApiError('Review not found', 404);
  }

  await execute('DELETE FROM reviews WHERE id = ?', [req.params.id]);

  res.status(200).json({
    success: true,
    message: 'Review deleted successfully',
  });
});

module.exports = {
  createReview,
  getMyReviews,
  getAllReviews,
  getAllReviewsAdmin,
  updateReviewStatus,
  toggleReviewFeature,
  respondToReview,
  deleteReview,
};
