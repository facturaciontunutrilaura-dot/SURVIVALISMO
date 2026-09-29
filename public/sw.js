/* =========================================================================
   sw.js — Service Worker de SURVIVAL OFFLINE
   Estrategia:
     · Precache completo del app shell + contenido + geodatos en la instalación.
     · Navegaciones: red primero, con vuelta a la caché (y a index.html) si falla.
     · Recursos propios: caché primero (son inmutables por versión).
     · Peticiones a terceros (teselas de mapa): pasan de largo; la app las
       guarda ella misma en IndexedDB.
   ========================================================================= */

const VERSION = '1.4.0';
const STATIC = `survival-static-v${VERSION}`;
const RUNTIME = `survival-runtime-v${VERSION}`;

const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/css/app.css',
  './assets/js/app.js',
  './assets/js/ui.js',
  './assets/js/store.js',
  './assets/js/calc.js',
  './assets/js/compass.js',
  './assets/js/maps.js',
  './assets/js/juegos.js',
  './assets/js/riesgos.js',
  './assets/js/familia.js',
  './assets/js/sync.js',
  './assets/js/audio.js',
  './assets/js/ubicacion.js',
  './assets/vendor/leaflet/leaflet.js',
  './assets/vendor/leaflet/leaflet.css',
  './assets/vendor/leaflet/images/marker-icon.png',
  './assets/vendor/leaflet/images/marker-icon-2x.png',
  './assets/vendor/leaflet/images/marker-shadow.png',
  './assets/vendor/leaflet/images/layers.png',
  './assets/vendor/leaflet/images/layers-2x.png',
  './data/content/index.js',
  './data/content/sources.js',
  './data/content/emergencias.js',
  './data/content/art-recursos.js',
  './data/content/art-tecnicas.js',
  './data/content/art-preparacion.js',
  './data/content/art-territorio.js',
  './data/content/comunicaciones.js',
  './data/content/checklists.js',
  './data/content/cursos.js',
  './data/content/juegos.js',
  './data/content/riesgos.js',
  './data/content/familia.js',
  './data/content/territorios.js',
  './data/content/territorio-idx.js',
  './data/geo/es-provincias.geojson',
  './data/geo/es-ccaa.geojson',
  './data/geo/avila-municipios.geojson',
  './data/geo/avila-centroides.geojson',
  './data/geo/rutas.geojson',
  './data/geo/nodos-familia.geojson',
  './data/geo/municipios-familia.geojson',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './precache-manifest.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC);
      // addAll falla entero si un recurso falla: los añadimos uno a uno.
      await Promise.all(
        CORE.map((u) => cache.add(new Request(u, { cache: 'reload' })).catch((err) => console.warn('SW precache:', u, err)))
      );
      self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== STATIC && k !== RUNTIME).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Terceros (teselas de mapa): la app los gestiona con IndexedDB.
  if (url.origin !== self.location.origin) return;

  // ---------------------------------------------------------------------
  // Navegación: CACHÉ PRIMERO, con revalidación en segundo plano.
  //
  // Es deliberado. Un "red primero" hace que la app dependa de que el
  // servidor responda: si el hosting está caído, lento o devuelve un 5xx,
  // el usuario se queda esperando o recibe una página de error, justo en el
  // momento en el que más necesita la app. Sirviendo desde caché, el arranque
  // es inmediato y el estado del hosting es irrelevante.
  //
  // Las actualizaciones siguen llegando: el navegador comprueba sw.js en cada
  // navegación y, si hay una versión nueva, la instala y se aplica al
  // siguiente arranque.
  // ---------------------------------------------------------------------
  if (req.mode === 'navigate') {
    e.respondWith(
      (async () => {
        const cached = (await caches.match(req, { ignoreSearch: true })) || (await caches.match('./index.html'));

        const revalidar = fetch(req)
          .then(async (net) => {
            if (net && net.ok) {
              const c = await caches.open(RUNTIME);
              await c.put(req, net.clone());
            }
            return net;
          })
          .catch(() => null);

        if (cached) {
          e.waitUntil(revalidar); // se actualiza sin bloquear al usuario
          return cached;
        }

        // Primera visita: no hay nada en caché, hay que ir a la red.
        const net = await revalidar;
        return net || new Response(
          '<!doctype html><meta charset="utf-8"><title>Sin conexión</title>' +
          '<body style="background:#0d110f;color:#e9e7dd;font-family:system-ui;padding:24px">' +
          '<h1>SURVIVAL OFFLINE</h1><p>Esta es la primera vez que abres la aplicación y no hay conexión, ' +
          'así que todavía no hay nada guardado en el dispositivo.</p>' +
          '<p>Conéctate una vez para completar la instalación. A partir de ahí funcionará sin Internet.</p></body>',
          { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      })()
    );
    return;
  }

  // Recursos propios: caché primero.
  e.respondWith(
    (async () => {
      const hit = await caches.match(req, { ignoreSearch: false });
      if (hit) return hit;
      try {
        const net = await fetch(req);
        if (net && net.status === 200 && net.type === 'basic') {
          const c = await caches.open(RUNTIME);
          c.put(req, net.clone());
        }
        return net;
      } catch {
        const fallback = await caches.match(req, { ignoreSearch: true });
        if (fallback) return fallback;
        return new Response('Recurso no disponible sin conexión', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }
    })()
  );
});
