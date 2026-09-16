/**
 * Restaurant Model - Everett Hotel Management System
 * Handles all database operations for restaurant menu, orders, and order items
 */

const { query, queryOne, insert, execute, transaction } = require('../config/database');
const { generateOrderNumber } = require('../utils/helpers');

class Restaurant {
  // ─── MENU ITEMS ───────────────────────────────────────────

  /**
   * Find menu item by ID
   */
  static async findMenuItemById(id) {
    return queryOne(
      `SELECT mi.*, mc.name AS category_name
       FROM restaurant_menu mi
       LEFT JOIN restaurant_menu_categories mc ON mi.category_id = mc.id
       WHERE mi.id = ?`,
      [id]
    );
  }

  /**
   * Get all menu items with filters
   */
  static async findAllMenuItems({ page = 1, limit = 10, category = '', availability = '', search = '' } = {}) {
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (category) {
      whereClause += ' AND mc.slug = ?';
      params.push(category);
    }

    if (availability === 'available') {
      whereClause += ' AND mi.is_available = 1';
    } else if (availability === 'unavailable') {
      whereClause += ' AND mi.is_available = 0';
    }

    if (search) {
      whereClause += ' AND (mi.name LIKE ? OR mi.description LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s);
    }

    const countResult = await queryOne(
      `SELECT COUNT(*) AS total FROM restaurant_menu mi
       LEFT JOIN restaurant_menu_categories mc ON mi.category_id = mc.id
       ${whereClause}`,
      params
    );

    const offset = (page - 1) * limit;
    const items = await query(
      `SELECT mi.*, mc.name AS category_name
       FROM restaurant_menu mi
       LEFT JOIN restaurant_menu_categories mc ON mi.category_id = mc.id
       ${whereClause}
       ORDER BY mc.sort_order ASC, mi.name ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { items, total: countResult.total };
  }

  /**
   * Get available menu items
   */
  static async findAvailableMenuItems(category = '') {
    let whereClause = 'WHERE mi.is_available = 1';
    const params = [];

    if (category) {
      whereClause += ' AND mc.slug = ?';
      params.push(category);
    }

    return query(
      `SELECT mi.*, mc.name AS category_name
       FROM restaurant_menu mi
       LEFT JOIN restaurant_menu_categories mc ON mi.category_id = mc.id
       ${whereClause}
       ORDER BY mc.sort_order ASC, mi.name ASC`,
      params
    );
  }

  /**
   * Create a menu item
   */
  static async createMenuItem(itemData) {
    const id = await insert(
      `INSERT INTO restaurant_menu (category_id, name, description, price, image,
        preparation_time, is_available, is_featured)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        itemData.categoryId || null,
        itemData.name,
        itemData.description || null,
        itemData.price,
        itemData.image || null,
        itemData.preparationTime || null,
        itemData.isAvailable !== undefined ? (itemData.isAvailable ? 1 : 0) : 1,
        itemData.isFeatured !== undefined ? (itemData.isFeatured ? 1 : 0) : 0,
      ]
    );

    return this.findMenuItemById(id);
  }

  /**
   * Update a menu item
   */
  static async updateMenuItem(id, itemData) {
    const fields = [];
    const values = [];

    const allowedFields = [
      'category_id', 'name', 'description', 'price', 'image',
      'preparation_time', 'is_available', 'is_featured',
    ];

    for (const field of allowedFields) {
      const camelField = field.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      if (itemData[camelField] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(itemData[camelField]);
      }
    }

    if (fields.length === 0) return this.findMenuItemById(id);

    values.push(id);
    await execute(
      `UPDATE restaurant_menu SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.findMenuItemById(id);
  }

  /**
   * Delete menu item
   */
  static async deleteMenuItem(id) {
    return execute('DELETE FROM restaurant_menu WHERE id = ?', [id]);
  }

  // ─── ORDERS ───────────────────────────────────────────────

  /**
   * Find order by ID with items
   */
  static async findOrderById(id) {
    const order = await queryOne(
      `SELECT ro.*, u.first_name, u.last_name, u.email, u.phone,
              g.room_number
       FROM restaurant_orders ro
       JOIN users u ON ro.user_id = u.id
       LEFT JOIN guests g ON ro.guest_id = g.id
       WHERE ro.id = ?`,
      [id]
    );

    if (order) {
      order.items = await query(
        `SELECT roi.*, mi.name AS item_name, mi.price AS item_price
         FROM restaurant_order_items roi
         JOIN restaurant_menu mi ON roi.menu_item_id = mi.id
         WHERE roi.order_id = ?`,
        [id]
      );
    }

    return order;
  }

  /**
   * Find order by order number
   */
  static async findOrderByNumber(orderNumber) {
    return this.findOrderById(
      (await queryOne('SELECT id FROM restaurant_orders WHERE order_number = ?', [orderNumber]))?.id
    );
  }

  /**
   * Get all orders with filters
   */
  static async findAllOrders({ page = 1, limit = 10, status = '', orderType = '', userId = '', search = '' } = {}) {
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

    if (userId) {
      whereClause += ' AND ro.user_id = ?';
      params.push(userId);
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

    const offset = (page - 1) * limit;
    const orders = await query(
      `SELECT ro.*, u.first_name, u.last_name, u.email
       FROM restaurant_orders ro
       JOIN users u ON ro.user_id = u.id
       ${whereClause}
       ORDER BY ro.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { orders, total: countResult.total };
  }

  /**
   * Get orders by user
   */
  static async findOrdersByUser(userId, { page = 1, limit = 10, status = '' } = {}) {
    let whereClause = 'WHERE ro.user_id = ?';
    const params = [userId];

    if (status) {
      whereClause += ' AND ro.status = ?';
      params.push(status);
    }

    const countResult = await queryOne(
      `SELECT COUNT(*) AS total FROM restaurant_orders ro ${whereClause}`,
      params
    );

    const offset = (page - 1) * limit;
    const orders = await query(
      `SELECT ro.*
       FROM restaurant_orders ro
       ${whereClause}
       ORDER BY ro.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { orders, total: countResult.total };
  }

  /**
   * Create an order with items
   */
  static async createOrder(orderData) {
    return transaction(async (connection) => {
      const orderNumber = generateOrderNumber();
      let subtotal = 0;

      // Calculate subtotal from items
      for (const item of orderData.items) {
        const [menuRows] = await connection.execute(
          'SELECT price FROM restaurant_menu WHERE id = ?',
          [item.menuItemId]
        );
        if (menuRows.length > 0) {
          subtotal += menuRows[0].price * item.quantity;
        }
      }

      const taxAmount = parseFloat((subtotal * 0.12).toFixed(2));
      const totalAmount = parseFloat((subtotal + taxAmount).toFixed(2));

      const [orderResult] = await connection.execute(
        `INSERT INTO restaurant_orders (order_number, user_id, guest_id, order_type,
          table_number, delivery_room, subtotal, tax_amount, total_amount, notes, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
          orderNumber,
          orderData.userId,
          orderData.guestId || null,
          orderData.orderType || 'dine_in',
          orderData.tableNumber || null,
          orderData.deliveryRoom || null,
          subtotal,
          taxAmount,
          totalAmount,
          orderData.notes || null,
        ]
      );

      const orderId = orderResult.insertId;

      // Insert order items
      for (const item of orderData.items) {
        const [menuRows] = await connection.execute(
          'SELECT price FROM restaurant_menu WHERE id = ?',
          [item.menuItemId]
        );
        const unitPrice = menuRows.length > 0 ? menuRows[0].price : 0;

        await connection.execute(
          `INSERT INTO restaurant_order_items (order_id, menu_item_id, quantity, unit_price, subtotal, special_instructions)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            orderId,
            item.menuItemId,
            item.quantity,
            unitPrice,
            unitPrice * item.quantity,
            item.specialInstructions || null,
          ]
        );
      }

      return this.findOrderById(orderId);
    });
  }

  /**
   * Update order status
   */
  static async updateOrderStatus(id, status) {
    const updates = ['status = ?'];
    const values = [status];

    if (status === 'delivered' || status === 'completed') {
      updates.push('completed_at = NOW()');
    }

    values.push(id);
    await execute(
      `UPDATE restaurant_orders SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return this.findOrderById(id);
  }

  /**
   * Delete order
   */
  static async deleteOrder(id) {
    return execute('DELETE FROM restaurant_orders WHERE id = ?', [id]);
  }

  /**
   * Get restaurant statistics
   */
  static async getOrderStats() {
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

    return {
      total: total.total,
      byStatus,
      todayRevenue: todayRevenue.total,
      totalRevenue: totalRevenue.total,
    };
  }

  /**
   * Get menu statistics
   */
  static async getMenuStats() {
    const totalItems = await queryOne('SELECT COUNT(*) AS total FROM restaurant_menu');
    const availableItems = await queryOne(
      'SELECT COUNT(*) AS total FROM restaurant_menu WHERE is_available = 1'
    );
    const featuredItems = await queryOne(
      'SELECT COUNT(*) AS total FROM restaurant_menu WHERE is_featured = 1'
    );
    const popularItems = await query(
      `SELECT mi.id, mi.name, COUNT(roi.id) AS order_count
       FROM restaurant_menu mi
       JOIN restaurant_order_items roi ON mi.id = roi.menu_item_id
       GROUP BY mi.id
       ORDER BY order_count DESC
       LIMIT 10`
    );

    return {
      totalItems: totalItems.total,
      availableItems: availableItems.total,
      featuredItems: featuredItems.total,
      popularItems,
    };
  }
}

module.exports = Restaurant;
