const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query, queryOne, insert, execute } = require('../config/database');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } = require('../utils/email');

const BCRYPT_ROUNDS = 12;
const MAX_PASSWORD_LENGTH = 72;

function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function generateToken(id, tokenVersion = 0) {
  return jwt.sign({ id, tokenVersion, type: 'access' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });
}

function generateRefreshToken(id, tokenVersion = 0) {
  return jwt.sign(
    { id, tokenVersion, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
}

const COOKIE_SECURE = process.env.NODE_ENV === 'production';

const sendTokenResponse = (user, statusCode, res, message) => {
  const token = generateToken(user.id, user.token_version || 0);
  const refreshToken = generateRefreshToken(user.id, user.token_version || 0);

  const baseOpts = {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: 'strict',
  };

  res
    .status(statusCode)
    .cookie('token', token, { ...baseOpts, maxAge: 15 * 60 * 1000 })
    .cookie('refreshToken', refreshToken, { ...baseOpts, maxAge: 7 * 24 * 60 * 60 * 1000 })
    .json({
      success: true,
      message,
      data: {
        user: {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          role: user.role_name,
        },
      },
    });
};

const clearAuthCookies = (res) => {
  const opts = { httpOnly: true, secure: COOKIE_SECURE, sameSite: 'strict' };
  res
    .cookie('token', '', { ...opts, maxAge: 0 })
    .cookie('refreshToken', '', { ...opts, maxAge: 0 });
};

const register = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password, phone } = req.body;

  if (password && password.length > MAX_PASSWORD_LENGTH) {
    throw new ApiError('Password must not exceed 72 characters', 400);
  }

  const existingUser = await queryOne('SELECT id FROM users WHERE email = ?', [email]);
  if (existingUser) {
    throw new ApiError('Email already registered', 400);
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const rawVerificationToken = crypto.randomBytes(32).toString('hex');
  const verificationTokenHash = hashToken(rawVerificationToken);
  const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const userId = await insert(
    `INSERT INTO users (first_name, last_name, email, password_hash, phone, role_id,
      verification_token, verification_expires, token_version)
     VALUES (?, ?, ?, ?, ?, 2, ?, ?, 0)`,
    [firstName, lastName, email, passwordHash, phone || null, verificationTokenHash, verificationExpires]
  );

  const user = await queryOne(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.token_version, r.name AS role_name
     FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = ?`,
    [userId]
  );

  sendVerificationEmail(email, rawVerificationToken, firstName);

  res.status(201).json({
    success: true,
    message: 'Registration successful. Please verify your email to activate your account.',
    data: {
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role_name,
      },
    },
  });
});

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError('Please provide email and password', 400);
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new ApiError('Invalid credentials', 401);
  }

  const user = await queryOne(
    `SELECT u.*, r.name AS role_name
     FROM users u LEFT JOIN roles r ON u.role_id = r.id
     WHERE u.email = ? AND u.is_active = 1`,
    [email]
  );

  if (!user) {
    throw new ApiError('Invalid credentials', 401);
  }

  if (user.lockout_until && new Date(user.lockout_until) > new Date()) {
    const waitMin = Math.ceil((new Date(user.lockout_until) - new Date()) / 60000);
    throw new ApiError(`Account temporarily locked. Try again in ${waitMin} minute(s).`, 423);
  }

  if (!user.is_verified) {
    throw new ApiError('Please verify your email before logging in.', 403);
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    const attempts = (user.failed_login_attempts || 0) + 1;
    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      const lockoutUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
      await execute(
        'UPDATE users SET failed_login_attempts = ?, lockout_until = ? WHERE id = ?',
        [attempts, lockoutUntil, user.id]
      );
      throw new ApiError('Too many failed attempts. Account locked for 15 minutes.', 423);
    }
    await execute('UPDATE users SET failed_login_attempts = ? WHERE id = ?', [attempts, user.id]);
    throw new ApiError('Invalid credentials', 401);
  }

  await execute(
    'UPDATE users SET failed_login_attempts = 0, lockout_until = NULL, last_login = NOW() WHERE id = ?',
    [user.id]
  );

  const freshUser = await queryOne(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.token_version, r.name AS role_name
     FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = ?`,
    [user.id]
  );

  sendTokenResponse(freshUser, 200, res, 'Login successful');
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const refreshTokenValue = req.cookies && req.cookies.refreshToken;

  if (!refreshTokenValue) {
    clearAuthCookies(res);
    throw new ApiError('Session expired. Please log in again.', 401);
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshTokenValue, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    clearAuthCookies(res);
    if (err.name === 'TokenExpiredError') {
      throw new ApiError('Session expired. Please log in again.', 401);
    }
    throw new ApiError('Invalid session. Please log in again.', 401);
  }

  if (decoded.type !== 'refresh') {
    clearAuthCookies(res);
    throw new ApiError('Invalid token type', 401);
  }

  const user = await queryOne(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.is_active, u.token_version,
            r.name AS role_name
     FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = ?`,
    [decoded.id]
  );

  if (!user || !user.is_active) {
    clearAuthCookies(res);
    throw new ApiError('User no longer exists or is deactivated.', 401);
  }

  if (decoded.tokenVersion !== (user.token_version || 0)) {
    clearAuthCookies(res);
    throw new ApiError('Session revoked. Please log in again.', 401);
  }

  const newToken = generateToken(user.id, user.token_version || 0);
  const newRefreshToken = generateRefreshToken(user.id, user.token_version || 0);

  const opts = { httpOnly: true, secure: COOKIE_SECURE, sameSite: 'strict' };

  res
    .status(200)
    .cookie('token', newToken, { ...opts, maxAge: 15 * 60 * 1000 })
    .cookie('refreshToken', newRefreshToken, { ...opts, maxAge: 7 * 24 * 60 * 60 * 1000 })
    .json({
      success: true,
      message: 'Token refreshed',
    });
});

const logout = asyncHandler(async (req, res) => {
  clearAuthCookies(res);
  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

const getMe = asyncHandler(async (req, res) => {
  const user = await queryOne(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.address,
            u.city, u.state, u.country, u.zip_code, u.profile_photo,
            u.is_active, u.is_verified, u.last_login, u.created_at,
            r.name AS role_name
     FROM users u LEFT JOIN roles r ON u.role_id = r.id
     WHERE u.id = ?`,
    [req.user.id]
  );

  if (!user) {
    throw new ApiError('User not found', 404);
  }

  res.status(200).json({
    success: true,
    data: { user },
  });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await queryOne('SELECT id, first_name, email FROM users WHERE email = ?', [email]);

  if (!user) {
    return res.status(200).json({
      success: true,
      message: 'If the email exists, a reset link has been sent.',
    });
  }

  const rawResetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenHash = hashToken(rawResetToken);
  const resetExpires = new Date(Date.now() + 60 * 60 * 1000);

  await execute(
    'UPDATE users SET reset_password_token = ?, reset_password_expires = ? WHERE id = ?',
    [resetTokenHash, resetExpires, user.id]
  );

  sendPasswordResetEmail(user.email, rawResetToken, user.first_name);

  res.status(200).json({
    success: true,
    message: 'If the email exists, a reset link has been sent.',
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  if (password && password.length > MAX_PASSWORD_LENGTH) {
    throw new ApiError('Password must not exceed 72 characters', 400);
  }

  const tokenHash = hashToken(token);

  const user = await queryOne(
    `SELECT id FROM users
     WHERE reset_password_token = ? AND reset_password_expires > NOW()`,
    [tokenHash]
  );

  if (!user) {
    throw new ApiError('Invalid or expired reset token', 400);
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  await execute(
    'UPDATE users SET password_hash = ?, reset_password_token = NULL, reset_password_expires = NULL, token_version = token_version + 1 WHERE id = ?',
    [passwordHash, user.id]
  );

  const updatedUser = await queryOne(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.token_version, r.name AS role_name
     FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = ?`,
    [user.id]
  );

  sendTokenResponse(updatedUser, 200, res, 'Password reset successful');
});

const verifyEmail = asyncHandler(async (req, res) => {
  const token = req.params.token || req.query.token || req.body.token;

  if (!token) {
    throw new ApiError('Verification token is required', 400);
  }

  const tokenHash = hashToken(token);

  const user = await queryOne(
    `SELECT id, first_name, email FROM users
     WHERE verification_token = ? AND verification_expires > NOW() AND is_verified = 0`,
    [tokenHash]
  );

  if (!user) {
    throw new ApiError('Invalid or expired verification token', 400);
  }

  await execute(
    'UPDATE users SET is_verified = 1, verification_token = NULL, verification_expires = NULL WHERE id = ?',
    [user.id]
  );

  sendWelcomeEmail(user.email, user.first_name);

  res.status(200).json({
    success: true,
    message: 'Email verified successfully',
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ApiError('Current password and new password are required', 400);
  }

  if (newPassword.length > MAX_PASSWORD_LENGTH) {
    throw new ApiError('Password must not exceed 72 characters', 400);
  }

  const user = await queryOne('SELECT id, password_hash FROM users WHERE id = ?', [req.user.id]);
  if (!user) {
    throw new ApiError('User not found', 404);
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isMatch) {
    throw new ApiError('Current password is incorrect', 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  await execute(
    'UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?',
    [passwordHash, user.id]
  );

  clearAuthCookies(res);

  res.status(200).json({
    success: true,
    message: 'Password changed successfully. Please log in again.',
  });
});

module.exports = {
  register,
  login,
  refreshAccessToken,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  verifyEmail,
  changePassword,
};
