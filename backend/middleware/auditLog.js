/**
 * Audit Log Middleware - Everett Hotel Management System
 * Tracks user actions for security and compliance
 */

const { insert } = require('../config/database');

/**
 * Log an audit action
 * @param {Object} params - Audit log parameters
 */
async function logAudit({ userId, action, entityType, entityId, oldValues, newValues, req }) {
  try {
    await insert(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId || null,
        action,
        entityType || null,
        entityId || null,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        req ? (req.headers['x-forwarded-for'] || req.connection?.remoteAddress || null) : null,
        req ? (req.headers['user-agent'] || null) : null,
      ]
    );
  } catch (error) {
    console.error('Audit log error:', error.message);
  }
}

/**
 * Middleware to log actions automatically
 * @param {string} action - Action description
 * @param {string} entityType - Entity type
 */
function auditMiddleware(action, entityType) {
  return (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json to capture response
    res.json = function (body) {
      // Log successful mutations
      if (res.statusCode >= 200 && res.statusCode < 300 && req.method !== 'GET') {
        logAudit({
          userId: req.user ? req.user.id : null,
          action: `${req.method} ${action}`,
          entityType,
          entityId: req.params.id || null,
          newValues: req.body,
          req,
        });
      }

      return originalJson(body);
    };

    next();
  };
}

module.exports = { logAudit, auditMiddleware };
