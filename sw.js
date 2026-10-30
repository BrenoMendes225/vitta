/* Service worker: app shell offline. */

const VERSION = 'vitta-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/app.js',
  './js/router.js',
  './js/store.js',
  './js/db.js',
  './js/date.js',
  './js/ui.js',
  './js/icons.js',
  './js/charts.js',
  './js/stats.js',
  './js/gemini.js',
  './js/image.js',
  './js/forms.js',
  './js/schedule.js',
  './js/water.js',
  './js/screens/today.js',
  './js/screens/meals.js',
  './js/screens/weight.js',
  './js/screens/photos.js',
  './js/screens/injections.js',
  './js/screens/measurements.js',
  './js/screens/symptoms.js',
  './js/screens/workouts.js',
  './js/screens/more.js',
  './js/screens/settings.js',
  './js/screens/report.js',
  './js/screens/welcome.js',
  './js/screens/about.js',
  './icons/icon.svg',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res.ok) caches.open(VERSION).then((c) => c.put(req, res.clone()));
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
