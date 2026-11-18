/* =========================================================================
   simulacros.js — SIMULACROS CON DECISIONES
   Una escena, tres opciones; al elegir, la app explica si fue buena idea y
   por qué. Al final, la puntuación. Se guarda tu mejor resultado.
   ========================================================================= */
import { el, esc } from './ui.js';
import * as store from './store.js';
import { SIMULACROS } from '../../data/content/simulacros.js';

const CLAVE = 'simulacros.resultados';
const kv = async (id, def) => (await store.get('kv', id).catch(() => null))?.v ?? def;

/** Puntuación máxima de un simulacro. */
export const maximo = (s) => s.escenas.reduce((a, e) => a + Math.max(...e.opciones.map((o) => o.p)), 0);

/** Mensaje final según el porcentaje. */
export function veredicto(pts, max) {
  const r = max ? pts / max : 0;
  if (r >= 0.9) return { ic: '🏆', t: '¡Excelente! Sabrías qué hacer.' };
  if (r >= 0.6) return { ic: '👍', t: 'Bien, con algún punto que mejorar.' };
  return { ic: '📚', t: 'Toca repasar: vuelve a intentarlo después de leer el protocolo.' };
}

export async function simulacrosView(id) {
  const n = el('<div class="simulacro"></div>');
  const res = await kv(CLAVE, {});

  function lista() {
    n.innerHTML = `<p class="lead">Pequeñas historias: eliges qué harías y te explico si fue buena idea y por qué. Se aprende mucho más que leyendo, y es ideal para practicar en familia.</p>
      <div class="list">${SIMULACROS.map((s) => {
        const r = res[s.id];
        return `<a class="row" href="#/sec/simulacros/${s.id}"><span class="ric" aria-hidden="true">${s.ic}</span>
          <div class="rt"><b>${esc(s.t)}</b><span>${esc(s.desc)}${s.ninos ? ' · 🧒 para niños' : ''}${r ? ` · Mejor: ${r.mejor}/${maximo(s)}` : ''}</span></div><span class="chev" aria-hidden="true">›</span></a>`;
      }).join('')}</div>`;
  }

  function jugar(s) {
    let i = 0, pts = 0;
    const max = maximo(s);
    const escena = () => {
      const e = s.escenas[i];
      n.innerHTML = `<p class="muted">${s.ic} ${esc(s.t)} · Escena ${i + 1} de ${s.escenas.length} · ${pts} puntos</p>
        <div class="progress" aria-hidden="true"><i style="width:${Math.round((i / s.escenas.length) * 100)}%"></i></div>
        <div class="card sim-escena"><p class="sim-texto" id="sim-q">${esc(e.texto)}</p><p class="sim-pregunta">¿Qué haces?</p></div>
        <div class="sim-ops" role="group" aria-labelledby="sim-q">${e.opciones.map((o, k) => `<button type="button" class="sim-op" data-op="${k}">${esc(o.t)}</button>`).join('')}</div>
        <div id="sim-fb" aria-live="polite"></div>`;
      n.querySelectorAll('[data-op]').forEach((b) => b.addEventListener('click', () => {
        const o = e.opciones[Number(b.dataset.op)];
        const mejor = Math.max(...e.opciones.map((x) => x.p));
        pts += o.p;
        n.querySelectorAll('[data-op]').forEach((x) => {
          x.disabled = true;
          const ox = e.opciones[Number(x.dataset.op)];
          if (ox.p === mejor) x.classList.add('buena');
          if (x === b) x.classList.add('elegida', o.p === mejor ? 'ok' : o.p ? 'regular' : 'mal');
        });
        const tipo = o.p === mejor ? ['ok', '✅ Buena decisión'] : o.p ? ['regular', '🟡 Se puede mejorar'] : ['mal', '❌ Peligroso'];
        const fb = n.querySelector('#sim-fb');
        fb.innerHTML = `<div class="card sim-fb ${tipo[0]}"><h3>${tipo[1]}</h3><p>${esc(o.exp)}</p>
          ${o.p !== mejor ? `<p class="muted"><b>Lo mejor:</b> ${esc(e.opciones.find((x) => x.p === mejor).t)}</p>` : ''}
          <button class="btn" type="button" id="sim-sig">${i + 1 < s.escenas.length ? 'Siguiente →' : 'Ver resultado'}</button></div>`;
        const sig = fb.querySelector('#sim-sig');
        sig.focus();
        sig.addEventListener('click', () => { i++; if (i < s.escenas.length) { escena(); window.scrollTo(0, 0); } else final(); });
      }));
    };
    const final = async () => {
      const v = veredicto(pts, max);
      const antes = res[s.id];
      res[s.id] = { mejor: Math.max(pts, antes?.mejor || 0), ultima: pts, ts: Date.now() };
      await store.put('kv', { id: CLAVE, v: res }).catch(() => {});
      n.innerHTML = `<div class="card sim-final"><p class="sim-ic" aria-hidden="true">${v.ic}</p>
        <h2>${pts} de ${max} puntos</h2><p class="lead">${esc(v.t)}</p>
        ${antes && pts > antes.mejor ? '<p>🎉 ¡Has mejorado tu récord!</p>' : ''}
        <div class="btnrow"><button class="btn" type="button" id="sim-otra">🔁 Repetir</button><a class="btn ghost" href="#/emergencia/${esc(s.emg)}">Leer el protocolo</a><a class="btn ghost" href="#/sec/simulacros">Otros simulacros</a></div></div>`;
      n.querySelector('#sim-otra').addEventListener('click', () => jugar(s));
      window.scrollTo(0, 0);
    };
    escena();
  }

  const s = SIMULACROS.find((x) => x.id === id);
  if (s) jugar(s); else lista();
  return n;
}
