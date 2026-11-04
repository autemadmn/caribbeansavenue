// Caribbean's Avenue · offline cache
// Bump VERSION whenever index.html, styles.css or app.js change, so phones pick up the new menu.
const VERSION = "carta-v4";
const SHELL = [
  "./",
  "clasica.html",
  "styles.css?v=3",
  "app.js?v=3",
  "assets/brand/caribbeans-logo-white.svg",
  "assets/fonts/cormorant.woff2",
  "assets/img/dedo.webp",
];
// Page photos: saved too, but a failure here must not block the menu itself.
const PHOTOS = [
  "assets/img/portada-828.webp",
  "assets/img/copa-828.webp",
  "assets/img/mojito-828.webp",
  "assets/img/playa-828.webp",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(SHELL).then(() => cache.addAll(PHOTOS).catch(() => {})))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

// Pages: try the network briefly so price changes arrive, fall back to the saved copy.
async function pageResponse(request) {
  const cache = await caches.open(VERSION);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    });

  const timeout = new Promise((resolve) => setTimeout(resolve, 2500));

  try {
    const winner = await Promise.race([network, timeout]);
    if (winner) {
      return winner;
    }
  } catch {
    // Offline or network error: use the saved copy below.
  }

  const cached = (await cache.match(request, { ignoreSearch: true })) || (await cache.match("clasica.html"));
  return cached || network;
}

// Everything else (css, js, fonts, images): saved copy first, network only when missing.
async function assetResponse(request) {
  const cache = await caches.open(VERSION);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  const response = await fetch(request);

  if (response.ok) {
    cache.put(request, response.clone());
  }

  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  // The editorial mode (/libro/) is still evolving and /formulario/ is a one-off page: never serve them from this cache.
  if (/\/(libro|data|tests|formulario)\//.test(url.pathname)) {
    return;
  }

  event.respondWith(request.mode === "navigate" ? pageResponse(request) : assetResponse(request));
});
