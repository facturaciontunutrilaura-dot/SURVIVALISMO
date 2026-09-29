#!/usr/bin/env node
/**
 * build-rutas.mjs
 * ---------------------------------------------------------------------------
 * Genera la geometría offline de las rutas familiares.
 *
 * DECISIÓN TÉCNICA (documentada en el README):
 * No se inventa ni una sola coordenada. Cada vértice de una ruta es el
 * CENTROIDE MUNICIPAL calculado a partir de los polígonos del Equipamiento
 * Geográfico de Referencia Nacional del IGN (paquete es-atlas, MIT).
 *
 * Es decir: la ruta es una polilínea que pasa por localidades REALES situadas
 * sobre el corredor viario real, no una línea recta entre origen y destino.
 * No es una traza calle a calle: para eso hace falta la red viaria completa de
 * OpenStreetMap y un motor de routing, lo que excede con mucho el presupuesto
 * de una PWA (ver README). La app permite importar un GPX/GeoJSON real para
 * sustituir la traza esquemática por una traza exacta.
 *
 * Salida: public/data/geo/rutas.geojson  +  public/data/geo/nodos-familia.geojson
 */
import fs from 'node:fs';
import path from 'node:path';
import { feature } from 'topojson-client';

const OUT = path.resolve('public/data/geo');
fs.mkdirSync(OUT, { recursive: true });

const topo = JSON.parse(fs.readFileSync(path.resolve('node_modules/es-atlas/es/municipalities.json'), 'utf8'));
const munis = feature(topo, topo.objects.municipalities).features;

function centroid(geometry) {
  const polys = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  let A = 0, cx = 0, cy = 0;
  for (const poly of polys) {
    const ring = poly[0];
    for (let i = 0, n = ring.length - 1; i < n; i++) {
      const [x0, y0] = ring[i], [x1, y1] = ring[i + 1];
      const a = x0 * y1 - x1 * y0;
      A += a; cx += (x0 + x1) * a; cy += (y0 + y1) * a;
    }
  }
  if (!A) return polys[0][0][0];
  A *= 0.5;
  return [Math.round((cx / (6 * A)) * 1e5) / 1e5, Math.round((cy / (6 * A)) * 1e5) / 1e5];
}

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

const index = new Map();
for (const m of munis) {
  const key = norm(m.properties.name);
  if (!index.has(key)) index.set(key, []);
  index.get(key).push({ id: String(m.id), name: m.properties.name, c: centroid(m.geometry) });
}

const noEncontrados = [];
/** Busca un municipio por nombre y, opcionalmente, prefijo de código de provincia. */
function wp(nombre, prov) {
  const cands = index.get(norm(nombre)) || [];
  const hit = prov ? cands.find((c) => c.id.startsWith(prov)) : cands[0];
  if (!hit) { noEncontrados.push(`${nombre}${prov ? ' (' + prov + ')' : ''}`); return null; }
  return { nombre: hit.name, ine: hit.id, c: hit.c };
}

/* =========================================================================
   CORREDORES
   Cada waypoint es un municipio real atravesado o bordeado por el eje viario
   indicado. Códigos de provincia INE: 05 Ávila · 08 Barcelona · 22 Huesca ·
   25 Lleida · 28 Madrid · 40 Segovia · 42 Soria · 45 Toledo · 50 Zaragoza ·
   31 Navarra · 26 La Rioja · 43 Tarragona
   ========================================================================= */

const CORREDORES = {
  /* ---------------- ÁVILA → TERRASSA ---------------- */
  'avila-terrassa-A': {
    t: 'Ruta A — Principal (A-6 · M-50 · A-2)',
    via: 'AP-51/A-51 → A-6 → M-50 → A-2 → AP-2/A-2 → Martorell → Terrassa',
    tipo: 'principal',
    puntos: [
      ['Ávila', '05'], ['Villacastín', '40'], ['El Espinar', '40'], ['Guadarrama', '28'],
      ['Collado Villalba', '28'], ['Las Rozas de Madrid', '28'], ['Madrid', '28'],
      ['Alcalá de Henares', '28'], ['Guadalajara', '19'], ['Torija', '19'],
      ['Alcolea del Pinar', '19'], ['Medinaceli', '42'], ['Arcos de Jalón', '42'],
      ['Ariza', '50'], ['Calatayud', '50'], ['La Almunia de Doña Godina', '50'],
      ['Zaragoza', '50'], ['Bujaraloz', '50'], ['Fraga', '22'], ['Lleida', '25'],
      ['Bellpuig', '25'], ['Tàrrega', '25'], ['Cervera', '25'], ['Jorba', '08'],
      ['Igualada', '08'], ['Martorell', '08'], ['Abrera', '08'], ['Terrassa', '08'],
    ],
  },
  'avila-terrassa-B': {
    t: 'Ruta B — Evitando Madrid (N-110 · A-15 · A-68)',
    via: 'N-110 → Segovia → Soria → A-15 → Tudela → AP-68/A-68 → Zaragoza → A-2 → Terrassa',
    tipo: 'alternativa',
    puntos: [
      ['Ávila', '05'], ['Segovia', '40'], ['Soria', '42'], ['Ágreda', '42'],
      ['Tudela', '31'], ['Gallur', '50'], ['Zaragoza', '50'], ['Bujaraloz', '50'],
      ['Fraga', '22'], ['Lleida', '25'], ['Cervera', '25'], ['Igualada', '08'],
      ['Martorell', '08'], ['Terrassa', '08'],
    ],
  },
  'avila-terrassa-C': {
    t: 'Ruta C — Sur, por autopista de peaje (AP-2 · AP-7)',
    via: 'AP-51 → A-6 → M-40 → A-2 → Zaragoza → AP-2 → Montblanc → AP-7 → Martorell → Terrassa',
    tipo: 'alternativa',
    puntos: [
      ['Ávila', '05'], ['Villacastín', '40'], ['Guadarrama', '28'], ['Madrid', '28'],
      ['Guadalajara', '19'], ['Medinaceli', '42'], ['Calatayud', '50'], ['Zaragoza', '50'],
      ['Fraga', '22'], ['Lleida', '25'], ['Montblanc', '43'], ['Valls', '43'],
      ['El Vendrell', '43'], ['Vilafranca del Penedès', '08'], ['Martorell', '08'],
      ['Terrassa', '08'],
    ],
  },

  /* ---------------- ÁVILA → GETAFE ---------------- */
  'avila-getafe-A': {
    t: 'Ruta A — Principal (AP-51 · A-6 · M-50)',
    via: 'AP-51/A-51 → A-6 → M-50 → A-42/M-45 → Getafe',
    tipo: 'principal',
    puntos: [
      ['Ávila', '05'], ['Villacastín', '40'], ['El Espinar', '40'], ['Guadarrama', '28'],
      ['Collado Villalba', '28'], ['Las Rozas de Madrid', '28'], ['Boadilla del Monte', '28'],
      ['Alcorcón', '28'], ['Leganés', '28'], ['Getafe', '28'],
    ],
  },
  'avila-getafe-B': {
    t: 'Ruta B — Por el sur (N-403 · A-5)',
    via: 'N-403 → Maqueda → A-5 → M-50 → Getafe',
    tipo: 'alternativa',
    puntos: [
      ['Ávila', '05'], ['Sotillo de la Adrada', '05'], ['Maqueda', '45'],
      ['Santa Cruz del Retamar', '45'], ['Navalcarnero', '28'], ['Móstoles', '28'],
      ['Fuenlabrada', '28'], ['Getafe', '28'],
    ],
  },
  'avila-getafe-C': {
    t: 'Ruta C — Valle del Alberche (N-403 · M-501)',
    via: 'N-403 → El Tiemblo → San Martín de Valdeiglesias → M-501 → Alcorcón → Getafe',
    tipo: 'alternativa',
    puntos: [
      ['Ávila', '05'], ['El Tiemblo', '05'], ['San Martín de Valdeiglesias', '28'],
      ['Navas del Rey', '28'], ['Villaviciosa de Odón', '28'], ['Alcorcón', '28'],
      ['Leganés', '28'], ['Getafe', '28'],
    ],
  },
};

/* --------------------- Distancia sobre la polilínea --------------------- */
function haversine([lo1, la1], [lo2, la2]) {
  const R = 6371, r = Math.PI / 180;
  const dLa = (la2 - la1) * r, dLo = (lo2 - lo1) * r;
  const a = Math.sin(dLa / 2) ** 2 + Math.cos(la1 * r) * Math.cos(la2 * r) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const features = [];
const resumen = {};

for (const [id, r] of Object.entries(CORREDORES)) {
  const wps = r.puntos.map(([n, p]) => wp(n, p)).filter(Boolean);
  const coords = wps.map((w) => w.c);
  let km = 0;
  for (let i = 1; i < coords.length; i++) km += haversine(coords[i - 1], coords[i]);
  // La polilínea entre centroides municipales aproxima bien el corredor: los
  // atajos entre vértices compensan los rodeos por el interior de las
  // localidades. Se redondea a 5 km para no aparentar una precisión que no
  // tiene. NO es un dato de navegación.
  const kmEst = Math.round(km / 5) * 5;
  features.push({
    type: 'Feature',
    properties: {
      id, titulo: r.t, via: r.via, tipo: r.tipo,
      kmPolilinea: Math.round(km),
      kmEstimados: kmEst,
      localidades: wps.map((w) => w.nombre),
      ine: wps.map((w) => w.ine),
    },
    geometry: { type: 'LineString', coordinates: coords },
  });
  resumen[id] = { km: kmEst, n: wps.length, localidades: wps.map((w) => w.nombre) };
  console.log(`${id.padEnd(20)} ${String(kmEst).padStart(4)} km · ${wps.length} vértices`);
}

fs.writeFileSync(path.join(OUT, 'rutas.geojson'), JSON.stringify({ type: 'FeatureCollection', features }));

/* ----------------------------- Nodos familia ----------------------------- */
const NODOS = [
  { id: 'avila', nombre: 'Ávila', rol: 'base', muni: ['Ávila', '05'] },
  { id: 'terrassa', nombre: 'Terrassa', rol: 'familia', muni: ['Terrassa', '08'] },
  { id: 'getafe', nombre: 'Getafe', rol: 'familia', muni: ['Getafe', '28'] },
];
const nodos = {
  type: 'FeatureCollection',
  features: NODOS.map((n) => {
    const w = wp(...n.muni);
    return {
      type: 'Feature',
      properties: { id: n.id, nombre: n.nombre, rol: n.rol, ine: w.ine, aprox: true },
      geometry: { type: 'Point', coordinates: w.c },
    };
  }),
};
fs.writeFileSync(path.join(OUT, 'nodos-familia.geojson'), JSON.stringify(nodos));

// Municipios de los tres nodos, para el mapa familiar
const idsNodo = new Set(nodos.features.map((f) => f.properties.ine));
const polis = {
  type: 'FeatureCollection',
  features: munis.filter((m) => idsNodo.has(String(m.id))).map((m) => ({
    type: 'Feature',
    properties: { nombre: m.properties.name, ine: String(m.id) },
    geometry: m.geometry,
  })),
};
fs.writeFileSync(path.join(OUT, 'municipios-familia.geojson'), JSON.stringify(polis));

const size = (f) => (fs.statSync(path.join(OUT, f)).size / 1024).toFixed(1) + ' KB';
console.log('\nrutas.geojson              ' + size('rutas.geojson'));
console.log('nodos-familia.geojson      ' + size('nodos-familia.geojson'));
console.log('municipios-familia.geojson ' + size('municipios-familia.geojson'));
if (noEncontrados.length) console.log('\n⚠ NO ENCONTRADOS: ' + noEncontrados.join(', '));
