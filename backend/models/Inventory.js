/**
 * Inventory Model - Everett Hotel Management System
 * Handles all database operations for inventory and suppliers
 */

const { query, queryOne, insert, execute, transaction } = require('../config/database');

class Inventory {
  // ─── INVENTORY ITEMS ──────────────────────────────────────

  /**
   * Find inventory item by ID
   */
  static async findById(id) {
    return queryOne(
      `SELECT i.*, s.name AS supplier_name, c.name AS category_name
       FROM inventory i
       LEFT JOIN suppliers s ON i.supplier_id = s.id
       LEFT JOIN inventory_categories c ON i.category_id = c.id
       WHERE i.id = ?`,
      [id]
    );
  }

  /**
   * Find inventory item by SKU
   */
  static async findBySku(sku) {
    return queryOne(
      `SELECT i.*, s.name AS supplier_name, c.name AS category_name
       FROM inventory i
       LEFT JOIN suppliers s ON i.supplier_id = s.id
       LEFT JOIN inventory_categories c ON i.category_id = c.id
       WHERE i.sku = ?`,
      [sku]
    );
  }

  /**
   * Get all inventory items with filters
   */
  static async findAll({ page = 1, limit = 10, category = '', status = '', supplier = '', search = '' } = {}) {
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (category) {
      whereClause += ' AND c.slug = ?';
      params.push(category);
    }

    if (status === 'in_stock') {
      whereClause += ' AND i.quantity > i.reorder_level';
    } else if (status === 'low_stock') {
      whereClause += ' AND i.quantity <= i.reorder_level AND i.quantity > 0';
    } else if (status === 'out_of_stock') {
      whereClause += ' AND i.quantity = 0';
    }

    if (supplier) {
      whereClause += ' AND s.slug = ?';
      params.push(supplier);
    }

    if (search) {
      whereClause += ' AND (i.name LIKE ? OR i.sku LIKE ? OR i.description LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    const countResult = await queryOne(
      `SELECT COUNT(*) AS total FROM inventory i
       LEFT JOIN suppliers s ON i.supplier_id = s.id
       LEFT JOIN inventory_categories c ON i.category_id = c.id
       ${whereClause}`,
      params
    );

    const offset = (page - 1) * limit;
    const items = await query(
      `SELECT i.*, s.name AS supplier_name, c.name AS category_name
       FROM inventory i
       LEFT JOIN suppliers s ON i.supplier_id = s.id
       LEFT JOIN inventory_categories c ON i.category_id = c.id
       ${whereClause}
       ORDER BY i.name ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { items, total: countResult.total };
  }

  /**
   * Get low stock items
   */
  static async findLowStock() {
    return query(
      `SELECT i.*, s.name AS supplier_name, c.name AS category_name
       FROM inventory i
       LEFT JOIN suppliers s ON i.supplier_id = s.id
       LEFT JOIN inventory_categories c ON i.category_id = c.id
       WHERE i.quantity <= i.reorder_level
       ORDER BY (i.quantity / i.reorder_level) ASC`
    );
  }

  /**
   * Create an inventory item
   */
  static async create(itemData) {
    const id = await insert(
      `INSERT INTO inventory (name, sku, description, category_id, supplier_id,
        quantity, unit, unit_cost, reorder_level, location, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        itemData.name,
        itemData.sku || null,
        itemData.description || null,
        itemData.categoryId || null,
        itemData.supplierId || null,
        itemData.quantity || 0,
        itemData.unit || 'piece',
        itemData.unitCost || 0,
        itemData.reorderLevel || 10,
        itemData.location || null,
        itemData.isActive !== undefined ? (itemData.isActive ? 1 : 0) : 1,
      ]
    );

    return this.findById(id);
  }

  /**
   * Update an inventory item
   */
  static async update(id, itemData) {
    const fields = [];
    const values = [];

    const allowedFields = [
      'name', 'sku', 'description', 'category_id', 'supplier_id',
      'quantity', 'unit', 'unit_cost', 'reorder_level', 'location', 'is_active',
    ];

    for (const field of allowedFields) {
      const camelField = field.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      if (itemData[camelField] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(itemData[camelField]);
      }
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    await execute(
      `UPDATE inventory SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  /**
   * Update inventory quantity (stock adjustment)
   */
  static async adjustQuantity(id, quantityChange, reason = null) {
    return transaction(async (connection) => {
      const [rows] = await connection.execute(
        'SELECT quantity FROM inventory WHERE id = ? FOR UPDATE',
        [id]
      );

      if (!rows || rows.length === 0) {
        throw new Error('Inventory item not found');
      }

      const newQuantity = rows[0].quantity + quantityChange;
      if (newQuantity < 0) {
        throw new Error('Insufficient stock');
      }

      await connection.execute(
        'UPDATE inventory SET quantity = ? WHERE id = ?',
        [newQuantity, id]
      );

      return this.findById(id);
    });
  }

  /**
   * Delete inventory item
   */
  static async delete(id) {
    await execute('UPDATE inventory SET is_active = 0 WHERE id = ?', [id]);
  }

  // ─── SUPPLIERS ────────────────────────────────────────────

  /**
   * Find supplier by ID
   */
  static async findSupplierById(id) {
    return queryOne(
      `SELECT s.*, COUNT(i.id) AS item_count
       FROM suppliers s
       LEFT JOIN inventory i ON s.id = i.supplier_id AND i.is_active = 1
       WHERE s.id = ?
       GROUP BY s.id`,
      [id]
    );
  }

  /**
   * Find supplier by slug
   */
  static async findSupplierBySlug(slug) {
    return queryOne('SELECT * FROM suppliers WHERE slug = ?', [slug]);
  }

  /**
   * Get all suppliers with pagination
   */
  static async findAllSuppliers({ page = 1, limit = 10, status = '', search = '' } = {}) {
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (status === 'active') {
      whereClause += ' AND s.is_active = 1';
    } else if (status === 'inactive') {
      whereClause += ' AND s.is_active = 0';
    }

    if (search) {
      whereClause += ' AND (s.name LIKE ? OR s.contact_person LIKE ? OR s.email LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    const countResult = await queryOne(
      `SELECT COUNT(*) AS total FROM suppliers s ${whereClause}`,
      params
    );

    const offset = (page - 1) * limit;
    const suppliers = await query(
      `SELECT s.*, COUNT(i.id) AS item_count
       FROM suppliers s
       LEFT JOIN inventory i ON s.id = i.supplier_id AND i.is_active = 1
       ${whereClause}
       GROUP BY s.id
       ORDER BY s.name ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { suppliers, total: countResult.total };
  }

  /**
   * Create a supplier
   */
  static async createSupplier(supplierData) {
    const id = await insert(
      `INSERT INTO suppliers (name, slug, contact_person, email, phone, address,
        city, country, notes, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        supplierData.name,
        supplierData.slug || supplierData.name.toLowerCase().replace(/\s+/g, '-'),
        supplierData.contactPerson || null,
        supplierData.email || null,
        supplierData.phone || null,
        supplierData.address || null,
        supplierData.city || null,
        supplierData.country || null,
        supplierData.notes || null,
        supplierData.isActive !== undefined ? (supplierData.isActive ? 1 : 0) : 1,
      ]
    );

    return this.findSupplierById(id);
  }

  /**
   * Update a supplier
   */
  static async updateSupplier(id, supplierData) {
    const fields = [];
    const values = [];

    const allowedFields = [
      'name', 'slug', 'contact_person', 'email', 'phone',
      'address', 'city', 'country', 'notes', 'is_active',
    ];

    for (const field of allowedFields) {
      const camelField = field.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      if (supplierData[camelField] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(supplierData[camelField]);
      }
    }

    if (fields.length === 0) return this.findSupplierById(id);

    values.push(id);
    await execute(
      `UPDATE suppliers SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.findSupplierById(id);
  }

  /**
   * Delete supplier (soft delete)
   */
  static async deleteSupplier(id) {
    await execute('UPDATE suppliers SET is_active = 0 WHERE id = ?', [id]);
  }

  /**
   * Get inventory statistics
   */
  static async getStats() {
    const totalItems = await queryOne('SELECT COUNT(*) AS total FROM inventory WHERE is_active = 1');
    const totalValue = await queryOne(
      'SELECT COALESCE(SUM(quantity * unit_cost), 0) AS total FROM inventory WHERE is_active = 1'
    );
    const lowStockCount = await queryOne(
      'SELECT COUNT(*) AS total FROM inventory WHERE quantity <= reorder_level AND is_active = 1'
    );
    const outOfStockCount = await queryOne(
      'SELECT COUNT(*) AS total FROM inventory WHERE quantity = 0 AND is_active = 1'
    );
    const totalSuppliers = await queryOne('SELECT COUNT(*) AS total FROM suppliers WHERE is_active = 1');

    return {
      totalItems: totalItems.total,
      totalValue: totalValue.total,
      lowStockCount: lowStockCount.total,
      outOfStockCount: outOfStockCount.total,
      totalSuppliers: totalSuppliers.total,
    };
  }
}

module.exports = Inventory;
