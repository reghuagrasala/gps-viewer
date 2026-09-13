const CACHE="gps-viewer-v22";
const CORE=["./","./index.html","./style.css","./app.js","./v17-fixes.js","./v18-fixes.js","./v19-fixes.js","./v21-fixes.js","./v15-fixes.js","./v16-fixes.js","./config.js","./digipin.js","./offline-cache.js","./manifest.webmanifest","./favicon.svg","./apple-touch-icon.png","./icon-192.png","./icon-512.png"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET")return;
  const u=new URL(e.request.url);if(u.origin!==self.location.origin)return;
  if(u.pathname.endsWith("/")||u.pathname.endsWith("/index.html")||/\.(js|css|webmanifest)$/.test(u.pathname)){
    e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{})}return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match("./index.html"))));return;
  }
  e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{})}return r}).catch(()=>caches.match("./index.html"))));
});
