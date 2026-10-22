/* =========================================================================
   ubicacion.js — dónde estás, resuelto en el propio dispositivo
   ---------------------------------------------------------------------------
   QUÉ HACE
     · Pide la posición al navegador (GPS del móvil) o deja elegir la
       provincia a mano.
     · Convierte esa posición en provincia y comunidad autónoma haciendo
       punto-en-polígono contra la cartografía del IGN que la app ya lleva
       precargada. No hay servicio de geocodificación, ni petición de red,
       ni clave de API. Funciona en modo avión.

   QUÉ NO GUARDA, Y POR QUÉ
     Nunca se guardan las coordenadas. Se guarda ÚNICAMENTE el código de
     provincia resuelto. Motivo: el almacén 'kv' entra en la sincronización
     opcional con Supabase, así que cualquier cosa escrita ahí puede acabar
     saliendo del móvil si el usuario activa la sincronización. Una provincia
     es todo lo que la app necesita para elegir el ámbito; un par de
     coordenadas con diez metros de precisión es una vigilancia de tu casa.
     La diferencia de utilidad es cero y la diferencia de riesgo es enorme.

     Las coordenadas existen sólo en memoria, el tiempo que tarda el cálculo,
     y se descartan.

   PRECISIÓN
     La provincia se resuelve con la geometría generalizada del IGN que se
     usa para dibujar el mapa. Cerca de un límite provincial puede fallar por
     unos cientos de metros. Por eso el resultado siempre se puede corregir a
     mano, y la app lo dice en vez de fingir exactitud.
   ========================================================================= */

import * as store from './store.js';
import { PROVINCIAS, CCAA_NOMBRE } from '../../data/content/territorio-idx.js';

export { PROVINCIAS, CCAA_NOMBRE };

const PROV_MAP = Object.fromEntries(PROVINCIAS.map((p) => [p.cod, p]));

/* Lista para el selector manual: alfabética, que es como la busca una
   persona, no por código INE. */
export const PROVINCIAS_ORDENADAS = [...PROVINCIAS].sort((a, b) =>
  a.nombre.localeCompare(b.nombre, 'es')
);

export function provincia(cod) {
  const p = PROV_MAP[cod];
  if (!p) return null;
  return { ...p, ccaaNombre: CCAA_NOMBRE[p.ccaa] || null };
}

/* ------------------------------------------------------------------------
   GEOMETRÍA
   ------------------------------------------------------------------------ */
let geoCache = null;

async function cargarGeo() {
  if (geoCache) return geoCache;
  const r = await fetch('./data/geo/es-provincias.geojson');
  if (!r.ok) throw new Error('No se ha podido leer la cartografía de provincias.');
  geoCache = await r.json();
  return geoCache;
}

const anillos = (g) => (g.type === 'Polygon' ? g.coordinates : g.coordinates.flat());

/* Ray casting con regla par-impar. Los agujeros del polígono cuentan como un
   cruce más, así que un punto dentro de un enclave queda correctamente fuera. */
function dentro(lon, lat, geom) {
  let n = 0;
  for (const anillo of anillos(geom)) {
    for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
      const xi = anillo[i][0], yi = anillo[i][1];
      const xj = anillo[j][0], yj = anillo[j][1];
      if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) n++;
    }
  }
  return n % 2 === 1;
}

/* Filtro previo por caja envolvente: evita recorrer 52 polígonos completos
   cuando 51 de ellos ni siquiera están cerca. */
function enCaja(lon, lat, bbox) {
  return lon >= bbox[0] - 0.01 && lon <= bbox[2] + 0.01 && lat >= bbox[1] - 0.01 && lat <= bbox[3] + 0.01;
}

/* Resuelve unas coordenadas a provincia. Devuelve null si el punto no cae en
   territorio español: preferimos decir que no lo sabemos a asignar la
   provincia más cercana y que el usuario crea que está donde no está. */
export async function resolverPunto(lon, lat) {
  const geo = await cargarGeo();
  const candidatas = PROVINCIAS.filter((p) => enCaja(lon, lat, p.bbox));
  for (const c of candidatas) {
    const f = geo.features.find((x) => x.properties.cod === c.cod);
    if (f && dentro(lon, lat, f.geometry)) return provincia(c.cod);
  }
  return null;
}

/* ------------------------------------------------------------------------
   GEOLOCALIZACIÓN DEL NAVEGADOR
   ------------------------------------------------------------------------ */
export const HAY_GPS = typeof navigator !== 'undefined' && 'geolocation' in navigator;

const MOTIVOS = {
  1: 'Has denegado el permiso de ubicación. Puedes activarlo en los ajustes del navegador, o elegir tu provincia a mano.',
  2: 'El dispositivo no ha podido determinar la posición. Sin cobertura ni GPS a la vista suele pasar bajo techo: prueba junto a una ventana o elige tu provincia a mano.',
  3: 'La localización ha tardado demasiado. Prueba otra vez o elige tu provincia a mano.',
};

/* Devuelve directamente la provincia, no las coordenadas: así ninguna parte
   de la app llega a ver la posición exacta y no puede guardarla por
   descuido. */
export function localizar({ timeout = 12000 } = {}) {
  return new Promise((resolve, reject) => {
    if (!HAY_GPS) return reject(new Error('Este navegador no ofrece ubicación. Elige tu provincia a mano.'));
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { longitude, latitude, accuracy } = pos.coords;
          const p = await resolverPunto(longitude, latitude);
          if (!p) {
            return reject(new Error('Tu posición no cae dentro del territorio español, así que no hay una provincia que asignar. Puedes elegirla a mano.'));
          }
          resolve({ ...p, precision: accuracy == null ? null : Math.round(accuracy) });
        } catch (e) { reject(e); }
      },
      (err) => reject(new Error(MOTIVOS[err.code] || 'No se ha podido obtener la ubicación. Elige tu provincia a mano.')),
      { enableHighAccuracy: false, timeout, maximumAge: 300000 }
    );
  });
}

/* ------------------------------------------------------------------------
   PERSISTENCIA
   Sólo el código de provincia y cómo se eligió. Nada más.
   ------------------------------------------------------------------------ */
const CLAVE = 'ubicacion';

export async function guardada() {
  const v = (await store.get('kv', CLAVE))?.v;
  if (!v || !PROV_MAP[v.cod]) return null;
  return { ...provincia(v.cod), modo: v.modo === 'gps' ? 'gps' : 'manual', ts: v.ts || null };
}

export async function guardar(cod, modo = 'manual') {
  if (!PROV_MAP[cod]) throw new Error('Código de provincia desconocido: ' + cod);
  await store.put('kv', { id: CLAVE, v: { cod, modo: modo === 'gps' ? 'gps' : 'manual', ts: Date.now() } });
  return provincia(cod);
}

export async function olvidar() {
  await store.del('kv', CLAVE);
}
