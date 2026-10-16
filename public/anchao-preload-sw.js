/* Only explicitly preloaded, verified files are stored. Never cache navigation or populate on demand. */
const workerUrl = new URL(self.location.href);
const version = workerUrl.searchParams.get('version');
const baseUrl = new URL('./', workerUrl);
const cacheName = `anchao-preload:${encodeURIComponent(baseUrl.href)}:${version}`;
self.addEventListener('install', (event) => { event.waitUntil(self.skipWaiting()); });
self.addEventListener('activate', (event) => { event.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (!/^[a-f0-9]{64}$/.test(version || '') || request.method !== 'GET' || request.mode === 'navigate'
    || url.origin !== baseUrl.origin || !url.pathname.startsWith(baseUrl.pathname) || url.search
    || ['index.html', 'anchao-preload-manifest.json', 'anchao-preload-sw.js'].includes(url.pathname.slice(baseUrl.pathname.length))) return;
  event.respondWith(caches.open(cacheName).then(async (cache) => (await cache.match(request)) || fetch(request)));
});
