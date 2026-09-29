/* =========================================================================
   sw.js — Service Worker de SUPERVIVENCIA
   Estrategia:
     · Precache completo del app shell + contenido + geodatos en la instalación.
     · Actualización segura: una versión nueva solo se instala si TODOS sus
       recursos se han descargado bien; si falta uno, la instalación falla y
       sigue la versión anterior, intacta. Ya instalada, espera a que el
       usuario pulse «Actualizar» (o al siguiente arranque): nunca se cambia
       de versión a mitad de uso.
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

/* ¿La respuesta es de verdad el recurso pedido? El hosting tiene un
   «fallback» de SPA: un archivo que no existe devuelve index.html con 200.
   Sin esta comprobación se guardaría HTML en lugar de un módulo JS y esa parte
   de la app dejaría de funcionar sin conexión. */
function respuestaValida(url, r) {
  if (!r || !r.ok || r.status !== 200 || r.type === 'opaqueredirect') return false;
  const esHtml = url.endsWith('/') || url.endsWith('.html');
  const tipo = (r.headers.get('Content-Type') || '').toLowerCase();
  return esHtml || !tipo.includes('text/html');
}

self.addEventListener('install', (e) => {
  e.waitUntil(
    (async () => {
      // Si no se puede leer el manifiesto, la instalación falla y el
      // navegador conserva la versión anterior, que sigue funcionando.
      const r = await fetch(MANIFIESTO, { cache: 'reload' });
      if (!respuestaValida(MANIFIESTO, r)) throw new Error('No se pudo leer ' + MANIFIESTO);
      const lista = [...new Set([...(await r.json()), './index.html', MANIFIESTO])];

      // 1) Se descarga TODO antes de escribir nada. Un solo fallo aborta la
      //    instalación: no se toca ninguna caché y la versión instalada sigue
      //    funcionando (también sin conexión).
      const descargas = await Promise.all(lista.map(async (u) => {
        const req = new Request(u, { cache: 'reload' });
        const res = await fetch(req);
        if (!respuestaValida(u, res)) throw new Error(`Recurso no disponible: ${u} (${res.status})`);
        return [req, res];
      }));

      // 2) Solo con todo en la mano se escribe la caché de esta versión. Si la
      //    escritura falla (p. ej. sin espacio), se borra lo escrito si la caché
      //    es nueva; si ya existía (misma versión), se deja como estaba.
      const existia = await caches.has(STATIC);
      const cache = await caches.open(STATIC);
      try {
        for (const [req, res] of descargas) await cache.put(req, res);
      } catch (err) {
        if (!existia) await caches.delete(STATIC);
        throw err;
      }
      // Sin skipWaiting(): si ya hay una versión activa, la nueva espera a que
      // el usuario la aplique (mensaje 'skipWaiting') o al siguiente arranque.
      // En la primera instalación no hay nada que esperar y se activa sola.
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

// La página lo envía cuando el usuario pulsa «Actualizar».
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
          '<h1>SUPERVIVENCIA</h1><p>Esta es la primera vez que abres la aplicación y no hay conexión, ' +
          'así que todavía no hay nada guardado en el dispositivo.</p>' +
          '<p>Conéctate una vez para completar la instalación. A partir de ahí funcionará sin Internet.</p></body>',
          { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      })()
    );
    return;
  }

  // «Reparar» (página ¿Está lista tu app?) pide el archivo a la red con esta
  // cabecera para sustituir uno que falta o está dañado en la caché. Servirlo
  // desde la caché devolvería el mismo archivo dañado. Solo esa petición
  // explícita salta la caché; todo lo demás sigue siendo caché primero.
  if (req.headers.get('X-Reparar') === '1') { e.respondWith(fetch(req)); return; }

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
