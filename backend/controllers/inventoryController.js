const { query, queryOne, insert, execute } = require('../config/database');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { getPagination, paginationResponse } = require('../utils/helpers');

const getAllItems = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, category = '', supplier = '', search = '' } = req.query;
  const { page: p, limit: l, offset } = getPagination(page, limit);

  let whereClause = 'WHERE 1=1';
  const params = [];

  if (category) {
    whereClause += ' AND i.category = ?';
    params.push(category);
  }

  if (supplier) {
    whereClause += ' AND i.supplier_id = ?';
    params.push(supplier);
  }

  if (search) {
    whereClause += ' AND i.item_name LIKE ?';
    params.push(`%${search}%`);
  }

  const countResult = await queryOne(
    `SELECT COUNT(*) AS total FROM inventory i
     LEFT JOIN suppliers s ON i.supplier_id = s.id
     ${whereClause}`,
    params
  );

  const items = await query(
    `SELECT i.*, s.name AS supplier_name
     FROM inventory i
     LEFT JOIN suppliers s ON i.supplier_id = s.id
     ${whereClause}
     ORDER BY i.item_name ASC
     LIMIT ? OFFSET ?`,
    [...params, l, offset]
  );

  res.status(200).json({
    success: true,
    data: {
      items,
      pagination: paginationResponse(countResult.total, p, l),
    },
  });
});

const getItemById = asyncHandler(async (req, res) => {
  const item = await queryOne(
    `SELECT i.*, s.name AS supplier_name
     FROM inventory i
     LEFT JOIN suppliers s ON i.supplier_id = s.id
     WHERE i.id = ?`,
    [req.params.id]
  );

  if (!item) {
    throw new ApiError('Inventory item not found', 404);
  }

  res.status(200).json({
    success: true,
    data: { item },
  });
});

const createItem = asyncHandler(async (req, res) => {
  const { itemName, category, supplierId, quantity, unit, unitCost, reorderLevel, location } = req.body;

  const itemId = await insert(
    `INSERT INTO inventory (item_name, category, supplier_id, quantity, unit, unit_cost, reorder_level, location)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      itemName,
      category || null,
      supplierId || null,
      quantity || 0,
      unit || 'piece',
      unitCost || 0,
      reorderLevel || 10,
      location || null,
    ]
  );

  const item = await queryOne(
    `SELECT i.*, s.name AS supplier_name
     FROM inventory i
     LEFT JOIN suppliers s ON i.supplier_id = s.id
     WHERE i.id = ?`,
    [itemId]
  );

  res.status(201).json({
    success: true,
    message: 'Inventory item created successfully',
    data: { item },
  });
});

const updateItem = asyncHandler(async (req, res) => {
  const existing = await queryOne('SELECT id FROM inventory WHERE id = ?', [req.params.id]);
  if (!existing) {
    throw new ApiError('Inventory item not found', 404);
  }

  const { itemName, category, supplierId, quantity, unit, unitCost, reorderLevel, location } = req.body;

  const fields = [];
  const values = [];

  if (itemName !== undefined) { fields.push('item_name = ?'); values.push(itemName); }
  if (category !== undefined) { fields.push('category = ?'); values.push(category); }
  if (supplierId !== undefined) { fields.push('supplier_id = ?'); values.push(supplierId); }
  if (quantity !== undefined) { fields.push('quantity = ?'); values.push(quantity); }
  if (unit !== undefined) { fields.push('unit = ?'); values.push(unit); }
  if (unitCost !== undefined) { fields.push('unit_cost = ?'); values.push(unitCost); }
  if (reorderLevel !== undefined) { fields.push('reorder_level = ?'); values.push(reorderLevel); }
  if (location !== undefined) { fields.push('location = ?'); values.push(location); }

  if (fields.length === 0) {
    throw new ApiError('No fields to update', 400);
  }

  values.push(req.params.id);
  await execute(`UPDATE inventory SET ${fields.join(', ')} WHERE id = ?`, values);

  const item = await queryOne(
    `SELECT i.*, s.name AS supplier_name
     FROM inventory i
     LEFT JOIN suppliers s ON i.supplier_id = s.id
     WHERE i.id = ?`,
    [req.params.id]
  );

  res.status(200).json({
    success: true,
    message: 'Inventory item updated successfully',
    data: { item },
  });
});

const deleteItem = asyncHandler(async (req, res) => {
  const item = await queryOne('SELECT id FROM inventory WHERE id = ?', [req.params.id]);
  if (!item) {
    throw new ApiError('Inventory item not found', 404);
  }

  await execute('DELETE FROM inventory WHERE id = ?', [req.params.id]);

  res.status(200).json({
    success: true,
    message: 'Inventory item deleted successfully',
  });
});

const getLowStock = asyncHandler(async (req, res) => {
  const items = await query(
    `SELECT i.*, s.name AS supplier_name,
            ROUND(i.quantity / NULLIF(i.reorder_level, 0) * 100, 2) AS stock_percentage
     FROM inventory i
     LEFT JOIN suppliers s ON i.supplier_id = s.id
     WHERE i.quantity <= i.reorder_level
     ORDER BY (i.quantity / NULLIF(i.reorder_level, 0)) ASC`
  );

  const summary = await queryOne(
    `SELECT
       COUNT(*) AS total_low_stock,
       SUM(CASE WHEN i.quantity = 0 THEN 1 ELSE 0 END) AS out_of_stock,
       SUM(CASE WHEN i.quantity > 0 AND i.quantity <= i.reorder_level THEN 1 ELSE 0 END) AS low_stock
     FROM inventory i
     WHERE i.quantity <= i.reorder_level`
  );

  res.status(200).json({
    success: true,
    data: {
      items,
      summary,
    },
  });
});

const getSuppliers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = '' } = req.query;
  const { page: p, limit: l, offset } = getPagination(page, limit);

  let whereClause = 'WHERE 1=1';
  const params = [];

  if (search) {
    whereClause += ' AND (s.name LIKE ? OR s.contact_person LIKE ? OR s.email LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  const countResult = await queryOne(
    `SELECT COUNT(*) AS total FROM suppliers s ${whereClause}`,
    params
  );

  const suppliers = await query(
    `SELECT s.*, COUNT(i.id) AS item_count
     FROM suppliers s
     LEFT JOIN inventory i ON s.id = i.supplier_id
     ${whereClause}
     GROUP BY s.id
     ORDER BY s.name ASC
     LIMIT ? OFFSET ?`,
    [...params, l, offset]
  );

  res.status(200).json({
    success: true,
    data: {
      suppliers,
      pagination: paginationResponse(countResult.total, p, l),
    },
  });
});

const createSupplier = asyncHandler(async (req, res) => {
  const { name, contactPerson, email, phone, address } = req.body;

  const supplierId = await insert(
    `INSERT INTO suppliers (name, contact_person, email, phone, address)
     VALUES (?, ?, ?, ?, ?)`,
    [
      name,
      contactPerson || null,
      email || null,
      phone || null,
      address || null,
    ]
  );

  const supplier = await queryOne(
    `SELECT s.*, COUNT(i.id) AS item_count
     FROM suppliers s
     LEFT JOIN inventory i ON s.id = i.supplier_id
     WHERE s.id = ?
     GROUP BY s.id`,
    [supplierId]
  );

  res.status(201).json({
    success: true,
    message: 'Supplier created successfully',
    data: { supplier },
  });
});

module.exports = {
  getAllItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  getLowStock,
  getSuppliers,
  createSupplier,
};
