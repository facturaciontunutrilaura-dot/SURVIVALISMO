/* =========================================================================
   store.js — persistencia local (IndexedDB + localStorage)
   Los datos se guardan en el dispositivo. Solo salen de él si el usuario
   activa la sincronización opcional (sync.js), y entonces solo los
   almacenes de SYNC_STORES y hacia el servidor que él configura.
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

/* --------------------- ¿Salen los datos del dispositivo? ---------------------
   Los textos de privacidad dependen de esto: sin sincronización, los datos
   se quedan en el dispositivo; con ella (servidor configurado y sesión
   iniciada), una copia de SYNC_STORES va al servidor de sincronización.
   Se lee la misma configuración que sync.js sin cargar ese módulo. */
export function syncActiva() {
  try {
    const c = JSON.parse(localStorage.getItem('survival.sync') || '{}');
    return Boolean(c.url && c.anon && c.access_token && c.user_id);
  } catch { return false; }
}
/** «solo en este dispositivo» o, con sincronización, dónde más se copia. */
export function dondeSeGuarda() {
  return syncActiva() ? 'en este dispositivo y, al sincronizar, en tu servidor de sincronización' : 'solo en este dispositivo';
}

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

/* ------------------------ Restauración de copias ------------------------
   Antes de tocar nada se valida el archivo entero. Si algo no cuadra, se
   rechaza con el motivo y los datos actuales no cambian. Si es válido, se
   escribe en UNA sola transacción de IndexedDB: o entra todo o no entra
   nada (no hay restauraciones a medias). */
const VERSION_COPIA = 1;
const COPIA_STORES = ['kv', 'checks', 'puntos', 'contactos', 'frecs', 'radiolog', 'geo', 'progreso'];
export const NOMBRES_COPIA = {
  kv: 'Plan familiar, acuerdos y ajustes del plan',
  contactos: 'Contactos',
  puntos: 'Puntos del mapa',
  checks: 'Marcas de checklists',
  frecs: 'Frecuencias propias',
  radiolog: 'Registro de radio',
  geo: 'Capas y rutas importadas',
  progreso: 'Progreso de cursos',
};
const esObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const idValido = (id) => (typeof id === 'string' && id.length > 0 && id.length <= 500) || Number.isFinite(id);
/* Lo mínimo que necesita cada registro para que la app lo pueda usar. */
const CAMPOS = {
  kv: (r) => 'v' in r,
  contactos: (r) => typeof r.n === 'string',
  puntos: (r) => Number.isFinite(r.lat) && Number.isFinite(r.lon) && Math.abs(r.lat) <= 90 && Math.abs(r.lon) <= 180,
  checks: (r) => typeof r.id === 'string' && r.id.includes('::'),
  frecs: (r) => typeof r.f === 'string',
  radiolog: (r) => typeof r.f === 'string',
  geo: (r) => esObj(r.data),
  progreso: () => true,
};

/** Comprueba una copia sin escribir nada. Devuelve
 *  { ok, errores: [texto], resumen: { exportado, stores: {store: n}, ignorados: [store], ajustes } }. */
export function validarCopia(data) {
  const errores = [];
  if (!esObj(data)) return { ok: false, errores: ['El archivo no tiene el formato de una copia de seguridad.'] };
  if (data.app !== 'survival-offline') return { ok: false, errores: ['El archivo no es una copia de seguridad de esta app.'] };
  if (!Number.isInteger(data.version) || data.version < 1) errores.push('La copia no indica su versión de formato.');
  else if (data.version > VERSION_COPIA) errores.push('La copia es de una versión más nueva de la app. Actualiza la app antes de restaurarla.');
  if (!esObj(data.stores)) errores.push('La copia no contiene datos.');
  if (data.settings !== undefined && !esObj(data.settings)) errores.push('Los ajustes de la copia están dañados.');
  const resumen = { exportado: typeof data.exportado === 'string' ? data.exportado : null, stores: {}, ignorados: [], ajustes: esObj(data.settings) };
  if (esObj(data.stores)) {
    for (const [st, filas] of Object.entries(data.stores)) {
      if (!COPIA_STORES.includes(st)) { resumen.ignorados.push(st); continue; }
      const nombre = NOMBRES_COPIA[st];
      if (!Array.isArray(filas)) { errores.push(`«${nombre}» está dañado (no es una lista).`); continue; }
      const malas = filas.filter((r) => !esObj(r) || !idValido(r.id) || !CAMPOS[st](r)).length;
      const ids = new Set(filas.filter(esObj).map((r) => r.id));
      if (malas) errores.push(`«${nombre}»: ${malas} ${malas === 1 ? 'registro dañado o incompleto' : 'registros dañados o incompletos'}.`);
      else if (ids.size !== filas.length) errores.push(`«${nombre}»: hay registros repetidos.`);
      resumen.stores[st] = filas.length;
    }
    if (!errores.length && !Object.values(resumen.stores).some((n) => n > 0) && !resumen.ajustes) errores.push('La copia está vacía: no contiene ningún dato.');
  }
  return { ok: errores.length === 0, errores, resumen };
}

/** Restaura una copia YA VALIDADA. Fusiona con lo existente: si un registro
 *  existe en los dos lados, gana el de la copia. Los registros idénticos a
 *  los actuales no se reescriben (así la sincronización no vuelve a subirlo
 *  todo); los que cambian quedan marcados como modificados para subirse.
 *  Devuelve { nuevos, cambiados, iguales }. */
export async function importAll(data, { merge = true } = {}) {
  const v = validarCopia(data);
  if (!v.ok) throw new Error(v.errores.join(' '));
  const db = await openDB();
  const stores = Object.keys(v.resumen.stores);
  const cuenta = { nuevos: 0, cambiados: 0, iguales: 0 };
  const limpio = ({ _upd, ...r }) => JSON.stringify(r);
  const ahora = Date.now();
  await new Promise((res, rej) => {
    const t = db.transaction([...stores, 'tombstones'], 'readwrite');
    t.oncomplete = () => res();
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error || new Error('La restauración se ha cancelado; no se ha cambiado nada.'));
    for (const st of stores) {
      const os = t.objectStore(st);
      if (!merge) os.clear();
      for (const fila of data.stores[st]) {
        const g = os.get(fila.id);
        g.onsuccess = () => {
          const actual = g.result;
          if (merge && actual && limpio(actual) === limpio(fila)) { cuenta.iguales++; return; }
          if (actual && merge) cuenta.cambiados++; else cuenta.nuevos++;
          os.put(SYNC_STORES.includes(st) ? { ...fila, _upd: ahora } : fila);
          // Si se había borrado aquí, su lápida impediría que volviera al sincronizar.
          t.objectStore('tombstones').delete(`${st}::${fila.id}`);
        };
      }
    }
  });
  // Los ajustes (tema, tamaño de letra…) solo cuando los datos ya han entrado.
  if (v.resumen.ajustes) {
    try { localStorage.setItem(LS, JSON.stringify({ ...DEFAULTS, ...data.settings })); } catch { /* sin localStorage */ }
    applySettings();
  }
  if (cuenta.nuevos + cuenta.cambiados) { try { localStorage.setItem('survival.ultimoCambio', String(ahora)); } catch { /* sin localStorage */ } }
  return cuenta;
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
