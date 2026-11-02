/* =========================================================================
   entrenamiento.js — ENTRENAMIENTO EN CASA
   Configuración (nivel, días, material), plan de la semana, sesión guiada
   con temporizador de descanso y progreso guardado en el dispositivo.
   ========================================================================= */
import { el, esc, toast, alSalir, uid } from './ui.js';
import * as store from './store.js';
import { NIVELES, PLANES, RPE, CALENTAMIENTO, VUELTA_CALMA, FINAL_EXTREMO, ANTES_DE_EMPEZAR } from '../../data/content/entrenamiento.js';
import { plan, resumen, nivelDe } from './entrenamiento-calc.js';

const kv = async (id, def) => (await store.get('kv', id).catch(() => null))?.v ?? def;
const setKv = (id, v) => store.put('kv', { id, v }).catch(() => {});
const MAX_HISTORIAL = 1000;

export async function entrenamientoView() {
  const n = el('<div></div>');
  let cfg = { nivel: 1, dias: 3, material: false, ...(await kv('entreno.config', {})) };
  let historial = await kv('entreno.historial', []);
  if (!Array.isArray(historial)) historial = [];
  const avisoVisto = await kv('entreno.aviso', false);

  /* Temporizador único (descanso o ejercicio por tiempo). Se para al salir. */
  let reloj = null;
  const parar = () => { if (reloj) { clearInterval(reloj.id); reloj = null; } const b = n.querySelector('#en-reloj'); if (b) b.hidden = true; };
  alSalir(parar);
  function cuenta(seg, texto) {
    parar();
    const barra = n.querySelector('#en-reloj');
    if (!barra) return;
    let resto = seg;
    const pinta = () => { barra.querySelector('b').textContent = `${texto}: ${resto} s`; };
    barra.hidden = false; pinta();
    reloj = { id: setInterval(() => {
      resto--;
      if (resto <= 0) {
        parar();
        n.querySelector('#en-aviso').textContent = `${texto}: terminado.`;
        try { navigator.vibrate?.([200, 100, 200]); } catch { /* sin vibración */ }
        return;
      }
      pinta();
    }, 1000) };
  }

  /* ------------------------------ Portada ------------------------------ */
  function inicio() {
    parar();
    const r = resumen(historial, cfg);
    const sesiones = plan(cfg.dias, cfg.nivel, cfg.material);
    const nv = nivelDe(cfg.nivel);
    const ultimas = [...historial].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 8);
    const sesionT = (h) => plan(h.dias, h.nivel, h.material)[h.idx]?.t || h.sesion;
    n.innerHTML = `
      <p class="muted">Sin material o con muy poco (una silla, una mochila, garrafas de agua). Fuerza y resistencia útiles en una emergencia: cargar, caminar, levantarse del suelo.</p>
      <details class="card" id="en-antes"${avisoVisto ? '' : ' open'}><summary>Antes de empezar</summary><div>
        <ul>${ANTES_DE_EMPEZAR.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
        ${avisoVisto ? '' : '<button class="btn sm" id="en-leido" type="button">Entendido</button>'}
      </div></details>
      <div class="card">
        <h2>Tu plan</h2>
        <h3>Nivel</h3>
        <div class="en-opc" role="group" aria-label="Nivel de intensidad">${NIVELES.map((x) => `<button type="button" class="en-op" data-nivel="${x.n}" aria-pressed="${x.n === nv.n}"><b>${x.n}. ${esc(x.t)}</b><small>${esc(x.d)}</small></button>`).join('')}</div>
        <h3>Días por semana</h3>
        <div class="btnrow" role="group" aria-label="Días por semana">${[2, 3, 4, 5].map((d) => `<button type="button" class="btn sm${d === cfg.dias ? '' : ' ghost'}" data-dias="${d}" aria-pressed="${d === cfg.dias}">${d} días</button>`).join('')}</div>
        <h3>Material</h3>
        <div class="btnrow" role="group" aria-label="Material">
          <button type="button" class="btn sm${cfg.material ? ' ghost' : ''}" data-material="0" aria-pressed="${!cfg.material}">Sin material</button>
          <button type="button" class="btn sm${cfg.material ? '' : ' ghost'}" data-material="1" aria-pressed="${cfg.material}">Con poco material</button>
        </div>
        <p class="muted">${esc(PLANES[cfg.dias].reparto)} Nivel ${nv.n}: ${nv.series} series, descanso de ${nv.descanso} s.</p>
      </div>
      ${r.sugerencia === 'subir' ? `<div class="blk-ok">Tus tres últimas sesiones de este nivel te han resultado fáciles y las has completado. <button class="btn sm" type="button" data-nivel="${nv.n + 1}">Subir al nivel ${nv.n + 1}</button></div>` : ''}
      ${r.sugerencia === 'bajar' ? `<div class="blk-note">Las últimas sesiones han sido demasiado duras. Bajar un nivel unas semanas también es progresar. <button class="btn sm ghost" type="button" data-nivel="${nv.n - 1}">Bajar al nivel ${nv.n - 1}</button></div>` : ''}
      <div class="card">
        <h2>Esta semana</h2>
        <div class="en-barra" role="progressbar" aria-label="Sesiones de esta semana" aria-valuemin="0" aria-valuemax="${r.objetivo}" aria-valuenow="${Math.min(r.hechas, r.objetivo)}"><i style="width:${Math.min(100, (r.hechas / r.objetivo) * 100)}%"></i></div>
        <p id="en-semana"><b>${r.hechas} de ${r.objetivo}</b> sesiones · racha: <b>${r.racha}</b> ${r.racha === 1 ? 'semana' : 'semanas'} cumplidas · <b>${r.total}</b> en total</p>
        ${sesiones.map((s) => `<div class="en-sesion${r.hechasIdx.has(s.i) ? ' hecha' : ''}${s.i === r.siguiente ? ' siguiente' : ''}">
          <div><b>Día ${s.i + 1} · ${esc(s.t)}</b>${r.hechasIdx.has(s.i) ? ' <span class="en-ok">✓ hecha</span>' : s.i === r.siguiente ? ' <span class="en-sig">la siguiente</span>' : ''}
          <small>${s.ejercicios.map((e) => esc(e.t)).join(' · ')}</small></div>
          <button class="btn sm${s.i === r.siguiente ? '' : ' ghost'}" type="button" data-empezar="${s.i}">Empezar</button>
        </div>`).join('')}
      </div>
      <div class="card">
        <h2>Historial</h2>
        ${ultimas.length ? `<ul class="en-hist">${ultimas.map((h) => `<li><b>${esc(new Date(h.fecha).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }))}</b> · ${esc(sesionT(h))} · nivel ${h.nivel} · ${h.hechas}/${h.total} series · esfuerzo ${h.rpe}/10</li>`).join('')}</ul>` : '<p class="muted">Todavía no has guardado ninguna sesión.</p>'}
      </div>`;
  }

  /* ------------------------------- Sesión ------------------------------- */
  function sesion(i) {
    const s = plan(cfg.dias, cfg.nivel, cfg.material)[i];
    const nv = nivelDe(cfg.nivel);
    const series = (e, k) => Array.from({ length: e.series }, (_, j) => `<button type="button" class="en-serie" data-serie="${k}-${j}" aria-pressed="false" aria-label="${esc(e.t)}: serie ${j + 1} de ${e.series}">${j + 1}</button>`).join('');
    n.innerHTML = `
      <div class="card">
        <h2 tabindex="-1">Día ${s.i + 1} · ${esc(s.t)}</h2>
        <p class="muted">Nivel ${nv.n} (${esc(nv.t)}) · ${s.circuito ? `En circuito: un ejercicio tras otro y descanso de ${nv.descanso} s al terminar cada vuelta.` : `Descanso de ${nv.descanso} s entre series.`} Marca cada serie al terminarla.</p>
        <h3>Calentamiento · 4 min</h3>
        <ul>${CALENTAMIENTO.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      </div>
      ${s.ejercicios.map((e, k) => `<div class="card en-ej">
        <h3>${k + 1}. ${esc(e.t)}</h3>
        <p><b>${e.series} × ${esc(e.objetivo)}</b></p>
        ${e.como ? `<p>${esc(e.como)}</p>` : ''}
        <p class="muted">${esc(e.clave)}</p>
        <div class="en-series" role="group" aria-label="Series de ${esc(e.t)}">${series(e, k)}</div>
        ${e.seg ? `<button class="btn sm ghost" type="button" data-cronometro="${e.seg}">⏱ Cronómetro ${e.seg} s</button>` : ''}
      </div>`).join('')}
      ${nv.n === 5 ? `<div class="card en-ej"><h3>Final del nivel extremo</h3><p>${esc(FINAL_EXTREMO)}</p>
        <div class="en-series"><button type="button" class="en-serie" data-serie="final-0" aria-pressed="false" aria-label="Final hecho">✓</button></div></div>` : ''}
      <div class="card">
        <h3>Vuelta a la calma · 3 min</h3>
        <ul>${VUELTA_CALMA.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
        <h3>¿Cómo de duro ha sido?</h3>
        <div class="btnrow" role="group" aria-label="Esfuerzo percibido">${RPE.map(([v, t]) => `<button type="button" class="btn sm ghost" data-rpe="${v}" aria-pressed="false">${v} · ${esc(t)}</button>`).join('')}</div>
        <p id="en-hechas" class="muted" aria-live="polite"></p>
        <div class="btnrow">
          <button class="btn" id="en-guardar" type="button" data-i="${s.i}">✓ Terminar y guardar</button>
          <button class="btn ghost" id="en-salir" type="button">Salir sin guardar</button>
        </div>
      </div>
      <div class="en-reloj" id="en-reloj" hidden><b></b> <button class="btn sm ghost" type="button" id="en-saltar">Saltar</button></div>
      <p class="sr-only" id="en-aviso" aria-live="assertive"></p>`;
    contar();
    n.querySelector('h2').focus();
    window.scrollTo(0, 0);
  }

  function contar() {
    const t = n.querySelectorAll('.en-serie').length, h = n.querySelectorAll('.en-serie[aria-pressed="true"]').length;
    const out = n.querySelector('#en-hechas');
    if (out) out.textContent = `Series hechas: ${h} de ${t}.`;
    return { hechas: h, total: t };
  }

  /* ------------------------------ Eventos ------------------------------ */
  n.addEventListener('click', (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    const guardarCfg = () => { setKv('entreno.config', cfg); inicio(); };
    if (b.dataset.nivel) { cfg = { ...cfg, nivel: +b.dataset.nivel }; return guardarCfg(); }
    if (b.dataset.dias) { cfg = { ...cfg, dias: +b.dataset.dias }; return guardarCfg(); }
    if (b.dataset.material) { cfg = { ...cfg, material: b.dataset.material === '1' }; return guardarCfg(); }
    if (b.id === 'en-leido') { setKv('entreno.aviso', true); n.querySelector('#en-antes').open = false; b.remove(); return; }
    if (b.dataset.empezar != null) return sesion(+b.dataset.empezar);
    if (b.dataset.serie) {
      const si = b.getAttribute('aria-pressed') !== 'true';
      b.setAttribute('aria-pressed', String(si));
      contar();
      if (si && !b.dataset.serie.startsWith('final')) cuenta(nivelDe(cfg.nivel).descanso, 'Descanso');
      return;
    }
    if (b.dataset.cronometro) return cuenta(+b.dataset.cronometro, 'Ejercicio');
    if (b.id === 'en-saltar') return parar();
    if (b.dataset.rpe) { n.querySelectorAll('[data-rpe]').forEach((x) => { const si = x === b; x.setAttribute('aria-pressed', String(si)); x.classList.toggle('ghost', !si); }); return; }
    if (b.id === 'en-salir') return inicio();
    if (b.id === 'en-guardar') {
      const rpe = +(n.querySelector('[data-rpe][aria-pressed="true"]')?.dataset.rpe || 0);
      if (!rpe) { toast('Indica cómo de duro ha sido antes de guardar'); n.querySelector('[data-rpe]').focus(); return; }
      const { hechas, total } = contar();
      const i = +b.dataset.i;
      historial = [...historial, { id: uid(), fecha: new Date().toISOString(), idx: i, sesion: PLANES[cfg.dias].sesiones[i], nivel: cfg.nivel, dias: cfg.dias, material: cfg.material, hechas, total, rpe }].slice(-MAX_HISTORIAL);
      setKv('entreno.historial', historial);
      toast('Sesión guardada', { tipo: 'ok' });
      inicio();
      n.querySelector('#en-semana')?.scrollIntoView({ block: 'center' });
    }
  });

  inicio();
  return n;
}
