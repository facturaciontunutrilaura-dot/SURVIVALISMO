/* =========================================================================
   noticias.js — NOTICIAS DE ÚLTIMA HORA
   Pide /api/noticias (función de Netlify, renovada cada 30 min), guarda la
   última copia para verla sin conexión y vuelve a pedirla cada 30 minutos
   mientras la pantalla está abierta. Solo titular, fuente, hora y enlace.
   ========================================================================= */
import { el, esc, alSalir } from './ui.js';
import * as store from './store.js';

const CADA = 30 * 60 * 1000;
const kv = async (id, def) => (await store.get('kv', id).catch(() => null))?.v ?? def;
const setKv = (id, v) => store.put('kv', { id, v }).catch(() => {});
const FILTROS = [['todo', 'Todo'], ['oficial', '🏛 Oficiales'], ['espana', '🇪🇸 España'], ['internacional', '🌍 Internacional']];

/** «hace 5 min», «hace 3 h», «ayer». */
export function haceCuanto(iso, ahora = Date.now()) {
  if (!iso) return '';
  const min = Math.round((ahora - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  return h < 48 ? 'ayer' : `hace ${Math.round(h / 24)} días`;
}

export async function noticiasView() {
  const n = el(`<div>
    <p class="muted">Noticias importantes de España y del mundo relacionadas con emergencias, catástrofes, conflictos y suministros. Se actualizan cada 30 minutos; sin conexión verás las últimas guardadas.</p>
    <div class="blk-note">Contrasta siempre con fuentes oficiales y no difundas bulos. Ante una emergencia, sigue las instrucciones del 112, Protección Civil y los avisos ES-Alert de tu móvil.</div>
    <div class="nt-barra">
      <p id="nt-estado" class="muted" role="status" aria-live="polite"></p>
      <button class="btn sm ghost" id="nt-act" type="button">↻ Actualizar</button>
    </div>
    <div class="ev-esc" role="group" aria-label="Filtrar noticias">${FILTROS.map(([k, t]) => `<button type="button" class="ev-chip" data-f="${k}" aria-pressed="${k === 'todo'}">${t}</button>`).join('')}</div>
    <div id="nt-lista"></div>
  </div>`);

  let datos = await kv('noticias.cache', null);
  let filtro = 'todo', cargando = false, error = null;

  function pintar() {
    const estado = n.querySelector('#nt-estado');
    const lista = n.querySelector('#nt-lista');
    const hora = datos?.generado ? new Date(datos.generado).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : null;
    estado.textContent = cargando ? 'Buscando noticias…'
      : error && hora ? `Sin conexión con el servidor de noticias. Mostrando las guardadas el ${hora}.`
      : error ? error
      : hora ? `Actualizado: ${hora}` : '';
    const todas = datos?.noticias || [];
    const vista = todas.filter((x) => filtro === 'todo' || (filtro === 'oficial' ? x.oficial : x.ambito === filtro));
    if (!todas.length) {
      lista.innerHTML = datos ? '<div class="card"><p>No hay noticias importantes sobre estos temas en las últimas 48 horas. Buena señal.</p></div>' : '';
      return;
    }
    lista.innerHTML = vista.length ? vista.map((x) => `<article class="nt-item${x.oficial ? ' oficial' : ''}">
        <p class="nt-meta"><span class="nt-tema"><span aria-hidden="true">${esc(x.ic)}</span> ${esc(x.temaT)}</span> · ${esc(x.fuente)}${x.oficial ? ' · <b>Oficial</b>' : ''} · ${esc(x.ambito === 'espana' ? 'España' : 'Internacional')}${x.fecha ? ` · <time datetime="${esc(x.fecha)}">${esc(haceCuanto(x.fecha))}</time>` : ''}</p>
        <h3><a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">${esc(x.t)}</a></h3>
        ${x.ruta ? `<a class="nt-ficha" href="${esc(x.ruta)}">Qué hacer: ficha de la app →</a>` : ''}
      </article>`).join('') : '<p class="muted">Ninguna noticia con este filtro.</p>';
  }

  async function actualizar() {
    if (cargando) return;
    cargando = true; error = null; pintar();
    try {
      const r = await fetch('./api/noticias', { cache: 'no-store' });
      if (r.status === 404) throw new Error('Las noticias aún no están disponibles en esta instalación: falta activar el servicio de noticias en el servidor.');
      if (!r.ok) throw new Error(`El servidor de noticias no responde (${r.status}).`);
      const j = await r.json();
      if (!Array.isArray(j?.noticias)) throw new Error('Respuesta de noticias no válida.');
      datos = j;
      setKv('noticias.cache', j);
    } catch (e) {
      error = navigator.onLine ? (e?.message || 'No se han podido cargar las noticias.') : 'Sin conexión.';
    } finally {
      cargando = false; pintar();
    }
  }

  n.addEventListener('click', (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.id === 'nt-act') return actualizar();
    if (b.dataset.f) {
      filtro = b.dataset.f;
      n.querySelectorAll('[data-f]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      pintar();
    }
  });

  // Cada 30 minutos mientras la pantalla esté abierta; se para al salir.
  const temporizador = setInterval(actualizar, CADA);
  alSalir(() => clearInterval(temporizador));
  // Al volver a la app tras un rato, se actualiza si la copia es vieja.
  const alVolver = () => { if (document.visibilityState === 'visible' && (!datos?.generado || Date.now() - new Date(datos.generado) > CADA)) actualizar(); };
  document.addEventListener('visibilitychange', alVolver);
  alSalir(() => document.removeEventListener('visibilitychange', alVolver));

  pintar();
  actualizar();
  return n;
}
