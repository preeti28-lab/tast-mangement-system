// TaskFlow service worker – makes the app usable offline.
//
//  • Static assets (/_next/static, icons): cache-first (they are content-hashed).
//  • Pages: network-first, falling back to the last cached copy, then /offline.html.
//  • GET /api/*: network-first, falling back to the last cached response so the
//    dashboard and task lists can still be read offline.
//  Writes made while offline are queued by the app itself (src/lib/offlineQueue.ts)
//  and replayed when the connection returns.

const VERSION = "v2";
const STATIC_CACHE = `taskflow-static-${VERSION}`;
const PAGE_CACHE = `taskflow-pages-${VERSION}`;
const API_CACHE = `taskflow-api-${VERSION}`;
const PRECACHE = ["/offline.html", "/icon-192.png", "/icon-512.png"];

// Never cache these: they are user-session or one-off responses.
const API_NO_CACHE = ["/api/auth/logout", "/api/auth/login", "/api/auth/register"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  const current = [STATIC_CACHE, PAGE_CACHE, API_CACHE];
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !current.includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  // Sent on logout so the next user of this device can't read cached data offline.
  if (event.data?.type === "CLEAR_API_CACHE") {
    event.waitUntil(Promise.all([caches.delete(API_CACHE), caches.delete(PAGE_CACHE)]));
  }
});

async function networkFirst(request, cacheName, fallback) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return fallback();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/") || PRECACHE.includes(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    if (API_NO_CACHE.includes(url.pathname)) return;
    event.respondWith(
      networkFirst(request, API_CACHE, () =>
        new Response(JSON.stringify({ message: "You're offline and this data isn't saved on this device yet." }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        })
      )
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      networkFirst(request, PAGE_CACHE, async () => (await caches.match("/offline.html")) ?? Response.error())
    );
  }
});
