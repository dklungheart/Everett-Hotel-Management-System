/* ============================================================
   EVERETT HOTEL — Component System
   Reusable HTML component renderers (global Components object)
   ============================================================ */

const Components = {

  /* ─────────────────────────────────────────────
     NAVBAR
     ───────────────────────────────────────────── */
  navbar(user = null) {
    const currentUser = user || (typeof Auth !== 'undefined' ? Auth.getCurrentUser() : null);
    const isAdmin = typeof Auth !== 'undefined' && Auth.isAdmin();
    const currentPath = window.location.pathname;
    const isPage = (file) => currentPath.endsWith(file) || currentPath.includes('/' + file);

    const navLinks = [
      { label: 'Home', href: 'index.html', check: 'index.html' },
      { label: 'About', href: 'about.html', check: 'about.html' },
      { label: 'Rooms', href: 'rooms.html', check: 'rooms.html' },
      { label: 'Services', href: 'services.html', check: 'services.html' },
      { label: 'Gallery', href: 'gallery.html', check: 'gallery.html' },
      { label: 'Reviews', href: 'testimonials.html', check: 'testimonials.html' },
      { label: 'Contact', href: 'contact.html', check: 'contact.html' },
    ];

    const activeClass = (file) => isPage(file) ? ' active' : '';

    let userMenuHtml = '';
    if (currentUser) {
      const initials = typeof Utils !== 'undefined'
        ? Utils.getInitials(currentUser.name || currentUser.firstName)
        : (currentUser.name || currentUser.firstName || 'U').charAt(0).toUpperCase();
      const displayName = currentUser.name || ((currentUser.firstName || '') + ' ' + (currentUser.lastName || '')).trim();
      const photo = currentUser.photo || currentUser.avatar || '';

      userMenuHtml = `
        <div class="nav-dropdown">
          <button class="nav-user-btn" data-dropdown="nav-user-dropdown" aria-haspopup="true" aria-expanded="false">
            ${photo
              ? `<img src="${Utils.escapeHtml(photo)}" alt="${Utils.escapeHtml(displayName)}" class="nav-user-avatar" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:2px solid var(--gold);">`
              : `<span class="nav-user-initials" style="width:36px;height:36px;border-radius:50%;background:var(--gold);color:var(--navy);display:inline-flex;align-items:center;justify-content:center;font-size:var(--text-sm);font-weight:700;">${initials}</span>`
            }
            <i class="fas fa-chevron-down" style="font-size:10px;color:rgba(255,255,255,0.6);margin-left:6px;"></i>
          </button>
          <div class="nav-dropdown-menu" id="nav-user-dropdown">
            <div style="padding:var(--space-4) var(--space-5);border-bottom:1px solid var(--gray-100);">
              <div style="font-weight:700;font-size:var(--text-sm);color:var(--navy);">${Utils.escapeHtml(displayName)}</div>
              <div style="font-size:var(--text-xs);color:var(--gray-500);text-transform:capitalize;">${Utils.escapeHtml(currentUser.role || 'customer')}</div>
            </div>
            <a href="profile.html" class="nav-dropdown-item"><i class="fas fa-user" style="width:16px;"></i> My Profile</a>
            ${!isAdmin ? `
              <a href="booking.html" class="nav-dropdown-item"><i class="fas fa-calendar-alt" style="width:16px;"></i> My Bookings</a>
            ` : `
              <a href="admin/dashboard.html" class="nav-dropdown-item"><i class="fas fa-tachometer-alt" style="width:16px;"></i> Admin Dashboard</a>
            `}
            <div style="height:1px;background:var(--gray-100);margin:var(--space-1) 0;"></div>
            <a href="#" class="nav-dropdown-item" style="color:var(--danger);" onclick="Auth.logout(); return false;"><i class="fas fa-sign-out-alt" style="width:16px;"></i> Logout</a>
          </div>
        </div>`;
    } else {
      userMenuHtml = `
        <a href="login.html" class="btn btn-outline-gold btn-sm">Login</a>
        <a href="booking.html" class="btn btn-primary btn-sm">Book Now</a>`;
    }

    const mobileLinks = navLinks.map((l) =>
      `<a href="${l.href}" class="nav-link${activeClass(l.check)}">${l.label}</a>`
    ).join('');

    const desktopLinks = navLinks.map((l) =>
      `<a href="${l.href}" class="nav-link${activeClass(l.check)}">${l.label}</a>`
    ).join('');

    return `
      <nav class="navbar" id="navbar">
        <div class="container">
          <a href="index.html" class="navbar-brand">
            <div class="navbar-brand-text">EVERETT <span>HOTEL</span></div>
          </a>

          <div class="navbar-nav" id="desktopNav">
            ${desktopLinks}
          </div>

          <div class="navbar-cta d-flex align-center gap-3">
            <button class="theme-toggle" id="themeToggle" aria-label="Toggle dark mode">
              <svg class="icon-moon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
              </svg>
              <svg class="icon-sun" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
              </svg>
            </button>
            ${userMenuHtml}
            <button class="navbar-toggler" id="navToggler" aria-label="Toggle navigation">
              <span></span><span></span><span></span>
            </button>
          </div>
        </div>
      </nav>

      <div class="navbar-mobile" id="mobileNav">
        ${mobileLinks}
        ${!currentUser ? '<a href="booking.html" class="btn btn-primary mt-4">Book Now</a>' : ''}
      </div>`;
  },

  initNavbar() {
    const navbar = document.getElementById('navbar');
    const toggler = document.getElementById('navToggler');
    const mobileNav = document.getElementById('mobileNav');

    if (navbar) {
      window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 60);
      }, { passive: true });
      if (window.scrollY > 60) navbar.classList.add('scrolled');
    }

    if (toggler && mobileNav) {
      toggler.addEventListener('click', () => {
        toggler.classList.toggle('active');
        mobileNav.classList.toggle('open');
        document.body.style.overflow = mobileNav.classList.contains('open') ? 'hidden' : '';
      });
      mobileNav.querySelectorAll('.nav-link, .btn').forEach((link) => {
        link.addEventListener('click', () => {
          toggler.classList.remove('active');
          mobileNav.classList.remove('open');
          document.body.style.overflow = '';
        });
      });
    }

    if (typeof Theme !== 'undefined') Theme.init();
  },

  /* ─────────────────────────────────────────────
     FOOTER
     ───────────────────────────────────────────── */
  footer() {
    const year = new Date().getFullYear();
    return `
      <footer class="footer">
        <div class="footer-main">
          <div class="container">
            <div class="footer-grid">
              <div class="footer-brand">
                <div class="footer-brand-logo">
                  <div class="footer-brand-name">EVERETT <span>HOTEL</span></div>
                </div>
                <p>A distinguished destination where timeless elegance meets modern luxury. Experience exceptional hospitality that exceeds every expectation.</p>
                <div class="footer-social">
                  <a href="#" class="footer-social-link" aria-label="Facebook"><i class="fa-brands fa-facebook-f"></i></a>
                  <a href="#" class="footer-social-link" aria-label="Instagram"><i class="fa-brands fa-instagram"></i></a>
                  <a href="#" class="footer-social-link" aria-label="Twitter"><i class="fa-brands fa-x-twitter"></i></a>
                  <a href="#" class="footer-social-link" aria-label="LinkedIn"><i class="fa-brands fa-linkedin-in"></i></a>
                </div>
              </div>

              <div>
                <h4 class="footer-column-title">Quick Links</h4>
                <div class="footer-links">
                  <a href="index.html" class="footer-link">Home</a>
                  <a href="about.html" class="footer-link">About Us</a>
                  <a href="rooms.html" class="footer-link">Rooms & Suites</a>
                  <a href="services.html" class="footer-link">Services</a>
                  <a href="gallery.html" class="footer-link">Gallery</a>
                  <a href="testimonials.html" class="footer-link">Guest Reviews</a>
                  <a href="contact.html" class="footer-link">Contact</a>
                </div>
              </div>

              <div>
                <h4 class="footer-column-title">Contact Info</h4>
                <div class="footer-links">
                  <div class="footer-link"><i class="fa-solid fa-location-dot" style="width:16px;color:var(--gold);"></i> Westlands, Nairobi, Kenya</div>
                  <a href="tel:+254700123456" class="footer-link"><i class="fa-solid fa-phone" style="width:16px;color:var(--gold);"></i> +254 700 123 456</a>
                  <a href="mailto:info@everetthotel.com" class="footer-link"><i class="fa-solid fa-envelope" style="width:16px;color:var(--gold);"></i> info@everetthotel.com</a>
                  <div class="footer-link"><i class="fa-solid fa-clock" style="width:16px;color:var(--gold);"></i> 24/7 Front Desk</div>
                </div>
              </div>

              <div>
                <h4 class="footer-column-title">Newsletter</h4>
                <p style="font-size:var(--text-sm);color:rgba(255,255,255,0.55);margin-bottom:var(--space-4);">Subscribe for exclusive offers and updates.</p>
                <div class="footer-newsletter">
                  <form class="footer-newsletter-form" onsubmit="Components.handleNewsletter(event)">
                    <input type="email" class="form-input" placeholder="Your email" required>
                    <button type="submit" class="btn btn-primary btn-sm"><i class="fa-solid fa-arrow-right"></i></button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="footer-bottom">
          <div class="container">
            <div class="footer-copyright">&copy; ${year} <a href="index.html">Everett Hotel</a>. All Rights Reserved.</div>
            <div class="footer-bottom-links">
              <a href="privacy-policy.html" class="footer-bottom-link">Privacy Policy</a>
              <a href="terms.html" class="footer-bottom-link">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>`;
  },

  /* ─────────────────────────────────────────────
     ROOM CARD
     ───────────────────────────────────────────── */
  roomCard(room) {
    const image = (room.images && room.images.length > 0)
      ? (room.images[0].url || room.images[0])
      : 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80';
    const price = room.price || room.basePrice || 0;
    const name = room.name || room.type || 'Room';
    const category = room.category || room.categoryName || '';
    const bedType = room.bedType || 'Queen Bed';
    const roomSize = room.size || room.roomSize || '35 m²';
    const capacity = room.capacity || room.maxGuests || 2;
    const roomId = room._id || room.id || '';

    const rawAmenities = (room.amenities || []).slice(0, 5);
    const amenityIcons = {
      wifi: 'fa-wifi', pool: 'fa-swimming-pool', spa: 'fa-spa', gym: 'fa-dumbbell',
      restaurant: 'fa-utensils', parking: 'fa-parking', ac: 'fa-snowflake',
      'air conditioning': 'fa-snowflake', tv: 'fa-tv', television: 'fa-tv',
      minobar: 'fa-glass-martini-alt', minibar: 'fa-glass-martini-alt',
      bathtub: 'fa-bath', 'room service': 'fa-concierge-bell',
      'room_service': 'fa-concierge-bell', laundry: 'fa-tshirt',
    };
    const amenityList = rawAmenities.map((a) => {
      const label = typeof a === 'string' ? a : (a.name || '');
      const icon = amenityIcons[label.toLowerCase()] || 'fa-check';
      return `<span class="room-amenity"><i class="fa-solid ${icon}"></i> ${Utils.escapeHtml(label)}</span>`;
    }).join('');

    return `
      <div class="room-card card-lift">
        <div class="room-card-image">
          <img src="${Utils.escapeHtml(image)}" alt="${Utils.escapeHtml(name)}" loading="lazy">
          ${category ? `<div class="room-card-badge">${Utils.escapeHtml(category)}</div>` : ''}
          <div class="gradient-overlay"></div>
          <div class="room-card-actions-overlay">
            <a href="rooms.html?id=${roomId}" class="btn btn-sm">View Details</a>
            <a href="booking.html?room=${roomId}" class="btn btn-sm">Book Now</a>
          </div>
        </div>
        <div class="room-card-body">
          <div class="room-card-type">${Utils.escapeHtml(category || 'Room')}</div>
          <h3 class="room-card-title">${Utils.escapeHtml(name)}</h3>
          <div style="display:flex;align-items:center;gap:var(--space-4);margin-bottom:var(--space-3);font-size:var(--text-sm);color:var(--gray-500);">
            <span><i class="fa-solid fa-bed" style="color:var(--gold);margin-right:4px;"></i> ${Utils.escapeHtml(bedType)}</span>
            <span><i class="fa-solid fa-ruler-combined" style="color:var(--gold);margin-right:4px;"></i> ${Utils.escapeHtml(roomSize)}</span>
          </div>
          <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-4);font-size:var(--text-sm);color:var(--gray-500);">
            <span><i class="fa-solid fa-user" style="color:var(--gold);"></i> ${capacity} Adults</span>
            ${room.childrenCapacity ? `<span><i class="fa-solid fa-child" style="color:var(--gold);"></i> ${room.childrenCapacity} Children</span>` : ''}
          </div>
          <div class="room-card-amenities">${amenityList}</div>
          <div class="room-card-footer">
            <div class="room-card-price">
              <span class="price-amount">${Utils.formatCurrency(price)}</span>
              <span class="price-period">per night</span>
            </div>
            <a href="booking.html?room=${roomId}" class="btn btn-primary btn-sm">Book Now</a>
          </div>
        </div>
      </div>`;
  },

  /* ─────────────────────────────────────────────
     STAT CARD
     ───────────────────────────────────────────── */
  statCard(number, label, icon) {
    const suffix = (typeof number === 'string' && /[\+\%K]/.test(number)) ? '' : '';
    return `
      <div class="stat-item" data-aos="fade-up">
        <div class="stat-icon"><i class="fa-solid ${Utils.escapeHtml(icon || 'fa-star')}"></i></div>
        <div class="stat-number" data-counter="${parseInt(number) || 0}" data-suffix="${suffix}">
          0<span class="counter-suffix">${suffix}</span>
        </div>
        <div class="stat-label">${Utils.escapeHtml(label || '')}</div>
        <div class="stat-divider"></div>
      </div>`;
  },

  /* ─────────────────────────────────────────────
     AMENITY CARD
     ───────────────────────────────────────────── */
  amenityCard(icon, title, description) {
    return `
      <div class="amenity-card" data-aos="fade-up">
        <div class="amenity-icon"><i class="fa-solid ${Utils.escapeHtml(icon || 'fa-star')}"></i></div>
        <h4>${Utils.escapeHtml(title || '')}</h4>
        <p>${Utils.escapeHtml(description || '')}</p>
      </div>`;
  },

  /* ─────────────────────────────────────────────
     BOOKING FORM
     ───────────────────────────────────────────── */
  bookingForm(rooms) {
    const today = new Date().toISOString().split('T')[0];
    let roomOptions = '<option value="">Select a Room</option>';
    if (rooms && rooms.length) {
      rooms.forEach((r) => {
        const roomId = r._id || r.id;
        const name = r.name || r.type || 'Room';
        const price = r.price || r.basePrice || 0;
        roomOptions += `<option value="${roomId}">${Utils.escapeHtml(name)} — ${Utils.formatCurrency(price)}/night</option>`;
      });
    }

    return `
      <form id="bookingForm" class="glass-card" onsubmit="Components.handleBooking(event)">
        <h3 style="font-family:var(--font-heading);margin-bottom:var(--space-8);"><i class="fa-solid fa-calendar-check" style="color:var(--gold);margin-right:var(--space-2);"></i> Book Your Stay</h3>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Room Type</label>
            <select class="form-select" name="roomId" required>${roomOptions}</select>
          </div>
          <div class="form-group">
            <label class="form-label">Promo Code</label>
            <div class="form-inline">
              <input type="text" class="form-input" name="promoCode" placeholder="Enter code" style="flex:1;">
              <button type="button" class="btn btn-outline-gold btn-sm" onclick="Components.applyPromo()">Apply</button>
            </div>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Check-in Date</label>
            <input type="date" class="form-input" name="checkIn" min="${today}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Check-out Date</label>
            <input type="date" class="form-input" name="checkOut" min="${today}" required>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Adults</label>
            <select class="form-select" name="adults" required>
              <option value="1">1 Adult</option>
              <option value="2" selected>2 Adults</option>
              <option value="3">3 Adults</option>
              <option value="4">4 Adults</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Children</label>
            <select class="form-select" name="children">
              <option value="0" selected>No Children</option>
              <option value="1">1 Child</option>
              <option value="2">2 Children</option>
              <option value="3">3 Children</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Special Requests</label>
          <textarea class="form-textarea" name="specialRequests" placeholder="Any special requirements or preferences..." rows="3"></textarea>
        </div>

        <div id="bookingSummary" style="display:none;padding:var(--space-4) var(--space-5);background:var(--gold-50);border:1px solid var(--gold-200);border-radius:var(--radius-lg);margin-bottom:var(--space-6);"></div>

        <button type="submit" class="btn btn-primary btn-lg w-100">
          <i class="fa-solid fa-calendar-check"></i> Confirm Booking
        </button>
      </form>`;
  },

  /* ─────────────────────────────────────────────
     PAGINATION
     ───────────────────────────────────────────── */
  pagination(currentPage, totalPages, onPageClick) {
    if (totalPages <= 1) return '';
    const callback = onPageClick || 'handlePageChange';
    let pages = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }

    const prevDisabled = currentPage === 1 ? ' disabled' : '';
    const nextDisabled = currentPage === totalPages ? ' disabled' : '';

    const pageItems = pages.map((p) => {
      if (p === '...') {
        return `<div class="pagination-ellipsis">&hellip;</div>`;
      }
      const active = p === currentPage ? ' active' : '';
      return `<div class="pagination-item${active}" onclick="${callback}(${p})">${p}</div>`;
    }).join('');

    return `
      <div class="pagination">
        <div class="pagination-item${prevDisabled}" onclick="${callback}(${currentPage - 1})">
          <i class="fa-solid fa-chevron-left"></i>
        </div>
        ${pageItems}
        <div class="pagination-item${nextDisabled}" onclick="${callback}(${currentPage + 1})">
          <i class="fa-solid fa-chevron-right"></i>
        </div>
      </div>`;
  },

  /* ─────────────────────────────────────────────
     BREADCRUMB
     ───────────────────────────────────────────── */
  breadcrumb(items) {
    if (!items || items.length === 0) return '';
    const crumbs = items.map((item, idx) => {
      const isLast = idx === items.length - 1;
      if (isLast || !item.href) {
        return `
          <div class="breadcrumb-item active">${Utils.escapeHtml(item.label)}</div>`;
      }
      return `
        <div class="breadcrumb-item"><a href="${Utils.escapeHtml(item.href)}">${Utils.escapeHtml(item.label)}</a></div>
        <span class="breadcrumb-separator"><i class="fa-solid fa-chevron-right"></i></span>`;
    }).join('\n');

    return `
      <nav aria-label="Breadcrumb">
        <div class="breadcrumb">
          <div class="breadcrumb-item"><a href="index.html"><i class="fa-solid fa-house"></i></a></div>
          <span class="breadcrumb-separator"><i class="fa-solid fa-chevron-right"></i></span>
          ${crumbs}
        </div>
      </nav>`;
  },

  /* ─────────────────────────────────────────────
     STATUS BADGE
     ───────────────────────────────────────────── */
  statusBadge(status) {
    const map = {
      pending:      { cls: 'badge-warning',   icon: 'fa-clock',       label: 'Pending' },
      confirmed:    { cls: 'badge-success',    icon: 'fa-check-circle', label: 'Confirmed' },
      checked_in:   { cls: 'badge-info',       icon: 'fa-door-open',   label: 'Checked In' },
      checked_out:  { cls: 'badge-gray',       icon: 'fa-door-closed', label: 'Checked Out' },
      cancelled:    { cls: 'badge-danger',     icon: 'fa-times-circle', label: 'Cancelled' },
      available:    { cls: 'badge-success',    icon: 'fa-check-circle', label: 'Available' },
      occupied:     { cls: 'badge-danger',     icon: 'fa-bed',         label: 'Occupied' },
      maintenance:  { cls: 'badge-warning',    icon: 'fa-wrench',      label: 'Maintenance' },
      cleaning:     { cls: 'badge-info',       icon: 'fa-broom',       label: 'Cleaning' },
      reserved:     { cls: 'badge-navy',       icon: 'fa-bookmark',    label: 'Reserved' },
      completed:    { cls: 'badge-success',    icon: 'fa-check',       label: 'Completed' },
      failed:       { cls: 'badge-danger',     icon: 'fa-xmark',       label: 'Failed' },
      refunded:     { cls: 'badge-info',       icon: 'fa-rotate-left', label: 'Refunded' },
      paid:         { cls: 'badge-success',    icon: 'fa-check-double',label: 'Paid' },
      unpaid:       { cls: 'badge-warning',    icon: 'fa-exclamation', label: 'Unpaid' },
      partial:      { cls: 'badge-warning',    icon: 'fa-half',        label: 'Partial' },
      active:       { cls: 'badge-success',    icon: 'fa-circle-dot',  label: 'Active' },
      inactive:     { cls: 'badge-gray',       icon: 'fa-circle',      label: 'Inactive' },
      read:         { cls: 'badge-gray',       icon: 'fa-envelope-open', label: 'Read' },
      unread:       { cls: 'badge-info',       icon: 'fa-envelope',    label: 'Unread' },
      replied:      { cls: 'badge-success',    icon: 'fa-reply',       label: 'Replied' },
      new:          { cls: 'badge-info',       icon: 'fa-sparkles',    label: 'New' },
    };
    const entry = map[status] || { cls: 'badge-gray', icon: 'fa-circle', label: status || 'Unknown' };
    return `<span class="badge ${entry.cls}"><i class="fa-solid ${entry.icon}"></i> ${entry.label}</span>`;
  },

  /* ─────────────────────────────────────────────
     GALLERY ITEM
     ───────────────────────────────────────────── */
  galleryItem(image, title, category) {
    return `
      <div class="gallery-item" onclick="Components.openLightbox(this)" data-src="${Utils.escapeHtml(image)}" data-title="${Utils.escapeHtml(title || '')}" data-category="${Utils.escapeHtml(category || '')}">
        <img src="${Utils.escapeHtml(image)}" alt="${Utils.escapeHtml(title || '')}" loading="lazy">
        <div class="gallery-item-overlay">
          <div class="gallery-icon"><i class="fa-solid fa-expand"></i></div>
          <span class="gallery-item-title">${Utils.escapeHtml(title || '')}</span>
        </div>
      </div>`;
  },

  /* ─────────────────────────────────────────────
     MODAL
     ───────────────────────────────────────────── */
  modal(id, title, bodyHtml, footerHtml) {
    return `
      <div class="modal-overlay" id="${id}">
        <div class="modal">
          <div class="modal-header">
            <h3 class="modal-title">${title}</h3>
            <button class="modal-close" onclick="Components.closeModal('${id}')" aria-label="Close">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div class="modal-body">${bodyHtml}</div>
          ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ''}
        </div>
      </div>`;
  },

  openModal(id) {
    const overlay = document.getElementById(id);
    if (overlay) {
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  },

  closeModal(id) {
    const overlay = document.getElementById(id);
    if (overlay) {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  /* ─────────────────────────────────────────────
     TOAST CONTAINER
     ───────────────────────────────────────────── */
  toastContainer() {
    return `<div class="toast-container" id="toastContainer"></div>`;
  },

  toast(message, type = 'info', duration) {
    const dur = duration || CONFIG.TOAST_DURATION || 4000;
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const icons = {
      success: 'fa-circle-check',
      danger: 'fa-circle-xmark',
      warning: 'fa-triangle-exclamation',
      info: 'fa-circle-info',
      error: 'fa-circle-xmark',
    };
    const toastType = type === 'error' ? 'danger' : type;
    const iconName = icons[type] || 'fa-circle-info';

    const el = document.createElement('div');
    el.className = `toast toast-${toastType}`;
    el.innerHTML = `
      <div class="toast-icon"><i class="fa-solid ${iconName}"></i></div>
      <div class="toast-content">
        <div class="toast-title">${Utils.escapeHtml(type === 'success' ? 'Success' : type === 'danger' || type === 'error' ? 'Error' : type === 'warning' ? 'Warning' : 'Info')}</div>
        <div class="toast-message">${Utils.escapeHtml(message)}</div>
      </div>
      <button class="toast-close" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
      <div class="toast-progress"></div>`;

    el.querySelector('.toast-close').addEventListener('click', () => {
      el.classList.add('removing');
      setTimeout(() => el.remove(), 300);
    });

    container.appendChild(el);
    requestAnimationFrame(() => el.classList.add('toast-show'));

    setTimeout(() => {
      if (el.parentNode) {
        el.classList.add('removing');
        setTimeout(() => el.remove(), 300);
      }
    }, dur);

    return el;
  },

  toastSuccess(msg) { return this.toast(msg, 'success'); },
  toastError(msg)   { return this.toast(msg, 'error'); },
  toastWarning(msg) { return this.toast(msg, 'warning'); },
  toastInfo(msg)    { return this.toast(msg, 'info'); },

  /* ─────────────────────────────────────────────
     PAGE LOADER
     ───────────────────────────────────────────── */
  pageLoader() {
    return `
      <div class="loading-screen" id="loadingScreen">
        <div class="loading-logo">
          <div class="loading-logo-text">EVERETT <span>HOTEL</span></div>
        </div>
        <div class="loading-bar-container"><div class="loading-bar"></div></div>
        <div class="loading-dots"><span></span><span></span><span></span></div>
      </div>`;
  },

  initPageLoader(delay = 2200) {
    const loader = document.getElementById('loadingScreen');
    if (!loader) return;
    setTimeout(() => {
      loader.classList.add('hidden');
      setTimeout(() => { loader.style.display = 'none'; }, 600);
    }, delay);
  },

  /* ─────────────────────────────────────────────
     ADMIN SIDEBAR
     ───────────────────────────────────────────── */
  adminSidebar(activePage, user) {
    const currentUser = user || (typeof Auth !== 'undefined' ? Auth.getCurrentUser() : null);
    const initials = currentUser
      ? (typeof Utils !== 'undefined' ? Utils.getInitials(currentUser.name || currentUser.firstName) : 'A')
      : 'A';
    const displayName = currentUser ? (currentUser.name || currentUser.firstName || 'Admin') : 'Admin';
    const role = currentUser ? (currentUser.role || 'admin') : 'admin';

    const links = [
      { page: 'dashboard',    icon: 'fa-gauge-high',         label: 'Dashboard',    href: 'dashboard.html' },
      { page: 'rooms',        icon: 'fa-bed',                label: 'Rooms',        href: 'rooms.html' },
      { page: 'bookings',     icon: 'fa-calendar-check',     label: 'Bookings',     href: 'bookings.html' },
      { page: 'customers',    icon: 'fa-users',              label: 'Customers',    href: 'customers.html' },
      { page: 'employees',    icon: 'fa-user-tie',           label: 'Employees',    href: 'employees.html' },
      { page: 'attendance',   icon: 'fa-fingerprint',        label: 'Attendance',   href: 'attendance.html' },
      { page: 'housekeeping', icon: 'fa-broom',              label: 'Housekeeping', href: 'housekeeping.html' },
      { page: 'restaurant',   icon: 'fa-utensils',           label: 'Restaurant',   href: 'restaurant.html' },
      { page: 'payments',     icon: 'fa-credit-card',        label: 'Payments',     href: 'payments.html' },
      { page: 'promotions',   icon: 'fa-tags',               label: 'Promotions',   href: 'promotions.html' },
      { page: 'gallery',      icon: 'fa-images',             label: 'Gallery',      href: 'gallery.html' },
      { page: 'reviews',      icon: 'fa-star',               label: 'Reviews',      href: 'reviews.html' },
      { page: 'reports',      icon: 'fa-chart-line',         label: 'Reports',      href: 'reports.html' },
      { page: 'messages',     icon: 'fa-envelope',           label: 'Messages',     href: 'messages.html' },
      { page: 'newsletter',   icon: 'fa-newspaper',          label: 'Newsletter',   href: 'newsletter.html' },
      { page: 'settings',     icon: 'fa-gear',               label: 'Settings',     href: 'settings.html' },
    ];

    const navItems = links.map((l) => `
      <li class="sidebar-menu-item${activePage === l.page ? ' active' : ''}">
        <a href="${l.href}">
          <i class="fas ${l.icon}"></i>
          <span>${l.label}</span>
        </a>
      </li>`).join('');

    return `
      <aside class="admin-sidebar" id="adminSidebar">
        <div class="sidebar-header">
          <a href="../index.html" class="sidebar-brand">
            <div class="sidebar-brand-name" style="font-family:var(--font-heading);font-size:var(--text-lg);font-weight:700;color:var(--white);">EVERETT <span style="color:var(--gold);">HOTEL</span></div>
          </a>
          <button class="sidebar-close d-lg-none" onclick="Components.toggleSidebar()" aria-label="Close sidebar">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="sidebar-user">
          <div class="sidebar-user-avatar" style="width:44px;height:44px;border-radius:var(--radius-full);background:var(--gold);color:var(--navy);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:var(--text-sm);">${initials}</div>
          <div class="sidebar-user-info">
            <strong style="font-size:var(--text-sm);">${Utils.escapeHtml(displayName)}</strong>
            <small style="font-size:var(--text-xs);color:var(--gray-500);text-transform:capitalize;">${Utils.escapeHtml(role)}</small>
          </div>
        </div>

        <nav class="sidebar-nav">
          <ul class="sidebar-menu">${navItems}</ul>
        </nav>

        <div class="sidebar-footer">
          <a href="../index.html" class="sidebar-link"><i class="fas fa-arrow-left"></i> <span>Back to Site</span></a>
          <a href="#" class="sidebar-link" onclick="Auth.logout(); return false;"><i class="fas fa-sign-out-alt"></i> <span>Logout</span></a>
        </div>
      </aside>`;
  },

  toggleSidebar() {
    const sidebar = document.getElementById('adminSidebar');
    if (sidebar) sidebar.classList.toggle('open');
  },

  /* ─────────────────────────────────────────────
     ADMIN TOPBAR
     ───────────────────────────────────────────── */
  adminTopbar(user) {
    const currentUser = user || (typeof Auth !== 'undefined' ? Auth.getCurrentUser() : null);
    const displayName = currentUser ? (currentUser.name || currentUser.firstName || 'Admin') : 'Admin';
    const initials = currentUser
      ? (typeof Utils !== 'undefined' ? Utils.getInitials(currentUser.name || currentUser.firstName) : 'A')
      : 'A';
    const photo = currentUser ? (currentUser.photo || currentUser.avatar || '') : '';

    return `
      <header class="admin-topbar" id="adminTopbar" style="position:sticky;top:0;z-index:var(--z-sticky);display:flex;align-items:center;justify-content:space-between;padding:var(--space-4) var(--space-6);background:var(--white);border-bottom:1px solid var(--gray-100);backdrop-filter:blur(10px);">
        <div class="d-flex align-center gap-4">
          <button class="btn btn-icon btn-ghost d-lg-none" onclick="Components.toggleSidebar()" aria-label="Toggle sidebar" style="width:40px;height:40px;display:inline-flex;align-items:center;justify-content:center;">
            <i class="fas fa-bars" style="font-size:20px;"></i>
          </button>
          <h2 id="pageTitle" style="font-size:var(--text-xl);font-weight:700;margin:0;font-family:var(--font-heading);"></h2>
        </div>

        <div class="d-flex align-center gap-4">
          <div class="table-search d-none d-md-block" style="width:240px;">
            <i class="fa-solid fa-magnifying-glass table-search-icon"></i>
            <input type="text" class="form-input" placeholder="Search..." style="padding-left:var(--space-10);height:40px;font-size:var(--text-sm);">
          </div>

          <button class="theme-toggle" style="width:40px;height:40px;display:inline-flex;align-items:center;justify-content:center;background:var(--gray-100);border-radius:var(--radius-full);color:var(--gray-600);border:none;cursor:pointer;" aria-label="Toggle dark mode">
            <i class="fas fa-moon"></i>
          </button>

          <div class="nav-dropdown" style="position:relative;">
            <button class="d-flex align-center gap-2" data-dropdown="admin-notif-dropdown" style="position:relative;background:none;border:none;cursor:pointer;padding:var(--space-2);border-radius:var(--radius-full);color:var(--gray-600);">
              <i class="fas fa-bell" style="font-size:18px;"></i>
              <span id="notifBadge" class="badge badge-danger badge-sm badge-pulse" style="position:absolute;top:0;right:0;font-size:10px;min-width:18px;height:18px;padding:0;display:none;">0</span>
            </button>
            <div class="nav-dropdown-menu" id="admin-notif-dropdown" style="right:0;left:auto;min-width:320px;">
              <div style="padding:var(--space-4) var(--space-5);border-bottom:1px solid var(--gray-100);display:flex;justify-content:space-between;align-items:center;">
                <strong style="font-size:var(--text-sm);">Notifications</strong>
                <button class="btn btn-ghost btn-sm" onclick="Components.markAllNotificationsRead()" style="font-size:var(--text-xs);">Mark all read</button>
              </div>
              <div id="notifList" style="max-height:320px;overflow-y:auto;padding:var(--space-2);">
                <div style="text-align:center;padding:var(--space-6);color:var(--gray-400);font-size:var(--text-sm);">No notifications</div>
              </div>
            </div>
          </div>

          <div class="nav-dropdown" style="position:relative;">
            <button class="d-flex align-center gap-3" data-dropdown="admin-user-dropdown" style="background:none;border:none;cursor:pointer;padding:var(--space-1) var(--space-2);border-radius:var(--radius-lg);">
              ${photo
                ? `<img src="${Utils.escapeHtml(photo)}" alt="${Utils.escapeHtml(displayName)}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;">`
                : `<span style="width:36px;height:36px;border-radius:50%;background:var(--gold);color:var(--navy);display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:var(--text-sm);">${initials}</span>`
              }
              <span class="d-none d-md-inline" style="font-size:var(--text-sm);font-weight:600;">${Utils.escapeHtml(displayName)}</span>
              <i class="fas fa-chevron-down" style="font-size:10px;color:var(--gray-400);"></i>
            </button>
            <div class="nav-dropdown-menu" id="admin-user-dropdown" style="right:0;left:auto;">
              <a href="settings.html" class="nav-dropdown-item"><i class="fas fa-gear" style="width:16px;"></i> Settings</a>
              <div style="height:1px;background:var(--gray-100);margin:var(--space-1) 0;"></div>
              <a href="#" class="nav-dropdown-item" style="color:var(--danger);" onclick="Auth.logout(); return false;"><i class="fas fa-sign-out-alt" style="width:16px;"></i> Logout</a>
            </div>
          </div>
        </div>
      </header>`;
  },

  setpageTitle(title) {
    const el = document.getElementById('pageTitle');
    if (el) el.textContent = title;
    document.title = title ? `${title} | Everett Hotel Admin` : 'Everett Hotel Admin';
  },

  /* ─────────────────────────────────────────────
     EMPTY STATE
     ───────────────────────────────────────────── */
  emptyState(icon, title, message, actionHtml) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">
          <i class="fa-solid ${Utils.escapeHtml(icon || 'fa-inbox')}"></i>
        </div>
        <h3>${Utils.escapeHtml(title || 'No Data')}</h3>
        <p>${Utils.escapeHtml(message || 'There\'s nothing to show here right now.')}</p>
        ${actionHtml ? `<div style="margin-top:var(--space-6);">${actionHtml}</div>` : ''}
      </div>`;
  },

  /* ─────────────────────────────────────────────
     LOADING SKELETON
     ───────────────────────────────────────────── */
  skeleton(type, count) {
    const n = count || 1;
    const templates = {
      card: `
        <div class="skeleton-card" style="border-radius:var(--radius-xl);overflow:hidden;border:1px solid var(--gray-100);">
          <div class="skeleton skeleton-image" style="aspect-ratio:16/9;"></div>
          <div style="padding:var(--space-6);">
            <div class="skeleton skeleton-text" style="width:40%;height:12px;margin-bottom:var(--space-3);"></div>
            <div class="skeleton skeleton-heading" style="width:70%;"></div>
            <div class="skeleton skeleton-text" style="width:100%;"></div>
            <div class="skeleton skeleton-text" style="width:85%;"></div>
            <div class="skeleton skeleton-text" style="width:55%;"></div>
            <div style="display:flex;gap:var(--space-2);margin-top:var(--space-4);">
              <div class="skeleton" style="width:60px;height:28px;border-radius:var(--radius-full);"></div>
              <div class="skeleton" style="width:60px;height:28px;border-radius:var(--radius-full);"></div>
              <div class="skeleton" style="width:60px;height:28px;border-radius:var(--radius-full);"></div>
            </div>
          </div>
        </div>`,

      table: `
        <div class="table-container">
          <table class="table">
            <thead>
              <tr><th style="width:40px;"><div class="skeleton" style="height:14px;width:14px;border-radius:4px;"></div></th>
              <th><div class="skeleton" style="height:14px;width:80px;"></div></th>
              <th><div class="skeleton" style="height:14px;width:60px;"></div></th>
              <th><div class="skeleton" style="height:14px;width:70px;"></div></th>
              <th><div class="skeleton" style="height:14px;width:50px;"></div></th>
              <th><div class="skeleton" style="height:14px;width:60px;"></div></th></tr>
            </thead>
            <tbody>
              ${Array(5).fill('').map(() => `
                <tr>
                  <td><div class="skeleton" style="height:14px;width:14px;border-radius:4px;"></div></td>
                  <td><div class="d-flex align-center gap-3"><div class="skeleton skeleton-avatar" style="width:36px;height:36px;"></div><div><div class="skeleton skeleton-text" style="width:100px;height:12px;margin-bottom:4px;"></div><div class="skeleton skeleton-text" style="width:60px;height:10px;"></div></div></div></td>
                  <td><div class="skeleton" style="height:14px;width:80px;"></div></td>
                  <td><div class="skeleton" style="height:14px;width:70px;"></div></td>
                  <td><div class="skeleton" style="height:24px;width:70px;border-radius:var(--radius-full);"></div></td>
                  <td><div class="skeleton" style="height:14px;width:40px;"></div></td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`,

      stats: `
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--space-6);">
          ${Array(4).fill('').map(() => `
            <div class="glass-card text-center">
              <div class="skeleton" style="width:48px;height:48px;border-radius:var(--radius-full);margin:0 auto var(--space-4);"></div>
              <div class="skeleton skeleton-heading" style="width:60%;margin:0 auto var(--space-2);"></div>
              <div class="skeleton skeleton-text" style="width:40%;margin:0 auto;"></div>
            </div>`).join('')}
        </div>`,

      text: `
        <div style="display:flex;flex-direction:column;gap:var(--space-3);">
          <div class="skeleton skeleton-text" style="width:100%;"></div>
          <div class="skeleton skeleton-text" style="width:90%;"></div>
          <div class="skeleton skeleton-text" style="width:95%;"></div>
          <div class="skeleton skeleton-text" style="width:60%;"></div>
        </div>`,
    };

    const html = templates[type] || templates.card;
    return Array(n).fill(html).join('');
  },

  /* ─────────────────────────────────────────────
     CONFIRM DIALOG (SweetAlert2 wrapper)
     ───────────────────────────────────────────── */
  confirmDialog(title, message, onConfirm) {
    if (typeof Swal !== 'undefined') {
      return Swal.fire({
        title: title || 'Are you sure?',
        text: message || '',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#D4AF37',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Yes, proceed',
        cancelButtonText: 'Cancel',
        reverseButtons: true,
      }).then((result) => {
        if (result.isConfirmed && typeof onConfirm === 'function') {
          onConfirm();
        }
        return result;
      });
    }

    return new Promise((resolve) => {
      const confirmed = window.confirm(message || title || 'Are you sure?');
      if (confirmed && typeof onConfirm === 'function') onConfirm();
      resolve({ isConfirmed: confirmed });
    });
  },

  confirmDanger(title, message, onConfirm) {
    if (typeof Swal !== 'undefined') {
      return Swal.fire({
        title: title || 'Are you sure?',
        text: message || 'This action cannot be undone.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#DC2626',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Yes, delete it',
        cancelButtonText: 'Cancel',
        reverseButtons: true,
      }).then((result) => {
        if (result.isConfirmed && typeof onConfirm === 'function') onConfirm();
        return result;
      });
    }

    return new Promise((resolve) => {
      const confirmed = window.confirm(message || title || 'Are you sure?');
      if (confirmed && typeof onConfirm === 'function') onConfirm();
      resolve({ isConfirmed: confirmed });
    });
  },

  alertSuccess(message, title) {
    if (typeof Swal !== 'undefined') {
      return Swal.fire({ title: title || 'Success', text: message, icon: 'success', confirmButtonColor: '#D4AF37' });
    }
    window.alert(`${title || 'Success'}: ${message}`);
  },

  alertError(message, title) {
    if (typeof Swal !== 'undefined') {
      return Swal.fire({ title: title || 'Error', text: message, icon: 'error', confirmButtonColor: '#D4AF37' });
    }
    window.alert(`${title || 'Error'}: ${message}`);
  },

  /* ─────────────────────────────────────────────
     LIGHTBOX
     ───────────────────────────────────────────── */
  lightbox() {
    return `
      <div class="lightbox" id="lightbox">
        <div class="lightbox-content">
          <button class="lightbox-close" onclick="Components.closeLightbox()" aria-label="Close lightbox"><i class="fa-solid fa-xmark"></i></button>
          <button class="lightbox-nav lightbox-prev" onclick="Components.prevLightbox()" aria-label="Previous"><i class="fa-solid fa-chevron-left"></i></button>
          <button class="lightbox-nav lightbox-next" onclick="Components.nextLightbox()" aria-label="Next"><i class="fa-solid fa-chevron-right"></i></button>
          <img id="lightboxImage" src="" alt="">
        </div>
        <div class="lightbox-caption" id="lightboxCaption"></div>
      </div>`;
  },

  _lightboxItems: [],
  _lightboxIndex: 0,

  openLightbox(element) {
    const galleryGrid = element.closest('.gallery-grid');
    if (galleryGrid) {
      this._lightboxItems = Array.from(galleryGrid.querySelectorAll('.gallery-item')).map((el) => ({
        src: el.dataset.src || el.querySelector('img')?.src || '',
        title: el.dataset.title || el.querySelector('.gallery-item-title')?.textContent || '',
      }));
      this._lightboxIndex = this._lightboxItems.indexOf(
        this._lightboxItems.find((i) => i.src === (element.dataset.src || ''))
      );
      if (this._lightboxIndex === -1) this._lightboxIndex = 0;
    } else {
      this._lightboxItems = [{
        src: element.dataset.src || element.querySelector('img')?.src || '',
        title: element.dataset.title || '',
      }];
      this._lightboxIndex = 0;
    }
    this._renderLightbox();
  },

  _renderLightbox() {
    const lightbox = document.getElementById('lightbox');
    const img = document.getElementById('lightboxImage');
    const caption = document.getElementById('lightboxCaption');
    if (!lightbox || !img) return;

    const item = this._lightboxItems[this._lightboxIndex];
    if (!item) return;

    img.src = item.src;
    img.alt = item.title;
    caption.textContent = item.title;
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  },

  closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    if (lightbox) {
      lightbox.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  nextLightbox() {
    if (this._lightboxItems.length === 0) return;
    this._lightboxIndex = (this._lightboxIndex + 1) % this._lightboxItems.length;
    this._renderLightbox();
  },

  prevLightbox() {
    if (this._lightboxItems.length === 0) return;
    this._lightboxIndex = (this._lightboxIndex - 1 + this._lightboxItems.length) % this._lightboxItems.length;
    this._renderLightbox();
  },

  /* ─────────────────────────────────────────────
     BACK TO TOP
     ───────────────────────────────────────────── */
  backToTop() {
    return `
      <button class="back-to-top" id="backToTop" aria-label="Back to top">
        <i class="fa-solid fa-chevron-up"></i>
      </button>`;
  },

  initBackToTop() {
    const btn = document.getElementById('backToTop');
    if (!btn) return;
    const check = Utils.throttle(() => {
      btn.classList.toggle('visible', window.scrollY > 400);
    }, 100);
    window.addEventListener('scroll', check, { passive: true });
    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  },

  /* ─────────────────────────────────────────────
     SECTION HEADER (reusable)
     ───────────────────────────────────────────── */
  sectionHeader(subtitle, title, description, extraClass) {
    return `
      <div class="section-header ${extraClass || ''}" data-aos="fade-up">
        ${subtitle ? `<span class="section-subtitle">${subtitle}</span>` : ''}
        <h2 class="section-title">${title}</h2>
        <div class="section-deco">
          <div class="section-deco-line"></div>
          <div class="section-deco-diamond"></div>
          <div class="section-deco-line"></div>
        </div>
        ${description ? `<p class="section-description">${description}</p>` : ''}
      </div>`;
  },

  /* ─────────────────────────────────────────────
     NOTIFICATION LIST (admin helper)
     ───────────────────────────────────────────── */
  notificationItem(notification) {
    const iconMap = {
      booking: 'fa-calendar-check',
      payment: 'fa-credit-card',
      review: 'fa-star',
      message: 'fa-envelope',
      system: 'fa-gear',
    };
    const icon = iconMap[notification.type] || 'fa-bell';
    const time = typeof Utils !== 'undefined' ? Utils.timeAgo(notification.createdAt) : '';

    return `
      <a href="#" class="nav-dropdown-item d-flex align-start gap-3" style="padding:var(--space-3) var(--space-4);" onclick="Components.markNotificationRead('${notification._id || notification.id}'); return false;">
        <i class="fas ${icon}" style="color:var(--gold);margin-top:2px;"></i>
        <div style="flex:1;min-width:0;">
          <div style="font-size:var(--text-sm);font-weight:500;line-height:1.4;">${Utils.escapeHtml(notification.title || notification.message || '')}</div>
          <div style="font-size:var(--text-xs);color:var(--gray-500);margin-top:2px;">${time}</div>
        </div>
      </a>`;
  },

  async loadNotifications() {
    if (typeof api === 'undefined') return;
    try {
      const res = await api.getNotifications({ limit: 10 });
      const items = res.data || res.notifications || res || [];
      const list = document.getElementById('notifList');
      const badge = document.getElementById('notifBadge');
      if (!list) return;

      if (!Array.isArray(items) || items.length === 0) {
        list.innerHTML = '<div style="text-align:center;padding:var(--space-6);color:var(--gray-400);font-size:var(--text-sm);">No notifications</div>';
        if (badge) badge.style.display = 'none';
        return;
      }

      const unread = items.filter((n) => !n.read).length;
      if (badge) {
        badge.textContent = unread;
        badge.style.display = unread > 0 ? 'inline-flex' : 'none';
      }

      list.innerHTML = items.map((n) => this.notificationItem(n)).join('');
    } catch {
      // silent fail for notifications
    }
  },

  async markNotificationRead(id) {
    if (typeof api === 'undefined') return;
    try {
      await api.markNotificationRead(id);
      this.loadNotifications();
    } catch { /* silent */ }
  },

  async markAllNotificationsRead() {
    if (typeof api === 'undefined') return;
    try {
      await api.markAllNotificationsRead();
      this.loadNotifications();
    } catch { /* silent */ }
  },

  /* ─────────────────────────────────────────────
     DATA TABLE (reusable admin)
     ───────────────────────────────────────────── */
  dataTable(columns, rows, options) {
    const opts = options || {};
    const striped = opts.striped ? ' table-striped' : '';
    const hover = opts.hover !== false ? ' table-hover' : '';
    const selectable = opts.selectable || false;

    const headerCells = columns.map((col) =>
      `<th${col.width ? ` style="width:${col.width};"` : ''}>${col.label}</th>`
    ).join('');

    let bodyRows = '';
    if (!rows || rows.length === 0) {
      bodyRows = `<tr><td colspan="${columns.length + (selectable ? 1 : 0)}" style="text-align:center;padding:var(--space-10);">
        ${this.emptyState(opts.emptyIcon || 'fa-inbox', opts.emptyTitle || 'No Data', opts.emptyMessage || 'No records to display.')}
      </td></tr>`;
    } else {
      bodyRows = rows.map((row) => {
        const cells = columns.map((col) => {
          const value = typeof col.render === 'function' ? col.render(row) : (row[col.key] || '');
          return `<td>${value}</td>`;
        }).join('');
        const rowId = row._id || row.id || '';
        return `<tr data-id="${rowId}">${selectable ? `<td><input type="checkbox" class="form-check-input" value="${rowId}"></td>` : ''}${cells}</tr>`;
      }).join('');
    }

    return `
      <div class="table-container">
        <table class="table${striped}${hover}">
          <thead>
            <tr>
              ${selectable ? '<th style="width:40px;"><input type="checkbox" class="form-check-input" id="selectAll"></th>' : ''}
              ${headerCells}
            </tr>
          </thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </div>`;
  },

  /* ─────────────────────────────────────────────
     DATA TABLE TOOLBAR
     ───────────────────────────────────────────── */
  tableToolbar(options) {
    const opts = options || {};
    return `
      <div class="table-toolbar">
        <div class="d-flex align-center gap-4" style="flex-wrap:wrap;">
          <div class="table-search">
            <i class="fa-solid fa-magnifying-glass table-search-icon"></i>
            <input type="text" class="form-input" id="${opts.searchId || 'tableSearch'}" placeholder="${opts.searchPlaceholder || 'Search...'}">
          </div>
          ${opts.filterHtml || ''}
        </div>
        <div class="d-flex align-center gap-3">
          ${opts.actionHtml || ''}
        </div>
      </div>`;
  },

  /* ─────────────────────────────────────────────
     TABS
     ───────────────────────────────────────────── */
  tabs(tabList, activeTab) {
    const items = tabList.map((tab) => {
      const isActive = tab.id === activeTab ? ' active' : '';
      return `<button class="tab-btn${isActive}" data-tab="${tab.id}" onclick="Components.switchTab('${tab.id}')">${tab.label}</button>`;
    }).join('');

    return `<div class="tabs">${items}</div>`;
  },

  switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    document.querySelectorAll('.tab-pane').forEach((pane) => {
      pane.classList.toggle('active', pane.id === tabId);
    });
  },

  /* ─────────────────────────────────────────────
     STEPPER (booking flow)
     ───────────────────────────────────────────── */
  stepper(steps, currentStep) {
    const items = steps.map((step, idx) => {
      let cls = '';
      if (idx < currentStep) cls = ' completed';
      else if (idx === currentStep) cls = ' active';

      const isLast = idx === steps.length - 1;

      return `
        <div class="stepper-item${cls}">
          <div class="stepper-number">${idx < currentStep ? '<i class="fa-solid fa-check"></i>' : (idx + 1)}</div>
          <span class="stepper-label">${Utils.escapeHtml(step)}</span>
          ${!isLast ? '<div class="stepper-line"></div>' : ''}
        </div>`;
    }).join('');

    return `<div class="stepper">${items}</div>`;
  },

  /* ─────────────────────────────────────────────
     PRICE DISPLAY
     ───────────────────────────────────────────── */
  priceTag(amount, period) {
    const formatted = typeof Utils !== 'undefined' ? Utils.formatCurrency(amount) : `KSh ${(amount || 0).toLocaleString('en-KE')}`;
    return `
      <div class="price-tag">
        <span class="amount">${formatted}</span>
        ${period ? `<span class="period">${Utils.escapeHtml(period)}</span>` : ''}
      </div>`;
  },

  /* ─────────────────────────────────────────────
     STAR RATING
     ───────────────────────────────────────────── */
  starRating(rating, maxStars) {
    const max = maxStars || 5;
    const r = parseFloat(rating) || 0;
    let html = '<div class="stars">';
    const fullStars = Math.floor(r);
    const hasHalf = r % 1 >= 0.5;

    for (let i = 0; i < max; i++) {
      if (i < fullStars) {
        html += '<i class="fa-solid fa-star star"></i>';
      } else if (i === fullStars && hasHalf) {
        html += '<i class="fa-solid fa-star-half-stroke star"></i>';
      } else {
        html += '<i class="fa-regular fa-star star empty"></i>';
      }
    }
    html += '</div>';
    return html;
  },

  /* ─────────────────────────────────────────────
     ACCORDION
     ───────────────────────────────────────────── */
  accordion(items) {
    const accItems = items.map((item, idx) => {
      const id = `accordion-${idx}`;
      return `
        <div class="accordion-item${idx === 0 ? ' active' : ''}" data-accordion>
          <div class="accordion-header" onclick="Components.toggleAccordion(this)">
            <span>${Utils.escapeHtml(item.question || item.title || '')}</span>
            <span class="accordion-icon"><i class="fa-solid fa-plus"></i></span>
          </div>
          <div class="accordion-body" style="${idx === 0 ? 'max-height:500px;' : ''}">
            <div class="accordion-body-inner">${item.answer || item.content || ''}</div>
          </div>
        </div>`;
    }).join('');

    return `<div class="accordion">${accItems}</div>`;
  },

  toggleAccordion(header) {
    const item = header.closest('.accordion-item');
    const body = item.querySelector('.accordion-body');
    const isActive = item.classList.contains('active');

    if (isActive) {
      item.classList.remove('active');
      body.style.maxHeight = '0';
    } else {
      item.classList.add('active');
      body.style.maxHeight = body.scrollHeight + 'px';
    }
  },

  /* ─────────────────────────────────────────────
     PROGRESS BAR
     ───────────────────────────────────────────── */
  progressBar(value, label, size) {
    const pct = Math.min(100, Math.max(0, parseInt(value) || 0));
    const sizeClass = size === 'sm' ? ' progress-sm' : size === 'lg' ? ' progress-lg' : '';

    return `
      <div>
        ${label ? `<div class="progress-label"><span>${Utils.escapeHtml(label)}</span><span>${pct}%</span></div>` : ''}
        <div class="progress${sizeClass}">
          <div class="progress-bar" style="width:${pct}%;"></div>
        </div>
      </div>`;
  },

  /* ─────────────────────────────────────────────
     ALERT / BANNER
     ───────────────────────────────────────────── */
  alert(type, message, title, closable) {
    const iconMap = {
      success: 'fa-circle-check',
      danger: 'fa-circle-xmark',
      warning: 'fa-triangle-exclamation',
      info: 'fa-circle-info',
    };
    const icon = iconMap[type] || 'fa-circle-info';
    const alertType = type === 'error' ? 'danger' : type;

    return `
      <div class="alert alert-${alertType}">
        <span class="alert-icon"><i class="fa-solid ${icon}"></i></span>
        <div class="alert-content">
          ${title ? `<div class="alert-title">${Utils.escapeHtml(title)}</div>` : ''}
          <div class="alert-message">${Utils.escapeHtml(message)}</div>
        </div>
        ${closable ? '<button class="alert-close" onclick="this.parentElement.remove()"><i class="fa-solid fa-xmark"></i></button>' : ''}
      </div>`;
  },

  /* ─────────────────────────────────────────────
     AVATAR GROUP
     ───────────────────────────────────────────── */
  avatarGroup(avatars, maxVisible) {
    const max = maxVisible || 4;
    const visible = avatars.slice(0, max);
    const remaining = avatars.length - max;

    let html = '<div class="avatar-group">';
    visible.forEach((av) => {
      const initials = typeof av === 'string' ? Utils.getInitials(av) : Utils.getInitials(av.name || '');
      const src = typeof av === 'object' ? (av.photo || av.avatar || '') : '';

      html += `<div class="avatar">`;
      if (src) {
        html += `<img src="${Utils.escapeHtml(src)}" alt="${Utils.escapeHtml(initials)}">`;
      } else {
        html += `<div style="width:100%;height:100%;background:var(--gold);color:var(--navy);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:var(--text-xs);">${initials}</div>`;
      }
      html += `</div>`;
    });

    if (remaining > 0) {
      html += `<div class="avatar-group-count">+${remaining}</div>`;
    }
    html += '</div>';
    return html;
  },

  /* ─────────────────────────────────────────────
     FEATURE LIST
     ───────────────────────────────────────────── */
  featureList(features) {
    return `
      <div class="feature-list">
        ${features.map((f) => {
          const enabled = f.included !== false && f.available !== false;
          return `
            <div class="feature-list-item">
              <span class="${enabled ? 'check-icon' : 'cross-icon'}">
                <i class="fa-solid ${enabled ? 'fa-check' : 'fa-xmark'}"></i>
              </span>
              <span>${Utils.escapeHtml(f.name || f.label || f)}</span>
            </div>`;
        }).join('')}
      </div>`;
  },

  /* ─────────────────────────────────────────────
     COOKIE CONSENT
     ───────────────────────────────────────────── */
  cookieConsent() {
    if (localStorage.getItem('everett_cookies_accepted')) return '';
    return `
      <div class="cookie-consent" id="cookieConsent">
        <div class="container">
          <div class="cookie-consent-text">
            We use cookies to enhance your experience. By continuing to visit this site, you agree to our use of cookies.
            <a href="privacy-policy.html">Privacy Policy</a>
          </div>
          <div class="cookie-consent-actions">
            <button class="btn btn-outline btn-sm" onclick="Components.acceptCookies(false)">Decline</button>
            <button class="btn btn-primary btn-sm" onclick="Components.acceptCookies(true)">Accept All</button>
          </div>
        </div>
      </div>`;
  },

  acceptCookies(accepted) {
    localStorage.setItem('everett_cookies_accepted', accepted ? '1' : '0');
    const el = document.getElementById('cookieConsent');
    if (el) el.classList.remove('visible');
  },

  initCookieConsent() {
    if (!localStorage.getItem('everett_cookies_accepted')) {
      setTimeout(() => {
        const el = document.getElementById('cookieConsent');
        if (el) el.classList.add('visible');
      }, 2000);
    }
  },

  /* ─────────────────────────────────────────────
     MAP PLACEHOLDER
     ───────────────────────────────────────────── */
  mapPlaceholder(address) {
    return `
      <div class="map-placeholder" style="min-height:400px;">
        <div class="map-placeholder-overlay">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          <h3 style="color:var(--white);margin-top:var(--space-3);">Visit Us</h3>
          <p style="color:rgba(255,255,255,0.7);margin:0;">${Utils.escapeHtml(address || 'Westlands, Nairobi, Kenya')}</p>
        </div>
      </div>`;
  },

  /* ─────────────────────────────────────────────
     NEWSLETTER SECTION (standalone section)
     ───────────────────────────────────────────── */
  newsletterSection() {
    return `
      <section class="newsletter-section py-20" id="newsletter">
        <div class="container">
          <div class="newsletter-content" data-aos="fade-up" data-aos-duration="1000">
            <h2 class="section-title">Stay <span class="text-gradient-gold">Connected</span></h2>
            <p>Subscribe to our newsletter and receive exclusive offers, travel tips, and updates on upcoming events directly in your inbox.</p>
            <form class="newsletter-form" onsubmit="Components.handleNewsletter(event)">
              <input type="email" class="form-input" placeholder="Enter your email address" required>
              <button type="submit" class="btn btn-primary"><i class="fa-solid fa-paper-plane"></i> Subscribe</button>
            </form>
          </div>
        </div>
      </section>`;
  },

  /* ─────────────────────────────────────────────
     FLOATING LABEL INPUT
     ───────────────────────────────────────────── */
  floatingInput(type, name, label, options) {
    const opts = options || {};
    const required = opts.required ? ' required' : '';
    const value = opts.value || '';
    const placeholder = ' ';

    if (opts.type === 'select') {
      const optionsHtml = (opts.options || []).map((o) =>
        `<option value="${Utils.escapeHtml(o.value)}" ${o.value === value ? 'selected' : ''}>${Utils.escapeHtml(o.label)}</option>`
      ).join('');
      return `
        <div class="form-group form-floating">
          <select class="form-select" name="${name}" id="${name}"${required} placeholder="${placeholder}">
            ${optionsHtml}
          </select>
          <label class="form-label" for="${name}">${Utils.escapeHtml(label)}</label>
        </div>`;
    }

    return `
      <div class="form-group form-floating">
        <input type="${type || 'text'}" class="form-input" name="${name}" id="${name}" value="${Utils.escapeHtml(value)}" placeholder="${placeholder}"${required}>
        <label class="form-label" for="${name}">${Utils.escapeHtml(label)}</label>
      </div>`;
  },

  /* ─────────────────────────────────────────────
     EVENT HANDLERS
     ───────────────────────────────────────────── */
  async handleNewsletter(event) {
    event.preventDefault();
    const form = event.target;
    const emailInput = form.querySelector('input[type="email"]');
    const email = emailInput ? emailInput.value : '';

    try {
      if (typeof api !== 'undefined') {
        await api.subscribeNewsletter(email);
      }
      Components.toastSuccess('Thank you for subscribing to our newsletter!');
      form.reset();
    } catch (error) {
      Components.toastError(error.message || 'Failed to subscribe. Please try again.');
    }
  },

  async handleBooking(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    if (!data.roomId) {
      Components.toastWarning('Please select a room.');
      return;
    }
    if (!data.checkIn || !data.checkOut) {
      Components.toastWarning('Please select check-in and check-out dates.');
      return;
    }
    if (new Date(data.checkOut) <= new Date(data.checkIn)) {
      Components.toastWarning('Check-out date must be after check-in date.');
      return;
    }

    try {
      if (typeof Auth !== 'undefined' && !Auth.isLoggedIn()) {
        Components.toastInfo('Please log in to make a booking.');
        window.location.href = (typeof Auth !== 'undefined' && Auth.loginUrl) ? Auth.loginUrl() : 'login.html';
        return;
      }
      if (typeof api !== 'undefined') {
        const payload = {
          roomId: data.roomId,
          checkIn: data.checkIn,
          checkOut: data.checkOut,
          adults: parseInt(data.adults) || 2,
          children: parseInt(data.children) || 0,
          specialRequests: data.specialRequests || '',
          promoCode: data.promoCode || '',
        };
        await api.createBooking(payload);
        Components.toastSuccess('Booking confirmed! You will receive a confirmation email shortly.');
        form.reset();
        document.getElementById('bookingSummary').style.display = 'none';
      }
    } catch (error) {
      Components.toastError(error.message || 'Failed to create booking. Please try again.');
    }
  },

  applyPromo() {
    Components.toastInfo('Promo code applied! Discount will be reflected at checkout.');
  },

  /* ─────────────────────────────────────────────
     INIT — binds global event listeners
     ───────────────────────────────────────────── */
  init() {
    document.addEventListener('click', (e) => {
      const toggleBtn = e.target.closest('[data-dropdown]');
      if (toggleBtn) {
        e.preventDefault();
        e.stopPropagation();
        const targetId = toggleBtn.getAttribute('data-dropdown');
        const menu = document.getElementById(targetId);
        if (!menu) return;

        const isOpen = menu.classList.contains('show');
        document.querySelectorAll('.nav-dropdown-menu.show').forEach((m) => m.classList.remove('show'));

        if (!isOpen) {
          menu.classList.add('show');
        }
        return;
      }

      if (!e.target.closest('.nav-dropdown')) {
        document.querySelectorAll('.nav-dropdown-menu.show').forEach((m) => m.classList.remove('show'));
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.nav-dropdown-menu.show').forEach((m) => m.classList.remove('show'));
        Components.closeLightbox();
        document.querySelectorAll('.modal-overlay.active').forEach((m) => {
          m.classList.remove('active');
          document.body.style.overflow = '';
        });
      }
    });

    const lightbox = document.getElementById('lightbox');
    if (lightbox) {
      lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) Components.closeLightbox();
      });
    }

    document.querySelectorAll('.modal-overlay').forEach((overlay) => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('active');
          document.body.style.overflow = '';
        }
      });
    });
  },
};

document.addEventListener('DOMContentLoaded', () => {
  Components.init();
});
