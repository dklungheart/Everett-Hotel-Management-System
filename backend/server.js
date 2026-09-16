/**
 * Server Entry Point - Everett Hotel Management System
 * Starts the Express server and connects to the database
 */

const app = require('./app');
const { testConnection } = require('./config/database');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

function validateSecrets() {
  const errors = [];

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET must be set and at least 32 characters');
  }

  if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
    errors.push('JWT_REFRESH_SECRET must be set and at least 32 characters');
  }

  if (
    process.env.JWT_SECRET &&
    process.env.JWT_REFRESH_SECRET &&
    process.env.JWT_SECRET === process.env.JWT_REFRESH_SECRET
  ) {
    errors.push('JWT_SECRET and JWT_REFRESH_SECRET must be different values');
  }

  if (!process.env.COOKIE_SECRET || process.env.COOKIE_SECRET.length < 16) {
    errors.push('COOKIE_SECRET must be set and at least 16 characters');
  }

  if (process.env.NODE_ENV === 'production') {
    if (!process.env.COOKIE_DOMAIN) {
      console.warn('  ⚠ COOKIE_DOMAIN not set — cookies may not work cross-subdomain');
    }
    const origins = process.env.ALLOWED_ORIGINS || '';
    if (!origins || origins.includes('localhost')) {
      errors.push('ALLOWED_ORIGINS must not include localhost in production');
    }
  }

  if (errors.length > 0) {
    console.error('');
    console.error('  ✗ Security configuration errors:');
    errors.forEach((e) => console.error(`    - ${e}`));
    console.error('');
    process.exit(1);
  }
}

async function startServer() {
  console.log('');
  console.log('  ╔══════════════════════════════════════════╗');
  console.log('  ║     EVERETT HOTEL MANAGEMENT SYSTEM      ║');
  console.log('  ║   Luxury, Comfort, Excellence.           ║');
  console.log('  ╚══════════════════════════════════════════╝');
  console.log('');

  validateSecrets();
  console.log('  ✓ Security secrets validated');

  console.log('  Initializing...');
  const dbConnected = await testConnection();

  if (!dbConnected) {
    console.error('');
    console.error('  ✗ Cannot start server without database connection.');
    console.error('  ✗ Please check your database configuration in .env');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log('');
    console.log(`  ✓ Server running on port ${PORT}`);
    console.log(`  ✓ API URL: ${process.env.API_URL || `http://localhost:${PORT}`}`);
    console.log('');
    console.log('  Ready to serve luxury experiences.');
    console.log('');
  });
}

process.on('unhandledRejection', (err) => {
  console.error('  ✗ Unhandled Rejection:', err.message);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('  ✗ Uncaught Exception:', err.message);
  process.exit(1);
});

startServer();
