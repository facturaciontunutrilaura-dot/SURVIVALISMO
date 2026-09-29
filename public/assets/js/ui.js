/* =========================================================================
   ui.js — helpers de render (sin dependencias)
   ========================================================================= */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function esc(s = '') {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

/* Avisos breves. `toast(msg)` sigue funcionando como antes; con opciones:
     tipo   → 'ok' | 'error' | 'info' (icono y, si es error, role="alert")
     ms     → duración; por defecto depende de la longitud del texto
     accion → { t: 'Deshacer', fn } añade un botón (p. ej. deshacer un borrado)
   Solo hay un aviso a la vez. */
let toastTimer = null;
export function toast(msg, opts = {}) {
  if (typeof opts === 'number') opts = { ms: opts };
  const { tipo = 'info', accion = null } = opts;
  const ms = opts.ms ?? Math.min(8000, Math.max(accion ? 6000 : 3000, String(msg).length * 60, tipo === 'error' ? 6000 : 0));
  $('.toast')?.remove();
  clearTimeout(toastTimer);
  const ic = { ok: '✓', error: '⚠', info: '' }[tipo] || '';
  const n = el(`<div class="toast t-${tipo}" role="${tipo === 'error' ? 'alert' : 'status'}">
    ${ic ? `<span class="ic" aria-hidden="true">${ic}</span>` : ''}<span class="msg">${esc(msg)}</span>
    ${accion ? `<button type="button" class="toast-accion">${esc(accion.t)}</button>` : ''}
  </div>`);
  if (accion) {
    n.querySelector('.toast-accion').addEventListener('click', async () => {
      n.remove(); clearTimeout(toastTimer);
      try { await accion.fn(); } catch (e) { toast('No se pudo deshacer: ' + e.message, { tipo: 'error' }); }
    });
  }
  document.body.appendChild(n);
  toastTimer = setTimeout(() => n.remove(), ms);
  return n;
}

/** Borra y ofrece deshacer durante unos segundos, sin ventanas de
 *  confirmación. `borrar` y `restaurar` son async; `repintar` refresca la
 *  vista si sigue en pantalla. */
export async function borrarConDeshacer({ que, borrar, restaurar, repintar = () => {} }) {
  await borrar();
  repintar();
  toast(`${que} eliminado`, {
    tipo: 'ok',
    accion: { t: 'Deshacer', fn: async () => { await restaurar(); repintar(); toast(`${que} recuperado`, { tipo: 'ok' }); } },
  });
}

export function topbar(title, sub = '', backHref = '#/') {
  return `<header class="topbar">
    <a class="btn-ico" href="${backHref}" aria-label="Volver">←</a>
    <div class="title">${esc(title)}${sub ? `<small>${esc(sub)}</small>` : ''}</div>
    <a class="btn-ico" href="#/buscar" aria-label="Buscar">🔍</a>
  </header>`;
}

/* --------------------- Render de bloques de contenido --------------------- */
export function renderBlocks(body = [], tools = {}) {
  return body.map((b) => {
    if (b.h) return `<h3>${esc(b.h)}</h3>`;
    if (b.p) return `<p>${esc(b.p)}</p>`;
    if (b.warn) return `<div class="blk-warn">${esc(b.warn)}</div>`;
    if (b.note) return `<div class="blk-note">${esc(b.note)}</div>`;
    if (b.ok) return `<div class="blk-ok">${esc(b.ok)}</div>`;
    if (b.ul) return `<ul>${b.ul.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;
    if (b.ol) return `<ol>${b.ol.map((i) => `<li>${esc(i)}</li>`).join('')}</ol>`;
    if (b.kv) return `<div class="kv">${b.kv.map(([k, v]) => `<div>${esc(k)}</div><div>${esc(v)}</div>`).join('')}</div>`;
    if (b.card) return `<div class="qcard"><h4>${esc(b.card.t)}</h4><ol>${b.card.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ol></div>`;
    if (b.table) {
      return `<div class="tw"><table><thead><tr>${b.table.head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
      <tbody>${b.table.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    }
    if (b.tool) return `<div data-tool="${esc(b.tool)}"></div>`;
    if (b.check) return `<a class="btn ghost wide" href="#/check/${esc(b.check)}">☑ Abrir checklist</a><div class="sp"></div>`;
    return '';
  }).join('');
}

export function prBadge(pr, map) {
  const p = map[pr];
  return p ? `<span class="badge ${pr}">${p.ic} ${p.t}</span>` : '';
}

export function fmtBytes(n) {
  if (n == null) return '—';
  const u = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${u[i]}`;
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* ------------------------- Ciclo de vida de las vistas -------------------------
   Una vista que deja algo vivo fuera de su propio DOM (un mapa de Leaflet,
   sensores, temporizadores, wake lock, listeners en window) lo registra con
   alSalir(). El router ejecuta limpiarVista() antes de pintar la siguiente,
   así nada sigue consumiendo batería en segundo plano. */
const limpiezas = [];
export function alSalir(fn) { limpiezas.push(fn); }
export function limpiarVista() {
  while (limpiezas.length) {
    try { limpiezas.pop()(); } catch (e) { console.warn('limpieza de vista:', e); }
  }
}

export function confirmar(msg) {
  return window.confirm(msg);
}
