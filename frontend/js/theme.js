/* ============================================================
   EVERETT HOTEL MANAGEMENT SYSTEM
   Premium Theme Manager
   Version: 2.0.0
   ============================================================ */

const Theme = {
  _mediaQuery: null,
  _listeners: [],

  /**
   * Get the stored theme or detect system preference.
   */
  getTheme() {
    const stored = localStorage.getItem(CONFIG.THEME_KEY);
    if (stored) return stored;
    return this._getSystemPreference();
  },

  /**
   * Get system color scheme preference.
   */
  _getSystemPreference() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  },

  /**
   * Set and persist a theme.
   */
  setTheme(theme) {
    localStorage.setItem(CONFIG.THEME_KEY, theme);
    this.applyTheme(theme);
  },

  /**
   * Toggle between light and dark.
   */
  toggleTheme() {
    const current = this.getTheme();
    const next = current === 'light' ? 'dark' : 'light';
    this.setTheme(next);
  },

  /**
   * Alias used by inline toggle buttons across public pages.
   */
  toggle() {
    return this.toggleTheme();
  },

  /**
   * Apply theme to the DOM without persisting.
   */
  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);

    this._updateToggleButtons(theme);
    this._updateThemeColor(theme);
    document.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
  },

  /**
   * Update all toggle button icons and aria labels.
   */
  _updateToggleButtons(theme) {
    const toggleBtns = document.querySelectorAll('.theme-toggle');
    toggleBtns.forEach((btn) => {
      btn.setAttribute('aria-label', `Switch to ${theme === 'light' ? 'dark' : 'light'} mode`);
    });
  },

  /**
   * Update the meta theme-color tag for mobile browsers.
   */
  _updateThemeColor(theme) {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.content = theme === 'dark' ? '#211A14' : '#8B5E34';
    }
  },

  /**
   * Listen to system preference changes and apply if user hasn't manually set one.
   */
  _watchSystemPreference() {
    if (!window.matchMedia) return;

    this._mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handler = (e) => {
      const stored = localStorage.getItem(CONFIG.THEME_KEY);
      if (!stored) {
        this.applyTheme(e.matches ? 'dark' : 'light');
      }
    };

    if (this._mediaQuery.addEventListener) {
      this._mediaQuery.addEventListener('change', handler);
    } else if (this._mediaQuery.addListener) {
      this._mediaQuery.addListener(handler);
    }
  },

  /**
   * Bind click handlers for all theme toggle buttons.
   */
  _bindToggleEvents() {
    document.addEventListener('click', (e) => {
      const toggleBtn = e.target.closest('.theme-toggle');
      if (toggleBtn) {
        e.preventDefault();
        this.toggleTheme();
      }
    });
  },

  /**
   * Initialize theme on load — called before paint to avoid flash.
   */
  init() {
    const saved = this.getTheme();
    this.applyTheme(saved);
    this._watchSystemPreference();
    this._bindToggleEvents();
  },
};

/* Apply theme immediately before DOMContentLoaded to prevent FOUC */
(function () {
  Theme.init();
})();
