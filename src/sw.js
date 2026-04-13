const CACHE_NAME = 'polyglot-v4';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json'
];

// 1. Install & Pre-cache App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching App Shell v4');
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
        if (key !== CACHE_NAME && key !== 'polyglot-fonts' && key !== 'polyglot-data') {
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

  // A. Handle Google Fonts (Cache First)
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

  // B. Cache vocab data for offline use (Network First, fallback to cache)
  if (url.href.includes('polyglot121725-default-rtdb') && url.href.includes('vocab')) {
    event.respondWith(
      caches.open('polyglot-data').then((cache) => {
        return fetch(event.request).then((networkResponse) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        }).catch(() => {
          return cache.match(event.request);
        });
      })
    );
    return;
  }

  // C. Skip other Firebase/API requests (Always Network)
  if (url.href.includes('firebase') || url.href.includes('googleapis.com')) {
    return;
  }

  // D. JS bundles & app assets (Cache First with network update)
  // Matches code-split chunks: main.bundle.js, firebase.bundle.js, vendors.bundle.js
  // and production hashed files: main.abc123.js
  if (url.pathname.endsWith('.js') && url.origin === self.location.origin) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cached) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          }).catch(() => cached);
          return cached || fetchPromise;
        });
      })
    );
    return;
  }

  // E. All other requests (Cache First, fall back to Network)
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
