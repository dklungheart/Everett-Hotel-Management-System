const { query, queryOne } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');

const getExecutiveDashboard = asyncHandler(async (req, res) => {
  const todayStats = await queryOne(`
    SELECT
      (SELECT COUNT(*) FROM bookings WHERE DATE(created_at) = CURDATE()) AS todayBookings,
      (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed' AND DATE(paid_at) = CURDATE()) AS todayRevenue,
      (SELECT COUNT(*) FROM rooms WHERE status = 'available') AS availableRooms,
      (SELECT COUNT(*) FROM rooms WHERE status = 'occupied') AS occupiedRooms,
      (SELECT COUNT(*) FROM rooms WHERE status = 'maintenance') AS maintenanceRooms
  `);

  const totalRooms = await queryOne('SELECT COUNT(*) AS total FROM rooms');
  const occupancyRate = totalRooms.total > 0
    ? ((todayStats.occupiedRooms / totalRooms.total) * 100).toFixed(1)
    : 0;

  const weeklyRevenue = await query(`
    SELECT DATE(paid_at) AS date, SUM(amount) AS revenue
    FROM payments WHERE status = 'completed'
    AND paid_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    GROUP BY DATE(paid_at) ORDER BY date ASC
  `);

  const monthlyRevenue = await query(`
    SELECT DATE_FORMAT(paid_at, '%Y-%m') AS month, SUM(amount) AS revenue, COUNT(*) AS count
    FROM payments WHERE status = 'completed'
    AND paid_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
    GROUP BY DATE_FORMAT(paid_at, '%Y-%m') ORDER BY month ASC
  `);

  const recentBookings = await query(`
    SELECT b.*, u.first_name, u.last_name, r.room_number, rc.name AS room_category
    FROM bookings b
    JOIN users u ON b.user_id = u.id
    JOIN rooms r ON b.room_id = r.id
    JOIN room_categories rc ON r.category_id = rc.id
    ORDER BY b.created_at DESC LIMIT 10
  `);

  const pendingPayments = await query(`
    SELECT p.*, b.booking_reference, u.first_name, u.last_name, u.phone
    FROM payments p
    JOIN bookings b ON p.booking_id = b.id
    JOIN users u ON p.user_id = u.id
    WHERE p.status = 'pending'
    ORDER BY p.created_at DESC LIMIT 5
  `);

  const roomBookings = await query(`
    SELECT rc.name AS category, COUNT(b.id) AS bookingCount, COALESCE(SUM(b.final_amount), 0) AS revenue
    FROM room_categories rc
    LEFT JOIN rooms r ON r.category_id = rc.id
    LEFT JOIN bookings b ON b.room_id = r.id AND b.status IN ('confirmed', 'checked_in', 'checked_out')
    GROUP BY rc.id, rc.name
    ORDER BY revenue DESC
  `);

  const paymentMethods = await query(`
    SELECT method, COUNT(*) AS count, SUM(amount) AS total
    FROM payments WHERE status = 'completed'
    GROUP BY method ORDER BY total DESC
  `);

  const monthlyBookings = await query(`
    SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS count
    FROM bookings WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
    GROUP BY DATE_FORMAT(created_at, '%Y-%m') ORDER BY month ASC
  `);

  const totalRevenue = await queryOne(
    "SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE status = 'completed'"
  );
  const totalBookings = await queryOne('SELECT COUNT(*) AS total FROM bookings');
  const totalGuests = await queryOne('SELECT COUNT(DISTINCT user_id) AS total FROM bookings');

  res.status(200).json({
    success: true,
    data: {
      today: {
        bookings: todayStats.todayBookings,
        revenue: todayStats.todayRevenue,
        availableRooms: todayStats.availableRooms,
        occupiedRooms: todayStats.occupiedRooms,
        maintenanceRooms: todayStats.maintenanceRooms,
        totalRooms: totalRooms.total,
        occupancyRate: parseFloat(occupancyRate),
      },
      revenue: {
        weekly: weeklyRevenue,
        monthly: monthlyRevenue,
        total: totalRevenue.total,
      },
      bookings: {
        recent: recentBookings,
        pendingPayments,
        monthly: monthlyBookings,
        total: totalBookings.total,
        totalGuests: totalGuests.total,
      },
      roomPerformance: roomBookings,
      paymentMethods,
    },
  });
});

const getOccupancyChart = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;

  const dailyOccupancy = await query(`
    SELECT DATE(check_in) AS date,
           COUNT(*) AS checkIns
    FROM bookings
    WHERE check_in >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
    AND status IN ('confirmed', 'checked_in', 'checked_out')
    GROUP BY DATE(check_in) ORDER BY date ASC
  `, [parseInt(days, 10)]);

  const dailyCheckouts = await query(`
    SELECT DATE(check_out) AS date,
           COUNT(*) AS checkOuts
    FROM bookings
    WHERE check_out >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
    AND status IN ('checked_in', 'checked_out')
    GROUP BY DATE(check_out) ORDER BY date ASC
  `, [parseInt(days, 10)]);

  res.status(200).json({
    success: true,
    data: {
      checkIns: dailyOccupancy,
      checkOuts: dailyCheckouts,
    },
  });
});

const getRevenueChart = asyncHandler(async (req, res) => {
  const { period = 'daily', startDate, endDate } = req.query;

  let dateFilter = '';
  const params = [];

  if (startDate) {
    dateFilter += ' AND paid_at >= ?';
    params.push(startDate);
  }
  if (endDate) {
    dateFilter += ' AND paid_at <= ?';
    params.push(endDate);
  }

  let dateFormat;
  let groupBy;

  switch (period) {
    case 'monthly':
      dateFormat = "DATE_FORMAT(paid_at, '%Y-%m')";
      groupBy = 'GROUP BY DATE_FORMAT(paid_at, "%Y-%m") ORDER BY DATE_FORMAT(paid_at, "%Y-%m") ASC';
      break;
    case 'yearly':
      dateFormat = "DATE_FORMAT(paid_at, '%Y')";
      groupBy = 'GROUP BY DATE_FORMAT(paid_at, "%Y") ORDER BY DATE_FORMAT(paid_at, "%Y") ASC';
      break;
    default:
      dateFormat = 'DATE(paid_at)';
      groupBy = 'GROUP BY DATE(paid_at) ORDER BY DATE(paid_at) ASC';
  }

  const revenueData = await query(`
    SELECT ${dateFormat} AS period,
           SUM(amount) AS revenue,
           COUNT(*) AS paymentCount,
           SUM(CASE WHEN method = 'mpesa' THEN amount ELSE 0 END) AS mpesaRevenue,
           SUM(CASE WHEN method != 'mpesa' THEN amount ELSE 0 END) AS otherRevenue
    FROM payments WHERE status = 'completed' ${dateFilter}
    ${groupBy}
  `, params);

  const totalRevenue = revenueData.reduce((sum, row) => sum + parseFloat(row.revenue), 0);

  res.status(200).json({
    success: true,
    data: {
      chart: revenueData,
      total: totalRevenue,
    },
  });
});

module.exports = {
  getExecutiveDashboard,
  getOccupancyChart,
  getRevenueChart,
};
