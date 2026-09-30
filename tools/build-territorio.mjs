/* =========================================================================
   build-territorio.mjs — deriva la correspondencia provincia → comunidad
   autónoma GEOMÉTRICAMENTE, a partir de la cartografía del IGN que ya está
   en la app.
   ---------------------------------------------------------------------------
   POR QUÉ ASÍ Y NO A MANO: teclear una tabla de 52 filas de memoria es
   exactamente el tipo de dato que se puede colar mal sin que nadie lo note.
   Calculándolo contra los polígonos reales, el dato se sostiene solo, y
   además se puede comprobar: al final se contrasta el número de provincias
   de cada comunidad contra el reparto conocido. Si un solo número baila,
   el script falla y no genera nada.
   ========================================================================= */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(DIR, '..');
const leer = (p) => JSON.parse(fs.readFileSync(path.join(RAIZ, p), 'utf8'));

const prov = leer('public/data/geo/es-provincias.geojson');
const ccaa = leer('public/data/geo/es-ccaa.geojson');

/* Gibraltar viene en el conjunto de datos de origen como polígono aparte.
   No es territorio español: fuera. */
const FUERA_PROV = new Set(['54']);
const FUERA_CCAA = new Set(['20']);

const anillos = (g) => (g.type === 'Polygon' ? g.coordinates : g.coordinates.flat());

/* Centroide por área del anillo mayor. El centroide simple de los vértices se
   desvía mucho cuando un lado del polígono tiene más detalle que otro. */
function puntoInterior(g) {
  let mejor = null, mejorA = -1;
  for (const anillo of anillos(g)) {
    if (anillo.length < 4) continue;
    let a = 0, cx = 0, cy = 0;
    for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
      const [x0, y0] = anillo[j], [x1, y1] = anillo[i];
      const f = x0 * y1 - x1 * y0;
      a += f; cx += (x0 + x1) * f; cy += (y0 + y1) * f;
    }
    a *= 0.5;
    if (Math.abs(a) > mejorA) { mejorA = Math.abs(a); mejor = [cx / (6 * a), cy / (6 * a)]; }
  }
  return mejor;
}

/* Ray casting clásico, con los agujeros contando igual: un punto dentro de un
   número impar de anillos está dentro del polígono. */
function dentro(pt, g) {
  const [x, y] = pt;
  let n = 0;
  for (const anillo of anillos(g)) {
    for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
      const [xi, yi] = anillo[i], [xj, yj] = anillo[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) n++;
    }
  }
  return n % 2 === 1;
}

function bbox(g) {
  let a = 1e9, b = 1e9, c = -1e9, d = -1e9;
  for (const anillo of anillos(g)) for (const [x, y] of anillo) {
    if (x < a) a = x; if (y < b) b = y; if (x > c) c = x; if (y > d) d = y;
  }
  return [+a.toFixed(3), +b.toFixed(3), +c.toFixed(3), +d.toFixed(3)];
}

const comunidades = ccaa.features.filter((f) => !FUERA_CCAA.has(f.properties.cod));
const provincias = prov.features.filter((f) => !FUERA_PROV.has(f.properties.cod));

const salida = [];
for (const p of provincias) {
  const pt = puntoInterior(p.geometry);
  let cod = comunidades.find((c) => dentro(pt, c.geometry))?.properties.cod ?? null;

  /* Si el punto interior cae fuera de todo (pasa con provincias muy cóncavas
     o insulares), se vota con los vértices en vez de inventar la respuesta. */
  if (!cod) {
    const votos = new Map();
    for (const anillo of anillos(p.geometry)) {
      for (let i = 0; i < anillo.length; i += Math.max(1, (anillo.length / 40) | 0)) {
        const c = comunidades.find((c) => dentro(anillo[i], c.geometry))?.properties.cod;
        if (c) votos.set(c, (votos.get(c) || 0) + 1);
      }
    }
    cod = [...votos.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  }
  if (!cod) throw new Error(`No se ha podido asignar comunidad a la provincia ${p.properties.cod} ${p.properties.nombre}`);

  salida.push({
    cod: p.properties.cod,
    nombre: p.properties.nombre,
    ccaa: cod,
    bbox: bbox(p.geometry),
    centro: pt.map((v) => +v.toFixed(4)),
  });
}

/* ---------- Comprobación ------------------------------------------------ */
/* Reparto conocido de provincias por comunidad. Si la geometría no lo
   reproduce exactamente, algo va mal y es mejor no generar nada. */
const ESPERADO = {
  '01': 8, '02': 3, '03': 1, '04': 1, '05': 2, '06': 1, '07': 9, '08': 5,
  '09': 4, '10': 3, '11': 2, '12': 4, '13': 1, '14': 1, '15': 1, '16': 3,
  '17': 1, '18': 1, '19': 1,
};
const cuenta = {};
for (const s of salida) cuenta[s.ccaa] = (cuenta[s.ccaa] || 0) + 1;

const fallos = [];
for (const [c, n] of Object.entries(ESPERADO)) {
  const nom = comunidades.find((x) => x.properties.cod === c)?.properties.nombre ?? c;
  if ((cuenta[c] || 0) !== n) fallos.push(`${nom} (${c}): esperadas ${n}, obtenidas ${cuenta[c] || 0}`);
}
if (fallos.length) {
  console.error('COMPROBACIÓN FALLIDA — la asignación geométrica no cuadra:');
  for (const f of fallos) console.error('  · ' + f);
  process.exit(1);
}

const nombres = Object.fromEntries(comunidades.map((c) => [c.properties.cod, c.properties.nombre]));

const js = `/* GENERADO POR tools/build-territorio.mjs — NO EDITAR A MANO.
   La comunidad de cada provincia NO está tecleada: se calcula por
   punto-en-polígono contra la cartografía del IGN incluida en la app, y el
   script comprueba el reparto antes de escribir este archivo. */

export const CCAA_NOMBRE = ${JSON.stringify(nombres, null, 2)};

/* cod: código INE de provincia · ccaa: código INE de comunidad
   bbox: [oeste, sur, este, norte] · centro: punto interior, para encuadrar */
export const PROVINCIAS = ${JSON.stringify(salida, null, 0).replace(/\},\{/g, '},\n  {').replace(/^\[/, '[\n  ').replace(/\]$/, ',\n]')};
`;

fs.writeFileSync(path.join(RAIZ, 'public/data/content/territorio-idx.js'), js);
console.log(`OK · ${salida.length} provincias asignadas a ${Object.keys(cuenta).length} comunidades/ciudades`);
console.log('Reparto: ' + Object.entries(cuenta).sort().map(([c, n]) => `${nombres[c]}=${n}`).join(', '));
