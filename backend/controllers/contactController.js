const { query, queryOne, insert, execute } = require('../config/database');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { getPagination, paginationResponse } = require('../utils/helpers');
const { sendContactNotification } = require('../utils/email');

const sendMessage = asyncHandler(async (req, res) => {
  const { name, email, phone, subject, message, category, priority } = req.body;

  if (!name || !email || !subject || !message) {
    throw new ApiError('Name, email, subject, and message are required', 400);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ApiError('Invalid email address', 400);
  }

  const messageId = await insert(
    `INSERT INTO contact_messages (user_id, name, email, phone, subject, message, status)
     VALUES (?, ?, ?, ?, ?, ?, 'unread')`,
    [
      req.user ? req.user.id : null,
      name,
      email,
      phone || null,
      subject,
      message,
    ]
  );

  const contactMessage = await queryOne('SELECT * FROM contact_messages WHERE id = ?', [messageId]);

  sendContactNotification({
    name,
    email,
    phone,
    subject,
    message,
  }).catch(() => {});

  res.status(201).json({
    success: true,
    message: 'Message sent successfully. We will get back to you soon.',
    data: { message: contactMessage },
  });
});

const getAllMessages = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status = '', category = '', search = '' } = req.query;
  const { page: p, limit: l, offset } = getPagination(page, limit);

  let whereClause = 'WHERE 1=1';
  const params = [];

  if (status) {
    whereClause += ' AND cm.status = ?';
    params.push(status);
  }

  if (category) {
    whereClause += ' AND cm.category = ?';
    params.push(category);
  }

  if (search) {
    whereClause += ' AND (cm.name LIKE ? OR cm.email LIKE ? OR cm.subject LIKE ? OR cm.message LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }

  const countResult = await queryOne(
    `SELECT COUNT(*) AS total FROM contact_messages cm ${whereClause}`,
    params
  );

  const messages = await query(
    `SELECT cm.*, r.first_name AS replied_by_first_name, r.last_name AS replied_by_last_name
     FROM contact_messages cm
     LEFT JOIN users r ON cm.replied_by = r.id
     ${whereClause}
     ORDER BY cm.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, l, offset]
  );

  res.status(200).json({
    success: true,
    data: {
      messages,
      pagination: paginationResponse(countResult.total, p, l),
    },
  });
});

const updateMessageStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['unread', 'read', 'replied', 'archived'];

  if (!validStatuses.includes(status)) {
    throw new ApiError('Invalid message status', 400);
  }

  const message = await queryOne('SELECT id FROM contact_messages WHERE id = ?', [req.params.id]);
  if (!message) {
    throw new ApiError('Message not found', 404);
  }

  const updates = ['status = ?'];
  const values = [status];

  if (status === 'replied') {
    updates.push('replied_by = ?', 'replied_at = NOW()');
    values.push(req.user.id);
  }

  values.push(req.params.id);
  await execute(`UPDATE contact_messages SET ${updates.join(', ')} WHERE id = ?`, values);

  const updated = await queryOne(
    `SELECT cm.*, r.first_name AS replied_by_first_name, r.last_name AS replied_by_last_name
     FROM contact_messages cm
     LEFT JOIN users r ON cm.replied_by = r.id
     WHERE cm.id = ?`,
    [req.params.id]
  );

  res.status(200).json({
    success: true,
    message: 'Message status updated successfully',
    data: { message: updated },
  });
});

const deleteMessage = asyncHandler(async (req, res) => {
  const message = await queryOne('SELECT id FROM contact_messages WHERE id = ?', [req.params.id]);
  if (!message) {
    throw new ApiError('Message not found', 404);
  }

  await execute('DELETE FROM contact_messages WHERE id = ?', [req.params.id]);

  res.status(200).json({
    success: true,
    message: 'Message deleted successfully',
  });
});

module.exports = {
  sendMessage,
  getAllMessages,
  updateMessageStatus,
  deleteMessage,
};
