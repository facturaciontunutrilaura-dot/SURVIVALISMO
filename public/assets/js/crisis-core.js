/* =========================================================================
   crisis-core.js — MODO CRISIS GUIADO (lógica sin pantalla, se prueba sola)
   Estado guardado en kv 'crisis.activa':
     { id, inicio, hechos: { pasoId: ts }, timers: [{ id, t, aviso, fin, avisado }] }
   ========================================================================= */
import { CRISIS, EXTRAS } from '../../data/content/crisis.js';
import { normalizarPerfil } from './plan-core.js';

export const CRISIS_MAP = Object.fromEntries(CRISIS.map((c) => [c.id, c]));

/** Fases de una crisis con los pasos añadidos por tu plan (fase «Para tu hogar»). */
export function pasosCrisis(id, perfil) {
  const c = CRISIS_MAP[id];
  if (!c) return null;
  const fases = c.fases.map((f) => ({ t: f.t, pasos: [...f.pasos] }));
  if (perfil) {
    const p = normalizarPerfil(perfil);
    const extra = EXTRAS.filter((e) => e.si(p) && (!e.crisis || e.crisis.includes(id))).flatMap((e) => e.pasos);
    if (extra.length) fases.push({ t: 'Para tu hogar', propio: true, pasos: extra });
  }
  return { ...c, fases };
}

export const todosLosPasos = (c) => c.fases.flatMap((f) => f.pasos);

/** Estado nuevo al empezar una crisis. */
export const nuevaCrisis = (id, ahora = Date.now()) => ({ id, inicio: ahora, hechos: {}, timers: [] });

/** Marca o desmarca un paso; si tiene temporizador y se marca, lo arranca. */
export function marcarPaso(estado, paso, on, ahora = Date.now()) {
  const hechos = { ...estado.hechos };
  let timers = estado.timers.filter((x) => x.id !== paso.id);
  if (on) {
    hechos[paso.id] = ahora;
    if (paso.timer) timers = [...timers, { id: paso.id, t: paso.t, aviso: paso.timer.aviso, fin: ahora + paso.timer.min * 60000, avisado: false }];
  } else delete hechos[paso.id];
  return { ...estado, hechos, timers };
}

/** Temporizadores cumplidos y aún sin avisar. */
export const timersVencidos = (estado, ahora = Date.now()) => (estado?.timers || []).filter((x) => !x.avisado && x.fin <= ahora);

/** Marca como avisados y, si el paso lo pide, lo reprograma (se repite). */
export function avisados(estado, ids) {
  return { ...estado, timers: estado.timers.map((x) => (ids.includes(x.id) ? { ...x, avisado: true } : x)) };
}

/** Vuelve a arrancar un temporizador (botón «Otra vez»). */
export function repetirTimer(estado, paso, ahora = Date.now()) {
  return marcarPaso(estado, paso, true, ahora);
}

/** «1 h 20 min», «5 min», «ya». */
export function falta(ms) {
  if (ms <= 0) return 'ya';
  const m = Math.ceil(ms / 60000);
  const h = Math.floor(m / 60), r = m % 60;
  return h ? `${h} h${r ? ` ${r} min` : ''}` : `${m} min`;
}

/** Progreso: pasos marcados / total. */
export function progresoCrisis(c, estado) {
  const ps = todosLosPasos(c);
  const n = ps.filter((p) => estado?.hechos?.[p.id]).length;
  return { n, total: ps.length };
}
