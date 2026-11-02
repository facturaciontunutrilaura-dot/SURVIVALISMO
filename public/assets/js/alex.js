/* =========================================================================
   alex.js — PREGÚNTALE A ALEX (pantalla de conversación)
   La conversación vive solo en la pantalla: no se guarda ni sale del móvil.
   ========================================================================= */
import { el, esc } from './ui.js';
import { crearAlex } from './alex-motor.js';
import { PRESENTACION, FUERA_DE_TEMA, AVISO_ALEX, CRISIS, SUGERENCIAS } from '../../data/content/alex.js';

let alex = null;   // el índice se prepara una vez por sesión

const avatar = '<img class="al-av" src="./assets/img/alex.png" alt="" width="36" height="36">';
const chips = (lista) => `<div class="al-sug">${lista.map((s) => `<button type="button" class="ev-chip" data-preg="${esc(s)}">${esc(s)}</button>`).join('')}</div>`;
const enlaces = (rel, t = 'También te puede servir') => rel?.length ? `<p class="al-rel-t">${t}</p><ul class="al-rel">${rel.map((r) => `<li><a href="${esc(r.ruta)}">${esc(r.t)}</a></li>`).join('')}</ul>` : '';

/** HTML de la respuesta de Alex. */
export function pintarRespuesta(r) {
  if (r.tipo === 'saludo') return `<p>${esc(PRESENTACION)}</p>${chips(r.sugerencias)}`;
  if (r.tipo === 'gracias') return '<p>Para eso estoy. Si pasa algo más, cuéntamelo.</p>';
  if (r.tipo === 'fuera') return `<p>${esc(FUERA_DE_TEMA)}</p>${chips(r.sugerencias)}`;
  if (r.tipo === 'sin-contenido') return `<p>${esc(r.intro)}</p>${enlaces(r.relacionados, '')}`;
  if (r.tipo === 'crisis') {
    return `<p>${esc(r.intro)}</p>
      ${CRISIS.map((c) => `<a class="btn-112 al-tel" href="tel:${c.tel}" aria-label="Llamar al ${c.tel}, ${esc(c.t)}"><span class="ic" aria-hidden="true">📞</span><span class="tx"><b>${c.tel} · ${esc(c.t)}</b><small>${esc(c.d)}</small></span></a>`).join('')}
      ${enlaces(r.relacionados, 'Mientras tanto, puede ayudarte')}`;
  }
  return `
    ${r.urgente ? `<div class="al-urg"><p><b>Lo primero: llama al 112.</b> Después sigue estos pasos.</p>
      <a class="btn-112 compacto" href="tel:112" aria-label="Llamar al 112, teléfono de emergencias"><span class="ic" aria-hidden="true">📞</span><span class="tx"><b>Llamar al 112</b></span></a></div>` : ''}
    ${r.duda ? '<p class="muted">Creo que te refieres a esto:</p>' : ''}
    ${r.intro ? `<p class="al-intro">${esc(r.intro)}</p>` : ''}
    <h3>${esc(r.titulo)}</h3>
    ${r.resumen ? `<p>${esc(r.resumen)}</p>` : ''}
    ${r.pasos?.length ? `<ol class="steps">${r.pasos.map((p) => `<li>${esc(p)}</li>`).join('')}</ol>` : ''}
    ${r.pendiente ? '<div class="blk-warn">Esta ficha está pendiente de revisión profesional: síguela como orientación y prioriza siempre las indicaciones del 112.</div>' : ''}
    <a class="btn sm" href="${esc(r.ruta)}">${esc(r.mas || 'Abrir')} →</a>
    ${enlaces(r.relacionados)}`;
}

export function alexView() {
  alex = alex || crearAlex();
  const n = el(`<div class="alex">
    <div id="al-log" class="al-log" role="log" aria-live="polite" aria-label="Conversación con Alex"></div>
    <form id="al-form" class="al-form" autocomplete="off">
      <label class="sr-only" for="al-q">Tu pregunta para Alex</label>
      <input id="al-q" type="text" maxlength="300" placeholder="Cuéntale a Alex qué pasa…" enterkeyhint="send">
      <button class="btn" type="submit">Enviar</button>
    </form>
    <p class="muted al-aviso">${esc(AVISO_ALEX)}</p>
  </div>`);
  const log = n.querySelector('#al-log'), input = n.querySelector('#al-q');

  function mensaje(html, de, desplazar = true) {
    const m = el(`<div class="al-msg ${de}">${de === 'alex' ? avatar : ''}<div class="al-bur">${html}</div></div>`);
    log.appendChild(m);
    if (desplazar) m.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
  function preguntar(q) {
    q = String(q || '').trim();
    if (!q) return;
    mensaje(`<p>${esc(q)}</p>`, 'yo');
    mensaje(pintarRespuesta(alex.responder(q)), 'alex');
  }

  n.querySelector('#al-form').addEventListener('submit', (ev) => { ev.preventDefault(); preguntar(input.value); input.value = ''; input.focus(); });
  n.addEventListener('click', (ev) => { const b = ev.target.closest('[data-preg]'); if (b) preguntar(b.dataset.preg); });

  mensaje(`<p>${esc(PRESENTACION)}</p>${chips(SUGERENCIAS)}`, 'alex', false);
  return n;
}
