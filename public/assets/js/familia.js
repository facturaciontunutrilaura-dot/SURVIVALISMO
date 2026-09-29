/* =========================================================================
   familia.js — 👨‍👩‍👧‍👦 CENTRO DE COORDINACIÓN FAMILIAR
   Ubicaciones, estado, rutas por situación, mapa familiar, plan 72 h y plan
   de reunificación.

   Todo lo configura el usuario: la aplicación no trae ninguna ubicación ni
   ninguna ruta precargada. Se guarda solo en el dispositivo (IndexedDB,
   almacén 'kv'), salvo que el usuario active la sincronización opcional.
   ========================================================================= */
import { el, esc, toast, uid } from './ui.js';
import * as store from './store.js';
import * as ubi from './ubicacion.js';
import {
  PLANTILLA_NODO, RUTA_PLANTILLA, ICONOS_NODO, EJEMPLO_NODOS, ESTADOS, PREPARACION_ESTADO,
  SITUACIONES, VELOCIDADES, CAPAS_POI, CAPAS_ESTADO, SERVICIOS_VERIFICADOS, AVISO_RUTAS, PLAN72,
} from '../../data/content/familia.js';

const kv = async (id, def) => (await store.get('kv', id))?.v ?? def;
const setKv = (id, v) => store.put('kv', { id, v });

const CLAVE = 'familia.nodos';
const letra = (i) => String.fromCharCode(65 + (i % 26));
const norm = (s = '') => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

/* ========================================================================
   MODELO DE DATOS
   ======================================================================== */

/** Completa los campos que falten y migra datos de versiones anteriores
 *  (que guardaban la provincia como texto en `prov` y no tenían rutas). */
function normalizar(nd) {
  const n = { ...PLANTILLA_NODO, ...nd };
  n.id = n.id || uid();
  n.personas = { ...PLANTILLA_NODO.personas, ...(nd.personas || {}) };
  n.rutas = Array.isArray(nd.rutas) ? nd.rutas.map((r) => ({ ...RUTA_PLANTILLA, id: r.id || uid(), ...r })) : [];
  if (!n.cod && nd.prov) {
    const p = ubi.PROVINCIAS.find((x) => norm(x.nombre) === norm(nd.prov) || norm(x.nombre).split('/').map((y) => y.trim()).includes(norm(nd.prov)));
    if (p) n.cod = p.cod;
  }
  if (!Number.isFinite(n.lat) || !Number.isFinite(n.lon)) { n.lat = null; n.lon = null; }
  return n;
}

/** Ubicaciones configuradas por el usuario. Vacío si aún no ha creado ninguna. */
export async function nodos() {
  const guardados = await kv(CLAVE, null);
  return Array.isArray(guardados) ? guardados.map(normalizar) : [];
}

export async function guardarNodos(ns) {
  await setKv(CLAVE, ns.map(normalizar));
}

const base = (ns) => ns.find((x) => x.rol === 'base') || null;
const destinos = (ns) => ns.filter((x) => x.rol !== 'base');
const tieneCoords = (nd) => Number.isFinite(nd?.lat) && Number.isFinite(nd?.lon);

const fmtTiempo = (h) => {
  const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  return mm === 60 ? `${hh + 1} h 00 min` : `${hh} h ${String(mm).padStart(2, '0')} min`;
};

async function lineaRecta(a, b) {
  if (!tieneCoords(a) || !tieneCoords(b)) return null;
  const { distanciaKm } = await import('./maps.js');
  return distanciaKm(a.lat, a.lon, b.lat, b.lon);
}

function vacio(msg, extra = '') {
  return `<div class="card"><div class="blk-note">${msg}</div>${extra}</div>`;
}

const CONFIGURAR = '<a class="btn wide" href="#/sec/familia">👨‍👩‍👧 Configurar ubicaciones</a>';

/* ========================================================================
   PANEL PRINCIPAL
   ======================================================================== */
export async function familiaView() {
  const ns = await nodos();
  const estados = await kv('familia.estados', {});
  const prep = await kv('familia.prep', {});

  const n = el(`<div>
    <div id="fa-top"></div>
    <div id="fa-cuerpo"></div>
    <h2 style="margin-top:18px">📍 Ubicaciones</h2>
    <div class="muted" style="margin-bottom:8px">Tu casa (la <b>base</b>, desde donde se parte) y las de las personas a las que querrías llegar. Todo se guarda <b>solo en este dispositivo</b>.</div>
    <div id="fa-nodos"></div>
    <div class="btnrow">
      <button class="btn" id="fa-add" type="button">➕ Añadir ubicación</button>
    </div>
  </div>`);

  const guardar = () => guardarNodos(ns);
  let tGuardar;
  const guardarLuego = () => { clearTimeout(tGuardar); tGuardar = setTimeout(guardar, 350); };

  function pintaTop() {
    const top = n.querySelector('#fa-top');
    const hayEjemplo = ns.some((x) => x.ejemplo);
    const puedeIr = base(ns) && destinos(ns).length;
    top.innerHTML = `
      ${hayEjemplo ? `<div class="blk-warn"><b>Estás viendo datos de EJEMPLO ficticios.</b> Edítalos con tus datos reales o bórralos.
        <div class="btnrow"><button class="btn sm danger" id="fa-borrar-ej" type="button">Borrar el ejemplo</button></div></div>` : ''}
      ${puedeIr ? '<a class="btn wide heart" href="#/familia/ir" style="margin-bottom:12px">❤️ QUIERO LLEGAR A MI FAMILIA</a>' : ''}`;
    top.querySelector('#fa-borrar-ej')?.addEventListener('click', async () => {
      if (!confirm('¿Borrar las ubicaciones de ejemplo?')) return;
      for (let i = ns.length - 1; i >= 0; i--) if (ns[i].ejemplo) ns.splice(i, 1);
      await guardar(); pintaTodo(); toast('Ejemplo borrado');
    });
  }

  function pintaCuerpo() {
    const c = n.querySelector('#fa-cuerpo');
    if (!ns.length) {
      c.innerHTML = `<div class="card">
        <h3>Configura tu plan familiar</h3>
        <p>Empieza por tu <b>casa</b> y añade después las ubicaciones de las personas con las que querrías reunirte en una emergencia. Con eso la aplicación calcula el plan de 72 horas, organiza las rutas por situación y prepara el plan de reunificación.</p>
        <div class="btnrow">
          <button class="btn" id="fa-add-base" type="button">🏠 Añadir mi casa</button>
          <button class="btn ghost" id="fa-ejemplo" type="button">👀 Ver un ejemplo ficticio</button>
        </div>
      </div>`;
      c.querySelector('#fa-add-base').addEventListener('click', () => anadir('base'));
      c.querySelector('#fa-ejemplo').addEventListener('click', async () => {
        EJEMPLO_NODOS.forEach((e) => ns.push(normalizar({ ...structuredClone(e), id: uid() })));
        await guardar(); pintaTodo(); toast('Ejemplo cargado: edítalo o bórralo');
      });
      return;
    }
    c.innerHTML = `
      <h2>👨‍👩‍👧‍👦 Estado familiar</h2>
      <div class="muted" style="margin-bottom:8px">Los estados son <b>manuales</b>: la aplicación no puede saber cómo está realmente una persona. Actualízalos tú cuando tengas información.</div>
      <div class="list" id="fa-estado"></div>
      <div class="btnrow" style="margin-top:14px">
        <a class="btn sm" href="#/familia/rutas">🛣️ Rutas</a>
        <a class="btn sm ghost" href="#/familia/mapa">🗺 Mapa familiar</a>
        <a class="btn sm ghost" href="#/familia/plan72">🎒 Plan 72 h</a>
        <a class="btn sm ghost" href="#/familia/reunion">🤝 Reunificación</a>
        <a class="btn sm ghost" href="#/familia/offline">📴 Si no hay Internet</a>
        <a class="btn sm ghost" href="#/riesgos/comparar">📊 Comparar riesgo</a>
        <a class="btn sm ghost" href="#/sec/plan-familiar">📇 Contactos y acuerdos</a>
      </div>`;
    pintaEstado();
  }

  function pintaEstado() {
    const box = n.querySelector('#fa-estado');
    if (!box) return;
    box.innerHTML = ns.map((nd) => {
      const e = ESTADOS.find((x) => x.id === (estados[nd.id]?.estado || 'nd')) || ESTADOS[ESTADOS.length - 1];
      const p = PREPARACION_ESTADO.find((x) => x.id === (prep[nd.id] || 'revisar'));
      const ts = estados[nd.id]?.ts;
      return `<div class="row" style="border-left-color:${e.c}">
        <span style="font-size:1.3rem">${esc(nd.ic)}</span>
        <div class="rt"><b>${esc(nd.nombre || 'Sin nombre')}${nd.persona ? ' · ' + esc(nd.persona) : ''}</b>
          <span>${e.ic} ${esc(e.t)}${ts ? ' · ' + new Date(ts).toLocaleString('es-ES') : ''}<br>Preparación: ${p.ic} ${esc(p.t)}</span></div>
        <button class="btn sm ghost" data-est="${esc(nd.id)}" type="button">Cambiar</button>
      </div>`;
    }).join('');

    box.querySelectorAll('[data-est]').forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.est;
      box.querySelector('.estado-edit')?.remove();
      const panel = el(`<div class="card estado-edit"><h3>Actualizar ${esc(ns.find((x) => x.id === id).nombre)}</h3>
        <label>Estado de la persona</label>
        <div class="btnrow">${ESTADOS.map((e) => `<button class="btn sm ghost" data-se="${e.id}" type="button">${e.ic} ${esc(e.t)}</button>`).join('')}</div>
        <label>Estado de preparación</label>
        <div class="btnrow">${PREPARACION_ESTADO.map((p) => `<button class="btn sm ghost" data-sp="${p.id}" type="button">${p.ic} ${esc(p.t)}</button>`).join('')}</div>
        <button class="btn ghost wide sm" data-cerrar type="button">Cerrar</button></div>`);
      b.closest('.row').after(panel);
      panel.querySelectorAll('[data-se]').forEach((x) => x.addEventListener('click', async () => {
        estados[id] = { estado: x.dataset.se, ts: Date.now() };
        await setKv('familia.estados', estados);
        pintaEstado(); toast('Estado actualizado');
      }));
      panel.querySelectorAll('[data-sp]').forEach((x) => x.addEventListener('click', async () => {
        prep[id] = x.dataset.sp;
        await setKv('familia.prep', prep);
        pintaEstado(); toast('Preparación actualizada');
      }));
      panel.querySelector('[data-cerrar]').addEventListener('click', () => panel.remove());
    }));
  }

  /* ----------------------------- Editor de ubicación ----------------------------- */
  function editorNodo(nd) {
    const provs = ubi.PROVINCIAS_ORDENADAS
      .map((p) => `<option value="${esc(p.cod)}"${p.cod === nd.cod ? ' selected' : ''}>${esc(p.nombre)}</option>`).join('');
    const id = (k) => `nd-${nd.id}-${k}`;
    const campo = (k, t, extra = '') => `<label for="${id(k)}">${t}</label><input id="${id(k)}" data-f="${k}" value="${esc(nd[k] ?? '')}" ${extra}>`;
    const num = (k, t) => `<div><label for="${id(k)}">${t}</label><input id="${id(k)}" type="number" min="0" inputmode="numeric" data-p="${k}" value="${nd.personas[k] ?? 0}"></div>`;

    const d = el(`<details class="card nodo" data-nodo="${esc(nd.id)}"><summary>${esc(nd.ic)} ${esc(nd.nombre || 'Nueva ubicación')}${nd.persona ? ' — ' + esc(nd.persona) : ''}
        <span class="badge">${nd.rol === 'base' ? 'base' : 'familia'}</span>${nd.ejemplo ? ' <span class="badge warn">ejemplo</span>' : ''}</summary><div>
      <div class="fieldrow">
        <div>${campo('nombre', 'Nombre del lugar', 'placeholder="Ej. Casa, casa de los abuelos…"')}</div>
        <div>${campo('persona', 'Quién vive aquí', 'placeholder="Ej. Abuela y abuelo"')}</div>
      </div>
      <div class="fieldrow">
        <div><label for="${id('rol')}">Papel</label><select id="${id('rol')}" data-f="rol">
          <option value="base"${nd.rol === 'base' ? ' selected' : ''}>🏠 Base (desde donde partimos)</option>
          <option value="familia"${nd.rol !== 'base' ? ' selected' : ''}>👨‍👩‍👧 Familia (a donde queremos llegar)</option>
        </select></div>
        <div><label for="${id('ic')}">Icono</label><select id="${id('ic')}" data-f="ic">${ICONOS_NODO.map((i) => `<option${i === nd.ic ? ' selected' : ''}>${i}</option>`).join('')}</select></div>
      </div>
      <div class="fieldrow">
        <div><label for="${id('cod')}">Provincia</label><select id="${id('cod')}" data-f="cod"><option value="">— Provincia —</option>${provs}</select></div>
        <div>${campo('municipio', 'Municipio')}</div>
      </div>
      ${campo('tel', 'Teléfonos', 'inputmode="tel" placeholder="Separados por comas"')}
      ${campo('dir', 'Dirección')}
      ${campo('encuentro', 'Punto de encuentro acordado', 'placeholder="Un lugar concreto que todos conozcáis"')}
      <label for="${id('notas')}">Notas</label><textarea id="${id('notas')}" data-f="notas">${esc(nd.notas || '')}</textarea>

      <h4>Personas en esta ubicación</h4>
      <div class="fieldrow">${num('adultos', 'Adultos')}${num('ninos', 'Niños')}</div>
      <div class="fieldrow">${num('mayores', 'Mayores')}${num('mascotas', 'Mascotas')}</div>

      <h4>Posición en el mapa (opcional)</h4>
      <div class="fieldrow">
        <div><label for="${id('lat')}">Latitud</label><input id="${id('lat')}" type="number" step="0.00001" inputmode="decimal" data-c="lat" value="${nd.lat ?? ''}"></div>
        <div><label for="${id('lon')}">Longitud</label><input id="${id('lon')}" type="number" step="0.00001" inputmode="decimal" data-c="lon" value="${nd.lon ?? ''}"></div>
      </div>
      <div class="btnrow"><button class="btn sm ghost" data-gps type="button">📡 Usar mi posición actual</button>
        <button class="btn sm ghost" data-sincoords type="button">Quitar posición</button></div>
      <div class="muted">Recomendación: usa un punto de referencia público (la plaza, el centro del pueblo), no el portal exacto. Si activas la sincronización, esta posición viaja con el resto del plan.</div>

      <div class="rutas-slot"></div>

      <div class="btnrow" style="margin-top:12px"><button class="btn sm danger" data-borrar type="button">Eliminar esta ubicación</button></div>
    </div></details>`);

    d.querySelectorAll('[data-f]').forEach((inp) => {
      const k = inp.dataset.f;
      inp.addEventListener(inp.tagName === 'SELECT' ? 'change' : 'input', () => {
        nd[k] = inp.value;
        if (k === 'rol') {
          // Solo puede haber una base. El editor cambia (la base no tiene rutas).
          if (nd.rol === 'base') ns.forEach((x) => { if (x !== nd && x.rol === 'base') x.rol = 'familia'; });
          guardar().then(() => { pintaTodo(); abrir(nd.id, false); });
          return;
        }
        guardarLuego();
        if (['nombre', 'persona', 'ic'].includes(k)) {
          d.querySelector('summary').firstChild.textContent = `${nd.ic} ${nd.nombre || 'Nueva ubicación'}${nd.persona ? ' — ' + nd.persona : ''} `;
          pintaEstado(); pintaTop();
        }
      });
    });
    d.querySelectorAll('[data-p]').forEach((inp) => inp.addEventListener('input', () => {
      nd.personas[inp.dataset.p] = Math.max(0, parseInt(inp.value, 10) || 0);
      guardarLuego();
    }));
    d.querySelectorAll('[data-c]').forEach((inp) => inp.addEventListener('input', () => {
      const v = parseFloat(inp.value);
      nd[inp.dataset.c] = Number.isFinite(v) ? v : null;
      guardarLuego();
    }));
    d.querySelector('[data-gps]').addEventListener('click', () => {
      if (!navigator.geolocation) return toast('Geolocalización no disponible');
      toast('Buscando posición…');
      navigator.geolocation.getCurrentPosition((p) => {
        nd.lat = +p.coords.latitude.toFixed(5);
        nd.lon = +p.coords.longitude.toFixed(5);
        d.querySelector('[data-c="lat"]').value = nd.lat;
        d.querySelector('[data-c="lon"]').value = nd.lon;
        guardar(); toast('Posición guardada');
      }, () => toast('No se pudo obtener la posición'), { enableHighAccuracy: true, timeout: 20000 });
    });
    d.querySelector('[data-sincoords]').addEventListener('click', () => {
      nd.lat = null; nd.lon = null;
      d.querySelector('[data-c="lat"]').value = '';
      d.querySelector('[data-c="lon"]').value = '';
      guardar(); toast('Posición eliminada');
    });
    d.querySelector('[data-borrar]').addEventListener('click', async () => {
      if (!confirm(`¿Eliminar «${nd.nombre || 'esta ubicación'}» y sus rutas?`)) return;
      for (const r of nd.rutas) if (r.geoId) await store.del('geo', r.geoId).catch(() => {});
      ns.splice(ns.indexOf(nd), 1);
      delete estados[nd.id]; delete prep[nd.id];
      await Promise.all([guardar(), setKv('familia.estados', estados), setKv('familia.prep', prep)]);
      pintaTodo(); toast('Ubicación eliminada');
    });

    if (nd.rol !== 'base') d.querySelector('.rutas-slot').replaceWith(editorRutas(nd));
    else d.querySelector('.rutas-slot').remove();
    return d;
  }

  /* ------------------------------ Editor de rutas ------------------------------ */
  function editorRutas(nd) {
    const w = el(`<div><h4>Rutas desde la base hasta aquí</h4>
      <div class="muted">Anota las rutas que conocéis: una principal y al menos una alternativa. Opcionalmente puedes importar la traza real (GPX o GeoJSON) exportada de cualquier navegador o planificador.</div>
      <div class="rutas-lista"></div>
      <button class="btn sm ghost" data-addruta type="button">➕ Añadir ruta</button></div>`);
    const lista = w.querySelector('.rutas-lista');

    function pinta() {
      lista.innerHTML = '';
      if (!nd.rutas.length) lista.innerHTML = '<p class="muted">Sin rutas todavía.</p>';
      nd.rutas.forEach((r) => {
        const rid = (k) => `ru-${r.id}-${k}`;
        const box = el(`<div class="ruta ${r.tipo === 'principal' ? 'principal' : 'alternativa'}">
          <div class="fieldrow">
            <div><label for="${rid('nombre')}">Nombre</label><input id="${rid('nombre')}" data-r="nombre" value="${esc(r.nombre)}" placeholder="Ej. Por la autovía"></div>
            <div><label for="${rid('tipo')}">Tipo</label><select id="${rid('tipo')}" data-r="tipo">
              <option value="principal"${r.tipo === 'principal' ? ' selected' : ''}>Principal</option>
              <option value="alternativa"${r.tipo !== 'principal' ? ' selected' : ''}>Alternativa</option></select></div>
          </div>
          <div class="fieldrow">
            <div><label for="${rid('via')}">Vías / itinerario</label><input id="${rid('via')}" data-r="via" value="${esc(r.via)}" placeholder="Carreteras y localidades de paso"></div>
            <div><label for="${rid('km')}">Km por carretera</label><input id="${rid('km')}" type="number" min="0" inputmode="decimal" data-r="km" value="${r.km ?? ''}"></div>
          </div>
          <label for="${rid('notas')}">Notas</label><textarea id="${rid('notas')}" data-r="notas" placeholder="Puertos de montaña, peajes, dónde repostar…">${esc(r.notas || '')}</textarea>
          <div class="muted" data-traza>${r.geoId ? '✅ Traza importada' : 'Sin traza importada'}</div>
          <div class="btnrow">
            <label class="btn sm ghost">📥 Importar traza (GPX/GeoJSON)<input type="file" accept=".gpx,.geojson,.json" hidden data-importar></label>
            ${r.geoId ? '<button class="btn sm ghost" data-quitartraza type="button">Quitar traza</button>' : ''}
            <button class="btn sm danger" data-quitar type="button">Eliminar ruta</button>
          </div>
        </div>`);
        box.querySelectorAll('[data-r]').forEach((inp) => inp.addEventListener(inp.tagName === 'SELECT' ? 'change' : 'input', () => {
          const k = inp.dataset.r;
          if (k === 'km') { const v = parseFloat(inp.value); r.km = Number.isFinite(v) ? v : null; }
          else r[k] = inp.value;
          if (k === 'tipo') box.className = `ruta ${r.tipo === 'principal' ? 'principal' : 'alternativa'}`;
          guardarLuego();
        }));
        box.querySelector('[data-importar]').addEventListener('change', async (e) => {
          const f = e.target.files?.[0]; if (!f) return;
          try {
            const { leerCapa, longitudKm } = await import('./maps.js');
            const data = await leerCapa(f);
            if (r.geoId) await store.del('geo', r.geoId).catch(() => {});
            r.geoId = uid();
            await store.put('geo', { id: r.geoId, nombre: `Ruta: ${nd.nombre} · ${r.nombre || f.name}`, data, color: r.tipo === 'principal' ? '#a1a265' : '#b07a45', ts: Date.now(), ruta: { nodo: nd.id } });
            const km = longitudKm(data);
            if (km > 0 && !r.km) r.km = Math.round(km);
            await guardar(); pinta();
            toast(km > 0 ? `Traza importada: ${km.toFixed(0)} km` : 'Traza importada');
          } catch (err) { toast('Error: ' + err.message); }
        });
        box.querySelector('[data-quitartraza]')?.addEventListener('click', async () => {
          await store.del('geo', r.geoId).catch(() => {});
          r.geoId = null; await guardar(); pinta();
        });
        box.querySelector('[data-quitar]').addEventListener('click', async () => {
          if (!confirm('¿Eliminar esta ruta?')) return;
          if (r.geoId) await store.del('geo', r.geoId).catch(() => {});
          nd.rutas.splice(nd.rutas.indexOf(r), 1);
          await guardar(); pinta();
        });
        lista.appendChild(box);
      });
    }
    w.querySelector('[data-addruta]').addEventListener('click', async () => {
      nd.rutas.push({ ...RUTA_PLANTILLA, id: uid(), tipo: nd.rutas.length ? 'alternativa' : 'principal' });
      await guardar(); pinta();
    });
    pinta();
    return w;
  }

  function pintaNodos() {
    const box = n.querySelector('#fa-nodos');
    box.replaceChildren(...ns.map(editorNodo));
    if (!ns.length) box.innerHTML = '<p class="muted">Ninguna todavía.</p>';
  }

  async function anadir(rol) {
    const rolFinal = rol || (base(ns) ? 'familia' : 'base');
    const nd = normalizar({
      id: uid(), rol: rolFinal, ic: rolFinal === 'base' ? '🏠' : '👨‍👩‍👧',
      nombre: rolFinal === 'base' ? 'Mi casa' : '',
      cod: rolFinal === 'base' ? ((await ubi.guardada().catch(() => null))?.cod || '') : '',
    });
    ns.push(nd);
    await guardar();
    pintaTodo();
    abrir(nd.id, true);
  }

  function abrir(id, enfocar) {
    const d = n.querySelector(`[data-nodo="${CSS.escape(id)}"]`);
    if (!d) return;
    d.open = true;
    if (enfocar) { d.scrollIntoView({ behavior: 'smooth', block: 'start' }); d.querySelector('[data-f="nombre"]')?.focus(); }
  }

  function pintaTodo() { pintaTop(); pintaCuerpo(); pintaNodos(); }

  n.querySelector('#fa-add').addEventListener('click', () => anadir());
  pintaTodo();
  return n;
}

/* ========================================================================
   RUTAS
   ======================================================================== */
function tarjetaRuta(r, situacion, km0) {
  const vel = VELOCIDADES[situacion.vel];
  const tiempo = r.km ? fmtTiempo(r.km / vel.v) : null;
  return `<article class="ruta ${r.tipo === 'principal' ? 'principal' : 'alternativa'}">
    <h3>${r.tipo === 'principal' ? '🅰️' : '🔀'} ${esc(r.nombre || (r.tipo === 'principal' ? 'Ruta principal' : 'Ruta alternativa'))}</h3>
    <div class="kv">
      <div>Vía</div><div>${esc(r.via || '—')}</div>
      <div>Distancia</div><div>${r.km ? `<b>${Math.round(r.km)} km</b> por carretera` : '<span style="color:var(--amber)">Sin anotar</span>'}${km0 ? `<br><span class="muted">${Math.round(km0)} km en línea recta</span>` : ''}</div>
      <div>Tiempo estimado</div><div>${tiempo ? `<b>${tiempo}</b> a ${vel.v} km/h<br><span class="muted">${esc(vel.t)}</span>` : '<span class="muted">Anota los km por carretera para calcularlo</span>'}</div>
      ${r.notas ? `<div>Notas</div><div>${esc(r.notas)}</div>` : ''}
      <div>Traza</div><div>${r.geoId ? '✅ Importada (visible en el mapa familiar)' : '<span class="muted">No importada</span>'}</div>
    </div>
  </article>`;
}

export async function rutasView(preset = {}) {
  const ns = await nodos();
  const b = base(ns);
  const ds = destinos(ns);

  if (!b || !ds.length) {
    return el(`<div>${vacio(`Para ver rutas necesitas una ubicación <b>base</b> y al menos una de <b>familia</b>. ${b ? '' : 'Todavía no has marcado ninguna como base.'}`, CONFIGURAR)}</div>`);
  }

  const n = el(`<div>
    <div class="blk-warn">${esc(AVISO_RUTAS)}</div>
    <div class="card">
      <label for="ru-dst">Destino</label>
      <select id="ru-dst">${ds.map((d) => `<option value="${esc(d.id)}">${esc(d.ic)} ${esc(d.nombre || 'Sin nombre')}${d.persona ? ' — ' + esc(d.persona) : ''}</option>`).join('')}</select>
      <label>Sentido</label>
      <div class="btnrow" id="ru-sent">
        <button class="btn sm" data-s="ida" type="button">${esc(b.nombre)} → destino</button>
        <button class="btn sm ghost" data-s="vuelta" type="button">Destino → ${esc(b.nombre)}</button>
      </div>
      <label for="ru-sit">Situación</label>
      <select id="ru-sit">${SITUACIONES.map((s) => `<option value="${s.id}">${s.ic} ${esc(s.t)}</option>`).join('')}</select>
    </div>
    <div id="ru-out"></div>
    <div class="btnrow"><a class="btn ghost" href="#/familia/mapa">🗺 Ver en el mapa familiar</a><a class="btn ghost" href="#/sec/familia">✏️ Editar rutas</a></div>
  </div>`);

  let destino = ds.some((d) => d.id === preset.destino) ? preset.destino : ds[0].id;
  let sentido = preset.sentido || 'ida';
  let sit = preset.situacion || 'normal';
  n.querySelector('#ru-dst').value = destino;
  n.querySelector('#ru-sit').value = sit;
  n.querySelectorAll('#ru-sent button').forEach((x) => x.classList.toggle('ghost', x.dataset.s !== sentido));

  async function pinta() {
    const d = ds.find((x) => x.id === destino);
    const s = SITUACIONES.find((x) => x.id === sit);
    const capas = s.capas.map((k) => CAPAS_POI.find((x) => x.id === k)).filter(Boolean);
    const km0 = await lineaRecta(b, d);
    const rutas = [...d.rutas].sort((x, y) => (x.tipo === 'principal' ? 0 : 1) - (y.tipo === 'principal' ? 0 : 1));
    const [desde, hasta] = sentido === 'ida' ? [b, d] : [d, b];

    n.querySelector('#ru-out').innerHTML = `
      <div class="emg-hd" style="background:var(--panel2);border-color:var(--olive2)">
        <h1 style="color:var(--olive3)">${s.ic} ${esc(s.t)}</h1>
        <p style="color:var(--dim)">${esc(desde.nombre)} → ${esc(hasta.nombre)}</p>
      </div>

      <div class="card"><h3>Lectura de la situación</h3>
        <p>${esc(s.resumen)}</p>
        <div class="blk-note"><b>Qué ruta elegir:</b> ${esc(s.ruta)}</div>
      </div>

      <h2>Rutas</h2>
      ${rutas.length ? rutas.map((r) => tarjetaRuta(r, s, km0)).join('')
        : `<div class="blk-warn">No has definido rutas hacia ${esc(d.nombre)}.${km0 ? ` Está a ${Math.round(km0)} km en línea recta; la distancia por carretera será mayor.` : ''} Añádelas en Familia → Ubicaciones.</div>`}
      ${rutas.length === 1 ? '<div class="blk-note">Solo tienes una ruta. Define al menos una alternativa: en una emergencia la principal puede estar cortada.</div>' : ''}

      <div class="card"><h3>✅ Antes de salir</h3><ol class="steps">${s.antes.map((i) => `<li>${esc(i)}</li>`).join('')}</ol></div>
      <div class="card"><h3>⚠️ Ojo con esto</h3><ol class="steps no">${s.ojo.map((i) => `<li>${esc(i)}</li>`).join('')}</ol></div>

      ${hasta.encuentro ? `<div class="card"><h3>📍 Punto de encuentro en destino</h3><p>${esc(hasta.encuentro)}</p></div>` : ''}

      <div class="card"><h3>🗂 Puntos de interés prioritarios</h3>
        ${capas.map((k) => {
          const e = CAPAS_ESTADO[k.estado];
          return `<div class="row"><span>${k.ic}</span><div class="rt"><b>${esc(k.t)}</b><span>${esc(k.d)}<br>${e.ic} ${esc(e.t)}</span></div></div>`;
        }).join('')}
        <div class="blk-warn">Esta aplicación <b>no incluye un directorio de hospitales, gasolineras ni alojamientos con coordenadas</b>, porque no ha sido posible verificarlos contra una fuente oficial en formato de datos. Añade tus propios puntos verificados en el mapa o importa capas oficiales.</div>
        <a class="btn ghost sm" href="#/mapa">Añadir mis puntos verificados</a>
      </div>

      <div class="card"><h3>📇 Teléfonos de emergencia</h3>
        <div class="tw"><table><thead><tr><th>Servicio</th><th>Teléfono</th></tr></thead>
        <tbody>${SERVICIOS_VERIFICADOS.map((v) => `<tr><td>${esc(v.nombre)}</td><td class="mono"><a href="tel:${esc(v.tel)}">${esc(v.tel)}</a></td></tr>`).join('')}</tbody></table></div>
        <div class="muted">Anota los teléfonos locales (policía municipal, centro de salud…) en tus contactos del plan familiar.</div>
      </div>`;
  }

  n.querySelector('#ru-dst').addEventListener('change', (e) => { destino = e.target.value; pinta(); });
  n.querySelector('#ru-sit').addEventListener('change', (e) => { sit = e.target.value; pinta(); });
  n.querySelectorAll('#ru-sent button').forEach((x) => x.addEventListener('click', () => {
    sentido = x.dataset.s;
    n.querySelectorAll('#ru-sent button').forEach((y) => y.classList.toggle('ghost', y !== x));
    pinta();
  }));

  await pinta();
  return n;
}

/* ========================================================================
   ASISTENTE "QUIERO LLEGAR A MI FAMILIA"
   ======================================================================== */
export async function irView() {
  const ns = await nodos();
  const b = base(ns);
  const ds = destinos(ns);
  if (!b || !ds.length) {
    return el(`<div>${vacio('Para usar el asistente necesitas configurar tu casa (base) y al menos una ubicación de tu familia.', CONFIGURAR)}</div>`);
  }

  const n = el(`<div>
    <div class="emg-hd"><h1>❤️ QUIERO LLEGAR A MI FAMILIA</h1><p>Tres preguntas y tienes el plan.</p></div>
    <div class="card"><h3>1 · ¿A quién quieres llegar?</h3>
      <div class="btnrow" id="w-quien">
        ${ds.map((d) => `<button class="btn ghost" data-d="${esc(d.id)}" type="button">${esc(d.ic)} ${esc((d.persona || d.nombre || 'Sin nombre').toUpperCase())}${d.persona && d.nombre ? ' — ' + esc(d.nombre) : ''}</button>`).join('')}
      </div>
    </div>
    <div class="card"><h3>2 · ¿En qué sentido?</h3>
      <div class="btnrow" id="w-sent">
        <button class="btn ghost" data-s="ida" type="button">Yo voy desde ${esc(b.nombre)}</button>
        <button class="btn ghost" data-s="vuelta" type="button">Ellos vienen a ${esc(b.nombre)}</button>
      </div>
    </div>
    <div class="card"><h3>3 · ¿En qué situación?</h3>
      <div class="btnrow" id="w-sit">
        ${SITUACIONES.map((s) => `<button class="btn ghost sm" data-s="${s.id}" type="button">${s.ic} ${esc(s.t)}</button>`).join('')}
      </div>
    </div>
    <button class="btn wide" id="w-go" type="button" disabled>Ver plan</button>
    <div id="w-out"></div>
  </div>`);

  const sel = { d: ds.length === 1 ? ds[0].id : null, s: null, sit: null };
  const check = () => { n.querySelector('#w-go').disabled = !(sel.d && sel.s && sel.sit); };
  const grupo = (cont, key) => n.querySelectorAll(`${cont} button`).forEach((x) => {
    if (key === 'd' && sel.d === x.dataset.d) x.classList.remove('ghost');
    x.addEventListener('click', () => {
      sel[key] = x.dataset.d || x.dataset.s;
      n.querySelectorAll(`${cont} button`).forEach((y) => y.classList.toggle('ghost', y !== x));
      check();
    });
  });
  grupo('#w-quien', 'd'); grupo('#w-sent', 's'); grupo('#w-sit', 'sit');

  n.querySelector('#w-go').addEventListener('click', async () => {
    const out = n.querySelector('#w-out');
    out.innerHTML = '<div class="muted">Preparando plan…</div>';
    const vista = await rutasView({ destino: sel.d, sentido: sel.s, situacion: sel.sit });
    out.replaceChildren(vista);
    out.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  return n;
}

/* ========================================================================
   MAPA FAMILIAR
   ======================================================================== */
export async function mapaFamiliarView() {
  const M = await import('./maps.js');
  const ns = await nodos();
  const sinPos = ns.filter((x) => !tieneCoords(x));

  const n = el(`<div>
    <div id="map"></div>
    <div class="muted" id="mf-st" style="margin-top:6px"></div>
    ${sinPos.length ? `<div class="blk-note">Sin posición en el mapa: ${sinPos.map((x) => esc(x.nombre || 'sin nombre')).join(', ')}. Fíjala en Familia → Ubicaciones.</div>` : ''}
    <div class="card"><h3>Qué estás viendo</h3>
      <ul>
        <li><b>Provincias</b>: geometría del Equipamiento Geográfico de Referencia Nacional del IGN, siempre disponible.</li>
        <li><b>Tus ubicaciones</b>: en la posición que tú hayas fijado.</li>
        <li><b>Rutas</b>: solo las trazas que hayas importado. La aplicación no dibuja rutas inventadas.</li>
        <li><b>Mapa de fondo</b>: teselas del IGN; sin conexión, solo las que hayas descargado.</li>
      </ul>
      <div class="blk-note">El GPS del teléfono funciona <b>sin Internet</b> (usa satélites GNSS). Lo que necesita conexión es descargar los mapas, no posicionarte.</div>
      <div class="btnrow"><button class="btn sm" id="mf-me" type="button">🎯 Estás aquí</button>
      <a class="btn sm ghost" href="#/mapa">⬇ Descargar área</a>
      <a class="btn sm ghost" href="#/sec/familia">✏️ Editar ubicaciones</a></div>
    </div>
  </div>`);

  let L;
  try { L = await M.loadLeaflet(); } catch {
    n.querySelector('#map').innerHTML = '<div class="blk-warn">No se ha podido cargar el motor de mapas.</div>';
    return n;
  }

  const map = L.map(n.querySelector('#map'), { zoomControl: true }).setView([40.2, -3.7], 6);
  map.attributionControl.setPrefix('Leaflet');
  M.crearCapaRaster(L).addTo(map);

  try {
    const prov = await (await fetch('./data/geo/es-provincias.geojson')).json();
    L.geoJSON(prov, { style: { color: '#8b7752', weight: 1, fillOpacity: 0 } }).addTo(map);
  } catch { /* opcional */ }

  const grupo = L.featureGroup().addTo(map);
  for (const nd of ns.filter(tieneCoords)) {
    L.marker([nd.lat, nd.lon], {
      icon: L.divIcon({ className: '', html: `<div class="fmk">${esc(nd.ic || '📍')}</div>`, iconSize: [30, 30], iconAnchor: [15, 28] }),
    }).bindPopup(`<b>${esc(nd.nombre)}</b>${nd.persona ? '<br>' + esc(nd.persona) : ''}
      ${nd.encuentro ? '<br>📍 ' + esc(nd.encuentro) : ''}
      <br><span class="mono muted">${nd.lat.toFixed(4)}, ${nd.lon.toFixed(4)}</span>`).addTo(grupo);
  }

  let trazas = 0;
  const geos = await store.all('geo');
  for (const nd of ns) {
    for (const r of nd.rutas) {
      const g = r.geoId && geos.find((x) => x.id === r.geoId);
      if (!g) continue;
      trazas++;
      L.geoJSON(g.data, {
        style: { color: r.tipo === 'principal' ? '#a1a265' : '#b07a45', weight: r.tipo === 'principal' ? 4 : 2.5, opacity: 0.9, dashArray: r.tipo === 'principal' ? null : '6 5' },
        pointToLayer: (f, ll) => L.circleMarker(ll, { radius: 4 }),
      }).bindPopup(`<b>${esc(r.nombre || 'Ruta')}</b> → ${esc(nd.nombre)}<br>${esc(r.via || '')}${r.km ? `<br><b>${Math.round(r.km)} km</b>` : ''}<br><span class="muted">Estado de las vías: DESCONOCIDO. Verificar antes de salir.</span>`).addTo(grupo);
    }
  }
  if (grupo.getLayers().length) map.fitBounds(grupo.getBounds().pad(0.2), { maxZoom: 12 });
  n.querySelector('#mf-st').innerHTML = ns.length
    ? `${ns.length - sinPos.length} de ${ns.length} ubicaciones en el mapa · ${trazas} trazas de ruta · <b>continua</b> = principal · <b>discontinua</b> = alternativa`
    : 'Todavía no has configurado ninguna ubicación.';

  let yo = null;
  n.querySelector('#mf-me').addEventListener('click', () => {
    if (!navigator.geolocation) return toast('Geolocalización no disponible');
    toast('Buscando posición por GPS…');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const ll = [p.coords.latitude, p.coords.longitude];
        map.setView(ll, 12);
        yo?.remove();
        yo = L.circleMarker(ll, { radius: 7, color: '#a1a265', fillColor: '#a1a265', fillOpacity: 1 })
          .bindPopup(`<b>Estás aquí</b><br><span class="mono">${ll[0].toFixed(5)}, ${ll[1].toFixed(5)}</span><br>±${p.coords.accuracy.toFixed(0)} m`)
          .addTo(map).openPopup();
      },
      () => toast('No se pudo obtener la posición. Puedes navegar manualmente por el mapa.'),
      { enableHighAccuracy: true, timeout: 20000 }
    );
  });

  setTimeout(() => map.invalidateSize(), 120);
  return n;
}

/* ========================================================================
   PLAN 72 HORAS
   ======================================================================== */
export async function plan72View() {
  const ns = await nodos();
  if (!ns.length) return el(`<div>${vacio('Indica tus ubicaciones y cuántas personas hay en cada una para calcular el plan de 72 horas.', CONFIGURAR)}</div>`);

  const n = el(`<div>
    <div class="blk-note">Cálculo automático a partir de las personas que hayas indicado en cada ubicación. Cámbialas en 👨‍👩‍👧‍👦 Familia → Ubicaciones.</div>
    <div id="p72"></div>
  </div>`);

  n.querySelector('#p72').innerHTML = ns.map((nd) => {
    const p = { adultos: 0, ninos: 0, mayores: 0, mascotas: 0, ...(nd.personas || {}) };
    const tot = p.adultos + p.ninos + p.mayores;
    return `<div class="card"><h3>${esc(nd.ic)} ${esc(nd.nombre || 'Sin nombre')}${nd.persona ? ' · ' + esc(nd.persona) : ''}</h3>
      <div class="muted">${tot} persona(s): ${p.adultos} adultos, ${p.ninos} niños, ${p.mayores} mayores${p.mascotas ? ` · ${p.mascotas} mascota(s)` : ''}</div>
      ${tot === 0 ? '<div class="blk-warn">Indica cuántas personas hay en esta ubicación para calcular el plan.</div>' : `
      <div class="kv">${Object.values(PLAN72).map((it) => `<div>${it.ic} ${esc(it.t)}</div><div><b>${esc(String(it.calc(p)))}</b><br><span class="muted">${esc(it.nota)}</span></div>`).join('')}</div>`}
      <div class="btnrow"><a class="btn sm ghost" href="#/check/nivel2">☑ Checklist 72 h</a>
      <a class="btn sm ghost" href="#/check/bob">🎒 Mochila</a></div>
    </div>`;
  }).join('');

  return n;
}

/* ========================================================================
   PLAN DE REUNIFICACIÓN
   ======================================================================== */
export async function reunionView() {
  const ns = await nodos();
  const extra = await kv('familia.encuentros', []);

  const n = el(`<div>
    <div class="blk-note">Un plan de reunificación sirve para decidir <b>en frío</b> qué hacéis si ocurre algo. Escribidlo, acordadlo en voz alta e imprimidlo. Todo se guarda solo en este dispositivo.</div>

    <h2>Puntos principales</h2>
    <div class="list">${ns.length ? ns.map((nd, i) => `<div class="row"><span style="font-size:1.3rem">${esc(nd.ic)}</span>
      <div class="rt"><b>PUNTO ${letra(i)} · ${esc(nd.nombre || 'Sin nombre')}</b>
      <span>${esc(nd.persona || '—')}${nd.encuentro ? '<br>📍 ' + esc(nd.encuentro) : '<br><span style="color:var(--amber)">Sin punto de encuentro acordado</span>'}</span></div></div>`).join('')
      : `<p class="muted">Aún no has configurado ubicaciones. <a href="#/sec/familia">Configúralas aquí</a>.</p>`}</div>

    <h2>Puntos de encuentro alternativos</h2>
    <div id="re-list" class="list"></div>
    <details class="card"><summary>➕ Añadir punto alternativo</summary><div>
      <label for="re-n">Nombre del punto</label><input id="re-n" placeholder="Ej. Casa de un familiar en otro pueblo, aparcamiento del polideportivo…">
      <label for="re-l">Localidad</label><input id="re-l">
      <label for="re-c">Cómo se llega</label><textarea id="re-c" placeholder="Referencias que todos entendáis, sin depender del móvil"></textarea>
      <label for="re-u">Cuándo se usa</label><textarea id="re-u" placeholder="Ej. si no se puede llegar a casa y las comunicaciones no funcionan"></textarea>
      <button class="btn wide" id="re-go" type="button" style="margin-top:10px">Guardar</button>
      <div class="blk-warn">No incluyas instalaciones sensibles ni lugares peligrosos. Elige sitios abiertos, conocidos por todos y fáciles de describir sin mapa.</div>
    </div></details>

    <div class="card"><h3>Preguntas que hay que responder juntos</h3>
      <ol class="steps">
        <li>¿Qué hacemos si no podemos volver a casa?</li>
        <li>¿Dónde nos encontramos si nos separamos, y a qué hora?</li>
        <li>¿Quién recoge a quién y en qué orden?</li>
        <li>¿Qué hacemos si no funcionan los móviles?</li>
        <li>¿Cuál es nuestro contacto externo fuera de la zona?</li>
        <li>¿Cuánto esperamos en un punto antes de pasar al siguiente?</li>
        <li>¿Quién se ocupa de las mascotas y de la documentación?</li>
      </ol>
      <a class="btn ghost wide sm" href="#/sec/plan-familiar">Responderlas en el plan familiar</a>
    </div>

    <button class="btn wide ghost" id="re-print" type="button">🖨 Imprimir plan de reunificación</button>
  </div>`);

  function pinta() {
    n.querySelector('#re-list').innerHTML = extra.length
      ? extra.map((e) => `<div class="row"><span>📍</span><div class="rt"><b>${esc(e.n)}</b>
          <span>${esc(e.l || '')}${e.c ? '<br>' + esc(e.c) : ''}${e.u ? '<br><i>' + esc(e.u) + '</i>' : ''}</span></div>
          <button class="btn sm danger" data-del="${esc(e.id)}" type="button" aria-label="Eliminar ${esc(e.n)}">✕</button></div>`).join('')
      : '<p class="muted">Ninguno todavía. Añade al menos uno fuera de vuestra zona habitual.</p>';
    n.querySelectorAll('[data-del]').forEach((x) => x.addEventListener('click', async () => {
      const i = extra.findIndex((y) => y.id === x.dataset.del);
      extra.splice(i, 1); await setKv('familia.encuentros', extra); pinta();
    }));
  }

  n.querySelector('#re-go').addEventListener('click', async () => {
    const nm = n.querySelector('#re-n').value.trim();
    if (!nm) return toast('Indica un nombre');
    extra.push({ id: uid(), n: nm, l: n.querySelector('#re-l').value.trim(), c: n.querySelector('#re-c').value.trim(), u: n.querySelector('#re-u').value.trim() });
    await setKv('familia.encuentros', extra);
    ['#re-n', '#re-l', '#re-c', '#re-u'].forEach((s) => { n.querySelector(s).value = ''; });
    pinta(); toast('Punto guardado en este dispositivo');
  });
  n.querySelector('#re-print').addEventListener('click', () => window.print());

  pinta();
  return n;
}

/* ========================================================================
   MODO "SI NO HAY INTERNET"
   ======================================================================== */
export async function offlineView() {
  const ns = await nodos();
  const tiles = await store.count('tiles');
  const puntos = await store.all('puntos');
  const contactos = await store.all('contactos');
  const nRutas = ns.reduce((a, nd) => a + nd.rutas.length, 0);

  const n = el(`<div>
    <div class="emg-hd"><h1>📴 PLAN OFFLINE</h1><p>Qué sigue funcionando cuando no hay nada.</p></div>

    <div class="card"><h3>Simulación de escenario</h3>
      <div class="sim">
        <label class="sw"><input type="checkbox" id="s-net" checked> Internet</label>
        <label class="sw"><input type="checkbox" id="s-gps" checked> GPS</label>
        <label class="sw"><input type="checkbox" id="s-dat" checked> Datos móviles</label>
        <label class="sw"><input type="checkbox" id="s-voz" checked> Llamadas</label>
      </div>
      <div class="muted">Desactiva lo que hayas perdido y verás qué te queda.</div>
      <div id="s-out"></div>
    </div>

    <div class="card"><h3>Disponible ahora mismo en este dispositivo</h3>
      <div class="kv">
        <div>Manual completo</div><div>✅ Sí, íntegro</div>
        <div>Escenarios de emergencia</div><div>✅ Sí</div>
        <div>Mapa vectorial IGN</div><div>✅ Sí (provincias y comunidades de España)</div>
        <div>Teselas de mapa descargadas</div><div>${tiles ? `✅ ${tiles}` : '<span style="color:var(--amber)">⚠ Ninguna — descárgalas con Wi-Fi</span>'}</div>
        <div>Ubicaciones familiares</div><div>${ns.length ? '✅ ' + ns.length : '<span style="color:var(--amber)">⚠ Ninguna — configúralas</span>'}</div>
        <div>Rutas familiares</div><div>${nRutas ? '✅ ' + nRutas : '<span style="color:var(--amber)">⚠ Ninguna</span>'}</div>
        <div>Puntos personales</div><div>${puntos.length ? '✅ ' + puntos.length : '<span style="color:var(--amber)">⚠ Ninguno</span>'}</div>
        <div>Contactos del plan</div><div>${contactos.length ? '✅ ' + contactos.length : '<span style="color:var(--amber)">⚠ Ninguno</span>'}</div>
        <div>Calculadoras, checklists y juegos</div><div>✅ Sí</div>
      </div>
    </div>

    <div class="card"><h3>📡 GPS con y sin Internet</h3>
      <div class="kv">
        <div>GPS <b>sin</b> Internet</div><div>Funciona. El receptor GNSS del teléfono calcula la posición a partir de las señales de los satélites: no necesita red. Lo que tarda más es el primer posicionamiento, porque sin asistencia de red el teléfono debe descargar los datos orbitales directamente de los satélites (puede tardar minutos y necesita cielo despejado).</div>
        <div>GPS <b>con</b> Internet</div><div>Igual de preciso, pero el primer posicionamiento es casi inmediato porque el teléfono recibe los datos orbitales y una posición aproximada por la red (A-GNSS). Además puede afinar con wifi y antenas de telefonía.</div>
        <div>Los mapas</div><div>Los mapas SÍ necesitan haberse descargado antes. Por eso el bloque crítico es descargar tu área con Wi-Fi: sin teselas verás tu posición sobre la capa vectorial, que sigue siendo utilizable.</div>
        <div>Si deniegas permisos</div><div>No pasa nada: puedes navegar el mapa manualmente y usar coordenadas guardadas.</div>
      </div>
      <div class="btnrow"><a class="btn sm" href="#/familia/mapa">🎯 Probar "estás aquí"</a>
      <a class="btn sm ghost" href="#/sec/orientacion">🧭 Brújula y coordenadas</a></div>
    </div>

    <div class="card"><h3>Tarjeta de bolsillo</h3>
      <div class="qcard"><h4>SIN INTERNET Y SIN COBERTURA</h4><ol>
        <li>Ejecuta el plan acordado: no improvises.</li>
        <li>Ve al punto de encuentro y espera el tiempo pactado.</li>
        <li>Radio a pilas para informarte. El 112 puede funcionar aunque tu operador no dé servicio.</li>
        <li>Mensajes de texto antes que llamadas: salen con cobertura mínima.</li>
        <li>Anota la hora y las decisiones que tomas.</li>
      </ol></div>
      ${ns.map((nd) => `<div class="row"><span>${esc(nd.ic)}</span><div class="rt"><b>${esc(nd.nombre || 'Sin nombre')}${nd.persona ? ' · ' + esc(nd.persona) : ''}</b>
        <span>${nd.tel ? '📞 ' + esc(nd.tel) : 'Sin teléfono anotado'}${nd.encuentro ? '<br>📍 ' + esc(nd.encuentro) : ''}</span></div></div>`).join('')}
      <button class="btn ghost wide sm" id="of-print" type="button" style="margin-top:8px">🖨 Imprimir</button>
    </div>
  </div>`);

  const sim = () => {
    const net = n.querySelector('#s-net').checked;
    const gps = n.querySelector('#s-gps').checked;
    const dat = n.querySelector('#s-dat').checked;
    const voz = n.querySelector('#s-voz').checked;
    const f = [];
    if (!net) f.push('❌ Sin Internet → esta app funciona igual. No podrás descargar mapas nuevos ni actualizar contenidos.');
    if (!dat) f.push('❌ Sin datos móviles → usa SMS. La app no los necesita.');
    if (!voz) f.push('❌ Sin llamadas → el 112 puede seguir funcionando enganchándose a la red de otro operador. Prueba también los SMS.');
    if (!gps) f.push('❌ Sin GPS → navega el mapa manualmente y usa las coordenadas y puntos que tengas guardados. La brújula en modo manual y los métodos naturales siguen sirviendo.');
    if (!net && !gps && !dat && !voz) f.push('🎯 Escenario completo: te quedan el manual íntegro, el mapa vectorial, tus rutas, tus puntos, las checklists, las calculadoras y el plan familiar. Es exactamente el escenario para el que se diseñó esta aplicación.');
    if (net && gps && dat && voz) f.push('✅ Todo disponible. Aprovecha para descargar teselas del área, exportar tus datos y revisar el plan familiar.');
    n.querySelector('#s-out').innerHTML = `<ul>${f.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
  };
  n.querySelectorAll('.sim input').forEach((i) => i.addEventListener('change', sim));
  n.querySelector('#of-print').addEventListener('click', () => window.print());
  sim();
  return n;
}
