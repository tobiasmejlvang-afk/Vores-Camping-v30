const CACHE='vores-camping-v30-2-shell';
const SHELL=['./','./index.html','./styles.css','./app.js','./manifest.webmanifest','./assets/logo.webp','./assets/app-icon.webp','./assets/icon-192.png','./assets/icon-512.png','./assets/ferie-vagten/ready.webp','./assets/ferie-vagten/clipboard.webp','./assets/ferie-vagten/relax.webp','./assets/ferie-vagten/patrol.webp','./assets/ferie-vagten/hammock.webp','./assets/ferie-vagten/radio.webp'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  const url=new URL(e.request.url);
  if(url.origin===location.origin){
    e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match('./index.html'))));
  }
});
