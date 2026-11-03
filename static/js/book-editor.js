// Small Markdown formatting helpers; all rendering is escaped server-side.
document.querySelectorAll('.story-editor textarea[name$="_story"]').forEach(input => {
  const toolbar=document.createElement('div');toolbar.className='story-formatting';toolbar.setAttribute('aria-label','Story formatting');
  const formats=[['Bold','**','**'],['Italic','*','*'],['Heading','\n## ','\n'],['Bullet','\n- ',''],['Numbered','\n1. ',''],['Link','[','](https://example.com)'],['Code','\n```\n','\n```\n']];
  formats.forEach(([label,before,after])=>{
    const button=document.createElement('button');button.type='button';button.textContent=label;
    button.addEventListener('click',()=>{
      const start=input.selectionStart,end=input.selectionEnd,selected=input.value.slice(start,end)||'text';
      input.setRangeText(before+selected+after,start,end,'end');input.focus();input.dispatchEvent(new Event('input',{bubbles:true}));
    });toolbar.append(button);
  });input.before(toolbar);
});
