export function create(container,API){
  const file = document.createElement('div');file.className='app-area'
  const header = document.createElement('div'); header.style.marginBottom='8px'
  const saveBtn = document.createElement('button'); saveBtn.className='button-neon'; saveBtn.textContent='Save'
  const filename = document.createElement('input'); filename.value = 'untitled.txt'; filename.style.marginRight='8px'
  header.appendChild(filename); header.appendChild(saveBtn)
  const ta = document.createElement('textarea'); ta.value = API.fs.read('welcome.txt')
  saveBtn.addEventListener('click',()=>{ API.fs.write(filename.value,ta.value); alert('Saved '+filename.value) })
  file.appendChild(header); file.appendChild(ta)
  container.appendChild(file)
}