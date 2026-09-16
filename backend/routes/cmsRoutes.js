const express = require('express');
const router = express.Router();
const {
  getAllSections,
  getSectionByKey,
  createSection,
  updateSection,
  deleteSection,
  getPublicContent,
  getFaqs,
  createFaq,
  updateFaq,
  deleteFaq,
} = require('../controllers/cmsController');
const { protect, authorize } = require('../middleware/auth');
const { hasPermission } = require('../middleware/rbac');

router.get('/public', getPublicContent);
router.get('/faqs', getFaqs);

router.get('/admin/sections', protect, authorize('super_admin', 'admin'), hasPermission('manage_settings'), getAllSections);
router.get('/admin/sections/:key', protect, authorize('super_admin', 'admin'), hasPermission('manage_settings'), getSectionByKey);
router.post('/admin/sections', protect, authorize('super_admin', 'admin'), hasPermission('manage_settings'), createSection);
router.put('/admin/sections/:id', protect, authorize('super_admin', 'admin'), hasPermission('manage_settings'), updateSection);
router.delete('/admin/sections/:id', protect, authorize('super_admin', 'admin'), hasPermission('manage_settings'), deleteSection);

router.post('/admin/faqs', protect, authorize('super_admin', 'admin'), hasPermission('manage_settings'), createFaq);
router.put('/admin/faqs/:id', protect, authorize('super_admin', 'admin'), hasPermission('manage_settings'), updateFaq);
router.delete('/admin/faqs/:id', protect, authorize('super_admin', 'admin'), hasPermission('manage_settings'), deleteFaq);

module.exports = router;
