/**
 * Role-Based Access Control Middleware - Everett Hotel Management System
 * Granular permission checking for API endpoints
 */

const { query } = require('../config/database');

/**
 * Check if user has a specific permission
 * @param {string} permissionName - Permission name to check
 */
const hasPermission = (permissionName) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Not authenticated.',
        });
      }

      // Super admin has all permissions
      if (req.user.role === 'super_admin' || req.user.role === 'admin') {
        return next();
      }

      // Check permission from database
      const result = await query(
        `SELECT rp.role_id FROM role_permissions rp
         JOIN permissions p ON rp.permission_id = p.id
         JOIN users u ON u.role_id = rp.role_id
         WHERE u.id = ? AND p.name = ?`,
        [req.user.id, permissionName]
      );

      if (result.length === 0) {
        return res.status(403).json({
          success: false,
          message: `You do not have the '${permissionName}' permission.`,
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Permission check failed.',
      });
    }
  };
};

/**
 * Check if user has any of the specified permissions
 * @param {...string} permissionNames - Permission names to check
 */
const hasAnyPermission = (...permissionNames) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Not authenticated.',
        });
      }

      if (req.user.role === 'super_admin' || req.user.role === 'admin') {
        return next();
      }

      const placeholders = permissionNames.map(() => '?').join(',');
      const result = await query(
        `SELECT DISTINCT p.name FROM role_permissions rp
         JOIN permissions p ON rp.permission_id = p.id
         JOIN users u ON u.role_id = rp.role_id
         WHERE u.id = ? AND p.name IN (${placeholders})`,
        [req.user.id, ...permissionNames]
      );

      if (result.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'You do not have the required permissions.',
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Permission check failed.',
      });
    }
  };
};

module.exports = { hasPermission, hasAnyPermission };
