const CACHE_NAME = 'frita-zone-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './index.css',
  './index.js',
  './manifest.json',
  './images.frita/Frita Logo.jpg',
  './images.frita/hero-food.jpg',
  './images.frita/frita background.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        return response;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
