/**
 * Housekeeping Model - Everett Hotel Management System
 * Handles all database operations for housekeeping tasks
 */

const { query, queryOne, insert, execute } = require('../config/database');

class Housekeeping {
  /**
   * Find task by ID with full details
   */
  static async findById(id) {
    return queryOne(
      `SELECT h.*, r.room_number, rc.name AS room_category,
              u.first_name AS assigned_first_name, u.last_name AS assigned_last_name,
              c.first_name AS created_first_name, c.last_name AS created_last_name
       FROM housekeeping h
       JOIN rooms r ON h.room_id = r.id
       JOIN room_categories rc ON r.category_id = rc.id
       LEFT JOIN users u ON h.assigned_to = u.id
       LEFT JOIN users c ON h.created_by = c.id
       WHERE h.id = ?`,
      [id]
    );
  }

  /**
   * Get all housekeeping tasks with filters
   */
  static async findAll({ page = 1, limit = 10, status = '', priority = '', assignedTo = '', roomNumber = '', search = '' } = {}) {
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

    if (roomNumber) {
      whereClause += ' AND r.room_number LIKE ?';
      params.push(`%${roomNumber}%`);
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

    const offset = (page - 1) * limit;
    const tasks = await query(
      `SELECT h.*, r.room_number, rc.name AS room_category,
              u.first_name AS assigned_first_name, u.last_name AS assigned_last_name
       FROM housekeeping h
       JOIN rooms r ON h.room_id = r.id
       JOIN room_categories rc ON r.category_id = rc.id
       LEFT JOIN users u ON h.assigned_to = u.id
       ${whereClause}
       ORDER BY FIELD(h.priority, 'urgent', 'high', 'medium', 'low'), h.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { tasks, total: countResult.total };
  }

  /**
   * Get tasks assigned to a specific employee
   */
  static async findByAssignee(userId, { page = 1, limit = 10, status = '' } = {}) {
    let whereClause = 'WHERE h.assigned_to = ?';
    const params = [userId];

    if (status) {
      whereClause += ' AND h.status = ?';
      params.push(status);
    }

    const countResult = await queryOne(
      `SELECT COUNT(*) AS total FROM housekeeping h ${whereClause}`,
      params
    );

    const offset = (page - 1) * limit;
    const tasks = await query(
      `SELECT h.*, r.room_number, rc.name AS room_category
       FROM housekeeping h
       JOIN rooms r ON h.room_id = r.id
       JOIN room_categories rc ON r.category_id = rc.id
       ${whereClause}
       ORDER BY FIELD(h.priority, 'urgent', 'high', 'medium', 'low'), h.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { tasks, total: countResult.total };
  }

  /**
   * Get today's tasks
   */
  static async findToday({ status = '', assignedTo = '' } = {}) {
    let whereClause = "WHERE DATE(h.scheduled_date) = CURDATE()";
    const params = [];

    if (status) {
      whereClause += ' AND h.status = ?';
      params.push(status);
    }

    if (assignedTo) {
      whereClause += ' AND h.assigned_to = ?';
      params.push(assignedTo);
    }

    return query(
      `SELECT h.*, r.room_number, rc.name AS room_category,
              u.first_name AS assigned_first_name, u.last_name AS assigned_last_name
       FROM housekeeping h
       JOIN rooms r ON h.room_id = r.id
       JOIN room_categories rc ON r.category_id = rc.id
       LEFT JOIN users u ON h.assigned_to = u.id
       ${whereClause}
       ORDER BY FIELD(h.priority, 'urgent', 'high', 'medium', 'low'), h.scheduled_date ASC`,
      params
    );
  }

  /**
   * Create a housekeeping task
   */
  static async create(taskData) {
    const id = await insert(
      `INSERT INTO housekeeping (room_id, task_type, priority, assigned_to, created_by,
        scheduled_date, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        taskData.roomId,
        taskData.taskType,
        taskData.priority || 'medium',
        taskData.assignedTo || null,
        taskData.createdBy,
        taskData.scheduledDate || new Date().toISOString().split('T')[0],
        taskData.notes || null,
        taskData.status || 'pending',
      ]
    );

    return this.findById(id);
  }

  /**
   * Update a task
   */
  static async update(id, taskData) {
    const fields = [];
    const values = [];

    const allowedFields = [
      'task_type', 'priority', 'assigned_to', 'scheduled_date',
      'notes', 'status', 'completed_at',
    ];

    for (const field of allowedFields) {
      const camelField = field.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      if (taskData[camelField] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(taskData[camelField]);
      }
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    await execute(
      `UPDATE housekeeping SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  /**
   * Update task status
   */
  static async updateStatus(id, status) {
    const updates = ['status = ?'];
    const values = [status];

    if (status === 'completed') {
      updates.push('completed_at = NOW()');
    }

    values.push(id);
    await execute(
      `UPDATE housekeeping SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  /**
   * Delete a task
   */
  static async delete(id) {
    return execute('DELETE FROM housekeeping WHERE id = ?', [id]);
  }

  /**
   * Get housekeeping statistics
   */
  static async getStats() {
    const total = await queryOne('SELECT COUNT(*) AS total FROM housekeeping');
    const pending = await queryOne(
      "SELECT COUNT(*) AS total FROM housekeeping WHERE status = 'pending'"
    );
    const inProgress = await queryOne(
      "SELECT COUNT(*) AS total FROM housekeeping WHERE status = 'in_progress'"
    );
    const completedToday = await queryOne(
      "SELECT COUNT(*) AS total FROM housekeeping WHERE status = 'completed' AND DATE(completed_at) = CURDATE()"
    );
    const byPriority = await query(
      'SELECT priority, COUNT(*) AS count FROM housekeeping WHERE status != "completed" GROUP BY priority'
    );

    return {
      total: total.total,
      pending: pending.total,
      inProgress: inProgress.total,
      completedToday: completedToday.total,
      byPriority,
    };
  }
}

module.exports = Housekeeping;
