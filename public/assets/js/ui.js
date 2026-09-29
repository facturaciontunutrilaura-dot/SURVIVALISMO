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

export function toast(msg, ms = 2600) {
  const prev = $('.toast');
  if (prev) prev.remove();
  const n = el(`<div class="toast" role="status">${esc(msg)}</div>`);
  document.body.appendChild(n);
  setTimeout(() => n.remove(), ms);
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

export function confirmar(msg) {
  return window.confirm(msg);
}
