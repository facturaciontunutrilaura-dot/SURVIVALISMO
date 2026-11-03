/* =========================================================================
   sudoku.js — Generador y comprobador de sudokus (sin interfaz)
   Cada sudoku generado tiene UNA sola solución. Tablero: array de 81
   números (0 = vacía).
   ========================================================================= */

export const NIVELES = {
  facil: { t: 'Fácil', pistas: 40 },
  medio: { t: 'Medio', pistas: 32 },
  dificil: { t: 'Difícil', pistas: 27 },
};

/** ¿Se puede poner n en la casilla i? */
export function cabe(t, i, n) {
  const f = Math.floor(i / 9), c = i % 9;
  const bf = f - (f % 3), bc = c - (c % 3);
  for (let k = 0; k < 9; k++) {
    if (t[f * 9 + k] === n || t[k * 9 + c] === n) return false;
    if (t[(bf + Math.floor(k / 3)) * 9 + bc + (k % 3)] === n) return false;
  }
  return true;
}

function barajar(a, azar) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(azar() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** Rellena el tablero (en el sitio). Devuelve true si lo consigue. */
function rellenar(t, azar) {
  const i = t.indexOf(0);
  if (i < 0) return true;
  for (const n of barajar([1, 2, 3, 4, 5, 6, 7, 8, 9], azar)) {
    if (cabe(t, i, n)) {
      t[i] = n;
      if (rellenar(t, azar)) return true;
      t[i] = 0;
    }
  }
  return false;
}

/** Número de soluciones (deja de contar al llegar a `tope`). */
export function soluciones(t, tope = 2) {
  const a = t.slice();
  let total = 0;
  const rec = () => {
    // La casilla con menos opciones primero: mucho más rápido.
    let mejor = -1, opciones = null;
    for (let i = 0; i < 81; i++) {
      if (a[i]) continue;
      const op = [];
      for (let n = 1; n <= 9; n++) if (cabe(a, i, n)) op.push(n);
      if (!op.length) return;
      if (!opciones || op.length < opciones.length) { mejor = i; opciones = op; if (op.length === 1) break; }
    }
    if (mejor < 0) { total++; return; }
    for (const n of opciones) {
      a[mejor] = n;
      rec();
      if (total >= tope) return;
    }
    a[mejor] = 0;
  };
  rec();
  return total;
}

/** { puzle, solucion } con solución única. */
export function generar(nivel = 'facil', azar = Math.random) {
  const sol = Array(81).fill(0);
  rellenar(sol, azar);
  const puzle = sol.slice();
  const objetivo = NIVELES[nivel]?.pistas ?? 40;
  let pistas = 81;
  for (const i of barajar([...Array(81).keys()], azar)) {
    if (pistas <= objetivo) break;
    const antes = puzle[i];
    puzle[i] = 0;
    if (soluciones(puzle, 2) !== 1) puzle[i] = antes;
    else pistas--;
  }
  return { puzle, solucion: sol };
}

/** Casillas rellenadas por el jugador que no coinciden con la solución. */
export const errores = (actual, solucion) => actual.map((v, i) => (v && v !== solucion[i] ? i : -1)).filter((i) => i >= 0);
export const completo = (actual, solucion) => actual.every((v, i) => v === solucion[i]);
