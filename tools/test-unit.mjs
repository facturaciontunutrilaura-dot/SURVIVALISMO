#!/usr/bin/env node
/**
 * test-unit.mjs — pruebas unitarias sin navegador (node:test, sin dependencias).
 *   · Buscador: normalización, raíces, palabras vacías, sinónimos y ranking.
 *   · Integridad de datos de SOS y sinónimos.
 *   · Versión única y manifiesto de precache completo.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUB = path.join(ROOT, 'public');
const imp = (rel) => import(path.join(PUB, rel));

const { INDICE, ARTICULOS_MAP, SOS_SANITARIAS, EMERGENCIAS, GRUPOS_EMERGENCIA, VERSION } = await imp('data/content/index.js');
const { crearBuscador, normalizar, raiz, conceptos } = await imp('assets/js/search.js');
const { SINONIMOS } = await imp('data/content/sinonimos.js');

const B = crearBuscador(INDICE);
const top = (q, n = 1) => B.buscar(q).resultados.slice(0, n).map((r) => r.it);
const titulos = (q, n = 5) => top(q, n).map((it) => it.t);

/* ------------------------------ Normalización ------------------------------ */
test('normalizar: minúsculas, sin tildes y misma longitud', () => {
  assert.equal(normalizar('HEMORRÁGIA Ñandú'), 'hemorragia nandu');
  const t = 'Apagón eléctrico: ¿qué hago?';
  assert.equal(normalizar(t).length, t.length);
});

test('raíz: singular y plural', () => {
  assert.equal(raiz('hemorragias'), raiz('hemorragia'));
  assert.equal(raiz('luces'), 'luz');
  assert.equal(raiz('inundaciones'), raiz('inundacion'));
  assert.equal(raiz('apagones'), raiz('apagon'));
  assert.equal(raiz('heridas'), raiz('herida'));
});

test('conceptos: descarta palabras vacías y detecta expresiones', () => {
  const c1 = conceptos('sangra mucho');
  assert.equal(c1.length, 1, 'mucho no debe contar');
  assert.equal(c1[0].grupo, 'hemorragia');
  const c2 = conceptos('corte de luz');
  assert.equal(c2.length, 1, '"corte de luz" es una sola idea');
  assert.equal(c2[0].grupo, 'apagon');
  assert.equal(conceptos('falta de agua')[0].grupo, 'falta-agua');
  assert.equal(conceptos('agua')[0].grupo, null, '"agua" sola no se convierte en "falta de agua"');
});

/* ------------------------------ Ranking ------------------------------ */
const esHemorragia = (it) => /hemorragia/i.test(it.t);

test('"sangra mucho" → hemorragia, nunca apagón', () => {
  const t = top('sangra mucho', 2);
  assert.ok(t.every(esHemorragia), JSON.stringify(t.map((x) => x.t)));
  assert.ok(!titulos('sangra mucho').some((x) => /apag/i.test(x)));
});

test('"hemorragia", mayúsculas, plural y tilde dan lo mismo', () => {
  const ref = titulos('hemorragia', 3);
  for (const q of ['HEMORRAGIA', 'hemorragias', 'Hemorrágia', 'HEMORRAGIAS']) assert.deepEqual(titulos(q, 3), ref, q);
  assert.ok(esHemorragia(top('hemorragia')[0]));
});

test('"sangrado" → hemorragia por sinónimo', () => {
  assert.ok(esHemorragia(top('sangrado')[0]));
  const r = B.buscar('sangrado').resultados[0];
  assert.equal(r.motivo.sinonimo, true, 'debe explicar que es por equivalencia');
});

test('"corte de luz" → apagón, no falta de agua', () => {
  const [p] = top('corte de luz');
  assert.match(p.t, /apag/i);
  assert.equal(p.tipo, 'emergencia', 'primero la ficha de actuación');
  assert.ok(!titulos('corte de luz', 3).some((x) => /falta de agua/i.test(x)));
});

test('"apagón" con y sin tilde', () => {
  assert.deepEqual(titulos('apagón', 3), titulos('apagon', 3));
  assert.equal(top('apagon')[0].id, 'apagon');
});

test('"falta de agua" → corte de suministro', () => {
  assert.equal(top('falta de agua')[0].id, 'falta-agua');
  assert.equal(top('sin agua')[0].id, 'falta-agua');
});

test('sanitarias: atragantamiento, infarto e ictus llevan a SOS', () => {
  for (const [q, id] of [['atragantamiento', 'atragantamiento'], ['infarto', 'infarto'], ['ictus', 'ictus'], ['ICTUS', 'ictus'], ['parada cardiaca', 'parada-cardiaca']]) {
    const [p] = top(q);
    assert.equal(p.tipo, 'sos', q);
    assert.equal(p.id, id, q);
  }
  assert.ok(titulos('infarto', 3).some((x) => /infarto: dolor/i.test(x)), 'el artículo propio también aparece');
  assert.ok(titulos('dolor en el pecho', 2).some((x) => /infarto/i.test(x)));
  assert.ok(titulos('derrame cerebral', 2).some((x) => /ictus/i.test(x)));
  assert.ok(titulos('no respira', 3).some((x) => /parada|rcp/i.test(x)));
});

test('palabras irrelevantes no cambian el resultado', () => {
  assert.equal(top('qué hago si hay un apagón')[0].id, 'apagon');
  assert.equal(top('el infarto')[0].id, 'infarto');
  assert.ok(esHemorragia(top('mi hijo sangra mucho')[0]));
});

test('singular/plural en consultas reales', () => {
  assert.equal(top('inundaciones')[0].id, 'inundacion');
  assert.ok(titulos('quemaduras', 2).some((x) => /quemaduras/i.test(x)));
});

test('"me he cortado" no lleva a la falta de agua', () => {
  assert.ok(!titulos('me he cortado', 3).some((x) => /agua/i.test(x)));
  assert.match(top('me he cortado')[0].t, /herida|hemorragia/i);
});

test('los resultados explican por qué aparecen y muestran fragmento', () => {
  const r = B.buscar('hipotermia').resultados;
  assert.ok(r.length > 0);
  assert.ok(r.every((x) => x.motivo && x.motivo.donde));
  assert.ok(r.some((x) => x.fragmento && /hipotermia/i.test(x.fragmento.marca)));
});

test('sin resultados: sugiere corrección local', () => {
  assert.equal(B.buscar('xqzwk').resultados.length, 0);
  assert.equal(B.buscar('hemoragia').resultados.length, 0);
  assert.ok(B.sugerir('hemoragia').includes('hemorragia'));
  assert.ok(B.sugerir('atragantamento').some((s) => /atragantamiento/.test(s)));
});

test('rendimiento: 200 búsquedas en menos de 2 s', () => {
  const t0 = performance.now();
  for (let i = 0; i < 20; i++) for (const q of ['agua', 'sangra mucho', 'corte de luz', 'incendio forestal', 'hipotermia', 'radio', 'mochila', 'evacuar', 'infarto', 'no respira']) B.buscar(q);
  assert.ok(performance.now() - t0 < 2000);
});

/* ------------------------------ Datos ------------------------------ */
test('SOS: los cinco accesos sanitarios apuntan a artículos existentes', () => {
  assert.equal(SOS_SANITARIAS.length, 5);
  for (const s of SOS_SANITARIAS) assert.ok(ARTICULOS_MAP[s.art], `${s.id} → ${s.art}`);
  assert.equal(ARTICULOS_MAP['pa-infarto'].sec, 'primeros-auxilios');
  assert.equal(ARTICULOS_MAP['pa-ictus'].sec, 'primeros-auxilios');
});

test('SOS: infarto e ictus declaran que están pendientes de ampliar', () => {
  for (const id of ['pa-infarto', 'pa-ictus']) {
    assert.ok(ARTICULOS_MAP[id].body.some((b) => b.warn && /PENDIENTE DE AMPLIAR/.test(b.warn)), id);
  }
});

test('SOS: los grupos cubren escenarios reales y no se repiten', () => {
  const ids = new Set(EMERGENCIAS.map((e) => e.id));
  const vistos = new Set();
  for (const g of GRUPOS_EMERGENCIA) for (const id of g.ids) {
    assert.ok(ids.has(id), id);
    assert.ok(!vistos.has(id), 'repetido: ' + id);
    vistos.add(id);
  }
});

test('sinónimos: sin formas vacías ni repetidas entre grupos', () => {
  const visto = new Map();
  for (const g of SINONIMOS) for (const f of g.formas) {
    const n = normalizar(f).trim();
    assert.ok(n, g.id);
    assert.ok(!visto.has(n), `"${f}" está en ${visto.get(n)} y en ${g.id}`);
    visto.set(n, g.id);
  }
});

/* ------------------------------ Build ------------------------------ */
test('versión única: sw.js coincide con data/content/index.js', () => {
  const sw = fs.readFileSync(path.join(PUB, 'sw.js'), 'utf8');
  assert.equal(sw.match(/const VERSION = '([^']+)'/)[1], VERSION);
});

test('el manifiesto de precache incluye todos los recursos de la app', () => {
  const lista = new Set(JSON.parse(fs.readFileSync(path.join(PUB, 'precache-manifest.json'), 'utf8')));
  const EXT = /\.(html|css|js|json|geojson|webmanifest|png|svg|woff2?|txt)$/i;
  const faltan = [];
  const walk = (dir, base = '') => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const rel = base ? `${base}/${e.name}` : e.name;
      if (e.isDirectory()) walk(path.join(dir, e.name), rel);
      else if (EXT.test(e.name) && !['sw.js', 'precache-manifest.json'].includes(rel) && !lista.has('./' + rel)) faltan.push(rel);
    }
  };
  walk(PUB);
  assert.deepEqual(faltan, [], 'ejecuta npm run build:assets');
});

/* ------------------------- Infarto e ictus: contenido congelado -------------------------
   Estas fichas solo pueden contener frases que ya estaban en el manual. Si
   alguien añade o cambia texto, esta prueba falla a propósito: ampliarlas
   requiere revisión con fuentes clínicas y actualizar esta lista a la vez. */
const TEXTO_REVISADO = {
  'pa-infarto': [
    'Infarto: dolor torácico',
    'El dolor torácico requiere atención profesional inmediata: llama al 112.',
    'SOSPECHA DE INFARTO', 'Dolor torácico → atención profesional inmediata', 'Llama al 112',
    'Si no responde y no respira con normalidad → RCP y DEA', 'Qué hacer',
    'Llama al 112. No cuelgues hasta que te lo indiquen: pueden guiarte paso a paso.',
    'Al llamar di qué ha pasado y desde cuándo, dónde estáis (dirección exacta o coordenadas) y qué le ocurre (consciencia, respiración).',
    'Si deja de responder y no respira con normalidad: llama al 112 (manos libres), pide un desfibrilador e inicia RCP.',
  ],
  'pa-ictus': [
    'Ictus: reconocerlo y avisar',
    'Asimetría facial, debilidad en un brazo o dificultad para hablar. El tiempo es cerebro: 112 sin esperar.',
    'SOSPECHA DE ICTUS', 'Asimetría facial', 'Debilidad en un brazo', 'Dificultad para hablar', 'El tiempo es cerebro: 112 sin esperar', 'Qué hacer',
    'Llama al 112 sin esperar. No cuelgues hasta que te lo indiquen: pueden guiarte paso a paso.',
    'Al llamar di qué ha pasado y desde cuándo, dónde estáis (dirección exacta o coordenadas) y qué le ocurre (consciencia, respiración).',
    'Si deja de responder y no respira con normalidad: llama al 112 (manos libres), pide un desfibrilador e inicia RCP.',
  ],
};

test('infarto e ictus: marcadas como incompletas y sin texto nuevo sin revisar', () => {
  for (const [id, permitido] of Object.entries(TEXTO_REVISADO)) {
    const a = ARTICULOS_MAP[id];
    assert.equal(a.revision, 'pendiente', `${id} debe seguir marcada como pendiente de revisión`);
    const textos = [a.t, a.sum];
    for (const b of a.body) {
      if (b.warn) continue; // el aviso de ficha pendiente
      if (b.h) textos.push(b.h);
      if (b.p) textos.push(b.p);
      if (b.ul) textos.push(...b.ul);
      if (b.ol) textos.push(...b.ol);
      if (b.card) textos.push(b.card.t, ...b.card.lines);
      for (const k of ['kv', 'table', 'note', 'ok', 'tool', 'check']) assert.ok(!(k in b), `${id}: bloque «${k}» no revisado`);
    }
    const nuevos = textos.filter((t) => !permitido.includes(t));
    assert.deepEqual(nuevos, [], `${id} contiene texto no revisado`);
  }
});

/* ------------------------------ Mapas IGN ------------------------------ */
test('mapas IGN: plantillas WMTS bien formadas', async () => {
  // maps.js importa ui.js/store.js, que no dependen del DOM al cargarse.
  const { TILE_SOURCES, FUENTE_DEFECTO } = await imp('assets/js/maps.js');
  assert.ok(TILE_SOURCES[FUENTE_DEFECTO]);
  for (const [id, f] of Object.entries(TILE_SOURCES)) {
    const url = f.url.replace('{z}', 7).replace('{x}', 62).replace('{y}', 48);
    const u = new URL(url);
    assert.equal(u.origin, 'https://www.ign.es', id);
    assert.ok(!/[{}]/.test(url), `${id}: quedan marcadores sin sustituir`);
    for (const [k, v] of [['SERVICE', 'WMTS'], ['REQUEST', 'GetTile'], ['TILEMATRIXSET', 'GoogleMapsCompatible'], ['TILEMATRIX', '7'], ['TILEROW', '48'], ['TILECOL', '62']]) {
      assert.equal(u.searchParams.get(k), v, `${id}: ${k}`);
    }
    assert.ok(u.searchParams.get('LAYER'), `${id}: LAYER`);
    assert.ok(f.nativo <= f.max, `${id}: el zoom nativo no puede superar el máximo`);
    assert.match(f.attr, /Instituto Geográfico Nacional/, `${id}: atribución`);
  }
});

test('mapas IGN: la CSP permite las teselas del IGN y nada más de terceros para imágenes', () => {
  for (const f of ['netlify.toml', 'public/_headers']) {
    const txt = fs.readFileSync(path.join(ROOT, f), 'utf8');
    const img = txt.match(/img-src([^;]*);/)[1];
    const con = txt.match(/connect-src([^;]*);/)[1];
    assert.ok(img.includes('https://www.ign.es'), `${f}: img-src`);
    assert.ok(con.includes('https://www.ign.es'), `${f}: connect-src`);
    assert.ok(!/openstreetmap|opentopomap/.test(img + con), `${f}: restos de OSM`);
    // El audio offline se reproduce desde un blob: local. Sin media-src, la CSP
    // usa default-src 'self' y lo bloquea (fallo real detectado en la fase 5).
    const media = txt.match(/media-src([^;]*);/)?.[1] || '';
    // Desde la v1.17 la radio en directo suena desde las emisoras: solo HTTPS,
    // nunca HTTP (y el resto de recursos de terceros siguen bloqueados).
    assert.ok(/'self'/.test(media) && /blob:/.test(media) && /(^|\s)https:(\s|$)/.test(media) && !/http:/.test(media), `${f}: media-src debe ser 'self' blob: https:`);
  }
});

/* ------------------------------ Portada ------------------------------ */
test('portada: cada sección aparece una sola vez (directa o en un grupo) y lo de fuera sigue accesible', async () => {
  const { SECCIONES, PORTADA, GRUPOS, seccionesDePuerta } = await imp('data/content/index.js');
  const puertas = PORTADA.flatMap((b) => b.puertas);
  for (const p of puertas) if (p.startsWith('g:')) assert.ok(GRUPOS[p.slice(2)], `grupo inexistente: ${p}`);
  assert.deepEqual(Object.keys(GRUPOS).sort(), puertas.filter((p) => p.startsWith('g:')).map((p) => p.slice(2)).sort(), 'todo grupo está en la portada');
  const enPortada = puertas.flatMap(seccionesDePuerta);
  assert.equal(new Set(enPortada).size, enPortada.length, 'duplicadas');
  const ids = SECCIONES.map((s) => s.id);
  for (const id of enPortada) assert.ok(ids.includes(id), `sección inexistente: ${id}`);
  const fuera = ids.filter((id) => !enPortada.includes(id));
  assert.deepEqual(fuera.sort(), ['alex', 'config', 'emergencia', 'noticias', 'plan-familiar'], 'solo SOS, Noticias, Alex, Ajustes y Contactos quedan fuera');
  const html = fs.readFileSync(path.join(PUB, 'index.html'), 'utf8');
  for (const r of ['#/emergencia', '#/sec/noticias', '#/sec/alex', '#/sec/familia']) assert.ok(html.includes(`href="${r}"`), `barra inferior: ${r}`);
  const app = fs.readFileSync(path.join(PUB, 'assets/js/app.js'), 'utf8');
  assert.ok(app.includes('href="#/sec/config"'), 'Ajustes en la cabecera');
  const fam = fs.readFileSync(path.join(PUB, 'assets/js/familia.js'), 'utf8');
  assert.ok(fam.includes('#/sec/plan-familiar'), 'Familia debe enlazar a Contactos y acuerdos');
  // Ajustes: el tema antiguo «dark» pasa a automático.
  const st = fs.readFileSync(path.join(PUB, 'assets/js/store.js'), 'utf8');
  assert.match(st, /theme: 'auto'/);
});

test('copias: validarCopia acepta una copia correcta y rechaza las dañadas sin escribir', async () => {
  const { validarCopia } = await import('../public/assets/js/store.js');
  const buena = { app: 'survival-offline', version: 1, exportado: '2026-09-29T10:00:00Z', settings: { theme: 'dark' },
    stores: { contactos: [{ id: 'a', n: 'Ana', t: '600' }], puntos: [{ id: 'p', lat: 40.4, lon: -3.7 }], checks: [{ id: 'nivel2::Agua::0', estado: 'tengo' }], kv: [{ id: 'plan.medico', v: 'x' }] } };
  const v = validarCopia(buena);
  assert.equal(v.ok, true, v.errores.join());
  assert.deepEqual(v.resumen.stores, { contactos: 1, puntos: 1, checks: 1, kv: 1 });
  assert.equal(validarCopia(null).ok, false);
  assert.equal(validarCopia({ ...buena, app: 'otra' }).ok, false);
  assert.equal(validarCopia({ ...buena, version: 2 }).ok, false);
  assert.equal(validarCopia({ ...buena, stores: { ...buena.stores, contactos: 'x' } }).ok, false);
  assert.equal(validarCopia({ ...buena, stores: { ...buena.stores, puntos: [{ id: 'p', lat: 200, lon: 0 }] } }).ok, false);
  assert.equal(validarCopia({ ...buena, stores: { ...buena.stores, contactos: [{ id: 'a', n: 'A' }, { id: 'a', n: 'B' }] } }).ok, false);
  assert.equal(validarCopia({ ...buena, stores: { ...buena.stores, kv: [{ id: 'plan.x' }] } }).ok, false);
  assert.equal(validarCopia({ app: 'survival-offline', version: 1, stores: {} }).ok, false, 'vacía');
  const rara = validarCopia({ ...buena, stores: { ...buena.stores, futuro: [] } });
  assert.equal(rara.ok, true); assert.deepEqual(rara.resumen.ignorados, ['futuro']);
});

test('checklists: claves estables por texto, únicas y con migración desde las antiguas', async () => {
  const { CHECKLISTS } = await import('../public/data/content/checklists.js');
  const { clavesChecklist, mapaMigracion } = await import('../public/assets/js/checklist-claves.js');
  for (const c of CHECKLISTS) {
    const claves = clavesChecklist(c).flat();
    assert.equal(new Set(claves).size, claves.length, `claves repetidas en ${c.id}`);
    assert.ok(claves.every((k) => k.startsWith(c.id + '::i:') && k.split('::').length === 2), c.id);
    const m = mapaMigracion(c);
    assert.equal(m.size, claves.length);
    assert.equal(m.get(`${c.id}::${c.grupos[0].g}::0`), clavesChecklist(c)[0][0]);
  }
  // Reordenar ítems o moverlos de grupo no cambia la clave de cada texto.
  const c = CHECKLISTS[0];
  const antes = Object.fromEntries(c.grupos.flatMap((g, gi) => g.items.map((it, i) => [it, clavesChecklist(c)[gi][i]])));
  const movido = { ...c, grupos: [{ g: 'Nuevo', items: [...c.grupos[1].items].reverse() }, ...c.grupos.slice(2), c.grupos[0]] };
  movido.grupos.forEach((g, gi) => g.items.forEach((it, i) => assert.equal(clavesChecklist(movido)[gi][i], antes[it], it)));
});

test('cabeceras: public/_headers y netlify.toml dicen lo mismo (la previsualización local usa _headers)', () => {
  const toml = fs.readFileSync(new URL('../netlify.toml', import.meta.url), 'utf8');
  const headers = fs.readFileSync(new URL('../public/_headers', import.meta.url), 'utf8');
  const deToml = (k) => toml.match(new RegExp(`^\\s*${k} = "([^"]+)"`, 'm'))?.[1];
  const deHeaders = (k) => headers.match(new RegExp(`^\\s*${k}: (.+)$`, 'm'))?.[1].trim();
  for (const k of ['Content-Security-Policy', 'Permissions-Policy', 'X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy']) {
    assert.ok(deToml(k), `falta ${k} en netlify.toml`);
    assert.equal(deHeaders(k), deToml(k), `${k} distinta entre _headers y netlify.toml`);
  }
});

/* --------------------------------- Ajedrez --------------------------------- */
const AJ = await imp('assets/js/ajedrez.js');
const perft = (e, d) => (d === 0 ? 1 : AJ.jugadas(e).reduce((s, m) => s + perft(AJ.aplicar(e, m, true), d - 1), 0));
const juega = (e, de, a) => AJ.aplicar(e, AJ.jugadas(e).find((m) => AJ.nombre(m.de) === de && AJ.nombre(m.a) === a));

test('ajedrez: movimientos legales exactos (recuentos perft de referencia)', () => {
  // Posiciones estándar de verificación: enroques, al paso, promociones, clavadas y jaques.
  const casos = [
    [AJ.INICIAL, 3, 8902],
    ['r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', 3, 97862],
    ['8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', 4, 43238],
    ['r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', 3, 9467],
    ['rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', 3, 62379],
  ];
  for (const [fen, d, n] of casos) assert.equal(perft(AJ.desdeFEN(fen), d), n, fen);
  assert.equal(AJ.aFEN(AJ.desdeFEN(AJ.INICIAL)), AJ.INICIAL);
});

test('ajedrez: jaque mate, rey ahogado y tablas', () => {
  let e = AJ.desdeFEN(AJ.INICIAL);
  e = juega(juega(juega(juega(e, 'f2', 'f3'), 'e7', 'e5'), 'g2', 'g4'), 'd8', 'h4');
  assert.equal(AJ.estado(e), 'mate');
  assert.equal(AJ.estado(AJ.desdeFEN('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1')), 'ahogado');
  assert.equal(AJ.estado(AJ.desdeFEN('8/8/4k3/8/8/3K4/8/8 w - - 0 1')), 'material');
  assert.equal(AJ.estado(AJ.desdeFEN('8/8/4k3/8/8/3K4/8/7R w - - 100 80')), 'cincuenta');
  e = AJ.desdeFEN(AJ.INICIAL);
  for (let i = 0; i < 2; i++) e = juega(juega(juega(juega(e, 'g1', 'f3'), 'g8', 'f6'), 'f3', 'g1'), 'f6', 'g8');
  assert.equal(AJ.estado(e), 'repeticion');
  assert.equal(AJ.estado(AJ.desdeFEN('4k3/8/8/8/8/8/8/4K2r w - - 0 1')), 'jaque');
  assert.equal(AJ.describir(AJ.desdeFEN(AJ.INICIAL), { de: AJ.casilla('e2'), a: AJ.casilla('e4') }), 'peón e2 a e4');
});

test('ajedrez: el rival difícil da mate y gana material; el fácil juega legal', () => {
  const nm = (m) => AJ.nombre(m.de) + AJ.nombre(m.a);
  assert.equal(nm(AJ.mejorJugada(AJ.desdeFEN('6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1'), { ms: 3000 })), 'd1d8');
  assert.equal(nm(AJ.mejorJugada(AJ.desdeFEN('4k3/8/8/3q4/8/8/8/3RK3 w - - 0 1'), { ms: 3000 })), 'd1d5');
  const e = AJ.desdeFEN(AJ.INICIAL);
  const t = Date.now();
  const m = AJ.mejorJugada(e, { ms: 400 });
  assert.ok(Date.now() - t < 2000, 'respeta el límite de tiempo');
  assert.ok(AJ.jugadas(e).some((x) => x.de === m.de && x.a === m.a));
  let azar = 0;
  for (let i = 0; i < 20; i++) {
    const f = AJ.mejorJugada(e, { nivel: 'facil', azar: () => (azar = (azar + 0.37) % 1) });
    assert.ok(AJ.jugadas(e).some((x) => x.de === f.de && x.a === f.a));
  }
  assert.equal(AJ.mejorJugada(AJ.desdeFEN('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1')), null);
});

/* ---------------------------- Compra de colapso ---------------------------- */
test('compra de colapso: necesidades por persona y lista proporcional a los días', async () => {
  const { necesidades, calcularCompra } = await imp('assets/js/compra-calc.js');
  const { HOGAR_INICIAL, ALIMENTOS } = await imp('data/content/compra.js');
  assert.ok(Math.abs(ALIMENTOS.reduce((s, a) => s + a.parte, 0) - 1) < 1e-9, 'el reparto de energía suma 100 %');
  // Hombre, 25 años, 100 kg, actividad alta; mujer, 27 años, 60 kg, moderada.
  const [h, m] = HOGAR_INICIAL.map(necesidades);
  assert.deepEqual([h.kcal, h.prot, h.agua], [3450, 140, 5]);
  assert.deepEqual([m.kcal, m.prot, m.agua], [2100, 72, 3.6]);
  assert.equal(necesidades({ ...HOGAR_INICIAL[1], kcal: '1900' }).kcal, 1900, 'kcal indicadas a mano');
  assert.equal(necesidades({ sexo: 'h', peso: '', edad: '' }).kcal > 0, true, 'campos vacíos no rompen el cálculo');
  const r3 = calcularCompra(HOGAR_INICIAL, 3), r7 = calcularCompra(HOGAR_INICIAL, 7);
  for (const r of [r3, r7]) {
    assert.ok(r.cubreKcal && r.cubreProt, `cubre energía y proteína (${r.dias} días)`);
    assert.ok(r.alimentos.every((a) => Number.isInteger(a.n) && a.n >= 1));
    assert.ok(r.aguaL >= r.aguaDia * r.dias && r.garrafas * 5 >= r.aguaL);
  }
  assert.equal(r7.aguaL, 67);
  assert.ok(r7.alimentos.find((a) => a.id === 'platos').n > r3.alimentos.find((a) => a.id === 'platos').n);
  const tiene = (r, id) => r.grupos.some((g) => g.items.some((it) => it.id === id));
  assert.ok(tiene(r7, 'menstrual'), 'hay una mujer en edad fértil');
  assert.ok(!tiene(calcularCompra([HOGAR_INICIAL[0]], 7), 'menstrual'));
});

test('compra de colapso: PDF válido, con acentos y sin caracteres imposibles', async () => {
  const { pdfCompra, limpiar } = await imp('assets/js/compra-pdf.js');
  const { calcularCompra } = await imp('assets/js/compra-calc.js');
  const { HOGAR_INICIAL, AVISOS_COMPRA } = await imp('data/content/compra.js');
  assert.equal(limpiar('💧 Agua ≈ 5 l · ñ «sí»'), 'Agua ~ 5 l · ñ «sí»');
  const r = calcularCompra(HOGAR_INICIAL, 7);
  const grupos = [{ t: '1 · Agua', items: [{ id: 'agua', t: 'Agua embotellada', c: '67 l', nota: '≈ 14 garrafas' }] },
    { t: '2 · Comida', items: r.alimentos.map((a) => ({ id: a.id, t: a.t, c: `${a.n} × ${a.u}` })) }];
  // Medida aproximada (en el navegador se mide con la fuente real).
  const medir = (t, negrita, tam) => t.length * tam * (negrita ? 0.56 : 0.5);
  const bytes = pdfCompra(r, { titulo: 'Compra de colapso', duracion: '1 semana', personas: ['Ana (prueba)', 'Persona 2'], marcadas: { agua: 1 },
    grupos, avisos: AVISOS_COMPRA, cierre: 'Fin', version: '9.9.9', fecha: '01/01/2030', medir });
  const pdf = Buffer.from(bytes).toString('latin1');
  assert.ok(pdf.startsWith('%PDF-1.4') && pdf.trimEnd().endsWith('%%EOF'));
  // La tabla xref apunta exactamente al inicio de cada objeto.
  const xref = Number(pdf.match(/startxref\n(\d+)/)[1]);
  assert.ok(pdf.startsWith('xref', xref));
  const offs = [...pdf.slice(xref).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
  offs.forEach((o, i) => assert.ok(pdf.startsWith(`${i + 1} 0 obj`, o), `objeto ${i + 1}`));
  for (const m of pdf.matchAll(/<< \/Length (\d+) >>\nstream\n/g)) assert.equal(pdf.indexOf('\nendstream', m.index + m[0].length), m.index + m[0].length + Number(m[1]));
  assert.ok(/\/Count [1-9]/.test(pdf) && /\/Encoding \/WinAnsiEncoding/.test(pdf));
  assert.ok(pdf.includes('prote\\355na'), 'la í va codificada en WinAnsi');
  assert.ok(pdf.includes('ANA \\(PRUEBA\\)'), 'paréntesis escapados');
  assert.ok(!/[^\x00-\xff]/.test(pdf));
});

/* ---------------------------- Plan de evacuación ---------------------------- */
test('evacuación: escenarios y corredores coherentes, trazados generados desde Ávila', async () => {
  const { ESCENARIOS, CORREDORES, CLASES, CENTRALES, RESPUESTAS } = await imp('data/content/evacuacion.js');
  const ids = new Set(CORREDORES.map((c) => c.id));
  assert.equal(ids.size, CORREDORES.length, 'ids únicos');
  assert.deepEqual(ESCENARIOS.filter((e) => e.prioridad === 1).map((e) => e.id), ['colapso', 'guerra']);
  for (const e of ESCENARIOS) {
    for (const id of [...e.corredores, ...e.evitar]) assert.ok(ids.has(id), `${e.id}: corredor ${id}`);
    assert.ok(!e.corredores.some((id) => e.evitar.includes(id)), `${e.id}: recomienda y evita a la vez`);
    assert.equal(e.fases.length, 4, `${e.id}: fases de 72 h a meses`);
    assert.ok(e.respuesta.every((r) => RESPUESTAS[r]));
  }
  for (const c of CORREDORES) assert.ok(CLASES[c.clase] && c.pasos[0] === '05019' && c.via && c.destino, c.id);
  // Salidas a todos los destinos pedidos.
  for (const k of ['interior', 'portugal', 'francia', 'andorra', 'mar']) assert.ok(CORREDORES.some((c) => c.clase === k), k);

  const geo = JSON.parse(fs.readFileSync(path.join(PUB, 'data/geo/evac-rutas.geojson'), 'utf8'));
  const lineas = Object.fromEntries(geo.features.filter((f) => f.properties.tipo === 'corredor').map((f) => [f.properties.id, f]));
  assert.deepEqual(Object.keys(lineas).sort(), [...ids].sort(), 'un trazado por corredor (ejecuta npm run build:geo)');
  for (const [id, f] of Object.entries(lineas)) {
    const c = CORREDORES.find((x) => x.id === id);
    const [lon, lat] = f.geometry.coordinates[0];
    assert.ok(Math.abs(lat - 40.66) < 0.1 && Math.abs(lon + 4.67) < 0.1, `${id} sale de Ávila`);
    assert.equal(f.geometry.coordinates.length, c.pasos.length);
    assert.ok(f.properties.pasos.every(Boolean), `${id}: localidades con nombre`);
    // Si pasa a menos de 60 km de una central nuclear, el texto lo avisa.
    const cerca = CENTRALES.filter((x) => f.properties.nucleares[x.id] <= 60);
    if (cerca.length) assert.ok(c.contras.some((t) => /nuclear/i.test(t)), `${id} pasa cerca de ${cerca.map((x) => x.id)} y no lo avisa`);
  }
  const km = (id) => lineas[id].properties.km;
  assert.ok(km('int-gredos') < km('pt-vilar') && km('pt-vilar') < km('fr-irun') && km('fr-irun') < km('fr-jonquera'));
  assert.ok(km('pt-vilar') >= 180 && km('pt-vilar') <= 300, `Ávila–Fuentes de Oñoro ≈ ${km('pt-vilar')} km`);
});

test('revisión: repetición sin captura al paso posible, edad vacía y medidas de Helvetica', async () => {
  // 1.e4 deja la casilla e3 de captura al paso, pero ningún peón negro puede
  // usarla: la posición tras 1.e4 debe contar igual las tres veces.
  let e = AJ.desdeFEN(AJ.INICIAL);
  e = juega(e, 'e2', 'e4');
  for (let i = 0; i < 2; i++) e = juega(juega(juega(juega(e, 'g8', 'f6'), 'g1', 'f3'), 'f6', 'g8'), 'f3', 'g1');
  assert.equal(AJ.estado(e), 'repeticion');
  const { calcularCompra } = await imp('assets/js/compra-calc.js');
  const r = calcularCompra([{ sexo: 'm', edad: '', peso: 60, actividad: 'moderada' }], 3);
  assert.ok(r.grupos.some((g) => g.items.some((it) => it.id === 'menstrual')), 'edad vacía = 30 años, como en el cálculo de energía');
  const { medirHelvetica } = await imp('assets/js/compra-pdf.js');
  assert.equal(medirHelvetica('Hola', false, 10), 20.56);    // H 722 + o 556 + l 222 + a 556
  assert.equal(medirHelvetica('ñ', true, 1000), 611);
});

/* ------------------------------ Entrenamiento ------------------------------ */
test('entrenamiento: niveles, planes de 2 a 5 días, semanas y progreso', async () => {
  const { prescripcion, plan, semanaISO, resumen } = await imp('assets/js/entrenamiento-calc.js');
  const { PATRONES, SESIONES, PLANES, NIVELES } = await imp('data/content/entrenamiento.js');
  assert.equal(NIVELES.length, 5);
  for (const [id, p] of Object.entries(PATRONES)) assert.equal(p.escalera.length, 5, id);
  for (const s of Object.values(SESIONES)) for (const [pt] of s.ejercicios) assert.ok(PATRONES[pt], pt);
  assert.deepEqual(Object.keys(PLANES), ['2', '3', '4', '5']);
  for (const d of [2, 3, 4, 5]) assert.equal(plan(d, 3).length, d);
  // El nivel sube el ejercicio y la dosis.
  assert.equal(prescripcion(1, 'empuje').t, 'Flexiones en la pared');
  assert.equal(prescripcion(5, 'empuje').t, 'Flexiones con pies elevados');
  assert.equal(prescripcion(1, 'empuje', -1).t, 'Flexiones en la pared', 'sin peldaño negativo');
  assert.equal(prescripcion(5, 'core').objetivo, '50 s');
  assert.ok(prescripcion(5, 'piernas').series > prescripcion(1, 'piernas').series);
  assert.match(prescripcion(3, 'tiron', 0, true).t, /mochila/, 'variante con material');
  // Semanas ISO: el lunes empieza semana.
  assert.equal(semanaISO(new Date(2026, 9, 25)), '2026-W43');   // domingo
  assert.equal(semanaISO(new Date(2026, 9, 26)), '2026-W44');   // lunes
  assert.equal(semanaISO(new Date(2027, 0, 1)), '2026-W53');
  const hoy = new Date(2026, 9, 28, 12);   // miércoles
  const ses = (dias, idx, extra = {}) => ({ fecha: new Date(hoy.getTime() - dias * 864e5).toISOString(), idx, dias: 3, nivel: 2, hechas: 9, total: 9, rpe: 5, ...extra });
  const h = [ses(0, 0), ses(1, 1), ses(7, 0), ses(8, 1), ses(9, 2), ses(14, 0), ses(15, 1), ses(16, 2)];
  const r = resumen(h, { nivel: 2, dias: 3 }, hoy);
  assert.equal(r.hechas, 2); assert.equal(r.objetivo, 3); assert.equal(r.siguiente, 2);
  assert.equal(r.racha, 2, 'dos semanas anteriores cumplidas; la actual aún en curso');
  assert.equal(r.sugerencia, 'subir', 'tres sesiones completas y fáciles');
  assert.equal(resumen([ses(0, 0, { rpe: 10, hechas: 3 }), ses(1, 1, { rpe: 10, hechas: 3 })], { nivel: 2, dias: 3 }, hoy).sugerencia, 'bajar');
  assert.equal(resumen([], { nivel: 1, dias: 2 }, hoy).siguiente, 0);
});

/* ----------------------------- Pregúntale a Alex ----------------------------- */
test('Alex: urgencias al 112, crisis al 024, escenarios, buscador y fuera de tema', async () => {
  const { crearAlex, coincide } = await imp('assets/js/alex-motor.js');
  const { INTENCIONES } = await imp('data/content/alex.js');
  // Cada intención apunta a contenido que existe.
  for (const i of INTENCIONES) if (!['sos-lista', 'sin-contenido'].includes(i.destino.tipo)) assert.ok(INDICE.some((it) => it.tipo === i.destino.tipo && it.id === i.destino.id), `${i.id} → ${i.destino.tipo}:${i.destino.id}`);
  // Palabra completa salvo raíz con «*».
  assert.ok(coincide(' hay una dana en valencia ', 'dana') && !coincide(' no quiero danar a nadie ', 'dana'));
  assert.ok(coincide(' se ha atragantado ', 'atragant*'));
  const A = crearAlex();
  const r = (q) => A.responder(q);
  const urg = (q, titulo) => { const x = r(q); assert.equal(x.urgente, true, q); assert.equal(x.titulo, titulo, q); assert.ok(x.pasos.length >= 3, q); };
  urg('mi padre no respira', 'Parada cardíaca');
  urg('Alguien SANGRA MUCHO', 'Hemorragia grave');
  urg('me duele el pecho', 'Infarto');
  urg('tiene la boca torcida', 'Ictus');
  urg('se ha atragantado con un caramelo', 'Atragantamiento');
  assert.equal(r('me duele el pecho').pendiente, true, 'la ficha pendiente de revisión lo avisa');
  assert.equal(r('no quiero vivir').tipo, 'crisis');
  assert.equal(r('se ha ido la luz y tengo un bebé').titulo, 'Apagón eléctrico');
  assert.equal(r('qué hago si hay una guerra').titulo, 'Conflicto armado');
  assert.ok(r('qué hago si hay una guerra').relacionados.some((x) => x.ruta === '#/sec/evacuacion'));
  assert.equal(r('qué compro si hay colapso').titulo, 'Compra de colapso');
  assert.equal(r('¿Qué meto en la mochila?').titulo, 'Mochila de evacuación (BOB · 72 h)');
  assert.equal(r('cómo potabilizo agua').titulo, 'Potabilizar agua: hervir, cloro y filtros');
  assert.equal(r('cómo orientarme sin brújula').titulo, 'Orientarse sin brújula');
  assert.equal(r('receta de paella').tipo, 'fuera');
  // Salud: nunca dosis ni diagnósticos; lo que la app no cubre, lo dice.
  for (const q of ['cuánto ibuprofeno tomo', 'tengo fiebre qué tomo', 'qué hago con la diabetes en una emergencia']) {
    const x = r(q); assert.equal(x.titulo, 'Botiquín: qué llevar de verdad', q); assert.match(x.intro, /médico/, q);
  }
  assert.equal(r('quiero sembrar patatas para cosecharlas').titulo, 'Patatas paso a paso');
  assert.equal(r('cómo planto un huerto').titulo, 'Empezar un huerto de supervivencia');
  assert.equal(r('no funciona el váter').titulo, 'Váter de emergencia y saneamiento');
  assert.equal(r('hace mucho frío en casa y no hay calefacción').titulo, 'Mantener el calor sin calefacción');
  assert.equal(r('cómo cargo el móvil sin luz').titulo, 'Luz, baterías y móvil sin electricidad');
  assert.equal(r('hay un bombardeo').urgente, true);
  assert.equal(r('hay un bombardeo').titulo, 'Refugiarse en casa ante un ataque o una explosión');
  assert.equal(r('qué hago ahora').titulo, 'Las primeras horas: qué hacer ya');
  // Bricolaje y defensa: lo urgente lleva al 112; violencia de género, al 016.
  const gas = r('huele a gas en la cocina'); assert.equal(gas.urgente, true); assert.equal(gas.titulo, 'Cortar el agua, la luz y el gas de tu casa');
  assert.equal(r('me están atacando').urgente, true);
  assert.equal(r('hay un intruso en casa').titulo, 'Proteger tu casa y qué hacer si entra alguien');
  const vg = r('mi pareja me pega'); assert.equal(vg.urgente, true); assert.match(vg.intro, /016/);
  assert.equal(r('mi hijo se ha perdido').titulo, 'Persona perdida');
  assert.equal(r('tengo una fuga de agua').titulo, 'Fugas de agua y tuberías: arreglos provisionales');
  assert.equal(r('puedo conectar el generador').titulo, 'Electricidad segura en una emergencia');
  assert.equal(r('es legal defenderme').titulo, 'Legítima defensa: lo que dice la ley en España');
  assert.equal(r('un tío agresivo en el bar').titulo, 'Calmar una situación tensa (desescalada)');
  assert.equal(r('cuántas patatas compro').titulo, 'Compra de colapso');
  assert.equal(r('plantas comestibles').titulo, 'Alimento silvestre: criterio y precauciones');
  assert.equal(r('hola').tipo, 'saludo');
  assert.equal(r('gracias').tipo, 'gracias');
  assert.equal(r('').tipo, 'saludo');
});

test('contenido nuevo: huerto y en casa, con fuentes, listas y secciones válidas', async () => {
  const { ARTICULOS, SECCIONES, SOURCE_MAP, CHECKLISTS, articulosDeSeccion } = await imp('data/content/index.js');
  assert.ok(articulosDeSeccion('huerto').length >= 6 && articulosDeSeccion('en-casa').length >= 10);
  assert.ok(articulosDeSeccion('bricolaje').length >= 9 && articulosDeSeccion('defensa').length >= 8);
  const ids = new Set(), secs = new Set(SECCIONES.map((x) => x.id)), checks = new Set(CHECKLISTS.map((c) => c.id));
  for (const a of ARTICULOS) {
    assert.ok(!ids.has(a.id), `artículo repetido: ${a.id}`); ids.add(a.id);
    assert.ok(secs.has(a.sec), `${a.id}: sección ${a.sec}`);
    for (const s of a.src || []) assert.ok(SOURCE_MAP[s], `${a.id}: fuente ${s}`);
    for (const b of a.body) if (b.check) assert.ok(checks.has(b.check), `${a.id}: checklist ${b.check}`);
  }
  // Lo peligroso se avisa.
  const texto = (id) => JSON.stringify(ARTICULOS.find((a) => a.id === id).body);
  assert.match(texto('casa-frio'), /monóxido/);
  assert.match(texto('huerto-conservar'), /botulismo/);
  assert.match(texto('huerto-patatas'), /solanina/);
  assert.match(texto('huerto-brotes'), /Salmonella/);
  assert.match(texto('bric-electricidad'), /Nunca conectes un generador/);
  assert.match(texto('bric-filtro'), /no elimina bacterias/);
  assert.match(texto('def-legal'), /20\.4/);
  assert.match(texto('def-familia'), /016/);
  assert.doesNotMatch(JSON.stringify(ARTICULOS.filter((a) => a.sec === 'defensa')), /spray|navaja (para|de) defensa|cómo apuñalar/i, 'no se recomiendan armas');
});

/* ------------------------- Noticias de última hora ------------------------- */
test('noticias: lee RSS y Atom, filtra por temas, prioriza lo oficial y aguanta fuentes caídas', async () => {
  const N = await import('../netlify/functions/noticias/core.mjs');
  const { EMERGENCIAS_MAP } = await imp('data/content/index.js');
  const ahora = new Date('2026-11-02T12:00:00Z');
  const hace = (h) => new Date(ahora - h * 3600e3).toUTCString();
  const rss = `<?xml version="1.0"?><rss><channel><title>Medio</title>
    <item><title><![CDATA[Apagón en media Europa: millones de personas sin luz]]></title><link>https://medio.es/a</link><pubDate>${hace(1)}</pubDate></item>
    <item><title>El Madrid gana la Liga con un gol de penalti &amp; fiesta</title><link>https://medio.es/b</link><pubDate>${hace(1)}</pubDate></item>
    <item><title>Rusia lanza un ataque con misiles sobre Kiev</title><link>https://medio.es/c</link><pubDate>${hace(2)}</pubDate></item>
    <item><title>Rusia lanza un ataque con misiles sobre Kiev</title><link>https://medio.es/c2</link><pubDate>${hace(2)}</pubDate></item>
    <item><title>Inundaciones por la DANA en Valencia</title><link>https://medio.es/d</link><pubDate>${hace(60)}</pubDate></item>
    <item><title>Receta de croquetas de la abuela</title><link>https://medio.es/e</link><pubDate>${hace(1)}</pubDate></item>
  </channel></rss>`;
  const atom = `<feed><entry><title>M 7.1 - 20 km SW of Tokyo, Japan</title><link rel="alternate" href="https://usgs.gov/x"/><updated>${new Date(ahora - 3 * 3600e3).toISOString()}</updated></entry></feed>`;
  const aemet = `<rss><channel>
    <item><title>Aviso naranja por lluvias. Ávila</title><link>https://aemet.es/1</link><pubDate>${hace(1)}</pubDate></item>
    <item><title>Aviso amarillo por viento. Soria</title><link>https://aemet.es/2</link><pubDate>${hace(1)}</pubDate></item>
  </channel></rss>`;
  assert.equal(N.leerCanal(rss).length, 6);
  assert.equal(N.leerCanal(rss)[1].titulo, 'El Madrid gana la Liga con un gol de penalti & fiesta');
  assert.equal(N.leerCanal(atom)[0].url, 'https://usgs.gov/x');
  assert.equal(N.clasificar('Rusia lanza un ataque con misiles sobre Kiev').id, 'guerra-europa');
  assert.equal(N.clasificar('El Madrid gana la Liga con un gol'), null, 'deportes fuera');
  assert.equal(N.clasificar('Receta de croquetas'), null);
  // Titulares reales del 2/11/2026 que se colaban por frases hechas o política.
  const medio = { oficial: false };
  for (const t of ['Tormenta perfecta en la Facultad de Derecho de la Complutense: los recortes cierran la editorial',
    'Juan Manuel Santos, un hombre de paz en tiempos de guerra',
    'Zamora se pone en pie de guerra por la construcción de un macrocentro de datos',
    'Buxadé responsabiliza al PSOE de la situación ferroviaria y pide dejar atrás "la España de la catástrofe"',
    'De Cos, equilibrio y consenso para tiempos volcánicos',
    'La guerra comercial entre EE UU y China dispara los aranceles']) assert.equal(N.clasificar(t, medio), null, t);
  // Y lo que sí debe seguir entrando.
  assert.equal(N.clasificar('Hezbolá se prepara para un posible regreso de la guerra con Israel', medio).id, 'guerra-global');
  assert.equal(N.clasificar('Un nuevo ciberataque causa pérdidas millonarias en decenas de supermercados', medio).id, 'infra');
  assert.equal(N.clasificar('Protección Civil activa el plan de emergencias por la DANA', medio).id, 'inundacion');
  assert.equal(N.clasificar('Declarado el estado de emergencia en Florida', medio).id, 'emergencia');
  // Prioridades: guerra en Europa, colapso, infraestructuras y meteorología.
  const casos = {
    'La OTAN eleva la alerta ante la escalada militar rusa en el Báltico': 'guerra-europa',
    'Alemania recupera el servicio militar obligatorio ante la amenaza rusa': 'guerra-europa',
    'Corralito en Bolivia: los bancos limitan la retirada de efectivo': 'colapso',
    'Huelga general paraliza Francia': 'colapso',
    'La Bolsa española vive un crash del 8%': 'colapso',
    'Apagón en Chile deja sin luz a millones': 'infra',
    'Aviso rojo por lluvias torrenciales en Valencia': 'meteo',
    'Irán lanza misiles contra Israel y amenaza con cerrar el estrecho de Ormuz': 'guerra-global',
    'China despliega tropas frente a Taiwán': 'guerra-global',
    'Los hutíes atacan buques en el mar Rojo': 'guerra-global',
    'Ataque con drones en Sudán deja decenas de muertos': 'guerra',
  };
  for (const [t, id] of Object.entries(casos)) assert.equal(N.clasificar(t, medio)?.id, id, t);
  for (const t of ['El Real Madrid al ataque del liderato', 'Sánchez sufre un ataque de nervios', 'Ataque al corazón: síntomas',
    'Incendio en una vivienda de Vallecas', 'El precio de la luz sube']) assert.equal(N.clasificar(t, medio), null, t);
  // En los medios, lo leve y antiguo no entra (umbral de relevancia); lo oficial, sí.
  const viejo = new Date(ahora - 40 * 3600e3).toISOString();
  const umbral = N.seleccionar([
    { fuente: { id: 'm', t: 'M', ambito: 'espana' }, items: [{ titulo: 'Protección Civil pide precaución', url: 'https://m.es/1', fecha: viejo }] },
    { fuente: { id: 'o', t: 'O', ambito: 'espana', oficial: true }, items: [{ titulo: 'Protección Civil pide precaución por el temporal', url: 'https://o.es/1', fecha: viejo }] }], ahora);
  assert.deepEqual(umbral.map((x) => x.url), ['https://o.es/1']);
  // Las rutas a secciones existen.
  const { SECCIONES } = await imp('data/content/index.js');
  for (const t of N.TEMAS) { const m = t.ruta.match(/^#\/sec\/(.+)$/); if (m) assert.ok(SECCIONES.some((x) => x.id === m[1]), t.ruta); }
  const sec = N.seleccionar([{ fuente: { id: 'm', t: 'M', ambito: 'espana' }, items: [
    { titulo: 'Rusia ataca con misiles Kiev', url: 'https://elpais.com/eps/2026-11-01/reportaje.html', fecha: ahora.toISOString() },
    { titulo: 'Rusia ataca con misiles Kiev de nuevo', url: 'https://elpais.com/internacional/2026-11-01/x.html', fecha: ahora.toISOString() }] }], ahora);
  assert.deepEqual(sec.map((x) => x.url), ['https://elpais.com/internacional/2026-11-01/x.html'], 'fuera las secciones de reportajes y opinión');
  const F = (id, extra = {}) => ({ id, t: id, url: `https://${id}.test/rss`, ambito: 'espana', ...extra });
  const fuentes = [F('medio'), F('usgs', { ambito: 'internacional', oficial: true, todo: true, tema: 'terremoto' }), F('aemet', { oficial: true, todo: true, filtro: /naranja|rojo/i, tema: 'meteo' }), F('caida')];
  const canales = { medio: rss, usgs: atom, aemet };
  const fetchFalso = async (url) => {
    const id = new URL(url).hostname.split('.')[0];
    if (!canales[id]) return { ok: false, status: 503 };
    return { ok: true, status: 200, text: async () => canales[id] };
  };
  const d = await N.recopilar(fetchFalso, ahora, fuentes);
  const titulos = d.noticias.map((x) => x.t);
  assert.ok(titulos.includes('Apagón en media Europa: millones de personas sin luz'));
  assert.ok(titulos.includes('M 7.1 - 20 km SW of Tokyo, Japan') && titulos.includes('Aviso naranja por lluvias. Ávila'));
  assert.ok(!titulos.some((t) => /Liga|croquetas|amarillo/.test(t)), 'fuera deportes, recetas y avisos menores');
  assert.ok(!titulos.includes('Inundaciones por la DANA en Valencia'), 'fuera lo de hace más de 48 h');
  assert.equal(titulos.filter((t) => /Kiev/.test(t)).length, 1, 'sin duplicados');
  assert.equal(d.noticias[0].oficial || d.noticias[0].tema === 'guerra-europa' || d.noticias[0].tema === 'infra', true);
  assert.deepEqual(d.fuentes.find((f) => f.id === 'caida'), { id: 'caida', t: 'caida', ok: false, error: 'HTTP 503' });
  // Cada tema enlaza con una ficha que existe.
  for (const t of N.TEMAS) {
    const m = t.ruta.match(/^#\/emergencia\/(.+)$/);
    if (m) assert.ok(EMERGENCIAS_MAP[m[1]], `${t.id} → ${t.ruta}`);
  }
  // Las noticias nunca se cachean en el SW y la ruta llega a la función.
  assert.match(fs.readFileSync(path.join(PUB, 'sw.js'), 'utf8'), /pathname\.startsWith\('\/api\/'\)\) return;/);
  const red = fs.readFileSync(path.join(PUB, '_redirects'), 'utf8');
  assert.ok(red.indexOf('/api/noticias') < red.indexOf('/*    /index.html'), '_redirects: la API antes que la SPA');
  const toml = fs.readFileSync(path.join(ROOT, 'netlify.toml'), 'utf8');
  assert.ok(toml.indexOf('from = "/api/noticias"') < toml.indexOf('from = "/*"'), 'netlify.toml: la API antes que la SPA');
});

test('avisos push: solo lo muy grave, sin repetir, máximo diario y suscripciones válidas', async () => {
  const A = await import('../netlify/functions/avisos/criterio.mjs');
  const n = (t, extra = {}) => ({ t, fuente: 'M', fuenteId: 'm', ambito: 'internacional', ic: '⚔️', temaT: 'Guerra en Europa', fecha: '2026-11-02T11:00:00Z', ...extra });
  // Avisa
  for (const x of [n('La OTAN invoca el artículo 5 tras un ataque ruso a Polonia'), n('Rusia amenaza y ordena la movilización general'),
    n('Alerta por tsunami en el Mediterráneo'), n('El Gobierno decreta el estado de alarma en toda España', { ambito: 'espana' }),
    n('Gran apagón en la península: millones sin luz', { ambito: 'espana' }), n('Aviso rojo por lluvias. Valencia', { fuenteId: 'aemet' }),
    n('Red alert for tropical cyclone X', { fuenteId: 'gdacs' }), n('M 5.4 - 30 km S of Almería, Spain', { fuenteId: 'usgs' })]) assert.ok(A.esCritica(x), x.t);
  // No avisa
  for (const x of [n('Rusia lanza un ataque con misiles sobre Kiev'), n('Aviso naranja por viento. Ávila', { fuenteId: 'aemet' }),
    n('Orange alert for flood in India', { fuenteId: 'gdacs' }), n('M 6.1 - Tonga', { fuenteId: 'usgs' }),
    n('Toque de queda en Nairobi tras las protestas'), n('El precio de la luz sube')]) assert.ok(!A.esCritica(x), x.t);
  // Sin repetir, solo recientes y máximo 4 al día
  const ahora = new Date('2026-11-02T12:00:00Z');
  const graves = ['artículo 5', 'movilización general', 'tsunami', 'alerta nuclear', 'ataque nuclear', 'guerra mundial'].map((p) => n(`Última hora: ${p} en Europa`));
  assert.equal(A.avisosPendientes(graves, {}, ahora).length, A.MAX_AVISOS_DIA);
  const ya = { [A.claveAviso(graves[0])]: '2026-11-02T10:00:00Z', [A.claveAviso(graves[1])]: '2026-11-02T09:00:00Z' };
  const p = A.avisosPendientes(graves, ya, ahora);
  assert.equal(p.length, 2);
  assert.ok(!p.includes(graves[0]) && !p.includes(graves[1]));
  assert.equal(A.avisosPendientes([n('Alerta nuclear en Europa', { fecha: '2026-11-01T12:00:00Z' })], {}, ahora).length, 0, 'lo viejo no avisa');
  const c = A.cargaAviso(graves[0]);
  assert.equal(c.url, '/#/sec/noticias');
  assert.ok(c.title.length <= 60 && c.body.length <= 200);
  // Suscripciones
  const keys = { p256dh: 'B'.repeat(87), auth: 'a'.repeat(22) };
  assert.ok(A.suscripcionValida({ endpoint: 'https://fcm.googleapis.com/fcm/send/abc', keys }));
  assert.ok(A.suscripcionValida({ endpoint: 'https://web.push.apple.com/QX', keys }));
  assert.ok(A.suscripcionValida({ endpoint: 'https://updates.push.services.mozilla.com/wpush/v2/x', keys }));
  for (const e of ['https://evil.test/x', 'http://fcm.googleapis.com/x', 'https://fcm.googleapis.com.evil.test/x']) assert.ok(!A.suscripcionValida({ endpoint: e, keys }), e);
  assert.ok(!A.suscripcionValida({ endpoint: 'https://fcm.googleapis.com/x' }));
  // Cableado: redirecciones antes de la SPA y SW con push + notificationclick
  const red = fs.readFileSync(path.join(PUB, '_redirects'), 'utf8');
  assert.ok(red.indexOf('/api/push') > -1 && red.indexOf('/api/push') < red.indexOf('/*    /index.html'));
  const toml = fs.readFileSync(path.join(ROOT, 'netlify.toml'), 'utf8');
  assert.ok(toml.indexOf('from = "/api/push"') < toml.indexOf('from = "/*"'));
  const sw = fs.readFileSync(path.join(PUB, 'sw.js'), 'utf8');
  assert.match(sw, /addEventListener\('push'/);
  assert.match(sw, /addEventListener\('notificationclick'/);
  const fn = fs.readFileSync(path.join(ROOT, 'netlify/functions/avisos/avisos.mjs'), 'utf8');
  assert.match(fn, /schedule: '\*\/30 \* \* \* \*'/);
  // Cliente: clave VAPID base64url → bytes
  const { claveABytes } = await imp('assets/js/avisos.js');
  assert.deepEqual([...claveABytes('AQID_-8')], [1, 2, 3, 255, 239]);
});

test('juegos nuevos: damas españolas, sudoku de solución única y Morse', async () => {
  const D = await imp('assets/js/damas.js');
  const vacio = () => Array(64).fill(null);
  const i = (f, c) => f * 8 + c;
  // Salida: 7 jugadas de las blancas, ninguna captura.
  assert.equal(D.jugadas(D.inicial(), 'w').length, 7);
  // Captura obligatoria: con una captura posible, solo vale esa.
  let t = vacio(); t[i(5, 2)] = 'w'; t[i(4, 3)] = 'b'; t[i(6, 7)] = 'w';
  let js = D.jugadas(t, 'w');
  assert.equal(js.length, 1); assert.deepEqual(js[0].caps, [i(4, 3)]); assert.equal(js[0].a, i(3, 4));
  // El peón no captura hacia atrás.
  t = vacio(); t[i(3, 3)] = 'w'; t[i(4, 4)] = 'b';
  assert.ok(D.jugadas(t, 'w').every((m) => !m.caps.length));
  // Captura máxima: se elige la cadena de 2 frente a la de 1.
  t = vacio(); t[i(7, 0)] = 'w'; t[i(6, 1)] = 'b'; t[i(4, 3)] = 'b'; t[i(7, 6)] = 'w'; t[i(6, 5)] = 'b';
  js = D.jugadas(t, 'w');
  assert.ok(js.length && js.every((m) => m.caps.length === 2), JSON.stringify(js));
  // La dama vuela y captura a distancia; las capturadas no se saltan dos veces.
  t = vacio(); t[i(7, 0)] = 'W'; t[i(3, 4)] = 'b';
  js = D.jugadas(t, 'w');
  assert.ok(js.some((m) => m.caps[0] === i(3, 4) && m.a === i(2, 5)) && js.some((m) => m.a === i(0, 7)));
  // Coronación al terminar en la última fila.
  t = vacio(); t[i(1, 2)] = 'w';
  assert.equal(D.aplicar(t, D.jugadas(t, 'w')[0])[D.jugadas(t, 'w')[0].a], 'W');
  // La IA devuelve siempre una jugada legal.
  const ia = D.jugadaIA(D.inicial(), 'normal', () => 0.3);
  assert.ok(D.jugadas(D.inicial(), 'b').some((m) => m.de === ia.de && m.a === ia.a));

  const S = await imp('assets/js/sudoku.js');
  let semilla = 7; const azar = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647);
  for (const nivel of Object.keys(S.NIVELES)) {
    const g = S.generar(nivel, azar);
    assert.equal(S.soluciones(g.puzle, 2), 1, `${nivel}: solución única`);
    assert.ok(g.puzle.every((v, k) => !v || v === g.solucion[k]));
    assert.ok(g.puzle.filter(Boolean).length >= S.NIVELES[nivel].pistas);
    assert.ok(S.completo(g.solucion, g.solucion) && S.errores(g.puzle, g.solucion).length === 0);
  }

  const M = await imp('assets/js/morse.js');
  assert.equal(M.aMorse('sos'), '... --- ...');
  assert.equal(M.aMorse('Ávila ñ'), '.- ...- .. .-.. .- / --.--');
  assert.equal(M.deMorse(M.aMorse('Ayuda en casa')), 'AYUDA EN CASA');
  const sec = M.secuencia('SOS');
  assert.equal(sec.filter(([on]) => on).length, 9);
  assert.equal(sec.reduce((s, [, d]) => s + d, 0), 5 + 3 + 11 + 3 + 5, "S(5) + hueco(3) + O(11) + hueco(3) + S(5)");

  const X = await imp('data/content/juegos-extra.js');
  assert.ok(X.SIN_PANTALLA.length >= 4 && X.SIN_PANTALLA.every((g) => g.juegos.length && g.juegos.every((j) => j.pasos.length)));
  const ese = X.MOCHILA_OBJETOS.filter((o) => o.esencial);
  assert.ok(ese.reduce((s, o) => s + o.kg, 0) <= X.MOCHILA_MAX_KG, 'todo lo esencial cabe en la mochila');
});

test('Alex v1.15: conversa por partes, recuerda el tema, pregunta si duda y no inventa', async () => {
  const { crearAlex, coincide } = await imp('assets/js/alex-motor.js');
  assert.ok(coincide(' hay un incendio en mi edificio ', 'incendio+edificio') && !coincide(' hay un incendio ', 'incendio+edificio'));
  const A = crearAlex();
  // Preguntas que antes se iban a otra ficha.
  const casos = {
    'qué hago si hay un incendio en mi edificio': 'Incendio en vivienda',
    'qué hago si me pierdo en el monte': 'Qué hacer si te pierdes: protocolo STOP',
    'que comer si no hay supermercados': 'Desabastecimiento de alimentos',
    'cómo hablo con mi familia si no hay cobertura': 'Plan de comunicación cuando falla la red',
    'cómo cocino sin luz': 'Conservar y cocinar sin electricidad',
    '¿qué hago si se va la luz varios días?': 'Apagón eléctrico',
    'quiero prepararme para un colapso': 'Preparación por niveles: de 24 horas a autonomía prolongada',
    'cómo purifico agua del río': 'Potabilizar agua: hervir, cloro y filtros',
  };
  for (const [q, t] of Object.entries(casos)) assert.equal(A.responder(q).titulo, t, q);
  assert.equal(A.responder('hay un incendio en mi edificio').urgente, true);
  // Respuesta completa: pasos, lo que no hay que hacer, aviso y siguientes preguntas.
  const apagon = A.responder('se ha ido la luz');
  assert.ok(apagon.pasos.length >= 3 && apagon.no.length >= 1 && apagon.siguientes.includes('Cuéntame más') && apagon.apertura);
  // «Cuéntame más» sigue con el mismo tema, por partes, hasta el final.
  let m = A.responder('cuéntame más');
  assert.equal(m.tipo, 'seguimiento'); assert.equal(m.titulo, 'Apagón eléctrico'); assert.ok(m.seccion.items.length);
  const primera = m.seccion.t;
  m = A.responder('sigue');
  assert.ok(m.tipo === 'fin-tema' || m.seccion.t !== primera, 'no repite la misma parte');
  for (let k = 0; k < 6 && m.tipo !== 'fin-tema'; k++) m = A.responder('más');
  assert.equal(m.tipo, 'fin-tema');
  assert.equal(A.responder('¿qué no debo hacer?').seccion.t, 'Lo que no debes hacer');
  // «¿y si…?» usa el tema anterior cuando la frase sola no basta.
  A.responder('hace mucho frío en casa y no hay calefacción');
  const frio = A.responder('mucho frío en casa');
  assert.ok(frio.ojo.length && /monóxido/i.test(frio.ojo[0]), 'el aviso de seguridad de la ficha aparece');
  // Miedo: lo reconoce antes de responder y ofrece el modo calma.
  const miedo = A.responder('tengo miedo de que haya una guerra');
  assert.equal(miedo.titulo, 'Conflicto armado'); assert.ok(miedo.empatia);
  // Lo que no tiene ficha, no se inventa.
  assert.equal(A.responder('qué hago si viene un tsunami').tipo, 'sin-ficha');
  assert.equal(A.responder('receta de paella').tipo, 'fuera');
  // Sin tema previo, «cuéntame más» no se inventa un tema.
  const B = crearAlex();
  assert.notEqual(B.responder('cuéntame más').tipo, 'seguimiento');
});

test('radio: elige la emisión HTTPS que menos gasta y aguanta un directorio caído', async () => {
  const R = await import('../netlify/functions/radios/core.mjs');
  const ser = R.EMISORAS.find((e) => e.id === 'ser');
  const lista = [
    { name: 'Cadena SER', url_resolved: 'http://x.test/ser128.mp3', bitrate: 128, lastcheckok: 1, clickcount: 900 },
    { name: 'Cadena SER', url_resolved: 'https://x.test/ser64.aac', bitrate: 64, lastcheckok: 1, clickcount: 500, codec: 'AAC' },
    { name: 'Cadena SER', url_resolved: 'https://x.test/ser32.aac', bitrate: 32, lastcheckok: 1, clickcount: 50, codec: 'AAC+' },
    { name: 'Cadena SER Valencia', url_resolved: 'https://x.test/ser.m3u8', bitrate: 16, lastcheckok: 1 },
    { name: 'Radio Marca', url_resolved: 'https://x.test/marca.mp3', bitrate: 24, lastcheckok: 1 },
  ];
  const e = R.elegir(ser, lista);
  assert.equal(e.url, 'https://x.test/ser32.aac', 'la de menos kbps, solo HTTPS y sin listas m3u8');
  assert.equal(e.kbps, 32);
  assert.equal(R.elegir(ser, [{ name: 'Cadena SER', url_resolved: 'http://solo-http.test/a.mp3', bitrate: 64, lastcheckok: 1 }]), null, 'nunca HTTP (la app es HTTPS)');
  const cope = R.EMISORAS.find((x) => x.id === 'cope');
  assert.equal(R.elegir(cope, [{ name: 'COPE Deportes', url_resolved: 'https://x.test/d.mp3', bitrate: 32 }]), null);
  // Directorio caído: todas sin URL, con el motivo, y el resto no se rompe.
  let llamadas = 0;
  const caido = async () => { llamadas++; return { ok: false, status: 503 }; };
  const d = await R.recopilar(caido, new Date('2026-11-03T10:00:00Z'));
  assert.equal(d.emisoras.length, R.EMISORAS.length);
  assert.ok(d.emisoras.every((x) => x.url === null && x.error === 'HTTP 503'));
  assert.equal(llamadas, R.EMISORAS.length * R.SERVIDORES.length, 'prueba todos los servidores espejo');
  // Directorio bueno.
  const bueno = async (url) => ({ ok: true, status: 200, json: async () => (/Cadena%20SER/.test(url) ? lista : []) });
  const d2 = await R.recopilar(bueno);
  assert.equal(d2.emisoras.find((x) => x.id === 'ser').url, 'https://x.test/ser32.aac');
  // Rutas y CSP
  const red = fs.readFileSync(path.join(PUB, '_redirects'), 'utf8');
  assert.ok(red.indexOf('/api/radios') > -1 && red.indexOf('/api/radios') < red.indexOf('/*    /index.html'));
  const toml = fs.readFileSync(path.join(ROOT, 'netlify.toml'), 'utf8');
  assert.match(toml, /media-src 'self' blob: https:;/);
  const { mbHora } = await imp('assets/js/radio.js');
  assert.equal(mbHora(32), 14); assert.equal(mbHora(64), 28);
});
