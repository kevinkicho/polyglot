const CACHE_NAME = 'polyglot-v5';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json'
];

// 1. Install & Pre-cache App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching App Shell v5');
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

// 2. Activate, Clean Old Caches & Force Reload
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME && key !== 'polyglot-fonts' && key !== 'polyglot-data') {
          console.log('[SW] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    }).then(() => self.clients.claim()).then(() => {
      // Force all open tabs to reload so they use the new SW and fresh chunks
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => client.navigate(client.url));
      });
    })
  );
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
  // Exclude sw.js itself so the browser can detect updates
  if (url.pathname.endsWith('.js') && url.pathname !== '/sw.js' && url.origin === self.location.origin) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cached) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            // Update cache with fresh copy
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          }).catch(() => {
            // Network failed (404 or offline) — if we had a cached copy, use it,
            // otherwise there's nothing we can do
            if (cached) return cached;
            // Delete stale entry so it doesn't block future retries
            cache.delete(event.request);
            return new Response('', { status: 404, statusText: 'Not Found' });
          });
          // Serve cached immediately if available, otherwise wait for network
          return cached || fetchPromise;
        });
      })
    );
    return;
  }

  // E. All other requests (Cache First, fall back to Network)
  // Exclude index.html so fresh HTML is always served (prevents stale chunk refs)
  if (url.pathname === '/index.html' || url.pathname === '') {
    event.respondWith(fetch(event.request));
    return;
  }
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
