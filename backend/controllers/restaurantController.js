const { query, queryOne, insert, execute, transaction } = require('../config/database');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { getPagination, paginationResponse, generateOrderNumber } = require('../utils/helpers');
const path = require('path');
const fs = require('fs');

function uploadedFilePath(req) {
  const file = req.file || (req.files && req.files[0]) || null;
  return file && file.filename ? `/uploads/${file.filename}` : null;
}

function removeUploadFile(url) {
  if (!url || url.indexOf('/uploads/') !== 0) return;
  const filePath = path.join(__dirname, '..', url.replace('/uploads/', 'uploads/'));
  try { fs.unlinkSync(filePath); } catch (e) { /* ignore missing file */ }
}

const getMenuItems = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, category = '', availability = '', search = '' } = req.query;
  const { page: p, limit: l, offset } = getPagination(page, limit);

  let whereClause = 'WHERE 1=1';
  const params = [];

  if (category) {
    whereClause += ' AND category = ?';
    params.push(category);
  }

  if (availability === 'available') {
    whereClause += ' AND is_available = 1';
  } else if (availability === 'unavailable') {
    whereClause += ' AND is_available = 0';
  }

  if (search) {
    whereClause += ' AND (name LIKE ? OR description LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s);
  }

  const countResult = await queryOne(
    `SELECT COUNT(*) AS total FROM restaurant_menu ${whereClause}`,
    params
  );

  const items = await query(
    `SELECT * FROM restaurant_menu
     ${whereClause}
     ORDER BY category ASC, name ASC
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

const getMenuItemById = asyncHandler(async (req, res) => {
  const item = await queryOne(
    'SELECT * FROM restaurant_menu WHERE id = ?',
    [req.params.id]
  );

  if (!item) {
    throw new ApiError('Menu item not found', 404);
  }

  res.status(200).json({
    success: true,
    data: { item },
  });
});

const createMenuItem = asyncHandler(async (req, res) => {
  const { name, category, description, price, isVegetarian, isVegan, isGlutenFree, preparationTime, isAvailable } = req.body;

  const existing = await queryOne('SELECT id FROM restaurant_menu WHERE name = ?', [name]);
  if (existing) {
    throw new ApiError('Menu item with this name already exists', 400);
  }

  const itemId = await insert(
    `INSERT INTO restaurant_menu (name, category, description, price, image,
      is_vegetarian, is_vegan, is_gluten_free, preparation_time, is_available)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      category || null,
      description || null,
      price,
      uploadedFilePath(req),
      isVegetarian !== undefined ? (isVegetarian ? 1 : 0) : 0,
      isVegan !== undefined ? (isVegan ? 1 : 0) : 0,
      isGlutenFree !== undefined ? (isGlutenFree ? 1 : 0) : 0,
      preparationTime || null,
      isAvailable !== undefined ? (isAvailable ? 1 : 0) : 1,
    ]
  );

  const item = await queryOne('SELECT * FROM restaurant_menu WHERE id = ?', [itemId]);

  res.status(201).json({
    success: true,
    message: 'Menu item created successfully',
    data: { item },
  });
});

const updateMenuItem = asyncHandler(async (req, res) => {
  const existing = await queryOne('SELECT image FROM restaurant_menu WHERE id = ?', [req.params.id]);
  if (!existing) {
    throw new ApiError('Menu item not found', 404);
  }

  const { name, category, description, price, isVegetarian, isVegan, isGlutenFree, preparationTime, isAvailable } = req.body;

  const fields = [];
  const values = [];
  let newImage = null;

  if (name !== undefined) { fields.push('name = ?'); values.push(name); }
  if (category !== undefined) { fields.push('category = ?'); values.push(category); }
  if (description !== undefined) { fields.push('description = ?'); values.push(description); }
  if (price !== undefined) { fields.push('price = ?'); values.push(price); }
  if (isVegetarian !== undefined) { fields.push('is_vegetarian = ?'); values.push(isVegetarian ? 1 : 0); }
  if (isVegan !== undefined) { fields.push('is_vegan = ?'); values.push(isVegan ? 1 : 0); }
  if (isGlutenFree !== undefined) { fields.push('is_gluten_free = ?'); values.push(isGlutenFree ? 1 : 0); }
  if (preparationTime !== undefined) { fields.push('preparation_time = ?'); values.push(preparationTime); }
  if (isAvailable !== undefined) { fields.push('is_available = ?'); values.push(isAvailable ? 1 : 0); }
  newImage = uploadedFilePath(req);
  if (newImage) { fields.push('image = ?'); values.push(newImage); }

  if (fields.length === 0) {
    throw new ApiError('No fields to update', 400);
  }

  values.push(req.params.id);
  await execute(`UPDATE restaurant_menu SET ${fields.join(', ')} WHERE id = ?`, values);
  if (newImage) {
    removeUploadFile(existing.image);
  }

  const item = await queryOne('SELECT * FROM restaurant_menu WHERE id = ?', [req.params.id]);

  res.status(200).json({
    success: true,
    message: 'Menu item updated successfully',
    data: { item },
  });
});

const deleteMenuItem = asyncHandler(async (req, res) => {
  const item = await queryOne('SELECT id, image FROM restaurant_menu WHERE id = ?', [req.params.id]);
  if (!item) {
    throw new ApiError('Menu item not found', 404);
  }

  const orderItems = await queryOne(
    "SELECT COUNT(*) AS total FROM restaurant_order_items WHERE menu_item_id = ?",
    [req.params.id]
  );

  if (orderItems.total > 0) {
    await execute('UPDATE restaurant_menu SET is_available = 0 WHERE id = ?', [req.params.id]);
    return res.status(200).json({
      success: true,
      message: 'Menu item deactivated (has existing orders)',
    });
  }

  await execute('DELETE FROM restaurant_menu WHERE id = ?', [req.params.id]);
  removeUploadFile(item.image);

  res.status(200).json({
    success: true,
    message: 'Menu item deleted successfully',
  });
});

const createOrder = asyncHandler(async (req, res) => {
  const { items, orderType, tableNumber, notes } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new ApiError('At least one item is required', 400);
  }

  for (const item of items) {
    if (!item.menuItemId || !item.quantity || item.quantity < 1) {
      throw new ApiError('Each item must have a valid menuItemId and quantity', 400);
    }
  }

  const orderNumber = generateOrderNumber();
  let totalAmount = 0;

  const order = await transaction(async (connection) => {
    for (const item of items) {
      const [menuRows] = await connection.execute(
        'SELECT id, price FROM restaurant_menu WHERE id = ? AND is_available = 1',
        [item.menuItemId]
      );
      if (menuRows.length === 0) {
        throw new ApiError(`Menu item ${item.menuItemId} is not available`, 400);
      }
      totalAmount += menuRows[0].price * item.quantity;
    }

    totalAmount = parseFloat(totalAmount.toFixed(2));

    const [orderResult] = await connection.execute(
      `INSERT INTO restaurant_orders (order_number, user_id, order_type,
        table_number, total_amount, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [
        orderNumber,
        req.user.id,
        orderType || 'dine_in',
        tableNumber || null,
        totalAmount,
        notes || null,
      ]
    );

    const orderId = orderResult.insertId;

    for (const item of items) {
      const [menuRows] = await connection.execute(
        'SELECT price FROM restaurant_menu WHERE id = ?',
        [item.menuItemId]
      );
      const unitPrice = menuRows[0].price;

      await connection.execute(
        `INSERT INTO restaurant_order_items (order_id, menu_item_id, quantity, unit_price, subtotal, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          item.menuItemId,
          item.quantity,
          unitPrice,
          unitPrice * item.quantity,
          item.notes || null,
        ]
      );
    }

    return queryOne(
      `SELECT ro.*, u.first_name, u.last_name, u.email
       FROM restaurant_orders ro
       JOIN users u ON ro.user_id = u.id
       WHERE ro.id = ?`,
      [orderId]
    );
  });

  order.items = await query(
    `SELECT roi.*, mi.name AS item_name, mi.price AS item_price
     FROM restaurant_order_items roi
     JOIN restaurant_menu mi ON roi.menu_item_id = mi.id
     WHERE roi.order_id = ?`,
    [order.id]
  );

  res.status(201).json({
    success: true,
    message: 'Order placed successfully',
    data: { order },
  });
});

const getMyOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status = '' } = req.query;
  const { page: p, limit: l, offset } = getPagination(page, limit);

  let whereClause = 'WHERE ro.user_id = ?';
  const params = [req.user.id];

  if (status) {
    whereClause += ' AND ro.status = ?';
    params.push(status);
  }

  const countResult = await queryOne(
    `SELECT COUNT(*) AS total FROM restaurant_orders ro ${whereClause}`,
    params
  );

  const orders = await query(
    `SELECT ro.*
     FROM restaurant_orders ro
     ${whereClause}
     ORDER BY ro.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, l, offset]
  );

  res.status(200).json({
    success: true,
    data: {
      orders,
      pagination: paginationResponse(countResult.total, p, l),
    },
  });
});

const getAllOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status = '', orderType = '', search = '' } = req.query;
  const { page: p, limit: l, offset } = getPagination(page, limit);

  let whereClause = 'WHERE 1=1';
  const params = [];

  if (status) {
    whereClause += ' AND ro.status = ?';
    params.push(status);
  }

  if (orderType) {
    whereClause += ' AND ro.order_type = ?';
    params.push(orderType);
  }

  if (search) {
    whereClause += ' AND (ro.order_number LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  const countResult = await queryOne(
    `SELECT COUNT(*) AS total FROM restaurant_orders ro
     JOIN users u ON ro.user_id = u.id
     ${whereClause}`,
    params
  );

  const orders = await query(
    `SELECT ro.*, u.first_name, u.last_name, u.email
     FROM restaurant_orders ro
     JOIN users u ON ro.user_id = u.id
     ${whereClause}
     ORDER BY ro.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, l, offset]
  );

  res.status(200).json({
    success: true,
    data: {
      orders,
      pagination: paginationResponse(countResult.total, p, l),
    },
  });
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'completed', 'cancelled'];

  if (!validStatuses.includes(status)) {
    throw new ApiError('Invalid order status', 400);
  }

  const existing = await queryOne('SELECT id FROM restaurant_orders WHERE id = ?', [req.params.id]);
  if (!existing) {
    throw new ApiError('Order not found', 404);
  }

  await execute('UPDATE restaurant_orders SET status = ? WHERE id = ?', [status, req.params.id]);

  const order = await queryOne(
    `SELECT ro.*, u.first_name, u.last_name, u.email
     FROM restaurant_orders ro
     JOIN users u ON ro.user_id = u.id
     WHERE ro.id = ?`,
    [req.params.id]
  );

  order.items = await query(
    `SELECT roi.*, mi.name AS item_name, mi.price AS item_price
     FROM restaurant_order_items roi
     JOIN restaurant_menu mi ON roi.menu_item_id = mi.id
     WHERE roi.order_id = ?`,
    [req.params.id]
  );

  res.status(200).json({
    success: true,
    message: 'Order status updated successfully',
    data: { order },
  });
});

const getOrderStats = asyncHandler(async (req, res) => {
  const total = await queryOne('SELECT COUNT(*) AS total FROM restaurant_orders');
  const byStatus = await query(
    'SELECT status, COUNT(*) AS count FROM restaurant_orders GROUP BY status'
  );
  const todayRevenue = await queryOne(
    "SELECT COALESCE(SUM(total_amount), 0) AS total FROM restaurant_orders WHERE status IN ('delivered', 'completed') AND DATE(created_at) = CURDATE()"
  );
  const totalRevenue = await queryOne(
    "SELECT COALESCE(SUM(total_amount), 0) AS total FROM restaurant_orders WHERE status IN ('delivered', 'completed')"
  );
  const popularItems = await query(
    `SELECT mi.id, mi.name, COUNT(roi.id) AS order_count, SUM(roi.quantity) AS total_quantity
     FROM restaurant_menu mi
     JOIN restaurant_order_items roi ON mi.id = roi.menu_item_id
     JOIN restaurant_orders ro ON roi.order_id = ro.id
     WHERE ro.status IN ('delivered', 'completed')
     GROUP BY mi.id
     ORDER BY total_quantity DESC
     LIMIT 10`
  );

  res.status(200).json({
    success: true,
    data: {
      total: total.total,
      byStatus,
      todayRevenue: todayRevenue.total,
      totalRevenue: totalRevenue.total,
      popularItems,
    },
  });
});

module.exports = {
  getMenuItems,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  createOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
  getOrderStats,
};
