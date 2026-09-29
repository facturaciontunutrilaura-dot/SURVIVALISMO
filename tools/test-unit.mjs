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
  }
});

/* ------------------------------ Portada ------------------------------ */
test('portada: cada sección aparece una sola vez y «Plan familiar» sigue accesible', async () => {
  const { SECCIONES, PORTADA } = await imp('data/content/index.js');
  const enPortada = [...PORTADA.plan, ...PORTADA.manual, ...PORTADA.mas];
  assert.equal(new Set(enPortada).size, enPortada.length, 'duplicadas');
  const ids = SECCIONES.map((s) => s.id);
  for (const id of enPortada) assert.ok(ids.includes(id), `sección inexistente: ${id}`);
  const fuera = ids.filter((id) => !enPortada.includes(id));
  assert.deepEqual(fuera.sort(), ['emergencia', 'plan-familiar'], 'solo SOS (arriba) y Plan familiar (desde Familia) quedan fuera');
  const fam = fs.readFileSync(path.join(PUB, 'assets/js/familia.js'), 'utf8');
  assert.ok(fam.includes('#/sec/plan-familiar'), 'Familia debe enlazar a Contactos y acuerdos');
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
