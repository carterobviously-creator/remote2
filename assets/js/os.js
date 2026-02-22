/*
  ispwin OS - all JS in one file, organized modularly to keep things simple.
  Components:
    - EventBus (BroadcastChannel + localStorage fallback)
    - WindowManager
    - FileSystem (fake)
    - AppRegistry with Explorer, Editor, Calculator, Settings
    - Desktop & Taskbar UI
*/
(function(){
  const CHANNEL = 'ispwin-channel';

  /* ---------------- Event Bus ---------------- */
  class EventBus {
    constructor(name){
      this.name = name || CHANNEL;
      if ('BroadcastChannel' in window){
        this.bc = new BroadcastChannel(this.name);
        this.handlers = [];
        this.bc.addEventListener('message', (e)=> this.handlers.forEach(h => h(e.data)));
      } else {
        this.handlers = [];
        window.addEventListener('storage', (e)=>{
          if (e.key === this.name && e.newValue) {
            try { const obj = JSON.parse(e.newValue); this.handlers.forEach(h => h(obj)); } catch(e){}
          }
        });
      }
    }
    send(obj){
      if (this.bc) this.bc.postMessage(obj);
      else {
        localStorage.setItem(this.name, JSON.stringify(obj));
        setTimeout(()=> localStorage.removeItem(this.name), 200);
      }
    }
    on(fn){ this.handlers.push(fn); }
  }
  const Bus = new EventBus(CHANNEL);

  /* ---------------- Simple File System ---------------- */
  class FileSystem {
    constructor(){
      this.storeKey = 'ispwin-files';
      this.data = this._load() || {
        '/': { type:'folder', children: { 'Documents': { type:'folder', children: { 'notes.txt': { type:'file', content: 'Welcome to ispwin OS\n\nThis is a sample file.' } } }, 'Readme.txt': { type:'file', content: 'ispwin OS - demo file' } } }
      };
    }
    _load(){ try { return JSON.parse(localStorage.getItem(this.storeKey)); } catch(e){return null} }
    _save(){ localStorage.setItem(this.storeKey, JSON.stringify(this.data)); }
    getNode(path){
      if (!path || path === '/') return this.data['/'];
      const parts = path.split('/').filter(Boolean);
      let node = this.data['/'];
      for (const p of parts){
        if (!node.children || !node.children[p]) return null;
        node = node.children[p];
      }
      return node;
    }
    list(path='/'){
      const node = this.getNode(path);
      if (!node || node.type !== 'folder') return null;
      return Object.entries(node.children).map(([name, v]) => ({ name, ...v }));
    }
    readFile(path){
      const node = this.getNode(path);
      return (node && node.type === 'file') ? node.content : null;
    }
    writeFile(path, content){
      const parts = path.split('/').filter(Boolean);
      if (!parts.length) return false;
      const fileName = parts.pop();
      let node = this.data['/'];
      for (const p of parts){
        node.children = node.children || {};
        node.children[p] = node.children[p] || { type:'folder', children:{} };
        node = node.children[p];
      }
      node.children = node.children || {};
      node.children[fileName] = { type:'file', content: content };
      this._save();
      return true;
    }
    mkdir(path){
      const parts = path.split('/').filter(Boolean);
      let node = this.data['/'];
      for (const p of parts){
        node.children = node.children || {};
        node.children[p] = node.children[p] || { type:'folder', children:{} };
        node = node.children[p];
      }
      this._save();
    }
  }
  const FS = new FileSystem();

  /* ---------------- Window Manager ---------------- */
  class WindowManager {
    constructor(container){
      this.container = container;
      this.z = 100;
      this.windows = {};
      this.taskbar = document.getElementById('taskbar-windows');
    }
    createWindow({ id, title, width=520, height=340, x=60, y=60, appId=null }){
      const el = document.createElement('div');
      el.className = 'window';
      el.style.width = width + 'px';
      el.style.height = height + 'px';
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      el.dataset.winId = id;

      const titlebar = document.createElement('div');
      titlebar.className = 'titlebar';
      titlebar.innerHTML = '<div class="title">'+ (title||'Window') +'</div>';
      const ctrls = document.createElement('div'); ctrls.className = 'controls';
      const btnMin = document.createElement('div'); btnMin.className='btn min'; btnMin.title='Minimize';
      const btnMax = document.createElement('div'); btnMax.className='btn max'; btnMax.title='Maximize';
      const btnClose = document.createElement('div'); btnClose.className='btn close'; btnClose.title='Close';
      ctrls.append(btnMin, btnMax, btnClose);
      titlebar.appendChild(ctrls);

      const content = document.createElement('div'); content.className = 'window-content';
      el.append(titlebar, content);
      this.container.appendChild(el);

      const taskBtn = document.createElement('div'); taskBtn.className = 'task-item small'; taskBtn.innerText = title; taskBtn.dataset.winId = id;
      this.taskbar.appendChild(taskBtn);

      const win = { id, el, titlebar, content, taskBtn, minimized:false, maximized:false, appId };
      this.windows[id] = win;

      // Bring to front
      const focus = ()=> {
        this.z += 1;
        el.style.zIndex = this.z;
      };
      focus();

      // Dragging
      let dragging = false, offset = {x:0,y:0};
      titlebar.addEventListener('pointerdown', (ev) => {
        dragging = true;
        offset.x = ev.clientX - el.offsetLeft;
        offset.y = ev.clientY - el.offsetTop;
        titlebar.setPointerCapture(ev.pointerId);
        el.style.cursor = 'grabbing';
        focus();
      });
      titlebar.addEventListener('pointermove', (ev) => {
        if (!dragging) return;
        el.style.left = (ev.clientX - offset.x) + 'px';
        el.style.top = (ev.clientY - offset.y) + 'px';
      });
      titlebar.addEventListener('pointerup', (ev) => {
        dragging = false;
        titlebar.releasePointerCapture(ev.pointerId);
        el.style.cursor = 'grab';
      });

      // Controls
      btnClose.addEventListener('click', ()=> this.close(id));
      btnMin.addEventListener('click', ()=> this.minimize(id));
      btnMax.addEventListener('click', ()=> this.toggleMax(id));
      taskBtn.addEventListener('click', ()=> {
        if (win.minimized) this.restore(id);
        else this.minimize(id);
      });

      el.addEventListener('mousedown', focus);

      return win;
    }
    minimize(id){
      const w = this.windows[id]; if(!w) return;
      w.el.classList.add('hidden');
      w.minimized = true;
    }
    restore(id){
      const w = this.windows[id]; if(!w) return;
      w.el.classList.remove('hidden');
      w.minimized = false;
      this.bringToTop(id);
    }
    toggleMax(id){
      const w = this.windows[id]; if(!w) return;
      if (!w.maximized){
        w.prev = { left: w.el.style.left, top: w.el.style.top, width: w.el.style.width, height: w.el.style.height };
        w.el.style.left = '6px'; w.el.style.top='6px';
        w.el.style.width = (window.innerWidth - 12) + 'px';
        w.el.style.height = (window.innerHeight - 80) + 'px';
        w.maximized = true;
      } else {
        if (w.prev){
          w.el.style.left = w.prev.left; w.el.style.top = w.prev.top;
          w.el.style.width = w.prev.width; w.el.style.height = w.prev.height;
        }
        w.maximized = false;
      }
    }
    close(id){
      const w = this.windows[id]; if(!w) return;
      w.el.remove();
      w.taskBtn.remove();
      delete this.windows[id];
    }
    bringToTop(id){
      const w = this.windows[id]; if(!w) return;
      this.z += 1;
      w.el.style.zIndex = this.z;
    }
    findByApp(aid){
      return Object.values(this.windows).find(w=> w.appId === aid);
    }
  }

  /* ---------------- App Registry ---------------- */
  const wm = new WindowManager(document.getElementById('windows'));

  const AppRegistry = {
    apps: {},
    register(id, meta){
      this.apps[id] = meta;
      // create desktop icon
      const t = document.getElementById('desktop-icon-template');
      const icons = document.getElementById('icons');
      const clone = t.content.cloneNode(true);
      const el = clone.querySelector('.icon');
      clone.querySelector('.icon-art').innerHTML = meta.iconSVG || '';
      clone.querySelector('.icon-label').innerText = meta.title;
      el.addEventListener('dblclick', ()=> AppRegistry.open(id));
      el.addEventListener('click', ()=> {
        // single click: highlight or open on double
      });
      icons.appendChild(el);
    },
    open(id, options={}){
      const meta = this.apps[id];
      if (!meta) return;
      // If app is single-instance, reuse window
      if (meta.singleInstance){
        const existing = wm.findByApp(id);
        if (existing){ wm.restore(existing.id); return existing; }
      }
      const winId = id + '-' + Math.random().toString(36).slice(2,9);
      const win = wm.createWindow({ id: winId, title: meta.title, appId:id, x: options.x || 80, y: options.y || 80});
      // mount app content
      meta.render(win.content, { fs: FS, open: (aid, o)=> this.open(aid,o), bus: Bus, win });
      return win;
    }
  };

  /* ---------------- Built-in Apps ---------------- */

  // Explorer
  AppRegistry.register('explorer', {
    title: 'File Explorer',
    singleInstance: false,
    iconSVG: '<svg width="36" height="36" viewBox="0 0 24 24" fill="#1667d8"><rect x="2" y="5" width="20" height="14" rx="2"/></svg>',
    render: function(container, ctx){
      container.innerHTML = '';
      const path = '/';
      const header = document.createElement('div'); header.innerHTML = '<strong>Explorer</strong><div class="path small">'+path+'</div>';
      const list = document.createElement('div');
      list.style.marginTop = '10px';
      const items = ctx.fs.list(path) || [];
      items.forEach(it=>{
        const row = document.createElement('div'); row.className = 'file-item';
        row.innerHTML = `<div style="width:28px;height:28px;border-radius:6px;background:#f2f2f2;display:flex;align-items:center;justify-content:center">${it.type==='folder'?'📁':'📄'}</div><div style="flex:1">${it.name}</div>`;
        row.addEventListener('dblclick', ()=>{
          if (it.type === 'folder') {
            // simple: open folder in new explorer window for now
            ctx.open('explorer', {});
          } else {
            // open in editor
            ctx.open('editor', { openPath: '/'+it.name });
          }
        });
        list.appendChild(row);
      });
      container.appendChild(header);
      container.appendChild(list);
    }
  });

  // Text Editor
  AppRegistry.register('editor', {
    title: 'Text Editor',
    singleInstance: false,
    iconSVG: '<svg width="36" height="36" viewBox="0 0 24 24" fill="#f4b400"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>',
    render(container, ctx){
      container.innerHTML = '';
      const bar = document.createElement('div');
      bar.style.display='flex'; bar.style.gap='6px'; bar.style.marginBottom='8px';
      const input = document.createElement('input'); input.placeholder='File path (e.g. /notes.txt)'; input.style.flex='1';
      const btnLoad = document.createElement('button'); btnLoad.innerText='Load';
      const btnSave = document.createElement('button'); btnSave.innerText='Save';
      bar.appendChild(input); bar.appendChild(btnLoad); bar.appendChild(btnSave);
      const editor = document.createElement('textarea'); editor.style.width='100%'; editor.style.height='220px';
      container.appendChild(bar); container.appendChild(editor);

      if (ctx.win && ctx.win.appArgs && ctx.win.appArgs.openPath) { input.value = ctx.win.appArgs.openPath; }
      // If open was called with options
      container.addEventListener('mount', ()=>{});
      btnLoad.addEventListener('click', ()=>{
        const p = input.value.trim() || '/notes.txt';
        const content = ctx.fs.readFile(p);
        if (content === null){ editor.value = ''; alert('File not found'); }
        else editor.value = content;
      });
      btnSave.addEventListener('click', ()=>{
        const p = input.value.trim() || '/notes.txt';
        ctx.fs.writeFile(p, editor.value);
        alert('Saved ' + p);
      });

      // Auto load when called by remote open
      if (ctx.win && ctx.win.appArgs && ctx.win.appArgs.openPath){
        input.value = ctx.win.appArgs.openPath;
        const content = ctx.fs.readFile(input.value);
        if (content !== null) editor.value = content;
      }
    }
  });

  // Calculator
  AppRegistry.register('calculator', {
    title: 'Calculator',
    singleInstance: false,
    iconSVG: '<svg width="36" height="36" viewBox="0 0 24 24" fill="#34a853"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>',
    render(container){
      container.innerHTML = '';
      const input = document.createElement('input');
      input.style.width='100%'; input.style.fontSize='20px'; input.placeholder='Enter expression, e.g. 2+2*3';
      const btn = document.createElement('button'); btn.innerText='Calculate';
      const out = document.createElement('div'); out.style.marginTop='10px'; out.className='small';
      container.appendChild(input); container.appendChild(btn); container.appendChild(out);
      btn.addEventListener('click', ()=>{
        const expr = input.value.trim();
        if (!expr) return;
        // safe-ish evaluator: allow digits, operators, parentheses, decimal, spaces
        if (!/^[0-9+\-*/(). %]+$/.test(expr)) { out.innerText = 'Invalid characters'; return; }
        try {
          // eslint-disable-next-line no-eval
          const res = Function('"use strict";return ('+expr+')')();
          out.innerText = String(res);
        } catch(e){ out.innerText = 'Error'; }
      });
    }
  });

  // Settings
  AppRegistry.register('settings', {
    title: 'Settings',
    singleInstance: true,
    iconSVG: '<svg width="36" height="36" viewBox="0 0 24 24" fill="#9c27b0"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>',
    render(container, ctx){
      container.innerHTML = '';
      const title = document.createElement('div'); title.innerHTML='<strong>Settings</strong>';
      const themeLabel = document.createElement('div'); themeLabel.style.marginTop='10px';
      themeLabel.innerHTML = '<label>Theme: <select id="themeSelect"><option value="light">Light</option><option value="dark">Dark</option></select></label>';
      container.appendChild(title); container.appendChild(themeLabel);
      const select = container.querySelector('#themeSelect');
      const apply = ()=> {
        if (select.value === 'dark') document.body.classList.add('dark'), localStorage.setItem('ispwin-theme','dark');
        else document.body.classList.remove('dark'), localStorage.setItem('ispwin-theme','light');
      };
      select.addEventListener('change', apply);
      const saved = localStorage.getItem('ispwin-theme') || 'light';
      select.value = saved;
      apply();
    }
  });

  /* ---------------- Desktop and startup ---------------- */
  function initDesktop(){
    // Load saved theme
    const savedTheme = localStorage.getItem('ispwin-theme');
    if (savedTheme === 'dark') document.body.classList.add('dark');

    // Create desktop icons from registry (done by register)
    // Add Start button actions
    document.getElementById('start').addEventListener('click', ()=>{
      // open settings
      AppRegistry.open('settings');
    });

    document.getElementById('btn-theme').addEventListener('click', ()=>{
      const cur = document.body.classList.toggle('dark');
      localStorage.setItem('ispwin-theme', cur ? 'dark' : 'light');
    });

    // Taskbar click to show list (not implemented complexly)
    // Expose a quick launcher for apps in the taskbar
    // Pre-open a couple apps
    AppRegistry.open('explorer');
    AppRegistry.open('calculator');
  }

  /* ---------------- Remote command handling ---------------- */
  Bus.on((msg)=>{
    if (!msg || msg.type !== 'remote-command') return;
    const { command, param, extra, id } = msg;
    // Basic commands: openApp, setTheme, createFile, openFile, closeWindow
    let response = { success:true, echo: msg };
    try {
      if (command === 'openApp'){
        const appId = param || extra.app;
        const win = AppRegistry.open(appId, extra || {});
        response.window = win ? win.id : null;
      } else if (command === 'setTheme'){
        if (param === 'dark'){ document.body.classList.add('dark'); localStorage.setItem('ispwin-theme','dark'); }
        else { document.body.classList.remove('dark'); localStorage.setItem('ispwin-theme','light'); }
      } else if (command === 'createFile'){
        const path = extra && extra.path ? extra.path : '/remote.txt';
        const content = extra && extra.content ? extra.content : '';
        FS.writeFile(path, content);
      } else if (command === 'openFile'){
        const path = extra && extra.path ? extra.path : param || '/remote.txt';
        AppRegistry.open('editor', { openPath: path });
      } else if (command === 'closeWindow'){
        // param is window id (or app id)
        if (!param) {
          // close last opened
          const keys = Object.keys(wm.windows);
          const last = keys[keys.length-1];
          if (last) wm.close(last);
        } else {
          // try app instance then win id
          const byApp = wm.findByApp(param);
          if (byApp) wm.close(byApp.id);
          else wm.close(param);
        }
      } else {
        response.success = false; response.error = 'Unknown command';
      }
    } catch(e) {
      response.success = false; response.error = String(e);
    }
    // Send response back
    Bus.send({ type:'remote-response', to: id, response });
  });

  // Handle messages to show simple notifications
  Bus.on((msg)=>{
    // For this demo, we simply log OS-received remote responses in console.
    if (msg && msg.type === 'remote-response') {
      console.log('Remote response:', msg);
    }
  });

  // Kick off
  document.addEventListener('DOMContentLoaded', initDesktop);
})();
