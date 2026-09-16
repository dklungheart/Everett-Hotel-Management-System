const CONFIG = {
  API_URL: 'http://localhost:5000/api',

  USER_KEY: 'everett_user',
  THEME_KEY: 'everett_theme',

  TOAST_DURATION: 4000,
  DEBOUNCE_DELAY: 300,
  THROTTLE_DELAY: 200,

  ROLES: {
    ADMIN: 'admin',
    SUPER_ADMIN: 'super_admin',
    RECEPTIONIST: 'receptionist',
    HOUSEKEEPING: 'housekeeping',
    RESTAURANT_STAFF: 'restaurant_staff',
    MANAGER: 'manager',
    CUSTOMER: 'customer',
  },

  STAFF_ROLES: ['receptionist', 'housekeeping', 'restaurant_staff', 'manager'],

  BOOKING_STATUSES: {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    CHECKED_IN: 'checked_in',
    CHECKED_OUT: 'checked_out',
    CANCELLED: 'cancelled',
  },

  PAYMENT_STATUSES: {
    PENDING: 'pending',
    COMPLETED: 'completed',
    FAILED: 'failed',
    REFUNDED: 'refunded',
  },
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
