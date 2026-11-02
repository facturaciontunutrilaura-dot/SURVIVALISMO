/* =========================================================================
   preparacion.js — «¿Está lista tu app?»
   ---------------------------------------------------------------------------
   Comprueba, con el estado REAL del dispositivo, lo que hace falta para que
   la app sirva en una emergencia sin conexión:
     1. Recursos offline: cada archivo del manifiesto está en caché y no es
        una página HTML guardada en lugar del archivo (daño típico cuando el
        hosting devuelve index.html para un archivo que no existe).
     2. Protección de los datos frente al borrado automático del navegador
        (almacenamiento persistente).
     3. App instalada (en iOS, sin instalar, Safari puede borrar los datos de
        una web que no se visita en semanas).
     4. Copia de seguridad: fecha de la última exportación y si hay cambios
        posteriores.
   Solo lee; «Reparar» vuelve a descargar lo que falta con la misma
   validación que el Service Worker.
   ========================================================================= */
import * as store from './store.js';
import { esc, toast } from './ui.js';
import { VERSION } from '../../data/content/index.js';

const MANIFIESTO = './precache-manifest.json';
const K_COPIA = 'survival.ultimaCopia';
const K_CAMBIO = 'survival.ultimoCambio';
const K_OCULTO = 'survival.preparacionOculta';
const DIA = 86400000;

const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento: no se recuerda */ } };

/* ------------------------- Fechas de copia y cambios ------------------------- */
export function marcarCopia() { lsSet(K_COPIA, String(Date.now())); }

/* Actualización que no se pudo completar (faltó algún archivo). No es un
   problema de la versión instalada, que sigue completa: solo se informa. */
const K_ACT = 'survival.actualizacionFallida';
export function actualizacionFallida(si) {
  if (si === undefined) { const v = Number(lsGet(K_ACT)); return v || null; }
  if (si) lsSet(K_ACT, String(Date.now())); else { try { localStorage.removeItem(K_ACT); } catch { /* sin localStorage */ } }
}
export function ultimaCopia() { const v = Number(lsGet(K_COPIA)); return v || null; }
function ultimoCambio() { const v = Number(lsGet(K_CAMBIO)); return v || null; }

/* ----------------------------- 1. Recursos offline ----------------------------- */
const esHtml = (u) => u.endsWith('/') || u.endsWith('.html');

/** Misma regla que el Service Worker: una respuesta vale si es 200 y, salvo
 *  que se pida una página, no es el index.html del fallback del hosting. */
export function respuestaValida(u, r) {
  if (!r || !r.ok || r.status !== 200 || r.type === 'opaqueredirect') return false;
  const tipo = (r.headers.get('Content-Type') || '').toLowerCase();
  return esHtml(u) || !tipo.includes('text/html');
}

async function listaRecursos() {
  const enCache = await caches.match(MANIFIESTO);
  if (enCache) { try { return await enCache.json(); } catch { /* dañado: se intenta la red */ } }
  const r = await fetch(MANIFIESTO, { cache: 'no-cache' });
  if (!respuestaValida(MANIFIESTO, r)) throw new Error('No se pudo leer la lista de recursos');
  return r.json();
}

export async function comprobarRecursos() {
  if (!('serviceWorker' in navigator) || !('caches' in window)) return { estado: 'no-disponible' };
  if (!navigator.serviceWorker.controller) return { estado: 'preparando' };
  let lista;
  try { lista = await listaRecursos(); } catch { return { estado: 'incompleto', faltan: [MANIFIESTO], danados: [], total: 0 }; }
  const faltan = [], danados = [];
  for (const u of lista) {
    const r = await caches.match(u);
    if (!r) faltan.push(u);
    else if (!respuestaValida(u, r)) danados.push(u);
  }
  return { estado: faltan.length || danados.length ? 'incompleto' : 'ok', faltan, danados, total: lista.length };
}

/** Vuelve a descargar recursos (los indicados o todos) y solo guarda los que
 *  son válidos. Devuelve cuántos se han guardado y cuáles han fallado. */
export async function reparar(soloEstos = null, version) {
  const lista = soloEstos || (await listaRecursos());
  const cache = await caches.open(`survival-static-v${version}`);
  let guardados = 0; const fallos = [];
  for (const u of lista) {
    try {
      const req = new Request(u, { cache: 'reload' });
      const r = await fetch(u, { cache: 'reload', headers: { 'X-Reparar': '1' } });
      if (!respuestaValida(u, r)) throw new Error(String(r.status));
      await cache.put(req, r);
      guardados++;
    } catch { fallos.push(u); }
  }
  return { guardados, fallos, total: lista.length };
}

/* ------------------------ 2. Protección de los datos ------------------------ */
export async function comprobarPersistencia() {
  if (!navigator.storage?.persisted) return 'no-disponible';
  try { return (await navigator.storage.persisted()) ? 'ok' : 'no'; } catch { return 'no-disponible'; }
}

/* ------------------------------ 3. Instalación ------------------------------ */
let eventoInstalar = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); eventoInstalar = e; });
window.addEventListener('appinstalled', () => { eventoInstalar = null; });

export function esIOS() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
export function comprobarInstalacion() {
  const inst = window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
  if (inst) return { estado: 'ok' };
  return { estado: 'no', puedeInstalar: !!eventoInstalar, ios: esIOS() };
}
export async function instalar() {
  if (!eventoInstalar) return false;
  eventoInstalar.prompt();
  const r = await eventoInstalar.userChoice.catch(() => null);
  eventoInstalar = null;
  return r?.outcome === 'accepted';
}

/* --------------------------- 4. Copia de seguridad --------------------------- */
async function hayDatosPropios() {
  let n = 0;
  for (const s of ['contactos', 'puntos', 'checks', 'frecs', 'radiolog', 'geo']) n += await store.count(s);
  // En `kv` también hay estadísticas de juegos: solo cuentan las del plan.
  n += (await store.all('kv')).filter((r) => store.esDatoPropio('kv', r.id)).length;
  return n > 0;
}
export async function comprobarCopia() {
  let datos;
  try { datos = await hayDatosPropios(); } catch { return { estado: 'no-disponible' }; }
  const copia = ultimaCopia(), cambio = ultimoCambio();
  if (!datos) return { estado: 'sin-datos', copia };
  if (!copia) return { estado: 'nunca', copia };
  if (Date.now() - copia > 30 * DIA) return { estado: 'antigua', copia };
  if (cambio && cambio > copia) return { estado: 'cambios', copia };
  return { estado: 'ok', copia };
}

/* -------------------------------- Conjunto -------------------------------- */
export async function comprobarTodo() {
  const [recursos, persistencia, copia, almacenamiento] = await Promise.all([comprobarRecursos(), comprobarPersistencia(), comprobarCopia(), store.disponible()]);
  return { recursos, persistencia, instalacion: comprobarInstalacion(), copia, almacenamiento };
}

/** Lo que merece un aviso en la PORTADA. Solo problemas reales; lo que el
 *  navegador decide (persistencia) o lo opcional (instalar) no se convierte
 *  en una alerta permanente: solo cuenta si además hay datos que perder y
 *  no están ni protegidos ni instalados. */
export function problemasPortada(e) {
  const p = [];
  if (!e.almacenamiento) p.push('almacenamiento');
  if (e.recursos.estado === 'incompleto') p.push('recursos');
  if (e.recursos.estado === 'no-disponible') p.push('sin-offline');
  if (['nunca', 'antigua', 'cambios'].includes(e.copia.estado)) p.push('copia');
  if (e.copia.estado !== 'sin-datos' && e.persistencia === 'no' && e.instalacion.estado !== 'ok') p.push('proteccion');
  return p;
}

/** «Ahora no» en la portada: oculta el aviso 7 días (salvo que falten
 *  recursos offline, que siempre se avisa). */
export function avisoOculto() { const v = Number(lsGet(K_OCULTO)); return !!v && Date.now() - v < 7 * DIA; }
export function ocultarAviso() { lsSet(K_OCULTO, String(Date.now())); }

export function fechaCorta(ts) {
  return ts ? new Date(ts).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
}

/* ================================ INTERFAZ ================================ */

const OK = '<span class="prep-ic ok" aria-hidden="true">✔</span>';
const AV = '<span class="prep-ic av" aria-hidden="true">⚠</span>';

function notaActualizacion() {
  const f = actualizacionFallida();
  return f ? `<br><span class="muted">La última actualización (${esc(fechaCorta(f))}) no se pudo descargar entera, así que no se ha instalado: sigues con la versión ${esc(VERSION)}, completa. Se volverá a intentar sola cuando haya buena conexión.</span>` : '';
}
function filaRecursos(r) {
  if (r.estado === 'ok') return { ok: true, t: `${OK}<div><b>Funciona sin conexión.</b> Todo lo necesario está guardado en este dispositivo (${r.total} archivos).${notaActualizacion()}</div>` };
  if (r.estado === 'preparando') return { ok: true, t: `${OK}<div><b>Preparando la copia sin conexión…</b> Mantén la conexión unos segundos la primera vez.</div>` };
  if (r.estado === 'no-disponible') return { ok: false, t: `${AV}<div><b>Este navegador no guarda la app para usarla sin conexión</b> (por ejemplo, en navegación privada). Ábrela en el navegador normal.</div>` };
  const n = r.faltan.length + r.danados.length;
  return {
    ok: false, reparar: [...r.faltan, ...r.danados],
    t: `${AV}<div><b>Faltan o están dañados ${n} ${n === 1 ? 'archivo' : 'archivos'}.</b> Alguna parte de la app podría no abrir sin conexión.${navigator.onLine ? '' : ' Conéctate a Internet y pulsa «Reparar».'}</div>`,
  };
}
function filaPersistencia(p) {
  if (p === 'ok') return { ok: true, t: `${OK}<div><b>Datos protegidos.</b> El navegador no los borrará para liberar espacio.</div>` };
  if (p === 'no-disponible') return { ok: true, t: `${OK}<div>Este navegador no informa de si protege tus datos. Haz copias de seguridad.</div>` };
  return { ok: false, proteger: true, t: `${AV}<div><b>Datos sin proteger.</b> Si al móvil le falta espacio, el navegador podría borrarlos.</div>` };
}
function filaInstalacion(i) {
  if (i.estado === 'ok') return { ok: true, t: `${OK}<div><b>Instalada</b> en este dispositivo.</div>` };
  if (i.puedeInstalar) return { ok: false, instalar: true, t: `${AV}<div><b>No está instalada.</b> Instalada se abre como una app y el navegador la conserva mejor.</div>` };
  if (i.ios) return { ok: false, t: `${AV}<div><b>No está instalada.</b> En iPhone o iPad: botón <b>Compartir</b> → <b>«Añadir a pantalla de inicio»</b>. Sin instalar, Safari puede borrar los datos si no la abres en unas semanas.</div>` };
  return { ok: false, t: `${AV}<div><b>No está instalada.</b> En el menú del navegador: «Instalar app» o «Añadir a pantalla de inicio».</div>` };
}
function filaCopia(c) {
  const f = fechaCorta(c.copia);
  switch (c.estado) {
    case 'ok': return { ok: true, t: `${OK}<div><b>Copia de seguridad al día:</b> ${esc(f)}.</div>` };
    case 'sin-datos': return { ok: true, t: `${OK}<div>Aún no has guardado datos propios (plan familiar, contactos, checklists…).${f ? ` Última copia: ${esc(f)}.` : ''}</div>` };
    case 'nunca': return { ok: false, exportar: true, t: `${AV}<div><b>Nunca has hecho una copia de seguridad</b> y tienes datos propios.</div>` };
    case 'antigua': return { ok: false, exportar: true, t: `${AV}<div><b>Última copia: ${esc(f)}</b>, hace más de 30 días.</div>` };
    case 'cambios': return { ok: false, exportar: true, t: `${AV}<div><b>Última copia: ${esc(f)}.</b> Has cambiado datos después.</div>` };
    default: return { ok: false, t: `${AV}<div>No se puede comprobar la copia: el almacenamiento no está disponible.</div>` };
  }
}

async function accionReparar(lista, salida) {
  if (!navigator.onLine) { salida.textContent = 'Sin conexión: conéctate a Internet y vuelve a pulsar «Reparar».'; return false; }
  salida.textContent = 'Reparando…';
  const r = await reparar(lista, VERSION);
  salida.textContent = r.fallos.length
    ? `Se han recuperado ${r.guardados} de ${r.total}. No se han podido descargar: ${r.fallos.length}. Vuelve a intentarlo con mejor conexión.`
    : `Reparado: ${r.guardados} ${r.guardados === 1 ? 'archivo recuperado' : 'archivos recuperados'}.`;
  return !r.fallos.length;
}

/** Panel completo (Configuración). `exportar` es la función de copia. */
export async function montarPanel(cont, { exportar } = {}) {
  const pintar = async () => {
    const e = await comprobarTodo();
    const filas = [filaRecursos(e.recursos), filaPersistencia(e.persistencia), filaInstalacion(e.instalacion), filaCopia(e.copia)];
    const todoBien = filas.every((f) => f.ok);
    cont.innerHTML = `<div class="card prep ${todoBien ? 'prep-ok' : ''}">
      <p class="prep-resumen">${todoBien ? '✔ <b>Tu app está lista</b> para usarse sin conexión.' : '⚠ <b>Hay cosas por revisar</b> antes de necesitarla.'}</p>
      <ul class="prep-lista">${filas.map((f, i) => `<li class="prep-fila ${f.ok ? 'ok' : 'av'}">${f.t}
        ${f.reparar ? `<button class="btn sm" type="button" data-a="reparar" data-i="${i}">🔧 Reparar</button>` : ''}
        ${f.proteger ? '<button class="btn sm ghost" type="button" data-a="proteger">🔒 Proteger mis datos</button>' : ''}
        ${f.instalar ? '<button class="btn sm ghost" type="button" data-a="instalar">📲 Instalar</button>' : ''}
        ${f.exportar && exportar ? '<button class="btn sm ghost" type="button" data-a="exportar">⬆ Hacer copia ahora</button>' : ''}
      </li>`).join('')}</ul>
      <div class="muted prep-salida" aria-live="polite"></div>
    </div>`;
    const salida = cont.querySelector('.prep-salida');
    cont.querySelector('[data-a="reparar"]')?.addEventListener('click', async () => { if (await accionReparar(filas[0].reparar, salida)) setTimeout(pintar, 1200); });
    cont.querySelector('[data-a="proteger"]')?.addEventListener('click', async () => {
      const ok = await store.persistStorage();
      if (ok) pintar(); else salida.textContent = 'El navegador no lo ha concedido. Instalar la app y hacer copias de seguridad lo compensa.';
    });
    cont.querySelector('[data-a="instalar"]')?.addEventListener('click', async () => { await instalar(); pintar(); });
    cont.querySelector('[data-a="exportar"]')?.addEventListener('click', async () => { await exportar(); pintar(); });
  };
  await pintar();
  return pintar;
}

/** Aviso en la portada: solo si hay algo que requiera atención. */
export async function montarAvisoPortada(cont) {
  let e;
  try { e = await comprobarTodo(); } catch { return; }
  if (!cont.isConnected) return;
  const p = problemasPortada(e);
  const graves = p.filter((x) => x === 'recursos' || x === 'sin-offline' || x === 'almacenamiento');
  if (!p.length || (!graves.length && avisoOculto())) { cont.hidden = true; return; }
  const txt = {
    almacenamiento: 'Este navegador no deja guardar datos: tu plan, contactos y checklists no se guardarán. SOS y el 112 funcionan.',
    recursos: 'Faltan archivos para usar la app sin conexión.',
    'sin-offline': 'Este navegador no guarda la app para usarla sin conexión.',
    copia: e.copia.estado === 'nunca' ? 'No tienes ninguna copia de seguridad de tus datos.' : 'Tu copia de seguridad no está al día.',
    proteccion: 'Tus datos no están protegidos frente al borrado automático del navegador.',
  };
  cont.innerHTML = `<div class="prep-aviso" role="status">
    <p><b>⚠ Revisa tu preparación</b></p>
    <ul>${p.map((x) => `<li>${esc(txt[x])}</li>`).join('')}</ul>
    <div class="btnrow">
      ${p.includes('recursos') ? '<button class="btn sm" type="button" data-a="reparar">🔧 Reparar</button>' : ''}
      <a class="btn sm ghost" href="#/sec/config">Revisar</a>
      ${graves.length ? '' : '<button class="btn sm ghost" type="button" data-a="ocultar">Ahora no</button>'}
    </div>
    <div class="muted prep-salida" aria-live="polite"></div>
  </div>`;
  cont.hidden = false;
  cont.querySelector('[data-a="ocultar"]')?.addEventListener('click', () => { ocultarAviso(); cont.hidden = true; toast('Aviso oculto durante 7 días'); });
  cont.querySelector('[data-a="reparar"]')?.addEventListener('click', async () => {
    const r = e.recursos;
    if (await accionReparar([...r.faltan, ...r.danados], cont.querySelector('.prep-salida'))) setTimeout(() => montarAvisoPortada(cont), 1200);
  });
}

/* ======================= INFORMACIÓN PARA PRUEBAS ======================= */
/* Datos TÉCNICOS del dispositivo para informar de un problema al probar en un
   móvil real. No incluye ningún dato personal (ni contactos, ni plan, ni
   posición): solo el estado de la app y del navegador. */
export async function informeTecnico() {
  const [rec, pers, alm, est] = await Promise.all([
    comprobarRecursos().catch(() => ({ estado: 'error' })),
    comprobarPersistencia(),
    store.disponible(),
    store.storageEstimate(),
  ]);
  const reg = await navigator.serviceWorker?.getRegistration?.().catch(() => null);
  const s = store.settings();
  const mb = (b) => (b == null ? '—' : `${(b / 1048576).toFixed(1)} MB`);
  const recursos = rec.estado === 'ok' ? `completos (${rec.total})`
    : rec.estado === 'incompleto' ? `INCOMPLETOS: faltan ${rec.faltan.length}, dañados ${rec.danados.length}`
      : rec.estado;
  const filas = [
    ['Fecha', new Date().toLocaleString('es-ES')],
    ['Versión de la app', VERSION],
    ['Instalada como app', comprobarInstalacion().estado === 'ok' ? 'sí' : 'no'],
    ['Service Worker controla la página', navigator.serviceWorker?.controller ? 'sí' : 'no'],
    ['Versión nueva esperando', reg?.waiting ? 'sí' : 'no'],
    ['Última actualización fallida', actualizacionFallida() ? fechaCorta(actualizacionFallida()) : 'no'],
    ['Recursos sin conexión', recursos],
    ['Conexión', navigator.onLine ? 'sí' : 'no'],
    ['Almacenamiento', alm ? 'disponible' : 'BLOQUEADO'],
    ['Protección de datos', { ok: 'concedida', no: 'no concedida', 'no-disponible': 'no disponible' }[pers] || pers],
    ['Espacio usado / disponible', `${mb(est?.usage)} / ${mb(est?.quota)}`],
    ['Brújula (orientación)', 'DeviceOrientationEvent' in window ? 'API disponible' : 'no disponible'],
    ['GPS (geolocalización)', 'geolocation' in navigator ? 'API disponible' : 'no disponible'],
    ['Pantalla', `${innerWidth}×${innerHeight} px · densidad ${devicePixelRatio} · ${screen.orientation?.type || '—'}`],
    ['Ajustes', `tema ${s.theme} · contraste ${s.contrast} · letra ${s.fs}`],
    ['Navegador', navigator.userAgent],
  ];
  return { filas, texto: filas.map(([k, v]) => `${k}: ${v}`).join('\n') };
}

export async function montarInforme(cont) {
  const pintar = async () => {
    const { filas } = await informeTecnico();
    cont.querySelector('.inf-datos').innerHTML = filas.map(([k, v]) => `<div>${esc(k)}</div><div class="mono">${esc(v)}</div>`).join('');
  };
  cont.querySelector('details').addEventListener('toggle', (e) => { if (e.target.open) pintar(); });
  cont.querySelector('[data-copiar]').addEventListener('click', async () => {
    const { texto } = await informeTecnico();
    try { await navigator.clipboard.writeText(texto); toast('Informe copiado: pégalo en tu mensaje', { tipo: 'ok' }); }
    catch {
      // Sin permiso de portapapeles: se muestra el texto seleccionado para copiarlo a mano.
      const t = cont.querySelector('textarea');
      t.hidden = false; t.value = texto; t.focus(); t.select();
      toast('Selecciona el texto y cópialo a mano', { tipo: 'info' });
    }
  });
}
