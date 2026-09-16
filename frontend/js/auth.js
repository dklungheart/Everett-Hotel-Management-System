const Auth = {
  getFrontendBase() {
    const path = window.location.pathname || '/';
    const m = path.match(/^(.*?)\/(admin|receptionist|employee)\//);
    if (m) return (m[1] ? m[1] + '/' : '/');
    return path.slice(0, path.lastIndexOf('/') + 1);
  },

  loginUrl() {
    return this.getFrontendBase() + 'login.html';
  },

  removeUserKey() {
    localStorage.removeItem(CONFIG.USER_KEY);
  },

  isLoggedIn() {
    return this.getCurrentUser() !== null;
  },

  getCurrentUser() {
    try {
      const userData = localStorage.getItem(CONFIG.USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch {
      return null;
    }
  },

  setCurrentUser(user) {
    localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(user));
  },

  async login(email, password) {
    const response = await api.login(email, password);
    const payload = response.data || response;

    if (payload.user) {
      this.setCurrentUser(payload.user);
    }

    return payload;
  },

  async register(data) {
    const response = await api.register(data);
    const payload = response.data || response;

    if (payload.user) {
      this.setCurrentUser(payload.user);
    }

    return payload;
  },

  async forgotPassword(email) {
    return api.forgotPassword(email);
  },

  async resetPassword(token, password) {
    return api.resetPassword(token, password);
  },

  async logout() {
    try {
      await api.logout();
    } catch {
      // Proceed with local logout even if API call fails
    } finally {
      this.removeUserKey();
      window.location.href = this.loginUrl();
    }
  },

  isAdmin() {
    const user = this.getCurrentUser();
    return user && (user.role === CONFIG.ROLES.ADMIN || user.role === CONFIG.ROLES.SUPER_ADMIN);
  },

  isReceptionist() {
    const user = this.getCurrentUser();
    return user && user.role === CONFIG.ROLES.RECEPTIONIST;
  },

  isCustomer() {
    const user = this.getCurrentUser();
    return user && user.role === CONFIG.ROLES.CUSTOMER;
  },

  hasRole(role) {
    const user = this.getCurrentUser();
    return user && user.role === role;
  },

  guard() {
    if (!this.isLoggedIn()) {
      window.location.href = this.loginUrl();
      return false;
    }
    return true;
  },

  adminGuard() {
    if (!this.isLoggedIn()) {
      window.location.href = this.loginUrl();
      return false;
    }
    if (!this.isAdmin()) {
      window.location.href = this.loginUrl();
      return false;
    }
    return true;
  },

  receptionistGuard() {
    if (!this.isLoggedIn()) {
      window.location.href = this.loginUrl();
      return false;
    }
    const user = this.getCurrentUser();
    if (user && (user.role === CONFIG.ROLES.ADMIN || user.role === CONFIG.ROLES.SUPER_ADMIN)) {
      window.location.href = this.getFrontendBase() + 'admin/dashboard.html';
      return false;
    }
    if (!this.isReceptionist()) {
      window.location.href = this.loginUrl();
      return false;
    }
    return true;
  },

  isStaff() {
    const user = this.getCurrentUser();
    return user && CONFIG.STAFF_ROLES.includes(user.role);
  },

  employeeGuard() {
    if (!this.isLoggedIn()) {
      window.location.href = this.loginUrl();
      return false;
    }
    const user = this.getCurrentUser();
    if (user && (user.role === CONFIG.ROLES.ADMIN || user.role === CONFIG.ROLES.SUPER_ADMIN)) {
      window.location.href = this.getFrontendBase() + 'admin/dashboard.html';
      return false;
    }
    if (!this.isStaff()) {
      window.location.href = this.loginUrl();
      return false;
    }
    return true;
  },

  guestGuard() {
    if (this.isLoggedIn()) {
      window.location.href = 'index.html';
      return false;
    }
    return true;
  },

  async refreshUser() {
    if (!this.isLoggedIn()) return null;

    try {
      const response = await api.getMe();
      const user = (response.data && response.data.user) || response.user || response.data;
      if (user) {
        this.setCurrentUser(user);
        return user;
      }
      return response;
    } catch {
      this.removeUserKey();
      return null;
    }
  },

  init() {
    if (this.isLoggedIn()) {
      this.refreshUser();
    }
  },
};