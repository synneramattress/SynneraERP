/**
 * Synnera PWA service worker (separate from FCM).
 * FCM uses /firebase-messaging-sw.js only — do not merge.
 *
 * - Precache offline page + icons + manifest
 * - Cache-first for same-origin static assets (png/svg/css/js under common paths)
 * - Network-first for navigations, fallback to /offline/
 */
const CACHE_NAME = "synnera-static-v6";
const OFFLINE_URL = "/offline/";

const PRECACHE_URLS = [
  OFFLINE_URL,
  "/manifest.json",
  "/synnera-icon-192.png",
  "/synnera-icon-512.png",
  "/synnera-icon-maskable-192.png",
  "/synnera-icon-maskable-512.png",
  "/apple-touch-icon.png",
  "/synnera-logo.png",
  "/synnera-logo.svg",
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(function (cache) {
        return Promise.all(
          PRECACHE_URLS.map(function (url) {
            return cache.add(url).catch(function () {
              /* ignore missing during first install */
            });
          })
        );
      })
      .then(function () {
        return self.skipWaiting();
      })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (k) {
            return k !== CACHE_NAME && k.indexOf("synnera-") === 0;
          })
          .map(function (k) {
            return caches.delete(k);
          })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

function isStaticAsset(url) {
  try {
    var u = new URL(url);
    if (u.origin !== self.location.origin) return false;
    var p = u.pathname;
    return (
      /\.(?:png|jpg|jpeg|svg|webp|gif|ico|woff2?|css|js)$/i.test(p) ||
      p === "/manifest.json" ||
      p.indexOf("/_next/static/") === 0
    );
  } catch (e) {
    return false;
  }
}

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;

  // Navigations: network-first → offline page
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then(function (res) {
          return res;
        })
        .catch(function () {
          return caches.match(OFFLINE_URL).then(function (cached) {
            return (
              cached ||
              new Response(
                "<!DOCTYPE html><html><head><meta charset=utf-8><meta name=viewport content=\"width=device-width,initial-scale=1\"><title>Offline</title></head><body style=\"font-family:system-ui;padding:2rem;text-align:center;background:#f8fafc;color:#0f172a\"><h1>You are offline</h1><p>Please check your connection and try again.</p></body></html>",
                {
                  status: 503,
                  statusText: "Service Unavailable",
                  headers: { "Content-Type": "text/html; charset=utf-8" },
                }
              )
            );
          });
        })
    );
    return;
  }

  // Static assets: cache-first, then network and cache
  if (isStaticAsset(req.url)) {
    event.respondWith(
      caches.match(req).then(function (cached) {
        if (cached) return cached;
        return fetch(req).then(function (res) {
          if (!res || res.status !== 200 || res.type === "opaque") return res;
          var copy = res.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(req, copy);
          });
          return res;
        });
      })
    );
  }
});
