/**
 * Express Application Setup - Everett Hotel Management System
 * Configures middleware, routes, and error handling
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const roomRoutes = require('./routes/roomRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const housekeepingRoutes = require('./routes/housekeepingRoutes');
const restaurantRoutes = require('./routes/restaurantRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const galleryRoutes = require('./routes/galleryRoutes');
const promotionRoutes = require('./routes/promotionRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const contactRoutes = require('./routes/contactRoutes');
const newsletterRoutes = require('./routes/newsletterRoutes');
const reportRoutes = require('./routes/reportRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const adminRoutes = require('./routes/adminRoutes');
const mpesaRoutes = require('./routes/mpesaRoutes');
const cardBankRoutes = require('./routes/cardBankRoutes');
const cmsRoutes = require('./routes/cmsRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const exportRoutes = require('./routes/exportRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// Trust first proxy in production (for rate-limit IP detection, secure cookies)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// ============================================================
// Security Middleware
// ============================================================
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https://images.unsplash.com'],
      connectSrc: ["'self'", 'http://localhost:5000', 'https://*.stripe.com'],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS - restrict to configured allowed origins
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    const err = new Error(`Origin ${origin} is not allowed by CORS`);
    err.statusCode = 403;
    return callback(err);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
  },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Strict rate limit for password reset (anti email-bombing + token-guessing)
const passwordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many password reset attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/forgot-password', passwordLimiter);
app.use('/api/auth/reset-password', passwordLimiter);

// Rate limit for M-Pesa callback (public endpoint - prevent abuse)
const mpesaCallbackLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/mpesa/callback', mpesaCallbackLimiter);

// ============================================================
// Stripe Webhook (must be before JSON body parser)
// ============================================================
app.post('/api/card-bank/webhook', express.raw({ type: 'application/json' }), require('./controllers/cardBankController').handleStripeWebhook);

// ============================================================
// Body Parsing Middleware
// ============================================================
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser(process.env.COOKIE_SECRET));

// Request logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ============================================================
// Static Files
// ============================================================
// Block public access to private attendance photos (served via authenticated route)
app.use('/uploads/attendance', (req, res) => {
  res.status(403).json({
    success: false,
    message: 'Access denied. Attendance photos are private.',
  });
});
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
  },
}));

// ============================================================
// API Routes
// ============================================================
const apiRouter = express.Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/rooms', roomRoutes);
apiRouter.use('/bookings', bookingRoutes);
apiRouter.use('/payments', paymentRoutes);
apiRouter.use('/invoices', invoiceRoutes);
apiRouter.use('/reviews', reviewRoutes);
apiRouter.use('/employees', employeeRoutes);
apiRouter.use('/housekeeping', housekeepingRoutes);
apiRouter.use('/restaurant', restaurantRoutes);
apiRouter.use('/inventory', inventoryRoutes);
apiRouter.use('/gallery', galleryRoutes);
apiRouter.use('/promotions', promotionRoutes);
apiRouter.use('/notifications', notificationRoutes);
apiRouter.use('/contact', contactRoutes);
apiRouter.use('/newsletter', newsletterRoutes);
apiRouter.use('/reports', reportRoutes);
apiRouter.use('/analytics', analyticsRoutes);
apiRouter.use('/settings', settingsRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/mpesa', mpesaRoutes);
apiRouter.use('/card-bank', cardBankRoutes);
apiRouter.use('/cms', cmsRoutes);
apiRouter.use('/dashboard', dashboardRoutes);
apiRouter.use('/exports', exportRoutes);
apiRouter.use('/feedback', feedbackRoutes);
apiRouter.use('/attendance', attendanceRoutes);

app.use('/api', apiRouter);

// ============================================================
// Health Check
// ============================================================
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Everett Hotel API is running',
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// Serve Frontend
// ============================================================
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/frontend', express.static(path.join(__dirname, '../frontend')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ============================================================
// 404 Handler
// ============================================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// ============================================================
// Global Error Handler
// ============================================================
app.use(errorHandler);

module.exports = app;
