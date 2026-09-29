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

export function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const s of STORES) if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' });
    };
    req.onsuccess = () => { _db = req.result; res(_db); };
    req.onerror = () => rej(req.error);
  });
}

function tx(store, mode = 'readonly') {
  return openDB().then((db) => db.transaction(store, mode).objectStore(store));
}

/** Escribe marcando la hora de modificación local (`_upd`), que es lo que
 *  permite saber después qué hay que enviar a la nube. */
export async function put(store, obj) {
  if (SYNC_STORES.includes(store)) obj = { ...obj, _upd: Date.now() };
  return putRaw(store, obj);
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
  return delRaw(store, id);
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

export function settings() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(LS) || '{}') }; }
  catch { return { ...DEFAULTS }; }
}

export function setSetting(k, v) {
  const s = settings();
  s[k] = v;
  localStorage.setItem(LS, JSON.stringify(s));
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
