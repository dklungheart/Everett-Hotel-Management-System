/* ============================================================
   EVERETT HOTEL MANAGEMENT SYSTEM
   Premium Utility Functions
   Version: 2.0.0
   ============================================================ */

const Utils = {
  /* --------------------------------------------------------
     DATE & TIME FORMATTING
     -------------------------------------------------------- */
  formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  },

  formatCurrency(amount) {
    if (amount === null || amount === undefined) return 'KSh 0';
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  },

  formatDateTime(datetime) {
    if (!datetime) return '';
    const d = new Date(datetime);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  },

  formatTime(time) {
    if (!time) return '';
    const d = new Date(time);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  },

  formatDateShort(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  },

  formatDateRange(start, end) {
    if (!start || !end) return '';
    const s = new Date(start);
    const e = new Date(end);
    const sameYear = s.getFullYear() === e.getFullYear();
    const sameMonth = sameYear && s.getMonth() === e.getMonth();

    if (sameMonth) {
      return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { day: 'numeric', year: 'numeric' })}`;
    }
    if (sameYear) {
      return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  },

  timeAgo(date) {
    if (!date) return '';
    const now = new Date();
    const past = new Date(date);
    const diffMs = now - past;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);
    const diffWeek = Math.floor(diffDay / 7);
    const diffMonth = Math.floor(diffDay / 30);
    const diffYear = Math.floor(diffDay / 365);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? 's' : ''} ago`;
    if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
    if (diffWeek < 4) return `${diffWeek} week${diffWeek > 1 ? 's' : ''} ago`;
    if (diffMonth < 12) return `${diffMonth} month${diffMonth > 1 ? 's' : ''} ago`;
    return `${diffYear} year${diffYear > 1 ? 's' : ''} ago`;
  },

  /* --------------------------------------------------------
     FUNCTION UTILITIES
     -------------------------------------------------------- */
  debounce(fn, delay = CONFIG.DEBOUNCE_DELAY) {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
  },

  throttle(fn, delay = CONFIG.THROTTLE_DELAY) {
    let lastCall = 0;
    let timeoutId;
    return function (...args) {
      const now = Date.now();
      const remaining = delay - (now - lastCall);
      clearTimeout(timeoutId);
      if (remaining <= 0) {
        lastCall = now;
        fn.apply(this, args);
      } else {
        timeoutId = setTimeout(() => {
          lastCall = Date.now();
          fn.apply(this, args);
        }, remaining);
      }
    };
  },

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },

  /* --------------------------------------------------------
     TOAST NOTIFICATIONS
     -------------------------------------------------------- */
  showToast(message, type = 'info') {
    const container = this.getToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
      success: '<i class="fas fa-check-circle"></i>',
      error: '<i class="fas fa-times-circle"></i>',
      warning: '<i class="fas fa-exclamation-triangle"></i>',
      info: '<i class="fas fa-info-circle"></i>',
    };

    toast.innerHTML = `
      <div class="toast-content">
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-message">${message}</span>
      </div>
      <button class="toast-close" onclick="this.parentElement.remove()">
        <i class="fas fa-times"></i>
      </button>
    `;

    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add('toast-show');
    });

    setTimeout(() => {
      toast.classList.remove('toast-show');
      setTimeout(() => toast.remove(), 300);
    }, CONFIG.TOAST_DURATION);
  },

  showSuccess(msg) {
    this.showToast(msg, 'success');
  },

  showError(msg) {
    this.showToast(msg, 'error');
  },

  showWarning(msg) {
    this.showToast(msg, 'warning');
  },

  showInfo(msg) {
    this.showToast(msg, 'info');
  },

  getToastContainer() {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    return container;
  },

  /* --------------------------------------------------------
     LOADING OVERLAY
     -------------------------------------------------------- */
  showLoading() {
    let overlay = document.getElementById('loading-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'loading-overlay';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(139,94,52,0.5);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);z-index:99998;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:1rem;';
      overlay.innerHTML = `
        <div class="page-loader-spinner" style="width:40px;height:40px;border-width:3px;"></div>
        <p style="color:#C8A96A;font-size:0.75rem;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;">Loading</p>
      `;
      document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';
  },

  hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
  },

  /* --------------------------------------------------------
     URL & QUERY UTILITIES
     -------------------------------------------------------- */
  getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  },

  setQueryParam(name, value) {
    const url = new URL(window.location);
    url.searchParams.set(name, value);
    window.history.replaceState({}, '', url);
  },

  removeQueryParam(name) {
    const url = new URL(window.location);
    url.searchParams.delete(name);
    window.history.replaceState({}, '', url);
  },

  /* --------------------------------------------------------
     UI HELPERS
     -------------------------------------------------------- */
  generateStars(rating, maxStars = 5) {
    let html = '<div class="star-rating">';
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    const emptyStars = maxStars - fullStars - (hasHalf ? 1 : 0);

    for (let i = 0; i < fullStars; i++) {
      html += '<i class="fas fa-star"></i>';
    }
    if (hasHalf) {
      html += '<i class="fas fa-star-half-alt"></i>';
    }
    for (let i = 0; i < emptyStars; i++) {
      html += '<i class="far fa-star empty"></i>';
    }
    html += `<span class="rating-number">${rating.toFixed(1)}</span></div>`;
    return html;
  },

  truncate(str, length = 100) {
    if (!str) return '';
    if (str.length <= length) return str;
    return str.substring(0, length).trim() + '...';
  },

  /* --------------------------------------------------------
     SWEETALERT2 WRAPPERS
     -------------------------------------------------------- */
  async confirmDialog(options = {}) {
    if (typeof Swal !== 'undefined') {
      return Swal.fire({
        title: options.title || 'Are you sure?',
        text: options.text || '',
        html: options.html || undefined,
        icon: options.icon || 'warning',
        showCancelButton: true,
        confirmButtonColor: '#C8A96A',
        cancelButtonColor: '#6c757d',
        confirmButtonText: options.confirmText || 'Yes',
        cancelButtonText: options.cancelText || 'Cancel',
        reverseButtons: true,
      });
    }

    return new Promise((resolve) => {
      const message = options.text || options.title || 'Are you sure?';
      const confirmed = window.confirm(message);
      resolve({ isConfirmed: confirmed });
    });
  },

  async alertSuccess(message, title = 'Success') {
    if (typeof Swal !== 'undefined') {
      return Swal.fire({ title, text: message, icon: 'success', confirmButtonColor: '#C8A96A' });
    }
    window.alert(`${title}: ${message}`);
  },

  async alertError(message, title = 'Error') {
    if (typeof Swal !== 'undefined') {
      return Swal.fire({ title, text: message, icon: 'error', confirmButtonColor: '#C8A96A' });
    }
    window.alert(`${title}: ${message}`);
  },

  async alertInfo(message, title = 'Info') {
    if (typeof Swal !== 'undefined') {
      return Swal.fire({ title, text: message, icon: 'info', confirmButtonColor: '#C8A96A' });
    }
    window.alert(`${title}: ${message}`);
  },

  /* --------------------------------------------------------
     CLIPBOARD
     -------------------------------------------------------- */
  async copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        this.showSuccess('Copied to clipboard');
        return true;
      } catch {
        return this._fallbackCopy(text);
      }
    }
    return this._fallbackCopy(text);
  },

  _fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0;';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      document.execCommand('copy');
      this.showSuccess('Copied to clipboard');
      return true;
    } catch {
      this.showError('Failed to copy');
      return false;
    } finally {
      textarea.remove();
    }
  },

  /* --------------------------------------------------------
     SCROLL UTILITIES
     -------------------------------------------------------- */
  scrollToElement(selector) {
    const el = document.querySelector(selector);
    if (!el) return;
    const offsetTop = el.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top: offsetTop, behavior: 'smooth' });
  },

  /* --------------------------------------------------------
     ANIMATIONS
     -------------------------------------------------------- */
  animateCounter(element, target, duration = 2000) {
    const start = 0;
    const startTime = performance.now();

    const step = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(start + (target - start) * eased);
      element.textContent = current.toLocaleString();
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        element.textContent = target.toLocaleString();
      }
    };

    requestAnimationFrame(step);
  },

  /* --------------------------------------------------------
     IMAGE UTILITIES
     -------------------------------------------------------- */
  preloadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  },

  /* --------------------------------------------------------
     VALIDATION & FORMATTING
     -------------------------------------------------------- */
  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input.replace(/[<>]/g, '');
  },

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  isValidPhone(phone) {
    return /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}$/.test(phone);
  },

  capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  slugify(text) {
    return text
      .toString()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  },

  /* --------------------------------------------------------
     GENERAL HELPERS
     -------------------------------------------------------- */
  generateId() {
    return '_' + Math.random().toString(36).substring(2, 11);
  },

  daysBetween(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diff = Math.abs(d2 - d1);
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  },

  getInitials(name) {
    if (!name) return '?';
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  },

  getRoomStatusColor(status) {
    const colors = {
      available: '#16A34A',
      occupied: '#DC2626',
      maintenance: '#D97706',
      reserved: '#2563EB',
      cleaning: '#6f42c1',
    };
    return colors[status] || '#78716C';
  },

  getBookingStatusColor(status) {
    const colors = {
      pending: '#D97706',
      confirmed: '#2563EB',
      checked_in: '#16A34A',
      checked_out: '#78716C',
      cancelled: '#DC2626',
    };
    return colors[status] || '#78716C';
  },

  getPaymentStatusColor(status) {
    const colors = {
      pending: '#D97706',
      completed: '#16A34A',
      failed: '#DC2626',
      refunded: '#6f42c1',
    };
    return colors[status] || '#78716C';
  },
};
