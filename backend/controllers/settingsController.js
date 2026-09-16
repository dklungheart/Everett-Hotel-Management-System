const { query, queryOne, insert, execute } = require('../config/database');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { getPagination, paginationResponse } = require('../utils/helpers');

const getAllSettings = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, search = '' } = req.query;
  const { page: p, limit: l, offset } = getPagination(page, limit);

  let whereClause = 'WHERE 1=1';
  const params = [];

  if (search) {
    whereClause += ' AND (ss.setting_key LIKE ? OR ss.description LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s);
  }

  const countResult = await queryOne(
    `SELECT COUNT(*) AS total FROM system_settings ss ${whereClause}`,
    params
  );

  const settings = await query(
    `SELECT ss.*
     FROM system_settings ss
     ${whereClause}
     ORDER BY ss.setting_key ASC
     LIMIT ? OFFSET ?`,
    [...params, l, offset]
  );

  res.status(200).json({
    success: true,
    data: {
      settings,
      pagination: paginationResponse(countResult.total, p, l),
    },
  });
});

const getSettingByKey = asyncHandler(async (req, res) => {
  const { key } = req.params;

  const setting = await queryOne(
    `SELECT ss.*
     FROM system_settings ss
     WHERE ss.setting_key = ?`,
    [key]
  );

  if (!setting) {
    throw new ApiError('Setting not found', 404);
  }

  res.status(200).json({
    success: true,
    data: { setting },
  });
});

const updateSetting = asyncHandler(async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;

  if (value === undefined) {
    throw new ApiError('Setting value is required', 400);
  }

  const setting = await queryOne(
    'SELECT * FROM system_settings WHERE setting_key = ?',
    [key]
  );

  if (!setting) {
    throw new ApiError('Setting not found', 404);
  }

  await execute(
    'UPDATE system_settings SET setting_value = ? WHERE setting_key = ?',
    [value, key]
  );

  const updated = await queryOne(
    `SELECT ss.*
     FROM system_settings ss
     WHERE ss.setting_key = ?`,
    [key]
  );

  res.status(200).json({
    success: true,
    message: 'Setting updated successfully',
    data: { setting: updated },
  });
});

const bulkUpdateSettings = asyncHandler(async (req, res) => {
  const { settings } = req.body;

  if (!settings || typeof settings !== 'object' || Object.keys(settings).length === 0) {
    throw new ApiError('Settings object is required with at least one key-value pair', 400);
  }

  const updated = [];
  const errors = [];

  for (const [key, value] of Object.entries(settings)) {
    const setting = await queryOne(
      'SELECT id, setting_key FROM system_settings WHERE setting_key = ?',
      [key]
    );

    if (!setting) {
      errors.push({ key, error: 'Setting not found' });
      continue;
    }

    await execute(
      'UPDATE system_settings SET setting_value = ? WHERE setting_key = ?',
      [value, key]
    );

    updated.push({ key, value });
  }

  res.status(200).json({
    success: true,
    message: `${updated.length} setting(s) updated successfully`,
    data: {
      updated,
      errors: errors.length > 0 ? errors : undefined,
      totalUpdated: updated.length,
      totalErrors: errors.length,
    },
  });
});

module.exports = {
  getAllSettings,
  getSettingByKey,
  updateSetting,
  bulkUpdateSettings,
};
