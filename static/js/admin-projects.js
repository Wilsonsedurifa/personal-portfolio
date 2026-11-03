document.querySelectorAll('input[type=file]').forEach(input => input.addEventListener('change', () => {
  let preview = input.parentElement.querySelector('.local-preview');
  if (!preview) { preview = document.createElement('div'); preview.className='local-preview'; input.parentElement.append(preview); }
  preview.replaceChildren();
  [...input.files].slice(0,10).forEach(file => { const img = new Image(); const url=URL.createObjectURL(file); img.className='thumbnail'; img.alt=file.name; img.onload=()=>URL.revokeObjectURL(url); img.src=url; preview.append(img); });
}));
