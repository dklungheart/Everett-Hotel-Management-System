/**
 * Helper Utilities - Everett Hotel Management System
 * Common utility functions used across the application
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Generate a unique booking reference
 * @returns {string} Booking reference like BK-2026-000001
 */
function generateBookingReference() {
  const year = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `BK-${year}-${random}`;
}

/**
 * Generate a unique payment reference
 * @returns {string} Payment reference like PAY-2026-abcdef
 */
function generatePaymentReference() {
  const year = new Date().getFullYear();
  const random = uuidv4().split('-')[0].toUpperCase();
  return `PAY-${year}-${random}`;
}

/**
 * Generate a unique invoice number
 * @returns {string} Invoice number like INV-2026-000001
 */
function generateInvoiceNumber() {
  const year = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `INV-${year}-${random}`;
}

/**
 * Generate a unique order number
 * @returns {string} Order number like ORD-2026-000001
 */
function generateOrderNumber() {
  const year = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `ORD-${year}-${random}`;
}

/**
 * Generate a unique employee code
 * @param {number} id - Employee ID
 * @returns {string} Employee code like EMP-001
 */
function generateEmployeeCode(id) {
  return `EMP-${String(id).padStart(3, '0')}`;
}

/**
 * Generate a slug from text
 * @param {string} text - Input text
 * @returns {string} URL-friendly slug
 */
function generateSlug(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Calculate number of nights between two dates
 * @param {string|Date} checkIn - Check-in date
 * @param {string|Date} checkOut - Check-out date
 * @returns {number} Number of nights
 */
function calculateNights(checkIn, checkOut) {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diffTime = Math.abs(end - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculate booking total
 * @param {number} pricePerNight - Price per night
 * @param {number} nights - Number of nights
 * @param {number} taxRate - Tax rate percentage
 * @param {number} discountPercent - Discount percentage
 * @returns {Object} Price breakdown
 */
function calculateBookingTotal(pricePerNight, nights, taxRate = 12, discountPercent = 0) {
  const subtotal = pricePerNight * nights;
  const discountAmount = subtotal * (discountPercent / 100);
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = taxableAmount * (taxRate / 100);
  const totalAmount = taxableAmount + taxAmount;

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    discountAmount: parseFloat(discountAmount.toFixed(2)),
    taxAmount: parseFloat(taxAmount.toFixed(2)),
    totalAmount: parseFloat(totalAmount.toFixed(2)),
    nights,
  };
}

/**
 * Format currency
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount, currency = 'KES') {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Paginate results
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {Object} Pagination metadata
 */
function getPagination(page = 1, limit = 10) {
  const offset = (page - 1) * limit;
  return {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    offset,
  };
}

/**
 * Build pagination response
 * @param {number} total - Total records
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {Object} Pagination response
 */
function paginationResponse(total, page, limit) {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

/**
 * Sanitize string input
 * @param {string} str - Input string
 * @returns {string} Sanitized string
 */
function sanitize(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = {
  generateBookingReference,
  generatePaymentReference,
  generateInvoiceNumber,
  generateOrderNumber,
  generateEmployeeCode,
  generateSlug,
  calculateNights,
  calculateBookingTotal,
  formatCurrency,
  getPagination,
  paginationResponse,
  sanitize,
};
