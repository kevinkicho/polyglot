const CACHE_NAME = 'polyglot-v2';
const APP_SHELL = [
  '/',
  '/index.html',
  '/bundle.js',
  '/manifest.json'
];

// 1. Install & Pre-cache App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching App Shell');
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

// 2. Activate & Clean Old Caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME && key !== 'polyglot-fonts') {
          console.log('[SW] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  self.clients.claim();
});

// 3. Fetch Handler
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // A. Handle Google Fonts (Cache First, then Network)
  // We separate this so fonts persist even if you update the app code
  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(
      caches.open('polyglot-fonts').then((cache) => {
        return cache.match(event.request).then((response) => {
          return response || fetch(event.request).then((networkResponse) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
      })
    );
    return;
  }

  // B. Ignore Firebase Database requests (Always Network)
  if (url.href.includes('firebase') || url.href.includes('googleapis.com/v1')) {
    return;
  }

  // C. App Shell (Cache First, fall back to Network)
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
