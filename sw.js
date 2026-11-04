const V = 'wg-v3';
const ASSETS = ['/', '/style.css', '/app.js', '/config.js', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== V).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network first, so new deployments show up right away. The cache is only a fallback.
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(
    fetch(r)
      .then(res => { const copy = res.clone(); caches.open(V).then(c => c.put(r, copy)); return res; })
      .catch(() => caches.match(r).then(m => m || caches.match('/')))
  );
});
