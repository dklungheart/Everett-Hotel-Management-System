/**
 * Database Configuration - Everett Hotel Management System
 * Handles MySQL connection pool and database utilities
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

if (!process.env.DB_PASSWORD) {
  throw new Error('DB_PASSWORD environment variable is required. Set it in backend/.env');
}

// Create connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'everett_hotel',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  connectTimeout: 10000,
  namedPlaceholders: true,
  dateStrings: true,
});

// Pool event handlers
pool.pool.on('connection', (connection) => {
  console.log(`  ✓ Database connection ${connection.threadId} established`);
});

pool.pool.on('release', (connection) => {
  console.log(`  ↻ Database connection ${connection.threadId} released`);
});

pool.pool.on('enqueue', () => {
  console.log('  ⏳ Waiting for available database connection...');
});

/**
 * Test database connection
 */
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('  ✓ Database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('  ✗ Database connection failed:', error.message);
    return false;
  }
}

/**
 * Validate connection pool health
 */
async function validatePool() {
  try {
    const [rows] = await pool.execute('SELECT 1 AS health');
    return rows[0].health === 1;
  } catch (error) {
    console.error('  ✗ Pool health check failed:', error.message);
    return false;
  }
}

/**
 * Get pool statistics
 */
function getPoolStats() {
  return {
    totalConnections: pool.pool._allConnections ? pool.pool._allConnections.length : 0,
    freeConnections: pool.pool._freeConnections ? pool.pool._freeConnections.length : 0,
    waitingQueue: pool.pool._acquiringConnections ? pool.pool._acquiringConnections.length : 0,
  };
}

/**
 * Execute a query with optional parameters
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Array>} Query results
 */
async function query(sql, params = []) {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error('Query Error:', error.message);
    throw error;
  }
}

/**
 * Get a single row
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Object|null>} Single row or null
 */
async function queryOne(sql, params = []) {
  const results = await query(sql, params);
  return results.length > 0 ? results[0] : null;
}

/**
 * Execute a transaction
 * @param {Function} callback - Transaction callback
 * @returns {Promise<*>} Transaction result
 */
async function transaction(callback) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Insert a record and return the insert ID
 * @param {string} sql - INSERT SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<number>} Insert ID
 */
async function insert(sql, params = []) {
  const result = await query(sql, params);
  return result.insertId;
}

/**
 * Update or delete records and return affected rows
 * @param {string} sql - UPDATE/DELETE SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<number>} Affected rows count
 */
async function execute(sql, params = []) {
  const result = await query(sql, params);
  return result.affectedRows;
}

module.exports = {
  pool,
  testConnection,
  validatePool,
  getPoolStats,
  query,
  queryOne,
  transaction,
  insert,
  execute,
};
