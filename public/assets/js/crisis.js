/* =========================================================================
   crisis.js — MODO CRISIS GUIADO (pantalla y avisos)
   Eliges lo que está pasando y la app te lleva paso a paso: casillas,
   temporizadores y el diario apuntándose solo. Se adapta a tu plan.
   Todo se guarda solo en este móvil (kv 'crisis.activa' y el diario).
   Los temporizadores avisan mientras la app está abierta (también al
   volver a ella): un navegador no puede despertar una web cerrada.
   ========================================================================= */
import { el, esc, toast, alSalir } from './ui.js';
import * as store from './store.js';
import { CRISIS, NOTAS_RAPIDAS } from '../../data/content/crisis.js';
import * as C from './crisis-core.js';

const CLAVE = 'crisis.activa';
const kv = async (id, def) => (await store.get('kv', id).catch(() => null))?.v ?? def;
const setKv = (id, v) => store.put('kv', { id, v });
const hora = (ts) => new Date(ts).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

/** Apunta una línea en el diario de Herramientas SOS (el mismo de siempre). */
export async function apuntarDiario(t) {
  const notas = await kv('diario.emergencia', []);
  await setKv('diario.emergencia', [...notas, { ts: Date.now(), t: String(t).slice(0, 500) }].slice(-500));
}

/* ------------------------------ Avisos ------------------------------ */
function pitido() {
  try {
    const A = window.AudioContext || window.webkitAudioContext;
    if (!A) return;
    const a = new A(), o = a.createOscillator(), g = a.createGain();
    o.frequency.value = 880; o.connect(g); g.connect(a.destination);
    g.gain.setValueAtTime(0.2, a.currentTime); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.8);
    o.start(); o.stop(a.currentTime + 0.8); o.onended = () => a.close();
  } catch { /* sin audio */ }
}
async function notificar(texto) {
  try {
    if ('Notification' in window && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
      const reg = await navigator.serviceWorker?.getRegistration();
      if (reg) { await reg.showNotification('⏰ Modo crisis', { body: texto, tag: 'crisis', icon: './icons/icon-192.png' }); return; }
    }
  } catch { /* se avisa en pantalla */ }
}

let reloj = null, comprobar = null;
/** Comprueba los temporizadores cada 20 s mientras haya una crisis activa. */
export function vigilarCrisis() {
  if (reloj) { comprobar?.(); return; }
  comprobar = async () => {
    const e = await kv(CLAVE, null);
    if (!e) { clearInterval(reloj); reloj = null; return; }
    const v = C.timersVencidos(e);
    if (!v.length) return;
    await setKv(CLAVE, C.avisados(e, v.map((x) => x.id)));
    for (const x of v) {
      toast(`⏰ ${x.aviso}`, { tipo: 'error', ms: 15000 });
      await apuntarDiario(`⏰ ${x.aviso}`);
      notificar(x.aviso);
    }
    pitido();
    try { navigator.vibrate?.([300, 150, 300]); } catch { /* sin vibración */ }
    window.dispatchEvent(new CustomEvent('crisis:aviso'));
  };
  reloj = setInterval(comprobar, 20000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && reloj) comprobar(); });
  comprobar();
}

/** Franja en la portada si hay una crisis en marcha. */
export async function montarAvisoCrisis(caja) {
  const e = await kv(CLAVE, null);
  const c = e && C.CRISIS_MAP[e.id];
  if (!c || !caja.isConnected) return;
  const prox = (e.timers || []).filter((x) => !x.avisado).sort((a, b) => a.fin - b.fin)[0];
  caja.className = 'home-crisis';
  caja.innerHTML = `<a href="#/sec/modo-crisis"><span aria-hidden="true">${c.ic}</span>
    <span><b>Modo crisis: ${esc(c.t)}</b><small>Desde las ${hora(e.inicio)}${prox ? (prox.fin <= Date.now() ? ' · <b>tienes un aviso</b>' : ` · próximo aviso en ${C.falta(prox.fin - Date.now())}`) : ''} · Continuar ›</small></span></a>`;
  caja.hidden = false;
  vigilarCrisis();
}

/* ------------------------------ Pantalla ------------------------------ */
export async function crisisView() {
  const perfil = await kv('miplan.perfil', null);
  const n = el('<div class="crisis"></div>');
  let tic = null;
  alSalir(() => clearInterval(tic));
  const repintar = () => pintar().catch((e) => { n.innerHTML = `<div class="blk-warn">No se ha podido cargar: ${esc(e.message)}</div>`; });
  const alAviso = () => repintar();
  window.addEventListener('crisis:aviso', alAviso);
  alSalir(() => window.removeEventListener('crisis:aviso', alAviso));

  async function pintar() {
    clearInterval(tic);
    const e = await kv(CLAVE, null);
    if (!e || !C.CRISIS_MAP[e.id]) return elegir();
    const c = C.pasosCrisis(e.id, perfil);
    activa(c, e);
    tic = setInterval(() => {
      for (const s of n.querySelectorAll('[data-fin]')) s.textContent = C.falta(Number(s.dataset.fin) - Date.now());
    }, 30000);
  }

  function elegir() {
    n.innerHTML = `<p class="lead">¿Qué está pasando? Elige y te llevo paso a paso: casillas que vas marcando, avisos con temporizador y el diario apuntándose solo.</p>
      ${perfil ? '<p class="muted">Se adapta a tu plan: añade los pasos de tu hogar.</p>' : '<p class="muted">Consejo: <a href="#/sec/mi-plan">haz tu plan a medida</a> y añadiré los pasos de tu hogar (bebé, medicación, mascotas…).</p>'}
      <div class="cr-elegir">${CRISIS.map((c) => `<button type="button" class="cr-op" data-empezar="${c.id}"><span class="ic" aria-hidden="true">${c.ic}</span><b>${esc(c.t)}</b></button>`).join('')}</div>
      <div class="blk-warn">Si hay riesgo para la vida, llama primero al 112. Sigue siempre las indicaciones de las autoridades.</div>
      <a class="btn-112 compacto" href="tel:112" aria-label="Llamar al 112"><span class="ic" aria-hidden="true">📞</span><span class="tx"><b>Llamar al 112</b></span></a>`;
    n.querySelectorAll('[data-empezar]').forEach((b) => b.addEventListener('click', async () => {
      const c = C.CRISIS_MAP[b.dataset.empezar];
      try {
        await setKv(CLAVE, C.nuevaCrisis(c.id));
        await apuntarDiario(`🚨 Empieza: ${c.t}`);
      } catch { toast('No se puede guardar en este móvil: sigue los pasos igualmente', { tipo: 'error' }); }
      vigilarCrisis();
      repintar();
      window.scrollTo(0, 0);
    }));
  }

  function activa(c, e) {
    const pr = C.progresoCrisis(c, e);
    const timers = (e.timers || []).filter((x) => !x.avisado).sort((a, b) => a.fin - b.fin);
    const caja = (p) => {
      const on = !!e.hechos[p.id];
      return `<li><button type="button" class="chk-main cr-paso" data-paso="${esc(p.id)}" aria-pressed="${on}">
        <span class="chk-box" aria-hidden="true"></span>
        <span class="lbl">${esc(p.t)}${p.timer ? ` <small class="cr-t">⏱ aviso en ${C.falta(p.timer.min * 60000)}</small>` : ''}</span></button></li>`;
    };
    n.innerHTML = `<div class="cr-cab card">
        <h2><span aria-hidden="true">${c.ic}</span> ${esc(c.t)}</h2>
        <p class="muted">Desde las ${hora(e.inicio)} · ${pr.n} de ${pr.total} pasos</p>
        <div class="progress" aria-hidden="true"><i style="width:${Math.round((pr.n / pr.total) * 100)}%"></i></div>
        <div class="btnrow"><a class="btn sm ghost" href="tel:112">📞 112</a><a class="btn sm ghost" href="#/emergencia/${esc(c.emg)}">Protocolo completo</a><a class="btn sm ghost" href="#/sec/herramientas/mensajes">💬 «Estoy bien»</a></div>
      </div>
      ${timers.length ? `<div class="card cr-timers" aria-live="polite"><h3>⏱ Próximos avisos</h3><ul>${timers.map((x) => `<li><span>${esc(x.t)}</span> <b>en <span data-fin="${x.fin}">${C.falta(x.fin - Date.now())}</span></b> <button type="button" class="btn sm ghost" data-quitar="${esc(x.id)}" aria-label="Quitar el aviso de ${esc(x.t)}">✕</button></li>`).join('')}</ul>
        <p class="muted">Suena mientras la app esté abierta (o al volver a ella). Deja la pantalla con poco brillo en vez de cerrarla.</p></div>` : ''}
      ${c.fases.map((f) => `<section class="cr-fase${f.propio ? ' propio' : ''}"><h3>${f.propio ? '👨‍👩‍👧 ' : ''}${esc(f.t)}</h3><ul class="cr-lista">${f.pasos.map(caja).join('')}</ul></section>`).join('')}
      <section class="card"><h3>📝 Diario</h3>
        <p class="muted">Cada paso que marcas se apunta solo con la hora. Añade lo que quieras:</p>
        <div class="dr-rapidos">${NOTAS_RAPIDAS.map((t) => `<button type="button" class="ev-chip" data-nota="${esc(t)}">${esc(t)}</button>`).join('')}</div>
        <label for="cr-nota">Nota</label><textarea id="cr-nota" rows="2" placeholder="Qué ha pasado, quién, dónde…"></textarea>
        <div class="btnrow"><button class="btn sm" type="button" id="cr-apuntar">➕ Apuntar</button><a class="btn sm ghost" href="#/sec/herramientas/diario">Ver el diario</a></div>
      </section>
      <button class="btn ghost wide" type="button" id="cr-fin">🏁 Ha pasado: terminar el modo crisis</button>`;

    const pasos = Object.fromEntries(C.todosLosPasos(c).map((p) => [p.id, p]));
    n.querySelectorAll('[data-paso]').forEach((b) => b.addEventListener('click', async () => {
      const p = pasos[b.dataset.paso];
      const actual = await kv(CLAVE, e);
      const on = !actual.hechos[p.id];
      await setKv(CLAVE, C.marcarPaso(actual, p, on)).catch(() => {});
      if (on) { await apuntarDiario(`✓ ${p.t}`).catch(() => {}); if (p.timer) toast(`Te aviso en ${C.falta(p.timer.min * 60000)}`, { tipo: 'ok' }); }
      await repintar();
      n.querySelector(`[data-paso="${CSS.escape(p.id)}"]`)?.focus();
    }));
    n.querySelectorAll('[data-quitar]').forEach((b) => b.addEventListener('click', async () => {
      const actual = await kv(CLAVE, e);
      await setKv(CLAVE, { ...actual, timers: actual.timers.filter((x) => x.id !== b.dataset.quitar) });
      repintar();
    }));
    const apuntar = async (t) => { t = String(t || '').trim(); if (!t) return; await apuntarDiario(t).then(() => toast('Apuntado en el diario', { tipo: 'ok' })).catch(() => toast('No se ha podido guardar', { tipo: 'error' })); };
    n.querySelectorAll('[data-nota]').forEach((b) => b.addEventListener('click', () => apuntar(b.dataset.nota)));
    n.querySelector('#cr-apuntar').addEventListener('click', async () => { const a = n.querySelector('#cr-nota'); await apuntar(a.value); a.value = ''; });
    n.querySelector('#cr-fin').addEventListener('click', async () => {
      const dur = C.falta(Date.now() - e.inicio);
      await apuntarDiario(`🏁 Termina: ${c.t} (duró ${dur})`).catch(() => {});
      await store.del('kv', CLAVE).catch(() => {});
      toast('Modo crisis terminado. Todo queda en el diario.', { tipo: 'ok' });
      repintar();
    });
  }

  await pintar();
  return n;
}
