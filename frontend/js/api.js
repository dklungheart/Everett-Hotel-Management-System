class ApiService {
  constructor() {
    this.isRefreshing = false;
    this.failedQueue = [];
  }

  processQueue(error, options = null) {
    this.failedQueue.forEach((prom) => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(options);
      }
    });
    this.failedQueue = [];
  }

  clearSession() {
    if (typeof Auth !== 'undefined' && Auth.removeUserKey) {
      Auth.removeUserKey();
    } else {
      try {
        localStorage.removeItem(CONFIG.USER_KEY);
      } catch (e) { /* ignore */ }
    }
  }

  async request(endpoint, options = {}) {
    const url = `${CONFIG.API_URL}${endpoint}`;

    const headers = {
      ...options.headers,
    };

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const config = {
      ...options,
      headers,
      credentials: 'include',
    };

    if (config.body && !(config.body instanceof FormData)) {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);

      if (response.status === 204) {
        return { success: true };
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401 && !options._retry) {
          return this.handleUnauthorized(endpoint, options);
        }

        const error = new Error(data.message || data.error || `Request failed with status ${response.status}`);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (error) {
      if (error.status) {
        throw error;
      }

      const networkError = new Error('Network error. Please check your connection and try again.');
      networkError.status = 0;
      throw networkError;
    }
  }

  async handleUnauthorized(endpoint, options) {
    if (this.isRefreshing) {
      return new Promise((resolve, reject) => {
        this.failedQueue.push({ resolve, reject });
      }).then((retryOptions) => {
        retryOptions = retryOptions || options;
        retryOptions._retry = true;
        return this.request(endpoint, retryOptions);
      });
    }

    this.isRefreshing = true;

    try {
      const refreshResponse = await fetch(`${CONFIG.API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (refreshResponse.ok) {
        this.processQueue(null, options);
        options._retry = true;
        return this.request(endpoint, options);
      }

      this.processQueue(new Error('Session expired'), null);
      this.clearSession();
      throw new Error('Session expired. Please log in again.');
    } catch (error) {
      if (!error.status) {
        this.processQueue(error, null);
      }
      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }

  get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  post(endpoint, body = {}) {
    return this.request(endpoint, { method: 'POST', body });
  }

  put(endpoint, body = {}) {
    return this.request(endpoint, { method: 'PUT', body });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  upload(endpoint, formData) {
    return this.request(endpoint, {
      method: 'POST',
      body: formData,
      headers: {},
    });
  }

  uploadPut(endpoint, formData) {
    return this.request(endpoint, {
      method: 'PUT',
      body: formData,
      headers: {},
    });
  }

  // ─── Auth ───────────────────────────────────────────
  login(email, password) {
    return this.post('/auth/login', { email, password });
  }

  register(data) {
    return this.post('/auth/register', data);
  }

  logout() {
    return this.post('/auth/logout');
  }

  forgotPassword(email) {
    return this.post('/auth/forgot-password', { email });
  }

  resetPassword(token, password) {
    return this.post('/auth/reset-password', { token, password });
  }

  verifyEmail(token) {
    return this.get(`/auth/verify-email?token=${token}`);
  }

  getMe() {
    return this.get('/auth/me');
  }

  // ─── Rooms ──────────────────────────────────────────
  getRooms(params = {}) {
    return this.get('/rooms', params);
  }

  getAvailableRooms(params = {}) {
    return this.get('/rooms/available', params);
  }

  getRoomById(id) {
    return this.get(`/rooms/${id}`);
  }

  getRoomCategories() {
    return this.get('/rooms/categories');
  }

  // ─── Bookings ───────────────────────────────────────
  createBooking(data) {
    return this.post('/bookings', data);
  }

  getMyBookings(params = {}) {
    return this.get('/bookings/my', params);
  }

  getBookingById(id) {
    return this.get(`/bookings/${id}`);
  }

  cancelBooking(id) {
    return this.put(`/bookings/${id}/cancel`);
  }

  checkBookingAvailability(params) {
    return this.get('/bookings/availability', params);
  }

  // ─── Payments ───────────────────────────────────────
  createPayment(data) {
    return this.post('/payments', data);
  }

  getMyPayments(params = {}) {
    return this.get('/payments/my', params);
  }

  getPaymentById(id) {
    return this.get(`/payments/${id}`);
  }

  // ─── Invoices ───────────────────────────────────────
  getMyInvoices(params = {}) {
    return this.get('/invoices/my', params);
  }

  getInvoiceById(id) {
    return this.get(`/invoices/${id}`);
  }

  generateInvoice(bookingId) {
    return this.post('/invoices/generate', { bookingId });
  }

  // ─── Reviews ────────────────────────────────────────
  createReview(data) {
    return this.post('/reviews', data);
  }

  getMyReviews(params = {}) {
    return this.get('/reviews/my', params);
  }

  getAllReviews(params = {}) {
    return this.get('/reviews', params);
  }

  // ─── Users ──────────────────────────────────────────
  getProfile() {
    return this.get('/users/profile');
  }

  updateProfile(data) {
    return this.put('/users/profile', data);
  }

  uploadPhoto(formData) {
    return this.upload('/users/photo', formData);
  }

  // ─── Notifications ──────────────────────────────────
  getNotifications(params = {}) {
    return this.get('/notifications', params);
  }

  markNotificationRead(id) {
    return this.put(`/notifications/${id}/read`);
  }

  markAllNotificationsRead() {
    return this.put('/notifications/read-all');
  }

  deleteNotification(id) {
    return this.delete(`/notifications/${id}`);
  }

  // ─── Contact ────────────────────────────────────────
  sendContact(data) {
    return this.post('/contact', data);
  }

  // ─── Newsletter ─────────────────────────────────────
  subscribeNewsletter(email) {
    return this.post('/newsletter/subscribe', { email });
  }

  // ─── Admin: Dashboard ───────────────────────────────
  getAdminDashboard() {
    return this.get('/admin/dashboard');
  }

  // ─── Admin: Rooms ───────────────────────────────────
  adminGetRooms(params = {}) {
    return this.get('/admin/rooms', params);
  }

  adminCreateRoom(data) {
    return this.post('/admin/rooms', data);
  }

  adminUpdateRoom(id, data) {
    return this.put(`/admin/rooms/${id}`, data);
  }

  adminDeleteRoom(id) {
    return this.delete(`/admin/rooms/${id}`);
  }

  adminUploadRoomImage(id, formData) {
    return this.upload(`/admin/rooms/${id}/images`, formData);
  }

  adminDeleteRoomImage(roomId, imageId) {
    return this.delete(`/admin/rooms/${roomId}/images/${imageId}`);
  }

  // ─── Admin: Bookings ────────────────────────────────
  adminGetBookings(params = {}) {
    return this.get('/admin/bookings', params);
  }

  adminGetBookingById(id) {
    return this.get(`/admin/bookings/${id}`);
  }

  adminUpdateBooking(id, data) {
    return this.put(`/admin/bookings/${id}`, data);
  }

  adminUpdateBookingStatus(id, status) {
    return this.put(`/admin/bookings/${id}/status`, { status });
  }

  adminCheckIn(id) {
    return this.put(`/admin/bookings/${id}/check-in`);
  }

  adminCheckOut(id) {
    return this.put(`/admin/bookings/${id}/check-out`);
  }

  // ─── Admin: Payments ────────────────────────────────
  adminGetPayments(params = {}) {
    return this.get('/admin/payments', params);
  }

  adminGetPaymentById(id) {
    return this.get(`/admin/payments/${id}`);
  }

  adminUpdatePaymentStatus(id, status) {
    return this.put(`/admin/payments/${id}/status`, { status });
  }

  adminProcessRefund(id) {
    return this.post(`/admin/payments/${id}/refund`);
  }

  // ─── Admin: Employees ──────────────────────────────
  adminGetEmployees(params = {}) {
    return this.get('/employees', params);
  }

  adminCreateEmployee(data) {
    return this.post('/employees', data);
  }

  adminUpdateEmployee(id, data) {
    return this.put(`/employees/${id}`, data);
  }

  adminDeleteEmployee(id) {
    return this.delete(`/employees/${id}`);
  }

  adminGetEmployeeById(id) {
    return this.get(`/employees/${id}`);
  }

  // ─── Admin: Restaurant Menu ──────────────────────────
  adminGetMenuItems(params = {}) {
    return this.get('/restaurant/menu', params);
  }

  adminCreateMenuItem(data) {
    return this.post('/restaurant/menu', data);
  }

  adminUpdateMenuItem(id, data) {
    return this.put(`/restaurant/menu/${id}`, data);
  }

  adminDeleteMenuItem(id) {
    return this.delete(`/restaurant/menu/${id}`);
  }

  // ─── Admin: Reviews ─────────────────────────────────
  adminGetReviews(params = {}) {
    return this.get('/reviews/admin', params);
  }

  adminUpdateReviewStatus(id, status) {
    return this.put(`/reviews/admin/${id}/status`, { status });
  }

  adminToggleReviewFeature(id) {
    return this.put(`/reviews/admin/${id}/feature`);
  }

  adminDeleteReview(id) {
    return this.delete(`/reviews/admin/${id}`);
  }

  adminReplyToReview(id, response) {
    return this.put(`/reviews/admin/${id}/respond`, { response });
  }

  // ─── Attendance (Biometric) ─────────────────────────
  attendanceClockIn(formData) {
    return this.upload('/attendance/clock-in', formData);
  }

  attendanceClockOut(formData) {
    return this.upload('/attendance/clock-out', formData);
  }

  getMyAttendance() {
    return this.get('/attendance/my-status');
  }

  adminGetAttendance(params = {}) {
    return this.get('/attendance/admin', params);
  }

  adminGetAttendanceStats(params = {}) {
    return this.get('/attendance/admin/stats', params);
  }

  // ─── Admin: Contacts ────────────────────────────────
  adminGetContacts(params = {}) {
    return this.get('/admin/contacts', params);
  }

  adminGetContactById(id) {
    return this.get(`/admin/contacts/${id}`);
  }

  adminUpdateContactStatus(id, status) {
    return this.put(`/admin/contacts/${id}/status`, { status });
  }

  adminReplyToContact(id, reply) {
    return this.put(`/admin/contacts/${id}/reply`, { reply });
  }

  // ─── Admin: Users ──────────────────────────────────
  adminGetUsers(params = {}) {
    return this.get('/admin/users', params);
  }

  adminGetUserById(id) {
    return this.get(`/admin/users/${id}`);
  }

  adminUpdateUserRole(id, role) {
    return this.put(`/admin/users/${id}/role`, { role });
  }

  adminDeleteUser(id) {
    return this.delete(`/admin/users/${id}`);
  }

  // ─── Admin: Settings ────────────────────────────────
  adminGetSettings() {
    return this.get('/admin/settings');
  }

  adminUpdateSettings(data) {
    return this.put('/admin/settings', data);
  }

  // ─── Admin: Reports ─────────────────────────────────
  adminGetRevenueReport(params = {}) {
    return this.get('/admin/reports/revenue', params);
  }

  adminGetOccupancyReport(params = {}) {
    return this.get('/admin/reports/occupancy', params);
  }

  adminGetBookingReport(params = {}) {
    return this.get('/admin/reports/bookings', params);
  }

  adminExportReport(type, params = {}) {
    return this.get(`/admin/reports/export/${type}`, params);
  }

  // ─── Admin: Newsletter ──────────────────────────────
  adminGetSubscribers(params = {}) {
    return this.get('/admin/newsletter/subscribers', params);
  }

  adminSendNewsletter(data) {
    return this.post('/admin/newsletter/send', data);
  }

  adminDeleteSubscriber(id) {
    return this.delete(`/admin/newsletter/subscribers/${id}`);
  }
}

const api = new ApiService();

/**
 * Download an authenticated export file (PDF/Excel) from the API.
 * Uses httpOnly session cookies (sent via credentials: 'include'); no token stored in JS.
 * @param {string} url - Full API export URL
 * @param {string} filename - Suggested download filename
 */
async function downloadExport(url, filename) {
  const res = await fetch(url, {
    credentials: 'include',
  });
  if (!res.ok) {
    let message = 'Export failed (' + res.status + ').';
    try {
      const json = await res.json();
      if (json && json.message) message = json.message;
    } catch (e) { /* ignore non-JSON error bodies */ }
    throw new Error(message);
  }
  const blob = await res.blob();
  const link = document.createElement('a');
  const objectUrl = URL.createObjectURL(blob);
  link.href = objectUrl;
  link.download = filename || 'export.pdf';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
}
