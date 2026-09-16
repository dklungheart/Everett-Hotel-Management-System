const express = require('express');
const router = express.Router();
const {
  register,
  login,
  refreshAccessToken,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  verifyEmail,
  changePassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  changePasswordValidation,
} = require('../middleware/validate');
const { auditMiddleware } = require('../middleware/auditLog');
const rateLimit = require('express-rate-limit');

const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many verification attempts. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', registerValidation, auditMiddleware('register'), register);
router.post('/login', loginValidation, auditMiddleware('login'), login);
router.post('/refresh', auditMiddleware('token_refresh'), refreshAccessToken);
router.post('/logout', auditMiddleware('logout'), logout);
router.get('/me', protect, getMe);
router.post('/forgot-password', forgotPasswordValidation, auditMiddleware('forgot_password'), forgotPassword);
router.post('/reset-password', resetPasswordValidation, auditMiddleware('reset_password'), resetPassword);
router.get('/verify-email/:token', verifyLimiter, auditMiddleware('verify_email'), verifyEmail);
router.get('/verify-email', verifyLimiter, auditMiddleware('verify_email'), verifyEmail);
router.put('/change-password', protect, changePasswordValidation, auditMiddleware('change_password'), changePassword);

module.exports = router;
