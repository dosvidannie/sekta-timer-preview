const ROOT = new URL('./', self.location.href);
const PREFIX = `sekta-${ROOT.pathname}-`;
const CACHE = PREFIX + 'eaebbdc187b50d49';
const ASSETS = (["./apple-touch-icon.png","./assets/app.js","./assets/index.css","./icon-192.png","./icon-512.png","./icon.svg","./index.html","./instruction.html","./manifest.webmanifest","./sekta.png","./trainer-instruction.html","./trainers-bali.html","./trainers-russia.html"]).map(path => new URL(path, ROOT).href);
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(async cache => { await cache.addAll(ASSETS.map(url => new Request(url, { cache: 'reload' })));  }));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    // Keep the preceding release for other open tabs; never remove their assets mid-session.
    const names = (await caches.keys()).filter(x => x.startsWith(PREFIX));
    for (const name of names.slice(0, -2)) if (name !== CACHE) await caches.delete(name);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (event.request.mode === 'navigate') {
      // Instructions and the portable download are real HTML documents, not app routes.
      const page = url.pathname === ROOT.pathname ? new URL('index.html', ROOT).href : url.href;
      return (await cache.match(page, { ignoreVary: true })) || fetch(event.request);
    }
    // All entries are versioned, public, same-origin static files. Module requests
    // send an Origin header whereas install-time addAll requests may not; Vary:
    // Origin must not make those identical files miss their offline cache.
    return (await cache.match(event.request, { ignoreVary: true })) || (await caches.match(event.request, { ignoreVary: true })) || fetch(event.request);
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type === 'ACTIVATE') self.skipWaiting();
  if (event.data?.type === 'CLAIM') self.clients.claim();
  if (event.data?.type === 'CHECK_CACHE') event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const ready = ASSETS.length > 0 && (await Promise.all(ASSETS.map(x => cache.match(x)))).every(Boolean);
    if (ready) event.source?.postMessage({ type: 'CACHE_READY' });
  })());
});
