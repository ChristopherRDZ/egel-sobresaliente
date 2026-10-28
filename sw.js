/* Service worker: la app funciona sin conexión después de la primera visita. */
const VERSION = '2026-10-28T10:00:48.441Z';
const CACHE = 'egel-' + VERSION;
const ASSETS = ["./","css/app.css","data/meta.js","data/n-1.1.js","data/n-1.2.js","data/n-1.3.js","data/n-1.4.js","data/n-2.1.js","data/n-2.2.js","data/n-2.3.js","data/n-3.1.js","data/n-3.2.js","data/n-3.3.js","data/n-3.4.js","data/n-4.1.js","data/n-4.2.js","data/n-4.3.js","data/n-LC1.js","data/n-LC2.js","data/q-1.1.js","data/q-1.2.js","data/q-1.3.js","data/q-1.4.js","data/q-2.1.js","data/q-2.2.js","data/q-2.3.js","data/q-3.1.js","data/q-3.2.js","data/q-3.3.js","data/q-3.4.js","data/q-4.1.js","data/q-4.2.js","data/q-4.3.js","data/q-LC1.js","data/q-LC2.js","icons/apple-touch-icon.png","icons/icon-192.png","icons/icon-512.png","icons/icon-maskable-512.png","icons/icon.svg","index.html","js/data.js","js/fig.js","js/main.js","js/md.js","js/store.js","js/tutor.js","js/ui.js","js/util.js","js/v-guides.js","js/v-home.js","js/v-practice.js","js/v-progress.js","js/v-session.js","js/v-settings.js","manifest.webmanifest"];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('egel-') && k !== CACHE && k !== 'egel-fonts').map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(req, { ignoreSearch: true }).then(
        (hit) =>
          hit ||
          fetch(req)
            .then((res) => {
              if (res.ok) {
                const copy = res.clone();
                caches.open(CACHE).then((c) => c.put(req, copy));
              }
              return res;
            })
            .catch(() => caches.match('./index.html')),
      ),
    );
  } else if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(
      caches.open('egel-fonts').then((c) =>
        c.match(req).then((hit) => {
          const net = fetch(req)
            .then((res) => {
              if (res.ok || res.type === 'opaque') c.put(req, res.clone());
              return res;
            })
            .catch(() => hit);
          return hit || net;
        }),
      ),
    );
  }
});
