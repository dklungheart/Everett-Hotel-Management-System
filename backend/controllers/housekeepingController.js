const { query, queryOne, insert, execute } = require('../config/database');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { getPagination, paginationResponse } = require('../utils/helpers');

const getAllTasks = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status = '', priority = '', assignedTo = '', search = '' } = req.query;
  const { page: p, limit: l, offset } = getPagination(page, limit);

  let whereClause = 'WHERE 1=1';
  const params = [];

  if (status) {
    whereClause += ' AND h.status = ?';
    params.push(status);
  }

  if (priority) {
    whereClause += ' AND h.priority = ?';
    params.push(priority);
  }

  if (assignedTo) {
    whereClause += ' AND h.assigned_to = ?';
    params.push(assignedTo);
  }

  if (search) {
    whereClause += ' AND (r.room_number LIKE ? OR h.task_type LIKE ? OR h.notes LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  const countResult = await queryOne(
    `SELECT COUNT(*) AS total FROM housekeeping h
     JOIN rooms r ON h.room_id = r.id
     ${whereClause}`,
    params
  );

  const tasks = await query(
    `SELECT h.*, r.room_number, rc.name AS room_category,
            e.first_name AS assigned_first_name, e.last_name AS assigned_last_name
     FROM housekeeping h
     JOIN rooms r ON h.room_id = r.id
     JOIN room_categories rc ON r.category_id = rc.id
     LEFT JOIN employees e ON h.assigned_to = e.id
     ${whereClause}
     ORDER BY FIELD(h.priority, 'urgent', 'high', 'medium', 'low'), h.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, l, offset]
  );

  res.status(200).json({
    success: true,
    data: {
      tasks,
      pagination: paginationResponse(countResult.total, p, l),
    },
  });
});

const getTaskById = asyncHandler(async (req, res) => {
  const task = await queryOne(
    `SELECT h.*, r.room_number, rc.name AS room_category,
            e.first_name AS assigned_first_name, e.last_name AS assigned_last_name
     FROM housekeeping h
     JOIN rooms r ON h.room_id = r.id
     JOIN room_categories rc ON r.category_id = rc.id
     LEFT JOIN employees e ON h.assigned_to = e.id
     WHERE h.id = ?`,
    [req.params.id]
  );

  if (!task) {
    throw new ApiError('Housekeeping task not found', 404);
  }

  res.status(200).json({
    success: true,
    data: { task },
  });
});

const createTask = asyncHandler(async (req, res) => {
  const { roomId, taskType, priority, assignedTo, scheduledDate, notes } = req.body;

  const room = await queryOne('SELECT id FROM rooms WHERE id = ?', [roomId]);
  if (!room) {
    throw new ApiError('Room not found', 404);
  }

  if (assignedTo) {
    const employee = await queryOne('SELECT id FROM employees WHERE id = ?', [assignedTo]);
    if (!employee) {
      throw new ApiError('Employee not found', 404);
    }
  }

  const taskId = await insert(
    `INSERT INTO housekeeping (room_id, task_type, priority, assigned_to,
      scheduled_date, notes, status)
     VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
    [
      roomId,
      taskType,
      priority || 'medium',
      assignedTo || null,
      scheduledDate || new Date().toISOString().split('T')[0],
      notes || null,
    ]
  );

  const task = await queryOne(
    `SELECT h.*, r.room_number, rc.name AS room_category,
            e.first_name AS assigned_first_name, e.last_name AS assigned_last_name
     FROM housekeeping h
     JOIN rooms r ON h.room_id = r.id
     JOIN room_categories rc ON r.category_id = rc.id
     LEFT JOIN employees e ON h.assigned_to = e.id
     WHERE h.id = ?`,
    [taskId]
  );

  res.status(201).json({
    success: true,
    message: 'Housekeeping task created successfully',
    data: { task },
  });
});

const updateTask = asyncHandler(async (req, res) => {
  const existing = await queryOne('SELECT id FROM housekeeping WHERE id = ?', [req.params.id]);
  if (!existing) {
    throw new ApiError('Housekeeping task not found', 404);
  }

  const { taskType, priority, scheduledDate, notes, status } = req.body;

  const fields = [];
  const values = [];

  if (taskType !== undefined) { fields.push('task_type = ?'); values.push(taskType); }
  if (priority !== undefined) { fields.push('priority = ?'); values.push(priority); }
  if (scheduledDate !== undefined) { fields.push('scheduled_date = ?'); values.push(scheduledDate); }
  if (notes !== undefined) { fields.push('notes = ?'); values.push(notes); }
  if (status !== undefined) {
    fields.push('status = ?');
    values.push(status);
    if (status === 'completed') {
      fields.push('completed_at = NOW()');
    }
  }

  if (fields.length === 0) {
    throw new ApiError('No fields to update', 400);
  }

  values.push(req.params.id);
  await execute(`UPDATE housekeeping SET ${fields.join(', ')} WHERE id = ?`, values);

  const task = await queryOne(
    `SELECT h.*, r.room_number, rc.name AS room_category,
            e.first_name AS assigned_first_name, e.last_name AS assigned_last_name
     FROM housekeeping h
     JOIN rooms r ON h.room_id = r.id
     JOIN room_categories rc ON r.category_id = rc.id
     LEFT JOIN employees e ON h.assigned_to = e.id
     WHERE h.id = ?`,
    [req.params.id]
  );

  res.status(200).json({
    success: true,
    message: 'Task updated successfully',
    data: { task },
  });
});

const assignTask = asyncHandler(async (req, res) => {
  const { assignedTo } = req.body;

  const task = await queryOne('SELECT id FROM housekeeping WHERE id = ?', [req.params.id]);
  if (!task) {
    throw new ApiError('Housekeeping task not found', 404);
  }

  if (assignedTo) {
    const employee = await queryOne('SELECT id FROM employees WHERE id = ?', [assignedTo]);
    if (!employee) {
      throw new ApiError('Employee not found', 404);
    }
  }

  await execute('UPDATE housekeeping SET assigned_to = ? WHERE id = ?', [assignedTo || null, req.params.id]);

  const updated = await queryOne(
    `SELECT h.*, r.room_number, rc.name AS room_category,
            e.first_name AS assigned_first_name, e.last_name AS assigned_last_name
     FROM housekeeping h
     JOIN rooms r ON h.room_id = r.id
     JOIN room_categories rc ON r.category_id = rc.id
     LEFT JOIN employees e ON h.assigned_to = e.id
     WHERE h.id = ?`,
    [req.params.id]
  );

  res.status(200).json({
    success: true,
    message: 'Task assigned successfully',
    data: { task: updated },
  });
});

const updateTaskStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];

  if (!validStatuses.includes(status)) {
    throw new ApiError('Invalid task status', 400);
  }

  const task = await queryOne('SELECT id FROM housekeeping WHERE id = ?', [req.params.id]);
  if (!task) {
    throw new ApiError('Housekeeping task not found', 404);
  }

  const updates = ['status = ?'];
  const values = [status];

  if (status === 'completed') {
    updates.push('completed_at = NOW()');
  }

  values.push(req.params.id);
  await execute(`UPDATE housekeeping SET ${updates.join(', ')} WHERE id = ?`, values);

  const updated = await queryOne(
    `SELECT h.*, r.room_number, rc.name AS room_category,
            e.first_name AS assigned_first_name, e.last_name AS assigned_last_name
     FROM housekeeping h
     JOIN rooms r ON h.room_id = r.id
     JOIN room_categories rc ON r.category_id = rc.id
     LEFT JOIN employees e ON h.assigned_to = e.id
     WHERE h.id = ?`,
    [req.params.id]
  );

  res.status(200).json({
    success: true,
    message: 'Task status updated successfully',
    data: { task: updated },
  });
});

const getMyTasks = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status = '' } = req.query;
  const { page: p, limit: l, offset } = getPagination(page, limit);

  let whereClause = 'WHERE h.assigned_to = ?';
  const params = [req.user.id];

  if (status) {
    whereClause += ' AND h.status = ?';
    params.push(status);
  }

  const countResult = await queryOne(
    `SELECT COUNT(*) AS total FROM housekeeping h ${whereClause}`,
    params
  );

  const tasks = await query(
    `SELECT h.*, r.room_number, rc.name AS room_category
     FROM housekeeping h
     JOIN rooms r ON h.room_id = r.id
     JOIN room_categories rc ON r.category_id = rc.id
     ${whereClause}
     ORDER BY FIELD(h.priority, 'urgent', 'high', 'medium', 'low'), h.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, l, offset]
  );

  res.status(200).json({
    success: true,
    data: {
      tasks,
      pagination: paginationResponse(countResult.total, p, l),
    },
  });
});

module.exports = {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  assignTask,
  updateTaskStatus,
  getMyTasks,
};
