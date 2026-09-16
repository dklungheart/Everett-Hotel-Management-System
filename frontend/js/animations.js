/* ============================================================
   EVERETT HOTEL MANAGEMENT SYSTEM
   Premium Animation System (GSAP + ScrollTrigger + Lenis)
   Version: 2.0.0
   ============================================================ */

const Animations = {
  _lenis: null,
  _isMobile: false,
  _reducedMotion: false,

  /* --------------------------------------------------------
     INITIALIZATION
     -------------------------------------------------------- */
  initAll() {
    this._isMobile = window.innerWidth < 768;
    this._reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.initPageLoader();
    this.initSmoothScroll();
    this.initNavbarScroll();
    this.initBackToTop();
    this.initMobileMenu();
    this.initDropdowns();
    this.initImageLazyLoad();
    this.initTooltips();
    this.initTabs();
    this.initAccordions();

    if (!this._reducedMotion && typeof gsap !== 'undefined') {
      this._initGSAP();
    } else {
      this._fallbackReveal();
    }
  },

  /* --------------------------------------------------------
     GSAP + SCROLLTRIGGER SETUP
     -------------------------------------------------------- */
  _initGSAP() {
    if (typeof gsap === 'undefined') {
      this._fallbackReveal();
      return;
    }

    gsap.config({ nullTargetWarn: false });

    if (typeof ScrollTrigger !== 'undefined') {
      gsap.registerPlugin(ScrollTrigger);
    }

    this._initRevealUp();
    this._initRevealLeftRight();
    this._initRevealScale();
    this._initStaggerGrids();
    this._initParallax();
    this._initHeroReveal();
    this._initCounterAnimations();
    this._initImageReveal();
    this._initMagneticButtons();
  },

  /* --------------------------------------------------------
     LENIS SMOOTH SCROLL
     -------------------------------------------------------- */
  initSmoothScroll() {
    if (this._isMobile || this._reducedMotion) return;
    if (typeof Lenis === 'undefined') {
      this._nativeSmoothScroll();
      return;
    }

    this._lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      this._lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => {
        this._lenis.raf(time * 1000);
      });
      gsap.ticker.lagSmoothing(0);
    }

    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', (e) => {
        const href = anchor.getAttribute('href');
        if (href === '#' || href === '#0') return;
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          this._lenis.scrollTo(target, { offset: -80 });
        }
      });
    });
  },

  _nativeSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', (e) => {
        const href = anchor.getAttribute('href');
        if (href === '#' || href === '#0') return;
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          const offsetTop = target.getBoundingClientRect().top + window.scrollY - 80;
          window.scrollTo({ top: offsetTop, behavior: 'smooth' });
        }
      });
    });
  },

  /* --------------------------------------------------------
     PAGE LOADER
     -------------------------------------------------------- */
  initPageLoader() {
    const loader = document.getElementById('loading-screen') || document.getElementById('loadingScreen');
    if (!loader) return;

    const hide = () => {
      if (typeof gsap !== 'undefined') {
        gsap.to(loader, {
          opacity: 0,
          duration: 0.5,
          ease: 'power2.inOut',
          onComplete: () => {
            loader.style.display = 'none';
          },
        });
      } else {
        loader.classList.add('hide');
        setTimeout(() => {
          loader.style.display = 'none';
        }, 500);
      }
    };

    if (document.readyState === 'complete') {
      setTimeout(hide, 300);
    } else {
      window.addEventListener('load', () => {
        setTimeout(hide, 300);
      });
    }
  },

  /* --------------------------------------------------------
     NAVBAR SCROLL EFFECT
     -------------------------------------------------------- */
  initNavbarScroll() {
    const navbar = document.getElementById('mainNavbar') || document.getElementById('navbar');
    if (!navbar) return;

    const handleScroll = Utils.throttle(() => {
      if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    }, 100);

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
  },

  /* --------------------------------------------------------
     BACK TO TOP BUTTON
     -------------------------------------------------------- */
  initBackToTop() {
    const btn = document.getElementById('backToTop');
    if (!btn) return;

    const handleScroll = Utils.throttle(() => {
      if (window.scrollY > 400) {
        btn.classList.add('show');
      } else {
        btn.classList.remove('show');
      }
    }, 100);

    window.addEventListener('scroll', handleScroll, { passive: true });

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (this._lenis) {
        this._lenis.scrollTo(0);
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  },

  /* --------------------------------------------------------
     MOBILE MENU
     -------------------------------------------------------- */
  initMobileMenu() {
    const toggler = document.getElementById('navToggler') || document.querySelector('.navbar-toggler');
    const mobileMenu = document.getElementById('mobileNav') || document.querySelector('.mobile-menu');
    if (!toggler || !mobileMenu) return;

    toggler.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.contains('active');
      if (isOpen) {
        mobileMenu.classList.remove('active');
        toggler.classList.remove('active');
        document.body.style.overflow = '';
      } else {
        mobileMenu.classList.add('active');
        toggler.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    });

    mobileMenu.querySelectorAll('.nav-link').forEach((link) => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('active');
        toggler.classList.remove('active');
        document.body.style.overflow = '';
      });
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.navbar') && !e.target.closest('.mobile-menu') && mobileMenu.classList.contains('active')) {
        mobileMenu.classList.remove('active');
        toggler.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  },

  /* --------------------------------------------------------
     DROPDOWNS
     -------------------------------------------------------- */
  initDropdowns() {
    document.addEventListener('click', (e) => {
      const toggleBtn = e.target.closest('[data-dropdown]');
      if (toggleBtn) {
        e.preventDefault();
        const targetId = toggleBtn.getAttribute('data-dropdown');
        const menu = document.getElementById(targetId);
        if (menu) {
          const isOpen = menu.classList.contains('show');
          document.querySelectorAll('.dropdown-menu.show').forEach((m) => m.classList.remove('show'));
          if (!isOpen) menu.classList.add('show');
        }
      }
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.dropdown')) {
        document.querySelectorAll('.dropdown-menu.show').forEach((m) => m.classList.remove('show'));
      }
    });
  },

  /* --------------------------------------------------------
     IMAGE LAZY LOADING
     -------------------------------------------------------- */
  initImageLazyLoad() {
    const images = document.querySelectorAll('img[data-src]');
    if (images.length === 0) return;

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const img = entry.target;
              img.src = img.getAttribute('data-src');
              img.removeAttribute('data-src');
              img.addEventListener('load', () => img.classList.add('loaded'), { once: true });
              observer.unobserve(img);
            }
          });
        },
        { rootMargin: '100px' }
      );

      images.forEach((img) => observer.observe(img));
    } else {
      images.forEach((img) => {
        img.src = img.getAttribute('data-src');
        img.removeAttribute('data-src');
      });
    }
  },

  /* --------------------------------------------------------
     TOOLTIPS
     -------------------------------------------------------- */
  initTooltips() {
    const tooltips = document.querySelectorAll('[data-tooltip]');
    tooltips.forEach((el) => {
      const text = el.getAttribute('data-tooltip');
      const position = el.getAttribute('data-tooltip-position') || 'top';
      el.style.position = 'relative';

      el.addEventListener('mouseenter', () => {
        const tooltip = document.createElement('div');
        tooltip.className = `tooltip tooltip-${position}`;
        tooltip.textContent = text;
        tooltip.style.cssText = `
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%) translateY(-4px);
          background: #8B5E34;
          color: #fff;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.75rem;
          white-space: nowrap;
          pointer-events: none;
          z-index: 100;
          opacity: 0;
          transition: opacity 0.2s ease;
        `;
        el.appendChild(tooltip);
        requestAnimationFrame(() => { tooltip.style.opacity = '1'; });
      });

      el.addEventListener('mouseleave', () => {
        const tooltip = el.querySelector('.tooltip');
        if (tooltip) tooltip.remove();
      });
    });
  },

  /* --------------------------------------------------------
     TABS
     -------------------------------------------------------- */
  initTabs() {
    document.querySelectorAll('.tabs').forEach((tabContainer) => {
      const buttons = tabContainer.querySelectorAll('.tab-btn');
      const parentCard = tabContainer.closest('.card-luxury, .admin-card, .booking-form, section');
      if (!parentCard) return;
      const panels = parentCard.querySelectorAll('.tab-panel');

      buttons.forEach((btn) => {
        btn.addEventListener('click', () => {
          const target = btn.getAttribute('data-tab');
          buttons.forEach((b) => b.classList.remove('active'));
          panels.forEach((p) => p.classList.remove('active'));
          btn.classList.add('active');
          const panel = parentCard.querySelector(`#${target}`);
          if (panel) panel.classList.add('active');
        });
      });
    });
  },

  /* --------------------------------------------------------
     ACCORDIONS
     -------------------------------------------------------- */
  initAccordions() {
    document.querySelectorAll('.accordion-trigger').forEach((trigger) => {
      trigger.addEventListener('click', () => {
        const item = trigger.closest('.accordion-item');
        const content = item.querySelector('.accordion-content');
        const isActive = item.classList.contains('active');

        item.closest('.accordion').querySelectorAll('.accordion-item').forEach((i) => {
          i.classList.remove('active');
          const c = i.querySelector('.accordion-content');
          if (c) c.style.maxHeight = '0';
        });

        if (!isActive) {
          item.classList.add('active');
          if (content) {
            content.style.maxHeight = content.scrollHeight + 'px';
          }
        }
      });
    });
  },

  /* --------------------------------------------------------
     GSAP: REVEAL UP
     -------------------------------------------------------- */
  _initRevealUp() {
    if (typeof ScrollTrigger === 'undefined') return;

    const elements = document.querySelectorAll('.reveal-up, .fade-up');
    elements.forEach((el) => {
      gsap.set(el, { opacity: 0, y: 40 });

      ScrollTrigger.create({
        trigger: el,
        start: 'top 88%',
        once: true,
        onEnter: () => {
          gsap.to(el, {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: 'power3.out',
          });
        },
      });
    });
  },

  /* --------------------------------------------------------
     GSAP: REVEAL LEFT / RIGHT
     -------------------------------------------------------- */
  _initRevealLeftRight() {
    if (typeof ScrollTrigger === 'undefined') return;

    document.querySelectorAll('.reveal-left').forEach((el) => {
      gsap.set(el, { opacity: 0, x: -60 });
      ScrollTrigger.create({
        trigger: el,
        start: 'top 88%',
        once: true,
        onEnter: () => {
          gsap.to(el, { opacity: 1, x: 0, duration: 0.9, ease: 'power3.out' });
        },
      });
    });

    document.querySelectorAll('.reveal-right').forEach((el) => {
      gsap.set(el, { opacity: 0, x: 60 });
      ScrollTrigger.create({
        trigger: el,
        start: 'top 88%',
        once: true,
        onEnter: () => {
          gsap.to(el, { opacity: 1, x: 0, duration: 0.9, ease: 'power3.out' });
        },
      });
    });

    document.querySelectorAll('.slide-left').forEach((el) => {
      gsap.set(el, { opacity: 0, x: -40 });
      ScrollTrigger.create({
        trigger: el,
        start: 'top 88%',
        once: true,
        onEnter: () => {
          gsap.to(el, { opacity: 1, x: 0, duration: 0.8, ease: 'power3.out' });
        },
      });
    });

    document.querySelectorAll('.slide-right').forEach((el) => {
      gsap.set(el, { opacity: 0, x: 40 });
      ScrollTrigger.create({
        trigger: el,
        start: 'top 88%',
        once: true,
        onEnter: () => {
          gsap.to(el, { opacity: 1, x: 0, duration: 0.8, ease: 'power3.out' });
        },
      });
    });
  },

  /* --------------------------------------------------------
     GSAP: REVEAL SCALE
     -------------------------------------------------------- */
  _initRevealScale() {
    if (typeof ScrollTrigger === 'undefined') return;

    document.querySelectorAll('.reveal-scale, .scale-in').forEach((el) => {
      gsap.set(el, { opacity: 0, scale: 0.85 });
      ScrollTrigger.create({
        trigger: el,
        start: 'top 88%',
        once: true,
        onEnter: () => {
          gsap.to(el, { opacity: 1, scale: 1, duration: 0.8, ease: 'power3.out' });
        },
      });
    });
  },

  /* --------------------------------------------------------
     GSAP: STAGGER GRIDS
     -------------------------------------------------------- */
  _initStaggerGrids() {
    if (typeof ScrollTrigger === 'undefined') return;

    document.querySelectorAll('.stagger-children, [data-stagger]').forEach((container) => {
      const children = container.children;
      if (children.length === 0) return;

      gsap.set(children, { opacity: 0, y: 30 });

      ScrollTrigger.create({
        trigger: container,
        start: 'top 85%',
        once: true,
        onEnter: () => {
          gsap.to(children, {
            opacity: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.1,
            ease: 'power3.out',
          });
        },
      });
    });
  },

  /* --------------------------------------------------------
     GSAP: PARALLAX
     -------------------------------------------------------- */
  _initParallax() {
    if (typeof ScrollTrigger === 'undefined' || this._isMobile) return;

    document.querySelectorAll('.parallax-bg').forEach((el) => {
      const speed = parseFloat(el.getAttribute('data-speed') || '0.3');

      gsap.to(el, {
        yPercent: speed * 30,
        ease: 'none',
        scrollTrigger: {
          trigger: el.parentElement,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      });
    });

    document.querySelectorAll('.parallax').forEach((el) => {
      const speed = parseFloat(el.getAttribute('data-parallax-speed') || '0.3');

      gsap.to(el, {
        y: () => speed * 100,
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      });
    });
  },

  /* --------------------------------------------------------
     GSAP: HERO TEXT REVEAL
     -------------------------------------------------------- */
  _initHeroReveal() {
    if (typeof gsap === 'undefined' || this._isMobile) return;

    const heroTitle = document.querySelector('.hero-title');
    const heroSubtitle = document.querySelector('.hero-subtitle');
    const heroOverline = document.querySelector('.hero-overline');
    const heroActions = document.querySelector('.hero-actions');
    const heroScroll = document.querySelector('.hero-scroll-indicator');

    const tl = gsap.timeline({ delay: 0.5 });

    if (heroOverline) {
      gsap.set(heroOverline, { opacity: 0, y: 20 });
      tl.to(heroOverline, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' });
    }

    if (heroTitle) {
      if (typeof SplitText !== 'undefined') {
        const split = new SplitText(heroTitle, { type: 'words,chars' });
        gsap.set(split.chars, { opacity: 0, y: 30 });
        tl.to(split.chars, {
          opacity: 1,
          y: 0,
          duration: 0.5,
          stagger: 0.02,
          ease: 'power3.out',
        }, '-=0.3');
      } else {
        gsap.set(heroTitle, { opacity: 0, y: 30 });
        tl.to(heroTitle, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, '-=0.3');
      }
    }

    if (heroSubtitle) {
      gsap.set(heroSubtitle, { opacity: 0, y: 20 });
      tl.to(heroSubtitle, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, '-=0.4');
    }

    if (heroActions) {
      gsap.set(heroActions, { opacity: 0, y: 20 });
      tl.to(heroActions, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, '-=0.3');
    }

    if (heroScroll) {
      gsap.set(heroScroll, { opacity: 0 });
      tl.to(heroScroll, { opacity: 1, duration: 0.8, ease: 'power2.out' }, '-=0.2');
    }
  },

  /* --------------------------------------------------------
     GSAP: COUNTER ANIMATIONS
     -------------------------------------------------------- */
  _counterTarget(el) {
    if (el.hasAttribute('data-target')) {
      const t = parseFloat(el.getAttribute('data-target'));
      return isNaN(t) ? 0 : t;
    }
    if (el.hasAttribute('data-counter')) {
      const t = parseInt(el.getAttribute('data-counter'), 10);
      return isNaN(t) ? 0 : t;
    }
    const t = parseInt(el.textContent.replace(/[^0-9]/g, ''), 10);
    return isNaN(t) ? 0 : t;
  },

  _counterFormat(el, target, value) {
    const decimal = parseInt(el.getAttribute('data-decimal') || '0', 10);
    const prefix = el.getAttribute('data-prefix') || '';
    const suffix = el.getAttribute('data-suffix') || '';
    if (decimal > 0) return prefix + value.toFixed(decimal) + suffix;
    const n = Math.floor(value);
    return prefix + (target >= 1000 ? n.toLocaleString() + '+' : String(n)) + suffix;
  },

  _runCounter(el, target) {
    const duration = parseInt(el.getAttribute('data-duration') || '2000', 10);
    el.textContent = this._counterFormat(el, target, 0);
    const startTime = performance.now();
    const step = (currentTime) => {
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = this._counterFormat(el, target, target * eased);
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = this._counterFormat(el, target, target);
      }
    };
    requestAnimationFrame(step);
  },

  initCounterAnimations() {
    const counters = document.querySelectorAll('.stat-number, [data-counter], [data-target]');
    if (counters.length === 0) return;

    if (typeof ScrollTrigger === 'undefined') {
      counters.forEach((el) => {
        const target = this._counterTarget(el);
        if (target > 0) this._runCounter(el, target);
      });
      return;
    }

    counters.forEach((el) => {
      const target = this._counterTarget(el);
      if (target <= 0) return;
      ScrollTrigger.create({
        trigger: el,
        start: 'top 85%',
        once: true,
        onEnter: () => this._runCounter(el, target),
      });
    });
  },

  /* --------------------------------------------------------
     GSAP: IMAGE REVEAL (clip-path)
     -------------------------------------------------------- */
  _initImageReveal() {
    if (typeof ScrollTrigger === 'undefined' || this._isMobile) return;

    document.querySelectorAll('[data-image-reveal]').forEach((el) => {
      gsap.set(el, { clipPath: 'inset(0 100% 0 0)' });

      ScrollTrigger.create({
        trigger: el,
        start: 'top 85%',
        once: true,
        onEnter: () => {
          gsap.to(el, {
            clipPath: 'inset(0 0% 0 0)',
            duration: 1.2,
            ease: 'power4.inOut',
          });
        },
      });
    });
  },

  /* --------------------------------------------------------
     GSAP: MAGNETIC BUTTON HOVER
     -------------------------------------------------------- */
  _initMagneticButtons() {
    if (this._isMobile || this._reducedMotion) return;

    document.querySelectorAll('.btn-primary, .btn-secondary, [data-magnetic]').forEach((btn) => {
      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        const strength = 0.3;

        gsap.to(btn, {
          x: x * strength,
          y: y * strength,
          duration: 0.3,
          ease: 'power2.out',
        });
      });

      btn.addEventListener('mouseleave', () => {
        gsap.to(btn, {
          x: 0,
          y: 0,
          duration: 0.5,
          ease: 'elastic.out(1, 0.3)',
        });
      });
    });
  },

  /* --------------------------------------------------------
     FALLBACK (NO GSAP)
     -------------------------------------------------------- */
  _fallbackReveal() {
    const animElements = document.querySelectorAll(
      '.reveal-up, .reveal-left, .reveal-right, .reveal-scale, .fade-up, .fade-in, .slide-left, .slide-right, .scale-in'
    );

    if (animElements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animated');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    animElements.forEach((el) => observer.observe(el));

    const counters = document.querySelectorAll('.stat-number, [data-counter], [data-target]');
    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const target = this._counterTarget(entry.target);
            if (target > 0) this._runCounter(entry.target, target);
            counterObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );

    counters.forEach((el) => counterObserver.observe(el));
  },

  /* --------------------------------------------------------
     CLEANUP
     -------------------------------------------------------- */
  destroy() {
    if (this._lenis) {
      this._lenis.destroy();
      this._lenis = null;
    }

    if (typeof ScrollTrigger !== 'undefined') {
      ScrollTrigger.getAll().forEach((t) => t.kill());
    }
  },
};

document.addEventListener('DOMContentLoaded', () => {
  Animations.initAll();
});
