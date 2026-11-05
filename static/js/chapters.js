// Scroll progress owns the lower chapters; the default HTML stays fully visible.
document.addEventListener('DOMContentLoaded',()=>{
  const toolkitIndex=document.querySelector('.toolkit-index');
  if(toolkitIndex&&!toolkitIndex.querySelector('[data-tool="postgresql"]')){
    const row=document.createElement('article');
    row.dataset.tool='postgresql';
    row.innerHTML='<span>08</span><h3>PostgreSQL</h3><p>ScholarshipSystem · structured data and relational workflows</p><b aria-hidden="true">↗</b>';
    toolkitIndex.append(row);
  }
  const reduced=matchMedia('(prefers-reduced-motion:reduce)');
  const sections=[...document.querySelectorAll('.chapter-section')];
  const clamp=value=>Math.max(0,Math.min(1,value));
  const ease=value=>{value=clamp(value);return value*value*(3-2*value);};
  let frame=0,displayed=scrollY;
  const items=[];
  function register(element,distance=50,delay=0,side=0){
    if(element)items.push({element,distance,delay,side,top:0});
  }
  sections.forEach(section=>{
    register(section.querySelector('.eyebrow'),22);
    register(section.querySelector('h2'),65);
    register(section.querySelector('.chapter-heading>p:last-child'),38,.07);
    if(section.matches('.connection'))register(section.querySelector(':scope>p:not(.eyebrow)'),35,.08);
    section.querySelectorAll('.toolkit-index article').forEach((row,index)=>register(row,38,.04,index%2===0?-18:18));
    section.querySelectorAll('.process-steps article').forEach((step,index)=>register(step,55,index*.06));
    section.querySelectorAll('.connection-links a').forEach((link,index)=>register(link,25,index*.025));
  });
  function absoluteTop(element){let result=0;for(let node=element;node;node=node.offsetParent)result+=node.offsetTop;return result;}
  function measure(){items.forEach(item=>item.top=absoluteTop(item.element));}
  function reset(){
    cancelAnimationFrame(frame);frame=0;
    items.forEach(({element})=>{element.style.removeProperty('opacity');element.style.removeProperty('translate');element.style.removeProperty('--row-progress');});
  }
  function render(){
    frame=0;
    if(reduced.matches||document.hidden)return;
    displayed+=(scrollY-displayed)*.14;
    const vh=innerHeight;
    items.forEach(({element,top,distance,delay,side})=>{
      let p=ease((vh*.96-(top-displayed)-delay*vh)/(vh*.62));
      if(element.contains(document.activeElement))p=1;
      element.style.opacity=String(.08+p*.92);
      element.style.translate=`${(1-p)*side}px ${(1-p)*distance}px`;
      if(element.matches('.toolkit-index article')){
        element.style.setProperty('--row-progress',p);
        element.classList.toggle('toolkit-row-revealed',p>.98);
      }
    });
    if(Math.abs(scrollY-displayed)>.25)frame=requestAnimationFrame(render);
  }
  function schedule(){if(!reduced.matches&&!frame)frame=requestAnimationFrame(render);}
  function refresh(){measure();schedule();}
  addEventListener('scroll',schedule,{passive:true});
  addEventListener('resize',refresh,{passive:true});
  addEventListener('load',refresh);
  document.fonts?.ready.then(refresh);
  document.addEventListener('focusin',schedule);
  document.addEventListener('visibilitychange',schedule);
  reduced.addEventListener('change',()=>{reset();displayed=scrollY;refresh();});
  measure();schedule();
});
