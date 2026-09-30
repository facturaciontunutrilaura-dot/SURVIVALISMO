#!/usr/bin/env node
/** Servidor estático mínimo para desarrollo local (sin dependencias). */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const PORT = process.env.PORT || 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.geojson': 'application/geo+json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

/* Cabeceras de PRODUCCIÓN. Se leen de public/_headers (mismo contenido que
   netlify.toml; una prueba unitaria vigila que no se desincronicen) para que
   la previsualización local y las pruebas se comporten como el sitio
   publicado: sobre todo la CSP, que bloquea scripts en línea y recursos de
   terceros no permitidos.
   SIN_CSP=1 quita solo la CSP. Lo usa la prueba de sincronización, que simula
   Supabase en http://localhost (la CSP real solo admite https://*.supabase.co). */
function leerCabeceras() {
  const reglas = [];
  let actual = null;
  const txt = fs.existsSync(path.join(ROOT, '_headers')) ? fs.readFileSync(path.join(ROOT, '_headers'), 'utf8') : '';
  for (const linea of txt.split('\n')) {
    if (!linea.trim() || linea.trim().startsWith('#')) continue;
    if (!/^\s/.test(linea)) { actual = { patron: linea.trim(), cab: {} }; reglas.push(actual); continue; }
    const i = linea.indexOf(':');
    if (actual && i > 0) actual.cab[linea.slice(0, i).trim()] = linea.slice(i + 1).trim();
  }
  return reglas;
}
const REGLAS = leerCabeceras();
const encaja = (patron, ruta) => (patron.endsWith('*') ? ruta.startsWith(patron.slice(0, -1)) : ruta === patron);
function cabecerasProduccion(ruta) {
  const h = {};
  for (const r of REGLAS) if (encaja(r.patron, ruta)) Object.assign(h, r.cab);
  if (process.env.SIN_CSP === '1') delete h['Content-Security-Policy'];
  return h;
}

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  let file = path.join(ROOT, p);
  if (!file.startsWith(ROOT)) { res.writeHead(403).end('403'); return; }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(ROOT, 'index.html');
  const ext = path.extname(file).toLowerCase();
  const headers = { 'Content-Type': MIME[ext] || 'application/octet-stream', ...cabecerasProduccion(p) };
  if (p === '/sw.js' || p === '/index.html') headers['Cache-Control'] = 'no-cache';
  res.writeHead(200, headers);
  fs.createReadStream(file).pipe(res);
});

server.listen(PORT, () => console.log(`SUPERVIVENCIA (previsualización local, cabeceras de producción${process.env.SIN_CSP === '1' ? ' sin CSP' : ''}) → http://localhost:${PORT}`));
