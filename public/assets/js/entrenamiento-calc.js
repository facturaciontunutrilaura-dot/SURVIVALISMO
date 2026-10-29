/* =========================================================================
   entrenamiento-calc.js — lógica del entrenamiento en casa
   Módulo PURO (sin DOM ni almacenamiento): lo usan la pantalla y las
   pruebas unitarias.
   ========================================================================= */
import { NIVELES, PATRONES, SESIONES, PLANES } from '../../data/content/entrenamiento.js';

export const nivelDe = (n) => NIVELES[Math.min(5, Math.max(1, n | 0)) - 1];

/** Ejercicio concreto de un patrón para un nivel, con su dosis. */
export function prescripcion(nivel, patron, offset = 0, material = false) {
  const nv = nivelDe(nivel), p = PATRONES[patron];
  const e = p.escalera[Math.max(0, nv.n - 1 + offset)];
  return {
    patron, t: material && e.con ? e.con : e.t, como: material && e.con ? '' : e.como, clave: e.clave,
    series: nv.series, objetivo: p.tiempo ? `${nv.seg} s` : `${nv.reps} repeticiones`, seg: p.tiempo ? nv.seg : 0, descanso: nv.descanso,
  };
}

/** Sesiones de un plan de `dias` días, con sus ejercicios ya prescritos. */
export function plan(dias, nivel, material = false) {
  const pl = PLANES[dias] || PLANES[3];
  return pl.sesiones.map((id, i) => ({
    i, id, t: SESIONES[id].t, circuito: !!SESIONES[id].circuito,
    ejercicios: SESIONES[id].ejercicios.map(([pt, off = 0]) => prescripcion(nivel, pt, off, material)),
  }));
}

/** Semana ISO (lunes a domingo) de una fecha, como «2026-W44». */
export function semanaISO(fecha) {
  const d = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
  const dia = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dia);
  const ini = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return `${d.getUTCFullYear()}-W${String(Math.ceil(((d - ini) / 864e5 + 1) / 7)).padStart(2, '0')}`;
}
const semanaAnterior = (fecha) => { const d = new Date(fecha); d.setDate(d.getDate() - 7); return d; };

/**
 * Progreso: sesiones de esta semana, siguiente sesión del plan, racha de
 * semanas cumplidas y sugerencia de cambio de nivel.
 */
export function resumen(historial, { nivel, dias }, hoy = new Date()) {
  const objetivo = (PLANES[dias] || PLANES[3]).sesiones.length;
  const porSemana = new Map();
  for (const h of historial) { const k = semanaISO(new Date(h.fecha)); porSemana.set(k, (porSemana.get(k) || 0) + 1); }
  const estaSemana = historial.filter((h) => semanaISO(new Date(h.fecha)) === semanaISO(hoy));
  const hechasIdx = new Set(estaSemana.filter((h) => h.dias === dias).map((h) => h.idx));
  let siguiente = -1;
  for (let i = 0; i < objetivo; i++) if (!hechasIdx.has(i)) { siguiente = i; break; }

  // Racha: semanas seguidas con el objetivo cumplido. La semana en curso solo
  // cuenta si ya está cumplida (si no, aún se puede cumplir y no rompe la racha).
  let racha = 0, d = new Date(hoy);
  if ((porSemana.get(semanaISO(d)) || 0) >= objetivo) racha++;
  d = semanaAnterior(d);
  while ((porSemana.get(semanaISO(d)) || 0) >= objetivo) { racha++; d = semanaAnterior(d); }

  // Sugerencia con las últimas sesiones del nivel actual.
  const nv = nivelDe(nivel);
  const delNivel = historial.filter((h) => h.nivel === nv.n).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const ok = (h) => h.total && h.hechas / h.total >= 0.9;
  let sugerencia = null;
  if (nv.n < 5 && delNivel.length >= 3 && delNivel.slice(0, 3).every((h) => ok(h) && h.rpe && h.rpe < nv.rpe[0])) sugerencia = 'subir';
  else if (nv.n > 1 && delNivel.length >= 2 && delNivel.slice(0, 2).every((h) => (h.total && h.hechas / h.total < 0.6) || h.rpe >= 10)) sugerencia = 'bajar';

  return { objetivo, hechas: estaSemana.length, hechasIdx, siguiente, racha, total: historial.length, sugerencia };
}
