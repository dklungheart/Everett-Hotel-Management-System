const express = require('express');
const router = express.Router();
const {
  validatePromoCode,
  getAllPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
} = require('../controllers/promotionController');
const { protect, authorize } = require('../middleware/auth');
const { hasPermission } = require('../middleware/rbac');
const { promotionValidation } = require('../middleware/validate');
const { auditMiddleware } = require('../middleware/auditLog');

router.post('/validate', protect, auditMiddleware('validate_promotion'), validatePromoCode);

router.get('/admin/all', protect, authorize('super_admin', 'admin'), hasPermission('manage_promotions'), getAllPromotions);
router.post('/admin', protect, authorize('super_admin', 'admin'), hasPermission('manage_promotions'), promotionValidation, auditMiddleware('create_promotion'), createPromotion);
router.put('/admin/:id', protect, authorize('super_admin', 'admin'), hasPermission('manage_promotions'), promotionValidation, auditMiddleware('update_promotion'), updatePromotion);
router.delete('/admin/:id', protect, authorize('super_admin', 'admin'), hasPermission('manage_promotions'), auditMiddleware('delete_promotion'), deletePromotion);

module.exports = router;
