(() => {
  const init = () => {
    const page = document.querySelector('.case-study');
    if (!page) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const root = document.documentElement;
    const progress = document.querySelector('.case-progress i');
    const hero = page.querySelector('.case-hero');
    const sections = [...page.querySelectorAll('.case-section')];
    const navLinks = [...page.querySelectorAll('.case-mini-nav a')];
    root.classList.add('js');
    page.querySelectorAll('.case-list li').forEach((item, index) => item.style.setProperty('--item-index', index));
    if (reduced) { hero.classList.add('is-ready'); sections.forEach(section => section.classList.add('is-visible')); page.querySelectorAll('.flow-diagram').forEach(diagram => diagram.classList.add('is-animated')); return; }
    requestAnimationFrame(() => hero.classList.add('is-ready'));
    const reveal = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); reveal.unobserve(entry.target); } }), { threshold: .13, rootMargin: '0px 0px -8%' });
    sections.forEach(section => reveal.observe(section));
    const diagrams = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-animated'); diagrams.unobserve(entry.target); } }), { threshold: .35 });
    page.querySelectorAll('.flow-diagram').forEach(diagram => diagrams.observe(diagram));
    const statsObserver = new IntersectionObserver(entries => entries.forEach(entry => { if (!entry.isIntersecting) return; entry.target.querySelectorAll('[data-count]').forEach(counter => { const target = Number(counter.dataset.count), suffix = counter.textContent.includes('+') ? '+' : '', prefix = counter.textContent.startsWith('~') ? '~' : '', start = performance.now(); const tick = now => { const amount = Math.min(1, (now - start) / 800); counter.textContent = `${prefix}${Math.round(target * (1 - Math.pow(1 - amount, 3)))}${suffix}`; if (amount < 1) requestAnimationFrame(tick); }; requestAnimationFrame(tick); }); statsObserver.unobserve(entry.target); }), { threshold: .45 });
    const stats = page.querySelector('.case-stats'); if (stats) statsObserver.observe(stats);
    const navObserver = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) navLinks.forEach(link => link.classList.toggle('is-active', link.getAttribute('href') === `#${entry.target.id}`)); }), { rootMargin: '-25% 0px -65%' });
    sections.filter(section => section.id).forEach(section => navObserver.observe(section));
    let ticking = false; const paint = () => { ticking = false; const max = Math.max(1, document.documentElement.scrollHeight - innerHeight); if (progress) progress.style.transform = `scaleX(${scrollY / max})`; page.style.setProperty('--case-parallax', `${Math.min(28, scrollY * .035)}px`); };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(paint); } }, { passive: true }); paint();

    // Interactive Concurrency / Slot-Locking Simulator
    const sim = page.querySelector('[data-slot-sim]');
    if (sim) {
      let mode = 'locked', timerIds = [];
      const reservedEl = sim.querySelector('[data-sim-reserved]');
      const remainingEl = sim.querySelector('[data-sim-remaining]');
      const statusEl = sim.querySelector('[data-sim-status]');
      const logEl = sim.querySelector('[data-sim-log]');
      const modeButtons = [...sim.querySelectorAll('[data-sim-mode]')];
      const runBtn = sim.querySelector('[data-sim-run]');
      const clearTimers = () => { timerIds.forEach(clearTimeout); timerIds = []; };
      const resetState = () => {
        clearTimers();
        reservedEl.textContent = '219';
        remainingEl.textContent = '1';
        remainingEl.className = '';
        statusEl.textContent = 'READY';
        statusEl.className = '';
      };
      modeButtons.forEach(btn => btn.addEventListener('click', () => {
        mode = btn.dataset.simMode;
        modeButtons.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
        resetState();
        logEl.innerHTML = `<p class="sim-muted">Mode switched to <strong>${mode === 'locked' ? 'Row Locking (select_for_update)' : 'Without Locking (Naive)'}</strong>. Click “Run concurrent review”.</p>`;
      }));
      runBtn.addEventListener('click', () => {
        resetState();
        logEl.innerHTML = '';
        const steps = mode === 'locked'
          ? [
              [0, '[t=0ms] Staff A & Staff B both click “Mark Eligible” for Bulakan · SHS (1 slot left).', 'sim-muted'],
              [350, '[t=12ms] Staff A acquires PostgreSQL row lock via select_for_update() inside transaction.atomic().', ''],
              [750, '[t=14ms] Staff B blocks waiting on the row lock — cannot read stale capacity.', 'sim-warn'],
              [1150, '[t=28ms] Staff A commits: reserved 219 → 220 (0 remaining). AuditLog #4091 recorded.', 'sim-ok', () => { reservedEl.textContent = '220'; remainingEl.textContent = '0'; remainingEl.className = 'is-safe'; }],
              [1550, '[t=31ms] Staff B acquires lock, sees reserved == capacity (220/220), routes applicant to SLOTS_FULL.', 'sim-ok', () => { statusEl.textContent = 'SAFE (0 OVERBOOK)'; statusEl.className = 'is-safe'; }],
            ]
          : [
              [0, '[t=0ms] Staff A & Staff B both click “Mark Eligible” for Bulakan · SHS (1 slot left).', 'sim-muted'],
              [350, '[t=10ms] Staff A reads pool: reserved = 219 < 220 (looks available).', ''],
              [700, '[t=11ms] Staff B reads pool BEFORE Staff A commits: reserved = 219 < 220 (stale read!).', 'sim-warn'],
              [1100, '[t=24ms] Staff A writes reserved = 220.', '', () => { reservedEl.textContent = '220'; remainingEl.textContent = '0'; }],
              [1500, '[t=27ms] Staff B writes reserved = 221 → OVER-ALLOCATED (-1 slot) with inconsistent audit trail!', 'sim-err', () => { reservedEl.textContent = '221'; remainingEl.textContent = '-1'; remainingEl.className = 'is-danger'; statusEl.textContent = 'OVERBOOKED!'; statusEl.className = 'is-danger'; }],
            ];
        const delayScale = reduced ? 0 : 1;
        steps.forEach(([ms, text, cls, onStep]) => {
          timerIds.push(setTimeout(() => {
            const p = document.createElement('p');
            if (cls) p.className = cls;
            p.textContent = text;
            logEl.append(p);
            if (onStep) onStep();
          }, ms * delayScale));
        });
      });
    }

    // System Screenshots Gallery Filter & Lightbox
    const gallery = page.querySelector('[data-case-gallery]');
    const lightbox = document.querySelector('#case-lightbox');
    if (gallery && lightbox) {
      const cards = [...gallery.querySelectorAll('.case-gallery-card')];
      const filterButtons = [...page.querySelectorAll('[data-gallery-filter]')];
      const lbImg = lightbox.querySelector('#lightbox-img');
      const lbTitle = lightbox.querySelector('#lightbox-title');
      const lbCat = lightbox.querySelector('#lightbox-category');
      const lbCounter = lightbox.querySelector('#lightbox-counter');
      let visibleTriggers = cards.map(c => c.querySelector('.case-gallery-trigger'));
      let currentPos = 0;

      const syncVisible = () => {
        visibleTriggers = cards.filter(c => !c.hidden).map(c => c.querySelector('.case-gallery-trigger'));
      };

      const renderLightbox = (pos) => {
        if (!visibleTriggers.length) return;
        currentPos = (pos + visibleTriggers.length) % visibleTriggers.length;
        const trigger = visibleTriggers[currentPos];
        lbImg.src = trigger.dataset.src;
        lbImg.alt = `ScholarshipSystem — ${trigger.dataset.label}`;
        lbTitle.textContent = trigger.dataset.label;
        lbCat.textContent = trigger.dataset.category;
        lbCounter.textContent = `${currentPos + 1} / ${visibleTriggers.length}`;
      };

      filterButtons.forEach(btn => btn.addEventListener('click', () => {
        const category = btn.dataset.galleryFilter;
        filterButtons.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
        cards.forEach(card => {
          card.hidden = category !== 'All' && card.dataset.category !== category;
        });
        syncVisible();
      }));

      gallery.addEventListener('click', event => {
        const trigger = event.target.closest('.case-gallery-trigger');
        if (!trigger) return;
        syncVisible();
        const idx = visibleTriggers.indexOf(trigger);
        if (idx === -1) return;
        renderLightbox(idx);
        lightbox.showModal();
      });

      lightbox.querySelector('[data-lightbox-prev]').addEventListener('click', () => renderLightbox(currentPos - 1));
      lightbox.querySelector('[data-lightbox-next]').addEventListener('click', () => renderLightbox(currentPos + 1));
      lightbox.querySelector('[data-lightbox-close]').addEventListener('click', () => lightbox.close());
      lightbox.addEventListener('click', event => {
        if (event.target === lightbox) {
          const r = lightbox.getBoundingClientRect();
          if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) lightbox.close();
        }
      });
      lightbox.addEventListener('keydown', event => {
        if (event.key === 'ArrowLeft') { event.preventDefault(); renderLightbox(currentPos - 1); }
        if (event.key === 'ArrowRight') { event.preventDefault(); renderLightbox(currentPos + 1); }
      });
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
