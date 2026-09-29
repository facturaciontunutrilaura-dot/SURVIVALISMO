#!/usr/bin/env node
/**
 * test-sync.mjs — prueba end-to-end de la sincronización.
 *
 * Levanta un servidor que imita la API REST de Supabase (GoTrue + PostgREST)
 * con la semántica que usa la app, y comprueba con DOS contextos de navegador
 * independientes —dos "dispositivos"— que los datos viajan de uno a otro,
 * que los borrados se propagan y que los conflictos se resuelven a favor del
 * dispositivo que sincroniza más tarde.
 */
import { chromium, devices } from 'playwright';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8150, SB = 8151;
const BASE = `http://localhost:${PORT}`;
const SUPA = `http://localhost:${SB}`;

let pass = 0, fail = 0; const errors = [];
const ok = (n, c, x = '') => { if (c) { pass++; console.log(`  ✅ ${n}`); } else { fail++; console.log(`  ❌ ${n} ${x}`); errors.push(n + ' ' + x); } };

/* --------------------- Servidor Supabase simulado --------------------- */
const filas = new Map();           // clave: user::store::item_id
let reloj = 0;                     // reloj monótono para updated_at
let modo = 'normal';               // normal | sin-tabla | sin-rls | clave-mala
const ahora = () => new Date(Date.UTC(2026, 0, 1, 0, 0, 0, ++reloj)).toISOString();

const supa = createServer(async (req, res) => {
  const url = new URL(req.url, SUPA);
  let body = '';
  for await (const ch of req) body += ch;
  const json = (code, obj) => {
    res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' });
    res.end(obj === undefined ? '' : JSON.stringify(obj));
  };
  if (req.method === 'OPTIONS') return json(204);
  if (modo === 'clave-mala') return json(401, { message: 'Invalid API key', hint: 'Double check your Supabase `anon` or `service_role` API key.' });
  if (modo === 'sin-clave') return json(401, { message: 'No API key found in request', hint: 'No `apikey` request header or url param was found.' });
  // El endpoint raíz devuelve 404 en muchos proyectos reales aunque la clave
  // sea válida: la sonda del diagnóstico NO debe depender de él.
  if ((url.pathname === '/rest/v1/' || url.pathname === '/rest/v1') && modo === 'raiz-404') return json(404, {});
  if (url.pathname === '/rest/v1/' || url.pathname === '/rest/v1') return json(200, {});

  if (url.pathname === '/auth/v1/signup' || url.pathname === '/auth/v1/token') {
    const b = body ? JSON.parse(body) : {};
    if (url.searchParams.get('grant_type') === 'password' && b.password !== 'secreto123') {
      return json(400, { msg: 'Invalid login credentials' });
    }
    return json(200, {
      access_token: 'tok-' + (b.email || 'x'), refresh_token: 'ref', expires_in: 3600,
      user: { id: 'user-unico', email: b.email || 'a@b.c' },
    });
  }

  if (url.pathname === '/rest/v1/sync_items') {
    if (modo === 'sin-tabla') {
      return json(404, { code: 'PGRST205', message: "Could not find the table 'public.sync_items' in the schema cache" });
    }
    const conSesion = /^Bearer /.test(req.headers.authorization || '');
    if (req.method === 'DELETE') {
      for (const [k, v] of filas) if (v.store === '__diagnostico') filas.delete(k);
      return json(204);
    }
    if (req.method === 'GET' && !conSesion) {
      // Sin sesión: con RLS activa no se devuelve nada. En modo 'sin-rls'
      // devolvemos filas a propósito, que es justo lo que debe detectarse.
      return json(200, modo === 'sin-rls' ? [...filas.values()].slice(0, 1) : []);
    }
    if (req.method === 'GET') {
      const gt = (url.searchParams.get('updated_at') || 'gt.1970-01-01T00:00:00Z').replace('gt.', '');
      const out = [...filas.values()].filter((f) => f.updated_at > gt)
        .sort((a, b) => a.updated_at.localeCompare(b.updated_at));
      return json(200, out);
    }
    if (req.method === 'POST') {
      for (const r of JSON.parse(body)) {
        filas.set(`${r.user_id}::${r.store}::${r.item_id}`, { ...r, updated_at: ahora() });
      }
      return json(201);
    }
  }
  return json(404, { msg: 'no' });
});
await new Promise((r) => supa.listen(SB, r));

const srv = spawn(process.execPath, [path.join(ROOT, 'tools/serve.mjs')], {
  env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore',
});
await new Promise((r) => setTimeout(r, 900));

const CHROME = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/usr/bin/chromium']
  .find((p) => fs.existsSync(p));
const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});

async function dispositivo(nombre) {
  const ctx = await browser.newContext({ ...devices['Pixel 7'], serviceWorkers: 'allow' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log(`  ⚠ ${nombre}: ${e.message}`));
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate((u) => {
    localStorage.setItem('survival.sync', JSON.stringify({ url: u, anon: 'anon-key', auto: false }));
  }, SUPA);
  return { ctx, page, nombre };
}

const login = (d) => d.page.evaluate(async () => {
  const S = await import('./assets/js/sync.js');
  await S.entrar('carlos@example.com', 'secreto123');
  return S.sesionActiva();
});
const sync = (d) => d.page.evaluate(async () => {
  const S = await import('./assets/js/sync.js');
  return S.sincronizar();
});
const escribe = (d, store, obj) => d.page.evaluate(async ([s, o]) => {
  const st = await import('./assets/js/store.js');
  await st.put(s, o);
}, [store, obj]);
const borra = (d, store, id) => d.page.evaluate(async ([s, i]) => {
  const st = await import('./assets/js/store.js');
  await st.del(s, i);
}, [store, id]);
const lee = (d, store, id) => d.page.evaluate(async ([s, i]) => {
  const st = await import('./assets/js/store.js');
  return st.get(s, i);
}, [store, id]);

try {
  console.log('\n▸ Sincronización entre dos dispositivos');
  const A = await dispositivo('A');
  const B = await dispositivo('B');

  ok('Dispositivo A inicia sesión', await login(A));
  ok('Dispositivo B inicia sesión', await login(B));

  /* 1 · A escribe y sube */
  await escribe(A, 'contactos', { id: 'c1', n: 'Contacto externo', t: '600111222', r: 'externo' });
  await escribe(A, 'puntos', { id: 'p1', nombre: 'Punto de encuentro', tipo: 'reunion', lat: 40.65, lon: -4.68 });
  await escribe(A, 'kv', { id: 'plan.punto', v: 'Fuente de la plaza' });
  let r = await sync(A);
  ok('A sube sus 3 registros', r.subidos === 3, JSON.stringify(r));

  /* 2 · B baja */
  r = await sync(B);
  ok('B se descarga los 3 registros', r.aplicados === 3, JSON.stringify(r));
  ok('B tiene el contacto de A', (await lee(B, 'contactos', 'c1'))?.t === '600111222');
  ok('B tiene el punto del mapa de A', (await lee(B, 'puntos', 'p1'))?.nombre === 'Punto de encuentro');
  ok('B tiene el texto del plan familiar', (await lee(B, 'kv', 'plan.punto'))?.v === 'Fuente de la plaza');

  /* 3 · Ida y vuelta: B modifica, A recibe */
  await escribe(B, 'contactos', { id: 'c1', n: 'Contacto externo', t: '699999999', r: 'externo' });
  await sync(B);
  r = await sync(A);
  ok('A recibe la edición hecha en B', (await lee(A, 'contactos', 'c1'))?.t === '699999999', JSON.stringify(r));

  /* 4 · Borrado propagado */
  await borra(B, 'puntos', 'p1');
  await sync(B);
  r = await sync(A);
  ok('El borrado hecho en B llega a A', (await lee(A, 'puntos', 'p1')) === null && r.borrados === 1, JSON.stringify(r));

  /* 5 · Conflicto: ambos editan sin sincronizar; gana quien sincroniza después */
  await escribe(A, 'kv', { id: 'plan.punto', v: 'Versión de A' });
  await escribe(B, 'kv', { id: 'plan.punto', v: 'Versión de B' });
  await sync(A);                       // A sube primero
  const rb = await sync(B);            // B detecta conflicto y gana
  ok('B detecta el conflicto', rb.conflictos === 1, JSON.stringify(rb));
  ok('Gana el que sincroniza más tarde', (await lee(B, 'kv', 'plan.punto'))?.v === 'Versión de B');
  await sync(A);
  ok('A converge con la versión ganadora', (await lee(A, 'kv', 'plan.punto'))?.v === 'Versión de B');

  /* 6 · Las teselas NO se sincronizan */
  await A.page.evaluate(async () => {
    const st = await import('./assets/js/store.js');
    await st.put('tiles', { id: 'osm/10/1/1', blob: new Blob(['x']), src: 'osm', z: 10 });
  });
  r = await sync(A);
  ok('Las teselas quedan fuera de la sincronización', r.subidos === 0, JSON.stringify(r));

  /* 7 · Sin conexión, la app sigue funcionando y guardando */
  await A.ctx.setOffline(true);
  await escribe(A, 'contactos', { id: 'c2', n: 'Escrito sin red', t: '111', r: 'familia' });
  ok('SIN RED: se puede seguir escribiendo en local', (await lee(A, 'contactos', 'c2'))?.n === 'Escrito sin red');
  const err = await A.page.evaluate(async () => {
    const S = await import('./assets/js/sync.js');
    try { await S.sincronizar(); return null; } catch (e) { return e.message; }
  });
  ok('SIN RED: la sincronización falla con un mensaje claro y sin romper nada', /Sin conexión/.test(err || ''), err);
  await A.page.goto(BASE + '#/sec/familia', { waitUntil: 'domcontentloaded' });
  await A.page.waitForSelector('#fa-estado .row', { timeout: 10000 });
  ok('SIN RED: la app sigue navegando con normalidad', (await A.page.locator('#fa-estado .row').count()) === 3);

  /* 8 · Al recuperar la red, lo pendiente sube */
  await A.ctx.setOffline(false);
  r = await sync(A);
  // Sube el contacto escrito sin red y, además, cualquier estado que la propia
  // app haya inicializado mientras se navegaba offline (p. ej. los nodos
  // familiares por defecto al abrir la pantalla de Familia).
  ok('Al volver la red se sube lo escrito offline', r.subidos >= 1, JSON.stringify(r));
  await sync(B);
  ok('B recibe lo que A escribió sin conexión', (await lee(B, 'contactos', 'c2'))?.n === 'Escrito sin red');

  /* 9 · Detección automática de credenciales pegadas */
  const det = await A.page.evaluate(async () => {
    const S = await import('./assets/js/sync.js');
    return S.detectarCredenciales(`
      const supabase = createClient(
        'https://abcdefgh.supabase.co',
        'sb_publishable_AbC-123_xyz'
      )`);
  });
  ok('Detecta la URL en un snippet pegado', det.url === 'https://abcdefgh.supabase.co', JSON.stringify(det));
  ok('Detecta la clave publishable en un snippet pegado', det.key === 'sb_publishable_AbC-123_xyz', JSON.stringify(det));

  /* 10 · Diagnóstico */
  console.log('\n▸ Diagnóstico de configuración');
  const diag = (d) => d.page.evaluate(async () => {
    const S = await import('./assets/js/sync.js');
    return S.diagnosticar();
  });
  const estadoDe = (ps, t) => ps.find((p) => p.t === t)?.estado;

  let ps = await diag(A);
  ok('Diagnóstico: todo correcto cuando lo está', ps.every((p) => p.estado === 'ok'),
    ps.filter((p) => p.estado !== 'ok').map((p) => p.t + ': ' + p.msg).join(' | '));
  ok('Diagnóstico: comprueba escritura y lectura reales', estadoDe(ps, 'Escritura y lectura') === 'ok');

  modo = 'sin-rls';
  ps = await diag(A);
  ok('Diagnóstico: DETECTA que la RLS no está activa', estadoDe(ps, 'Seguridad RLS') === 'error',
    JSON.stringify(ps.find((p) => p.t === 'Seguridad RLS')));

  modo = 'sin-tabla';
  ps = await diag(A);
  ok('Diagnóstico: detecta que falta la tabla', estadoDe(ps, 'Tabla sync_items') === 'error');
  ok('Diagnóstico: dice cómo arreglarlo', /SQL Editor/.test(ps.find((p) => p.t === 'Tabla sync_items')?.arreglo || ''));

  modo = 'clave-mala';
  ps = await diag(A);
  ok('Diagnóstico: detecta clave rechazada', estadoDe(ps, 'Conexión con Supabase') === 'error');
  ok('Diagnóstico: muestra el mensaje real del servidor',
    /Invalid API key/.test(ps.find((p) => p.t === 'Conexión con Supabase')?.msg || ''),
    ps.find((p) => p.t === 'Conexión con Supabase')?.msg);

  modo = 'sin-clave';
  ps = await diag(A);
  ok('Diagnóstico: distingue "no llega la clave" de "clave inválida"',
    /no está llegando/i.test(ps.find((p) => p.t === 'Conexión con Supabase')?.arreglo || ''),
    ps.find((p) => p.t === 'Conexión con Supabase')?.arreglo);

  // Regresión: el endpoint raíz devolvía 404 y el diagnóstico daba un 401
  // falso. Ahora no debe usarse esa sonda en absoluto.
  modo = 'raiz-404';
  ps = await diag(A);
  ok('Diagnóstico: NO falla si el endpoint raíz devuelve 404',
    estadoDe(ps, 'Conexión con Supabase') === 'ok' && estadoDe(ps, 'Tabla sync_items') === 'ok',
    JSON.stringify(ps.map((p) => p.t + ':' + p.estado)));

  modo = 'normal';
  const psSecret = await A.page.evaluate(async () => {
    const S = await import('./assets/js/sync.js');
    const previa = S.cfg().anon;
    S.setCfg({ anon: 'sb_secret_PELIGRO' });
    const r = await S.diagnosticar();
    S.setCfg({ anon: previa });
    return r;
  });
  ok('Diagnóstico: AVISA si se pega una clave secreta',
    psSecret.find((p) => p.t === 'Clave pública')?.estado === 'error'
    && /secreta/i.test(psSecret.find((p) => p.t === 'Clave pública')?.msg || ''),
    JSON.stringify(psSecret.find((p) => p.t === 'Clave pública')));

  /* 10 bis · URLs equivocadas frecuentes */
  const urlMala = (u) => A.page.evaluate(async (url) => {
    const S = await import('./assets/js/sync.js');
    const previa = S.cfg().url;
    S.setCfg({ url });
    const r = await S.diagnosticar();
    S.setCfg({ url: previa });
    return r.find((p) => p.t === 'URL del proyecto');
  }, u);

  const propiaApp = await urlMala(BASE);
  ok('Diagnóstico: rechaza la URL de la propia app',
    propiaApp?.estado === 'error' && /esta misma aplicación/i.test(propiaApp.msg), JSON.stringify(propiaApp));

  const netlify = await urlMala('https://survivalismo.netlify.app');
  ok('Diagnóstico: rechaza una URL de Netlify',
    netlify?.estado === 'error' && /alojamiento web/i.test(netlify.msg), JSON.stringify(netlify));
  ok('Diagnóstico: explica dónde está la URL buena',
    /supabase\.co/.test(netlify?.arreglo || ''), netlify?.arreglo);

  // Ruta pegada detrás del dominio: debe limpiarse sola y seguir funcionando.
  const conRuta = await A.page.evaluate(async (u) => {
    const S = await import('./assets/js/sync.js');
    const previa = S.cfg().url;
    S.setCfg({ url: u + '/rest/v1' });
    const paso = (await S.diagnosticar()).find((p) => p.t === 'URL del proyecto');
    const guardada = S.cfg().url;
    const sync = await S.sincronizar().then(() => true).catch((e) => e.message);
    S.setCfg({ url: previa });
    return { paso, guardada, sync };
  }, SUPA);
  ok('Diagnóstico: limpia sola la ruta sobrante de la URL',
    conRuta.paso?.estado === 'ok' && /se ha quitado autom/i.test(conRuta.paso.msg), JSON.stringify(conRuta.paso));
  ok('La URL queda corregida en la configuración', conRuta.guardada === SUPA, conRuta.guardada);
  ok('Y la sincronización funciona con la URL corregida', conRuta.sync === true, String(conRuta.sync));

  // URL del panel de control: se corrige a la del proyecto.
  const panel = await urlMala('https://supabase.com/dashboard/project/abcdefghijklmnop');
  ok('Diagnóstico: reconoce la URL del panel y la corrige',
    panel?.estado === 'warn' && /abcdefghijklmnop\.supabase\.co/.test(panel.arreglo || ''), JSON.stringify(panel));

  const basura = await urlMala('no-es-una-url');
  ok('Diagnóstico: rechaza texto que no es una URL', basura?.estado === 'error', JSON.stringify(basura));

  /* 11 · Traspaso al otro dispositivo */
  const traspaso = await A.page.evaluate(async () => {
    const S = await import('./assets/js/sync.js');
    return S.configTransferible();
  });
  ok('Config transferible sin la sesión', traspaso.url && traspaso.anon && !('access_token' in traspaso), JSON.stringify(traspaso));

  /* 12 · Credenciales incorrectas */
  const bad = await B.page.evaluate(async () => {
    const S = await import('./assets/js/sync.js');
    try { await S.entrar('carlos@example.com', 'mala'); return null; } catch (e) { return e.message; }
  });
  ok('Credenciales incorrectas dan error legible', /Invalid login/.test(bad || ''), bad);

  /* 13 · Interfaz: el diagnóstico debe abrir el apartado donde se arregla */
  console.log('\n▸ Interfaz del panel de sincronización');
  const U = await browser.newContext({ ...devices['Pixel 7'] });
  const up = await U.newPage();
  await up.goto(BASE, { waitUntil: 'networkidle' });
  await up.evaluate(() => localStorage.setItem('survival.sync',
    JSON.stringify({ url: 'https://survivalismo.netlify.app', anon: 'sb_publishable_xyz' })));
  await up.goto(BASE + '#/sec/config', { waitUntil: 'networkidle' });
  await up.waitForSelector('#sy-diag');
  ok('El apartado 1 se pliega cuando ya hay conexión guardada', !(await up.locator('#sy-d1').evaluate((e) => e.open)));
  ok('Pero el resumen deja ver la URL configurada', (await up.textContent('#sy-d1 summary')).includes('survivalismo.netlify.app'));
  await up.click('#sy-diag');
  await up.waitForSelector('#sy-diagout .row');
  ok('El diagnóstico abre solo el apartado donde se arregla', await up.locator('#sy-d1').evaluate((e) => e.open));
  ok('Y deja el foco en el campo que hay que corregir', await up.evaluate(() => document.activeElement?.id === 'sy-url'));
  // Guardar una URL con ruta debe limpiarla en el propio campo.
  await up.locator('#sy-d1').evaluate((e) => { e.open = true; });
  await up.fill('#sy-url', 'https://wjzidpvynyejvhowexmp.supabase.co/rest/v1/');
  await up.fill('#sy-anon', 'sb_publishable_prueba');
  await up.click('#sy-save');
  await up.waitForTimeout(400);
  ok('Al guardar, la URL se limpia sola en el campo',
    (await up.inputValue('#sy-url')) === 'https://wjzidpvynyejvhowexmp.supabase.co',
    await up.inputValue('#sy-url'));
  ok('El atajo de pegado queda como opcional y plegado',
    await up.locator('#sy-pegar').isHidden());
  await U.close();

} catch (e) {
  fail++; console.error('\n💥 Excepción:', e.message); errors.push(e.message);
} finally {
  await browser.close(); srv.kill(); supa.close();
}

console.log(`\n${'─'.repeat(60)}\nSINCRONIZACIÓN: ${pass} correctas · ${fail} fallidas`);
if (fail) { console.log('\nFallos:\n' + errors.map((e) => ' · ' + e).join('\n')); process.exit(1); }
console.log('Todas las pruebas de sincronización han pasado.\n');
