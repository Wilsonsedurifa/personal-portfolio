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
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
