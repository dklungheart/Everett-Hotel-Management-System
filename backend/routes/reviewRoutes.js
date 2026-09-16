const express = require('express');
const router = express.Router();
const {
  createReview,
  getMyReviews,
  getAllReviews,
  getAllReviewsAdmin,
  updateReviewStatus,
  toggleReviewFeature,
  respondToReview,
  deleteReview,
} = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/auth');
const { hasPermission } = require('../middleware/rbac');
const { reviewValidation } = require('../middleware/validate');
const { auditMiddleware } = require('../middleware/auditLog');

// Public: approved reviews + overall rating (for testimonials page/homepage)
router.get('/', getAllReviews);

// Authenticated client actions
router.post('/', protect, reviewValidation, auditMiddleware('create_review'), createReview);
router.get('/my', protect, getMyReviews);

// Admin management
router.get('/admin', protect, authorize('super_admin', 'admin', 'manager'), hasPermission('manage_reviews'), getAllReviewsAdmin);
router.put('/admin/:id/status', protect, authorize('super_admin', 'admin', 'manager'), hasPermission('manage_reviews'), auditMiddleware('update_review_status'), updateReviewStatus);
router.put('/admin/:id/feature', protect, authorize('super_admin', 'admin'), hasPermission('manage_reviews'), auditMiddleware('toggle_review_feature'), toggleReviewFeature);
router.put('/admin/:id/respond', protect, authorize('super_admin', 'admin', 'manager'), hasPermission('manage_reviews'), auditMiddleware('respond_to_review'), respondToReview);
router.delete('/admin/:id', protect, authorize('super_admin', 'admin', 'manager'), hasPermission('manage_reviews'), auditMiddleware('delete_review'), deleteReview);

module.exports = router;
