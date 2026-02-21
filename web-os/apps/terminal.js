export function create(container,API){
  const out = document.createElement('div'); out.style.height='220px'; out.style.overflow='auto'; out.style.background='rgba(0,0,0,0.2)'; out.style.padding='8px'; out.style.borderRadius='6px'
  const input = document.createElement('input'); input.style.width='100%'; input.placeholder='Type help and press Enter'
  input.addEventListener('keydown',e=>{
    if(e.key==='Enter'){
      const cmd = input.value.trim(); input.value=''; const p=document.createElement('div'); p.textContent='> '+cmd; out.appendChild(p)
      if(cmd==='help'){ out.appendChild(document.createElement('div')).textContent='Available: help, ls, cat <file>' }
      else if(cmd==='ls'){ out.appendChild(document.createElement('div')).textContent=Object.keys(API.fs.files).join('  ') }
      else if(cmd.startsWith('cat ')){ const f=cmd.slice(4); out.appendChild(document.createElement('div')).textContent=API.fs.read(f) }
      else out.appendChild(document.createElement('div')).textContent='command not found'
      out.scrollTop = out.scrollHeight
    }
  })
  container.appendChild(out); container.appendChild(input)
}