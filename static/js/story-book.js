document.addEventListener('DOMContentLoaded', () => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('.story-book').forEach(book => {
    const pages = [...book.querySelectorAll('[data-book-page]')];
    const tabs = [...book.querySelectorAll('[data-book-go]')];
    const previous = book.querySelector('[data-book-prev]');
    const next = book.querySelector('[data-book-next]');
    const physical = book.querySelector('.physical-book');
    const cover = book.querySelector('.book-front-cover');
    const interior = book.querySelector('.book-interior');
    const sheet = book.querySelector('.turning-sheet');
    const sheetFront = sheet.querySelector('.sheet-front');
    const scrollArea = book.querySelector('.book-pages');
    const indexPanel = book.querySelector('.book-index');
    const mobileToggle = book.querySelector('.mobile-index-toggle');
    const openCover=book.querySelector('.book-cover-trigger');
    let index = 0, trigger, busy = false, generation = 0, closing = false;
    const running = new Set();
    const readingPositions=pages.map(()=>0);
    const sheetBack=sheet.querySelector('.sheet-back');
    const castShadow=document.createElement('div');
    castShadow.className='book-cast-shadow';
    castShadow.setAttribute('aria-hidden','true');
    book.querySelector('.book-reading').append(castShadow);
    function updateReading(){
      if(!busy)readingPositions[index]=scrollArea.scrollTop;
      const max=scrollArea.scrollHeight-scrollArea.clientHeight;
      const amount=max>1?Math.min(1,scrollArea.scrollTop/max):1;
      book.querySelector('.book-reading-track i').style.transform=`scaleX(${amount})`;
      book.querySelector('.book-reading-position').textContent=max<=1?'Complete chapter':amount>.98?'End of chapter':scrollArea.scrollTop<8?'Scroll to continue':`${Math.round(amount*100)}% read`;
    }
    scrollArea.addEventListener('scroll',updateReading,{passive:true});
    new ResizeObserver(()=>{if(book.open)updateReading();}).observe(scrollArea);

    function motion(element, frames, options) {
      const animation = element.animate(frames, options);
      running.add(animation);
      return animation.finished.catch(() => {}).finally(() => running.delete(animation));
    }
    function lock(value) {
      busy = value;
      tabs.forEach(tab => tab.disabled = value);
      previous.disabled = value || index === 0;
      next.disabled = value || index === pages.length - 1;
      mobileToggle.disabled = value;
      physical.setAttribute('aria-busy',String(value));
    }
    function commit(target, focus) {
      index = target;
      pages.forEach((page,i) => {page.hidden = i !== index; page.inert = i !== index;});
      tabs.forEach((tab,i) => tab.setAttribute('aria-pressed',String(i === index)));
      book.querySelector('.book-counter').textContent = `${String(index+1).padStart(2,'0')} / ${String(pages.length).padStart(2,'0')}`;
      scrollArea.scrollTop = readingPositions[index];
      indexPanel.classList.remove('mobile-visible');
      mobileToggle.setAttribute('aria-expanded','false');
      if(focus) pages[index].focus({preventScroll:true});
      updateReading();
      const nextTitle=pages[index+1]?.querySelector('h3')?.textContent;
      next.title=nextTitle?`Next: ${nextTitle}`:'Last chapter';
      // Preload the following chapter without creating or fetching remote content.
      pages[index+1]?.querySelectorAll('img').forEach(image => image.loading = 'eager');
    }
    function clonePaper(page, offset) {
      const clone = page.cloneNode(true);
      clone.removeAttribute('hidden');
      clone.removeAttribute('data-book-page');
      clone.removeAttribute('tabindex');
      clone.removeAttribute('inert');
      clone.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
      clone.style.transform = `translateY(${-offset}px)`;
      sheetFront.replaceChildren(clone);
    }
    async function go(target) {
      target = Math.min(pages.length-1,Math.max(0,target));
      if(busy) return;
      if(target === index){indexPanel.classList.remove('mobile-visible');mobileToggle.setAttribute('aria-expanded','false');return;}
      const ticket = generation;
      const forward = target > index;
      if(reduced.matches) {commit(target,true);lock(false);return;}
      lock(true);
      readingPositions[index]=scrollArea.scrollTop;
      // Front contains the actual outgoing (or incoming for a reverse turn)
      // page; the blank verso stays unmirrored through backface-visibility.
      clonePaper(pages[forward ? index : target],forward ? scrollArea.scrollTop : readingPositions[target]);
      sheet.classList.add('is-turning');
      physical.classList.add('is-flipping');
      if(forward) {
        pages.forEach((page,i) => {page.hidden = i !== target;page.inert = true;});
        scrollArea.scrollTop = readingPositions[target];
      }
      const angles = forward ? [0,-86,-180] : [-180,-86,0];
      const shade = document.createElement('div');
      shade.className='sheet-moving-shade';
      sheetFront.append(shade);
      await Promise.all([
        motion(sheet, angles.map((angle,i) => ({transform:`rotateY(${angle}deg) translateZ(${i===1?10:0}px) rotateZ(${i===1?(forward?-.35:.35):0}deg)`,offset:[0,.5,1][i]})), {duration:800,easing:'cubic-bezier(.37,0,.2,1)',fill:'forwards'}),
        // Opacity compositing avoids repainting a large box-shadow every frame.
        motion(shade,[{opacity:0},{opacity:.55,offset:.5},{opacity:0}],{duration:800,easing:'ease-in-out'}),
        motion(castShadow,[{opacity:0,transform:'scaleX(.1)'},{opacity:.5,transform:'scaleX(.65)',offset:.42},{opacity:0,transform:'scaleX(1)'}],{duration:800,easing:'ease-in-out'}),
        motion(sheetBack,forward?[{opacity:1},{opacity:1,offset:.76},{opacity:0}]:[{opacity:0},{opacity:1,offset:.22},{opacity:1}],{duration:800,easing:'linear'})
      ]);
      if(ticket !== generation || !book.open) return;
      commit(target,true);
      sheet.classList.remove('is-turning');
      sheetFront.replaceChildren();
      sheet.getAnimations().forEach(animation => animation.cancel());
      physical.classList.remove('is-flipping');
      lock(false);
    }
    async function open(button) {
      if(book.open) return;
      trigger = button;
      ++generation;
      commit(index,false);
      book.showModal();
      book.classList.remove('is-closing');
      document.body.classList.add('book-is-open');
      book.querySelector('.book-close').focus();
      lock(true);
      book.classList.add('book-is-closed');
      interior.inert=true;
      cover.hidden=false;
      openCover.disabled=false;
      openCover.focus();
      if(!reduced.matches) await motion(physical,[{opacity:0,translate:'0 20px'},{opacity:1,translate:'0 0'}],{duration:350,easing:'ease-out'});
    }
    async function unfold(){
      if(!book.open||!book.classList.contains('book-is-closed')||openCover.disabled)return;
      openCover.disabled=true;
      const ticket=generation;
      const closedTransform=getComputedStyle(physical).transform;
      book.querySelector('.book-close').focus();
      book.classList.remove('book-is-closed');
      cover.hidden = reduced.matches;
      if(!reduced.matches) {
        interior.style.opacity = '0';
        const backing=[book.querySelector('.book-cover-under'),book.querySelector('.book-page-edges'),book.querySelector('.book-spine')];
        backing.forEach(layer=>layer.style.opacity='0');
        interior.style.opacity = '1';
        await Promise.all([
          motion(cover,[{transform:'rotateY(0)'},{transform:'rotateY(-178deg)'}],{duration:900,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'}),
          motion(physical,[{transform:closedTransform==='none'?'translateX(0)':closedTransform},{transform:'translateX(0)'}],{duration:900,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'}),
          motion(interior,[{opacity:0},{opacity:1}],{duration:450,easing:'ease-out'}),
          ...backing.map(layer=>motion(layer,[{opacity:0},{opacity:1}],{duration:650,easing:'ease-out',fill:'forwards'}))
        ]);
        if(ticket!==generation || !book.open)return;
        physical.getAnimations().forEach(animation=>animation.cancel());
        backing.forEach(layer=>{layer.style.opacity='1';layer.getAnimations().forEach(animation=>animation.cancel());});
      }
      cover.hidden = true;
      cover.getAnimations().forEach(animation => animation.cancel());
      interior.inert=false;
      lock(false);
      pages[index].focus({preventScroll:true});
    }
    openCover.addEventListener('click',unfold);
    document.querySelectorAll('[data-story-open]').forEach(button => {
      if(button.dataset.storyOpen === book.id) button.addEventListener('click',() => open(button));
    });
    previous.addEventListener('click',() => go(index-1));
    next.addEventListener('click',() => go(index+1));
    tabs.forEach(tab => tab.addEventListener('click',() => go(Number(tab.dataset.bookGo))));
    mobileToggle.addEventListener('click',() => {const show=indexPanel.classList.toggle('mobile-visible');mobileToggle.setAttribute('aria-expanded',String(show));});
    async function closeBook(){
      if(closing || !book.open)return;
      closing=true;
      generation++;
      running.forEach(animation=>animation.cancel());running.clear();
      sheet.classList.remove('is-turning');
      cover.hidden=true;
      interior.style.opacity='1';
      physical.getAnimations().forEach(animation=>animation.cancel());
      book.querySelectorAll('.book-cover-under,.book-page-edges,.book-spine').forEach(layer=>{layer.getAnimations().forEach(animation=>animation.cancel());layer.style.opacity='1';});
      book.classList.add('is-closing');
      lock(true);
      if(!reduced.matches){
        await motion(book.querySelector('.book-environment'),[{opacity:1,transform:'translateY(0) scale(1)'},{opacity:0,transform:'translateY(14px) scale(.98)'}],{duration:260,easing:'cubic-bezier(.4,0,1,1)'});
      }
      book.close();
    }
    book.querySelector('.book-close').addEventListener('click',closeBook);
    book.addEventListener('cancel',event=>{event.preventDefault();closeBook();});
    book.addEventListener('keydown',event => {
      if(event.target.closest('input,textarea,select,[contenteditable=true]'))return;
      if(event.key==='ArrowRight' || event.key==='ArrowLeft') {event.preventDefault();go(index+(event.key==='ArrowRight'?1:-1));}
    });
    let touchX=0,touchY=0;
    scrollArea.addEventListener('touchstart',event=>{touchX=event.changedTouches[0].clientX;touchY=event.changedTouches[0].clientY;},{passive:true});
    scrollArea.addEventListener('touchend',event=>{const dx=event.changedTouches[0].clientX-touchX,dy=event.changedTouches[0].clientY-touchY;if(Math.abs(dx)>70&&Math.abs(dx)>Math.abs(dy)*1.5)go(index+(dx<0?1:-1));},{passive:true});
    book.addEventListener('click',event=>{if(event.target===book){const r=book.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeBook();}});
    book.addEventListener('close',() => {
      generation++;
      closing=false;
      book.classList.remove('book-is-closed');
      interior.inert=false;
      book.classList.remove('is-closing');
      running.forEach(animation=>animation.cancel());running.clear();
      sheet.getAnimations().forEach(animation=>animation.cancel());
      cover.getAnimations().forEach(animation=>animation.cancel());
      sheet.classList.remove('is-turning');sheetFront.replaceChildren();physical.classList.remove('is-flipping');
      cover.hidden=true;interior.style.opacity='1';lock(false);
      physical.getAnimations().forEach(animation=>animation.cancel());
      book.querySelectorAll('.book-cover-under,.book-page-edges,.book-spine').forEach(layer=>layer.style.opacity='1');
      document.body.classList.remove('book-is-open');
      trigger?.focus({preventScroll:true});
    });
    commit(0,false);lock(false);cover.hidden=true;
  });
});
