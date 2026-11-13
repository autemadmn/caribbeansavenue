// Caribbean's Avenue · offline cache
// El código (página, carta/*, data/*) va SIEMPRE primero a la red y la copia guardada solo se usa
// sin cobertura: así un cambio publicado llega al móvil aunque se olvide subir VERSION.
// Las fotos y fuentes sí salen de la caché: si cambia una, sube VERSION (o cambia su nombre).
const VERSION = "carta-v8";
const SHELL = [
  "./",
  "carta/carta.css?v=4",
  "carta/app.js?v=4",
  "carta/source.js",
  "carta/remote.js",
  "carta/glasses.js",
  "carta/banner.js",
  "carta/nav.js",
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
      // cache: "reload" salta la caché HTTP del navegador para no guardar una copia vieja.
      .then((cache) => cache.addAll(SHELL.map(fresh)).then(() => cache.addAll(PHOTOS.map(fresh)).catch(() => {})))
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

const fresh = (url) => new Request(url, { cache: "reload" });

// Página y código: red primero (con 2,5 s de margen), la copia guardada solo si no hay red.
async function networkFirst(request) {
  const cache = await caches.open(VERSION);
  // Una navegación no admite opciones; el resto pregunta al servidor saltando la caché HTTP.
  const network = (request.mode === "navigate" ? fetch(request) : fetch(request, { cache: "no-cache" }))
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

  const cached =
    (await cache.match(request, { ignoreSearch: true })) ||
    (request.mode === "navigate" ? await cache.match("./") : undefined);
  return cached || network;
}

// Fotos y fuentes: copia guardada primero, red solo si falta.
async function cacheFirst(request) {
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

  const media = /\.(webp|png|jpe?g|svg|woff2?)$/i.test(url.pathname);
  event.respondWith(media ? cacheFirst(request) : networkFirst(request));
});
