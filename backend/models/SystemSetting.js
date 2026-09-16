/**
 * SystemSetting Model - Everett Hotel Management System
 * Handles all database operations for system settings
 */

const { query, queryOne, insert, execute } = require('../config/database');

class SystemSetting {
  /**
   * Find setting by ID
   */
  static async findById(id) {
    return queryOne(
      `SELECT ss.*, u.first_name, u.last_name
       FROM system_settings ss
       LEFT JOIN users u ON ss.updated_by = u.id
       WHERE ss.id = ?`,
      [id]
    );
  }

  /**
   * Find setting by key
   */
  static async findByKey(key) {
    return queryOne(
      `SELECT ss.*, u.first_name, u.last_name
       FROM system_settings ss
       LEFT JOIN users u ON ss.updated_by = u.id
       WHERE ss.setting_key = ?`,
      [key]
    );
  }

  /**
   * Get a setting value by key
   */
  static async getValue(key, defaultValue = null) {
    const setting = await queryOne(
      'SELECT setting_value FROM system_settings WHERE setting_key = ?',
      [key]
    );
    return setting ? setting.setting_value : defaultValue;
  }

  /**
   * Get multiple settings by group
   */
  static async getByGroup(group) {
    const settings = await query(
      `SELECT ss.*
       FROM system_settings ss
       WHERE ss.group_name = ?
       ORDER BY ss.sort_order ASC, ss.setting_key ASC`,
      [group]
    );

    // Convert array to key-value object
    const result = {};
    for (const setting of settings) {
      result[setting.setting_key] = setting.setting_value;
    }
    return result;
  }

  /**
   * Get all settings with filters
   */
  static async findAll({ page = 1, limit = 50, group = '', search = '' } = {}) {
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (group) {
      whereClause += ' AND ss.group_name = ?';
      params.push(group);
    }

    if (search) {
      whereClause += ' AND (ss.setting_key LIKE ? OR ss.setting_value LIKE ? OR ss.description LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    const countResult = await queryOne(
      `SELECT COUNT(*) AS total FROM system_settings ss ${whereClause}`,
      params
    );

    const offset = (page - 1) * limit;
    const settings = await query(
      `SELECT ss.*, u.first_name, u.last_name
       FROM system_settings ss
       LEFT JOIN users u ON ss.updated_by = u.id
       ${whereClause}
       ORDER BY ss.group_name ASC, ss.sort_order ASC, ss.setting_key ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { settings, total: countResult.total };
  }

  /**
   * Get all setting groups
   */
  static async getGroups() {
    return query(
      `SELECT group_name, COUNT(*) AS count
       FROM system_settings
       GROUP BY group_name
       ORDER BY group_name ASC`
    );
  }

  /**
   * Create a setting
   */
  static async create(settingData) {
    const id = await insert(
      `INSERT INTO system_settings (setting_key, setting_value, setting_type,
        group_name, description, is_public, sort_order, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        settingData.key,
        settingData.value,
        settingData.type || 'string',
        settingData.group || 'general',
        settingData.description || null,
        settingData.isPublic !== undefined ? (settingData.isPublic ? 1 : 0) : 0,
        settingData.sortOrder || 0,
        settingData.updatedBy || null,
      ]
    );

    return this.findById(id);
  }

  /**
   * Update a setting by key
   */
  static async updateByKey(key, value, updatedBy = null) {
    const updates = ['setting_value = ?'];
    const values = [value];

    if (updatedBy) {
      updates.push('updated_by = ?');
      values.push(updatedBy);
    }

    updates.push('updated_at = NOW()');
    values.push(key);

    await execute(
      `UPDATE system_settings SET ${updates.join(', ')} WHERE setting_key = ?`,
      values
    );

    return this.findByKey(key);
  }

  /**
   * Update a setting by ID
   */
  static async update(id, settingData) {
    const fields = [];
    const values = [];

    const allowedFields = [
      'setting_value', 'setting_type', 'group_name', 'description',
      'is_public', 'sort_order', 'updated_by',
    ];

    const camelMapping = {
      setting_value: 'value',
      setting_type: 'type',
      group_name: 'group',
      description: 'description',
      is_public: 'isPublic',
      sort_order: 'sortOrder',
      updated_by: 'updatedBy',
    };

    for (const field of allowedFields) {
      const camelField = camelMapping[field] || field;
      if (settingData[camelField] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(settingData[camelField]);
      }
    }

    if (fields.length === 0) return this.findById(id);

    fields.push('updated_at = NOW()');
    values.push(id);
    await execute(
      `UPDATE system_settings SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  /**
   * Bulk update settings
   */
  static async bulkUpdate(settings, updatedBy = null) {
    for (const [key, value] of Object.entries(settings)) {
      await this.updateByKey(key, value, updatedBy);
    }
  }

  /**
   * Delete a setting
   */
  static async delete(id) {
    return execute('DELETE FROM system_settings WHERE id = ?', [id]);
  }

  /**
   * Get public settings
   */
  static async getPublicSettings() {
    const settings = await query(
      "SELECT setting_key, setting_value, setting_type FROM system_settings WHERE is_public = 1 ORDER BY sort_order ASC"
    );

    const result = {};
    for (const setting of settings) {
      result[setting.setting_key] = setting.setting_value;
    }
    return result;
  }
}

module.exports = SystemSetting;
