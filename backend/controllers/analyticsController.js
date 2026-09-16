const { query, queryOne } = require('../config/database');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

const dashboardStats = asyncHandler(async (req, res) => {
  const totalRooms = await queryOne(
    'SELECT COUNT(*) AS total FROM rooms WHERE is_active = 1'
  );

  const occupiedRooms = await queryOne(
    "SELECT COUNT(*) AS total FROM rooms WHERE status = 'occupied' AND is_active = 1"
  );

  const availableRooms = await queryOne(
    "SELECT COUNT(*) AS total FROM rooms WHERE status = 'available' AND is_active = 1"
  );

  const occupancyRate = await queryOne(
    `SELECT ROUND(
       (SELECT COUNT(*) FROM rooms WHERE status = 'occupied' AND is_active = 1) /
       NULLIF((SELECT COUNT(*) FROM rooms WHERE is_active = 1), 0) * 100, 2
     ) AS rate`
  );

  const todayCheckIns = await queryOne(
    "SELECT COUNT(*) AS total FROM bookings WHERE check_in = CURDATE() AND status IN ('confirmed', 'checked_in')"
  );

  const todayCheckOuts = await queryOne(
    "SELECT COUNT(*) AS total FROM bookings WHERE check_out = CURDATE() AND status IN ('checked_in', 'checked_out')"
  );

  const totalBookings = await queryOne('SELECT COUNT(*) AS total FROM bookings');

  const monthBookings = await queryOne(
    "SELECT COUNT(*) AS total FROM bookings WHERE created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')"
  );

  const monthRevenue = await queryOne(
    "SELECT COALESCE(SUM(final_amount), 0) AS total FROM bookings WHERE status IN ('confirmed', 'checked_in', 'checked_out') AND created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')"
  );

  const totalRevenue = await queryOne(
    "SELECT COALESCE(SUM(final_amount), 0) AS total FROM bookings WHERE status IN ('confirmed', 'checked_in', 'checked_out')"
  );

  const pendingTasks = await queryOne(
    "SELECT COUNT(*) AS total FROM housekeeping WHERE status IN ('pending', 'in_progress')"
  );

  const activeEmployees = await queryOne(
    "SELECT COUNT(*) AS total FROM employees WHERE status = 'active'"
  );

  const pendingMessages = await queryOne(
    "SELECT COUNT(*) AS total FROM contact_messages WHERE status = 'unread'"
  );

  const recentBookings = await query(
    `SELECT b.id, b.booking_reference, b.final_amount, b.status, b.check_in, b.check_out,
            u.first_name, u.last_name, r.room_number
     FROM bookings b
     JOIN users u ON b.user_id = u.id
     JOIN rooms r ON b.room_id = r.id
     ORDER BY b.created_at DESC
     LIMIT 5`
  );

  res.status(200).json({
    success: true,
    data: {
      rooms: {
        total: totalRooms.total,
        occupied: occupiedRooms.total,
        available: availableRooms.total,
        occupancyRate: occupancyRate.rate || 0,
      },
      bookings: {
        total: totalBookings.total,
        thisMonth: monthBookings.total,
        todayCheckIns: todayCheckIns.total,
        todayCheckOuts: todayCheckOuts.total,
      },
      revenue: {
        total: totalRevenue.total,
        thisMonth: monthRevenue.total,
      },
      pendingTasks: pendingTasks.total,
      activeEmployees: activeEmployees.total,
      pendingMessages: pendingMessages.total,
      recentBookings,
    },
  });
});

const revenueAnalytics = asyncHandler(async (req, res) => {
  const { period = 'daily', days = 30 } = req.query;

  const startDate = new Date(Date.now() - parseInt(days, 10) * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0];
  const endDate = new Date().toISOString().split('T')[0];

  let groupClause;
  switch (period) {
    case 'weekly':
      groupClause = 'YEARWEEK(created_at, 1)';
      break;
    case 'monthly':
      groupClause = "DATE_FORMAT(created_at, '%Y-%m')";
      break;
    default:
      groupClause = 'DATE(created_at)';
  }

  const bookingRevenue = await query(
    `SELECT ${groupClause} AS period,
            COUNT(*) AS bookings,
            COALESCE(SUM(final_amount), 0) AS revenue,
            COALESCE(AVG(final_amount), 0) AS avg_booking_value
     FROM bookings
     WHERE DATE(created_at) BETWEEN ? AND ?
     AND status IN ('confirmed', 'checked_in', 'checked_out')
     GROUP BY period
     ORDER BY period ASC`,
    [startDate, endDate]
  );

  const restaurantRevenue = await query(
    `SELECT ${groupClause} AS period,
            COUNT(*) AS orders,
            COALESCE(SUM(total_amount), 0) AS revenue
     FROM restaurant_orders
     WHERE DATE(created_at) BETWEEN ? AND ?
     AND status IN ('delivered', 'completed')
     GROUP BY period
     ORDER BY period ASC`,
    [startDate, endDate]
  );

  const totalBookingRevenue = await queryOne(
    `SELECT COALESCE(SUM(final_amount), 0) AS total
     FROM bookings
     WHERE DATE(created_at) BETWEEN ? AND ?
     AND status IN ('confirmed', 'checked_in', 'checked_out')`,
    [startDate, endDate]
  );

  const totalRestaurantRevenue = await queryOne(
    `SELECT COALESCE(SUM(total_amount), 0) AS total
     FROM restaurant_orders
     WHERE DATE(created_at) BETWEEN ? AND ?
     AND status IN ('delivered', 'completed')`,
    [startDate, endDate]
  );

  const revenueByCategory = await query(
    `SELECT rc.name AS category,
            COALESCE(SUM(b.final_amount), 0) AS revenue,
            COUNT(b.id) AS bookings
     FROM bookings b
     JOIN rooms r ON b.room_id = r.id
     JOIN room_categories rc ON r.category_id = rc.id
     WHERE DATE(b.created_at) BETWEEN ? AND ?
     AND b.status IN ('confirmed', 'checked_in', 'checked_out')
     GROUP BY rc.name
     ORDER BY revenue DESC`,
    [startDate, endDate]
  );

  res.status(200).json({
    success: true,
    data: {
      period: { startDate, endDate, granularity: period },
      totals: {
        bookingRevenue: totalBookingRevenue.total,
        restaurantRevenue: totalRestaurantRevenue.total,
        combinedRevenue: parseFloat((parseFloat(totalBookingRevenue.total) + parseFloat(totalRestaurantRevenue.total)).toFixed(2)),
      },
      bookingRevenue,
      restaurantRevenue,
      revenueByCategory,
    },
  });
});

const bookingAnalytics = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;

  const startDate = new Date(Date.now() - parseInt(days, 10) * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0];
  const endDate = new Date().toISOString().split('T')[0];

  const summary = await queryOne(
    `SELECT
       COUNT(*) AS total,
       COALESCE(AVG(final_amount), 0) AS avg_value,
       COALESCE(AVG(DATEDIFF(check_out, check_in)), 0) AS avg_stay_nights,
       COALESCE(AVG(adults), 0) AS avg_adults,
       COALESCE(AVG(children_count), 0) AS avg_children
     FROM bookings
     WHERE DATE(created_at) BETWEEN ? AND ?`,
    [startDate, endDate]
  );

  const byStatus = await query(
    `SELECT status, COUNT(*) AS count
     FROM bookings
     WHERE DATE(created_at) BETWEEN ? AND ?
     GROUP BY status`,
    [startDate, endDate]
  );

  const dailyTrend = await query(
    `SELECT DATE(created_at) AS date,
            COUNT(*) AS count,
            COALESCE(SUM(final_amount), 0) AS revenue
     FROM bookings
     WHERE DATE(created_at) BETWEEN ? AND ?
     GROUP BY DATE(created_at)
     ORDER BY date ASC`,
    [startDate, endDate]
  );

  const topRoomCategories = await query(
    `SELECT rc.name AS category,
            COUNT(b.id) AS bookings,
            COALESCE(SUM(b.final_amount), 0) AS revenue
     FROM bookings b
     JOIN rooms r ON b.room_id = r.id
     JOIN room_categories rc ON r.category_id = rc.id
     WHERE DATE(b.created_at) BETWEEN ? AND ?
     GROUP BY rc.name
     ORDER BY bookings DESC`,
    [startDate, endDate]
  );

  const cancellationRate = await queryOne(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
       ROUND(
         SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) /
         NULLIF(COUNT(*), 0) * 100, 2
       ) AS rate
     FROM bookings
     WHERE DATE(created_at) BETWEEN ? AND ?`,
    [startDate, endDate]
  );

  const leadTime = await queryOne(
    `SELECT
       ROUND(AVG(DATEDIFF(check_in, created_at)), 1) AS avg_lead_time_days
     FROM bookings
     WHERE DATE(created_at) BETWEEN ? AND ?`,
    [startDate, endDate]
  );

  res.status(200).json({
    success: true,
    data: {
      period: { startDate, endDate },
      summary,
      byStatus,
      dailyTrend,
      topRoomCategories,
      cancellationRate,
      leadTime,
    },
  });
});

const occupancyAnalytics = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;

  const startDate = new Date(Date.now() - parseInt(days, 10) * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0];
  const endDate = new Date().toISOString().split('T')[0];

  const totalRooms = await queryOne(
    'SELECT COUNT(*) AS total FROM rooms WHERE is_active = 1'
  );

  const currentStatus = await query(
    `SELECT status, COUNT(*) AS count
     FROM rooms WHERE is_active = 1
     GROUP BY status`
  );

  const dailyOccupancy = await query(
    `SELECT dates.date,
            COUNT(DISTINCT b.room_id) AS occupied_rooms,
            ${totalRooms.total} AS total_rooms,
            ROUND(COUNT(DISTINCT b.room_id) / ${totalRooms.total} * 100, 2) AS rate
     FROM (
       SELECT DATE(b.check_in) AS date FROM bookings b
       WHERE b.status IN ('confirmed', 'checked_in', 'checked_out')
       AND DATE(b.check_in) BETWEEN ? AND ?
       UNION
       SELECT DATE(b.check_out) AS date FROM bookings b
       WHERE b.status IN ('confirmed', 'checked_in', 'checked_out')
       AND DATE(b.check_out) BETWEEN ? AND ?
     ) dates
     LEFT JOIN bookings b ON dates.date BETWEEN DATE(b.check_in) AND DATE(b.check_out)
     AND b.status IN ('confirmed', 'checked_in', 'checked_out')
     GROUP BY dates.date
     ORDER BY dates.date ASC`,
    [startDate, endDate, startDate, endDate]
  );

  const averageOccupancy = await queryOne(
    `SELECT
       ROUND(AVG(daily_occupied / ${totalRooms.total}) * 100, 2) AS avg_rate,
       MIN(daily_occupied) AS min_occupied,
       MAX(daily_occupied) AS max_occupied
     FROM (
       SELECT DATE(b.check_in) AS dt,
              COUNT(DISTINCT b.room_id) AS daily_occupied
       FROM bookings b
       WHERE b.status IN ('checked_in', 'confirmed')
       AND DATE(b.check_in) BETWEEN ? AND ?
       GROUP BY dt
     ) stats`,
    [startDate, endDate]
  );

  const byCategory = await query(
    `SELECT rc.name AS category,
            COUNT(r.id) AS total_rooms,
            SUM(CASE WHEN r.status = 'occupied' THEN 1 ELSE 0 END) AS occupied,
            SUM(CASE WHEN r.status = 'available' THEN 1 ELSE 0 END) AS available,
            SUM(CASE WHEN r.status = 'reserved' THEN 1 ELSE 0 END) AS reserved,
            ROUND(
              SUM(CASE WHEN r.status = 'occupied' THEN 1 ELSE 0 END) /
              NULLIF(COUNT(r.id), 0) * 100, 2
            ) AS occupancy_rate
     FROM rooms r
     JOIN room_categories rc ON r.category_id = rc.id
     WHERE r.is_active = 1
     GROUP BY rc.name
     ORDER BY occupancy_rate DESC`
  );

  const byFloor = await query(
    `SELECT r.floor,
            COUNT(r.id) AS total_rooms,
            SUM(CASE WHEN r.status = 'occupied' THEN 1 ELSE 0 END) AS occupied,
            ROUND(
              SUM(CASE WHEN r.status = 'occupied' THEN 1 ELSE 0 END) /
              NULLIF(COUNT(r.id), 0) * 100, 2
            ) AS occupancy_rate
     FROM rooms r
     WHERE r.is_active = 1
     GROUP BY r.floor
     ORDER BY r.floor ASC`
  );

  res.status(200).json({
    success: true,
    data: {
      period: { startDate, endDate },
      totalRooms: totalRooms.total,
      currentStatus,
      averageOccupancy,
      byCategory,
      byFloor,
      dailyOccupancy,
    },
  });
});

const topRooms = asyncHandler(async (req, res) => {
  const { days = 30, limit = 10 } = req.query;

  const startDate = new Date(Date.now() - parseInt(days, 10) * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0];
  const endDate = new Date().toISOString().split('T')[0];

  const topByRevenue = await query(
    `SELECT r.id, r.room_number, rc.name AS category,
            COUNT(b.id) AS bookings,
            COALESCE(SUM(b.final_amount), 0) AS total_revenue,
            COALESCE(AVG(b.final_amount), 0) AS avg_revenue,
            COALESCE(AVG(DATEDIFF(b.check_out, b.check_in)), 0) AS avg_stay
     FROM rooms r
     JOIN room_categories rc ON r.category_id = rc.id
     LEFT JOIN bookings b ON r.id = b.room_id
       AND b.status IN ('confirmed', 'checked_in', 'checked_out')
       AND DATE(b.created_at) BETWEEN ? AND ?
     WHERE r.is_active = 1
     GROUP BY r.id
     ORDER BY total_revenue DESC
     LIMIT ?`,
    [startDate, endDate, parseInt(limit, 10)]
  );

  const topByOccupancy = await query(
    `SELECT r.id, r.room_number, rc.name AS category,
            COUNT(DISTINCT b.id) AS total_bookings,
            COALESCE(SUM(DATEDIFF(
              LEAST(COALESCE(b.check_out, CURDATE()), ?),
              GREATEST(b.check_in, ?)
            )), 0) AS occupied_days
     FROM rooms r
     JOIN room_categories rc ON r.category_id = rc.id
     LEFT JOIN bookings b ON r.id = b.room_id
       AND b.status IN ('confirmed', 'checked_in', 'checked_out')
       AND b.check_in <= ? AND b.check_out >= ?
     WHERE r.is_active = 1
     GROUP BY r.id
     ORDER BY occupied_days DESC
     LIMIT ?`,
    [endDate, startDate, endDate, startDate, parseInt(limit, 10)]
  );

  const leastPopular = await query(
    `SELECT r.id, r.room_number, rc.name AS category, r.price_per_night,
            COUNT(b.id) AS bookings
     FROM rooms r
     JOIN room_categories rc ON r.category_id = rc.id
     LEFT JOIN bookings b ON r.id = b.room_id
       AND b.status IN ('confirmed', 'checked_in', 'checked_out')
       AND DATE(b.created_at) BETWEEN ? AND ?
     WHERE r.is_active = 1
     GROUP BY r.id
     ORDER BY bookings ASC
     LIMIT ?`,
    [startDate, endDate, parseInt(limit, 10)]
  );

  res.status(200).json({
    success: true,
    data: {
      period: { startDate, endDate },
      topByRevenue,
      topByOccupancy,
      leastPopular,
    },
  });
});

const recentActivity = asyncHandler(async (req, res) => {
  const { limit = 20 } = req.query;

  const recentBookings = await query(
    `SELECT 'booking' AS type, b.id, b.booking_reference AS reference,
            b.status, b.final_amount AS amount, b.created_at,
            CONCAT(u.first_name, ' ', u.last_name) AS user_name,
            r.room_number AS detail
     FROM bookings b
     JOIN users u ON b.user_id = u.id
     JOIN rooms r ON b.room_id = r.id
     ORDER BY b.created_at DESC
     LIMIT ?`,
    [parseInt(limit, 10)]
  );

  const recentPayments = await query(
    `SELECT 'payment' AS type, p.id, p.payment_reference AS reference,
            p.status, p.amount, p.created_at,
            CONCAT(u.first_name, ' ', u.last_name) AS user_name,
            p.method AS detail
     FROM payments p
     JOIN bookings b ON p.booking_id = b.id
     JOIN users u ON b.user_id = u.id
     ORDER BY p.created_at DESC
     LIMIT ?`,
    [parseInt(limit, 10)]
  );

  const recentOrders = await query(
    `SELECT 'restaurant_order' AS type, ro.id, ro.order_number AS reference,
            ro.status, ro.total_amount AS amount, ro.created_at,
            CONCAT(u.first_name, ' ', u.last_name) AS user_name,
            ro.order_type AS detail
     FROM restaurant_orders ro
     JOIN users u ON ro.user_id = u.id
     ORDER BY ro.created_at DESC
     LIMIT ?`,
    [parseInt(limit, 10)]
  );

  const recentReviews = await query(
    `SELECT 'review' AS type, rv.id, NULL AS reference,
            rv.rating AS status, NULL AS amount, rv.created_at,
            CONCAT(u.first_name, ' ', u.last_name) AS user_name,
            r.room_number AS detail
     FROM reviews rv
     JOIN users u ON rv.user_id = u.id
     JOIN rooms r ON rv.room_id = r.id
     ORDER BY rv.created_at DESC
     LIMIT ?`,
    [parseInt(limit, 10)]
  );

  const allActivity = [...recentBookings, ...recentPayments, ...recentOrders, ...recentReviews]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, parseInt(limit, 10));

  res.status(200).json({
    success: true,
    data: { activities: allActivity },
  });
});

module.exports = {
  dashboardStats,
  revenueAnalytics,
  bookingAnalytics,
  occupancyAnalytics,
  topRooms,
  recentActivity,
};
