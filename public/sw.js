/* =========================================================================
   sw.js — Service Worker de SURVIVAL OFFLINE
   Estrategia:
     · Precache completo del app shell + contenido + geodatos en la instalación.
     · Navegaciones: caché primero, con revalidación en segundo plano.
     · Recursos propios: caché primero (son inmutables por versión).
     · Peticiones a terceros (teselas de mapa): pasan de largo; la app las
       guarda ella misma en IndexedDB.
   ========================================================================= */

const VERSION = '1.5.0';
const STATIC = `survival-static-v${VERSION}`;
const RUNTIME = `survival-runtime-v${VERSION}`;

/* La lista de recursos NO se mantiene a mano aquí: la genera
   tools/build-assets.mjs en precache-manifest.json recorriendo public/. Así
   un archivo nuevo no puede quedarse fuera del modo offline por olvido.
   VERSION también la escribe el build a partir de data/content/index.js. */
const MANIFIESTO = './precache-manifest.json';

self.addEventListener('install', (e) => {
  e.waitUntil(
    (async () => {
      // Si no se puede leer el manifiesto, la instalación falla y el
      // navegador conserva la versión anterior, que sigue funcionando.
      const r = await fetch(MANIFIESTO, { cache: 'reload' });
      if (!r.ok) throw new Error('No se pudo leer ' + MANIFIESTO);
      const lista = [...new Set([...(await r.json()), './index.html', MANIFIESTO])];
      const cache = await caches.open(STATIC);
      // addAll falla entero si un recurso falla: los añadimos uno a uno.
      await Promise.all(
        lista.map((u) => cache.add(new Request(u, { cache: 'reload' })).catch((err) => console.warn('SW precache:', u, err)))
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
