// One progress value owns the camera, text, and both screen layers.
document.addEventListener('DOMContentLoaded', () => {
  const journey = document.querySelector('.journey');
  const scene = document.querySelector('.scene');
  const hero = document.querySelector('.hero-copy');
  const about = document.querySelector('.about-copy');
  const laptop = document.querySelector('.laptop');
  const symbol = document.querySelector('.symbol');
  const editor = document.querySelector('.editor');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = v => Math.min(1, Math.max(0, v));
  const smooth = v => { v = clamp(v); return v * v * (3 - 2 * v); };
  let displayed = 0;
  let frame;
  const progress = document.createElement('div');
  progress.className = 'journey-progress';
  document.body.append(progress);

  function paint(p) {
    const blend = smooth((p - .28) / .4);
    const footer=scene.querySelector('.hero-scene-footer');
    if(footer){
      const visibility=1-smooth((p-.45)/.35);
      footer.style.opacity=visibility;
      footer.inert=visibility<.1;
    }
    const boundary=journey.offsetTop+journey.offsetHeight-innerHeight;
    const departure=smooth((scrollY-boundary)/(innerHeight*.65));
    hero.style.opacity = 1 - smooth((p - .16) / .26);
    hero.style.transform = `translateY(${-blend * 48}px)`;
    about.style.opacity = smooth((p - .49) / .27)*(1-departure);
    about.style.transform = `translateY(${(1 - blend) * 38-departure*65}px)`;
    hero.inert = p > .4;
    about.inert = p < .5;
    // The incoming layer is fully painted under the outgoing layer.
    editor.style.opacity = '1';
    symbol.style.opacity = 1 - blend;
    symbol.style.transform = `scale(${1 + blend * .08})`;
    editor.style.transform = `scale(${1.035 - blend * .035})`;
    laptop.style.opacity=1-departure*.9;
    laptop.style.transform = `rotateY(${-11 + blend * 16+departure*5}deg) rotateX(${7 + blend * 3}deg) translateY(${-blend * 20-departure*30}px) scale(${1-departure*.06})`;
    scene.style.setProperty('--light', .18 + blend * .15);
    progress.style.transform = `scaleX(${clamp(scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight))})`;
  }

  function render() {
    frame = 0;
    const target = clamp((scrollY - journey.offsetTop) / Math.max(1, journey.offsetHeight - innerHeight));
    displayed += (target - displayed) * .12;
    paint(displayed);
    if (Math.abs(target-displayed)>.0001) frame = requestAnimationFrame(render);
  }

  function setup() {
    cancelAnimationFrame(frame);
    if (reduced.matches) return;
    document.body.classList.add('motion-ready');
    displayed = clamp((scrollY - journey.offsetTop) / Math.max(1, journey.offsetHeight - innerHeight));
    if (displayed < .05) {
      // Animate inner content so the scroll controller keeps owning the camera.
      hero.querySelectorAll('.eyebrow,h1,h2,p:not(.eyebrow),div').forEach((element,index) => {
        element.animate([{opacity:0,transform:'translateY(22px)'},{opacity:1,transform:'translateY(0)'}], {duration:850,delay:index*90,easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'});
      });
      laptop.querySelector('.lid').animate([{opacity:0,transform:'rotateX(-35deg)'},{opacity:1,transform:'rotateX(0deg)'}], {duration:1300,easing:'cubic-bezier(.16,1,.3,1)'});
    }
    render();
  }

  document.querySelectorAll('a[href="#about"]').forEach(link => link.addEventListener('click', event => {
    if (reduced.matches) return;
    event.preventDefault();
    scrollTo({ top: journey.offsetTop + journey.offsetHeight - innerHeight, behavior: 'smooth' });
  }));
  reduced.addEventListener('change', () => location.reload());
  function schedule(){if(!frame&&!reduced.matches)frame=requestAnimationFrame(render);}
  addEventListener('scroll',schedule,{passive:true});
  addEventListener('resize',schedule,{passive:true});
  setup();
});
// Native dialog provides focus trapping, Escape dismissal, and focus restoration.
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.querySelector('#resume-modal');
  if (!modal || typeof modal.showModal !== 'function') return;
  const preview = modal.querySelector('.resume-preview');
  let trigger;
  document.querySelectorAll('[data-resume-open]').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      trigger = link;
      if (!preview.hasAttribute('src')) preview.src = preview.dataset.src;
      modal.showModal();
      document.body.classList.add('resume-is-open');
      modal.querySelector('.resume-close').focus();
    });
  });
  modal.querySelector('.resume-close').addEventListener('click', () => modal.close());
  modal.addEventListener('click', event => {
    if (event.target !== modal) return;
    const bounds = modal.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) modal.close();
  });
  modal.addEventListener('close', () => {
    document.body.classList.remove('resume-is-open');
    trigger?.focus({ preventScroll: true });
  });
});
// Accessible compact navigation for touch and small screens.
document.addEventListener('DOMContentLoaded', () => {
  const toggle=document.querySelector('.mobile-menu-toggle');
  const navigation=document.querySelector('#primary-navigation');
  if(!toggle||!navigation)return;
  function closeMenu(){toggle.setAttribute('aria-expanded','false');navigation.classList.remove('mobile-open');}
  toggle.addEventListener('click',()=>{
    const open=toggle.getAttribute('aria-expanded')!=='true';
    toggle.setAttribute('aria-expanded',String(open));
    navigation.classList.toggle('mobile-open',open);
  });
  navigation.querySelectorAll('a').forEach(link=>link.addEventListener('click',closeMenu));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&toggle.getAttribute('aria-expanded')==='true'){closeMenu();toggle.focus();}});
  document.addEventListener('click',event=>{if(!event.target.closest('header'))closeMenu();});
});
