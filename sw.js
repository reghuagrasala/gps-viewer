const CACHE="gps-viewer-v65";
const CORE=["./","./index.html","./style.css","./pwa-stable.css?v=1","./ui-fix.css?v=65","./app.js?v=7","./compass.js","./config.js?v=2","./digipin.js","./offline-cache.js?v=3","./manifest.webmanifest","./favicon.svg","./apple-touch-icon.png","./icon-192.png","./icon-512.png"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;const u=new URL(e.request.url);if(u.origin!==self.location.origin)return;e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{})}return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match("./index.html"))))});
