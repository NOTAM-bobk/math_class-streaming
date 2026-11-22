/* math_class:network service worker — offline shell + cached catalog */
const VERSION = "v1";
const SHELL_CACHE = `mcn-shell-${VERSION}`;
const RUNTIME_CACHE = `mcn-runtime-${VERSION}`;
const API_CACHE = `mcn-api-${VERSION}`;
const KEEP = [SHELL_CACHE, RUNTIME_CACHE, API_CACHE];

const SHELL_URLS = [
  "/",
  "/index.html",
  "/offline.html",
  "/manifest.webmanifest",
  "/app-icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

const CATALOG_HOST = "v3-cinemeta.strem.io";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) =>
        Promise.allSettled(SHELL_URLS.map((url) => cache.add(url)))
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => !KEEP.includes(key)).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && (response.ok || response.type === "opaque")) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw error;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && (response.ok || response.type === "opaque")) {
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response && (response.ok || response.type === "opaque")) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);
  return cached || (await network) || Response.error();
}

async function handleNavigation(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put("/index.html", response.clone());
      cache.put("/", response.clone());
    }
    return response;
  } catch {
    return (
      (await cache.match("/index.html")) ||
      (await cache.match("/")) ||
      (await cache.match("/offline.html")) ||
      Response.error()
    );
  }
}

// Only the app shell and its own files are cached here. Everything else on this
// origin is the player reverse proxy and must go straight to the network.
const APP_PATH =
  /^\/(?:$|index\.html$|offline\.html$|manifest\.webmanifest$|app-icon\.svg$|(?:movie|series)\/[a-z0-9-]+-(?:tt)?\d+\/?$)/i;

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (!url.protocol.startsWith("http")) return;

  if (url.origin === self.location.origin) {
    if (
      url.pathname.startsWith("/assets/") ||
      url.pathname.startsWith("/icons/") ||
      url.pathname === "/app-icon.svg"
    ) {
      event.respondWith(cacheFirst(request));
      return;
    }
    if (APP_PATH.test(url.pathname)) {
      event.respondWith(
        request.mode === "navigate"
          ? handleNavigation(request)
          : staleWhileRevalidate(request)
      );
    }
    // Left alone: /embed/*, /_next/*, /api/* and the player's own root paths.
    return;
  }

  if (url.hostname === CATALOG_HOST) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  if (
    url.hostname === "fonts.googleapis.com" ||
    url.hostname === "fonts.gstatic.com"
  ) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
