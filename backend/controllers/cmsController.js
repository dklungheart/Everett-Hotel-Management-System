const { query, queryOne, insert, execute } = require('../config/database');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

const getAllSections = asyncHandler(async (req, res) => {
  const { section = '' } = req.query;

  let sql = 'SELECT * FROM cms_content';
  const params = [];

  if (section) {
    sql += ' WHERE section_key = ?';
    params.push(section);
  }

  sql += ' ORDER BY sort_order ASC, id ASC';

  const sections = await query(sql, params);

  res.status(200).json({
    success: true,
    data: { sections },
  });
});

const getSectionByKey = asyncHandler(async (req, res) => {
  const section = await queryOne(
    'SELECT * FROM cms_content WHERE section_key = ?',
    [req.params.key]
  );

  if (!section) {
    throw new ApiError('Section not found', 404);
  }

  res.status(200).json({
    success: true,
    data: { section },
  });
});

const createSection = asyncHandler(async (req, res) => {
  const { sectionKey, sectionType, title, subtitle, content, imageUrl, buttonText, buttonUrl, meta, sortOrder } = req.body;

  if (!sectionKey || !sectionType) {
    throw new ApiError('Section key and section type are required', 400);
  }

  const existing = await queryOne('SELECT id FROM cms_content WHERE section_key = ?', [sectionKey]);
  if (existing) {
    throw new ApiError('Section key already exists', 400);
  }

  const sectionId = await insert(
    `INSERT INTO cms_content (section_key, section_type, title, subtitle, content, image_url, button_text, button_url, meta, sort_order, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [sectionKey, sectionType, title || null, subtitle || null, content || null, imageUrl || null, buttonText || null, buttonUrl || null, meta ? JSON.stringify(meta) : null, sortOrder || 0]
  );

  const section = await queryOne('SELECT * FROM cms_content WHERE id = ?', [sectionId]);

  res.status(201).json({
    success: true,
    message: 'Section created successfully',
    data: { section },
  });
});

const updateSection = asyncHandler(async (req, res) => {
  const existing = await queryOne('SELECT id FROM cms_content WHERE id = ?', [req.params.id]);
  if (!existing) {
    throw new ApiError('Section not found', 404);
  }

  const { title, subtitle, content, imageUrl, buttonText, buttonUrl, meta, sortOrder, isActive } = req.body;

  const fields = [];
  const values = [];

  if (title !== undefined) { fields.push('title = ?'); values.push(title); }
  if (subtitle !== undefined) { fields.push('subtitle = ?'); values.push(subtitle); }
  if (content !== undefined) { fields.push('content = ?'); values.push(content); }
  if (imageUrl !== undefined) { fields.push('image_url = ?'); values.push(imageUrl); }
  if (buttonText !== undefined) { fields.push('button_text = ?'); values.push(buttonText); }
  if (buttonUrl !== undefined) { fields.push('button_url = ?'); values.push(buttonUrl); }
  if (meta !== undefined) { fields.push('meta = ?'); values.push(JSON.stringify(meta)); }
  if (sortOrder !== undefined) { fields.push('sort_order = ?'); values.push(sortOrder); }
  if (isActive !== undefined) { fields.push('is_active = ?'); values.push(isActive ? 1 : 0); }

  if (fields.length === 0) {
    throw new ApiError('No fields to update', 400);
  }

  fields.push('updated_at = NOW()');
  values.push(req.params.id);

  await execute(`UPDATE cms_content SET ${fields.join(', ')} WHERE id = ?`, values);

  const section = await queryOne('SELECT * FROM cms_content WHERE id = ?', [req.params.id]);

  res.status(200).json({
    success: true,
    message: 'Section updated successfully',
    data: { section },
  });
});

const deleteSection = asyncHandler(async (req, res) => {
  const existing = await queryOne('SELECT id FROM cms_content WHERE id = ?', [req.params.id]);
  if (!existing) {
    throw new ApiError('Section not found', 404);
  }

  await execute('DELETE FROM cms_content WHERE id = ?', [req.params.id]);

  res.status(200).json({
    success: true,
    message: 'Section deleted successfully',
  });
});

const getPublicContent = asyncHandler(async (req, res) => {
  const sections = await query(
    "SELECT section_key, section_type, title, subtitle, content, image_url, button_text, button_url, meta FROM cms_content WHERE is_active = 1 ORDER BY sort_order ASC"
  );

  const contentMap = {};
  sections.forEach(s => { contentMap[s.section_key] = s; });

  res.status(200).json({
    success: true,
    data: { content: contentMap },
  });
});

const getFaqs = asyncHandler(async (req, res) => {
  const faqs = await query(
    "SELECT * FROM cms_faqs WHERE is_active = 1 ORDER BY sort_order ASC, id ASC"
  );

  res.status(200).json({
    success: true,
    data: { faqs },
  });
});

const createFaq = asyncHandler(async (req, res) => {
  const { question, answer, category, sortOrder } = req.body;

  if (!question || !answer) {
    throw new ApiError('Question and answer are required', 400);
  }

  const faqId = await insert(
    `INSERT INTO cms_faqs (question, answer, category, sort_order, is_active)
     VALUES (?, ?, ?, ?, 1)`,
    [question, answer, category || null, sortOrder || 0]
  );

  const faq = await queryOne('SELECT * FROM cms_faqs WHERE id = ?', [faqId]);

  res.status(201).json({
    success: true,
    message: 'FAQ created successfully',
    data: { faq },
  });
});

const updateFaq = asyncHandler(async (req, res) => {
  const existing = await queryOne('SELECT id FROM cms_faqs WHERE id = ?', [req.params.id]);
  if (!existing) {
    throw new ApiError('FAQ not found', 404);
  }

  const { question, answer, category, sortOrder, isActive } = req.body;

  const fields = [];
  const values = [];

  if (question !== undefined) { fields.push('question = ?'); values.push(question); }
  if (answer !== undefined) { fields.push('answer = ?'); values.push(answer); }
  if (category !== undefined) { fields.push('category = ?'); values.push(category); }
  if (sortOrder !== undefined) { fields.push('sort_order = ?'); values.push(sortOrder); }
  if (isActive !== undefined) { fields.push('is_active = ?'); values.push(isActive ? 1 : 0); }

  if (fields.length === 0) {
    throw new ApiError('No fields to update', 400);
  }

  fields.push('updated_at = NOW()');
  values.push(req.params.id);

  await execute(`UPDATE cms_faqs SET ${fields.join(', ')} WHERE id = ?`, values);

  const faq = await queryOne('SELECT * FROM cms_faqs WHERE id = ?', [req.params.id]);

  res.status(200).json({
    success: true,
    message: 'FAQ updated successfully',
    data: { faq },
  });
});

const deleteFaq = asyncHandler(async (req, res) => {
  const existing = await queryOne('SELECT id FROM cms_faqs WHERE id = ?', [req.params.id]);
  if (!existing) {
    throw new ApiError('FAQ not found', 404);
  }

  await execute('DELETE FROM cms_faqs WHERE id = ?', [req.params.id]);

  res.status(200).json({
    success: true,
    message: 'FAQ deleted successfully',
  });
});

module.exports = {
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
};
