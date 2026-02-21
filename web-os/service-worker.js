const CACHE = 'neon-os-v1'
const ASSETS = ['/web-os/','/web-os/index.html','/web-os/styles.css','/web-os/app.js','/web-os/manifest.json']
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))})
self.addEventListener('fetch',e=>{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)))})
