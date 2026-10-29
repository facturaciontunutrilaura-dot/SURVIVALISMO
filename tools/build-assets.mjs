#!/usr/bin/env node
/**
 * build-assets.mjs
 *  1. Genera los iconos PNG de la PWA a partir de un SVG propio (sin librerías
 *     externas: se rasteriza con sharp si está disponible; si no, se genera un
 *     PNG mínimo con canvas puro en Node vía @napi-rs/canvas o, en último
 *     término, un PNG sólido construido a mano).
 *  2. Genera precache-manifest.json recorriendo public/.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const PUB = path.resolve('public');
const ICONS = path.join(PUB, 'icons');
fs.mkdirSync(ICONS, { recursive: true });

/* ------------------------------- PNG mínimo ------------------------------- */
function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
/** Escribe un PNG RGBA a partir de una función pixel(x,y) -> [r,g,b,a]. */
function writePNG(file, size, pixel) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  let o = 0;
  for (let y = 0; y < size; y++) {
    raw[o++] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x, y);
      raw[o++] = r; raw[o++] = g; raw[o++] = b; raw[o++] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  fs.writeFileSync(file, png);
  return png.length;
}

/* --------------------------- Diseño del icono --------------------------- */
// Brújula estilizada sobre fondo verde oliva oscuro con anillo.
function iconPixel(size, maskable) {
  const c = size / 2;
  const pad = maskable ? size * 0.18 : size * 0.06;
  const R = c - pad;
  return (x, y) => {
    const dx = x - c + 0.5, dy = y - c + 0.5;
    const d = Math.hypot(dx, dy);
    // Fondo
    if (maskable) {
      if (d > c) return [0, 0, 0, 0];
    } else {
      const r = size * 0.19; // esquinas redondeadas
      const ix = Math.min(x, size - 1 - x), iy = Math.min(y, size - 1 - y);
      if (ix < r && iy < r && Math.hypot(r - ix, r - iy) > r) return [0, 0, 0, 0];
    }
    let col = [13, 17, 15, 255];
    // Anillo exterior
    if (d < R && d > R * 0.92) col = [110, 138, 68, 255];
    // Marcas cardinales
    else if (d < R * 0.9 && d > R * 0.78) {
      const ang = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
      const a = ((ang % 360) + 360) % 360;
      const near = [0, 90, 180, 270].some((t) => Math.abs(((a - t + 540) % 360) - 180) > 176);
      col = near ? [156, 183, 104, 255] : [45, 55, 47, 255];
    }
    // Aguja: rombo N (rojo) / S (oliva)
    else if (d < R * 0.72) {
      const w = R * 0.13 * (1 - d / (R * 0.72));
      if (Math.abs(dx) < w) col = dy < 0 ? [200, 64, 47, 255] : [78, 98, 54, 255];
      else if (Math.abs(dy) < R * 0.035 && Math.abs(dx) < R * 0.5) col = [60, 74, 62, 255];
      else col = [20, 26, 22, 255];
    }
    return col;
  };
}

const sizes = [
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['maskable-512.png', 512, true],
];
for (const [name, s, mask] of sizes) {
  const bytes = writePNG(path.join(ICONS, name), s, iconPixel(s, mask));
  console.log(`icon ${name.padEnd(20)} ${(bytes / 1024).toFixed(1)} KB`);
}
// favicon reutiliza el 192
fs.copyFileSync(path.join(ICONS, 'icon-192.png'), path.join(PUB, 'favicon.png'));

/* --------------------------- Precache manifest --------------------------- */
const SKIP = new Set(['precache-manifest.json', 'sw.js']);
const EXT = /\.(html|css|js|json|geojson|webmanifest|png|svg|woff2?|txt)$/i;

function walk(dir, base = '') {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...walk(path.join(dir, e.name), rel));
    else if (EXT.test(e.name) && !SKIP.has(rel)) out.push('./' + rel);
  }
  return out;
}

const list = ['./', ...walk(PUB)].sort();

/* ------------------- Versión única: index.js → sw.js -------------------
   La versión se escribe en un solo sitio (data/content/index.js). El Service
   Worker no puede importar ese módulo, así que el build la copia en sw.js. */
const idxSrc = fs.readFileSync(path.join(PUB, 'data/content/index.js'), 'utf8');
const VERSION = idxSrc.match(/export const VERSION = '([^']+)'/)?.[1];
if (!VERSION) throw new Error('No se encuentra VERSION en data/content/index.js');
const swFile = path.join(PUB, 'sw.js');
const swSrc = fs.readFileSync(swFile, 'utf8');
const swNuevo = swSrc.replace(/const VERSION = '[^']+';/, `const VERSION = '${VERSION}';`);
if (swNuevo !== swSrc) fs.writeFileSync(swFile, swNuevo);
console.log(`\nVersión ${VERSION} (sw.js sincronizado)`);
fs.writeFileSync(path.join(PUB, 'precache-manifest.json'), JSON.stringify(list, null, 2));

let total = 0;
for (const f of list) {
  if (f === './') continue;
  try { total += fs.statSync(path.join(PUB, f.slice(2))).size; } catch {}
}
console.log(`\nprecache-manifest.json: ${list.length} recursos · ${(total / 1024 / 1024).toFixed(2)} MB`);
