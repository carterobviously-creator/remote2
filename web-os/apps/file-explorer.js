export function create(container,API){
  const list = document.createElement('div')
  for(const name of Object.keys(API.fs.files)){
    const row = document.createElement('div'); row.style.padding='8px'; row.style.borderBottom='1px solid rgba(255,255,255,0.02)'
    row.textContent = name
    row.addEventListener('dblclick',()=> window.neonOpenFile(name))
    list.appendChild(row)
  }
  container.appendChild(list)
}