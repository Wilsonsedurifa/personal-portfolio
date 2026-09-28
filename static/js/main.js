/**
 * PORTFOLIO WEBSITE - MAIN JAVASCRIPT
 * Owner: Wilson Brobo Sedurifa
 * Vanilla JS (ES6+) - 60fps Micro-interactions, Accessibility, Particle Engine
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // Check user preference for reduced motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ==========================================================================
     1. PRELOADER DISMISSAL
     ========================================================================== */
  const preloader = document.getElementById('preloader');
  window.addEventListener('load', () => {
    if (preloader) {
      preloader.classList.add('fade-out');
      setTimeout(() => {
        preloader.remove();
      }, 500);
    }
  });

  // Fallback in case load takes too long
  setTimeout(() => {
    if (preloader && !preloader.classList.contains('fade-out')) {
      preloader.classList.add('fade-out');
    }
  }, 2500);

  /* ==========================================================================
     2. SCROLL PROGRESS INDICATOR (60FPS TRANSFORM)
     ========================================================================== */
  const scrollProgress = document.getElementById('scroll-progress');
  const updateScrollProgress = () => {
    if (!scrollProgress) return;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? scrollTop / docHeight : 0;
    scrollProgress.style.transform = `scaleX(${Math.min(Math.max(progress, 0), 1)})`;
  };
  window.addEventListener('scroll', updateScrollProgress, { passive: true });

  /* ==========================================================================
     3. DARK / LIGHT THEME TOGGLE (LOCALSTORAGE PERSISTED)
     ========================================================================== */
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = themeToggle ? themeToggle.querySelector('.theme-icon') : null;
  const rootElement = document.documentElement;

  // Initialize theme from localStorage or system preference
  const savedTheme = localStorage.getItem('wilson_portfolio_theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialTheme = savedTheme ? savedTheme : (systemPrefersDark ? 'dark' : 'light');

  const applyTheme = (theme) => {
    rootElement.setAttribute('data-theme', theme);
    localStorage.setItem('wilson_portfolio_theme', theme);

    if (themeIcon && themeToggle) {
      if (theme === 'dark') {
        themeIcon.classList.remove('fa-sun');
        themeIcon.classList.add('fa-moon');
        themeToggle.setAttribute('aria-label', 'Switch to light mode');
      } else {
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
        themeToggle.setAttribute('aria-label', 'Switch to dark mode');
      }
    }
  };

  applyTheme(initialTheme);

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const currentTheme = rootElement.getAttribute('data-theme') || 'dark';
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      applyTheme(newTheme);
    });
  }

  /* ==========================================================================
     4. CUSTOM CURSOR FOLLOWER (DESKTOP ONLY)
     ========================================================================== */
  const cursorDot = document.getElementById('cursor-dot');
  const cursorGlow = document.getElementById('cursor-glow');

  if (cursorDot && cursorGlow && !prefersReducedMotion && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let glowX = mouseX;
    let glowY = mouseY;

    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      cursorDot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
    }, { passive: true });

    // Smooth follower interpolation loop
    const animateCursor = () => {
      glowX += (mouseX - glowX) * 0.18;
      glowY += (mouseY - glowY) * 0.18;
      cursorGlow.style.transform = `translate3d(${glowX}px, ${glowY}px, 0)`;
      requestAnimationFrame(animateCursor);
    };
    requestAnimationFrame(animateCursor);

    // Expand cursor over interactive elements
    const interactiveElements = document.querySelectorAll('a, button, input, textarea, .project-card, .skill-category-card');
    interactiveElements.forEach((el) => {
      el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
      el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
    });
  }

  /* ==========================================================================
     5. STICKY NAVBAR & ACTIVE SECTION HIGHLIGHTING
     ========================================================================== */
  const navbar = document.getElementById('navbar');
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('section[id]');
  const backToTopBtn = document.getElementById('back-to-top');

  const onScrollHandler = () => {
    const scrollY = window.scrollY;

    // Navbar Scrolled State
    if (navbar) {
      if (scrollY > 50) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    }

    // Back to Top Button
    if (backToTopBtn) {
      if (scrollY > 400) {
        backToTopBtn.classList.add('visible');
      } else {
        backToTopBtn.classList.remove('visible');
      }
    }

    // Active Section Highlighting
    let currentSectionId = '';
    sections.forEach((sec) => {
      const secTop = sec.offsetTop - 120;
      const secHeight = sec.offsetHeight;
      if (scrollY >= secTop && scrollY < secTop + secHeight) {
        currentSectionId = sec.getAttribute('id');
      }
    });

    navLinks.forEach((link) => {
      link.classList.remove('active');
      if (currentSectionId && link.getAttribute('href') === `#${currentSectionId}`) {
        link.classList.add('active');
      }
    });
  };

  window.addEventListener('scroll', onScrollHandler, { passive: true });
  onScrollHandler();

  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ==========================================================================
     6. MOBILE HAMBURGER MENU
     ========================================================================== */
  const mobileToggle = document.getElementById('mobile-toggle');
  const navMenu = document.getElementById('nav-menu');

  if (mobileToggle && navMenu) {
    const toggleMenu = () => {
      const isActive = navMenu.classList.toggle('active');
      mobileToggle.classList.toggle('active');
      mobileToggle.setAttribute('aria-expanded', isActive ? 'true' : 'false');
    };

    mobileToggle.addEventListener('click', toggleMenu);

    // Close when clicking nav links
    navLinks.forEach((link) => {
      link.addEventListener('click', () => {
        if (navMenu.classList.contains('active')) {
          toggleMenu();
        }
      });
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (
        navMenu.classList.contains('active') &&
        !navMenu.contains(e.target) &&
        !mobileToggle.contains(e.target)
      ) {
        toggleMenu();
      }
    });
  }

  /* ==========================================================================
     7. TYPING / ROTATING HEADLINE EFFECT
     ========================================================================== */
  const typingElement = document.querySelector('.typing-text');
  if (typingElement) {
    let words = ['Robust Web Systems', 'Laravel Applications', 'Django Portals', 'Flutter Mobile Apps'];
    try {
      const rawWords = typingElement.getAttribute('data-words');
      if (rawWords) words = JSON.parse(rawWords);
    } catch (e) {
      // Fallback to default array
    }

    if (prefersReducedMotion) {
      typingElement.textContent = words[0];
    } else {
      let wordIndex = 0;
      let charIndex = 0;
      let isDeleting = false;
      const typeSpeed = 90;
      const deleteSpeed = 45;
      const holdTime = 1600;

      const typeLoop = () => {
        const currentWord = words[wordIndex % words.length];

        if (isDeleting) {
          charIndex--;
          typingElement.textContent = currentWord.substring(0, charIndex);
        } else {
          charIndex++;
          typingElement.textContent = currentWord.substring(0, charIndex);
        }

        let delay = isDeleting ? deleteSpeed : typeSpeed;

        if (!isDeleting && charIndex === currentWord.length) {
          delay = holdTime;
          isDeleting = true;
        } else if (isDeleting && charIndex === 0) {
          isDeleting = false;
          wordIndex++;
          delay = 350;
        }

        setTimeout(typeLoop, delay);
      };

      typeLoop();
    }
  }

  /* ==========================================================================
     8. HERO PARTICLE CANVAS
     ========================================================================== */
  const canvas = document.getElementById('hero-canvas');
  if (canvas && !prefersReducedMotion) {
    const ctx = canvas.getContext('2d');
    let particles = [];
    let animationFrameId;
    let width, height;

    const resizeCanvas = () => {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas, { passive: true });

    class Particle {
      constructor() {
        this.reset();
      }
      reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.6;
        this.vy = (Math.random() - 0.5) * 0.6;
        this.radius = Math.random() * 2 + 1;
        this.alpha = Math.random() * 0.5 + 0.2;
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;
      }
      draw() {
        const isDark = rootElement.getAttribute('data-theme') !== 'light';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = isDark
          ? `rgba(6, 182, 212, ${this.alpha})`
          : `rgba(2, 132, 199, ${this.alpha * 0.7})`;
        ctx.fill();
      }
    }

    const particleCount = Math.min(Math.floor((window.innerWidth * window.innerHeight) / 18000), 55);
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    const renderParticles = () => {
      ctx.clearRect(0, 0, width, height);
      const isDark = rootElement.getAttribute('data-theme') !== 'light';

      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();

        // Connect nearby particles
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 110) {
            const lineAlpha = (1 - dist / 110) * (isDark ? 0.15 : 0.08);
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = isDark
              ? `rgba(6, 182, 212, ${lineAlpha})`
              : `rgba(2, 132, 199, ${lineAlpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }
      animationFrameId = requestAnimationFrame(renderParticles);
    };

    // Pause canvas rendering when hero is not in viewport
    const heroObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          cancelAnimationFrame(animationFrameId);
          renderParticles();
        } else {
          cancelAnimationFrame(animationFrameId);
        }
      });
    }, { threshold: 0.1 });

    const heroSection = document.getElementById('home');
    if (heroSection) heroObserver.observe(heroSection);
  }

  /* ==========================================================================
     9. SCROLL REVEAL ANIMATIONS (INTERSECTION OBSERVER)
     ========================================================================== */
  const revealItems = document.querySelectorAll('.reveal-item');
  if ('IntersectionObserver' in window && !prefersReducedMotion) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    revealItems.forEach((item, index) => {
      // Stagger slightly for sibling items inside grids
      item.style.transitionDelay = `${(index % 4) * 0.08}s`;
      revealObserver.observe(item);
    });
  } else {
    revealItems.forEach((item) => item.classList.add('is-revealed'));
  }

  /* ==========================================================================
     10. ANIMATED COUNT-UP NUMBERS
     ========================================================================== */
  const statNumbers = document.querySelectorAll('.stat-number');
  if (statNumbers.length > 0) {
    const startCountAnimation = (el) => {
      const target = parseInt(el.getAttribute('data-target'), 10);
      if (isNaN(target)) return;

      const duration = 1800;
      const startTime = performance.now();

      const updateCount = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out quadratic function for smooth deceleration
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const currentCount = Math.floor(easeProgress * target);

        el.textContent = currentCount;

        if (progress < 1) {
          requestAnimationFrame(updateCount);
        } else {
          el.textContent = target;
        }
      };

      requestAnimationFrame(updateCount);
    };

    const statsObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          startCountAnimation(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    statNumbers.forEach((num) => statsObserver.observe(num));
  }

  /* ==========================================================================
     11. ANIMATED SKILL PROGRESS BARS
     ========================================================================== */
  const progressFills = document.querySelectorAll('.progress-fill');
  if (progressFills.length > 0) {
    const progressObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const fill = entry.target;
          const targetProgress = fill.getAttribute('data-progress');
          fill.style.width = `${targetProgress}%`;
          observer.unobserve(fill);
        }
      });
    }, { threshold: 0.2 });

    progressFills.forEach((fill) => progressObserver.observe(fill));
  }

  /* ==========================================================================
     12. 3D TILT EFFECT ON PROJECT CARDS
     ========================================================================== */
  const tiltCards = document.querySelectorAll('[data-tilt]');
  if (!prefersReducedMotion && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    tiltCards.forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -6;
        const rotateY = ((x - centerX) / centerX) * 6;

        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)';
      });
    });
  }

  /* ==========================================================================
     13. CONTACT FORM VALIDATION & SUBMISSION
     ========================================================================== */
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    const nameInput = document.getElementById('contact-name');
    const emailInput = document.getElementById('contact-email');
    const messageInput = document.getElementById('contact-message');
    const submitBtn = document.getElementById('submit-btn');

    const nameError = document.getElementById('name-error');
    const emailError = document.getElementById('email-error');
    const messageError = document.getElementById('message-error');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    contactForm.addEventListener('submit', (e) => {
      let isValid = true;

      // Reset errors
      if (nameError) nameError.textContent = '';
      if (emailError) emailError.textContent = '';
      if (messageError) messageError.textContent = '';

      // Validate Name
      if (!nameInput.value.trim() || nameInput.value.trim().length < 2) {
        if (nameError) nameError.textContent = 'Please enter your full name (at least 2 characters).';
        isValid = false;
      }

      // Validate Email
      if (!emailInput.value.trim() || !emailRegex.test(emailInput.value.trim())) {
        if (emailError) emailError.textContent = 'Please enter a valid email address.';
        isValid = false;
      }

      // Validate Message
      if (!messageInput.value.trim() || messageInput.value.trim().length < 10) {
        if (messageError) messageError.textContent = 'Please enter a message of at least 10 characters.';
        isValid = false;
      }

      if (!isValid) {
        e.preventDefault();
      } else if (submitBtn) {
        // Show submission loading state
        submitBtn.disabled = true;
        const btnText = submitBtn.querySelector('.btn-text');
        const btnIcon = submitBtn.querySelector('.btn-icon');
        if (btnText) btnText.textContent = 'Sending Message...';
        if (btnIcon) {
          btnIcon.className = 'fa-solid fa-spinner fa-spin btn-icon';
        }
      }
    });
  }

  /* ==========================================================================
     14. FLASH MESSAGES AUTO-DISMISS
     ========================================================================== */
  const flashAlerts = document.querySelectorAll('.flash-alert');
  flashAlerts.forEach((alert) => {
    const closeBtn = alert.querySelector('.flash-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        alert.style.opacity = '0';
        alert.style.transform = 'translateX(30px)';
        setTimeout(() => alert.remove(), 350);
      });
    }

    // Auto-dismiss after 6 seconds
    setTimeout(() => {
      if (alert && alert.parentElement) {
        alert.style.opacity = '0';
        alert.style.transform = 'translateX(30px)';
        setTimeout(() => alert.remove(), 350);
      }
    }, 6000);
  });
});
