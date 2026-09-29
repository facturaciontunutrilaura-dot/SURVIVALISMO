/* =========================================================================
   store.js — persistencia 100 % local (IndexedDB + localStorage)
   Ningún dato sale nunca del dispositivo.
   ========================================================================= */

const DB_NAME = 'survival-offline';
const DB_VER = 3;

/** Almacenes:
 *  kv        → ajustes y estado genérico (clave/valor)
 *  checks    → estado de los checklists  {id: 'listId::itemKey', estado, fecha}
 *  puntos    → puntos personales del mapa
 *  contactos → plan familiar
 *  frecs     → frecuencias añadidas por el usuario
 *  radiolog  → registro de escuchas / contactos de radio
 *  tiles     → teselas de mapa cacheadas {key:'z/x/y', blob}
 *  geo       → capas GeoJSON importadas por el usuario
 *  progreso  → progreso de los cursos
 *  tombstones→ registro de borrados, necesario para sincronizar bajas
 */
const STORES = ['kv', 'checks', 'puntos', 'contactos', 'frecs', 'radiolog', 'tiles', 'geo', 'progreso', 'tombstones', 'audio'];

/** Almacenes que se sincronizan con la nube.
 *  `tiles` y `audio` quedan EXCLUIDOS a propósito: son megas de imágenes y
 *  archivos de sonido que reventarían cualquier cuota razonable de base de
 *  datos y que el usuario puede volver a añadir en cada dispositivo. */
export const SYNC_STORES = ['kv', 'checks', 'puntos', 'contactos', 'frecs', 'radiolog', 'geo', 'progreso'];

let _db = null;
let _apertura = null;   // promesa en curso o fallida (no se reintenta en cada llamada)

/** El navegador no deja guardar datos (navegación privada, almacenamiento
 *  bloqueado, lleno o dañado). Las vistas lo reconocen por `name` y muestran
 *  una explicación en lugar de un error técnico. */
export class ErrorAlmacenamiento extends Error {
  constructor(causa) {
    super('No se pueden guardar datos en este dispositivo');
    this.name = 'ErrorAlmacenamiento';
    this.causa = causa;
  }
}
let _fallo = null;
/** Motivo del último fallo al abrir el almacenamiento, o null si funciona. */
export function falloAlmacenamiento() { return _fallo; }

export function openDB() {
  if (_db) return Promise.resolve(_db);
  if (_apertura) return _apertura;
  _apertura = new Promise((res, rej) => {
    let terminado = false;
    const fallar = (e) => {
      if (terminado) return;
      terminado = true; clearTimeout(reloj);
      _fallo = e || new Error('desconocido');
      rej(new ErrorAlmacenamiento(_fallo));
    };
    // Algunos navegadores no responden nunca (ni éxito ni error) cuando el
    // almacenamiento está bloqueado: sin este límite la vista se quedaría
    // cargando para siempre.
    const reloj = setTimeout(() => fallar(new Error('El almacenamiento no responde')), 6000);
    let req;
    try {
      if (typeof indexedDB === 'undefined' || !indexedDB) throw new Error('IndexedDB no disponible');
      req = indexedDB.open(DB_NAME, DB_VER);
    } catch (e) { fallar(e); return; }
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const s of STORES) if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' });
    };
    req.onsuccess = () => {
      _db = req.result; _fallo = null;
      if (terminado) { _apertura = null; return; }   // respondió tarde: la próxima llamada ya funciona
      terminado = true; clearTimeout(reloj); res(_db);
    };
    req.onerror = () => fallar(req.error);
  });
  _apertura.catch(() => {});
  return _apertura;
}

/** ¿Se pueden guardar datos? No lanza. */
export async function disponible() {
  try { await openDB(); return true; } catch { return false; }
}
/** «Reintentar»: vuelve a intentar abrir el almacenamiento. */
export async function reintentar() {
  _apertura = null;
  return disponible();
}

function tx(store, mode = 'readonly') {
  return openDB().then((db) => db.transaction(store, mode).objectStore(store));
}

/* Datos PROPIOS del usuario (lo que perdería si el navegador borrase el
   almacenamiento). No cuentan ajustes, estadísticas de juegos ni teselas.
   Se usa para el aviso de copia de seguridad y para pedir protección. */
const KV_PROPIO = /^(familia\.|plan\.|ubicacion$|riesgos\.)/;
export function esDatoPropio(store, id) {
  return ['contactos', 'puntos', 'checks', 'frecs', 'radiolog', 'geo'].includes(store) || (store === 'kv' && KV_PROPIO.test(String(id)));
}
/** Anota la hora del último cambio propio y, la primera vez que el usuario
 *  guarda algo suyo, pide al navegador que no lo borre automáticamente. */
function anotarCambio(store, id) {
  if (!esDatoPropio(store, id)) return;
  try {
    localStorage.setItem('survival.ultimoCambio', String(Date.now()));
    if (!localStorage.getItem('survival.persistPedido')) {
      localStorage.setItem('survival.persistPedido', '1');
      persistStorage();
    }
  } catch { /* sin localStorage: no se anota */ }
}

/** Escribe marcando la hora de modificación local (`_upd`), que es lo que
 *  permite saber después qué hay que enviar a la nube. */
export async function put(store, obj) {
  if (SYNC_STORES.includes(store)) obj = { ...obj, _upd: Date.now() };
  const r = await putRaw(store, obj);
  anotarCambio(store, obj.id);
  return r;
}

/** Escribe SIN tocar `_upd`. Lo usa la sincronización al aplicar cambios que
 *  vienen de la nube, para no marcarlos como modificados en local. */
export async function putRaw(store, obj) {
  const s = await tx(store, 'readwrite');
  return new Promise((res, rej) => {
    const r = s.put(obj);
    r.onsuccess = () => res(obj);
    r.onerror = () => rej(r.error);
  });
}

export async function get(store, id) {
  const s = await tx(store);
  return new Promise((res, rej) => {
    const r = s.get(id);
    r.onsuccess = () => res(r.result || null);
    r.onerror = () => rej(r.error);
  });
}

export async function all(store) {
  const s = await tx(store);
  return new Promise((res, rej) => {
    const r = s.getAll();
    r.onsuccess = () => res(r.result || []);
    r.onerror = () => rej(r.error);
  });
}

export async function del(store, id) {
  // Lápida: sin ella, un borrado en un dispositivo reaparecería al sincronizar
  // con otro que todavía tuviera el registro.
  if (SYNC_STORES.includes(store)) {
    await putRaw('tombstones', { id: `${store}::${id}`, store, itemId: String(id), _upd: Date.now() });
  }
  const r = await delRaw(store, id);
  anotarCambio(store, id);
  return r;
}

/** Vuelve a guardar un registro borrado (deshacer) y retira su lápida, para
 *  que la sincronización no propague el borrado que ya no existe. */
export async function restaurar(store, obj) {
  if (SYNC_STORES.includes(store)) await delRaw('tombstones', `${store}::${obj.id}`);
  return put(store, obj);
}

export async function delRaw(store, id) {
  const s = await tx(store, 'readwrite');
  return new Promise((res, rej) => {
    const r = s.delete(id);
    r.onsuccess = () => res(true);
    r.onerror = () => rej(r.error);
  });
}

export async function clear(store) {
  const s = await tx(store, 'readwrite');
  return new Promise((res, rej) => {
    const r = s.clear();
    r.onsuccess = () => res(true);
    r.onerror = () => rej(r.error);
  });
}

/** Claves de un almacén sin cargar los registros (útil para las teselas,
 *  cuyos registros llevan imágenes). */
export async function keys(store) {
  const s = await tx(store);
  return new Promise((res, rej) => {
    const r = s.getAllKeys();
    r.onsuccess = () => res(r.result || []);
    r.onerror = () => rej(r.error);
  });
}

export async function count(store) {
  const s = await tx(store);
  return new Promise((res, rej) => {
    const r = s.count();
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

/* --------------------------- Ajustes (localStorage) --------------------------- */
const LS = 'survival.settings';
const DEFAULTS = {
  theme: 'dark',        // dark | night
  contrast: 'normal',   // normal | high
  fs: 'm',              // m | l | xl
  keepAwake: false,
  lastRoute: '#/',
};

let _ajustesSesion = null;
export function settings() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(LS) || '{}') }; }
  catch { return { ...DEFAULTS, ...(_ajustesSesion || {}) }; }
}

export function setSetting(k, v) {
  const s = settings();
  s[k] = v;
  // Sin localStorage el ajuste se aplica igual en esta sesión, sin recordarse.
  try { localStorage.setItem(LS, JSON.stringify(s)); } catch { _ajustesSesion = s; }
  applySettings();
  return s;
}

export function applySettings() {
  const s = settings();
  const html = document.documentElement;
  html.dataset.theme = s.theme;
  html.dataset.contrast = s.contrast;
  html.dataset.fs = s.fs;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', s.theme === 'night' ? '#060706' : '#0d110f');
}

/* --------------------------- Export / import --------------------------- */
export async function exportAll() {
  const data = { app: 'survival-offline', version: 1, exportado: new Date().toISOString(), settings: settings(), stores: {} };
  // 'kv' contiene el plan familiar (ubicaciones, rutas, estados, acuerdos):
  // es lo más valioso de la copia. Solo quedan fuera teselas y audio, que
  // pesan mucho y se pueden volver a añadir.
  for (const s of ['kv', 'checks', 'puntos', 'contactos', 'frecs', 'radiolog', 'geo', 'progreso']) {
    data.stores[s] = await all(s);
  }
  return data;
}

export async function importAll(data, { merge = true } = {}) {
  if (!data || data.app !== 'survival-offline') throw new Error('Archivo no reconocido');
  if (data.settings) localStorage.setItem(LS, JSON.stringify({ ...DEFAULTS, ...data.settings }));
  for (const [store, rows] of Object.entries(data.stores || {})) {
    if (!STORES.includes(store)) continue;
    if (!merge) await clear(store);
    for (const row of rows) await put(store, row);
  }
  applySettings();
  return true;
}

/* --------------------------- Uso de almacenamiento --------------------------- */
export async function storageEstimate() {
  if (!navigator.storage?.estimate) return null;
  try { return await navigator.storage.estimate(); } catch { return null; }
}

export async function persistStorage() {
  if (!navigator.storage?.persist) return false;
  try { return await navigator.storage.persist(); } catch { return false; }
}
