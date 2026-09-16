const { query, queryOne } = require('../config/database');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

const dailyReport = asyncHandler(async (req, res) => {
  const { date = new Date().toISOString().split('T')[0] } = req.query;

  const bookings = await queryOne(
    `SELECT
       COUNT(*) AS total_bookings,
       SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed,
       SUM(CASE WHEN status = 'checked_in' THEN 1 ELSE 0 END) AS checked_in,
       SUM(CASE WHEN status = 'checked_out' THEN 1 ELSE 0 END) AS checked_out,
       SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
       COALESCE(SUM(CASE WHEN status IN ('confirmed', 'checked_in', 'checked_out') THEN final_amount ELSE 0 END), 0) AS total_revenue
     FROM bookings
     WHERE DATE(created_at) = ?`,
    [date]
  );

  const checkIns = await queryOne(
    "SELECT COUNT(*) AS total FROM bookings WHERE check_in = ? AND status IN ('confirmed', 'checked_in')",
    [date]
  );

  const checkOuts = await queryOne(
    "SELECT COUNT(*) AS total FROM bookings WHERE check_out = ? AND status IN ('checked_in', 'checked_out')",
    [date]
  );

  const restaurantOrders = await queryOne(
    `SELECT
       COUNT(*) AS total_orders,
       COALESCE(SUM(CASE WHEN status IN ('delivered', 'completed') THEN total_amount ELSE 0 END), 0) AS revenue
     FROM restaurant_orders
     WHERE DATE(created_at) = ?`,
    [date]
  );

  const newContacts = await queryOne(
    'SELECT COUNT(*) AS total FROM contact_messages WHERE DATE(created_at) = ?',
    [date]
  );

  const occupancy = await queryOne(
    `SELECT
       ROUND(
         (SELECT COUNT(*) FROM rooms WHERE status = 'occupied' AND is_active = 1) /
         NULLIF((SELECT COUNT(*) FROM rooms WHERE is_active = 1), 0) * 100, 2
       ) AS occupancy_rate`
  );

  res.status(200).json({
    success: true,
    data: {
      date,
      bookings,
      checkIns: checkIns.total,
      checkOuts: checkOuts.total,
      restaurantOrders,
      newContacts: newContacts.total,
      occupancyRate: occupancy.occupancy_rate || 0,
    },
  });
});

const weeklyReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const end = endDate || new Date().toISOString().split('T')[0];

  const bookings = await query(
    `SELECT DATE(created_at) AS date,
            COUNT(*) AS total_bookings,
            COALESCE(SUM(final_amount), 0) AS revenue
     FROM bookings
     WHERE DATE(created_at) BETWEEN ? AND ?
     GROUP BY DATE(created_at)
     ORDER BY date ASC`,
    [start, end]
  );

  const summary = await queryOne(
    `SELECT
       COUNT(*) AS total_bookings,
       COALESCE(SUM(final_amount), 0) AS total_revenue,
       COALESCE(AVG(final_amount), 0) AS avg_booking_value,
       SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancellations
     FROM bookings
     WHERE DATE(created_at) BETWEEN ? AND ?`,
    [start, end]
  );

  const restaurantRevenue = await queryOne(
    `SELECT COALESCE(SUM(total_amount), 0) AS total
     FROM restaurant_orders
     WHERE DATE(created_at) BETWEEN ? AND ?
     AND status IN ('delivered', 'completed')`,
    [start, end]
  );

  const dailyOccupancy = await query(
    `SELECT
       DATE(b.check_in) AS date,
       COUNT(DISTINCT b.room_id) AS occupied_rooms
     FROM bookings b
     WHERE b.status IN ('checked_in', 'confirmed')
     AND DATE(b.check_in) BETWEEN ? AND ?
     GROUP BY DATE(b.check_in)
     ORDER BY date ASC`,
    [start, end]
  );

  res.status(200).json({
    success: true,
    data: {
      period: { startDate: start, endDate: end },
      summary,
      dailyBookings: bookings,
      restaurantRevenue: restaurantRevenue.total,
      dailyOccupancy,
    },
  });
});

const monthlyReport = asyncHandler(async (req, res) => {
  const { year = new Date().getFullYear(), month = new Date().getMonth() + 1 } = req.query;

  const monthStr = String(month).padStart(2, '0');
  const startDate = `${year}-${monthStr}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  const summary = await queryOne(
    `SELECT
       COUNT(*) AS total_bookings,
       COALESCE(SUM(final_amount), 0) AS total_revenue,
       COALESCE(AVG(final_amount), 0) AS avg_booking_value,
       COALESCE(MAX(final_amount), 0) AS highest_booking,
       SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancellations,
       SUM(CASE WHEN status = 'confirmed' OR status = 'checked_in' OR status = 'checked_out' THEN 1 ELSE 0 END) AS completed_bookings
     FROM bookings
     WHERE DATE(created_at) BETWEEN ? AND ?`,
    [startDate, endDate]
  );

  const weeklyBreakdown = await query(
    `SELECT
       WEEK(created_at) - WEEK(DATE_FORMAT(created_at, '%Y-%m-01')) + 1 AS week_number,
       COUNT(*) AS bookings,
       COALESCE(SUM(final_amount), 0) AS revenue
     FROM bookings
     WHERE DATE(created_at) BETWEEN ? AND ?
     GROUP BY week_number
     ORDER BY week_number ASC`,
    [startDate, endDate]
  );

  const byRoomCategory = await query(
    `SELECT rc.name AS category,
            COUNT(b.id) AS bookings,
            COALESCE(SUM(b.final_amount), 0) AS revenue
     FROM bookings b
     JOIN rooms r ON b.room_id = r.id
     JOIN room_categories rc ON r.category_id = rc.id
     WHERE DATE(b.created_at) BETWEEN ? AND ?
     GROUP BY rc.name
     ORDER BY revenue DESC`,
    [startDate, endDate]
  );

  const restaurantRevenue = await queryOne(
    `SELECT COALESCE(SUM(total_amount), 0) AS total
     FROM restaurant_orders
     WHERE DATE(created_at) BETWEEN ? AND ?
     AND status IN ('delivered', 'completed')`,
    [startDate, endDate]
  );

  const averageOccupancy = await queryOne(
    `SELECT
       ROUND(
         AVG(daily_occupied / NULLIF(total_rooms, 0)) * 100, 2
       ) AS avg_occupancy_rate
     FROM (
       SELECT DATE(b.check_in) AS dt,
              COUNT(DISTINCT b.room_id) AS daily_occupied,
              (SELECT COUNT(*) FROM rooms WHERE is_active = 1) AS total_rooms
       FROM bookings b
       WHERE b.status IN ('checked_in', 'confirmed')
       AND DATE(b.check_in) BETWEEN ? AND ?
       GROUP BY dt
     ) daily_stats`,
    [startDate, endDate]
  );

  res.status(200).json({
    success: true,
    data: {
      period: { year: parseInt(year, 10), month: parseInt(month, 10), startDate, endDate },
      summary,
      weeklyBreakdown,
      byRoomCategory,
      restaurantRevenue: restaurantRevenue.total,
      averageOccupancy: averageOccupancy.avg_occupancy_rate || 0,
    },
  });
});

const annualReport = asyncHandler(async (req, res) => {
  const { year = new Date().getFullYear() } = req.query;

  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const summary = await queryOne(
    `SELECT
       COUNT(*) AS total_bookings,
       COALESCE(SUM(final_amount), 0) AS total_revenue,
       COALESCE(AVG(final_amount), 0) AS avg_booking_value,
       SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancellations
     FROM bookings
     WHERE DATE(created_at) BETWEEN ? AND ?`,
    [startDate, endDate]
  );

  const monthlyRevenue = await query(
    `SELECT
       MONTH(created_at) AS month,
       COUNT(*) AS bookings,
       COALESCE(SUM(final_amount), 0) AS revenue
     FROM bookings
     WHERE DATE(created_at) BETWEEN ? AND ?
     GROUP BY MONTH(created_at)
     ORDER BY month ASC`,
    [startDate, endDate]
  );

  const restaurantRevenue = await queryOne(
    `SELECT COALESCE(SUM(total_amount), 0) AS total
     FROM restaurant_orders
     WHERE DATE(created_at) BETWEEN ? AND ?
     AND status IN ('delivered', 'completed')`,
    [startDate, endDate]
  );

  const topMonths = await query(
    `SELECT
       MONTH(created_at) AS month,
       COUNT(*) AS bookings,
       COALESCE(SUM(final_amount), 0) AS revenue
     FROM bookings
     WHERE DATE(created_at) BETWEEN ? AND ?
     AND status IN ('confirmed', 'checked_in', 'checked_out')
     GROUP BY MONTH(created_at)
     ORDER BY revenue DESC
     LIMIT 3`,
    [startDate, endDate]
  );

  const guestStats = await queryOne(
    `SELECT
       COUNT(DISTINCT user_id) AS unique_guests,
       COALESCE(AVG(adults + children_count), 0) AS avg_guests_per_booking
     FROM bookings
     WHERE DATE(created_at) BETWEEN ? AND ?`,
    [startDate, endDate]
  );

  res.status(200).json({
    success: true,
    data: {
      year: parseInt(year, 10),
      summary,
      monthlyRevenue,
      restaurantRevenue: restaurantRevenue.total,
      topMonths,
      guestStats,
    },
  });
});

const revenueReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, groupBy = 'day' } = req.query;

  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const end = endDate || new Date().toISOString().split('T')[0];

  let groupClause;
  switch (groupBy) {
    case 'week':
      groupClause = 'YEARWEEK(created_at, 1)';
      break;
    case 'month':
      groupClause = "DATE_FORMAT(created_at, '%Y-%m')";
      break;
    default:
      groupClause = 'DATE(created_at)';
  }

  const bookingRevenue = await query(
    `SELECT ${groupClause} AS period,
            COUNT(*) AS bookings,
            COALESCE(SUM(final_amount), 0) AS revenue,
            COALESCE(AVG(final_amount), 0) AS avg_value
     FROM bookings
     WHERE DATE(created_at) BETWEEN ? AND ?
     AND status IN ('confirmed', 'checked_in', 'checked_out')
     GROUP BY period
     ORDER BY period ASC`,
    [start, end]
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
    [start, end]
  );

  const totalBookingRevenue = await queryOne(
    `SELECT COALESCE(SUM(final_amount), 0) AS total
     FROM bookings
     WHERE DATE(created_at) BETWEEN ? AND ?
     AND status IN ('confirmed', 'checked_in', 'checked_out')`,
    [start, end]
  );

  const totalRestaurantRevenue = await queryOne(
    `SELECT COALESCE(SUM(total_amount), 0) AS total
     FROM restaurant_orders
     WHERE DATE(created_at) BETWEEN ? AND ?
     AND status IN ('delivered', 'completed')`,
    [start, end]
  );

  res.status(200).json({
    success: true,
    data: {
      period: { startDate: start, endDate: end },
      totals: {
        bookingRevenue: totalBookingRevenue.total,
        restaurantRevenue: totalRestaurantRevenue.total,
        combinedRevenue: parseFloat((totalBookingRevenue.total + totalRestaurantRevenue.total).toFixed(2)),
      },
      bookingRevenue,
      restaurantRevenue,
    },
  });
});

const bookingReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const end = endDate || new Date().toISOString().split('T')[0];

  const summary = await queryOne(
    `SELECT
       COUNT(*) AS total_bookings,
       COALESCE(SUM(final_amount), 0) AS total_revenue,
       COALESCE(AVG(final_amount), 0) AS avg_booking_value,
       COALESCE(AVG(DATEDIFF(check_out, check_in)), 0) AS avg_stay_duration,
       SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed,
       SUM(CASE WHEN status = 'checked_in' THEN 1 ELSE 0 END) AS checked_in,
       SUM(CASE WHEN status = 'checked_out' THEN 1 ELSE 0 END) AS checked_out,
       SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled
     FROM bookings
     WHERE DATE(created_at) BETWEEN ? AND ?`,
    [start, end]
  );

  const byRoomCategory = await query(
    `SELECT rc.name AS category,
            COUNT(b.id) AS bookings,
            COALESCE(SUM(b.final_amount), 0) AS revenue,
            COALESCE(AVG(DATEDIFF(b.check_out, b.check_in)), 0) AS avg_stay
     FROM bookings b
     JOIN rooms r ON b.room_id = r.id
     JOIN room_categories rc ON r.category_id = rc.id
     WHERE DATE(b.created_at) BETWEEN ? AND ?
     GROUP BY rc.name
     ORDER BY bookings DESC`,
    [start, end]
  );

  const dailyBookings = await query(
    `SELECT DATE(created_at) AS date,
            COUNT(*) AS count,
            COALESCE(SUM(final_amount), 0) AS revenue
     FROM bookings
     WHERE DATE(created_at) BETWEEN ? AND ?
     GROUP BY DATE(created_at)
     ORDER BY date ASC`,
    [start, end]
  );

  const cancellationRate = await queryOne(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
       ROUND(
         SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) /
         NULLIF(COUNT(*), 0) * 100, 2
       ) AS cancellation_rate
     FROM bookings
     WHERE DATE(created_at) BETWEEN ? AND ?`,
    [start, end]
  );

  res.status(200).json({
    success: true,
    data: {
      period: { startDate: start, endDate: end },
      summary,
      byRoomCategory,
      dailyBookings,
      cancellationRate,
    },
  });
});

const occupancyReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const end = endDate || new Date().toISOString().split('T')[0];

  const totalRooms = await queryOne(
    'SELECT COUNT(*) AS total FROM rooms WHERE is_active = 1'
  );

  const currentStatus = await query(
    `SELECT status, COUNT(*) AS count
     FROM rooms WHERE is_active = 1
     GROUP BY status`
  );

  const dailyOccupancy = await query(
    `SELECT
       dates.date,
       COUNT(DISTINCT b.room_id) AS occupied_rooms,
       ${totalRooms.total} AS total_rooms,
       ROUND(COUNT(DISTINCT b.room_id) / ${totalRooms.total} * 100, 2) AS occupancy_rate
     FROM (
       SELECT DISTINCT DATE(check_in) AS date FROM bookings
       WHERE status IN ('confirmed', 'checked_in')
       AND DATE(check_in) BETWEEN ? AND ?
       UNION
       SELECT DISTINCT DATE(check_out) AS date FROM bookings
       WHERE status IN ('checked_in', 'checked_out')
       AND DATE(check_out) BETWEEN ? AND ?
     ) dates
     LEFT JOIN bookings b ON dates.date BETWEEN DATE(b.check_in) AND DATE(b.check_out)
     AND b.status IN ('confirmed', 'checked_in', 'checked_out')
     GROUP BY dates.date
     ORDER BY dates.date ASC`,
    [start, end, start, end]
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
    [start, end]
  );

  const byCategory = await query(
    `SELECT rc.name AS category,
            COUNT(r.id) AS total_rooms,
            SUM(CASE WHEN r.status = 'occupied' THEN 1 ELSE 0 END) AS occupied,
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

  res.status(200).json({
    success: true,
    data: {
      period: { startDate: start, endDate: end },
      totalRooms: totalRooms.total,
      currentStatus,
      averageOccupancy,
      byCategory,
      dailyOccupancy,
    },
  });
});

const employeeReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const end = endDate || new Date().toISOString().split('T')[0];

  const summary = await queryOne(
    `SELECT
       COUNT(*) AS total_employees,
       SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active,
       SUM(CASE WHEN status != 'active' THEN 1 ELSE 0 END) AS inactive
     FROM employees`
  );

  const byDepartment = await query(
    `SELECT e.department AS department,
            COUNT(e.id) AS count,
            ROUND(AVG(e.salary), 2) AS avg_salary
     FROM employees e
     WHERE e.status = 'active'
     GROUP BY e.department
     ORDER BY count DESC`
  );

  const recentHires = await query(
    `SELECT e.id, e.employee_code, e.position, e.hire_date,
            u.first_name, u.last_name, e.department
     FROM employees e
     JOIN users u ON e.user_id = u.id
     WHERE e.hire_date BETWEEN ? AND ?
     ORDER BY e.hire_date DESC`,
    [start, end]
  );

  const housekeepingPerformance = await query(
    `SELECT
       e.id,
       u.first_name,
       u.last_name,
       COUNT(h.id) AS total_tasks,
       SUM(CASE WHEN h.status = 'completed' THEN 1 ELSE 0 END) AS completed_tasks,
       ROUND(
         SUM(CASE WHEN h.status = 'completed' THEN 1 ELSE 0 END) /
         NULLIF(COUNT(h.id), 0) * 100, 2
       ) AS completion_rate
     FROM employees e
     JOIN users u ON e.user_id = u.id
     LEFT JOIN housekeeping h ON e.id = h.assigned_to AND DATE(h.created_at) BETWEEN ? AND ?
     WHERE e.status = 'active' AND (e.department = 'housekeeping' OR e.department = 'maintenance')
     GROUP BY e.id
     ORDER BY completed_tasks DESC`,
    [start, end]
  );

  res.status(200).json({
    success: true,
    data: {
      period: { startDate: start, endDate: end },
      summary,
      byDepartment,
      recentHires,
      housekeepingPerformance,
    },
  });
});

module.exports = {
  dailyReport,
  weeklyReport,
  monthlyReport,
  annualReport,
  revenueReport,
  bookingReport,
  occupancyReport,
  employeeReport,
};
