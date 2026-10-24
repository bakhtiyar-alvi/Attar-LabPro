const CACHE_VERSION = "attarlab-pro-v3.1.0";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./logo.svg",
  "./icon-192.png",
  "./icon-512.png"
];

// 1. Install & Pre-cache Core Shell (resilient to missing optional files)
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(async (cache) => {
      for (const asset of CORE_ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {
          // Continues smoothly even if PNGs are generated later
          console.warn("[SW] Optional asset skipped during install:", asset);
        }
      }
    })
  );
  self.skipWaiting();
});

// 2. Activate & Clean Up Old Cache Versions
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_VERSION) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// 3. Stale-While-Revalidate Strategy with Offline Fallback
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const networkFetch = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === "basic") {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_VERSION).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || networkFetch;
    }).catch(() => caches.match("./index.html"))
  );
});
