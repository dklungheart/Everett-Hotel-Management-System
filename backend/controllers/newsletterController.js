const { query, queryOne, insert, execute } = require('../config/database');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { getPagination, paginationResponse } = require('../utils/helpers');
const { sendNewsletterConfirmation } = require('../utils/email');

const subscribe = asyncHandler(async (req, res) => {
  const { email, name } = req.body;

  if (!email) {
    throw new ApiError('Email is required', 400);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ApiError('Invalid email address', 400);
  }

  const existing = await queryOne(
    'SELECT * FROM newsletter_subscribers WHERE email = ?',
    [email]
  );

  if (existing) {
    if (existing.is_active) {
      return res.status(200).json({
        success: true,
        message: 'You are already subscribed to our newsletter',
      });
    }

    await execute(
      'UPDATE newsletter_subscribers SET is_active = 1, unsubscribed_at = NULL WHERE id = ?',
      [existing.id]
    );

    sendNewsletterConfirmation(email).catch(() => {});

    return res.status(200).json({
      success: true,
      message: 'Successfully resubscribed to our newsletter',
    });
  }

  const subscriberId = await insert(
    `INSERT INTO newsletter_subscribers (user_id, email, is_active, subscribed_at)
     VALUES (?, ?, 1, NOW())`,
    [
      req.user ? req.user.id : null,
      email,
    ]
  );

  const subscriber = await queryOne(
    'SELECT * FROM newsletter_subscribers WHERE id = ?',
    [subscriberId]
  );

  sendNewsletterConfirmation(email).catch(() => {});

  res.status(201).json({
    success: true,
    message: 'Successfully subscribed to our newsletter',
    data: { subscriber },
  });
});

const unsubscribe = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError('Email is required', 400);
  }

  const subscriber = await queryOne(
    'SELECT * FROM newsletter_subscribers WHERE email = ?',
    [email]
  );

  if (!subscriber) {
    throw new ApiError('Email not found in our subscribers list', 404);
  }

  if (!subscriber.is_active) {
    return res.status(200).json({
      success: true,
      message: 'You are already unsubscribed',
    });
  }

  await execute(
    'UPDATE newsletter_subscribers SET is_active = 0, unsubscribed_at = NOW() WHERE email = ?',
    [email]
  );

  res.status(200).json({
    success: true,
    message: 'Successfully unsubscribed from our newsletter',
  });
});

const getAllSubscribers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status = '', search = '' } = req.query;
  const { page: p, limit: l, offset } = getPagination(page, limit);

  let whereClause = 'WHERE 1=1';
  const params = [];

  if (status === 'active') {
    whereClause += ' AND ns.is_active = 1';
  } else if (status === 'inactive') {
    whereClause += ' AND ns.is_active = 0';
  }

  if (search) {
    whereClause += ' AND (ns.email LIKE ? OR ns.name LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s);
  }

  const countResult = await queryOne(
    `SELECT COUNT(*) AS total FROM newsletter_subscribers ns ${whereClause}`,
    params
  );

  const subscribers = await query(
    `SELECT ns.*
     FROM newsletter_subscribers ns
     ${whereClause}
     ORDER BY ns.subscribed_at DESC
     LIMIT ? OFFSET ?`,
    [...params, l, offset]
  );

  const stats = await queryOne(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active,
       SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) AS inactive
     FROM newsletter_subscribers`
  );

  res.status(200).json({
    success: true,
    data: {
      subscribers,
      stats,
      pagination: paginationResponse(countResult.total, p, l),
    },
  });
});

const deleteSubscriber = asyncHandler(async (req, res) => {
  const subscriber = await queryOne(
    'SELECT id FROM newsletter_subscribers WHERE id = ?',
    [req.params.id]
  );

  if (!subscriber) {
    throw new ApiError('Subscriber not found', 404);
  }

  await execute('DELETE FROM newsletter_subscribers WHERE id = ?', [req.params.id]);

  res.status(200).json({
    success: true,
    message: 'Subscriber deleted successfully',
  });
});

module.exports = {
  subscribe,
  unsubscribe,
  getAllSubscribers,
  deleteSubscriber,
};
