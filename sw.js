// Hors-ligne : on essaie le réseau d'abord, sinon la copie en cache.
const CACHE = 'questrun-v74';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-192.png', './grimoire.svg'];
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

// notifications du vieux sage (envoyées par le relais Cloudflare)
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Quest Run', { body: d.body || '', icon: 'icon-192.png', badge: 'icon-192.png', tag: 'questrun' }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    for (const c of cs) if ('focus' in c) return c.focus();
    return self.clients.openWindow('./');
  }));
});
