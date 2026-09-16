const { query, queryOne, insert, execute } = require('../config/database');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { getPagination, paginationResponse } = require('../utils/helpers');

const getAllImages = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, category = '', search = '' } = req.query;
  const { page: p, limit: l, offset } = getPagination(page, limit);

  let whereClause = 'WHERE is_active = 1';
  const params = [];

  if (category) {
    whereClause += ' AND category = ?';
    params.push(category);
  }

  if (search) {
    whereClause += ' AND (title LIKE ? OR description LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s);
  }

  const countResult = await queryOne(
    `SELECT COUNT(*) AS total FROM gallery ${whereClause}`,
    params
  );

  const images = await query(
    `SELECT * FROM gallery
     ${whereClause}
     ORDER BY sort_order ASC, id DESC
     LIMIT ? OFFSET ?`,
    [...params, l, offset]
  );

  res.status(200).json({
    success: true,
    data: {
      images,
      pagination: paginationResponse(countResult.total, p, l),
    },
  });
});

const getImageById = asyncHandler(async (req, res) => {
  const image = await queryOne(
    'SELECT * FROM gallery WHERE id = ?',
    [req.params.id]
  );

  if (!image) {
    throw new ApiError('Image not found', 404);
  }

  res.status(200).json({
    success: true,
    data: { image },
  });
});

const uploadImage = asyncHandler(async (req, res) => {
  const files = req.files || (req.file ? [req.file] : []);
  if (files.length === 0) {
    throw new ApiError('Image file is required', 400);
  }

  const { title, description, category, sortOrder } = req.body;
  const uploaded = [];

  for (const file of files) {
    const imageUrl = `/uploads/${file.filename}`;

    const imageId = await insert(
      `INSERT INTO gallery (title, description, image_url, category, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [
        title || file.originalname,
        description || null,
        imageUrl,
        category || null,
        sortOrder || 0,
      ]
    );

    uploaded.push(await queryOne('SELECT * FROM gallery WHERE id = ?', [imageId]));
  }

  res.status(201).json({
    success: true,
    message: `${uploaded.length} image(s) uploaded successfully`,
    data: { images: uploaded },
  });
});

const updateImage = asyncHandler(async (req, res) => {
  const existing = await queryOne('SELECT id, image_url FROM gallery WHERE id = ?', [req.params.id]);
  if (!existing) {
    throw new ApiError('Image not found', 404);
  }

  const { title, description, category, sortOrder, isActive } = req.body;
  const files = req.files || (req.file ? [req.file] : []);

  const fields = [];
  const values = [];

  if (title !== undefined) { fields.push('title = ?'); values.push(title); }
  if (description !== undefined) { fields.push('description = ?'); values.push(description); }
  if (category !== undefined) { fields.push('category = ?'); values.push(category); }
  if (sortOrder !== undefined) { fields.push('sort_order = ?'); values.push(sortOrder); }
  if (isActive !== undefined) { fields.push('is_active = ?'); values.push(isActive ? 1 : 0); }
  if (files.length > 0) {
    const imageUrl = `/uploads/${files[0].filename}`;
    fields.push('image_url = ?');
    values.push(imageUrl);
  }

  if (fields.length === 0) {
    throw new ApiError('No fields to update', 400);
  }

  values.push(req.params.id);
  await execute(`UPDATE gallery SET ${fields.join(', ')} WHERE id = ?`, values);

  const image = await queryOne('SELECT * FROM gallery WHERE id = ?', [req.params.id]);

  res.status(200).json({
    success: true,
    message: 'Image updated successfully',
    data: { image },
  });
});

const deleteImage = asyncHandler(async (req, res) => {
  const image = await queryOne('SELECT id FROM gallery WHERE id = ?', [req.params.id]);
  if (!image) {
    throw new ApiError('Image not found', 404);
  }

  await execute('UPDATE gallery SET is_active = 0 WHERE id = ?', [req.params.id]);

  res.status(200).json({
    success: true,
    message: 'Image deleted successfully',
  });
});

module.exports = {
  getAllImages,
  getImageById,
  uploadImage,
  updateImage,
  deleteImage,
};
