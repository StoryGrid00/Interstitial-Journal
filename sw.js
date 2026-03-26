/* =======================================================
   Field Journal - Service Worker
   Strategy: Cache-first for app shell, network-first for data
======================================================= */

const CACHE_NAME = 'field-journal-v9';
const APP_SHELL = [
  '/Interstitial-Journal/',
  '/Interstitial-Journal/index.html',
  '/Interstitial-Journal/manifest.json',
  '/Interstitial-Journal/icons/icon-192.png',
  '/Interstitial-Journal/icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Courier+Prime:ital,wght@0,400;0,700;1,400;1,700&display=swap'
];

// -- Install: pre-cache app shell --
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(APP_SHELL.filter(url => !url.startsWith('http') || url.includes('fonts')));
    }).then(() => self.skipWaiting())
  );
});

// -- Activate: clean old caches --
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// -- Fetch: cache-first for app shell --
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Skip non-http(s) requests
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // Cache successful responses for app shell assets
        if (response && response.status === 200 && response.type !== 'opaque') {
          const url = event.request.url;
          const isAppAsset = url.includes(self.location.origin) ||
                             url.includes('fonts.googleapis.com') ||
                             url.includes('fonts.gstatic.com');
          if (isAppAsset) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
        }
        return response;
      }).catch(() => {
        // Offline fallback: return cached index.html for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/Interstitial-Journal/index.html');
        }
      });
    })
  );
});
