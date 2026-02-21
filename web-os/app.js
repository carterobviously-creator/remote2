const API = {
  fs: {
    files: {"welcome.txt":"Welcome to Neon Web OS!\nUse the File Explorer to open files."},
    read(name){return this.files[name]||''},
    write(name,content){this.files[name]=content}
  }
}

// service worker registration
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('/web-os/service-worker.js').catch(()=>{})
}

const apps = {
  'text-editor': async ()=>import('./apps/text-editor.js'),
  'file-explorer': async ()=>import('./apps/file-explorer.js'),
  'terminal': async ()=>import('./apps/terminal.js')
}

const desktop = document.getElementById('desktop')
const iconsEl = document.getElementById('icons')
const windowsEl = document.getElementById('windows')
const startBtn = document.getElementById('start-button')
const startMenu = document.getElementById('start-menu')
const taskbarWin = document.getElementById('taskbar-windows')

document.getElementById('clock').textContent = new Date().toLocaleTimeString()
setInterval(()=>document.getElementById('clock').textContent = new Date().toLocaleTimeString(),1000)

startBtn.addEventListener('click',()=>startMenu.classList.toggle('hidden'))
startMenu.addEventListener('click',async (e)=>{
  const app = e.target.getAttribute('data-app')
  if(app) openApp(app)
})

// desktop icons
['file-explorer','text-editor','terminal'].forEach(id=>{
  const el = document.createElement('div');el.className='icon';el.innerHTML=`<div class="emoji">🟩</div><div class="label">${id.replace('-', ' ')}</div>`
  el.addEventListener('dblclick',()=>openApp(id))
  iconsEl.appendChild(el)
})

let zIndex = 10
function openApp(name,opts={}){
  createWindow(name,opts)
}

function createWindow(name,opts){
  const w = document.createElement('div');w.className='window';w.style.left=(40+Math.random()*80)+'px';w.style.top=(40+Math.random()*80)+'px';w.style.zIndex=++zIndex
  w.innerHTML = `
    <div class="titlebar"><div class="title">${name}</div><div class="controls"><button class="close">✕</button></div></div>
    <div class="content">Loading...</div>`
  windowsEl.appendChild(w)
  const closeBtn = w.querySelector('.close');closeBtn.onclick=()=>w.remove()
  makeDraggable(w)
  // load app module
  apps[name]().then(mod=>{
    const content = w.querySelector('.content')
    content.innerHTML = ''
    if(mod && mod.create){ mod.create(content,API) }
  }).catch(err=>{
    w.querySelector('.content').textContent = 'Failed to load app.'
  })
}

function makeDraggable(el){
  const bar = el.querySelector('.titlebar')
  let dx=0,dy=0,dragging=false
  bar.addEventListener('pointerdown',e=>{dragging=true;dx=e.clientX-el.offsetLeft;dy=e.clientY-el.offsetTop; el.style.zIndex=++zIndex})
  document.addEventListener('pointermove',e=>{if(!dragging) return; el.style.left=(e.clientX-dx)+'px'; el.style.top=(e.clientY-dy)+'px'})
  document.addEventListener('pointerup',()=>dragging=false)
}

// simple API to open file in editor
window.neonOpenFile = function(name){ openApp('text-editor',{file:name}) }