// Hors-ligne : on essaie le réseau d'abord, sinon la copie en cache.
const CACHE = 'questrun-v8';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-192.png'];
const HOSTS = ['cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
});
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  if (u.origin !== location.origin && !HOSTS.includes(u.host)) return;
  e.respondWith(
    (u.origin === location.origin ? fetch(e.request.url, { cache: 'no-store' }) : fetch(e.request))
      .then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); return r; })
      .catch(() => caches.match(e.request))
  );
});
