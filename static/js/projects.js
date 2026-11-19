document.addEventListener('DOMContentLoaded', () => {
  const section = document.querySelector('.project-showcase');
  if (!section) return;
  const screens = [...section.querySelectorAll('.project-screen')];
  if (!screens.length) return;
  const details = [...section.querySelectorAll('[data-details-index]')];
  const device = section.querySelector('.showcase-device');
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
    const caption=image.dataset.caption;
    viewer.querySelector('#viewer-title').textContent=details[selected].querySelector('h3').textContent;
    viewer.querySelector('#viewer-caption').textContent=caption?`Screenshot ${positions[selected]+1} · ${caption}`:`Screenshot ${positions[selected]+1} · scroll to explore`;
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
    const currentCaption = images[positions[selected]]?.dataset.caption;
    imageCounter.textContent = currentCaption
      ? `${positions[selected] + 1} / ${images.length} · ${currentCaption}`
      : `${positions[selected] + 1} / ${images.length} screenshots`;
    section.querySelectorAll('[data-image-prev],[data-image-next]').forEach(button => button.disabled = images.length < 2);
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
    animate(images[next], [{opacity:0,transform:'scale(.975) translateY(10px)'},{opacity:1,transform:'scale(1) translateY(0)'}], {duration:380,easing:'cubic-bezier(.2,.8,.2,1)'});
    updateControls();
  }

  section.querySelectorAll('[data-project-index]').forEach(button => button.addEventListener('click', () => select(Number(button.dataset.projectIndex))));
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
  updateControls();
  prepare(screens[0].querySelector('.project-slide')).finally(updateControls);
});
