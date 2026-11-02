/* =========================================================================
   sync.js — Sincronización opcional con Supabase
   ---------------------------------------------------------------------------
   PRINCIPIOS INNEGOCIABLES

   1. LOCAL-FIRST. IndexedDB es la fuente de verdad. Supabase es un espejo.
      Si no hay red, si Supabase cae o si el usuario nunca configura nada,
      la aplicación funciona exactamente igual que antes. Nada en la app
      espera a la nube para funcionar.

   2. SIN SDK. Se habla con Supabase por su API REST (PostgREST + GoTrue)
      usando `fetch`. Evita cargar ~120 KB de SDK y mantiene la regla del
      proyecto de no depender de librerías externas cargadas dinámicamente.

   3. LAS TESELAS NO SE SINCRONIZAN. Son megas de imágenes redescargables.

   4. TODO ES OPCIONAL. Si `sync.url` no está configurado, este módulo no
      hace absolutamente nada.

   MODELO DE CONFLICTOS
   Last-write-wins con preferencia local. Al sincronizar:
     · se bajan los cambios remotos posteriores a la última sincronización;
     · si un registro se ha tocado en local desde la última sincronización
       correcta, gana el local y se sube;
     · si no, se aplica el remoto.
   En cristiano: si editas lo mismo en dos dispositivos sin sincronizar entre
   medias, gana el dispositivo desde el que sincronices más tarde.
   ========================================================================= */

import * as store from './store.js';

const LS = 'survival.sync';
const TABLA = 'sync_items';

export function cfg() {
  try { return JSON.parse(localStorage.getItem(LS) || '{}'); } catch { return {}; }
}
export function setCfg(patch) {
  const c = { ...cfg(), ...patch };
  localStorage.setItem(LS, JSON.stringify(c));
  return c;
}
export function configurado() {
  const c = cfg();
  return Boolean(c.url && c.anon);
}
export function sesionActiva() {
  const c = cfg();
  return Boolean(c.access_token && c.user_id);
}

/** Normaliza lo que haya pegado el usuario y devuelve SOLO el origen.
 *  Así da igual que copie `https://xxx.supabase.co/rest/v1`, con barra final o
 *  con cualquier ruta detrás: la app siempre construye bien sus peticiones. */
export function normalizarUrl(raw = '') {
  const t = String(raw).trim();
  if (!t) return '';
  try { return new URL(t.includes('://') ? t : 'https://' + t).origin; }
  catch { return t.replace(/\/+$/, ''); }
}

const base = () => normalizarUrl(cfg().url);

async function api(path, { method = 'GET', body, headers = {}, auth = true } = {}) {
  const c = cfg();
  const h = { apikey: c.anon, 'Content-Type': 'application/json', ...headers };
  if (auth && c.access_token) h.Authorization = `Bearer ${c.access_token}`;
  const r = await fetch(base() + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  if (r.status === 401 && auth && c.refresh_token) {
    await refrescar();
    return api(path, { method, body, headers, auth });
  }
  if (!r.ok) {
    let msg = `HTTP ${r.status}`;
    try { const j = await r.json(); msg = j.msg || j.message || j.error_description || j.error || msg; } catch {}
    throw new Error(msg);
  }
  const txt = await r.text();
  return txt ? JSON.parse(txt) : null;
}

/* ------------------------------ Autenticación ------------------------------ */
function guardarSesion(s) {
  setCfg({
    access_token: s.access_token,
    refresh_token: s.refresh_token,
    user_id: s.user?.id || cfg().user_id,
    email: s.user?.email || cfg().email,
    expira: Date.now() + (s.expires_in || 3600) * 1000,
  });
}

export async function registrar(email, password) {
  const s = await api('/auth/v1/signup', { method: 'POST', body: { email, password }, auth: false });
  if (s?.access_token) guardarSesion(s);
  return s;
}

export async function entrar(email, password) {
  const s = await api('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password }, auth: false });
  guardarSesion(s);
  return s;
}

export async function refrescar() {
  const c = cfg();
  const s = await api('/auth/v1/token?grant_type=refresh_token', {
    method: 'POST', body: { refresh_token: c.refresh_token }, auth: false,
  });
  guardarSesion(s);
  return s;
}

export function salir() {
  setCfg({ access_token: null, refresh_token: null, user_id: null, email: null, expira: null });
}

/* ------------------------------ Sincronización ------------------------------ */
const MAX_BYTES = 900_000; // margen frente al límite habitual de fila/petición

function tamano(o) {
  try { return new Blob([JSON.stringify(o)]).size; } catch { return JSON.stringify(o).length; }
}

/** Registros locales modificados desde la última sincronización correcta. */
async function cambiosLocales(desde) {
  const filas = [];
  const omitidos = [];
  for (const s of store.SYNC_STORES) {
    for (const row of await store.all(s)) {
      if ((row._upd || 0) <= desde) continue;
      const { _upd, ...data } = row;
      if (tamano(data) > MAX_BYTES) { omitidos.push(`${s}/${row.id}`); continue; }
      filas.push({ store: s, item_id: String(row.id), data, deleted: false });
    }
  }
  for (const t of await store.all('tombstones')) {
    if ((t._upd || 0) <= desde) continue;
    filas.push({ store: t.store, item_id: t.itemId, data: null, deleted: true });
  }
  return { filas, omitidos };
}

/** Sincronización completa: baja, resuelve, sube. Devuelve un resumen. */
export async function sincronizar({ onPaso } = {}) {
  if (!configurado()) throw new Error('Sincronización no configurada');
  if (!sesionActiva()) throw new Error('No has iniciado sesión');
  if (!navigator.onLine) throw new Error('Sin conexión: la app sigue funcionando, la sincronización no');

  const c = cfg();
  const desde = c.ultimaSync || 0;
  const cursor = c.cursor || '1970-01-01T00:00:00Z';
  const res = { bajados: 0, aplicados: 0, conflictos: 0, subidos: 0, borrados: 0, omitidos: [] };

  /* 1 · BAJAR */
  onPaso?.('Bajando cambios…');
  const q = `/rest/v1/${TABLA}?select=store,item_id,data,deleted,updated_at`
    + `&updated_at=gt.${encodeURIComponent(cursor)}&order=updated_at.asc&limit=5000`;
  const remotos = (await api(q)) || [];
  res.bajados = remotos.length;

  let maxUpd = cursor;
  for (const r of remotos) {
    if (r.updated_at > maxUpd) maxUpd = r.updated_at;
    if (!store.SYNC_STORES.includes(r.store)) continue;

    const local = await store.get(r.store, r.item_id);
    // Conflicto: tocado en local después de la última sincronización → gana el local.
    if (local && (local._upd || 0) > desde) { res.conflictos++; continue; }

    if (r.deleted) {
      if (local) { await store.delRaw(r.store, r.item_id); res.borrados++; }
      await store.delRaw('tombstones', `${r.store}::${r.item_id}`);
    } else if (r.data) {
      await store.putRaw(r.store, { ...r.data, id: r.item_id, _upd: desde });
      res.aplicados++;
    }
  }

  /* 2 · SUBIR */
  onPaso?.('Subiendo cambios…');
  const { filas, omitidos } = await cambiosLocales(desde);
  res.omitidos = omitidos;
  if (filas.length) {
    const conUsuario = filas.map((f) => ({ ...f, user_id: c.user_id }));
    for (let i = 0; i < conUsuario.length; i += 200) {
      await api(`/rest/v1/${TABLA}?on_conflict=user_id,store,item_id`, {
        method: 'POST',
        body: conUsuario.slice(i, i + 200),
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      });
    }
    res.subidos = filas.length;
    // Tras subir las bajas, las lápidas ya no hacen falta en este dispositivo.
    for (const t of await store.all('tombstones')) {
      if ((t._upd || 0) > desde) await store.delRaw('tombstones', t.id);
    }
  }

  /* 3 · CURSORES */
  setCfg({ ultimaSync: Date.now(), cursor: maxUpd, ultimoResumen: res, ultimoError: null });
  onPaso?.('Listo');
  return res;
}

/** Intento silencioso: se llama al arrancar y al recuperar la conexión.
 *  Nunca lanza: si falla, la app sigue funcionando sin enterarse. */
export async function autoSync() {
  try {
    if (!cfg().auto || !configurado() || !sesionActiva() || !navigator.onLine) return null;
    const r = await sincronizar();
    window.dispatchEvent(new CustomEvent('sync:ok', { detail: r }));
    return r;
  } catch (e) {
    setCfg({ ultimoError: e.message });
    window.dispatchEvent(new CustomEvent('sync:error', { detail: e.message }));
    return null;
  }
}

/* ============================== DIAGNÓSTICO ==============================
   Comprueba capa por capa qué falta y devuelve, para cada fallo, la acción
   concreta que hay que hacer. Sustituye al "no funciona y no sé por qué".
   ======================================================================== */
export async function diagnosticar() {
  const pasos = [];
  const add = (t, estado, msg, arreglo = '') => pasos.push({ t, estado, msg, arreglo });
  const c = cfg();

  /* 1 · URL */
  if (!c.url) {
    add('URL del proyecto', 'error', 'No has pegado la URL.', 'Cópiala de Supabase → Settings → API, o del botón Connect.');
    return pasos;
  }
  const bruto = c.url.trim();
  const u = normalizarUrl(bruto);
  let host = '', ruta = '';
  try { const p = new URL(u ? bruto.includes('://') ? bruto : 'https://' + bruto : bruto); host = p.host; ruta = p.pathname; }
  catch { /* URL inválida */ }

  // La URL del panel de control, que es la que se tiene abierta al copiar y
  // la confusión más habitual después de la anterior.
  const refPanel = bruto.match(/supabase\.com\/dashboard\/project\/([a-z0-9]{16,})/i)?.[1];
  if (refPanel) {
    setCfg({ url: `https://${refPanel}.supabase.co` });
    add('URL del proyecto', 'warn',
      'Habías puesto la dirección del panel de control de Supabase, no la del proyecto.',
      `Corregida automáticamente a https://${refPanel}.supabase.co — vuelve a pulsar Comprobar configuración.`);
    return pasos;
  }

  const gestionado = /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(u);
  const mismaApp = host && typeof location !== 'undefined' && host === location.host;
  const alojamientoConocido = /\.(netlify\.app|vercel\.app|pages\.dev|github\.io|onrender\.com)$/i.test(host);

  const esLocal = /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host);
  if (!host || (!host.includes('.') && !esLocal)) {
    add('URL del proyecto', 'error', `«${bruto}» no es una dirección válida.`,
      'Cópiala de Supabase → Settings → API, campo "Project URL". Acaba en .supabase.co');
    return pasos;
  }
  if (mismaApp) {
    add('URL del proyecto', 'error', `Has puesto la dirección de esta misma aplicación (${host}), no la de Supabase.`,
      'La URL de Supabase es distinta y acaba en .supabase.co. Está en Supabase → Settings → API → Project URL, o en el botón Connect.');
    return pasos;
  }
  if (alojamientoConocido) {
    add('URL del proyecto', 'error', `${host} es una dirección de alojamiento web, no un proyecto de Supabase.`,
      'Busca en Supabase → Settings → API el campo "Project URL": es del tipo https://xxxxxxxxxxxx.supabase.co');
    return pasos;
  }
  // Ruta pegada detrás del dominio: se limpia sola en vez de dar error.
  if (ruta && ruta !== '/') {
    setCfg({ url: u });
    add('URL del proyecto', 'ok',
      `${u} — le sobraba la ruta «${ruta}» y se ha quitado automáticamente.`);
  } else if (gestionado) {
    add('URL del proyecto', 'ok', u);
  } else if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(u)) {
    add('URL del proyecto', 'ok', `${u} (Supabase local de desarrollo)`);
  } else {
    add('URL del proyecto', 'warn',
      `${host} no es un dominio de Supabase. Solo es correcto si tienes Supabase autoalojado en tu propio servidor.`,
      'Si no lo has instalado tú, la URL buena está en Supabase → Settings → API → Project URL y acaba en .supabase.co');
  }

  /* 2 · Clave */
  if (!c.anon) {
    add('Clave pública', 'error', 'No has pegado la clave.', 'Supabase → Settings → API Keys. Vale la publishable o la anon.');
    return pasos;
  }
  if (/^sb_secret_/i.test(c.anon) || /service_role/i.test(c.anon)) {
    add('Clave pública', 'error', '⚠️ Has pegado una clave SECRETA. Esa clave se salta la seguridad y da acceso total a todos los datos.',
      'Bórrala, revócala en Supabase y usa la publishable o la anon.');
    return pasos;
  }
  add('Clave pública', 'ok', /^sb_publishable_/i.test(c.anon) ? 'Publishable (formato nuevo)' : 'anon (formato antiguo, válido hasta finales de 2026)');

  if (!navigator.onLine) {
    add('Conexión', 'error', 'Estás sin conexión.', 'La app funciona igual; para comprobar la sincronización necesitas red.');
    return pasos;
  }

  /* 3 y 4 · Conexión, clave y tabla, en una sola petición real.
     No se usa /rest/v1/ como sonda: ese endpoint devuelve 401 o 404 según la
     configuración del proyecto aunque la clave sea válida, y daba falsos
     negativos. Se prueba directamente contra la tabla, que es lo que importa. */
  let filasSinSesion = null;
  let resp, cuerpo = null;
  try {
    resp = await fetch(base() + `/rest/v1/${TABLA}?select=store&limit=1`, { headers: { apikey: c.anon } });
    cuerpo = await resp.clone().json().catch(() => null);
  } catch {
    add('Conexión con Supabase', 'error', 'No se ha podido contactar con el proyecto.',
      'Comprueba la URL y que el proyecto no esté pausado en Supabase: los gratuitos se pausan por inactividad y hay que reactivarlos desde el panel.');
    return pasos;
  }

  const msg = cuerpo?.message || cuerpo?.msg || cuerpo?.hint || '';

  if (resp.status === 401 || resp.status === 403) {
    const sinClave = /no api key/i.test(msg);
    add('Conexión con Supabase', 'error',
      `El servidor rechaza la petición (${resp.status})${msg ? `: «${msg}»` : ''}.`,
      sinClave
        ? 'La clave no está llegando. Vuelve a pegarla y guarda la conexión.'
        : 'Copia la clave otra vez completa desde Settings → API Keys. Si el proyecto es nuevo y usas la clave publishable, prueba también con la clave "anon" de la misma pantalla.');
    return pasos;
  }

  if (resp.status >= 500) {
    add('Conexión con Supabase', 'error', `El proyecto devuelve un error ${resp.status}.`,
      'Suele significar que el proyecto está pausado o reiniciándose. Compruébalo en el panel de Supabase.');
    return pasos;
  }

  add('Conexión con Supabase', 'ok', 'El proyecto responde y acepta la clave.');

  if (resp.status === 404 || resp.status === 400 || /PGRST205|does not exist|schema cache/i.test(msg)) {
    add('Tabla sync_items', 'error', `No existe la tabla${msg ? `: ${msg}` : ''}.`,
      'Copia el SQL del paso 2 y ejecútalo en Supabase → SQL Editor → Run.');
    return pasos;
  }

  filasSinSesion = cuerpo;
  add('Tabla sync_items', 'ok', 'Existe y responde correctamente.');

  /* 5 · RLS activa — comprobación de seguridad de verdad */
  if (Array.isArray(filasSinSesion) && filasSinSesion.length > 0) {
    add('Seguridad RLS', 'error', '⚠️ GRAVE: sin iniciar sesión se pueden leer filas. La política RLS no está activa y cualquiera con la clave pública podría leer tus datos.',
      'Vuelve a ejecutar el SQL del paso 2 entero, incluida la parte de "alter table ... enable row level security".');
  } else {
    add('Seguridad RLS', 'ok', 'Sin sesión no se devuelve ninguna fila: la política está haciendo su trabajo.');
  }

  /* 6 · Sesión */
  if (!sesionActiva()) {
    add('Sesión', 'warn', 'No has iniciado sesión todavía.', 'Crea una cuenta o entra en el paso 3.');
    return pasos;
  }
  add('Sesión', 'ok', `Iniciada como ${c.email || c.user_id}`);

  /* 7 · Escritura y lectura reales */
  try {
    const prueba = { user_id: c.user_id, store: '__diagnostico', item_id: 'ping', data: { ok: true }, deleted: false };
    await api(`/rest/v1/${TABLA}?on_conflict=user_id,store,item_id`, {
      method: 'POST', body: [prueba], headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    });
    const leido = await api(`/rest/v1/${TABLA}?select=item_id&store=eq.__diagnostico&limit=1`);
    if (Array.isArray(leido) && leido.length) {
      add('Escritura y lectura', 'ok', 'Se ha escrito y recuperado un registro de prueba correctamente.');
      await api(`/rest/v1/${TABLA}?store=eq.__diagnostico`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }).catch(() => {});
    } else {
      add('Escritura y lectura', 'warn', 'Se ha escrito pero no se ha podido leer de vuelta.', 'Revisa que la política RLS incluya la parte "using (auth.uid() = user_id)".');
    }
  } catch (e) {
    add('Escritura y lectura', 'error', e.message,
      /row-level security/i.test(e.message)
        ? 'La política RLS está bloqueando la escritura. Ejecuta de nuevo el SQL del paso 2 completo.'
        : 'Revisa el SQL del paso 2.');
  }

  return pasos;
}

/** Config de sincronización lista para llevar al otro dispositivo.
 *  Nunca incluye la sesión: en el otro aparato hay que iniciar sesión. */
export function configTransferible() {
  const c = cfg();
  return c.url && c.anon ? { url: c.url, anon: c.anon } : null;
}
export function aplicarConfigTransferible(o) {
  if (o?.url && o?.anon) setCfg({ url: o.url, anon: o.anon });
}

/** Extrae URL y clave de cualquier cosa que el usuario pegue: el snippet de
 *  "Connect" de Supabase, un .env, o los dos valores sueltos. */
export function detectarCredenciales(texto) {
  const url = texto.match(/https:\/\/[a-z0-9-]+\.supabase\.(?:co|in)/i)?.[0] || null;
  const key = texto.match(/\bsb_publishable_[A-Za-z0-9_-]+/)?.[0]
    || texto.match(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/)?.[0]
    || null;
  return { url, key };
}

/** SQL que el usuario debe pegar una sola vez en el editor de Supabase. */
export const SQL_ESQUEMA = `-- SURVIVAL OFFLINE · esquema de sincronización
-- Pégalo entero en Supabase → SQL Editor → Run. Solo hay que hacerlo una vez.

create table if not exists public.sync_items (
  user_id    uuid        not null references auth.users(id) on delete cascade,
  store      text        not null,
  item_id    text        not null,
  data       jsonb,
  deleted    boolean     not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, store, item_id)
);

alter table public.sync_items enable row level security;

drop policy if exists "solo mis filas" on public.sync_items;
create policy "solo mis filas" on public.sync_items
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists sync_items_touch on public.sync_items;
create trigger sync_items_touch
  before update on public.sync_items
  for each row execute function public.touch_updated_at();

create index if not exists sync_items_user_updated
  on public.sync_items (user_id, updated_at desc);`;
