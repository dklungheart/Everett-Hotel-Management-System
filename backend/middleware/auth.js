/**
 * Authentication Middleware - Everett Hotel Management System
 * Handles JWT token verification and user authentication
 */

const jwt = require('jsonwebtoken');
const { queryOne } = require('../config/database');

/**
 * Protect routes - verify JWT token
 */
const protect = async (req, res, next) => {
  try {
    // Cookie-only authentication. The frontend stores no tokens in JS/localStorage
    // and never sends an Authorization/Bearer header; all auth is carried in the
    // httpOnly session cookie (sent automatically via credentials:'include').
    const token = req.cookies && req.cookies.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized. Please log in again.',
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const user = await queryOne(
      'SELECT u.*, r.name AS role_name FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = ? AND u.is_active = 1',
      [decoded.id]
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists or is deactivated.',
      });
    }

    // Invalidate tokens issued before a password change / reset
    if (decoded.tokenVersion !== (user.token_version || 0)) {
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please log in again.',
      });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      role: user.role_name,
      roleId: user.role_id,
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Please log in again.',
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please log in again.',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Authentication error.',
    });
  }
};

/**
 * Authorize specific roles
 * @param {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to access this resource.`,
      });
    }

    next();
  };
};

/**
 * Optional auth - attach user if token is present, but don't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    // Cookie-only: never read the Authorization header, matching `protect`.
    const token = req.cookies && req.cookies.token;

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await queryOne(
        'SELECT u.id, u.first_name, u.last_name, u.email, r.name AS role_name, u.role_id, u.token_version FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = ? AND u.is_active = 1',
        [decoded.id]
      );

      if (user && decoded.tokenVersion === (user.token_version || 0)) {
        req.user = {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          role: user.role_name,
          roleId: user.role_id,
        };
      }
    }

    next();
  } catch (error) {
    next();
  }
};

module.exports = { protect, authorize, optionalAuth };
