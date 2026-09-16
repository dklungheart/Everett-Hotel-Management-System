const { query, queryOne, insert, execute } = require('../config/database');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { getPagination, paginationResponse } = require('../utils/helpers');

const getMyNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, read = '' } = req.query;
  const { page: p, limit: l, offset } = getPagination(page, limit);

  let whereClause = 'WHERE n.user_id = ?';
  const params = [req.user.id];

  if (read === 'true') {
    whereClause += ' AND n.is_read = 1';
  } else if (read === 'false') {
    whereClause += ' AND n.is_read = 0';
  }

  const countResult = await queryOne(
    `SELECT COUNT(*) AS total FROM notifications n ${whereClause}`,
    params
  );

  const notifications = await query(
    `SELECT n.*
     FROM notifications n
     ${whereClause}
     ORDER BY n.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, l, offset]
  );

  const unreadCount = await queryOne(
    'SELECT COUNT(*) AS total FROM notifications WHERE user_id = ? AND is_read = 0',
    [req.user.id]
  );

  res.status(200).json({
    success: true,
    data: {
      notifications,
      unreadCount: unreadCount.total,
      pagination: paginationResponse(countResult.total, p, l),
    },
  });
});

const markAsRead = asyncHandler(async (req, res) => {
  const notification = await queryOne(
    'SELECT id, user_id FROM notifications WHERE id = ?',
    [req.params.id]
  );

  if (!notification) {
    throw new ApiError('Notification not found', 404);
  }

  if (notification.user_id !== req.user.id) {
    throw new ApiError('Not authorized to modify this notification', 403);
  }

  await execute('UPDATE notifications SET is_read = 1 WHERE id = ?', [req.params.id]);

  const updated = await queryOne('SELECT * FROM notifications WHERE id = ?', [req.params.id]);

  res.status(200).json({
    success: true,
    message: 'Notification marked as read',
    data: { notification: updated },
  });
});

const markAllRead = asyncHandler(async (req, res) => {
  const result = await execute(
    'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
    [req.user.id]
  );

  const unreadCount = await queryOne(
    'SELECT COUNT(*) AS total FROM notifications WHERE user_id = ? AND is_read = 0',
    [req.user.id]
  );

  res.status(200).json({
    success: true,
    message: `${result} notification(s) marked as read`,
    data: { unreadCount: unreadCount.total },
  });
});

const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await queryOne(
    'SELECT id, user_id FROM notifications WHERE id = ?',
    [req.params.id]
  );

  if (!notification) {
    throw new ApiError('Notification not found', 404);
  }

  if (notification.user_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    throw new ApiError('Not authorized to delete this notification', 403);
  }

  await execute('DELETE FROM notifications WHERE id = ?', [req.params.id]);

  res.status(200).json({
    success: true,
    message: 'Notification deleted successfully',
  });
});

const createNotification = asyncHandler(async (req, res) => {
  const { userId, type, title, message, link, data } = req.body;

  if (!userId) {
    throw new ApiError('User ID is required', 400);
  }

  if (!title || !message) {
    throw new ApiError('Title and message are required', 400);
  }

  const validTypes = ['info', 'success', 'warning', 'error', 'booking', 'payment', 'system'];
  const notificationType = validTypes.includes(type) ? type : 'info';

  const notifId = await insert(
    `INSERT INTO notifications (user_id, type, title, message, link, is_read)
     VALUES (?, ?, ?, ?, ?, 0)`,
    [
      userId,
      notificationType,
      title,
      message,
      link || null,
    ]
  );

  const notification = await queryOne('SELECT * FROM notifications WHERE id = ?', [notifId]);

  res.status(201).json({
    success: true,
    message: 'Notification created successfully',
    data: { notification },
  });
});

module.exports = {
  getMyNotifications,
  markAsRead,
  markAllRead,
  deleteNotification,
  createNotification,
};
