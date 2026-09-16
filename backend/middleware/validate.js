/**
 * Validation Middleware - Everett Hotel Management System
 * Handles request validation using express-validator
 */

const { body, param, query, validationResult } = require('express-validator');

/**
 * Process validation results
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }
  next();
};

// ============================================================
// Auth Validators
// ============================================================

const registerValidation = [
  body('firstName').trim().notEmpty().withMessage('First name is required').isLength({ max: 100 }),
  body('lastName').trim().notEmpty().withMessage('Last name is required').isLength({ max: 100 }),
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 8, max: 72 }).withMessage('Password must be between 8 and 72 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain uppercase, lowercase, and number'),
  body('phone').optional().trim().isMobilePhone(),
  validate,
];

const loginValidation = [
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  validate,
];

const forgotPasswordValidation = [
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  validate,
];

const resetPasswordValidation = [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('password').isLength({ min: 8, max: 72 }).withMessage('Password must be between 8 and 72 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain uppercase, lowercase, and number'),
  validate,
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8, max: 72 }).withMessage('New password must be between 8 and 72 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('New password must contain uppercase, lowercase, and number'),
  validate,
];

// ============================================================
// Room Validators
// ============================================================

const roomValidation = [
  body('roomNumber').trim().notEmpty().withMessage('Room number is required').isLength({ max: 10 }),
  body('categoryId').isInt({ min: 1 }).withMessage('Valid category is required'),
  body('floor').isInt({ min: 0 }).withMessage('Floor must be a non-negative integer'),
  body('pricePerNight').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  validate,
];

const roomCategoryValidation = [
  body('name').trim().notEmpty().withMessage('Category name is required').isLength({ max: 100 }),
  body('slug').trim().notEmpty().withMessage('Slug is required').isLength({ max: 120 }),
  body('basePrice').isFloat({ min: 0 }).withMessage('Base price must be a positive number'),
  body('maxAdults').isInt({ min: 1 }).withMessage('Max adults must be at least 1'),
  validate,
];

// ============================================================
// Booking Validators
// ============================================================

const bookingValidation = [
  body('roomId').isInt({ min: 1 }).withMessage('Valid room is required'),
  body('checkIn').isISO8601().withMessage('Valid check-in date is required'),
  body('checkOut').isISO8601().withMessage('Valid check-out date is required'),
  body('adults').isInt({ min: 1, max: 20 }).withMessage('Adults must be between 1 and 20'),
  body('children').optional().isInt({ min: 0, max: 10 }),
  body('specialRequests').optional().trim().isLength({ max: 1000 }),
  validate,
];

// ============================================================
// Payment Validators
// ============================================================

const paymentValidation = [
  body('bookingId').isInt({ min: 1 }).withMessage('Valid booking is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('method').isIn(['mpesa', 'paypal', 'stripe', 'visa', 'mastercard', 'card', 'cash', 'bank_transfer'])
    .withMessage('Valid payment method is required'),
  validate,
];

// ============================================================
// Review Validators
// ============================================================

const reviewValidation = [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('title').optional().trim().isLength({ max: 255 }),
  body('comment').optional().trim().isLength({ max: 2000 }),
  body('roomId').optional().isInt({ min: 1 }),
  body('bookingId').optional().isInt({ min: 1 }),
  validate,
];

// ============================================================
// Contact Validators
// ============================================================

const contactValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 200 }),
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('subject').trim().notEmpty().withMessage('Subject is required').isLength({ max: 255 }),
  body('message').trim().notEmpty().withMessage('Message is required').isLength({ max: 5000 }),
  body('phone').optional().trim(),
  validate,
];

// ============================================================
// Employee Validators
// ============================================================

const employeeValidation = [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('department').optional({ values: 'falsy' }).trim(),
  body('position').optional({ values: 'falsy' }).trim(),
  body('hireDate').optional({ values: 'falsy' }).isISO8601().withMessage('Valid hire date is required'),
  body('salary').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('Salary must be a positive number'),
  validate,
];

// ============================================================
// Inventory Validators
// ============================================================

const inventoryValidation = [
  body('itemName').trim().notEmpty().withMessage('Item name is required'),
  body('category').isIn(['food', 'beverage', 'cleaning', 'linen', 'amenity', 'office', 'maintenance', 'other'])
    .withMessage('Valid category is required'),
  body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
  validate,
];

// ============================================================
// Promotion Validators
// ============================================================

const promotionValidation = [
  body('code').trim().notEmpty().withMessage('Promo code is required').isLength({ max: 50 }),
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('discountType').isIn(['percentage', 'fixed']).withMessage('Discount type must be percentage or fixed'),
  body('discountValue').isFloat({ min: 0.01 }).withMessage('Discount value must be positive'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').isISO8601().withMessage('Valid end date is required'),
  validate,
];

// ============================================================
// Generic Validators
// ============================================================

const idParamValidation = [
  param('id').isInt({ min: 1 }).withMessage('Valid ID is required'),
  validate,
];

const paginationValidation = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validate,
];

const galleryValidation = (req, res, next) => next();
const housekeepingValidation = (req, res, next) => next();
const newsletterValidation = (req, res, next) => next();
const supplierValidation = (req, res, next) => next();
const menuItemValidation = (req, res, next) => next();
const orderValidation = (req, res, next) => next();

module.exports = {
  validate,
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  changePasswordValidation,
  roomValidation,
  roomCategoryValidation,
  bookingValidation,
  paymentValidation,
  reviewValidation,
  contactValidation,
  employeeValidation,
  inventoryValidation,
  promotionValidation,
  idParamValidation,
  paginationValidation,
  galleryValidation,
  housekeepingValidation,
  newsletterValidation,
  supplierValidation,
  menuItemValidation,
  orderValidation,
};
