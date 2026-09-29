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

let srv2 = null;   // segundo servidor (tras la prueba de hosting caído); se para siempre en finally
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
page.on('dialog', (d) => d.accept());

// Teselas del IGN simuladas: las pruebas no dependen de Internet ni del
// estado del servidor. Con `ignCaido = true` se simula el servidor caído.
const PNG_1PX = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
let ignCaido = false;
await ctx.route('https://www.ign.es/**', (route) => {
  if (ignCaido) return route.abort();
  return route.fulfill({ status: 200, contentType: 'image/png', body: PNG_1PX, headers: { 'Access-Control-Allow-Origin': '*' } });
});

const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));

try {
  /* ------------------------------ 1. Carga ------------------------------ */
  console.log('\n▸ Carga inicial y app shell');
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('.tile.sos', { timeout: 10000 });
  ok('Portada renderiza el botón de emergencia', await page.locator('.tile.sos').isVisible());
  const enlacesPortada = await page.locator('#app a[href^="#/sec/"], #app a[href="#/mapa"]').count();
  ok('Se muestran todas las secciones', enlacesPortada >= 25, `(${enlacesPortada})`);
  ok('Portada: nombre visible SUPERVIVENCIA', (await page.textContent('.brand h1')).trim() === 'SUPERVIVENCIA');
  ok('Portada: cuatro bloques (SOS y búsqueda · Mi plan · Manual · Más)', (await page.locator('.home-bloque').count()) === 4
    && /Mi plan y herramientas/i.test(await page.textContent('#h-plan')) && /Manual/i.test(await page.textContent('#h-manual')) && /Más/i.test(await page.textContent('#h-mas')));
  ok('Portada: SOS, 112 y buscador en la primera pantalla', await page.evaluate(() => ['.tile.sos', '.home-112', '.home-buscar'].every((s) => document.querySelector(s).getBoundingClientRect().bottom <= innerHeight)));
  ok('Portada: el 112 es una llamada directa', (await page.getAttribute('.home-112', 'href')) === 'tel:112');
  ok('Portada: sin tarjeta propia de «Plan familiar»', (await page.locator('#app a[href="#/sec/plan-familiar"]').count()) === 0);
  ok('Portada: Familia accesible desde «Mi plan»', (await page.locator('.home-bloque .grid a[href="#/sec/familia"]').count()) === 1);
  ok('Título correcto', (await page.title()).includes('SUPERVIVENCIA'));

  /* --------------------------- 2. Modo emergencia --------------------------- */
  console.log('\n▸ Modo emergencia');
  await page.click('.tile.sos');
  await page.waitForSelector('.btn-112');
  ok('Lista de escenarios', (await page.locator('.list .row').count()) === 20);
  const b112 = page.locator('.sos-llamar a.btn-112');
  ok('SOS: botón para llamar al 112 visible arriba', await b112.isVisible());
  ok('SOS: el botón usa el enlace estándar tel:112', (await b112.getAttribute('href')) === 'tel:112');
  ok('SOS: el botón tiene nombre accesible', /112/.test(await b112.getAttribute('aria-label') || ''));
  const cajaB = await b112.boundingBox();
  ok('SOS: el botón es grande (≥ 64 px de alto)', cajaB && cajaB.height >= 64, `(${cajaB?.height})`);
  ok('SOS: el 112 está antes que cualquier protocolo', await page.evaluate(() => {
    const b = document.querySelector('.btn-112'), m = document.querySelector('.sos-med'), r = document.querySelector('.sos .row');
    return b.compareDocumentPosition(m) & Node.DOCUMENT_POSITION_FOLLOWING && m.compareDocumentPosition(r) & Node.DOCUMENT_POSITION_FOLLOWING;
  }));
  const meds = await page.locator('.sos-med').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
  ok('SOS: cinco accesos sanitarios', meds.length === 5, JSON.stringify(meds));
  for (const [id, art, texto] of [
    ['parada-cardiaca', 'pa-rcp', /30 compresiones/], ['hemorragia', 'pa-hemorragias', /Presión directa/],
    ['atragantamiento', 'pa-atragantamiento', /golpes/], ['infarto', 'pa-infarto', /dolor torácico/i], ['ictus', 'pa-ictus', /Asimetría facial/],
  ]) {
    await page.goto(BASE + '#/emergencia/sanitaria/' + id);
    await page.waitForSelector('.emg-hd');
    const txt = await page.textContent('#app');
    ok(`SOS sanitaria «${id}»: contenido del artículo y 112`, texto.test(txt) && (await page.locator('a[href="tel:112"]').count()) >= 1);
    ok(`SOS sanitaria «${id}»: enlaza al artículo original`, (await page.locator(`a[href="#/art/${art}"]`).count()) === 1);
  }
  ok('Infarto e ictus avisan de que están pendientes de ampliar', /PENDIENTE DE AMPLIAR/.test(await page.textContent('#app')));
  ok('Infarto e ictus muestran arriba el aviso de ficha incompleta', (await page.locator('.emg-hd + .aviso-revision').count()) === 1);
  await page.goto(BASE + '#/emergencia');
  await page.waitForSelector('.sos-med');
  ok('En SOS, solo infarto e ictus se marcan como incompletas', (await page.locator('.sos-med .rev').count()) === 2);
  await page.goto(BASE + '#/art/pa-varios');
  await page.waitForSelector('h1');
  ok('Infarto e ictus ya no están escondidos en «Fracturas…»', !/Asimetría facial/.test(await page.textContent('#app')));
  await page.goto(BASE + '#/emergencia');
  await page.waitForSelector('.btn-112');
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
  await page.focus('.tabs button[data-t="ev"]');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(100);
  ok('Pestañas navegables con el teclado', (await page.getAttribute('.tabs button[data-t="ahora"]', 'aria-selected')) === 'true');
  ok('Barra fija del 112 en la ficha', await page.locator('.sos-bar a[href="tel:112"]').isVisible());

  // Pestañas en distintos tamaños: las seis visibles, sin desplazamiento horizontal.
  for (const [nombre, opts] of [
    ['móvil pequeño 320 px', { viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true }],
    ['Android', devices['Pixel 7']],
    ['iPhone', devices['iPhone 13']],
    ['móvil en horizontal', devices['Pixel 7 landscape']],
    ['escritorio', { viewport: { width: 1280, height: 800 } }],
  ]) {
    const c = await browser.newContext(opts);
    const pg = await c.newPage();
    await pg.goto(BASE + '#/emergencia/incendio-forestal');
    await pg.waitForSelector('.tabs-sos');
    const r = await pg.evaluate(() => {
      const bs = [...document.querySelectorAll('.tabs-sos button')];
      return {
        n: bs.length,
        dentro: bs.every((b) => { const x = b.getBoundingClientRect(); return x.left >= 0 && x.right <= innerWidth + 1 && x.width > 40; }),
        scroll: document.documentElement.scrollWidth - innerWidth,
      };
    });
    await pg.click('.tabs-sos button[data-t="no"]');
    const noOk = (await pg.locator('#emg-body .steps.no li').count()) > 3;
    ok(`Pestañas SOS en ${nombre}: las 6 visibles y «No hacer» usable`, r.n === 6 && r.dentro && r.scroll <= 0 && noOk, JSON.stringify(r));
    await c.close();
  }

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
  ok('Sin resultados ofrece alternativas y acceso a SOS', (await page.locator('.sr-empty [data-sug]').count()) >= 3 && (await page.locator('.sr-empty a[href="#/emergencia"]').count()) === 1);
  await page.fill('#q', 'sangra mucho'); await page.waitForTimeout(350);
  ok('Buscar "sangra mucho" da primero hemorragia', /hemorragia/i.test(await page.locator('#res .row b').first().textContent()));
  ok('Los resultados muestran categoría, fragmento y motivo', (await page.locator('#res .row .cat').count()) > 0 && (await page.locator('#res .row mark').count()) > 0 && (await page.locator('#res .row .por').count()) > 0);
  ok('Filtros por tipo de resultado', (await page.locator('#fb button').count()) >= 2);
  await page.click('#fb button[data-f="manual"]'); await page.waitForTimeout(150);
  ok('El filtro Manual solo deja artículos', (await page.locator('#res .row .cat').allTextContents()).every((t) => /manual/i.test(t)));
  await page.fill('#q', 'corte de luz'); await page.waitForTimeout(350);
  ok('Buscar "corte de luz" da primero el apagón', /apag/i.test(await page.locator('#res .row b').first().textContent()));
  await page.locator('#res .row').first().click();
  await page.waitForSelector('.qcard');
  await page.goBack();
  await page.waitForSelector('#res .row');
  ok('Al volver atrás se conserva la búsqueda', (await page.inputValue('#q')) === 'corte de luz');
  // Escribir y salir enseguida: la búsqueda pendiente no debe reescribir la dirección.
  await page.fill('#q', 'hipotermia');
  await page.evaluate(() => { location.hash = '#/sec/agua'; });
  await page.waitForTimeout(400);
  ok('Salir del buscador con una búsqueda pendiente no cambia la pantalla nueva', (await page.evaluate(() => location.hash)) === '#/sec/agua');
  await page.goto(BASE + '#/buscar');
  await page.waitForSelector('#q');
  await page.fill('#q', 'hemoragia'); await page.waitForTimeout(400);
  ok('Una errata se corrige sola y muestra resultados', (await page.locator('.corregida').count()) === 1 && /hemorragia/i.test(await page.locator('#res .row b').first().textContent()));

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

  // Diseño para el pulgar: tocar el texto marca «tengo».
  const segunda = page.locator('.chk-item').nth(1);
  await segunda.locator('.chk-main .lbl').click();
  await page.waitForTimeout(250);
  ok('Checklist: tocar el texto del elemento lo marca', (await segunda.locator('.chk-main').getAttribute('aria-pressed')) === 'true' && (await page.textContent('#ck-n')) === '2');
  await segunda.locator('.chk-main .lbl').click();
  await page.waitForTimeout(250);
  ok('Checklist: volver a tocarlo lo desmarca', (await page.textContent('#ck-n')) === '1');
  const tallas = await page.$$eval('.chk-grupo[open] .chk-item button, .chk-grupo > summary', (bs) => bs.filter((b) => b.getBoundingClientRect().height > 0).map((b) => Math.round(Math.min(b.getBoundingClientRect().height, b.getBoundingClientRect().width))));
  ok('Checklist: todos los controles visibles miden ≥ 44 px', tallas.length > 10 && tallas.every((t) => t >= 44), `mín ${Math.min(...tallas)}`);
  ok('Checklist: grupos plegables con su progreso', (await page.locator('.chk-grupo').count()) >= 4 && /\d+\/\d+/.test(await page.locator('.chk-grupo .gp').first().textContent()));
  const pantallasChk = await page.evaluate(() => document.documentElement.scrollHeight / innerHeight);
  ok('Checklist: la lista ya no ocupa 14 pantallas', pantallasChk < 5, pantallasChk.toFixed(1));
  ok('Checklist: la fecha no ocupa sitio si no se usa', (await segunda.locator('.chk-fecha').isHidden()));
  await segunda.locator('.chk-cad').click();
  const hoy = new Date(); const pronto = new Date(hoy.getTime() + 5 * 86400000).toISOString().slice(0, 10);
  await segunda.locator('.chk-fecha input').fill(pronto);
  await segunda.locator('.chk-fecha input').dispatchEvent('change');
  await page.waitForTimeout(300);
  ok('Checklist: avisa si la fecha está cerca', /Caduca el/.test(await segunda.locator('.chk-aviso').textContent()));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.chk-item');
  ok('Checklist: la fecha guardada se muestra al volver', !(await page.locator('.chk-item').nth(1).locator('.chk-fecha').isHidden()));
  await page.click('#ck-pend');
  ok('Checklist: «Solo pendiente» oculta lo que ya tienes', await page.locator('.chk-item').first().isHidden());
  await page.click('#ck-pend');
  ok('Checklist: «Reiniciar» está al final, lejos de las marcas', await page.evaluate(() => document.querySelector('#ck-clr').getBoundingClientRect().top > document.querySelector('.chk-grupo:last-of-type').getBoundingClientRect().top));
  await page.click('#ck-clr');
  await page.waitForSelector('.toast .toast-accion');
  await page.waitForTimeout(300);
  ok('Checklist: reiniciar sin confirmación y con «Deshacer»', (await page.textContent('#ck-n')) === '0');
  await page.click('.toast-accion');
  await page.waitForTimeout(500);
  ok('Checklist: deshacer recupera las marcas y la fecha', (await page.textContent('#ck-n')) === '1' && !(await page.locator('.chk-item').nth(1).locator('.chk-fecha').isHidden()));

  /* --------------------------- 7. Plan familiar --------------------------- */
  console.log('\n▸ Plan familiar (solo local)');
  await page.goto(BASE + '#/sec/plan-familiar');
  await page.waitForSelector('#k-punto');
  await page.fill('#k-punto', 'Plaza del pueblo, junto a la fuente');
  await page.waitForTimeout(600);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('#k-punto');
  ok('Texto del plan persiste', (await page.inputValue('#k-punto')).includes('Plaza del pueblo'));

  // Borrar y deshacer: un toque no puede hacer perder un contacto.
  await page.locator('summary', { hasText: 'Añadir contacto' }).click();
  await page.fill('#pf-n', 'Contacto externo');
  await page.fill('#pf-t', '600000000');
  await page.click('#pf-go');
  await page.waitForSelector('[data-cdel]');
  const hayContacto = () => page.evaluate(async () => (await (await import('./assets/js/store.js')).all('contactos')).length);
  const lapida = () => page.evaluate(async () => (await (await import('./assets/js/store.js')).all('tombstones')).some((t) => t.store === 'contactos'));
  await page.click('[data-cdel]');
  await page.waitForSelector('.toast .toast-accion');
  ok('Borrar un contacto ofrece «Deshacer» sin pedir confirmación', (await hayContacto()) === 0 && /Deshacer/i.test(await page.textContent('.toast')));
  const cajaDeshacer = await page.locator('.toast-accion').boundingBox();
  ok('El botón «Deshacer» es fácil de pulsar (≥ 44 px)', cajaDeshacer && cajaDeshacer.height >= 44, `(${cajaDeshacer?.height})`);
  await page.click('.toast-accion');
  await page.waitForSelector('[data-cdel]');
  ok('Deshacer recupera el contacto', (await hayContacto()) === 1 && (await page.textContent('#pf-list')).includes('Contacto externo'));
  ok('Deshacer retira la lápida (la sincronización no lo borrará)', !(await lapida()));
  const cajaBorrar = await page.locator('[data-cdel]').boundingBox();
  ok('El botón de borrar mide al menos 44 px', cajaBorrar && cajaBorrar.height >= 44 && cajaBorrar.width >= 44, JSON.stringify(cajaBorrar));

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
  await page.goto(BASE + '#/sec/juegos/calma');
  await page.waitForSelector('#ca-start');
  ok('El enlace «Modo calma» abre directamente esa pestaña', (await page.getAttribute('#jg-tabs [data-t="cal"]', 'aria-selected')) === 'true');

  /* ---- Modo calma: liberación REAL de recursos ----
     Contexto aparte con instrumentación inyectada antes de cargar la app:
       · setInterval/clearInterval → intervalos vivos y número de ticks.
       · window.add/removeEventListener → balance de listeners por tipo.
       · navigator.wakeLock → sustituto que cuenta bloqueos activos y puede
         tardar en concederse (para reproducir salir durante la espera). */
  {
    const cc = await browser.newContext({ ...devices['Pixel 7'] });
    await cc.addInitScript(() => {
      const si = window.setInterval.bind(window), ci = window.clearInterval.bind(window);
      const C = window.__calma = { vivos: new Set(), ticks: 0, locks: 0, locksTotal: 0, retraso: 0, win: {} };
      window.setInterval = (fn, ms, ...a) => { const id = si((...x) => { C.ticks++; return fn(...x); }, ms, ...a); C.vivos.add(id); return id; };
      window.clearInterval = (id) => { C.vivos.delete(id); return ci(id); };
      Object.defineProperty(navigator, 'wakeLock', {
        configurable: true,
        value: { request: () => new Promise((res) => setTimeout(() => {
          const l = { released: false, release: async () => { if (!l.released) { l.released = true; C.locks--; } } };
          C.locks++; C.locksTotal++; res(l);
        }, C.retraso)) },
      });
      const add = window.addEventListener.bind(window), rem = window.removeEventListener.bind(window);
      window.addEventListener = (t, ...r) => { C.win[t] = (C.win[t] || 0) + 1; return add(t, ...r); };
      window.removeEventListener = (t, ...r) => { C.win[t] = (C.win[t] || 0) - 1; return rem(t, ...r); };
    });
    const pc = await cc.newPage();
    const estado = () => pc.evaluate(() => ({ vivos: window.__calma.vivos.size, ticks: window.__calma.ticks, locks: window.__calma.locks, total: window.__calma.locksTotal, win: { ...window.__calma.win } }));
    const fase = () => pc.textContent('#ca-fase');

    await pc.goto(BASE + '#/');
    await pc.waitForSelector('.tile.sos');
    const antes = await estado();

    await pc.goto(BASE + '#/sec/juegos/calma');
    await pc.waitForSelector('#ca-start');
    await pc.click('#ca-start');
    await pc.waitForTimeout(1300);
    let e = await estado();
    ok('Modo calma: al empezar hay un temporizador y la pantalla se mantiene encendida', e.vivos === 1 && e.ticks >= 1 && e.locks === 1 && (await fase()) !== 'LISTO', JSON.stringify(e));

    await pc.goto(BASE + '#/');
    await pc.waitForSelector('.tile.sos');
    await pc.waitForTimeout(200);
    e = await estado();
    ok('Modo calma: al salir no queda ningún intervalo activo', e.vivos === 0, JSON.stringify(e));
    ok('Modo calma: al salir se libera el bloqueo de pantalla', e.locks === 0, JSON.stringify(e));
    const ticks = e.ticks;
    await pc.waitForTimeout(2200);
    ok('Modo calma: el temporizador deja de ejecutarse de verdad', (await estado()).ticks === ticks);
    const despues = await estado();
    const tipos = new Set([...Object.keys(antes.win), ...Object.keys(despues.win)]);
    const desbalance = [...tipos].filter((t) => (antes.win[t] || 0) !== (despues.win[t] || 0));
    ok('Modo calma: no deja listeners de window activos', desbalance.length === 0, desbalance.join(','));

    await pc.goto(BASE + '#/sec/juegos/calma');
    await pc.waitForSelector('#ca-start');
    ok('Modo calma: al volver, la sesión empieza limpia', (await fase()) === 'LISTO');
    await pc.click('#ca-start');
    await pc.waitForTimeout(1300);
    e = await estado();
    ok('Modo calma: al volver se crea una sesión nueva', e.vivos === 1 && e.locks === 1 && e.total === 2 && (await fase()) !== 'LISTO', JSON.stringify(e));
    await pc.click('#ca-stop');
    e = await estado();
    ok('Modo calma: «Parar» libera temporizador y pantalla', e.vivos === 0 && e.locks === 0, JSON.stringify(e));

    await pc.click('#ca-start');
    await pc.waitForTimeout(300);
    await pc.click('#jg-tabs [data-t="ttt"]');
    e = await estado();
    ok('Modo calma: cambiar de pestaña también lo detiene', e.vivos === 0 && e.locks === 0, JSON.stringify(e));

    // Salir MIENTRAS se espera el permiso de pantalla encendida: antes el
    // temporizador arrancaba igualmente después de la limpieza.
    await pc.click('#jg-tabs [data-t="cal"]');
    await pc.evaluate(() => { window.__calma.retraso = 800; });
    await pc.click('#ca-start');
    await pc.goto(BASE + '#/');
    await pc.waitForTimeout(1500);
    e = await estado();
    ok('Modo calma: salir durante la espera no deja nada activo', e.vivos === 0 && e.locks === 0, JSON.stringify(e));

    // Lo mismo en SOS, que también mantiene la pantalla encendida.
    await pc.evaluate(() => { window.__calma.retraso = 0; });
    await pc.goto(BASE + '#/emergencia/apagon');
    await pc.waitForSelector('.qcard');
    await pc.waitForTimeout(200);
    const enSos = (await estado()).locks;
    await pc.goto(BASE + '#/');
    await pc.waitForTimeout(200);
    ok('SOS: mantiene la pantalla encendida y la libera al salir', enSos === 1 && (await estado()).locks === 0, `en SOS ${enSos}`);
    await cc.close();
  }

  // Brújula: solo acepta rumbos referidos al norte.
  await page.goto(BASE + '#/sec/orientacion');
  await page.waitForSelector('#cp-start');
  await page.click('#cp-start');
  await page.evaluate(() => window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', { alpha: 90, absolute: false })));
  await page.waitForTimeout(100);
  ok('Brújula: ignora la orientación relativa (no apunta al norte)', (await page.textContent('#cp-deg')) === '—');
  await page.evaluate(() => window.dispatchEvent(new DeviceOrientationEvent('deviceorientationabsolute', { alpha: 90, absolute: true })));
  await page.waitForTimeout(100);
  ok('Brújula: usa la orientación absoluta', (await page.textContent('#cp-deg')) === '270°', await page.textContent('#cp-deg'));
  await page.evaluate(() => window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', { alpha: 10, absolute: false })));
  await page.waitForTimeout(100);
  ok('Brújula: la relativa no sobrescribe a la absoluta', (await page.textContent('#cp-deg')) === '270°');
  const giro1 = await page.$eval('#cp-rose', (e) => e.style.transform);
  await page.evaluate(() => { for (let i = 0; i < 30; i++) window.dispatchEvent(new DeviceOrientationEvent('deviceorientationabsolute', { alpha: 359, absolute: true })); });
  await page.evaluate(() => { for (let i = 0; i < 30; i++) window.dispatchEvent(new DeviceOrientationEvent('deviceorientationabsolute', { alpha: 1, absolute: true })); });
  const giro2 = await page.$eval('#cp-rose', (e) => parseFloat(e.style.transform.match(/-?[\d.]+/)[0]));
  ok('Brújula: pasar por el norte no da una vuelta completa', Math.abs(giro2) < 400, `${giro1} → ${giro2}`);

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
  await page.waitForSelector('#rz button');
  ok('MI ZONA es el ámbito por defecto', (await page.locator('#rz button[data-z="mizona"]').getAttribute('aria-pressed')) === 'true');
  ok('No hay pestañas fijas de ubicaciones concretas', (await page.locator('#rz button[data-z="avila"]').count()) === 0);
  await page.click('#rz button[data-z="espana"]');
  await page.waitForSelector('.riesgo');
  const nRiesgos = await page.locator('.riesgo').count();
  ok('Fichas de riesgo de ámbito España', nRiesgos >= 15, `(${nRiesgos})`);
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
  await page.waitForSelector('#app h1');
  ok('Comparador sin ubicaciones invita a configurarlas', (await page.textContent('#app')).includes('Configurar ubicaciones'));

  /* --------------------- 9 quater. Centro familiar --------------------- */
  console.log('\n▸ Centro de coordinación familiar');
  await page.goto(BASE + '#/sec/familia');
  await page.waitForSelector('#fa-nodos');
  ok('Sin ubicaciones precargadas', (await page.locator('#fa-estado').count()) === 0 && (await page.textContent('#app')).includes('Configura tu plan familiar'));
  const fuentesApp = await page.evaluate(async () => {
    const txt = [];
    for (const f of ['./data/content/familia.js', './data/content/riesgos.js', './data/content/index.js', './data/content/sources.js', './assets/js/familia.js', './assets/js/riesgos.js']) {
      txt.push(await (await fetch(f)).text());
    }
    return txt.join('\n');
  });
  ok('El código distribuido no contiene los datos personales anteriores', !/\b(terrassa|getafe|carlos)\b|padres de mi pareja/i.test(fuentesApp));

  await page.click('#fa-ejemplo');
  await page.waitForSelector('#fa-estado .row');
  ok('El ejemplo carga dos ubicaciones', (await page.locator('#fa-estado .row').count()) === 2);
  ok('El ejemplo se señala como ficticio', (await page.textContent('#fa-top')).includes('EJEMPLO'));
  await page.click('#fa-borrar-ej');
  await page.waitForSelector('#fa-add-base');
  ok('El ejemplo se puede borrar', (await page.locator('details.nodo').count()) === 0);

  // Configuración propia: una base y un destino, con posición y rutas.
  await page.click('#fa-add-base');
  await page.waitForSelector('details.nodo');
  const nBase = page.locator('details.nodo').nth(0);
  await nBase.locator('[data-f="nombre"]').fill('Casa');
  await nBase.locator('[data-f="cod"]').selectOption('28');
  await nBase.locator('[data-c="lat"]').fill('40.4168');
  await nBase.locator('[data-c="lon"]').fill('-3.7038');
  await page.waitForTimeout(500);
  await page.click('#fa-add');
  await page.waitForTimeout(400);
  const nDest = page.locator('details.nodo').nth(1);
  await nDest.locator('[data-f="nombre"]').fill('Abuelos');
  await nDest.locator('[data-f="persona"]').fill('Abuela');
  await nDest.locator('[data-f="cod"]').selectOption('08');
  await nDest.locator('[data-c="lat"]').fill('41.3874');
  await nDest.locator('[data-c="lon"]').fill('2.1686');
  await nDest.locator('[data-addruta]').click();
  await page.waitForTimeout(300);
  await nDest.locator('[data-r="via"]').first().fill('A-2');
  await nDest.locator('[data-r="km"]').first().fill('620');
  await nDest.locator('[data-addruta]').click();
  await page.waitForTimeout(300);
  await nDest.locator('[data-r="km"]').nth(1).fill('700');
  await page.waitForTimeout(600);
  ok('Solo puede haber una base', (await page.locator('details.nodo .badge', { hasText: 'base' }).count()) === 1);

  // Traza GPX importada para la ruta principal.
  const gpx = `<?xml version="1.0"?><gpx version="1.1" creator="test"><trk><trkseg>
    <trkpt lat="40.4168" lon="-3.7038"/><trkpt lat="41.6488" lon="-0.8891"/><trkpt lat="41.3874" lon="2.1686"/></trkseg></trk></gpx>`;
  await nDest.locator('input[data-importar]').first().setInputFiles({ name: 'ruta.gpx', mimeType: 'application/gpx+xml', buffer: Buffer.from(gpx) });
  await page.waitForTimeout(700);
  ok('Importa una traza GPX para la ruta', (await nDest.locator('[data-traza]').first().textContent()).includes('Traza importada'));

  await page.reload();
  await page.waitForSelector('#fa-estado .row');
  ok('Las ubicaciones se guardan', (await page.locator('#fa-estado .row').count()) === 2);
  await page.locator('#fa-estado [data-est]').nth(1).click();
  await page.waitForTimeout(200);
  await page.locator('[data-se="ayuda"]').click();
  await page.waitForTimeout(300);
  ok('Estado familiar manual se guarda', (await page.textContent('#fa-estado')).includes('Necesito ayuda'));

  // Eliminar una ubicación y deshacer: vuelven la ubicación, sus rutas y su traza.
  await page.locator('details.nodo summary').nth(1).click();
  await page.locator('details.nodo').nth(1).locator('[data-borrar]').click();
  await page.waitForSelector('.toast .toast-accion');
  const trasBorrar = await page.evaluate(async () => {
    const st = await import('./assets/js/store.js');
    return { nodos: (await st.get('kv', 'familia.nodos')).v.length, geo: (await st.all('geo')).length };
  });
  ok('Eliminar ubicación: sin confirmación y con «Deshacer»', trasBorrar.nodos === 1 && trasBorrar.geo === 0, JSON.stringify(trasBorrar));
  await page.click('.toast-accion');
  await page.waitForTimeout(400);
  const trasDeshacer = await page.evaluate(async () => {
    const st = await import('./assets/js/store.js');
    const ns = (await st.get('kv', 'familia.nodos')).v;
    return { nodos: ns.length, rutas: ns[1]?.rutas?.length, geo: (await st.all('geo')).length, estado: (await st.get('kv', 'familia.estados')).v[ns[1].id]?.estado };
  });
  ok('Deshacer recupera la ubicación con sus rutas, traza y estado', trasDeshacer.nodos === 2 && trasDeshacer.rutas === 2 && trasDeshacer.geo === 1 && trasDeshacer.estado === 'ayuda', JSON.stringify(trasDeshacer));

  await page.goto(BASE + '#/familia/rutas');
  await page.waitForSelector('.ruta');
  ok('Muestra las rutas definidas por el usuario', (await page.locator('#ru-out .ruta').count()) === 2);
  const txtRuta = await page.textContent('#ru-out');
  ok('Usa los km anotados y calcula el tiempo', txtRuta.includes('620 km') && /6 h 53 min/.test(txtRuta), txtRuta.match(/\d+ h \d+ min/)?.[0]);
  ok('Indica la distancia en línea recta', /\d+ km en línea recta/.test(txtRuta));
  ok('Advierte que el estado de las vías es desconocido', (await page.textContent('body')).includes('REFERENCIA DE PLANIFICACIÓN'));
  await page.selectOption('#ru-sit', 'nieve');
  await page.waitForTimeout(300);
  ok('La situación cambia la información', (await page.textContent('#ru-out')).includes('quitanieves'));

  await page.goto(BASE + '#/familia/ir');
  await page.waitForSelector('#w-quien button');
  await page.locator('#w-quien button').first().click();
  await page.locator('#w-sent button[data-s="ida"]').click();
  await page.locator('#w-sit button[data-s="incendio"]').click();
  await page.click('#w-go');
  await page.waitForSelector('#w-out .ruta', { timeout: 10000 });
  ok('Asistente "llegar a mi familia" genera plan', (await page.locator('#w-out .ruta').count()) === 2);

  await page.goto(BASE + '#/familia/plan72');
  await page.waitForSelector('.card .kv');
  ok('Plan 72 h calcula por ubicación', (await page.textContent('body')).includes('litros'));

  await page.goto(BASE + '#/familia/reunion');
  await page.waitForSelector('.list .row');
  ok('Reunificación con un punto por ubicación', (await page.locator('.list .row', { hasText: 'PUNTO' }).count()) === 2);

  await page.goto(BASE + '#/familia/offline');
  await page.waitForSelector('.sim');
  await page.uncheck('#s-net'); await page.uncheck('#s-gps');
  await page.waitForTimeout(200);
  ok('Simulador sin Internet ni GPS responde', (await page.textContent('#s-out')).includes('Sin GPS'));
  ok('Explica GPS con y sin Internet', (await page.textContent('body')).includes('GNSS'));

  await page.goto(BASE + '#/familia/mapa');
  await page.waitForSelector('#map.leaflet-container', { timeout: 15000 });
  await page.waitForTimeout(1500);
  ok('Mapa familiar dibuja las ubicaciones', (await page.locator('.fmk').count()) === 2);
  ok('Mapa familiar dibuja la traza importada', (await page.textContent('#mf-st')).includes('1 trazas'));

  await page.goto(BASE + '#/riesgos/comparar');
  await page.waitForSelector('table.cmp');
  ok('Comparador con las ubicaciones del usuario', (await page.locator('table.cmp thead th').count()) === 3);
  const txtCmp = await page.textContent('table.cmp');
  ok('Comparador usa hechos oficiales sin inventar niveles', /plan autonómico|sin plan propio|plan: sin datos/.test(txtCmp) && txtCmp.includes('Ref. España'));

  /* ------------------------------ 10. Mapa ------------------------------ */
  console.log('\n▸ Mapa offline');
  // Provincia elegida en MI ZONA: el mapa la resalta.
  await page.evaluate(async () => { const u = await import('./assets/js/ubicacion.js'); await u.guardar('46', 'manual'); });
  await page.goto(BASE + '#/mapa');
  await page.waitForSelector('#map.leaflet-container', { timeout: 15000 });
  await page.waitForTimeout(1500);
  ok('Leaflet inicializado', (await page.locator('.leaflet-container').count()) === 1);
  const pedidasIgn = await page.evaluate(() => performance.getEntriesByType('resource').filter((e) => e.name.startsWith('https://www.ign.es/wmts/')).length);
  ok('Las teselas se piden al servicio WMTS del IGN', pedidasIgn > 0, `(${pedidasIgn})`);
  ok('Atribución al IGN visible', (await page.textContent('.leaflet-control-attribution')).includes('Instituto Geográfico Nacional'));
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
  ok('Tu provincia sigue resaltada pero translúcida', rellenos.some((v) => v > 0 && v <= 0.2), JSON.stringify([...new Set(rellenos)]));

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

  // REGRESIÓN: con conexión pero sin teselas (servidor caído o bloqueado)
  // el mapa quedaba en blanco. Ahora el vectorial debe rellenarse solo.
  await page.evaluate(async () => { const s = await import('./assets/js/store.js'); await s.clear('tiles'); });
  ignCaido = true;
  await page.goto(BASE + '#/');
  await page.goto(BASE + '#/mapa');
  await page.waitForSelector('#map.leaflet-container', { timeout: 15000 });
  await page.waitForTimeout(2000);
  const rellenos3 = await page.locator('#map path').evaluateAll((els) =>
    els.map((e) => parseFloat(e.getAttribute('fill-opacity') || '0')));
  ok('Con el servidor de teselas caído el mapa no queda en blanco', rellenos3.filter((v) => v > 0.5).length > 40,
    `(${rellenos3.filter((v) => v > 0.5).length})`);
  ok('Y lo explica al usuario', (await page.textContent('#m-status')).includes('se muestra el mapa vectorial'));
  ignCaido = false;
  await page.evaluate(async () => { const u = await import('./assets/js/ubicacion.js'); await u.olvidar(); });

  // Descarga de área: se puede cancelar y se detiene al salir del mapa.
  {
    const cd = await browser.newContext({ ...devices['Pixel 7'], serviceWorkers: 'block' });
    let pedidas = 0;
    await cd.route('https://www.ign.es/**', async (route) => {
      pedidas++;
      await new Promise((r) => setTimeout(r, 120));
      route.fulfill({ status: 200, contentType: 'image/png', body: PNG_1PX, headers: { 'Access-Control-Allow-Origin': '*' } }).catch(() => {});
    });
    const pd = await cd.newPage();
    const abrirDescarga = async () => {
      await pd.goto(BASE + '#/mapa');
      await pd.waitForSelector('#map.leaflet-container');
      await pd.waitForTimeout(800);
      await pd.evaluate(async () => (await import('./assets/js/store.js')).clear('tiles'));
      await pd.click('#m-dl');
      await pd.fill('#dl-z0', '6'); await pd.fill('#dl-z1', '8');
      await pd.click('#dl-go');
      await pd.waitForTimeout(700);
    };
    await abrirDescarga();
    ok('Descarga: está descargando de verdad', pedidas > 0, `(${pedidas} peticiones)`);
    ok('Descarga: el botón pasa a «Cancelar»', /Cancelar/i.test(await pd.textContent('#dl-go')));
    await pd.click('#dl-go');
    await pd.waitForTimeout(400);
    const n1 = pedidas;
    await pd.waitForTimeout(1200);
    ok('Descarga: «Cancelar» detiene las peticiones', pedidas === n1, `${n1} → ${pedidas}`);
    ok('Descarga: informa de lo guardado al cancelar', /cancelada/i.test(await pd.textContent('#dl-log')));

    await abrirDescarga();
    ok('Descarga: vuelve a empezar tras cancelar', /Cancelar/i.test(await pd.textContent('#dl-go')));
    await pd.goto(BASE + '#/');
    await pd.waitForSelector('.tile.sos');
    await pd.waitForTimeout(400);
    const n2 = pedidas;
    await pd.waitForTimeout(1500);
    ok('Descarga: salir del mapa la detiene', pedidas === n2, `${n2} → ${pedidas}`);
    await cd.close();
  }

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

  // Al salir de la pantalla el audio se detiene y no queda nada sonando.
  await page.evaluate(() => { window.__audio = document.querySelector('#au-el'); });
  ok('Antes de salir, el audio está sonando', await page.evaluate(() => !window.__audio.paused));
  await page.goto(BASE + '#/');
  await page.waitForSelector('.tile.sos');
  const trasSalir = await page.evaluate(() => ({ pausado: window.__audio.paused, src: window.__audio.getAttribute('src'), sonando: [...document.querySelectorAll('audio')].some((a) => !a.paused) }));
  ok('Al salir, el audio se detiene y libera el archivo', trasSalir.pausado && !trasSalir.src && !trasSalir.sonando, JSON.stringify(trasSalir));
  await page.goto(BASE + '#/sec/audio');
  await page.waitForSelector('#au-lista .row');
  ok('Al volver, el reproductor empieza limpio', await page.locator('#au-player').isHidden());

  // Una grabación familiar puede ser irrecuperable: borrar y deshacer.
  await page.click('[data-del="test1"]');
  await page.waitForSelector('.toast .toast-accion');
  ok('Borrar un audio lo para y ofrece «Deshacer»', (await page.locator('[data-del="test1"]').count()) === 0 && (await page.locator('#au-player').isHidden()));
  await page.click('.toast-accion');
  await page.waitForSelector('[data-del="test1"]');
  ok('Deshacer recupera el audio con su archivo', await page.evaluate(async () => {
    const a = await (await import('./assets/js/store.js')).get('audio', 'test1');
    return !!a && a.blob instanceof Blob && a.blob.size > 1000;
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
  const copia = JSON.parse(fs.readFileSync(await file.path(), 'utf8'));
  const nodosCopia = (copia.stores.kv || []).find((r) => r.id === 'familia.nodos')?.v || [];
  ok('La copia de seguridad incluye el plan familiar', nodosCopia.length === 2 && nodosCopia.some((x) => x.rutas?.length === 2),
    `(${nodosCopia.length} ubicaciones)`);

  // Importación en un dispositivo "nuevo" (contexto limpio): se restaura todo.
  {
    const ci = await browser.newContext({ ...devices['Pixel 7'] });
    const pi = await ci.newPage();
    pi.on('dialog', (d) => d.accept());
    await pi.goto(BASE + '#/sec/config');
    await pi.waitForSelector('#cfg-import');
    await pi.setInputFiles('#cfg-file', await file.path());
    await pi.waitForTimeout(1200);
    ok('Importar: la app sigue en Configuración sin recargar', (await pi.locator('#cfg-import').count()) === 1);
    await pi.goto(BASE + '#/sec/familia');
    await pi.waitForSelector('#fa-estado .row', { timeout: 8000 });
    ok('Importar: se restauran las ubicaciones familiares', (await pi.locator('#fa-estado .row').count()) === 2);
    await pi.goto(BASE + '#/familia/rutas');
    await pi.waitForSelector('#ru-out .ruta');
    ok('Importar: se restauran las rutas', (await pi.locator('#ru-out .ruta').count()) === 2);
    const marcas = await pi.evaluate(async () => (await (await import('./assets/js/store.js')).all('checks')).length);
    ok('Importar: se restauran las marcas de checklist', marcas === copia.stores.checks.length && marcas > 0, `${marcas}/${copia.stores.checks.length}`);
    await ci.close();
  }

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
  await page.fill('#q', 'sangra mucho'); await page.waitForTimeout(400);
  ok('SIN RED: sinónimos y ranking funcionan', /hemorragia/i.test(await page.locator('#res .row b').first().textContent()));

  await page.goto(BASE + '#/emergencia', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.btn-112', { timeout: 10000 });
  ok('SIN RED: SOS con botón 112 y accesos sanitarios', (await page.locator('.sos-med').count()) === 5);
  await page.goto(BASE + '#/emergencia/sanitaria/ictus', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.qcard', { timeout: 10000 });
  ok('SIN RED: ficha sanitaria de SOS', /Asimetría facial/.test(await page.textContent('#app')));

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
  srv2 = spawn(process.execPath, [path.join(ROOT, 'tools/serve.mjs')], {
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
    await page.locator('#fa-nodos details summary').nth(1).click();
    await page.waitForTimeout(200);
    await page.locator('#fa-nodos details').nth(1).locator('[data-f="tel"]').fill('600111222');
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
    await page.locator('#fa-nodos details summary').nth(1).click();
    await page.waitForTimeout(300);
    ok('TRAS ACTUALIZAR: los datos familiares siguen ahí',
      (await page.locator('#fa-nodos details').nth(1).locator('[data-f="tel"]').inputValue()) === '600111222');
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

  /* ------------- 13 quater. Uso con una mano y navegación (Fase 3) ------------- */
  console.log('\n▸ Uso con una mano, mapa, modo calma y navegación');
  {
    const cm = await browser.newContext({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true });
    const pm = await cm.newPage();
    const ir = async (r, sel) => { await pm.goto(BASE + '#' + r); await pm.waitForSelector(sel); await pm.waitForTimeout(250); };

    // Tamaño táctil de todo control visible en las pantallas de uso frecuente.
    const pequenos = () => pm.evaluate(() => [...document.querySelectorAll('#app button, #app a.btn, #app a.row, #app a.tile, #app summary, #app [role=tab], #app select, #app input:not([type=hidden]), .leaflet-bar a, .bottomnav a, .sos-bar a')]
      .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !e.closest('.chk-fecha[hidden]'); })
      .filter((e) => { const r = e.getBoundingClientRect(); return Math.min(r.width, r.height) < 44; })
      .map((e) => `${(e.textContent || e.getAttribute('aria-label') || e.tagName).trim().slice(0, 18)} ${Math.round(e.getBoundingClientRect().width)}×${Math.round(e.getBoundingClientRect().height)}`));
    const fallos = [];
    for (const [r, sel] of [['/emergencia', '.btn-112'], ['/emergencia/incendio-forestal', '.qcard'], ['/emergencia/sanitaria/hemorragia', '.qcard, .emg-hd'], ['/buscar', '#q'], ['/mapa', '#map.leaflet-container'], ['/sec/orientacion', '#cp-start'], ['/sec/juegos/calma', '#ca-start'], ['/check/nivel2', '.chk-item']]) {
      await ir(r, sel);
      fallos.push(...(await pequenos()).map((x) => `${r}: ${x}`));
    }
    ok('Una mano: todos los controles de las pantallas frecuentes miden ≥ 44 px', fallos.length === 0, fallos.slice(0, 6).join(' | '));

    await ir('/emergencia', '.btn-112');
    const barra = await pm.evaluate(() => { const r = document.querySelector('.sos-bar a[href="tel:112"]').getBoundingClientRect(); return r.bottom <= innerHeight && r.top > innerHeight / 2; });
    ok('Una mano: la lista SOS también tiene el 112 abajo, al alcance del pulgar', barra);

    // Foco visible con teclado.
    const cd = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pdk = await cd.newPage();
    await pdk.goto(BASE + '#/emergencia'); await pdk.waitForSelector('.btn-112');
    let foco = null;
    for (let i = 0; i < 6 && !foco; i++) {
      await pdk.keyboard.press('Tab');
      foco = await pdk.evaluate(() => { const e = document.activeElement; return e?.classList.contains('btn-112') || e?.classList.contains('sos-med') ? getComputedStyle(e).outlineWidth + ' ' + getComputedStyle(e).outlineStyle : null; });
    }
    ok('Teclado: el foco se ve claramente (contorno ≥ 3 px)', !!foco && parseFloat(foco) >= 3 && !/none/.test(foco), String(foco));
    await cd.close();

    // Buscador: botón propio para limpiar.
    await ir('/buscar', '#q');
    await pm.fill('#q', 'agua'); await pm.waitForTimeout(250);
    await pm.click('#q-limpiar');
    ok('Buscador: «✕» limpia la búsqueda y deja el foco en el campo', (await pm.inputValue('#q')) === '' && (await pm.evaluate(() => document.activeElement.id)) === 'q');

    // Mapa: acciones en una fila, estado visible, mapa que no queda bajo la navegación.
    await ir('/mapa', '#map.leaflet-container');
    await pm.waitForTimeout(800);
    const geo = await pm.evaluate(() => {
      const r = (s) => document.querySelector(s).getBoundingClientRect();
      const bs = [...document.querySelectorAll('.mapa-acciones .btn')].map((b) => b.getBoundingClientRect().top);
      return { fila: new Set(bs.map(Math.round)).size === 1, estadoArriba: r('#m-status').bottom <= r('#map').top + 1, estadoVisible: r('#m-status').top < innerHeight, mapaSobreNav: r('#map').bottom <= r('.bottomnav').top + 2 };
    });
    ok('Mapa: las cuatro acciones en una sola fila', geo.fila);
    ok('Mapa: el estado se ve encima del mapa sin desplazarse', geo.estadoArriba && geo.estadoVisible);
    ok('Mapa: el mapa no queda tapado por la navegación', geo.mapaSobreNav, JSON.stringify(geo));

    // Modo calma en un móvil pequeño.
    const cs = await browser.newContext({ viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true });
    const ps = await cs.newPage();
    await ps.goto(BASE + '#/sec/juegos/calma'); await ps.waitForSelector('#ca-start');
    const calma = await ps.evaluate(() => ({
      tabs: [...document.querySelectorAll('#jg-tabs button')].every((b) => { const r = b.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + 1; }),
      info: !document.querySelector('.jg-info').open,
      antes: document.querySelector('#ca-sel').getBoundingClientRect().top,
    }));
    ok('Modo calma a 320 px: las cuatro pestañas visibles', calma.tabs);
    ok('Modo calma: el ejercicio aparece antes que el texto informativo', calma.info && calma.antes < 568, JSON.stringify(calma));
    await cs.close();

    // Navegación: «←» vuelve de verdad y recupera la posición.
    await ir('/emergencia', '.btn-112');
    await pm.evaluate(() => window.scrollTo(0, 900));
    await pm.waitForTimeout(150);
    const y0 = await pm.evaluate(() => window.scrollY);
    await pm.click('a[href="#/emergencia/nevada"]');
    await pm.waitForSelector('.qcard');
    await pm.click('.topbar [data-volver]');
    await pm.waitForSelector('.btn-112');
    await pm.waitForTimeout(250);
    const y1 = await pm.evaluate(() => window.scrollY);
    ok('Volver: «←» regresa a la lista SOS en la misma posición', Math.abs(y1 - y0) < 30 && (await pm.evaluate(() => location.hash)) === '#/emergencia', `${y0} → ${y1}`);

    await ir('/buscar', '#q');
    await pm.fill('#q', 'hipotermia'); await pm.waitForTimeout(300);
    await pm.locator('#res .row').first().click();
    await pm.waitForSelector('.topbar [data-volver]');
    await pm.click('.topbar [data-volver]');
    await pm.waitForSelector('#res .row');
    ok('Volver: «←» desde un resultado vuelve a la búsqueda', (await pm.inputValue('#q')) === 'hipotermia');

    const cdl = await browser.newContext({ viewport: { width: 375, height: 667 } });
    const pdl = await cdl.newPage();
    await pdl.goto(BASE + '#/art/pa-rcp'); await pdl.waitForSelector('.topbar');
    await pdl.click('.topbar [data-volver]');
    await pdl.waitForTimeout(300);
    ok('Volver: entrando por enlace directo, «←» va a la sección padre', (await pdl.evaluate(() => location.hash)) === '#/sec/primeros-auxilios');
    await cdl.close();

    // Título: sin duplicar cuando la cabecera lo muestra entero.
    await ir('/sec/familia', '#fa-nodos');
    ok('Título: el H1 repetido se oculta (sigue para lectores de pantalla)', (await pm.locator('h1.h1-en-barra').count()) === 1);
    await ir('/check/nivel2', '.chk-item');
    ok('Título: si la cabecera lo corta, el H1 completo se mantiene visible', (await pm.locator('h1.h1-en-barra').count()) === 0);
    await cm.close();
  }

  /* ----------------------- 13 quinquies. Accesibilidad ----------------------- */
  console.log('\n▸ Accesibilidad: nombres, tamaños y estados');
  {
    const ca = await browser.newContext({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true });
    const pa = await ca.newPage();
    const revisar = () => pa.evaluate(() => {
      const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
      const sinNombre = [...document.querySelectorAll('#app input:not([type=hidden]), #app select, #app textarea')].filter(vis)
        .filter((e) => !(e.labels && e.labels.length) && !e.getAttribute('aria-label') && !e.getAttribute('aria-labelledby'))
        .map((e) => e.id || e.name || e.placeholder || e.tagName);
      const botonesMudos = [...document.querySelectorAll('#app button, #app a[href]')].filter(vis)
        .filter((e) => !(e.textContent.trim() || e.getAttribute('aria-label'))).map((e) => e.outerHTML.slice(0, 60));
      const diminutos = [...document.querySelectorAll('#app *, .bottomnav *, .offbadge')].filter((e) => vis(e) && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1))
        .filter((e) => parseFloat(getComputedStyle(e).fontSize) < 11).map((e) => `${parseFloat(getComputedStyle(e).fontSize).toFixed(1)}px «${e.textContent.trim().slice(0, 20)}»`);
      return { sinNombre, botonesMudos, diminutos };
    });
    await pa.goto(BASE + '#/sec/familia'); await pa.waitForSelector('#fa-nodos');
    if (await pa.locator('#fa-ejemplo').count()) { await pa.click('#fa-ejemplo'); await pa.waitForSelector('details.nodo'); }
    const probl = { sinNombre: [], botonesMudos: [], diminutos: [] };
    for (const [r, sel, antes] of [
      ['/', '.tile.sos'], ['/emergencia', '.btn-112'], ['/emergencia/incendio-forestal', '.qcard'], ['/buscar', '#q'],
      ['/sec/familia', 'details.nodo', async () => { await pa.locator('details.nodo summary').first().click(); await pa.locator('details.nodo').nth(1).locator('summary').click(); }],
      ['/familia/rutas', '.ruta'],
      ['/familia/reunion', '#re-list', async () => { await pa.locator('summary', { hasText: 'Añadir punto' }).click(); }],
      ['/sec/plan-familiar', '#k-punto', async () => { await pa.locator('summary', { hasText: 'Añadir contacto' }).click(); }],
      ['/sec/calculadoras', '#calcs'],
      ['/sec/config', '#cfg-export', async () => { await pa.locator('details.plegable > summary').first().click(); }], ['/sec/comunicaciones', '#uf-list', async () => { for (const t of ['Añadir frecuencia', 'Nueva entrada']) await pa.locator('summary', { hasText: t }).click(); }],
      ['/sec/riesgos', '#rz'], ['/mapa', '#map.leaflet-container', async () => { await pa.click('#m-add'); await pa.waitForSelector('#np-n'); }],
      ['/sec/orientacion', '#cp-start'], ['/sec/juegos/calma', '#ca-start'], ['/check/nivel2', '.chk-item'], ['/sec/audio', '#au-file'],
    ]) {
      await pa.goto(BASE + '#' + r); await pa.waitForSelector(sel); await pa.waitForTimeout(200);
      if (antes) await antes();
      await pa.waitForTimeout(150);
      const x = await revisar();
      for (const k of Object.keys(probl)) probl[k].push(...x[k].map((v) => `${r}: ${v}`));
    }
    ok('Accesibilidad: ningún campo de formulario sin nombre', probl.sinNombre.length === 0, probl.sinNombre.slice(0, 6).join(' | '));
    ok('Accesibilidad: ningún botón o enlace sin nombre', probl.botonesMudos.length === 0, probl.botonesMudos.slice(0, 3).join(' | '));
    ok('Accesibilidad: ningún texto por debajo de 11 px', probl.diminutos.length === 0, probl.diminutos.slice(0, 6).join(' | '));

    await pa.goto(BASE + '#/sec/primeros-auxilios'); await pa.waitForSelector('.list .row');
    const marca = await pa.evaluate(() => getComputedStyle(document.querySelector('.list .row.pr-critico .rt > b'), '::after').content);
    ok('Accesibilidad: lo crítico se indica con texto, no solo con color', /crítico/.test(marca), marca);

    // Centro familiar: se entiende qué es opcional y se confirma el guardado.
    await pa.goto(BASE + '#/sec/familia'); await pa.waitForSelector('details.nodo');
    ok('Familia: pasos del plan visibles', (await pa.locator('.pasos-fam li').count()) === 3);
    await pa.locator('details.nodo summary').first().click();
    ok('Familia: los campos opcionales se marcan como tales', (await pa.locator('details.nodo').first().locator('.opc').count()) >= 5);
    await pa.locator('details.nodo').first().locator('[data-f="tel"]').fill('600123123');
    await pa.waitForTimeout(700);
    ok('Familia: se confirma el guardado automático', /Guardado/.test(await pa.locator('details.nodo').first().locator('.guardado').textContent()));
    await ca.close();
  }

  /* ---- 13 sexies. Nada queda activo tras abandonar las pantallas ---- */
  console.log('\n▸ Batería: ningún proceso activo tras salir de las pantallas');
  {
    const cp = await browser.newContext({ ...devices['Pixel 7'], serviceWorkers: 'block', geolocation: { latitude: 40.4, longitude: -3.7 }, permissions: ['geolocation'] });
    await cp.route('https://www.ign.es/**', (route) => route.fulfill({ status: 200, contentType: 'image/png', body: PNG_1PX, headers: { 'Access-Control-Allow-Origin': '*' } }));
    await cp.addInitScript(() => {
      const si = window.setInterval.bind(window), ci = window.clearInterval.bind(window);
      const P = window.__proc = { intervalos: new Set(), locks: 0, win: {}, vigilancias: 0 };
      window.setInterval = (fn, ms, ...a) => { const id = si(fn, ms, ...a); P.intervalos.add(id); return id; };
      window.clearInterval = (id) => { P.intervalos.delete(id); return ci(id); };
      Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request: async () => { P.locks++; const l = { released: false, release: async () => { if (!l.released) { l.released = true; P.locks--; } } }; return l; } } });
      const add = window.addEventListener.bind(window), rem = window.removeEventListener.bind(window);
      window.addEventListener = (t, ...r) => { P.win[t] = (P.win[t] || 0) + 1; return add(t, ...r); };
      window.removeEventListener = (t, ...r) => { P.win[t] = (P.win[t] || 0) - 1; return rem(t, ...r); };
      const wp = navigator.geolocation?.watchPosition?.bind(navigator.geolocation);
      if (wp) navigator.geolocation.watchPosition = (...a) => { P.vigilancias++; return wp(...a); };
    });
    const pp = await cp.newPage();
    const estado = () => pp.evaluate(() => ({ intervalos: window.__proc.intervalos.size, locks: window.__proc.locks, win: { ...window.__proc.win }, vigilancias: window.__proc.vigilancias, audio: [...document.querySelectorAll('audio')].some((a) => !a.paused) || !!window.__au && !window.__au.paused }));
    await pp.goto(BASE + '#/'); await pp.waitForSelector('.tile.sos');
    const base0 = await estado();
    const visitas = [
      ['/emergencia/incendio-forestal', '.qcard'],
      ['/emergencia/sanitaria/ictus', '.qcard'],
      ['/emergencia', '.btn-112', async () => { await pp.click('[data-pos112]'); await pp.waitForTimeout(400); }],
      ['/mapa', '#map.leaflet-container', async () => { await pp.click('#m-me'); await pp.waitForTimeout(500); }],
      ['/sec/orientacion', '#cp-start', async () => { await pp.click('#cp-start'); await pp.click('#cp-manual'); }],
      ['/sec/juegos/calma', '#ca-start', async () => { await pp.click('#ca-start'); await pp.waitForTimeout(1200); }],
      ['/sec/juegos', '.ttt-c', async () => { await pp.click('#jg-tabs [data-t="mem"]'); }],
      ['/buscar', '#q', async () => { await pp.fill('#q', 'hipotermia'); }],
      ['/familia/mapa', '#map.leaflet-container'],
      ['/check/nivel2', '.chk-item'],
    ];
    for (const [r, sel, accion] of visitas) {
      await pp.goto(BASE + '#' + r); await pp.waitForSelector(sel); await pp.waitForTimeout(300);
      if (accion) await accion();
      await pp.goto(BASE + '#/'); await pp.waitForSelector('.tile.sos'); await pp.waitForTimeout(150);
    }
    // Audio: se inyecta y se reproduce uno de verdad.
    await pp.evaluate(async () => {
      const st = await import('./assets/js/store.js');
      const n = 8000, buf = new ArrayBuffer(44 + n * 2), dv = new DataView(buf);
      const wr = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
      wr(0, 'RIFF'); dv.setUint32(4, 36 + n * 2, true); wr(8, 'WAVEfmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
      dv.setUint32(24, 8000, true); dv.setUint32(28, 16000, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); wr(36, 'data'); dv.setUint32(40, n * 2, true);
      await st.put('audio', { id: 'p1', nombre: 'Prueba', tipo: 'audio/wav', tam: buf.byteLength, dur: 1, cat: 'voz', blob: new Blob([buf], { type: 'audio/wav' }), ts: Date.now() });
    });
    await pp.goto(BASE + '#/sec/audio'); await pp.waitForSelector('[data-play="0"]');
    await pp.click('[data-play="0"]'); await pp.waitForTimeout(300);
    await pp.evaluate(() => { window.__au = document.querySelector('#au-el'); });
    await pp.goto(BASE + '#/'); await pp.waitForSelector('.tile.sos');
    await pp.waitForTimeout(1500);
    const fin = await estado();
    const tipos = new Set([...Object.keys(base0.win), ...Object.keys(fin.win)]);
    const desbalance = [...tipos].filter((t) => (base0.win[t] || 0) !== (fin.win[t] || 0)).map((t) => `${t}:${base0.win[t] || 0}→${fin.win[t] || 0}`);
    ok('Batería: ningún intervalo activo tras recorrer la app', fin.intervalos === 0, JSON.stringify(fin.intervalos));
    ok('Batería: ningún bloqueo de pantalla activo', fin.locks === 0, String(fin.locks));
    ok('Batería: ningún listener de window pendiente', desbalance.length === 0, desbalance.join(', '));
    ok('Batería: ningún audio sonando', !fin.audio);
    ok('Batería: sin seguimiento continuo del GPS', fin.vigilancias === 0);
    await cp.close();
  }

  /* ------------------ 13 ter. Temas: modo noche y contraste ------------------ */
  console.log('\n▸ Temas: modo noche, contraste alto y elementos fijos');
  {
    // Contraste WCAG de todo texto visible contra su fondo efectivo.
    const contraste = (pg) => pg.evaluate(() => {
      const lum = (c) => { const m = c.match(/[\d.]+/g).map(Number); const [r, g, b] = m.slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
      const fondo = (e) => { while (e) { const c = getComputedStyle(e).backgroundColor; const m = c.match(/[\d.]+/g); if (m && (m.length < 4 || +m[3] > 0.5)) return c; e = e.parentElement; } return getComputedStyle(document.documentElement).backgroundColor; };
      const malos = [];
      for (const e of document.querySelectorAll('#app *, .bottomnav *')) {
        const r = e.getBoundingClientRect();
        if (!r.width || !r.height || ![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1)) continue;
        if (e.closest('.leaflet-container, input, select, textarea, .skip')) continue;
        const cs = getComputedStyle(e); const fs = parseFloat(cs.fontSize);
        const a = lum(cs.color), b = lum(fondo(e)); const cr = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        const grande = fs >= 24 || (fs >= 18.66 && +cs.fontWeight >= 700);
        if (cr < (grande ? 3 : 4.5)) malos.push(`${cr.toFixed(2)} «${e.textContent.trim().slice(0, 30)}»`);
      }
      return [...new Set(malos)];
    });
    for (const [tema, cont] of [['dark', 'normal'], ['night', 'normal'], ['dark', 'high'], ['night', 'high']]) {
      const ct = await browser.newContext({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true });
      await ct.addInitScript(([t, c]) => localStorage.setItem('survival.settings', JSON.stringify({ theme: t, contrast: c })), [tema, cont]);
      const pt = await ct.newPage();
      await pt.goto(BASE + '#/emergencia/incendio-forestal');
      await pt.waitForSelector('.sos-bar');
      await pt.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await pt.evaluate(async () => (await import('./assets/js/ui.js')).toast('Prueba de aviso'));
      const pos = await pt.evaluate(() => {
        const dentro = (sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight + 1; };
        return { nav: dentro('.bottomnav'), bar: dentro('.sos-bar'), toast: dentro('.toast') };
      });
      ok(`Tema ${tema}/${cont}: navegación, 112 y avisos siguen en pantalla`, pos.nav && pos.bar && pos.toast, JSON.stringify(pos));
      const malos = [];
      for (const r of ['/', '/emergencia', '/emergencia/incendio-forestal', '/check/nivel2', '/sec/familia', '/sec/plan-familiar', '/sec/calculadoras', '/sec/config', '/sec/primeros-auxilios']) {
        await pt.goto(BASE + '#' + r); await pt.waitForTimeout(250);
        malos.push(...(await contraste(pt)).map((m) => r + ' ' + m));
      }
      await pt.goto(BASE + '#/buscar'); await pt.waitForSelector('#q');
      await pt.fill('#q', 'sangra mucho'); await pt.waitForTimeout(300);
      malos.push(...(await contraste(pt)).map((m) => '/buscar ' + m));
      ok(`Tema ${tema}/${cont}: todo el texto cumple contraste AA`, malos.length === 0, malos.slice(0, 5).join(' | '));
      await ct.close();
    }
  }

  srv2.kill();

  /* ------------------------------ 14. Consola ------------------------------ */
  console.log('\n▸ Errores de consola');
  const relevantes = consoleErrors.filter((e) =>
    !/favicon|ERR_INTERNET_DISCONNECTED|ERR_TUNNEL_CONNECTION_FAILED|ERR_NAME_NOT_RESOLVED|Failed to fetch|ign\.es|ERR_FAILED/i.test(e)
  );
  ok('Sin errores de consola relevantes', relevantes.length === 0, relevantes.slice(0, 5).join(' | '));

} catch (e) {
  fail++;
  console.error('\n💥 Excepción durante las pruebas:', e.message);
  errors.push('Excepción: ' + e.message);
} finally {
  await browser.close();
  try { srv.kill(); } catch {}
  try { srv2?.kill(); } catch {}
}

console.log(`\n${'─'.repeat(60)}\nRESULTADO: ${pass} correctas · ${fail} fallidas`);
if (fail) { console.log('\nFallos:\n' + errors.map((e) => ' · ' + e).join('\n')); process.exit(1); }
console.log('Todas las pruebas han pasado.\n');
