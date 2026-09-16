const { query, queryOne } = require('../config/database');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

const adminDashboard = asyncHandler(async (req, res) => {
  const totalRooms = await queryOne(
    'SELECT COUNT(*) AS total FROM rooms WHERE is_active = 1'
  );

  const occupiedRooms = await queryOne(
    "SELECT COUNT(*) AS total FROM rooms WHERE status = 'occupied' AND is_active = 1"
  );

  const availableRooms = await queryOne(
    "SELECT COUNT(*) AS total FROM rooms WHERE status = 'available' AND is_active = 1"
  );

  const reservedRooms = await queryOne(
    "SELECT COUNT(*) AS total FROM rooms WHERE status = 'reserved' AND is_active = 1"
  );

  const occupancyRate = await queryOne(
    `SELECT ROUND(
       (SELECT COUNT(*) FROM rooms WHERE status = 'occupied' AND is_active = 1) /
       NULLIF((SELECT COUNT(*) FROM rooms WHERE is_active = 1), 0) * 100, 2
     ) AS rate`
  );

  const totalBookings = await queryOne('SELECT COUNT(*) AS total FROM bookings');

  const monthBookings = await queryOne(
    "SELECT COUNT(*) AS total FROM bookings WHERE created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')"
  );

  const todayCheckIns = await queryOne(
    "SELECT COUNT(*) AS total FROM bookings WHERE check_in = CURDATE() AND status IN ('confirmed', 'checked_in')"
  );

  const todayCheckOuts = await queryOne(
    "SELECT COUNT(*) AS total FROM bookings WHERE check_out = CURDATE() AND status IN ('checked_in', 'checked_out')"
  );

  const pendingBookings = await queryOne(
    "SELECT COUNT(*) AS total FROM bookings WHERE status = 'pending'"
  );

  const totalRevenue = await queryOne(
    "SELECT COALESCE(SUM(final_amount), 0) AS total FROM bookings WHERE status IN ('confirmed', 'checked_in', 'checked_out')"
  );

  const monthRevenue = await queryOne(
    "SELECT COALESCE(SUM(final_amount), 0) AS total FROM bookings WHERE status IN ('confirmed', 'checked_in', 'checked_out') AND created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')"
  );

  const todayRevenue = await queryOne(
    "SELECT COALESCE(SUM(final_amount), 0) AS total FROM bookings WHERE status IN ('confirmed', 'checked_in', 'checked_out') AND DATE(created_at) = CURDATE()"
  );

  const totalGuests = await queryOne(
    "SELECT COUNT(DISTINCT user_id) AS total FROM bookings WHERE status IN ('confirmed', 'checked_in', 'checked_out')"
  );

  const activeGuests = await queryOne(
    "SELECT COUNT(DISTINCT user_id) AS total FROM bookings WHERE status = 'checked_in'"
  );

  const totalEmployees = await queryOne(
    'SELECT COUNT(*) AS total FROM employees'
  );

  const activeEmployees = await queryOne(
    "SELECT COUNT(*) AS total FROM employees WHERE status = 'active'"
  );

  const pendingTasks = await queryOne(
    "SELECT COUNT(*) AS total FROM housekeeping WHERE status IN ('pending', 'in_progress')"
  );

  const pendingMessages = await queryOne(
    "SELECT COUNT(*) AS total FROM contact_messages WHERE status = 'unread'"
  );

  const totalMenuItems = await queryOne(
    'SELECT COUNT(*) AS total FROM restaurant_menu WHERE is_available = 1'
  );

  const todayOrders = await queryOne(
    "SELECT COUNT(*) AS total FROM restaurant_orders WHERE DATE(created_at) = CURDATE()"
  );

  const recentBookings = await query(
    `SELECT b.id, b.booking_reference, b.status, b.final_amount, b.check_in, b.check_out,
            u.first_name, u.last_name, r.room_number, rc.name AS room_category
     FROM bookings b
     JOIN users u ON b.user_id = u.id
     JOIN rooms r ON b.room_id = r.id
     JOIN room_categories rc ON r.category_id = rc.id
     ORDER BY b.created_at DESC
     LIMIT 5`
  );

  const recentPayments = await query(
    `SELECT p.id, p.payment_reference, p.amount, p.status, p.method, p.created_at,
            u.first_name, u.last_name
     FROM payments p
     JOIN bookings b ON p.booking_id = b.id
     JOIN users u ON b.user_id = u.id
     ORDER BY p.created_at DESC
     LIMIT 5`
  );

  const lowStockItems = await query(
    `SELECT i.id, i.item_name, i.quantity, i.reorder_level,
            s.name AS supplier_name
     FROM inventory i
     LEFT JOIN suppliers s ON i.supplier_id = s.id
     WHERE i.quantity <= i.reorder_level
     ORDER BY (i.quantity / NULLIF(i.reorder_level, 0)) ASC
     LIMIT 5`
  );

  const bookingTrend = await query(
    `SELECT DATE(created_at) AS date,
            COUNT(*) AS count,
            COALESCE(SUM(final_amount), 0) AS revenue
     FROM bookings
     WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
     GROUP BY DATE(created_at)
     ORDER BY date ASC`
  );

  res.status(200).json({
    success: true,
    data: {
      rooms: {
        total: totalRooms.total,
        occupied: occupiedRooms.total,
        available: availableRooms.total,
        reserved: reservedRooms.total,
        occupancyRate: occupancyRate.rate || 0,
      },
      bookings: {
        total: totalBookings.total,
        thisMonth: monthBookings.total,
        todayCheckIns: todayCheckIns.total,
        todayCheckOuts: todayCheckOuts.total,
        pending: pendingBookings.total,
      },
      revenue: {
        total: totalRevenue.total,
        thisMonth: monthRevenue.total,
        today: todayRevenue.total,
      },
      guests: {
        total: totalGuests.total,
        active: activeGuests.total,
      },
      employees: {
        total: totalEmployees.total,
        active: activeEmployees.total,
      },
      operations: {
        pendingTasks: pendingTasks.total,
        pendingMessages: pendingMessages.total,
        totalMenuItems: totalMenuItems.total,
        todayOrders: todayOrders.total,
      },
      recentBookings,
      recentPayments,
      lowStockItems,
      bookingTrend,
    },
  });
});

const getAdminProfile = asyncHandler(async (req, res) => {
  const user = await queryOne(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, r.name AS role, u.profile_photo, u.is_active, u.created_at
     FROM users u LEFT JOIN roles r ON u.role_id = r.id
     WHERE u.id = ?`,
    [req.user.id]
  );

  if (!user) {
    throw new ApiError('User not found', 404);
  }

  const stats = await queryOne(
    "SELECT COUNT(*) AS totalBookings FROM bookings WHERE user_id = ?",
    [req.user.id]
  );

  const employeeInfo = await queryOne(
    `SELECT e.id, e.employee_code, e.position, e.department
     FROM employees e
     WHERE e.user_id = ?`,
    [req.user.id]
  );

  res.status(200).json({
    success: true,
    data: {
      user,
      totalBookings: stats.totalBookings,
      employeeInfo,
    },
  });
});

const systemHealth = asyncHandler(async (req, res) => {
  const dbStatus = await queryOne('SELECT 1 AS status').then(() => 'healthy').catch(() => 'unhealthy');

  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();

  const totalUsers = await queryOne('SELECT COUNT(*) AS total FROM users');
  const activeUsers = await queryOne("SELECT COUNT(*) AS total FROM users WHERE is_active = 1");

  const totalRooms = await queryOne('SELECT COUNT(*) AS total FROM rooms WHERE is_active = 1');
  const totalBookings = await queryOne('SELECT COUNT(*) AS total FROM bookings');
  const totalPayments = await queryOne('SELECT COUNT(*) AS total FROM payments');

  const recentErrors = await queryOne(
    `SELECT COUNT(*) AS total FROM audit_logs
     WHERE action = 'error'
     AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`
  );

  res.status(200).json({
    success: true,
    data: {
      status: dbStatus === 'healthy' ? 'operational' : 'degraded',
      database: dbStatus,
      server: {
        uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`,
        memoryUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
        memoryTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
        nodeVersion: process.version,
        platform: process.platform,
      },
      data: {
        totalUsers: totalUsers.total,
        activeUsers: activeUsers.total,
        totalRooms: totalRooms.total,
        totalBookings: totalBookings.total,
        totalPayments: totalPayments.total,
      },
      recentErrors: recentErrors.total,
      timestamp: new Date().toISOString(),
    },
  });
});

module.exports = {
  adminDashboard,
  getAdminProfile,
  systemHealth,
};
