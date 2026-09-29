#!/usr/bin/env node
/**
 * build-geo.mjs
 * Genera los ficheros GeoJSON offline a partir de es-atlas (TopoJSON derivado
 * del Equipamiento Geográfico de Referencia Nacional del IGN, licencia MIT).
 *
 * Salidas en public/data/geo/:
 *   es-provincias.geojson     -> 52 provincias (polígonos)
 *   es-ccaa.geojson           -> comunidades autónomas (polígonos)
 *   avila-municipios.geojson  -> 248 municipios de la provincia de Ávila
 *   avila-centroides.geojson  -> centroide de cada municipio de Ávila (puntos)
 *
 * NOTA: los centroides son geometría derivada (centro del polígono municipal),
 * no la ubicación exacta de un núcleo urbano. La app lo indica explícitamente.
 */
import fs from 'node:fs';
import path from 'node:path';
import { feature } from 'topojson-client';

const OUT = path.resolve('public/data/geo');
fs.mkdirSync(OUT, { recursive: true });

const load = (f) =>
  JSON.parse(fs.readFileSync(path.resolve('node_modules/es-atlas/es', f), 'utf8'));

// Redondea coordenadas para reducir peso (5 decimales ~ 1 m).
function round(geo, dp = 4) {
  const f = 10 ** dp;
  const walk = (c) => {
    if (typeof c[0] === 'number') return [Math.round(c[0] * f) / f, Math.round(c[1] * f) / f];
    return c.map(walk);
  };
  for (const ft of geo.features) ft.geometry.coordinates = walk(ft.geometry.coordinates);
  return geo;
}

function write(name, obj) {
  const p = path.join(OUT, name);
  fs.writeFileSync(p, JSON.stringify(obj));
  console.log(name.padEnd(30), (fs.statSync(p).size / 1024).toFixed(1) + ' KB');
}

// --- Provincias y CCAA -------------------------------------------------
const prov = load('provinces.json');
const provincias = round(feature(prov, prov.objects.provinces), 3);
provincias.features.forEach((ft) => {
  ft.properties = { nombre: ft.properties.name, cod: ft.id };
});
write('es-provincias.geojson', provincias);

const ccaa = round(feature(prov, prov.objects.autonomous_regions), 3);
ccaa.features.forEach((ft) => {
  ft.properties = { nombre: ft.properties.name, cod: ft.id };
});
write('es-ccaa.geojson', ccaa);

// --- Municipios de Ávila (código INE de provincia = 05) ------------------
const muni = load('municipalities.json');
const all = feature(muni, muni.objects.municipalities);
const avila = {
  type: 'FeatureCollection',
  features: all.features.filter((ft) => String(ft.id ?? '').startsWith('05')),
};
avila.features.forEach((ft) => {
  ft.properties = { nombre: ft.properties.name, ine: ft.id };
});
round(avila, 4);
write('avila-municipios.geojson', avila);

// --- Centroides de municipios de Ávila ---------------------------------
function centroid(geometry) {
  // Centroide por área de todos los anillos exteriores.
  const polys =
    geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  let A = 0, cx = 0, cy = 0;
  for (const poly of polys) {
    const ring = poly[0];
    for (let i = 0, n = ring.length - 1; i < n; i++) {
      const [x0, y0] = ring[i];
      const [x1, y1] = ring[i + 1];
      const a = x0 * y1 - x1 * y0;
      A += a; cx += (x0 + x1) * a; cy += (y0 + y1) * a;
    }
  }
  if (!A) return polys[0][0][0];
  A *= 0.5;
  return [cx / (6 * A), cy / (6 * A)];
}

const centroides = {
  type: 'FeatureCollection',
  features: avila.features.map((ft) => ({
    type: 'Feature',
    properties: { ...ft.properties, aprox: true },
    geometry: {
      type: 'Point',
      coordinates: centroid(ft.geometry).map((v) => Math.round(v * 1e4) / 1e4),
    },
  })),
};
write('avila-centroides.geojson', centroides);

console.log('\nFuente: es-atlas (MIT) — derivado del Equipamiento Geográfico de');
console.log('Referencia Nacional del Instituto Geográfico Nacional (IGN).');
