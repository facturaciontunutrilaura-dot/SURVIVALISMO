/* =========================================================================
   app.js — router y vistas
   ========================================================================= */
import {
  VERSION, FECHA_CONTENIDO, SECCIONES, PRIORIDADES, ARTICULOS, ARTICULOS_MAP,
  articulosDeSeccion, EMERGENCIAS, EMERGENCIAS_MAP, CHECKLISTS, CURSOS,
  SOS_SANITARIAS, SOS_SANITARIAS_MAP, GRUPOS_EMERGENCIA,
  FRECUENCIAS, SOURCES, SOURCE_MAP, DISCLAIMER,
} from '../../data/content/index.js';
import * as store from './store.js';
import { $, $$, el, esc, toast, topbar, renderBlocks, prBadge, fmtBytes, uid, limpiarVista, alSalir, borrarConDeshacer } from './ui.js';
import { CALCS, mountTools } from './calc.js';
import { compassView } from './compass.js';

const app = $('#app');
const secMap = Object.fromEntries(SECCIONES.map((s) => [s.id, s]));

/* ============================ INFRAESTRUCTURA ============================ */
store.applySettings();

function setNav(route, sub = '') {
  const activo = route === '/sec' && (sub === 'familia') ? '/familia' : route;
  $$('#nav a').forEach((a) => {
    const t = a.dataset.nav;
    a.classList.toggle('on', activo === t || (t !== '/' && activo.startsWith(t)));
  });
}

function render(node, { emg = false } = {}) {
  document.body.classList.toggle('emg', emg);
  app.replaceChildren(node);
  mountTools(app);
  window.scrollTo(0, 0);
}

function netBadge() {
  const b = $('#netbadge');
  // Solo se muestra cuando NO hay conexión: en uso normal no debe estorbar.
  const on = navigator.onLine;
  b.hidden = on;
  b.textContent = on ? 'ONLINE' : 'SIN CONEXIÓN';
  b.classList.toggle('off', !on);
}
window.addEventListener('online', netBadge);
window.addEventListener('offline', netBadge);
netBadge();

/* ================================ VISTAS ================================ */

function vHome() {
  const tiles = SECCIONES.filter((s) => s.id !== 'manual' || true).map((s) => `
    <a class="tile ${s.cls || ''}" href="#/${s.id === 'emergencia' ? 'emergencia' : s.id === 'mapa' ? 'mapa' : 'sec/' + s.id}">
      <span class="ic">${s.ic}</span>
      <span><span class="nm">${esc(s.t)}</span><span class="ds">${esc(s.desc)}</span></span>
    </a>`).join('');

  return el(`<div>
    <div class="brand">
      <h1>SURVIVAL OFFLINE</h1>
      <div class="sub">Manual de campo · España · v${VERSION}</div>
    </div>
    <a class="row" href="#/buscar" style="margin-bottom:12px">
      <span>🔍</span><div class="rt"><b>Buscar en todo el manual</b><span>Escribe "agua", "apagón", "incendio"…</span></div><span class="chev">›</span>
    </a>
    <div class="grid">${tiles}</div>
    <div class="sp"></div>
    <div class="card">
      <p class="muted" style="margin:0">${esc(DISCLAIMER)}</p>
      <p class="muted" style="margin:.6em 0 0">Emergencias: <b>112</b> · Contenido actualizado el ${esc(FECHA_CONTENIDO)} · Todos tus datos se guardan solo en este dispositivo.</p>
    </div>
  </div>`);
}

/* ------------------------------ EMERGENCIA ------------------------------ */
/* Jerarquía de SOS, de arriba abajo:
     1. Cómo llamar a emergencias (tel:112, lo gestiona el sistema operativo).
     2. Qué hacer ante una emergencia sanitaria (cinco accesos grandes).
     3. El resto de protocolos, agrupados.
   El enlace tel: no usa JavaScript: en un móvil abre el marcador con el 112
   escrito y es la persona quien confirma la llamada; en un dispositivo sin
   teléfono el sistema lo ignora u ofrece una app, sin errores. */
function boton112(compacto = false) {
  return `<a class="btn-112${compacto ? ' compacto' : ''}" href="tel:112" aria-label="Llamar al 112, teléfono de emergencias">
    <span class="ic" aria-hidden="true">📞</span>
    <span class="tx"><b>Llamar al 112</b>${compacto ? '' : '<small>Emergencias · gratuito</small>'}</span>
  </a>`;
}

/* Barra fija inferior con el 112 en las fichas: se alcanza con el pulgar
   sin volver arriba mientras se leen los pasos. */
function barra112() {
  return `<div class="sos-bar">${boton112(true)}</div>`;
}

/** Posición para dictar al 112: se pide solo cuando el usuario pulsa. */
function montarPosicion112(n) {
  const b = n.querySelector('[data-pos112]');
  if (!b) return;
  const out = n.querySelector('#pos112');
  b.addEventListener('click', () => {
    if (!navigator.geolocation) { out.innerHTML = '<div class="blk-warn">Este dispositivo no ofrece ubicación.</div>'; return; }
    out.innerHTML = '<div class="muted">Obteniendo posición… (sin cobertura puede tardar)</div>';
    navigator.geolocation.getCurrentPosition((p) => {
      const { latitude: la, longitude: lo, accuracy: ac } = p.coords;
      const txt = `${la.toFixed(5)}, ${lo.toFixed(5)}`;
      out.innerHTML = `<div class="pos112"><div class="mono big">${esc(txt)}</div>
        <div class="muted">Precisión ±${Math.round(ac)} m · Díctalo dígito a dígito. La longitud oeste es NEGATIVA.</div>
        <button class="btn sm ghost" type="button" data-copiar>Copiar</button></div>`;
      out.querySelector('[data-copiar]').addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(txt); toast('Coordenadas copiadas'); } catch { toast(txt); }
      });
    }, (e) => {
      out.innerHTML = `<div class="blk-warn">No se pudo obtener la posición (${esc(e.message || 'sin permiso')}). Describe dónde estás: calle, punto kilométrico o referencias visibles.</div>`;
    }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 30000 });
  });
}

/* Aviso visible, arriba, en las fichas que aún no están completas. */
const AVISO_REVISION = 'Ficha incompleta: solo recoge lo que el manual ya contenía. Pendiente de revisión y ampliación con fuentes clínicas. Sigue siempre las indicaciones del 112.';
function avisoRevision(a) {
  return a?.revision === 'pendiente' ? `<p class="aviso-revision" role="note">⚠ ${esc(AVISO_REVISION)}</p>` : '';
}

function resumenSanitaria(a) {
  return a?.body?.find((x) => x.card)?.card.lines[0] || (a?.sum || '').split('. ')[0];
}

function vEmergenciaLista() {
  const sanitarias = SOS_SANITARIAS.map((s) => {
    const a = ARTICULOS_MAP[s.art];
    return `<a class="sos-med" href="#/emergencia/sanitaria/${s.id}">
      <span class="ic" aria-hidden="true">${s.ic}</span>
      <span class="tx"><b>${esc(s.t)}</b><small>${esc(resumenSanitaria(a))}</small>${a?.revision === 'pendiente' ? '<small class="rev">Ficha incompleta · pendiente de revisión</small>' : ''}</span>
    </a>`;
  }).join('');

  const agrupados = new Set(GRUPOS_EMERGENCIA.flatMap((g) => g.ids));
  const grupos = GRUPOS_EMERGENCIA.map((g) => ({
    ...g,
    items: g.id === 'general'
      ? [...g.ids, ...EMERGENCIAS.map((e) => e.id).filter((id) => !agrupados.has(id))]
      : g.ids,
  }));
  const fila = (e) => `<a class="row pr-${e.pr}" href="#/emergencia/${e.id}">
      <span class="ric" aria-hidden="true">${e.ic}</span>
      <div class="rt"><b>${esc(e.t)}</b><span>${esc(e.card[0])}</span></div>
      <span class="chev" aria-hidden="true">›</span>
    </a>`;
  const protocolos = grupos.map((g) => {
    const es = g.items.map((id) => EMERGENCIAS_MAP[id]).filter(Boolean);
    return es.length ? `<h3 class="sos-grupo">${esc(g.t)}</h3><div class="list">${es.map(fila).join('')}</div>` : '';
  }).join('');

  const n = el(`<div class="sos">
    ${topbar('SOS', 'Emergencias')}
    <section class="sos-llamar" aria-labelledby="sos-h-llamar">
      <h1 id="sos-h-llamar" class="vh">Llamar a emergencias</h1>
      ${boton112()}
      <p class="sos-nota">Si hay riesgo para la vida, llama primero. Sigue siempre las instrucciones de las autoridades.</p>
      <p class="sos-nota solo-escritorio">Este dispositivo quizá no pueda hacer llamadas: marca el 112 desde un teléfono.</p>
      <button class="btn ghost wide sm" type="button" data-pos112>📍 Mi posición para dar al 112</button>
      <div id="pos112" aria-live="polite"></div>
    </section>

    <section aria-labelledby="sos-h-med">
      <h2 id="sos-h-med">Emergencia sanitaria</h2>
      <div class="sos-meds">${sanitarias}</div>
      <a class="sos-mas" href="#/sec/primeros-auxilios">Más primeros auxilios ›</a>
    </section>

    <section aria-labelledby="sos-h-prot">
      <h2 id="sos-h-prot">Otros protocolos</h2>
      ${protocolos}
    </section>
  </div>`);
  montarPosicion112(n);
  return { node: n, emg: true };
}

/* Pestañas accesibles: rejilla que nunca oculta ninguna (en móvil 3×2,
   en pantallas anchas una fila), con navegación por flechas. */
function pestanas(n, pintar) {
  const tabs = [...n.querySelectorAll('[role="tab"]')];
  const activar = (b, foco = false) => {
    tabs.forEach((x) => {
      const on = x === b;
      x.setAttribute('aria-selected', String(on));
      x.tabIndex = on ? 0 : -1;
    });
    if (foco) b.focus();
    pintar(b.dataset.t);
  };
  tabs.forEach((b, i) => {
    b.addEventListener('click', () => activar(b));
    b.addEventListener('keydown', (e) => {
      const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (d) { e.preventDefault(); activar(tabs[(i + d + tabs.length) % tabs.length], true); }
      if (e.key === 'Home') { e.preventDefault(); activar(tabs[0], true); }
      if (e.key === 'End') { e.preventDefault(); activar(tabs[tabs.length - 1], true); }
    });
  });
  activar(tabs[0]);
}

function vEmergencia(id) {
  const e = EMERGENCIAS_MAP[id];
  if (!e) return v404();

  const panel = (arr, cls = 'steps') => `<ol class="${cls}">${arr.map((i) => `<li>${esc(i)}</li>`).join('')}</ol>`;
  const TABS = [
    ['ahora', 'Ahora'], ['horas', 'Próximas horas'], ['dias', 'Próximos días'],
    ['no', 'No hacer'], ['eq', 'Equipo'], ['ev', 'Evacuar o quedarse'],
  ];

  const n = el(`<div class="sos">
    ${topbar(e.t, 'SOS', '#/emergencia')}
    <div class="emg-hd"><h1><span aria-hidden="true">${e.ic}</span> ${esc(e.t.toUpperCase())}</h1></div>

    <div class="qcard"><h4>TARJETA RÁPIDA</h4><ol>${e.card.map((l) => `<li>${esc(l)}</li>`).join('')}</ol></div>

    <div class="tabs tabs-sos" role="tablist" aria-label="Qué hacer">
      ${TABS.map(([t, l]) => `<button role="tab" type="button" id="tab-${t}" aria-controls="emg-body" data-t="${t}"${t === 'no' ? ' class="no"' : ''} aria-selected="false">${t === 'no' ? '<span aria-hidden="true">✕ </span>' : ''}${l}</button>`).join('')}
    </div>
    <div id="emg-body" role="tabpanel" tabindex="0"></div>

    <div class="card">
      <h3>Fuentes</h3>
      <div>${e.src.map((s) => SOURCE_MAP[s] ? `<span class="tag">${esc(SOURCE_MAP[s].org)}</span>` : '').join('')}</div>
      <a class="btn ghost sm" href="#/sec/fuentes" style="margin-top:8px">Ver referencias completas</a>
    </div>
    ${barra112()}
  </div>`);

  const body = n.querySelector('#emg-body');
  const paint = (t) => {
    body.setAttribute('aria-labelledby', `tab-${t}`);
    if (t === 'ahora') body.innerHTML = `<h2>Primeros minutos</h2>${panel(e.ahora)}`;
    else if (t === 'horas') body.innerHTML = `<h2>Próximas horas</h2>${panel(e.horas)}`;
    else if (t === 'dias') body.innerHTML = `<h2>Próximos días</h2>${panel(e.dias)}`;
    else if (t === 'no') body.innerHTML = `<h2>Errores peligrosos: no hacer</h2>${panel(e.no, 'steps no')}`;
    else if (t === 'eq') body.innerHTML = `<h2>Equipo útil</h2><ul>${e.eq.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;
    else body.innerHTML = `<h2>Quedarse o evacuar</h2>
      <h3>Motivos para permanecer / confinarse</h3><ul>${e.ev.quedarse.map((i) => `<li>${esc(i)}</li>`).join('') || '<li>—</li>'}</ul>
      <h3>Motivos para evacuar</h3><ul>${e.ev.evacuar.map((i) => `<li>${esc(i)}</li>`).join('') || '<li>—</li>'}</ul>
      <div class="blk-note">${esc(e.ev.nota)}</div>`;
  };
  pestanas(n, paint);
  mantenerPantalla();
  return { node: n, emg: true };
}

/* Emergencia sanitaria: muestra el artículo de primeros auxilios (misma
   fuente de datos) con la cabecera de SOS y el 112 siempre a mano. */
function vSanitaria(id) {
  const s = SOS_SANITARIAS_MAP[id];
  const a = s && ARTICULOS_MAP[s.art];
  if (!a) return v404();
  const n = el(`<div class="sos">
    ${topbar(s.t, 'SOS · Emergencia sanitaria', '#/emergencia')}
    <div class="emg-hd"><h1><span aria-hidden="true">${s.ic}</span> ${esc(s.t.toUpperCase())}</h1><p>${esc(a.sum)}</p></div>
    ${avisoRevision(a)}
    ${boton112()}
    <div class="sp"></div>
    ${renderBlocks(a.body)}
    <div class="card">
      <h3>Fuentes</h3>
      <ul>${(a.src || []).map((x) => SOURCE_MAP[x] ? `<li><b>${esc(SOURCE_MAP[x].org)}</b> — ${esc(SOURCE_MAP[x].titulo)}</li>` : '').join('')}</ul>
      <a class="btn ghost sm" href="#/art/${a.id}">Ver en Primeros auxilios</a>
    </div>
    ${barra112()}
  </div>`);
  mantenerPantalla();
  return { node: n, emg: true };
}

/* En SOS la pantalla no debe apagarse mientras se leen los pasos. Se libera
   al salir de la vista. Si el navegador no lo permite, no pasa nada. */
function mantenerPantalla() {
  let lock = null, vivo = true;
  navigator.wakeLock?.request('screen').then((l) => { if (vivo) lock = l; else l.release().catch(() => {}); }).catch(() => {});
  alSalir(() => { vivo = false; lock?.release?.().catch(() => {}); });
}

/* ------------------------------- ARTÍCULO ------------------------------- */
function vArticulo(id) {
  const a = ARTICULOS_MAP[id];
  if (!a) return v404();
  const sec = secMap[a.sec];
  return el(`<div>
    ${topbar(a.t, sec ? sec.t : '', `#/sec/${a.sec}`)}
    <h1>${sec ? sec.ic + ' ' : ''}${esc(a.t)}</h1>
    <p>${prBadge(a.pr, PRIORIDADES)} <span class="muted">${esc(a.sum)}</span></p>
    ${avisoRevision(a)}
    <hr>
    ${renderBlocks(a.body)}
    <hr>
    <div>${(a.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>
    ${a.src?.length ? `<div class="card"><h3>Fuentes</h3><ul>${a.src.map((s) => {
      const f = SOURCE_MAP[s];
      return f ? `<li><b>${esc(f.org)}</b> — ${esc(f.titulo)} <span class="muted">(consultado ${esc(f.fecha)})</span></li>` : '';
    }).join('')}</ul></div>` : ''}
  </div>`);
}

/* ------------------------------- SECCIÓN ------------------------------- */
async function vSeccion(id, sub) {
  const s = secMap[id];
  if (!s) return v404();

  if (id === 'config') return vConfig();
  if (id === 'fuentes') return vFuentes();
  if (id === 'plan-familiar') return vPlanFamiliar();
  if (id === 'calculadoras') return vCalculadoras();
  if (id === 'cursos') return vCursos();
  if (id === 'manual') return vManual();
  if (id === 'juegos') {
    const { juegosView } = await import('./juegos.js');
    const w = el(`<div>${topbar(s.t, s.desc)}<h1>${s.ic} ${esc(s.t)}</h1></div>`);
    w.appendChild(juegosView(sub));
    return w;
  }
  if (id === 'audio') {
    const { audioView } = await import('./audio.js');
    const w = el(`<div>${topbar(s.t, s.desc)}<h1>${s.ic} AUDIO OFFLINE</h1></div>`);
    w.appendChild(await audioView());
    return w;
  }
  if (id === 'riesgos') {
    const { riesgosView } = await import('./riesgos.js');
    const w = el(`<div>${topbar(s.t, 'Horizonte 2026 → 2036')}<h1>${s.ic} RIESGOS 2026 — 2036</h1>
      <p class="muted">${esc(s.desc)}</p></div>`);
    w.appendChild(await riesgosView());
    return w;
  }
  if (id === 'familia') {
    const { familiaView } = await import('./familia.js');
    const w = el(`<div>${topbar('Centro familiar', 'Tus ubicaciones y rutas')}<h1>${s.ic} CENTRO FAMILIAR</h1></div>`);
    w.appendChild(await familiaView());
    return w;
  }

  const arts = articulosDeSeccion(id);
  const rows = arts.map((a) => `
    <a class="row pr-${a.pr}" href="#/art/${a.id}">
      <div class="rt"><b>${esc(a.t)}</b><span>${esc(a.sum)}</span></div><span class="chev">›</span>
    </a>`).join('');

  const extra = [];

  if (id === 'orientacion') extra.push('<div id="slot-compass"></div>');
  if (id === 'equipo') {
    extra.push(`<h2>Checklists</h2><div class="list">${CHECKLISTS.map((c) => `
      <a class="row" href="#/check/${c.id}"><span>☑</span><div class="rt"><b>${esc(c.t)}</b><span>${esc(c.desc)}</span></div><span class="chev">›</span></a>`).join('')}</div>`);
  }
  if (id === 'comunicaciones') extra.push('<div id="slot-frec"></div>');
  if (id === 'psicologia') extra.push(`<div class="card"><h3>🎮 Juegos offline y modo calma</h3>
    <p class="muted">Actividades para reducir el estrés, el aburrimiento y la tensión durante un aislamiento prolongado, especialmente con niños o adolescentes. Todo funciona sin conexión.</p>
    <div class="btnrow">
      <a class="btn sm" href="#/sec/juegos">🎮 Abrir juegos</a>
      <a class="btn sm ghost" href="#/sec/juegos/calma">🧘 Modo calma</a>
    </div></div>`);
  if (id === 'avila') extra.push(`<div class="card"><h3>Herramientas de la guía de Ávila</h3>
    <div class="btnrow">
      <a class="btn sm" href="#/check/avila">☑ Checklist Plan Ávila</a>
      <a class="btn sm ghost" href="#/mapa">🗺 Mapa de la provincia</a>
      <a class="btn sm ghost" href="#/curso/c09">🎓 Curso 09 — Ávila</a>
    </div></div>`);

  const n = el(`<div>
    ${topbar(s.t)}
    <h1>${s.ic} ${esc(s.t)}</h1>
    <p class="muted">${esc(s.desc)}</p>
    <div class="list">${rows || '<p class="muted">Sin artículos en esta sección.</p>'}</div>
    <div class="sp"></div>
    ${extra.join('')}
  </div>`);

  if (id === 'orientacion') {
    const h = el('<div><h2>🧭 Brújula digital</h2></div>');
    h.appendChild(compassView());
    n.querySelector('#slot-compass').replaceWith(h);
  }
  if (id === 'comunicaciones') {
    const slot = n.querySelector('#slot-frec');
    slot.replaceWith(await frecuenciasPanel());
  }
  return n;
}

/* ----------------------------- FRECUENCIAS ----------------------------- */
async function frecuenciasPanel() {
  const userFrecs = await store.all('frecs');
  const log = (await store.all('radiolog')).sort((a, b) => b.ts - a.ts).slice(0, 50);

  const grupos = {};
  for (const f of FRECUENCIAS) (grupos[f.grupo] ||= []).push(f);

  const n = el(`<div>
    <h2>📻 Base de frecuencias</h2>
    <div class="blk-note">Solo se incluyen frecuencias procedentes de las fuentes citadas. Lo no verificado se marca como tal. Nunca transmitas en frecuencias reservadas a servicios de emergencia.</div>
    ${Object.entries(grupos).map(([g, fs], gi) => `
      <details${gi === 0 ? ' open' : ''}><summary>${esc(g)} (${fs.length})</summary><div>
        ${fs.map((f) => `<div class="freq-card ${f.verificado ? '' : 'unver'}">
          <b>${esc(f.rx)} ${esc(f.unidad)}</b>
          <span class="badge ${f.verificado ? 'ok' : 'warn'}">${f.verificado ? 'verificada' : 'sin verificar'}</span>
          <div>${esc(f.nombre)}</div>
          <div class="m">RX ${esc(f.rx)} · TX ${esc(f.tx)} · ${esc(f.modo)} · ${esc(f.pot)}</div>
          <div class="m">${esc(f.licencia)} · ${esc(f.zona)}</div>
          <div class="m">${esc(f.uso)}</div>
          ${f.notas ? `<div class="m" style="color:var(--sand)">${esc(f.notas)}</div>` : ''}
        </div>`).join('')}
      </div></details>`).join('')}

    <h3>Mis frecuencias</h3>
    <div id="uf-list" class="list"></div>
    <details><summary>➕ Añadir frecuencia</summary><div>
      <div class="fieldrow">
        <div><label>Frecuencia</label><input id="uf-f" placeholder="446.00625"></div>
        <div><label>Unidad</label><select id="uf-u"><option>MHz</option><option>kHz</option></select></div>
      </div>
      <label>Nombre</label><input id="uf-n" placeholder="Ej. RNE Ávila, canal familiar…">
      <label>Uso</label><input id="uf-us" placeholder="Recepción / transmisión, para qué">
      <label>Zona</label><input id="uf-z" placeholder="Dónde se recibe bien">
      <label>Notas y fuente</label><textarea id="uf-no" placeholder="¿De dónde has obtenido este dato? Anótalo siempre."></textarea>
      <button class="btn wide" id="uf-go" type="button" style="margin-top:10px">Guardar</button>
    </div></details>

    <h3>Radio log</h3>
    <details><summary>➕ Nueva entrada de log</summary><div>
      <div class="fieldrow">
        <div><label>Frecuencia / canal</label><input id="rl-f" placeholder="PMR446 ch7"></div>
        <div><label>Señal (1–5)</label><input id="rl-s" type="number" min="1" max="5" value="3"></div>
      </div>
      <label>Contenido / contacto</label><textarea id="rl-t" placeholder="Qué has escuchado o con quién has contactado"></textarea>
      <button class="btn wide" id="rl-go" type="button" style="margin-top:10px">Registrar</button>
    </div></details>
    <div id="rl-list" class="list"></div>
  </div>`);

  const paintUF = async () => {
    const fs = await store.all('frecs');
    n.querySelector('#uf-list').innerHTML = fs.length
      ? fs.map((f) => `<div class="freq-card unver"><b>${esc(f.f)} ${esc(f.u)}</b>
          <span class="badge warn">propia</span>
          <div>${esc(f.n)}</div><div class="m">${esc(f.us || '')} · ${esc(f.z || '')}</div>
          <div class="m">${esc(f.no || '')}</div>
          <button class="btn danger borrar" data-fdel="${esc(f.id)}" type="button" style="margin-top:6px" aria-label="Eliminar la frecuencia ${esc(f.f)}">Eliminar</button></div>`).join('')
      : '<p class="muted">Ninguna todavía. Añade las que verifiques tú mismo.</p>';
    n.querySelectorAll('[data-fdel]').forEach((b) =>
      b.addEventListener('click', async () => {
        const rec = await store.get('frecs', b.dataset.fdel);
        await borrarConDeshacer({ que: 'Frecuencia', borrar: () => store.del('frecs', rec.id), restaurar: () => store.restaurar('frecs', rec), repintar: () => n.isConnected && paintUF() });
      }));
  };

  const paintLog = async () => {
    const rows = (await store.all('radiolog')).sort((a, b) => b.ts - a.ts);
    n.querySelector('#rl-list').innerHTML = rows.length
      ? rows.map((r) => `<div class="row"><div class="rt"><b>${esc(r.f)} · señal ${esc(r.s)}/5</b>
          <span>${new Date(r.ts).toLocaleString('es-ES')} — ${esc(r.t || '')}</span></div>
          <button class="btn danger borrar" data-ldel="${esc(r.id)}" type="button" aria-label="Eliminar entrada del registro">✕</button></div>`).join('')
      : '<p class="muted">Sin entradas.</p>';
    n.querySelectorAll('[data-ldel]').forEach((b) =>
      b.addEventListener('click', async () => {
        const rec = await store.get('radiolog', b.dataset.ldel);
        await borrarConDeshacer({ que: 'Entrada del registro', borrar: () => store.del('radiolog', rec.id), restaurar: () => store.restaurar('radiolog', rec), repintar: () => n.isConnected && paintLog() });
      }));
  };

  n.querySelector('#uf-go').addEventListener('click', async () => {
    const f = n.querySelector('#uf-f').value.trim();
    if (!f) return toast('Indica la frecuencia');
    await store.put('frecs', {
      id: uid(), f, u: n.querySelector('#uf-u').value,
      n: n.querySelector('#uf-n').value.trim() || 'Sin nombre',
      us: n.querySelector('#uf-us').value.trim(),
      z: n.querySelector('#uf-z').value.trim(),
      no: n.querySelector('#uf-no').value.trim(), ts: Date.now(),
    });
    ['#uf-f', '#uf-n', '#uf-us', '#uf-z', '#uf-no'].forEach((s) => { n.querySelector(s).value = ''; });
    paintUF(); toast('Frecuencia guardada');
  });

  n.querySelector('#rl-go').addEventListener('click', async () => {
    const f = n.querySelector('#rl-f').value.trim();
    if (!f) return toast('Indica la frecuencia o canal');
    await store.put('radiolog', {
      id: uid(), f, s: n.querySelector('#rl-s').value,
      t: n.querySelector('#rl-t').value.trim(), ts: Date.now(),
    });
    n.querySelector('#rl-f').value = ''; n.querySelector('#rl-t').value = '';
    paintLog(); toast('Entrada registrada');
  });

  await paintUF(); await paintLog();
  return n;
}

/* ------------------------------ CHECKLIST ------------------------------ */
async function vChecklist(id) {
  const c = CHECKLISTS.find((x) => x.id === id);
  if (!c) return v404();
  const estados = ['tengo', 'falta', 'comprar', 'revisar'];
  const saved = Object.fromEntries((await store.all('checks')).map((r) => [r.id, r]));

  const items = [];
  const html = c.grupos.map((g) => `
    <h3>${esc(g.g)}</h3>
    ${g.items.map((it, i) => {
      const key = `${c.id}::${g.g}::${i}`;
      items.push(key);
      const cur = saved[key] || {};
      return `<div class="chk-item" data-k="${esc(key)}">
        <div class="lbl">${esc(it)}</div>
        <div class="chk-states">
          ${estados.map((e2) => `<button type="button" data-s="${e2}" aria-pressed="${cur.estado === e2}">${e2}</button>`).join('')}
        </div>
        <input type="date" value="${esc(cur.fecha || '')}" aria-label="Fecha de caducidad o revisión">
      </div>`;
    }).join('')}`).join('');

  const n = el(`<div>
    ${topbar(c.t, 'Checklist', '#/sec/equipo')}
    <h1>☑ ${esc(c.t)}</h1>
    <p class="muted">${esc(c.desc)}</p>
    <div class="progress"><i id="ck-bar" style="width:0"></i></div>
    <div class="muted" id="ck-txt"></div>
    <div class="btnrow" style="margin-top:10px">
      <button class="btn ghost sm" id="ck-clr" type="button">Reiniciar este checklist</button>
    </div>
    ${html}
  </div>`);

  const refresh = async () => {
    const rows = await store.all('checks');
    const mine = rows.filter((r) => r.id.startsWith(c.id + '::'));
    const tengo = mine.filter((r) => r.estado === 'tengo').length;
    const pct = items.length ? (tengo / items.length) * 100 : 0;
    n.querySelector('#ck-bar').style.width = pct + '%';
    n.querySelector('#ck-txt').textContent = `${tengo} de ${items.length} completados (${pct.toFixed(0)} %)`;
  };

  n.querySelectorAll('.chk-item').forEach((box) => {
    const key = box.dataset.k;
    box.querySelectorAll('.chk-states button').forEach((b) => {
      b.addEventListener('click', async () => {
        const cur = (await store.get('checks', key)) || { id: key };
        cur.estado = cur.estado === b.dataset.s ? '' : b.dataset.s;
        await store.put('checks', cur);
        box.querySelectorAll('.chk-states button').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.s === cur.estado)));
        refresh();
      });
    });
    box.querySelector('input[type=date]').addEventListener('change', async (e2) => {
      const cur = (await store.get('checks', key)) || { id: key };
      cur.fecha = e2.target.value;
      await store.put('checks', cur);
    });
  });

  n.querySelector('#ck-clr').addEventListener('click', async () => {
    if (!confirm('¿Reiniciar todas las marcas de este checklist?')) return;
    for (const k of items) await store.del('checks', k);
    toast('Checklist reiniciado');
    route();
  });

  await refresh();
  return n;
}

/* -------------------------------- CURSOS -------------------------------- */
function vCursos() {
  return el(`<div>
    ${topbar('Formación')}
    <h1>🎓 FORMACIÓN</h1>
    <p class="muted">Diez cursos breves. Teoría, ejercicio práctico y autoevaluación. Todo funciona sin conexión.</p>
    <div class="list">${CURSOS.map((c) => `
      <a class="row" href="#/curso/${c.id}"><div class="rt"><b>${esc(c.n)} — ${esc(c.t)}</b><span>${esc(c.dur)} · ${esc(c.obj)}</span></div><span class="chev">›</span></a>`).join('')}</div>
  </div>`);
}

async function vCurso(id) {
  const c = CURSOS.find((x) => x.id === id);
  if (!c) return v404();
  const prog = (await store.get('progreso', c.id)) || { id: c.id, hecho: false, nota: null };

  const n = el(`<div>
    ${topbar(`${c.n} — ${c.t}`, 'Formación', '#/sec/cursos')}
    <h1>🎓 ${esc(c.n)} — ${esc(c.t)}</h1>
    <p class="muted">${esc(c.dur)} · ${esc(c.obj)} ${prog.hecho ? '<span class="badge ok">completado</span>' : ''}</p>

    <h2>Teoría</h2>
    <ul>${c.teoria.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>

    <h2>Lectura</h2>
    <div class="list">${c.lee.map((a) => {
      const art = ARTICULOS_MAP[a];
      return art ? `<a class="row pr-${art.pr}" href="#/art/${art.id}"><div class="rt"><b>${esc(art.t)}</b><span>${esc(art.sum)}</span></div><span class="chev">›</span></a>` : '';
    }).join('')}</div>

    <h2>Ejercicio práctico</h2>
    <div class="blk-ok">${esc(c.ejercicio)}</div>

    <h2>Autoevaluación</h2>
    <div id="q"></div>
    <div id="qres"></div>
  </div>`);

  const q = n.querySelector('#q');
  q.innerHTML = c.quiz.map((item, i) => `
    <div class="card" data-q="${i}">
      <b>${i + 1}. ${esc(item.q)}</b>
      <div style="margin-top:8px">${item.o.map((o, j) => `<button class="btn ghost quiz-opt" data-o="${j}" type="button">${esc(o)}</button>`).join('')}</div>
      <div class="exp muted" hidden></div>
    </div>`).join('');

  let aciertos = 0, respondidas = 0;
  q.querySelectorAll('[data-q]').forEach((box) => {
    const i = +box.dataset.q;
    const item = c.quiz[i];
    box.querySelectorAll('.quiz-opt').forEach((b) => {
      b.addEventListener('click', async () => {
        if (box.dataset.done) return;
        box.dataset.done = '1';
        const j = +b.dataset.o;
        const ok = j === item.r;
        b.classList.add(ok ? 'right' : 'wrong');
        if (!ok) box.querySelector(`[data-o="${item.r}"]`).classList.add('right');
        const exp = box.querySelector('.exp');
        exp.hidden = false;
        exp.textContent = item.exp;
        respondidas++; if (ok) aciertos++;
        if (respondidas === c.quiz.length) {
          const nota = Math.round((aciertos / c.quiz.length) * 100);
          await store.put('progreso', { id: c.id, hecho: true, nota, ts: Date.now() });
          n.querySelector('#qres').innerHTML = `<div class="blk-${nota >= 67 ? 'ok' : 'warn'}">Resultado: ${aciertos}/${c.quiz.length} (${nota} %). ${nota >= 67 ? 'Curso completado.' : 'Repasa la teoría y vuelve a intentarlo.'}</div>`;
        }
      });
    });
  });
  return n;
}

/* ---------------------------- PLAN FAMILIAR ---------------------------- */
async function vPlanFamiliar() {
  const n = el(`<div>
    ${topbar('Plan familiar')}
    <h1>👨‍👩‍👧 PLAN FAMILIAR</h1>
    <div class="blk-note">Todo lo que escribas aquí se guarda <b>solo en este dispositivo</b>. No se envía a ningún servidor. Haz una copia con Ajustes → Exportar datos e imprime una versión en papel para cada mochila.</div>

    <h2>Contactos</h2>
    <div id="pf-list" class="list"></div>
    <details><summary>➕ Añadir contacto</summary><div>
      <label>Nombre</label><input id="pf-n" placeholder="Nombre y parentesco">
      <label>Teléfono</label><input id="pf-t" inputmode="tel" placeholder="+34 …">
      <label>Dirección</label><input id="pf-d">
      <label>Papel en el plan</label>
      <select id="pf-r">
        <option value="familia">Familia / convivientes</option>
        <option value="externo">Contacto EXTERNO fuera de la zona</option>
        <option value="centro">Colegio / centro de día</option>
        <option value="medico">Médico / farmacia</option>
        <option value="vecino">Vecino de apoyo</option>
        <option value="otro">Otro</option>
      </select>
      <label>Notas</label><textarea id="pf-no" placeholder="Medicación, alergias, quién recoge a quién…"></textarea>
      <button class="btn wide" id="pf-go" type="button" style="margin-top:10px">Guardar contacto</button>
    </div></details>

    <h2>Acuerdos del plan</h2>
    <div class="card">
      <label>¿Dónde nos encontramos si no podemos volver a casa?</label><textarea id="k-punto"></textarea>
      <label>Punto de reunión cercano (misma calle o barrio)</label><textarea id="k-cerca"></textarea>
      <label>Punto de reunión fuera del barrio o del municipio</label><textarea id="k-lejos"></textarea>
      <label>¿Quién recoge a quién?</label><textarea id="k-recoge"></textarea>
      <label>¿Qué hacemos si no funcionan los móviles?</label><textarea id="k-sinmovil"></textarea>
      <label>Horarios acordados de contacto</label><textarea id="k-horas" placeholder="Ej. 09:00 y 21:00, por SMS"></textarea>
      <label>Umbrales de decisión acordados en frío</label><textarea id="k-umbral" placeholder="Ej.: si el aviso pasa a naranja, no salimos; si hay orden de evacuación, salimos por la ruta B"></textarea>
      <label>Rutas de salida (A y B)</label><textarea id="k-rutas"></textarea>
      <label>Información médica importante</label><textarea id="k-medico" placeholder="Alergias, medicación, grupo sanguíneo si lo conocéis"></textarea>
      <div class="muted">Se guarda automáticamente al escribir.</div>
    </div>

    <div class="btnrow">
      <button class="btn" id="pf-print" type="button">🖨 Imprimir plan</button>
      <a class="btn ghost" href="#/mapa">🗺 Guardar puntos en el mapa</a>
    </div>
  </div>`);

  // Campos de texto libre
  for (const t of n.querySelectorAll('textarea[id^="k-"]')) {
    const key = 'plan.' + t.id.slice(2);
    const rec = await store.get('kv', key);
    t.value = rec?.v || '';
    let to;
    t.addEventListener('input', () => {
      clearTimeout(to);
      to = setTimeout(() => store.put('kv', { id: key, v: t.value }), 350);
    });
  }

  const paint = async () => {
    const cs = await store.all('contactos');
    n.querySelector('#pf-list').innerHTML = cs.length
      ? cs.map((c) => `<div class="row"><div class="rt"><b>${esc(c.n)} <span class="badge">${esc(c.r)}</span></b>
          <span>${esc(c.t || '')} ${c.d ? '· ' + esc(c.d) : ''}${c.no ? '<br>' + esc(c.no) : ''}</span></div>
          ${c.t ? `<a class="btn sm ghost" href="tel:${esc(c.t.replace(/\s/g, ''))}">📞</a>` : ''}
          <button class="btn danger borrar" data-cdel="${esc(c.id)}" type="button" aria-label="Eliminar el contacto ${esc(c.n)}">✕</button></div>`).join('')
      : '<p class="muted">Ningún contacto todavía. Empieza por el contacto externo fuera de la zona.</p>';
    n.querySelectorAll('[data-cdel]').forEach((b) =>
      b.addEventListener('click', async () => {
        const rec = await store.get('contactos', b.dataset.cdel);
        await borrarConDeshacer({ que: 'Contacto', borrar: () => store.del('contactos', rec.id), restaurar: () => store.restaurar('contactos', rec), repintar: () => n.isConnected && paint() });
      }));
  };

  n.querySelector('#pf-go').addEventListener('click', async () => {
    const nm = n.querySelector('#pf-n').value.trim();
    if (!nm) return toast('Indica un nombre');
    await store.put('contactos', {
      id: uid(), n: nm, t: n.querySelector('#pf-t').value.trim(),
      d: n.querySelector('#pf-d').value.trim(), r: n.querySelector('#pf-r').value,
      no: n.querySelector('#pf-no').value.trim(), ts: Date.now(),
    });
    ['#pf-n', '#pf-t', '#pf-d', '#pf-no'].forEach((s) => { n.querySelector(s).value = ''; });
    paint(); toast('Contacto guardado en este dispositivo');
  });

  n.querySelector('#pf-print').addEventListener('click', () => window.print());
  await paint();
  return n;
}

/* --------------------------- CALCULADORAS --------------------------- */
function vCalculadoras() {
  const n = el(`<div>
    ${topbar('Calculadoras')}
    <h1>🧮 CALCULADORAS</h1>
    <p class="muted">Todas funcionan sin conexión.</p>
    <div id="calcs"></div>
  </div>`);
  const c = n.querySelector('#calcs');
  for (const k of Object.keys(CALCS)) c.appendChild(CALCS[k].f());
  return n;
}

/* ------------------------------ BUSCADOR ------------------------------ */
/* La lógica (normalización, sinónimos, ranking) vive en search.js y los
   sinónimos en data/content/sinonimos.js. Aquí solo se pinta. */
const TIPOS_BUSQUEDA = {
  sos: { t: 'SOS', ic: '🚨', f: 'sos' },
  emergencia: { t: 'Emergencia', ic: '🚨', f: 'sos' },
  articulo: { t: 'Manual', ic: '📄', f: 'manual' },
  checklist: { t: 'Checklist', ic: '☑', f: 'listas' },
  curso: { t: 'Curso', ic: '🎓', f: 'otros' },
  frecuencia: { t: 'Radio', ic: '📻', f: 'otros' },
  riesgo: { t: 'Riesgo', ic: '📊', f: 'otros' },
  ruta: { t: 'Ruta', ic: '🛣️', f: 'otros' },
  juego: { t: 'Juegos', ic: '🎮', f: 'otros' },
  audio: { t: 'Audio', ic: '🎵', f: 'otros' },
  familia: { t: 'Familia', ic: '👨‍👩‍👧', f: 'otros' },
};
const FILTROS_BUSQUEDA = [['todo', 'Todo'], ['sos', '🚨 SOS'], ['manual', '📄 Manual'], ['listas', '☑ Checklists'], ['otros', 'Otros']];
let buscador = null;

async function vBuscar(inicial = '') {
  const [{ crearBuscador }, { INDICE }, { BUSQUEDAS_FRECUENTES }] = await Promise.all([
    import('./search.js'), import('../../data/content/index.js'), import('../../data/content/sinonimos.js'),
  ]);
  buscador ||= crearBuscador(INDICE);

  const n = el(`<div>
    ${topbar('Buscar')}
    <div class="searchbar" role="search">
      <label for="q" class="vh">Buscar en el manual</label>
      <input id="q" type="search" placeholder="sangrado, apagón, incendio, RCP…" autocomplete="off" enterkeyhint="search" value="${esc(inicial)}">
      <div class="filtros-busq" id="fb" role="group" aria-label="Filtrar resultados"></div>
    </div>
    <div id="res" aria-live="polite"></div>
  </div>`);

  const res = n.querySelector('#res');
  const input = n.querySelector('#q');
  const fb = n.querySelector('#fb');
  let filtro = 'todo';
  let ultimo = null;
  let consultaAnterior = '';

  const chip = (q) => `<button class="btn ghost sm" data-sug="${esc(q)}" type="button">${esc(q)}</button>`;
  const enganchaSug = () => res.querySelectorAll('[data-sug]').forEach((b) => b.addEventListener('click', () => { input.value = b.dataset.sug; buscar(); input.focus(); }));

  const pintaSug = () => {
    fb.innerHTML = '';
    res.innerHTML = `<p class="muted">Búsquedas frecuentes:</p><div class="sugs">${BUSQUEDAS_FRECUENTES.map(chip).join('')}</div>
      <p class="muted" style="margin-top:14px">Puedes escribir como hablas: «sangra mucho», «se ha ido la luz», «no respira». Funciona sin conexión.</p>`;
    enganchaSug();
  };

  const motivo = (m, it) => {
    if (m.donde === 'titulo') return m.sinonimo ? `Por equivalencia: «${m.buscado}» → ${it.t}` : 'Coincide con el título';
    const base = m.donde === 'resumen' ? 'En el resumen' : 'En el texto';
    return m.sinonimo ? `${base}, por equivalencia de «${m.buscado}»` : base;
  };

  const tarjeta = ({ it, motivo: m, fragmento: fr }) => {
    const tp = TIPOS_BUSQUEDA[it.tipo] || { t: it.tipo, ic: '•' };
    const sec = secMap[it.sec];
    const cat = [tp.t, sec && sec.t.toUpperCase() !== tp.t.toUpperCase() ? sec.t : null].filter(Boolean).join(' · ');
    const frag = fr ? `<span class="frag">${esc(fr.antes)}<mark>${esc(fr.marca)}</mark>${esc(fr.despues)}</span>` : `<span class="frag">${esc((it.sum || '').slice(0, 140))}</span>`;
    return `<a class="row res pr-${it.pr}" href="${it.ruta}">
      <span class="ric" aria-hidden="true">${tp.ic}</span>
      <div class="rt">
        <span class="cat">${esc(cat)}</span>
        <b>${esc(it.t)}</b>
        ${frag}
        <span class="por">${esc(motivo(m, it))}${m.parcial ? ' · coincidencia parcial' : ''}</span>
      </div>
      <span class="chev" aria-hidden="true">›</span></a>`;
  };

  function pintaFiltros(r) {
    const cuenta = { todo: r.resultados.length };
    for (const x of r.resultados) { const f = TIPOS_BUSQUEDA[x.it.tipo]?.f || 'otros'; cuenta[f] = (cuenta[f] || 0) + 1; }
    fb.innerHTML = FILTROS_BUSQUEDA.filter(([k]) => k === 'todo' || cuenta[k])
      .map(([k, t]) => `<button type="button" data-f="${k}" aria-pressed="${k === filtro}">${t} <span>${cuenta[k] || 0}</span></button>`).join('');
    fb.querySelectorAll('[data-f]').forEach((b) => b.addEventListener('click', () => { filtro = b.dataset.f; pinta(ultimo); }));
  }

  function pinta(r) {
    pintaFiltros(r);
    const lista = r.resultados.filter((x) => filtro === 'todo' || (TIPOS_BUSQUEDA[x.it.tipo]?.f || 'otros') === filtro);
    const cs = r.conceptos.filter((c) => c.grupo && c.texto !== c.principal).map((c) => c.texto);
    res.innerHTML = `<p class="muted">${lista.length} resultado(s)${cs.length ? ` · incluye equivalencias de: ${cs.map((x) => `«${esc(x)}»`).join(', ')}` : ''}</p>
      <div class="list">${lista.map(tarjeta).join('')}</div>`;
  }

  function sinResultados(q) {
    fb.innerHTML = '';
    const sug = buscador.sugerir(q);
    // Error de escritura evidente: se muestran ya los resultados de la
    // corrección, sin obligar a pulsar nada más.
    if (sug.length) {
      const r = buscador.buscar(sug[0]);
      ultimo = r;
      filtro = 'todo';
      pinta(r);
      res.insertAdjacentHTML('afterbegin', `<div class="blk-note corregida">No hay nada para «${esc(q)}». Mostrando resultados de <b>«${esc(sug[0])}»</b>.
        ${sug.length > 1 ? `<div class="sugs" style="margin-top:6px">${sug.slice(1).map(chip).join('')}</div>` : ''}</div>`);
      enganchaSug();
      return;
    }
    res.innerHTML = `<div class="sr-empty">
      <p>No hay nada en el manual para «${esc(q)}».</p>
      <p>Prueba con otra palabra o con una de estas:</p>
      <div class="sugs">${BUSQUEDAS_FRECUENTES.slice(0, 8).map(chip).join('')}</div>
      <a class="btn wide" href="#/emergencia" style="margin-top:12px">🚨 Ir a SOS</a>
    </div>`;
    enganchaSug();
  }

  function buscar() {
    // Una búsqueda pendiente no puede tocar la dirección si ya se ha salido.
    if (!n.isConnected && !n.dataset.montando) return;
    const q = input.value.trim();
    // La consulta queda en la dirección: al volver atrás desde un resultado
    // se recupera la búsqueda en vez de empezar de cero.
    history.replaceState(null, '', q ? `#/buscar?q=${encodeURIComponent(q)}` : '#/buscar');
    if (q.length < 2) { ultimo = null; return pintaSug(); }
    // Cada búsqueda nueva empieza en "Todo": un filtro olvidado de la
    // anterior podría esconder justo la ficha de emergencia.
    if (q !== consultaAnterior) filtro = 'todo';
    consultaAnterior = q;
    const r = buscador.buscar(q);
    ultimo = r;
    if (!r.resultados.length) return sinResultados(q);
    pinta(r);
  }

  let to;
  alSalir(() => clearTimeout(to));
  input.addEventListener('input', () => { clearTimeout(to); to = setTimeout(buscar, 120); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { clearTimeout(to); buscar(); input.blur(); } });
  n.dataset.montando = '1';   // aún no está en el DOM: primera búsqueda
  if (inicial) buscar(); else pintaSug();
  delete n.dataset.montando;
  if (!inicial) setTimeout(() => input.focus(), 60);
  return n;
}

/* -------------------------------- MANUAL -------------------------------- */
function vManual() {
  const porSec = SECCIONES.filter((s) => ARTICULOS.some((a) => a.sec === s.id));
  return el(`<div>
    ${topbar('Manual completo')}
    <h1>📖 MANUAL</h1>
    <p class="muted">Índice completo: ${ARTICULOS.length} artículos, ${EMERGENCIAS.length} escenarios de emergencia, ${CHECKLISTS.length} checklists, ${CURSOS.length} cursos y ${FRECUENCIAS.length} entradas de frecuencias.</p>
    <details open><summary>🚨 Escenarios de emergencia</summary><div class="list">
      ${EMERGENCIAS.map((e) => `<a class="row pr-${e.pr}" href="#/emergencia/${e.id}"><span>${e.ic}</span><div class="rt"><b>${esc(e.t)}</b></div><span class="chev">›</span></a>`).join('')}
    </div></details>
    ${porSec.map((s) => `<details><summary>${s.ic} ${esc(s.t)}</summary><div class="list">
      ${articulosDeSeccion(s.id).map((a) => `<a class="row pr-${a.pr}" href="#/art/${a.id}"><div class="rt"><b>${esc(a.t)}</b><span>${esc(a.sum)}</span></div><span class="chev">›</span></a>`).join('')}
    </div></details>`).join('')}
    <details><summary>☑ Checklists</summary><div class="list">
      ${CHECKLISTS.map((c) => `<a class="row" href="#/check/${c.id}"><div class="rt"><b>${esc(c.t)}</b><span>${esc(c.desc)}</span></div><span class="chev">›</span></a>`).join('')}
    </div></details>
    <details><summary>🎓 Cursos</summary><div class="list">
      ${CURSOS.map((c) => `<a class="row" href="#/curso/${c.id}"><div class="rt"><b>${esc(c.n)} — ${esc(c.t)}</b></div><span class="chev">›</span></a>`).join('')}
    </div></details>
  </div>`);
}

/* -------------------------------- FUENTES -------------------------------- */
function vFuentes() {
  const tipos = { 1: 'Organismo oficial', 2: 'Científica / técnica', 3: 'Manual reconocido', 4: 'Fuente especializada', 5: 'Comunidad' };
  const ord = [...SOURCES].sort((a, b) => a.tipo - b.tipo || a.org.localeCompare(b.org));
  return el(`<div>
    ${topbar('Fuentes y referencias')}
    <h1>📑 FUENTES Y REFERENCIAS</h1>
    <div class="blk-note">Jerarquía aplicada al redactar el contenido: 1) organismos oficiales, 2) información científica o técnica, 3) manuales reconocidos, 4) fuentes especializadas, 5) contenido de comunidades. Cuando no ha sido posible verificar un dato, se indica expresamente como "pendiente de verificación" en lugar de inventarlo.</div>
    ${ord.map((s) => `<div class="card">
      <span class="badge">${esc(tipos[s.tipo])}</span>
      <h3 style="margin-top:6px">${esc(s.org)}</h3>
      <p style="margin:0 0 6px">${esc(s.titulo)}</p>
      <p class="muted" style="margin:0 0 6px">${esc(s.uso)}</p>
      <p class="muted mono" style="margin:0">Consultado: ${esc(s.fecha)}<br><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.url)}</a></p>
    </div>`).join('')}
    <div class="card">
      <h3>Nota sobre el perfil de Instagram solicitado</h3>
      <p class="muted">No fue posible analizar el perfil <span class="mono">@finalworldpreppers</span>: Instagram bloquea el acceso automatizado mediante su archivo robots.txt. Por ese motivo, el contenido de esta aplicación se ha construido a partir de fuentes oficiales españolas y de literatura técnica de supervivencia, y no reproduce material de ese perfil. Todo el texto es original.</p>
    </div>
    <div class="card">
      <h3>Aviso</h3>
      <p class="muted">${esc(DISCLAIMER)}</p>
    </div>
  </div>`);
}

/* ------------------------------ CONFIGURACIÓN ------------------------------ */
async function vConfig() {
  const s = store.settings();
  const est = await store.storageEstimate();
  const counts = {};
  for (const st of ['tiles', 'puntos', 'contactos', 'checks', 'frecs', 'radiolog', 'geo', 'progreso']) counts[st] = await store.count(st);

  const swReg = await navigator.serviceWorker?.getRegistration?.();
  const cacheNames = 'caches' in window ? await caches.keys() : [];
  let cachedCount = 0;
  for (const cn of cacheNames) { try { cachedCount += (await (await caches.open(cn)).keys()).length; } catch {} }

  const n = el(`<div>
    ${topbar('Configuración')}
    <h1>⚙️ CONFIGURACIÓN</h1>

    <h2>Estado offline</h2>
    <div class="card">
      <div class="kv">
        <div>Versión de la app</div><div class="mono">${esc(VERSION)}</div>
        <div>Contenido actualizado</div><div class="mono">${esc(FECHA_CONTENIDO)}</div>
        <div>Conexión</div><div>${navigator.onLine ? 'Con conexión' : '<b>Sin conexión</b>'}</div>
        <div>Service Worker</div><div>${swReg ? '<span class="badge ok">activo</span>' : '<span class="badge warn">no registrado</span>'}</div>
        <div>Recursos precacheados</div><div class="mono">${cachedCount} archivos</div>
        <div>Teselas de mapa</div><div class="mono">${counts.tiles}</div>
        <div>Capas GeoJSON propias</div><div class="mono">${counts.geo}</div>
        <div>Espacio usado</div><div class="mono">${fmtBytes(est?.usage)}${est?.quota ? ' de ' + fmtBytes(est.quota) : ''}</div>
        <div>Almacenamiento persistente</div><div id="cfg-persist" class="mono">comprobando…</div>
      </div>
      <div class="btnrow">
        <button class="btn" id="cfg-precache" type="button">⬇ Descargar todos los recursos</button>
        <button class="btn ghost" id="cfg-persistbtn" type="button">🔒 Solicitar almacenamiento persistente</button>
        <button class="btn ghost" id="cfg-update" type="button">🔄 Buscar actualización</button>
      </div>
      <div id="cfg-swlog" class="muted"></div>
      <div class="blk-note">Una vez descargados los recursos, la aplicación <b>no depende del servidor</b>. Si el alojamiento se cayera, cambiara de dirección o dejara de existir, la app seguiría arrancando desde este dispositivo exactamente igual. Solo necesitarías conexión para instalar una versión nueva.</div>
    </div>

    <h2>Datos disponibles sin conexión</h2>
    <div class="card"><ul>
      <li>${ARTICULOS.length} artículos del manual</li>
      <li>${EMERGENCIAS.length} escenarios de emergencia con tarjetas rápidas</li>
      <li>${CHECKLISTS.length} checklists · ${CURSOS.length} cursos · ${Object.keys(CALCS).length} calculadoras</li>
      <li>${FRECUENCIAS.length} entradas en la base de frecuencias</li>
      <li>Capa vectorial IGN: provincias, comunidades y municipios de Ávila</li>
      <li>Teselas ráster descargadas por ti: ${counts.tiles}</li>
    </ul></div>

    <h2>Apariencia</h2>
    <div class="card">
      <label>Tema</label>
      <select id="cfg-theme">
        <option value="dark"${s.theme === 'dark' ? ' selected' : ''}>Campo (oscuro)</option>
        <option value="night"${s.theme === 'night' ? ' selected' : ''}>🌙 Modo noche (baja luminosidad)</option>
      </select>
      <label>Contraste</label>
      <select id="cfg-contrast">
        <option value="normal"${s.contrast === 'normal' ? ' selected' : ''}>Normal</option>
        <option value="high"${s.contrast === 'high' ? ' selected' : ''}>Alto</option>
      </select>
      <label>Tamaño de texto</label>
      <select id="cfg-fs">
        <option value="m"${s.fs === 'm' ? ' selected' : ''}>Normal</option>
        <option value="l"${s.fs === 'l' ? ' selected' : ''}>Grande</option>
        <option value="xl"${s.fs === 'xl' ? ' selected' : ''}>Muy grande</option>
      </select>
      <div class="blk-note">El modo noche reduce la luminosidad global y evita superficies claras. Útil para conservar la visión nocturna y ahorrar batería en pantallas OLED.</div>
    </div>

    <h2>Sincronización entre dispositivos</h2>
    <div class="card" id="cfg-sync"></div>

    <h2>Copias de seguridad</h2>
    <div class="card">
      <p class="muted">Tus datos (${counts.puntos} puntos, ${counts.contactos} contactos, ${counts.checks} marcas de checklist, ${counts.frecs} frecuencias propias, ${counts.radiolog} entradas de radio log) están únicamente en este dispositivo. Si lo pierdes o borras la app, se pierden. Exporta con regularidad.</p>
      <div class="btnrow">
        <button class="btn" id="cfg-export" type="button">⬆ Exportar datos (JSON)</button>
        <button class="btn ghost" id="cfg-import" type="button">⬇ Importar datos</button>
      </div>
      <input type="file" id="cfg-file" accept="application/json,.json" hidden>
    </div>

    <h2>Mantenimiento</h2>
    <div class="card">
      <div class="btnrow">
        <button class="btn ghost danger" id="cfg-tiles" type="button">Borrar teselas de mapa</button>
        <button class="btn danger" id="cfg-wipe" type="button">Borrar TODOS mis datos</button>
      </div>
      <p class="muted">Borrar teselas libera espacio; el resto de la app sigue funcionando offline.</p>
    </div>

    <h2>Privacidad</h2>
    <div class="card"><p class="muted">Esta aplicación no envía ningún dato a ningún servidor. No usa analítica, ni cookies de terceros, ni servicios externos. Las únicas conexiones a Internet que puede hacer son: (1) descargar teselas de mapa cuando tú lo pides, y (2) comprobar si hay una versión nueva de la app. Sin esas dos acciones, funciona completamente aislada.</p></div>
  </div>`);

  // Persistencia
  navigator.storage?.persisted?.().then((p) => { n.querySelector('#cfg-persist').textContent = p ? 'concedido' : 'no concedido'; })
    .catch(() => { n.querySelector('#cfg-persist').textContent = 'no disponible'; });

  n.querySelector('#cfg-persistbtn').addEventListener('click', async () => {
    const ok = await store.persistStorage();
    toast(ok ? 'Almacenamiento persistente concedido' : 'El navegador no lo ha concedido');
    n.querySelector('#cfg-persist').textContent = ok ? 'concedido' : 'no concedido';
  });

  n.querySelector('#cfg-precache').addEventListener('click', async () => {
    const log = n.querySelector('#cfg-swlog');
    log.textContent = 'Descargando recursos…';
    try {
      const r = await fetch('./precache-manifest.json', { cache: 'no-cache' });
      const list = await r.json();
      const c = await caches.open('survival-static-v' + VERSION);
      let ok = 0;
      for (const u of list) { try { await c.add(new Request(u, { cache: 'reload' })); ok++; } catch {} }
      log.innerHTML = `<b>${ok}/${list.length}</b> recursos guardados. La app ya funciona sin Internet.`;
      await store.persistStorage();
    } catch (e) { log.innerHTML = `<span style="color:var(--red)">Error: ${esc(e.message)}</span>`; }
  });

  n.querySelector('#cfg-update').addEventListener('click', async () => {
    const log = n.querySelector('#cfg-swlog');
    if (!swReg) return (log.textContent = 'Service Worker no disponible.');
    log.textContent = 'Comprobando…';
    try { await swReg.update(); log.textContent = 'Comprobación realizada. Si hay una versión nueva se aplicará al reiniciar la app.'; }
    catch { log.textContent = 'Sin conexión: se mantiene la versión instalada, que sigue funcionando.'; }
  });

  ['theme', 'contrast', 'fs'].forEach((k) => {
    n.querySelector('#cfg-' + k).addEventListener('change', (e) => { store.setSetting(k, e.target.value); });
  });

  n.querySelector('#cfg-export').addEventListener('click', async () => {
    const data = await store.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `survival-offline-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toast('Copia exportada');
  });

  n.querySelector('#cfg-import').addEventListener('click', () => n.querySelector('#cfg-file').click());
  n.querySelector('#cfg-file').addEventListener('change', async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    try {
      await store.importAll(JSON.parse(await f.text()), { merge: true });
      toast('Datos importados');
      route();
    } catch (err) { toast('Error: ' + err.message); }
  });

  n.querySelector('#cfg-tiles').addEventListener('click', async () => {
    if (!confirm('¿Borrar todas las teselas de mapa descargadas?')) return;
    await store.clear('tiles'); toast('Teselas borradas'); route();
  });

  await montarSync(n.querySelector('#cfg-sync'));

  n.querySelector('#cfg-wipe').addEventListener('click', async () => {
    if (!confirm('Se borrarán TODOS tus datos: puntos, contactos, checklists, frecuencias, audio y mapas descargados. ¿Continuar?')) return;
    if (!confirm('Esta acción no se puede deshacer. ¿Seguro?')) return;
    for (const st of ['kv', 'checks', 'puntos', 'contactos', 'frecs', 'radiolog', 'tiles', 'geo', 'progreso', 'tombstones', 'audio']) await store.clear(st);
    localStorage.clear();
    toast('Datos borrados'); setTimeout(() => location.reload(), 800);
  });

  return n;
}

/* ------------------------- Panel de sincronización ------------------------- */
async function montarSync(box) {
  const S = await import('./sync.js');

  const pinta = () => {
    const c = S.cfg();
    const r = c.ultimoResumen;
    box.innerHTML = `
      <div class="blk-note"><b>Local-first.</b> Tus datos viven en este dispositivo y la app funciona igual sin nada de esto. La sincronización es un espejo opcional para tener lo mismo en el móvil y en el ordenador. <b>Las teselas de mapa no se sincronizan</b> a propósito: pesan mucho y se vuelven a descargar.</div>

      <details id="sy-d1" ${S.configurado() ? '' : 'open'}><summary>1 · Conectar el proyecto${c.url ? ` <span class="muted mono" style="font-size:.7rem">· ${esc(c.url.replace(/^https?:\/\//, ''))}</span>` : ''}</summary><div>
        <label>URL del proyecto de Supabase (acaba en .supabase.co)</label>
        <input id="sy-url" placeholder="https://xxxxxxxxxxxx.supabase.co" value="${esc(c.url || '')}">
        <div class="muted">Ojo: <b>no es la dirección de esta app</b>. Es la del proyecto de Supabase, en <b>Settings → API → Project URL</b> o en el botón <b>Connect</b>.</div>
        <label>Clave pública (publishable o anon)</label>
        <input id="sy-anon" placeholder="sb_publishable_… o eyJhbGci…" value="${esc(c.anon || '')}">
        <div class="muted">En Supabase está en <b>Settings → API Keys</b>. Sirve cualquiera de las dos: la nueva <span class="mono">sb_publishable_…</span> o la antigua <span class="mono">anon</span>. Ambas están diseñadas para ir en el navegador; lo que protege tus datos es la política RLS del paso 2, no la clave.<br><b>No pegues aquí nunca la clave <i>secret</i> ni la <i>service_role</i>:</b> saltan la RLS y dan acceso total. Si lo haces, el diagnóstico te avisará.</div>
        <button class="btn wide sm" id="sy-save" type="button" style="margin-top:8px">Guardar conexión</button>

        <details style="margin-top:12px"><summary>Atajo opcional: pegar todo de golpe</summary><div>
          <p class="muted">Si no quieres copiar los dos valores por separado, pega aquí el bloque de código de <b>Connect</b>, un <span class="mono">.env</span>, o la URL y la clave una debajo de otra. La app las separa sola y rellena los campos de arriba. <b>No hace falta usarlo.</b></p>
          <textarea id="sy-pegar" rows="3" placeholder="const supabase = createClient('https://….supabase.co', 'sb_publishable_…')"></textarea>
          <button class="btn ghost wide sm" id="sy-detect" type="button" style="margin-top:8px">✨ Detectar URL y clave</button>
        </div></details>
      </div></details>

      <details id="sy-d2"><summary>2 · Crear la tabla en Supabase (una sola vez)</summary><div>
        <p class="muted">Ve a tu proyecto → <b>SQL Editor</b> → <b>New query</b>, pega esto y pulsa <b>Run</b>.</p>
        <textarea id="sy-sql" rows="10" readonly style="font-family:var(--fb);font-size:.72rem">${esc(S.SQL_ESQUEMA)}</textarea>
        <button class="btn ghost wide sm" id="sy-copy" type="button" style="margin-top:8px">Copiar SQL</button>
        <div class="blk-warn">La política <span class="mono">RLS</span> del script es lo que impide que nadie más lea tus filas. No la quites.</div>
      </div></details>

      <details id="sy-d3" ${S.configurado() && !S.sesionActiva() ? 'open' : ''}><summary>3 · Iniciar sesión</summary><div>
        ${S.sesionActiva()
          ? `<div class="blk-ok">Sesión iniciada como <b>${esc(c.email || c.user_id)}</b></div>
             <button class="btn ghost wide sm" id="sy-out" type="button">Cerrar sesión</button>`
          : `<label>Correo</label><input id="sy-mail" type="email" inputmode="email" autocomplete="username">
             <label>Contraseña</label><input id="sy-pass" type="password" autocomplete="current-password">
             <div class="btnrow" style="margin-top:8px">
               <button class="btn sm" id="sy-in" type="button">Entrar</button>
               <button class="btn ghost sm" id="sy-up" type="button">Crear cuenta</button>
             </div>
             <div class="muted">Si al crear la cuenta te pide confirmar el correo, confírmalo o desactiva la confirmación en Supabase → Authentication → Providers → Email.</div>`}
      </div></details>

      ${S.sesionActiva() ? `
      <div class="kv">
        <div>Última sincronización</div><div>${c.ultimaSync ? new Date(c.ultimaSync).toLocaleString('es-ES') : 'nunca'}</div>
        ${r ? `<div>Último resultado</div><div>↓ ${r.aplicados} aplicados · ↑ ${r.subidos} subidos · ${r.borrados} borrados${r.conflictos ? ` · ${r.conflictos} conflictos (ganó este dispositivo)` : ''}</div>` : ''}
        ${c.ultimoError ? `<div>Último error</div><div style="color:var(--red)">${esc(c.ultimoError)}</div>` : ''}
      </div>
      <label class="sw" style="margin-bottom:8px"><input type="checkbox" id="sy-auto" ${c.auto ? 'checked' : ''}> Sincronizar automáticamente al abrir y al recuperar la conexión</label>
      <div class="btnrow">
        <button class="btn" id="sy-now" type="button">🔄 Sincronizar ahora</button>
      </div>
      <div id="sy-log" class="muted"></div>` : ''}

      ${S.configurado() ? `<div class="btnrow" style="margin-top:10px">
        <button class="btn ghost sm" id="sy-diag" type="button">🩺 Comprobar configuración</button>
        <button class="btn ghost sm" id="sy-pasar" type="button">📤 Pasar al otro dispositivo</button>
      </div>
      <div id="sy-diagout"></div>` : ''}

      <div class="blk-warn">Si editas lo mismo en dos dispositivos sin sincronizar entre medias, gana el que sincronice más tarde. Para datos críticos del plan familiar, sincroniza justo después de cambiarlos.</div>`;

    box.querySelector('#sy-detect')?.addEventListener('click', () => {
      const { url, key } = S.detectarCredenciales(box.querySelector('#sy-pegar').value || '');
      if (url) box.querySelector('#sy-url').value = url;
      if (key) box.querySelector('#sy-anon').value = key;
      toast(url && key ? 'URL y clave detectadas: revisa y guarda' : url || key ? 'Solo he encontrado una de las dos' : 'No he reconocido nada ahí');
    });

    box.querySelector('#sy-diag')?.addEventListener('click', async () => {
      const out = box.querySelector('#sy-diagout');
      out.innerHTML = '<div class="muted">Comprobando…</div>';
      const pasos = await S.diagnosticar();
      const ic = { ok: '✅', warn: '🟡', error: '❌' };
      const hayError = pasos.some((p) => p.estado === 'error');
      out.innerHTML = `<div class="card" style="margin-top:8px">
        <h3>${hayError ? '❌ Hay algo que arreglar' : pasos.some((p) => p.estado === 'warn') ? '🟡 Casi listo' : '✅ Todo correcto'}</h3>
        <div class="list">${pasos.map((p) => `<div class="row ${p.estado === 'error' ? 'pr-critico' : p.estado === 'warn' ? 'pr-importante' : 'pr-info'}">
          <span>${ic[p.estado]}</span>
          <div class="rt"><b>${esc(p.t)}</b><span>${esc(p.msg)}${p.arreglo ? `<br><b style="color:var(--sand)">→ ${esc(p.arreglo)}</b>` : ''}</span></div>
        </div>`).join('')}</div>
      </div>`;
      // Abre el apartado donde está el problema: de nada sirve decir qué
      // arreglar si el campo para arreglarlo se queda plegado.
      const fallo = pasos.find((p) => p.estado === 'error') || pasos.find((p) => p.estado === 'warn');
      if (fallo) {
        const destino = /URL|Clave|Conexión/.test(fallo.t) ? '#sy-d1'
          : /Tabla|RLS/.test(fallo.t) ? '#sy-d2'
          : /Sesión/.test(fallo.t) ? '#sy-d3' : null;
        const d = destino && box.querySelector(destino);
        if (d) {
          d.open = true;
          const campo = destino === '#sy-d1'
            ? (/URL/.test(fallo.t) ? box.querySelector('#sy-url') : box.querySelector('#sy-anon'))
            : null;
          if (campo) { campo.focus(); campo.select?.(); }
          out.insertAdjacentHTML('beforeend',
            `<div class="muted center" style="margin-top:6px">↑ Te he abierto el apartado donde se arregla</div>`);
        }
      }
      out.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    box.querySelector('#sy-pasar')?.addEventListener('click', async () => {
      const t = S.configTransferible();
      if (!t) return toast('Guarda antes la conexión');
      const texto = `${t.url}\n${t.anon}`;
      try {
        await navigator.clipboard.writeText(texto);
        toast('Copiado. Pégalo en el otro dispositivo en el campo de detección automática.');
      } catch {
        box.querySelector('#sy-diagout').innerHTML =
          `<div class="card"><h3>Pásalo al otro dispositivo</h3>
           <p class="muted">Copia estas dos líneas y pégalas allí en "Detectar URL y clave".</p>
           <textarea rows="3" readonly onclick="this.select()">${esc(texto)}</textarea></div>`;
      }
    });

    box.querySelector('#sy-save')?.addEventListener('click', () => {
      const bruto = box.querySelector('#sy-url').value.trim();
      const limpia = S.normalizarUrl(bruto);
      S.setCfg({ url: limpia, anon: box.querySelector('#sy-anon').value.trim() });
      toast(limpia && limpia !== bruto.replace(/\/+$/, '')
        ? 'Conexión guardada (le he quitado lo que sobraba a la URL)'
        : 'Conexión guardada');
      pinta();
      box.querySelector('#sy-d1').open = true;
    });
    box.querySelector('#sy-copy')?.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(S.SQL_ESQUEMA); toast('SQL copiado'); }
      catch { box.querySelector('#sy-sql').select(); toast('Selecciona y copia manualmente'); }
    });
    const login = async (fn) => {
      const mail = box.querySelector('#sy-mail').value.trim();
      const pass = box.querySelector('#sy-pass').value;
      if (!mail || !pass) return toast('Correo y contraseña');
      try { await fn(mail, pass); toast('Sesión iniciada'); pinta(); }
      catch (e) { toast('Error: ' + e.message); }
    };
    box.querySelector('#sy-in')?.addEventListener('click', () => login(S.entrar));
    box.querySelector('#sy-up')?.addEventListener('click', () => login(S.registrar));
    box.querySelector('#sy-out')?.addEventListener('click', () => { S.salir(); toast('Sesión cerrada'); pinta(); });
    box.querySelector('#sy-auto')?.addEventListener('change', (e) => { S.setCfg({ auto: e.target.checked }); });
    box.querySelector('#sy-now')?.addEventListener('click', async () => {
      const log = box.querySelector('#sy-log');
      log.textContent = 'Sincronizando…';
      try {
        const r = await S.sincronizar({ onPaso: (p) => { log.textContent = p; } });
        log.innerHTML = `<b>Sincronizado.</b> ↓ ${r.aplicados} aplicados · ↑ ${r.subidos} subidos · ${r.borrados} borrados`
          + (r.conflictos ? ` · ${r.conflictos} conflictos resueltos a favor de este dispositivo` : '')
          + (r.omitidos.length ? `<br><span style="color:var(--amber)">Omitidos por tamaño: ${esc(r.omitidos.join(', '))}</span>` : '');
        setTimeout(pinta, 1800);
      } catch (e) { log.innerHTML = `<span style="color:var(--red)">${esc(e.message)}</span>`; }
    });
  };

  pinta();
}

function v404() {
  return el(`<div>${topbar('No encontrado')}<h1>No encontrado</h1>
    <p class="muted">Esa página no existe.</p><a class="btn" href="#/">Volver al inicio</a></div>`);
}

/* ================================ ROUTER ================================ */
async function route() {
  limpiarVista();
  const hash = location.hash.replace(/^#/, '') || '/';
  const [ruta, consulta = ''] = hash.split('?');
  const [, a, b, c] = ruta.split('/');
  const params = new URLSearchParams(consulta);
  setNav('/' + (a || ''), b);

  let out;
  try {
    if (!a) out = vHome();
    else if (a === 'emergencia') out = b === 'sanitaria' ? vSanitaria(c) : b ? vEmergencia(b) : vEmergenciaLista();
    else if (a === 'art') out = vArticulo(b);
    else if (a === 'sec') out = await vSeccion(b, c);
    else if (a === 'check') out = await vChecklist(b);
    else if (a === 'curso') out = await vCurso(b);
    else if (a === 'buscar') out = await vBuscar(params.get('q') || '');
    else if (a === 'mapa') {
      const { mapView } = await import('./maps.js');
      const wrap = el(`<div>${topbar('Mapa offline', 'Vectorial IGN + teselas descargadas')}</div>`);
      wrap.appendChild(await mapView());
      out = wrap;
    }
    else if (a === 'riesgos' && b === 'comparar') {
      const { compararView } = await import('./riesgos.js');
      const wrap = el(`<div>${topbar('Comparar ubicaciones', 'Tus ubicaciones', '#/sec/riesgos')}
        <h1>📊 COMPARAR UBICACIONES</h1></div>`);
      wrap.appendChild(await compararView());
      out = wrap;
    }
    else if (a === 'familia') {
      const F = await import('./familia.js');
      const sub = {
        rutas: ['Rutas offline', 'Tus rutas por situación', F.rutasView],
        ir: ['Quiero llegar a mi familia', 'Asistente de ruta', F.irView],
        mapa: ['Mapa familiar', 'Nodos y rutas offline', F.mapaFamiliarView],
        plan72: ['Plan familiar 72 h', 'Cálculo por ubicación', F.plan72View],
        reunion: ['Plan de reunificación', 'Puntos de encuentro', F.reunionView],
        offline: ['Si no hay Internet', 'Plan offline', F.offlineView],
      }[b];
      if (!sub) out = v404();
      else {
        const wrap = el(`<div>${topbar(sub[0], sub[1], '#/sec/familia')}</div>`);
        wrap.appendChild(await sub[2]());
        out = wrap;
      }
    }
    else out = v404();
  } catch (err) {
    console.error(err);
    out = el(`<div>${topbar('Error')}<h1>Error</h1><div class="blk-warn">${esc(err.message)}</div><a class="btn" href="#/">Inicio</a></div>`);
  }

  const emg = out && out.emg;
  const node = emg ? out.node : out;
  render(node, { emg: !!emg });
  store.setSetting('lastRoute', location.hash || '#/');
}

window.addEventListener('hashchange', route);
route();

/* ============================ SERVICE WORKER ============================ */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('SW:', e));
  });
}

/* ======================= SINCRONIZACIÓN (opcional) ======================= */
/* Se carga en diferido y solo si está configurada. Nunca bloquea el arranque
   ni interfiere con el funcionamiento offline. */
(async () => {
  try {
    if (!localStorage.getItem('survival.sync')) return;
    const S = await import('./sync.js');
    if (!S.cfg().auto) return;
    const lanzar = () => S.autoSync();
    if (navigator.onLine) setTimeout(lanzar, 1500);
    window.addEventListener('online', () => setTimeout(lanzar, 800));
  } catch (e) { console.warn('sync:', e); }
})();

window.addEventListener('sync:ok', (e) => {
  const d = e.detail;
  if (d && (d.aplicados || d.subidos || d.borrados)) {
    toast(`Sincronizado · ↓${d.aplicados} ↑${d.subidos}`);
  }
});
