/* =========================================================================
   compra-calc.js — cálculo de la compra de colapso
   Módulo PURO (sin DOM ni almacenamiento): lo usan la pantalla y las
   pruebas unitarias.
   ========================================================================= */
import { ACTIVIDAD, ALTURA_DEF, AGUA, ALIMENTOS, GRUPOS } from '../../data/content/compra.js';

const num = (v) => { const x = Number(String(v ?? '').replace(',', '.')); return Number.isFinite(x) && x > 0 ? x : 0; };

/** Necesidades diarias de una persona: energía (kcal), proteína (g) y agua (l).
 *  Energía: metabolismo basal de Mifflin-St Jeor × factor de actividad,
 *  salvo que se indiquen las kcal a mano (p. ej. pautadas por su nutricionista). */
export function necesidades(p) {
  const peso = num(p.peso) || 70;
  const edad = num(p.edad) || 30;
  const altura = num(p.altura) || ALTURA_DEF[p.sexo === 'm' ? 'm' : 'h'];
  const act = ACTIVIDAD[p.actividad] || ACTIVIDAD.moderada;
  const basal = 10 * peso + 6.25 * altura - 5 * edad + (p.sexo === 'm' ? -161 : 5);
  const kcal = num(p.kcal) || Math.round((basal * act.f) / 50) * 50;
  const prot = Math.round(peso * (p.actividad === 'alta' ? 1.4 : 1.2));
  const bebida = Math.min(AGUA.maxBebida, Math.max(AGUA.minBebida, (peso * AGUA.mlKg) / 1000));
  return { kcal, prot, agua: Math.round((bebida + AGUA.extra) * 10) / 10, basal: Math.round(basal), manual: !!num(p.kcal) };
}

/** Lista de compra completa para el hogar y los días indicados. */
export function calcularCompra(hogar, dias) {
  const personas = hogar.map((p) => ({ ...p, ...necesidades(p) }));
  const n = personas.length;
  const kcalDia = personas.reduce((s, p) => s + p.kcal, 0);
  const protDia = personas.reduce((s, p) => s + p.prot, 0);
  const aguaDia = personas.reduce((s, p) => s + p.agua, 0);
  const kcalTotal = kcalDia * dias;
  const alimentos = ALIMENTOS.map((a) => ({ ...a, n: Math.max(1, Math.ceil((kcalTotal * a.parte) / a.kcal)) }));
  const kcalCompra = alimentos.reduce((s, a) => s + a.n * a.kcal, 0);
  const protCompra = alimentos.reduce((s, a) => s + a.n * a.prot, 0);
  const aguaL = Math.ceil(aguaDia * dias * AGUA.margen);
  const muj = personas.filter((p) => p.sexo === 'm' && num(p.edad) >= 12 && num(p.edad) <= 55).length;
  const grupos = GRUPOS.map((g) => ({
    ...g,
    items: g.items.map((it) => ({ ...it, c: it.cant(n, dias, muj) })).filter((it) => it.c != null),
  }));
  return {
    personas, dias, kcalDia, protDia, aguaDia: Math.round(aguaDia * 10) / 10,
    aguaL, garrafas: Math.ceil(aguaL / AGUA.garrafa),
    alimentos, kcalCompra, protCompra, grupos,
    cubreKcal: kcalCompra >= kcalTotal,
    cubreProt: protCompra >= protDia * dias,
  };
}
