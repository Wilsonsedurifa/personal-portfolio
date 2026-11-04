document.addEventListener('DOMContentLoaded', () => {
  const section = document.querySelector('.project-showcase');
  if (!section) return;
  const screens = [...section.querySelectorAll('.project-screen')];
  if (!screens.length) return;
  const details = [...section.querySelectorAll('[data-details-index]')];
  const device = section.querySelector('.showcase-device');
  const laptop = section.querySelector('.project-laptop');
  const layout = section.querySelector('.showcase-layout');
  const interfaceStage = section.querySelector('#interface-stage');
  const systemStage = section.querySelector('#system-stage');
  const systemArticles = [...section.querySelectorAll('[data-system-index]')];
  const galleryControls = section.querySelector('.gallery-controls');
  const scrollNote = section.querySelector('.screen-scroll-note');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const imageCounter = section.querySelector('#image-counter');
  const positions = screens.map(() => 0);
  const viewer=document.querySelector('#project-viewer');
  const viewerImage=viewer.querySelector('#viewer-image');
  const zoom=viewer.querySelector('#viewer-zoom');
  const expand=section.querySelector('[data-expand-preview]');
  function setZoom(){
    viewerImage.style.width=zoom.value==='fit'?'100%':`${viewerImage.naturalWidth*Number(zoom.value)/100}px`;
    viewerImage.style.maxWidth=zoom.value==='fit'?'100%':'none';
  }
  expand.addEventListener('click',async()=>{
    const image=screens[selected].querySelectorAll('.project-slide')[positions[selected]];
    if(!image)return;
    await prepare(image);
    if(image.classList.contains('image-error'))return;
    viewerImage.src=image.src;
    viewerImage.alt=image.alt;
    viewer.querySelector('#viewer-title').textContent=details[selected].querySelector('h3').textContent;
    viewer.querySelector('#viewer-caption').textContent=`Screenshot ${positions[selected]+1} · scroll to explore`;
    zoom.value='fit';
    viewerImage.onload=setZoom;
    viewer.showModal();
    document.body.classList.add('project-viewer-open');
    viewer.querySelector('.viewer-canvas').scrollTo(0,0);
  });
  zoom.addEventListener('change',setZoom);
  viewer.querySelector('[data-viewer-close]').addEventListener('click',()=>viewer.close());
  viewer.addEventListener('click',event=>{if(event.target===viewer){const r=viewer.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)viewer.close();}});
  viewer.addEventListener('close',()=>{document.body.classList.remove('project-viewer-open');expand.focus({preventScroll:true});});
  let selected = 0, requestId = 0;
  const animations = new Map();
  let view='interface',viewRequest=0;

  async function setView(nextView){
    if(view===nextView){
      ++viewRequest;
      const visible=view==='interface'?interfaceStage:systemStage;
      visible.getAnimations().forEach(animation=>animation.cancel());
      layout.dataset.viewTransitioning='false';
      return;
    }
    const ticket=++viewRequest;
    layout.dataset.viewTransitioning='true';
    const outgoing=view==='interface'?interfaceStage:systemStage;
    const incoming=nextView==='interface'?interfaceStage:systemStage;
    if(!reduced.matches){
      const exit=outgoing.animate([{opacity:1},{opacity:0}],{duration:140,easing:'ease-out'});
      await exit.finished.catch(()=>{});
      if(ticket!==viewRequest)return;
    }
    outgoing.hidden=true;
    incoming.hidden=false;
    view=nextView;
    layout.classList.toggle('is-system',view==='system');
    section.querySelectorAll('[data-system-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.systemView===view)));
    const entrance=animate(incoming,[{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],{duration:450,easing:'cubic-bezier(.2,.7,.2,1)'});
    window.dispatchEvent(new Event('resize'));
    if(entrance)await entrance.finished.catch(()=>{});
    if(ticket===viewRequest)layout.dataset.viewTransitioning='false';
  }
  section.querySelectorAll('[data-system-view]').forEach(button=>button.addEventListener('click',()=>setView(button.dataset.systemView)));

  function animate(element, frames, options) {
    animations.get(element)?.cancel();
    if (reduced.matches) return;
    const animation = element.animate(frames, options);
    animations.set(element, animation);
    animation.finished.catch(() => {});
    return animation;
  }

  async function prepare(image) {
    if (!image) return false;
    image.loading = 'eager';
    try {
      await image.decode();
      image.classList.remove('image-error');
      return true;
    } catch {
      image.closest('.project-image-scroll')?.remove();
      return false;
    }
  }


  function updateControls() {
    const images = [...screens[selected].querySelectorAll('.project-slide')];
    expand.disabled=!images.length;
    expand.hidden = !images.length;
    galleryControls.hidden = !images.length;
    scrollNote.hidden = !images.length;
    if (images.length) positions[selected] %= images.length;
    imageCounter.textContent = `${positions[selected] + 1} / ${images.length} screenshots`;
    section.querySelectorAll('[data-image-prev],[data-image-next]').forEach(button => button.disabled = images.length < 2);
    section.querySelector('#project-counter').textContent = `${String(selected + 1).padStart(2,'0')} / ${String(screens.length).padStart(2,'0')}`;
    section.querySelectorAll('[data-project-index]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.projectIndex) === selected)));
  }

  async function select(index) {
    const next = (index + screens.length) % screens.length;
    if (next === selected) return;
    const ticket = ++requestId;
    device.setAttribute('aria-busy','true');
    const incoming = screens[next];
    const image = incoming.querySelectorAll('.project-slide')[positions[next]];
    await prepare(image);
    if (ticket !== requestId) return;
    const previous = selected;
    selected = next;
    screens.forEach((screen,i) => {
      screen.classList.toggle('is-current', i === selected);
      screen.classList.toggle('is-outgoing', i === previous);
      screen.setAttribute('aria-hidden', String(i !== selected));
      screen.inert = i !== selected;
    });
    // Keep the outgoing screen fully painted below the incoming dissolve.
    animate(incoming, [{opacity:0},{opacity:1}], {duration:650,easing:'cubic-bezier(.2,.7,.2,1)'});
    details.forEach((detail,i) => detail.hidden = i !== selected);
    systemArticles.forEach((article,i)=>article.hidden=i!==selected);
    section.querySelector('#preview-project-title').textContent=details[selected].querySelector('h3').textContent;
    if(view==='system')animate(systemArticles[selected],[{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}],{duration:450,easing:'ease-out'});
    animate(details[selected], [{opacity:0,transform:'translateY(14px)'},{opacity:1,transform:'translateY(0)'}], {duration:500,easing:'ease-out'});
    updateControls();
    device.setAttribute('aria-busy','false');
    prepare(screens[(selected + 1) % screens.length].querySelector('img'));
  }

  async function gallery(direction) {
    const index = selected, ticket = ++requestId;
    const images = [...screens[index].querySelectorAll('.project-slide')];
    if (images.length < 2) return;
    const next = (positions[index] + direction + images.length) % images.length;
    await prepare(images[next]);
    if (ticket !== requestId || index !== selected) return;
    positions[index] = next;
    images.forEach((image,i) => image.classList.toggle('is-visible',i === next));
    updateControls();
  }

  section.querySelectorAll('[data-project-index]').forEach(button => button.addEventListener('click', () => select(Number(button.dataset.projectIndex))));
  section.querySelector('[data-project-prev]').addEventListener('click', () => select(selected - 1));
  section.querySelector('[data-project-next]').addEventListener('click', () => select(selected + 1));
  section.querySelector('[data-image-prev]').addEventListener('click', () => gallery(-1));
  section.querySelector('[data-image-next]').addEventListener('click', () => gallery(1));
  device.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); select(selected + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  let touchX = 0, touchY = 0;
  device.addEventListener('touchstart', event => { touchX = event.changedTouches[0].clientX; touchY = event.changedTouches[0].clientY; }, {passive:true});
  device.addEventListener('touchend', event => {
    const dx = event.changedTouches[0].clientX - touchX, dy = event.changedTouches[0].clientY - touchY;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) select(selected + (dx < 0 ? 1 : -1));
  }, {passive:true});

  section.querySelectorAll('.project-slide').forEach(image => image.addEventListener('error', () => {
    image.closest('.project-image-scroll')?.remove();
    updateControls();
  }));
  screens.forEach((screen,index) => { screen.inert = index !== 0; });
  Promise.all([...section.querySelectorAll('.project-slide')].map(prepare)).finally(updateControls);
  // Scroll owns the outer camera; project switching owns the inner laptop.
  // Separate transform layers avoid animation collisions and reverse naturally.
  if (!reduced.matches) {
    const heading=section.querySelector('.showcase-top');
    const selector=section.querySelector('.project-selector');
    const bottom=section.querySelector('.showcase-bottom');
    const title=heading.querySelector('h2');
    const intro=heading.querySelector('p:not(.eyebrow)');
    const clamp=value=>Math.min(1,Math.max(0,value));
    const ease=value=>{value=clamp(value);return value*value*(3-2*value);};
    let frameId=0;
    let current=scrollY;
    function reveal(element, distance, top, offset=0) {
      const amount=ease((innerHeight*1.05-top-offset)/(innerHeight*.34));
      element.style.opacity=.8+.2*amount;
      element.style.translate=`0 ${(1-amount)*distance}px`;
    }
    function paint(){
      frameId=0;
      if(reduced.matches)return;
      current+=(scrollY-current)*.09;
      // Measure untransformed layout, not last frame's animated bounding box.
      const sectionTop=section.getBoundingClientRect().top+scrollY;
      const top=sectionTop-current;
      const deviceTop=top+layout.offsetTop+section.querySelector('.showcase-visual').offsetTop;
      const entry=ease((innerHeight*1.08-deviceTop)/(innerHeight*.4));
      const mobile=innerWidth<=760;
      const camera=ease((innerHeight*.9-deviceTop)/innerHeight);
      device.style.opacity=.65+.35*entry;
      device.style.transform=`translate3d(0,${(1-entry)*(mobile?28:70)}px,0) scale(${.94+entry*.06})`;
      laptop.style.transform=`rotateX(${mobile?3:6+(1-camera)*10}deg) rotateY(${mobile?0:-9+camera*12}deg)`;
      // The hinge and camera use separate layers so screenshots keep their size.
      laptop.querySelector('.project-lid').style.transform=`rotateX(${(1-entry)*-88}deg)`;
      section.style.setProperty('--showcase-light',String(.12+entry*.13));
      reveal(heading,45,top+heading.offsetTop);
      const titleProgress=ease((innerHeight*.93-top-heading.offsetTop)/(innerHeight*.4));
      title.style.clipPath=`inset(0 0 ${(1-titleProgress)*100}% 0)`;
      title.style.translate=`0 ${(1-titleProgress)*24}px`;
      if(intro)intro.style.opacity=ease((titleProgress-.2)/.8);
      reveal(selector,35,deviceTop,40);
      reveal(bottom,25,top+bottom.offsetTop);
      if(Math.abs(scrollY-current)>.2) frameId=requestAnimationFrame(paint);
    }
    const schedule=()=>{if(!frameId)frameId=requestAnimationFrame(paint);};
    addEventListener('scroll',schedule,{passive:true});
    addEventListener('resize',schedule,{passive:true});
    reduced.addEventListener('change',()=>{
      if(reduced.matches){
        cancelAnimationFrame(frameId);
        frameId=0;
        device.style.removeProperty('transform');
        device.style.removeProperty('opacity');
        laptop.style.removeProperty('transform');
        laptop.querySelector('.project-lid').style.removeProperty('transform');
      }else schedule();
    });
    // Moving focus to a control always makes its surrounding content legible.
    section.addEventListener('focusin',()=>{selector.style.opacity='1';bottom.style.opacity='1';});
    schedule();
  }
});
