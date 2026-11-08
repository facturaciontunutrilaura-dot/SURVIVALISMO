/* =========================================================================
   efectivo-core.js — MI EFECTIVO: cálculos (sin pantalla, se prueban solos)
   Todo en CÉNTIMOS (enteros) para no arrastrar errores de decimales.
   Modelo guardado en kv 'efectivo.datos':
     { bolsillos: [{ id, t, base, baseTs, conteo }],
       movs: [{ id, ts, tipo: 'gasto'|'ingreso', imp, cat, bol, nota }],
       presupuesto: céntimos al día o null, discreto: bool }
   El saldo de un bolsillo es lo último que se contó (base) más lo que ha
   entrado y menos lo que ha salido DESPUÉS de ese recuento: al volver a
   contar, el recuento manda.
   ========================================================================= */

/** Billetes y monedas de euro, en céntimos. */
export const BILLETES = [50000, 20000, 10000, 5000, 2000, 1000, 500];
export const MONEDAS = [200, 100, 50, 20, 10, 5, 2, 1];

export const CATEGORIAS = [
  { id: 'comida', t: 'Comida', ic: '🥫' },
  { id: 'agua', t: 'Agua', ic: '💧' },
  { id: 'combustible', t: 'Combustible', ic: '⛽' },
  { id: 'farmacia', t: 'Farmacia', ic: '💊' },
  { id: 'transporte', t: 'Transporte', ic: '🚌' },
  { id: 'otros', t: 'Otros', ic: '📦' },
];
export const CAT_INGRESO = { id: 'ingreso', t: 'Entrada de dinero', ic: '➕' };

export const BOLSILLOS_INICIALES = [
  { id: 'casa', t: 'Casa' }, { id: 'cartera', t: 'Cartera' }, { id: 'mochila', t: 'Mochila de emergencia' },
];

export function datosIniciales() {
  return { bolsillos: BOLSILLOS_INICIALES.map((b) => ({ ...b, base: 0, baseTs: 0, conteo: {} })), movs: [], presupuesto: null, discreto: false };
}

/** «12,5», «12.50», «1.234,56», «7 €» → céntimos (o null si no es un importe válido). */
export function aCentimos(txt) {
  let s = String(txt ?? '').replace(/[€\s]/g, '');
  if (!s) return null;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  if (!/^\d+(\.\d{0,2})?$/.test(s)) return null;
  const c = Math.round(parseFloat(s) * 100);
  return c > 0 ? c : null;
}

/** Céntimos → «1.234,50 €». */
export function euros(c) {
  const v = (Math.abs(c || 0) / 100).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true });
  // Algunos motores no agrupan los miles de 4 cifras en español: se fuerza.
  const [ent, dec] = v.split(',');
  const ent2 = ent.replace(/\./g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${c < 0 ? '−' : ''}${ent2},${dec} €`;
}

/** Suma de un recuento { '5000': 2, '100': 3 } en céntimos. */
export function totalConteo(conteo = {}) {
  return Object.entries(conteo).reduce((s, [d, n]) => s + Number(d) * Math.max(0, Math.floor(Number(n) || 0)), 0);
}

export function saldoBolsillo(b, movs = []) {
  return movs.reduce((s, m) => (m.bol === b.id && m.ts > (b.baseTs || 0) ? s + (m.tipo === 'ingreso' ? m.imp : -m.imp) : s), b.base || 0);
}

export const saldoTotal = (d) => d.bolsillos.reduce((s, b) => s + saldoBolsillo(b, d.movs), 0);

const DIA = 86400000;
const inicioDia = (t) => { const x = new Date(t); x.setHours(0, 0, 0, 0); return x.getTime(); };

/** Lo gastado hoy (desde las 0:00 de la hora local). */
export function gastadoHoy(movs = [], ahora = Date.now()) {
  const desde = inicioDia(ahora);
  return movs.reduce((s, m) => (m.tipo === 'gasto' && m.ts >= desde && m.ts <= ahora ? s + m.imp : s), 0);
}

/**
 * Gasto medio al día de los últimos 7 días. Si hace menos de 7 días que se
 * apunta, se divide por los días que lleva (mínimo 1), para no dar una
 * media falsamente baja. null si no hay gastos.
 */
export function gastoDiario(movs = [], ahora = Date.now()) {
  const desde = ahora - 7 * DIA;
  const g = movs.filter((m) => m.tipo === 'gasto' && m.ts > desde && m.ts <= ahora);
  if (!g.length) return null;
  const primero = Math.min(...movs.map((m) => m.ts));
  const dias = Math.min(7, Math.max(1, Math.ceil((ahora - Math.max(primero, desde)) / DIA)));
  return Math.round(g.reduce((s, m) => s + m.imp, 0) / dias);
}

/** Días que dura el saldo al ritmo de gasto (o del presupuesto si no hay gastos). */
export function diasQueDura(saldo, gastoDia) {
  if (!gastoDia || gastoDia <= 0 || saldo <= 0) return null;
  return Math.floor(saldo / gastoDia);
}

/** Total por categoría (solo gastos), de mayor a menor. */
export function porCategoria(movs = []) {
  const t = {};
  for (const m of movs) if (m.tipo === 'gasto') t[m.cat] = (t[m.cat] || 0) + m.imp;
  return Object.entries(t).sort((a, b) => b[1] - a[1]);
}
