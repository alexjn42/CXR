
const CACHE='cxr-v1-1-1';
const CORE=['./','./index.html','./app.js','./manifest.json','./icons/icon-192.png','./icons/icon-512.png','./offline.html'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',e=>{
  const req=e.request; if(req.method!=='GET') return;
  if(req.mode==='navigate'){
    e.respondWith((async()=>{ try{ const net=await fetch(req); const c=await caches.open(CACHE); c.put(req, net.clone()); return net; }
      catch(err){ const c=await caches.open(CACHE); return (await c.match(req)) || (await c.match('./offline.html')); } })());
    return;
  }
  e.respondWith((async()=>{ try{ const net=await fetch(req); const c=await caches.open(CACHE); c.put(req, net.clone()); return net; }
    catch(err){ const c=await caches.open(CACHE); return (await c.match(req)) || Response.error(); } })());
});
