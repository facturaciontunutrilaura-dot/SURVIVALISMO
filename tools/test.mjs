#!/usr/bin/env node
/**
 * test.mjs — pruebas end-to-end con Playwright (Chromium).
 * Comprueba: carga, navegación, buscador, checklists persistentes,
 * calculadoras, exportación, modo oscuro/noche, Service Worker, IndexedDB,
 * ausencia de errores de consola y funcionamiento REAL sin conexión.
 */
import { chromium, devices } from 'playwright';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8123;
const BASE = `http://localhost:${PORT}`;

let pass = 0, fail = 0;
const errors = [];
function ok(name, cond, extra = '') {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${extra}`); errors.push(name + ' ' + extra); }
}

const srv = spawn(process.execPath, [path.join(ROOT, 'tools/serve.mjs')], {
  env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore',
});
await new Promise((r) => setTimeout(r, 900));

import fs from 'node:fs';
const CHROME = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/usr/bin/chromium', '/usr/bin/google-chrome']
  .find((p) => fs.existsSync(p));
const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
const ctx = await browser.newContext({ ...devices['Pixel 7'], serviceWorkers: 'allow' });
const page = await ctx.newPage();

const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));

try {
  /* ------------------------------ 1. Carga ------------------------------ */
  console.log('\n▸ Carga inicial y app shell');
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('.tile.sos', { timeout: 10000 });
  ok('Portada renderiza el botón de emergencia', await page.locator('.tile.sos').isVisible());
  ok('Se muestran todas las secciones', (await page.locator('.grid .tile').count()) >= 20);
  ok('Título correcto', (await page.title()).includes('SURVIVAL'));

  /* --------------------------- 2. Modo emergencia --------------------------- */
  console.log('\n▸ Modo emergencia');
  await page.click('.tile.sos');
  await page.waitForSelector('.emg-hd');
  ok('Lista de escenarios', (await page.locator('.list .row').count()) === 20);
  await page.click('a[href="#/emergencia/apagon"]');
  await page.waitForSelector('.qcard');
  ok('Tarjeta rápida visible', (await page.locator('.qcard li').count()) >= 4);
  ok('Pestaña AHORA por defecto', (await page.locator('#emg-body .steps li').count()) > 3);
  await page.click('.tabs button[data-t="no"]');
  await page.waitForTimeout(150);
  ok('Pestaña NO HACER funciona', (await page.locator('#emg-body .steps.no li').count()) > 3);
  await page.click('.tabs button[data-t="ev"]');
  await page.waitForTimeout(150);
  ok('Pestaña evacuar/refugiarse', (await page.locator('#emg-body .blk-note').count()) === 1);

  /* ------------------------------ 3. Artículos ------------------------------ */
  console.log('\n▸ Secciones y artículos');
  await page.goto(BASE + '#/sec/agua');
  await page.waitForSelector('h1');
  ok('Sección AGUA con artículos', (await page.locator('.list .row').count()) >= 4);
  await page.goto(BASE + '#/art/agua-tratar');
  await page.waitForSelector('h1');
  ok('Artículo de potabilización', (await page.textContent('h1')).includes('Potabilizar'));
  ok('Renderiza tablas', (await page.locator('table').count()) >= 1);
  ok('Renderiza avisos', (await page.locator('.blk-warn').count()) >= 1);
  ok('Calculadora incrustada', await page.locator('#cc-out').isVisible());

  /* ----------------------------- 4. Calculadoras ----------------------------- */
  console.log('\n▸ Calculadoras');
  await page.goto(BASE + '#/sec/calculadoras');
  await page.waitForSelector('#ca-out');
  await page.fill('#ca-p', '4'); await page.fill('#ca-d', '7');
  await page.selectOption('#ca-u', '5');
  await page.waitForTimeout(120);
  const agua = await page.textContent('#ca-out');
  ok('Agua 4 pers × 7 días × 5 l = 140 l', agua.includes('140 litros'), agua.slice(0, 80));
  await page.fill('#cc-l', '10'); await page.waitForTimeout(120);
  ok('Cloración 10 l = 20 gotas', (await page.textContent('#cc-out')).includes('20 gotas'));
  await page.fill('#cz-a', '120'); await page.waitForTimeout(120);
  ok('Rumbo inverso de 120° = 300°', (await page.textContent('#cz-out')).includes('300°'));
  await page.fill('#cd-lat', '40.6565'); await page.fill('#cd-lon', '-4.6818');
  await page.waitForTimeout(150);
  const coord = await page.textContent('#cd-out');
  ok('UTM huso 30T para Ávila', coord.includes('30T'), coord.slice(0, 120));
  await page.fill('#cm-d', '12'); await page.fill('#cm-h', '600'); await page.waitForTimeout(120);
  ok('Naismith 12 km + 600 m ≈ 4 h', /4 h/.test(await page.textContent('#cm-out')));

  /* ------------------------------ 5. Buscador ------------------------------ */
  console.log('\n▸ Buscador offline');
  await page.goto(BASE + '#/buscar');
  await page.waitForSelector('#q');
  await page.fill('#q', 'agua');
  await page.waitForTimeout(350);
  const nres = await page.locator('#res .row').count();
  ok('Buscar "agua" devuelve resultados', nres >= 5, `(${nres})`);
  await page.fill('#q', 'apagón'); await page.waitForTimeout(350);
  ok('Buscar "apagón" encuentra el escenario', (await page.textContent('#res')).toLowerCase().includes('apagón'));
  await page.fill('#q', 'zzzzqqq'); await page.waitForTimeout(350);
  ok('Búsqueda sin resultados se maneja', (await page.locator('.sr-empty').count()) === 1);

  /* ------------------------------ 6. Checklists ------------------------------ */
  console.log('\n▸ Checklists e IndexedDB');
  await page.goto(BASE + '#/check/nivel2');
  await page.waitForSelector('.chk-item');
  const nItems = await page.locator('.chk-item').count();
  ok('Checklist Nivel 2 con ítems', nItems > 40, `(${nItems})`);
  await page.locator('.chk-item').first().locator('button[data-s="tengo"]').click();
  await page.waitForTimeout(250);
  ok('Marca guardada', (await page.getAttribute('.chk-item button[data-s="tengo"]', 'aria-pressed')) === 'true');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.chk-item');
  ok('Persiste tras recargar', (await page.getAttribute('.chk-item button[data-s="tengo"]', 'aria-pressed')) === 'true');
  ok('Barra de progreso actualizada', (await page.textContent('#ck-txt')).startsWith('1 de'));

  /* --------------------------- 7. Plan familiar --------------------------- */
  console.log('\n▸ Plan familiar (solo local)');
  await page.goto(BASE + '#/sec/plan-familiar');
  await page.waitForSelector('#k-punto');
  await page.fill('#k-punto', 'Plaza del pueblo, junto a la fuente');
  await page.waitForTimeout(600);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('#k-punto');
  ok('Texto del plan persiste', (await page.inputValue('#k-punto')).includes('Plaza del pueblo'));

  /* ------------------------------ 8. Cursos ------------------------------ */
  console.log('\n▸ Formación');
  await page.goto(BASE + '#/curso/c04');
  await page.waitForSelector('#q');
  const opts = page.locator('[data-q="0"] .quiz-opt');
  await opts.nth(2).click();
  await page.waitForTimeout(150);
  ok('Quiz marca respuesta correcta (300°)', (await opts.nth(2).getAttribute('class')).includes('right'));

  /* ------------------------------ 9. Frecuencias ------------------------------ */
  console.log('\n▸ Comunicaciones y frecuencias');
  await page.goto(BASE + '#/sec/comunicaciones');
  await page.waitForSelector('.freq-card');
  const freqTxt = await page.textContent('body');
  ok('PMR446 canal 1 con frecuencia exacta', freqTxt.includes('446.00625'));
  ok('Marca lo no verificado', freqTxt.includes('PENDIENTE DE VERIFICACIÓN'));
  ok('Distingue RX/TX y licencia', freqTxt.includes('RX') && freqTxt.includes('licencia'));

  /* ------------------- 9 bis. NUEVO: Juegos y modo calma ------------------- */
  console.log('\n▸ Juegos offline y modo calma');
  await page.goto(BASE + '#/sec/juegos');
  await page.waitForSelector('.ttt-c');
  ok('Tres en raya renderiza 9 casillas', (await page.locator('.ttt-c').count()) === 9);
  await page.locator('.ttt-c').first().click();
  await page.waitForTimeout(200);
  ok('Tres en raya acepta jugada', (await page.locator('.ttt-c').first().textContent()).includes('❌'));
  await page.click('[data-modo="dificil"]');
  await page.waitForTimeout(150);
  await page.locator('.ttt-c').nth(4).click();
  await page.waitForTimeout(700);
  const ocupadas = await page.locator('.ttt-c').evaluateAll((els) => els.filter((e) => e.textContent.trim()).length);
  ok('La IA responde con una jugada', ocupadas === 2, `(${ocupadas} casillas)`);

  await page.click('#jg-tabs button[data-t="mem"]');
  await page.waitForSelector('.mem-c');
  ok('Memory reparte cartas', (await page.locator('.mem-c').count()) === 16);
  await page.locator('.mem-c').first().click();
  await page.waitForTimeout(200);
  ok('Memory voltea carta', (await page.locator('.mem-c.up').count()) >= 1);

  await page.click('#jg-tabs button[data-t="ret"]');
  await page.waitForSelector('#rt-go');
  await page.selectOption('#rt-num', '5');
  await page.click('#rt-go');
  await page.waitForSelector('.quiz-opt');
  ok('Reto lanza preguntas', (await page.locator('.quiz-opt').count()) === 4);
  await page.locator('.quiz-opt').first().click();
  await page.waitForTimeout(250);
  ok('Reto muestra explicación', (await page.locator('#rt-exp .blk-ok, #rt-exp .blk-warn').count()) === 1);

  await page.click('#jg-tabs button[data-t="cal"]');
  await page.waitForSelector('#ca-start');
  await page.click('#ca-start');
  await page.waitForTimeout(1400);
  const fase = await page.textContent('#ca-fase');
  ok('Modo calma inicia la respiración guiada', ['INSPIRA', 'MANTÉN', 'ESPIRA'].includes(fase), fase);
  await page.click('#ca-stop');
  ok('Modo calma incluye grounding', (await page.locator('#ca-gr details').count()) >= 4);

  /* ---------------------- 9 ter. NUEVO: Riesgos 2036 ---------------------- */
  console.log('\n▸ Riesgos 2026–2036');
  await page.goto(BASE + '#/sec/riesgos');
  await page.waitForSelector('.riesgo');
  const nRiesgos = await page.locator('.riesgo').count();
  ok('Fichas de riesgo para Ávila', nRiesgos >= 15, `(${nRiesgos})`);
  ok('Separa situación actual y proyecciones', (await page.locator('.bloque-actual').count()) >= 10 && (await page.locator('.bloque-2036').count()) >= 10);
  ok('Muestra nivel, tendencia y confianza', (await page.locator('.riesgo .lvl').count()) >= 15 && (await page.textContent('body')).includes('★'));
  ok('Dibuja la gráfica 2026–2036', (await page.locator('.chart svg').count()) >= 5);
  const cuerpoR = await page.textContent('body');
  // Ninguna ficha de riesgo debe contener una probabilidad numérica.
  // (La metodología sí menciona «guerra: 27 %» como ejemplo de lo que NO se hace.)
  const fichasTxt = await page.locator('.riesgo').allTextContents();
  const conPct = fichasTxt.filter((t) => /\b\d{1,3}\s?%/.test(t));
  ok('Ninguna ficha de riesgo contiene porcentajes', conPct.length === 0, conPct.slice(0, 1).join('').slice(0, 100));
  ok('Declara "sin estimación fiable" donde procede', cuerpoR.includes('Sin estimación fiable') || cuerpoR.includes('NO EXISTE UNA ESTIMACIÓN FIABLE'));
  await page.click('#rz button[data-z="europa"]');
  await page.waitForTimeout(400);
  ok('Cambio de zona a Europa', (await page.locator('.riesgo').count()) >= 10);
  await page.goto(BASE + '#/riesgos/comparar');
  await page.waitForSelector('table.cmp');
  ok('Comparador con 3 ubicaciones', (await page.locator('table.cmp thead th').count()) === 4);
  ok('Comparador marca lo pendiente de verificar', (await page.textContent('table.cmp')).includes('pend.'));

  /* --------------------- 9 quater. NUEVO: Familia --------------------- */
  console.log('\n▸ Centro de coordinación familiar');
  await page.goto(BASE + '#/sec/familia');
  await page.waitForSelector('#fa-estado .row');
  ok('Tres nodos familiares', (await page.locator('#fa-estado .row').count()) === 3);
  const txtFam = await page.textContent('body');
  ok('Incluye Ávila, Terrassa y Getafe', txtFam.includes('Ávila') && txtFam.includes('Terrassa') && txtFam.includes('Getafe'));
  await page.locator('[data-est="terrassa"]').click();
  await page.waitForTimeout(200);
  await page.locator('[data-se="ayuda"]').click();
  await page.waitForTimeout(300);
  ok('Estado familiar manual se guarda', (await page.textContent('#fa-estado')).includes('Necesito ayuda'));

  await page.goto(BASE + '#/familia/rutas');
  await page.waitForSelector('.ruta');
  ok('Tres rutas por corredor', (await page.locator('.ruta').count()) === 3);
  const txtRuta = await page.textContent('body');
  ok('La ruta lista localidades reales', txtRuta.includes('Zaragoza') && txtRuta.includes('Lleida') && txtRuta.includes('Medinaceli'));
  ok('Distancia Ávila–Terrassa realista', /6[0-9]{2} km/.test(txtRuta), txtRuta.match(/\d+ km/)?.[0]);
  ok('Advierte que el estado de las vías es desconocido', txtRuta.includes('REFERENCIA DE PLANIFICACIÓN'));
  await page.selectOption('#ru-sit', 'nieve');
  await page.waitForTimeout(300);
  ok('La situación cambia la información', (await page.textContent('#ru-out')).includes('quitanieves'));
  await page.selectOption('#ru-cor', 'getafe');
  await page.waitForTimeout(300);
  ok('Corredor a Getafe', (await page.textContent('#ru-out')).includes('Getafe'));

  await page.goto(BASE + '#/familia/ir');
  await page.waitForSelector('#w-quien button');
  await page.locator('#w-quien button').first().click();
  await page.locator('#w-sent button[data-s="ida"]').click();
  await page.locator('#w-sit button[data-s="incendio"]').click();
  await page.click('#w-go');
  await page.waitForSelector('#w-out .ruta', { timeout: 10000 });
  ok('Asistente "llegar a mi familia" genera plan', (await page.locator('#w-out .ruta').count()) === 3);

  await page.goto(BASE + '#/familia/plan72');
  await page.waitForSelector('.card .kv');
  ok('Plan 72 h calcula por ubicación', (await page.textContent('body')).includes('litros'));

  await page.goto(BASE + '#/familia/offline');
  await page.waitForSelector('.sim');
  await page.uncheck('#s-net'); await page.uncheck('#s-gps');
  await page.waitForTimeout(200);
  ok('Simulador sin Internet ni GPS responde', (await page.textContent('#s-out')).includes('Sin GPS'));
  ok('Explica GPS con y sin Internet', (await page.textContent('body')).includes('GNSS'));

  await page.goto(BASE + '#/familia/mapa');
  await page.waitForSelector('#map.leaflet-container', { timeout: 15000 });
  await page.waitForTimeout(1800);
  ok('Mapa familiar dibuja nodos', (await page.locator('.fmk').count()) === 3);
  await page.selectOption('#mf-cor', 'terrassa');
  await page.waitForTimeout(900);
  ok('Mapa familiar dibuja las rutas', (await page.locator('#map path').count()) > 40);

  /* ------------------------------ 10. Mapa ------------------------------ */
  console.log('\n▸ Mapa offline');
  await page.goto(BASE + '#/mapa');
  await page.waitForSelector('#map.leaflet-container', { timeout: 15000 });
  await page.waitForTimeout(1500);
  ok('Leaflet inicializado', (await page.locator('.leaflet-container').count()) === 1);
  const paths = await page.locator('#map path').count();
  ok('Capa vectorial IGN dibujada', paths > 40, `(${paths} polígonos)`);
  ok('Control de capas presente', (await page.locator('.leaflet-control-layers').count()) === 1);

  // REGRESIÓN: el vectorial se pintaba con relleno casi opaco ENCIMA de las
  // teselas, así que España aparecía como un manchón oscuro mientras el resto
  // del mundo se veía bien. Con capa ráster activa NO debe haber relleno.
  const rellenos = await page.locator('#map path').evaluateAll((els) =>
    els.map((e) => parseFloat(e.getAttribute('fill-opacity') || '0')));
  const opacos = rellenos.filter((v) => v > 0.3).length;
  ok('Con teselas activas el vectorial NO tapa el mapa', opacos === 0, `(${opacos} polígonos con relleno opaco)`);
  ok('Ávila sigue resaltada pero translúcida', rellenos.some((v) => v > 0 && v <= 0.2), JSON.stringify([...new Set(rellenos)]));

  // Al pasar a "Solo vectorial" el relleno vuelve, que es lo que hace legible
  // el mapa cuando no hay teselas debajo.
  await page.click('.leaflet-control-layers');
  await page.waitForTimeout(200);
  const radios = page.locator('.leaflet-control-layers-base input[type="radio"]');
  await radios.last().check();
  await page.waitForTimeout(500);
  const rellenos2 = await page.locator('#map path').evaluateAll((els) =>
    els.map((e) => parseFloat(e.getAttribute('fill-opacity') || '0')));
  ok('En modo solo vectorial el relleno vuelve', rellenos2.filter((v) => v > 0.5).length > 40,
    `(${rellenos2.filter((v) => v > 0.5).length})`);

  /* ------------------------ 10 bis. Audio offline ------------------------ */
  console.log('\n▸ Audio offline');
  await page.goto(BASE + '#/sec/audio');
  await page.waitForSelector('#au-file');
  ok('Sección de audio disponible', (await page.locator('#au-file').count()) === 1);
  const txtAudio = await page.textContent('body');
  ok('Explica que no descarga de plataformas de streaming', /no descarga audio de YouTube/i.test(txtAudio));
  ok('Indica dónde conseguir música legal', /Biblioteca de audio de YouTube/i.test(txtAudio));

  // Se inyecta un WAV mínimo generado en el propio navegador.
  await page.evaluate(async () => {
    const st = await import('./assets/js/store.js');
    const seg = 1, sr = 8000, n = sr * seg;
    const buf = new ArrayBuffer(44 + n * 2), dv = new DataView(buf);
    const wr = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
    wr(0, 'RIFF'); dv.setUint32(4, 36 + n * 2, true); wr(8, 'WAVEfmt ');
    dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
    dv.setUint32(24, sr, true); dv.setUint32(28, sr * 2, true); dv.setUint16(32, 2, true);
    dv.setUint16(34, 16, true); wr(36, 'data'); dv.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) dv.setInt16(44 + i * 2, Math.sin(i / 12) * 8000, true);
    const blob = new Blob([buf], { type: 'audio/wav' });
    await st.put('audio', { id: 'test1', nombre: 'Punto de encuentro', tipo: 'audio/wav', tam: blob.size, dur: 1, cat: 'voz', blob, ts: Date.now() });
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('#au-lista .row');
  ok('El audio guardado aparece en la lista', (await page.textContent('#au-lista')).includes('Punto de encuentro'));
  ok('Muestra el espacio ocupado', /Archivos/.test(await page.textContent('#au-espacio')));
  await page.click('[data-play="0"]');
  await page.waitForTimeout(600);
  ok('El reproductor se abre al pulsar play', !(await page.locator('#au-player').isHidden()));
  ok('Reproduce desde IndexedDB con blob:', (await page.getAttribute('#au-el', 'src') || '').startsWith('blob:'));
  ok('El audio NO entra en la sincronización', await page.evaluate(async () => {
    const st = await import('./assets/js/store.js');
    return !st.SYNC_STORES.includes('audio');
  }));

  /* ------------------------- 11. Ajustes / temas ------------------------- */
  console.log('\n▸ Configuración, temas y copias');
  await page.goto(BASE + '#/sec/config');
  await page.waitForSelector('#cfg-theme');
  await page.selectOption('#cfg-theme', 'night');
  await page.waitForTimeout(200);
  ok('Modo noche aplicado', (await page.getAttribute('html', 'data-theme')) === 'night');
  await page.selectOption('#cfg-fs', 'xl'); await page.waitForTimeout(150);
  ok('Tamaño de texto XL', (await page.getAttribute('html', 'data-fs')) === 'xl');
  await page.selectOption('#cfg-theme', 'dark'); await page.selectOption('#cfg-fs', 'm');
  ok('Estado del Service Worker mostrado', (await page.textContent('body')).includes('Service Worker'));

  const dl = page.waitForEvent('download', { timeout: 8000 });
  await page.click('#cfg-export');
  const file = await dl;
  ok('Exportación descarga un JSON', file.suggestedFilename().endsWith('.json'));

  /* --------------------- 12. Service Worker + OFFLINE --------------------- */
  console.log('\n▸ PRUEBA OFFLINE REAL');
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  ok('Service Worker registrado y listo', true);

  // Precachea todo desde la propia app
  await page.goto(BASE + '#/sec/config');
  await page.waitForSelector('#cfg-precache');
  await page.click('#cfg-precache');
  await page.waitForFunction(() => document.querySelector('#cfg-swlog')?.textContent.includes('recursos guardados'), null, { timeout: 30000 });
  const swlog = await page.textContent('#cfg-swlog');
  ok('Precache completo desde la app', swlog.includes('recursos guardados'), swlog);

  // Corta la red de verdad
  await ctx.setOffline(true);
  await page.goto(BASE + '#/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.tile.sos', { timeout: 15000 });
  ok('SIN RED: la portada carga', await page.locator('.tile.sos').isVisible());
  ok('SIN RED: indicador OFFLINE', (await page.textContent('#netbadge')) === 'SIN CONEXIÓN');

  await page.goto(BASE + '#/emergencia/incendio-forestal', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.qcard', { timeout: 10000 });
  ok('SIN RED: escenario de emergencia completo', (await page.locator('#emg-body .steps li').count()) > 5);

  await page.goto(BASE + '#/buscar', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#q');
  await page.fill('#q', 'hipotermia'); await page.waitForTimeout(400);
  ok('SIN RED: el buscador funciona', (await page.locator('#res .row').count()) >= 1);

  await page.goto(BASE + '#/mapa', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#map.leaflet-container', { timeout: 15000 });
  await page.waitForTimeout(1500);
  const offPaths = await page.locator('#map path').count();
  ok('SIN RED: mapa vectorial IGN operativo', offPaths > 40, `(${offPaths} polígonos)`);

  await page.goto(BASE + '#/check/bob', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.chk-item');
  ok('SIN RED: checklists disponibles', (await page.locator('.chk-item').count()) > 20);

  await page.goto(BASE + '#/sec/avila', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('h1');
  ok('SIN RED: sección Ávila', (await page.locator('.list .row').count()) >= 4);

  await ctx.setOffline(false);

  /* ------------- 12 bis. EL HOSTING CAE (Netlify no responde) ------------- */
  // Escenario distinto a "no hay red": el dispositivo SÍ tiene Internet, pero
  // el servidor está caído, devuelve errores o el dominio ya no existe.
  console.log('\n▸ HOSTING CAÍDO (con Internet en el dispositivo)');

  // a) Servidor apagado → conexión rechazada
  srv.kill();
  await new Promise((r) => setTimeout(r, 700));
  await page.goto(BASE + '#/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.tile.sos', { timeout: 15000 });
  ok('SERVIDOR APAGADO: la app arranca igual', await page.locator('.tile.sos').isVisible());
  await page.goto(BASE + '#/emergencia/apagon', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.qcard', { timeout: 10000 });
  ok('SERVIDOR APAGADO: escenarios accesibles', (await page.locator('.qcard li').count()) >= 4);

  // b) Servidor devolviendo 500 en todo (caso peor: el fetch "tiene éxito")
  const { createServer } = await import('node:http');
  const roto = createServer((_q, s) => { s.writeHead(500, { 'Content-Type': 'text/html' }); s.end('<h1>502 Bad Gateway</h1>'); });
  await new Promise((r) => roto.listen(PORT, r));
  await page.goto(BASE + '#/sec/avila', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('h1', { timeout: 15000 });
  const txt500 = await page.textContent('body');
  ok('SERVIDOR EN ERROR 500: no se sirve la página de error', !txt500.includes('Bad Gateway'));
  ok('SERVIDOR EN ERROR 500: contenido real desde caché', (await page.locator('.list .row').count()) >= 4);
  await new Promise((r) => roto.close(r));

  // Se vuelve a levantar el servidor: la sección anterior lo apagó a propósito.
  const srv2 = spawn(process.execPath, [path.join(ROOT, 'tools/serve.mjs')], {
    env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore',
  });
  await new Promise((r) => setTimeout(r, 800));

  /* ------ 12 ter. LOS DATOS SOBREVIVEN A UNA ACTUALIZACIÓN DE LA APP ------ */
  // Escenario real: el usuario tiene la versión anterior instalada con sus
  // datos y se despliega una nueva. La caché de archivos se renueva; IndexedDB
  // NO debe tocarse.
  console.log('\n▸ Persistencia frente a una actualización de versión');
  const swPath = path.join(ROOT, 'public/sw.js');
  const swOriginal = fs.readFileSync(swPath, 'utf8');
  try {
    await page.goto(BASE + '#/check/nivel2', { waitUntil: 'networkidle' });
    await page.waitForSelector('.chk-item');
    await page.locator('.chk-item').nth(1).locator('button[data-s="comprar"]').click();
    await page.waitForTimeout(300);
    await page.goto(BASE + '#/sec/familia');
    await page.waitForSelector('#fa-nodos details');
    await page.locator('#fa-nodos details').nth(1).click();
    await page.waitForTimeout(200);
    await page.fill('[data-f="1::tel"]', '600111222');
    await page.waitForTimeout(600);

    fs.writeFileSync(swPath, swOriginal.replace(/const VERSION = '[^']+'/, "const VERSION = '9.9.9-test'"));
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r?.update(); });
    await page.waitForTimeout(2500);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const claves = await page.evaluate(() => caches.keys());
    ok('La caché se renueva con la versión nueva', claves.some((k) => k.includes('9.9.9-test')), claves.join(','));
    ok('Solo quedan las cachés de la versión activa', claves.every((k) => k.includes('9.9.9-test')), claves.join(','));

    await page.goto(BASE + '#/check/nivel2');
    await page.waitForSelector('.chk-item');
    ok('TRAS ACTUALIZAR: el checklist conserva las marcas',
      (await page.locator('.chk-item').nth(1).locator('button[data-s="comprar"]').getAttribute('aria-pressed')) === 'true');
    await page.goto(BASE + '#/sec/familia');
    await page.waitForSelector('#fa-nodos details');
    await page.locator('#fa-nodos details').nth(1).click();
    await page.waitForTimeout(300);
    ok('TRAS ACTUALIZAR: los datos familiares siguen ahí',
      (await page.inputValue('[data-f="1::tel"]')) === '600111222');
  } finally {
    fs.writeFileSync(swPath, swOriginal);
  }

  /* --------------------------- 13. Escritorio --------------------------- */
  console.log('\n▸ Escritorio');
  const dctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const dpage = await dctx.newPage();
  dpage.on('pageerror', (e) => consoleErrors.push('desktop pageerror: ' + e.message));
  await dpage.goto(BASE, { waitUntil: 'networkidle' });
  await dpage.waitForSelector('.tile.sos');
  ok('Escritorio: portada correcta', await dpage.locator('.tile.sos').isVisible());
  await dpage.goto(BASE + '#/sec/manual');
  await dpage.waitForSelector('details');
  ok('Escritorio: índice del manual', (await dpage.locator('details').count()) >= 8);
  await dctx.close();
  srv2.kill();

  /* --------------------- 13 bis. Ubicación y territorio --------------------- */
  console.log('\n▸ Ámbito MI ZONA: ubicación y planificación oficial');

  // La correspondencia provincia → comunidad se genera por geometría. Se
  // vuelve a comprobar aquí para que un cambio de cartografía no la rompa
  // en silencio.
  const idx = await page.evaluate(async () => {
    const m = await import('./data/content/territorio-idx.js');
    const cuenta = {};
    for (const p of m.PROVINCIAS) cuenta[p.ccaa] = (cuenta[p.ccaa] || 0) + 1;
    return { n: m.PROVINCIAS.length, cuenta, ccaa: Object.keys(m.CCAA_NOMBRE).length,
             huerfanas: m.PROVINCIAS.filter((p) => !m.CCAA_NOMBRE[p.ccaa]).map((p) => p.nombre) };
  });
  ok('Están las 50 provincias más Ceuta y Melilla', idx.n === 52, `son ${idx.n}`);
  ok('19 comunidades y ciudades autónomas', idx.ccaa === 19, `son ${idx.ccaa}`);
  ok('Ninguna provincia sin comunidad asignada', idx.huerfanas.length === 0, idx.huerfanas.join(','));
  ok('Castilla y León tiene 9 provincias', idx.cuenta['07'] === 9, String(idx.cuenta['07']));
  ok('Andalucía tiene 8 provincias', idx.cuenta['01'] === 8, String(idx.cuenta['01']));
  ok('Canarias tiene 2 provincias', idx.cuenta['05'] === 2, String(idx.cuenta['05']));

  // Punto-en-polígono: el punto interior de cada provincia debe resolverse a
  // esa misma provincia. Es la prueba más dura que se le puede hacer al
  // resolutor sin inventar coordenadas.
  const pip = await page.evaluate(async () => {
    const u = await import('./assets/js/ubicacion.js');
    const malas = [];
    for (const p of u.PROVINCIAS) {
      const r = await u.resolverPunto(p.centro[0], p.centro[1]);
      if (!r || r.cod !== p.cod) malas.push(`${p.nombre}→${r ? r.nombre : 'null'}`);
    }
    const paris = await u.resolverPunto(2.3522, 48.8566);
    const atlantico = await u.resolverPunto(-20, 40);
    const avila = await u.resolverPunto(-4.6813, 40.6565);
    return { malas, paris, atlantico, avila: avila && avila.cod, avilaCcaa: avila && avila.ccaaNombre };
  });
  ok('Cada provincia se resuelve a sí misma', pip.malas.length === 0, pip.malas.slice(0, 4).join(' | '));
  ok('Un punto en París no devuelve provincia española', pip.paris === null);
  ok('Un punto en pleno Atlántico no devuelve provincia', pip.atlantico === null);
  ok('La ciudad de Ávila cae en la provincia de Ávila', pip.avila === '05', String(pip.avila));
  ok('Y su comunidad es Castilla y León', pip.avilaCcaa === 'Castilla y León', String(pip.avilaCcaa));

  // Integridad de los datos territoriales.
  const terr = await page.evaluate(async () => {
    const t = await import('./data/content/territorios.js');
    const { RIESGOS } = await import('./data/content/riesgos.js');
    const ids = new Set(RIESGOS.map((r) => r.id));
    const malRiesgo = [], malUrl = [], sinV = [], cifras = [];
    const revisa = (p, donde) => {
      if (p.r !== null && p.r !== undefined && !ids.has(p.r)) malRiesgo.push(donde + ':' + p.r);
      if (p.url && !/^https:\/\//.test(p.url)) malUrl.push(donde + ':' + p.url);
      if (p.v !== 1 && p.v !== 2) sinV.push(donde);
    };
    for (const p of t.ESTATAL.planes) revisa(p, 'estatal');
    for (const [cod, c] of Object.entries(t.CCAA)) {
      for (const p of c.pe) revisa(p, cod);
      for (const r of c.sp) if (!ids.has(r)) malRiesgo.push(cod + ':sp:' + r);
      const txt = JSON.stringify(c);
      if (/\d+\s?%/.test(txt)) cifras.push(cod);
    }
    return { malRiesgo, malUrl, sinV, cifras, nCcaa: Object.keys(t.CCAA).length,
             aviso: t.AVISO_TERRITORIOS.length };
  });
  ok('Los 19 territorios tienen ficha de planificación', terr.nCcaa === 19, String(terr.nCcaa));
  ok('Todo plan apunta a un riesgo real de la app', terr.malRiesgo.length === 0, terr.malRiesgo.slice(0, 4).join(' | '));
  ok('Todos los enlaces oficiales son https', terr.malUrl.length === 0, terr.malUrl.slice(0, 3).join(' | '));
  ok('Todo plan declara su nivel de confirmación', terr.sinV.length === 0, terr.sinV.slice(0, 4).join(' | '));
  ok('Ningún porcentaje en los datos territoriales', terr.cifras.length === 0, terr.cifras.join(','));
  ok('El aviso sobre qué significa un plan siempre acompaña al dato', terr.aviso > 100);

  // La vista.
  await page.goto(BASE + '#/sec/riesgos', { waitUntil: 'networkidle' });
  await page.waitForSelector('#rz button', { timeout: 8000 });
  ok('Existe el ámbito MI ZONA', await page.locator('#rz button[data-z="mizona"]').count() === 1);

  await page.locator('#rz button[data-z="mizona"]').click();
  await page.waitForSelector('#ubi', { timeout: 5000 });
  ok('Al elegir MI ZONA aparece el panel de ubicación', await page.locator('#ubi').isVisible());
  ok('Se puede elegir la provincia a mano', await page.locator('#ubi-sel option').count() >= 53);
  ok('Sin ubicación no se muestra ninguna ficha de riesgo', await page.locator('#r-list .riesgo').count() === 0);

  // Una provincia SIN evaluación propia: aviso claro + datos estatales.
  await page.selectOption('#ubi-sel', '46'); // Valencia
  await page.waitForTimeout(700);
  const txtVal = await page.locator('#r-list').innerText();
  ok('Se avisa de que no hay evaluación específica para esa provincia', /Sin evaluación específica/i.test(txtVal));
  ok('Aun así se muestra la evaluación de ámbito España', (await page.locator('#r-list .riesgo').count()) > 5);
  ok('Se listan los planes oficiales del territorio', (await page.locator('#r-list .terr').count()) > 5);
  ok('Aparece el plan autonómico correspondiente', /Comunitat Valenciana|PTECV|Plan Especial/i.test(txtVal));
  ok('Se distingue lo confirmado de lo pendiente', /pendiente de confirmar|oficial/i.test(txtVal));

  // Ávila SÍ tiene evaluación propia: no debe salir el aviso.
  await page.selectOption('#ubi-sel', '05');
  await page.waitForTimeout(700);
  const txtAvi = await page.locator('#r-list').innerText();
  ok('En Ávila no se avisa de falta de evaluación', !/Sin evaluación específica/i.test(txtAvi));
  ok('En Ávila se citan los planes de Castilla y León', /Castilla y León/i.test(txtAvi));

  // Persistencia: la provincia sobrevive a una recarga, las coordenadas no
  // se guardan en ningún sitio.
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('#ubi', { timeout: 8000 });
  ok('La ubicación elegida se recuerda tras recargar', /Ávila/i.test(await page.locator('#ubi').innerText()));
  const guardado = await page.evaluate(async () => {
    const s = await import('./assets/js/store.js');
    return JSON.stringify((await s.get('kv', 'ubicacion'))?.v || {});
  });
  ok('Solo se guarda el código de provincia y el modo', /"cod":"05"/.test(guardado) && /"modo":"manual"/.test(guardado), guardado);
  ok('No se guarda ninguna coordenada', !/lat|lon|coord|accuracy|precision/i.test(guardado), guardado);

  /* ------------------------------ 14. Consola ------------------------------ */
  console.log('\n▸ Errores de consola');
  const relevantes = consoleErrors.filter((e) =>
    !/favicon|ERR_INTERNET_DISCONNECTED|ERR_TUNNEL_CONNECTION_FAILED|ERR_NAME_NOT_RESOLVED|Failed to fetch|tile\.|opentopomap|ERR_FAILED/i.test(e)
  );
  ok('Sin errores de consola relevantes', relevantes.length === 0, relevantes.slice(0, 5).join(' | '));

} catch (e) {
  fail++;
  console.error('\n💥 Excepción durante las pruebas:', e.message);
  errors.push('Excepción: ' + e.message);
} finally {
  await browser.close();
  try { srv.kill(); } catch {}
}

console.log(`\n${'─'.repeat(60)}\nRESULTADO: ${pass} correctas · ${fail} fallidas`);
if (fail) { console.log('\nFallos:\n' + errors.map((e) => ' · ' + e).join('\n')); process.exit(1); }
console.log('Todas las pruebas han pasado.\n');
