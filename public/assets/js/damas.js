/* =========================================================================
   damas.js — Lógica de las DAMAS ESPAÑOLAS (sin interfaz)
   Reglas:
   · Tablero de 8×8; se juega en las casillas oscuras. Blancas abajo, empiezan.
   · El peón avanza y captura solo hacia delante, en diagonal.
   · La dama se mueve y captura a cualquier distancia en diagonal («vuela»).
   · Capturar es obligatorio y hay que elegir la jugada que capture MÁS piezas.
   · Las piezas capturadas se retiran al final de la jugada: no se pueden
     saltar dos veces y bloquean el paso mientras tanto.
   · El peón corona si TERMINA la jugada en la última fila.
   · Pierde quien no puede mover. Tablas: 50 jugadas sin capturas ni avances
     de peón.
   Casillas: índice 0–63 (fila*8+col). Piezas: 'w' 'W' (blancas, peón/dama),
   'b' 'B' (negras), null vacía.
   ========================================================================= */

export const oscura = (i) => ((i >> 3) + (i & 7)) % 2 === 1;
export const bando = (p) => (p ? p.toLowerCase() : null);
const esDama = (p) => p === 'W' || p === 'B';
const rival = (c) => (c === 'w' ? 'b' : 'w');
const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const dentro = (f, c) => f >= 0 && f < 8 && c >= 0 && c < 8;

export function inicial() {
  const t = Array(64).fill(null);
  for (let i = 0; i < 64; i++) {
    if (!oscura(i)) continue;
    const f = i >> 3;
    if (f < 3) t[i] = 'b';
    else if (f > 4) t[i] = 'w';
  }
  return t;
}

/** Direcciones de avance de un peón. */
const adelante = (c) => (c === 'w' ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]]);

/** Todas las secuencias de captura desde `de` (recursivo). */
function capturasDesde(t, de, pieza, origen, caps, camino, out) {
  const c = bando(pieza);
  const f0 = de >> 3, c0 = de & 7;
  let alguna = false;
  const dirs = esDama(pieza) ? DIAG : adelante(c);
  for (const [df, dc] of dirs) {
    let f = f0 + df, k = c0 + dc;
    if (esDama(pieza)) {
      // Avanza por casillas vacías (la de origen cuenta como vacía).
      while (dentro(f, k) && (t[f * 8 + k] === null || f * 8 + k === origen)) { f += df; k += dc; }
    }
    if (!dentro(f, k)) continue;
    const medio = f * 8 + k;
    if (bando(t[medio]) !== rival(c) || caps.includes(medio)) continue;
    // Casillas de aterrizaje: la siguiente (peón) o cualquiera libre detrás (dama).
    let lf = f + df, lk = k + dc;
    while (dentro(lf, lk) && (t[lf * 8 + lk] === null || lf * 8 + lk === origen)) {
      const a = lf * 8 + lk;
      alguna = true;
      capturasDesde(t, a, pieza, origen, [...caps, medio], [...camino, a], out);
      if (!esDama(pieza)) break;
      lf += df; lk += dc;
    }
  }
  if (!alguna && caps.length) out.push({ de: origen, a: de, camino, caps });
}

/** Jugadas legales del bando `c` (con la captura máxima obligatoria). */
export function jugadas(t, c) {
  const caps = [];
  for (let i = 0; i < 64; i++) if (bando(t[i]) === c) capturasDesde(t, i, t[i], i, [], [], caps);
  if (caps.length) {
    const max = Math.max(...caps.map((m) => m.caps.length));
    // Una misma jugada puede aparecer por dos caminos: se queda una.
    const vistas = new Set();
    return caps.filter((m) => m.caps.length === max).filter((m) => {
      const k = `${m.de}-${m.a}-${[...m.caps].sort((x, y) => x - y).join(',')}`;
      if (vistas.has(k)) return false;
      vistas.add(k); return true;
    });
  }
  const simples = [];
  for (let i = 0; i < 64; i++) {
    const p = t[i];
    if (bando(p) !== c) continue;
    const dirs = esDama(p) ? DIAG : adelante(c);
    for (const [df, dc] of dirs) {
      let f = (i >> 3) + df, k = (i & 7) + dc;
      while (dentro(f, k) && t[f * 8 + k] === null) {
        simples.push({ de: i, a: f * 8 + k, camino: [f * 8 + k], caps: [] });
        if (!esDama(p)) break;
        f += df; k += dc;
      }
    }
  }
  return simples;
}

/** Aplica una jugada y devuelve el tablero nuevo (no modifica el original). */
export function aplicar(t, m) {
  const n = t.slice();
  let p = n[m.de];
  n[m.de] = null;
  for (const x of m.caps) n[x] = null;
  const fila = m.a >> 3;
  if (p === 'w' && fila === 0) p = 'W';
  if (p === 'b' && fila === 7) p = 'B';
  n[m.a] = p;
  return n;
}

/** Valoración para la IA, desde el punto de vista de las negras. */
function valorar(t) {
  let v = 0;
  for (let i = 0; i < 64; i++) {
    const p = t[i];
    if (!p) continue;
    const f = i >> 3;
    const val = esDama(p) ? 3.2 : 1 + (p === 'b' ? f : 7 - f) * 0.04;
    v += bando(p) === 'b' ? val : -val;
  }
  return v;
}

function minimax(t, c, prof, alfa, beta) {
  const js = jugadas(t, c);
  if (!js.length) return c === 'b' ? -1000 - prof : 1000 + prof;
  if (prof === 0) return valorar(t);
  if (c === 'b') {
    let mejor = -Infinity;
    for (const m of js) {
      mejor = Math.max(mejor, minimax(aplicar(t, m), 'w', prof - 1, alfa, beta));
      alfa = Math.max(alfa, mejor);
      if (alfa >= beta) break;
    }
    return mejor;
  }
  let peor = Infinity;
  for (const m of js) {
    peor = Math.min(peor, minimax(aplicar(t, m), 'b', prof - 1, alfa, beta));
    beta = Math.min(beta, peor);
    if (alfa >= beta) break;
  }
  return peor;
}

/** Jugada de la máquina (negras). nivel: 'facil' | 'normal'. */
export function jugadaIA(t, nivel = 'normal', azar = Math.random) {
  const js = jugadas(t, 'b');
  if (!js.length) return null;
  if (nivel === 'facil' && azar() < 0.5) return js[Math.floor(azar() * js.length)];
  const prof = nivel === 'facil' ? 1 : 4;
  let mejor = -Infinity, elegidas = [];
  for (const m of js) {
    const v = minimax(aplicar(t, m), 'w', prof - 1, -Infinity, Infinity);
    if (v > mejor + 1e-9) { mejor = v; elegidas = [m]; } else if (Math.abs(v - mejor) < 1e-9) elegidas.push(m);
  }
  return elegidas[Math.floor(azar() * elegidas.length)];
}

export const cuenta = (t, c) => t.filter((p) => bando(p) === c).length;
