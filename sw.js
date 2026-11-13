// Caribbean's Avenue · offline cache
// Sube VERSION cada vez que cambie cualquier archivo de la carta (index, carta/*, data/*),
// y el ?v= de index.html si cambian carta.css o app.js: así los móviles cogen la carta nueva.
const VERSION = "carta-v6";
const SHELL = [
  "./",
  "carta/carta.css?v=2",
  "carta/app.js?v=2",
  "carta/source.js",
  "carta/remote.js",
  "carta/glasses.js",
  "carta/banner.js",
  "carta/rail.js",
  "data/carta.js",
  "data/bebidas.js",
  "assets/fonts/bricolage-latin.woff2",
  "assets/brand/caribbeans-logo-white.svg",
];
// Fotos y extras: también se guardan, pero si alguno falla la carta funciona igual.
const PHOTOS = [
  "assets/fonts/bricolage-latin-ext.woff2",
  "assets/cocktails/caribbeans-spritz-720.webp",
  "assets/cocktails/porn-star-martini-720.webp",
  "assets/cocktails/mojito-frutas-720.webp",
  "assets/cocktails/mojito-clasico-720.webp",
  "assets/cocktails/caipirinha-720.webp",
  "assets/cocktails/caipiroska-720.webp",
  "assets/cocktails/pina-colada-720.webp",
  "assets/cocktails/moscow-mule-720.webp",
  "assets/cocktails/margarita-720.webp",
  "assets/cocktails/matcha-mojito-720.webp",
  "assets/cocktails/pina-colada-sin-720.webp",
  "assets/cocktails/caribeno-720.webp",
  "assets/cocktails/caribbeans-spritz-280.webp",
  "assets/cocktails/porn-star-martini-280.webp",
  "assets/cocktails/mojito-frutas-280.webp",
  "assets/cocktails/mojito-clasico-280.webp",
  "assets/cocktails/caipirinha-280.webp",
  "assets/cocktails/caipiroska-280.webp",
  "assets/cocktails/pina-colada-280.webp",
  "assets/cocktails/moscow-mule-280.webp",
  "assets/cocktails/margarita-280.webp",
  "assets/cocktails/matcha-mojito-280.webp",
  "assets/cocktails/pina-colada-sin-280.webp",
  "assets/cocktails/caribeno-280.webp",
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

  const cached = (await cache.match(request, { ignoreSearch: true })) || (await cache.match("./"));
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

  // El modo libro (/libro/) sigue cambiando y /formulario/ es de un solo uso: nunca salen de esta caché.
  // data/ sí se guarda: la carta lo importa y tiene que abrir sin cobertura.
  if (/\/(libro|tests|formulario)\//.test(url.pathname)) {
    return;
  }

  event.respondWith(request.mode === "navigate" ? pageResponse(request) : assetResponse(request));
});
