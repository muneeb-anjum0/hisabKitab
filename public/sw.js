const VERSION = 'v12';
const SHELL_CACHE = `hisabkitab-shell-${VERSION}`;
const ASSET_CACHE = `hisabkitab-assets-${VERSION}`;
const FONT_CACHE = 'hisabkitab-fonts-v1';
const OWNED_CACHES = [SHELL_CACHE, ASSET_CACHE, FONT_CACHE];
const SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
];

const cacheResponse = async (cacheName, request, response) => {
  if (!response || (!response.ok && response.type !== 'opaque')) return response;
  const cache = await caches.open(cacheName);
  await cache.put(request, response.clone());
  return response;
};

const trimCache = async (cacheName, maximum) => {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  await Promise.all(
    keys.slice(0, Math.max(0, keys.length - maximum)).map((key) => cache.delete(key)),
  );
};

self.addEventListener('install', (event) =>
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  ),
);

self.addEventListener('activate', (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('hisabkitab-') && !OWNED_CACHES.includes(key))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  ),
);

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request)
            .then((response) => cacheResponse(FONT_CACHE, event.request, response))
            .then((response) => {
              void trimCache(FONT_CACHE, 20);
              return response;
            }),
      ),
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    const fresh = fetch(event.request)
      .then((response) => cacheResponse(SHELL_CACHE, '/index.html', response))
      .catch(() => caches.match('/index.html'));
    event.waitUntil(fresh.then(() => undefined));
    event.respondWith(caches.match('/index.html').then((cached) => cached || fresh));
    return;
  }

  const immutableAsset = url.pathname.startsWith('/assets/');
  const cached = caches.match(event.request);
  if (immutableAsset) {
    event.respondWith(
      cached.then(
        (response) =>
          response ||
          fetch(event.request).then((fresh) => cacheResponse(ASSET_CACHE, event.request, fresh)),
      ),
    );
    return;
  }
  const fresh = fetch(event.request)
    .then((response) => cacheResponse(ASSET_CACHE, event.request, response))
    .then((response) => {
      void trimCache(ASSET_CACHE, 80);
      return response;
    })
    .catch(() => cached);
  event.waitUntil(fresh.then(() => undefined));
  event.respondWith(cached.then((response) => response || fresh));
});
