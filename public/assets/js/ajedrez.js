/* =========================================================================
   ajedrez.js — reglas completas del ajedrez y rival de la app
   ---------------------------------------------------------------------------
   Módulo PURO (sin DOM ni almacenamiento): lo usan la pantalla de Juegos, el
   Web Worker del rival (ajedrez-ia.js) y las pruebas unitarias en Node.

   Tablero: array de 64 casillas, índice 0 = a8 … 63 = h1 (fila 0 = rango 8).
   Piezas: letras FEN (PNBRQK blancas, pnbrqk negras), '' = vacía.
   Reglas: movimientos legales, enroque (sin pasar por casillas atacadas),
   captura al paso, promoción, jaque, jaque mate, rey ahogado y tablas por
   material insuficiente, regla de 50 movimientos y triple repetición.
   Validado con los recuentos «perft» de referencia (pruebas unitarias).
   ========================================================================= */

export const INICIAL = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export const nombre = (i) => 'abcdefgh'[i & 7] + (8 - (i >> 3));
export const casilla = (s) => (8 - Number(s[1])) * 8 + 'abcdefgh'.indexOf(s[0]);
export const colorDe = (p) => (p ? (p === p.toUpperCase() ? 'w' : 'b') : null);
const rival = (t) => (t === 'w' ? 'b' : 'w');

export function desdeFEN(fen) {
  const [pos, turno = 'w', enroques = '-', ep = '-', medio = '0', total = '1'] = fen.trim().split(/\s+/);
  const b = [];
  for (const fila of pos.split('/')) for (const ch of fila) {
    if (/\d/.test(ch)) for (let k = 0; k < Number(ch); k++) b.push('');
    else b.push(ch);
  }
  if (b.length !== 64) throw new Error('FEN no válido');
  return { b, turno, enroques: enroques === '-' ? '' : enroques, ep: ep === '-' ? -1 : casilla(ep), medio: Number(medio) || 0, total: Number(total) || 1, historial: [] };
}

export function aFEN(e) {
  let s = '';
  for (let r = 0; r < 8; r++) {
    let vacias = 0;
    for (let c = 0; c < 8; c++) {
      const p = e.b[r * 8 + c];
      if (!p) { vacias++; continue; }
      if (vacias) { s += vacias; vacias = 0; }
      s += p;
    }
    if (vacias) s += vacias;
    if (r < 7) s += '/';
  }
  return `${s} ${e.turno} ${e.enroques || '-'} ${e.ep >= 0 ? nombre(e.ep) : '-'} ${e.medio} ${e.total}`;
}

/* Clave de la posición para la triple repetición (sin contadores). */
const clave = (e) => `${e.b.join(',')}|${e.turno}|${e.enroques}|${e.ep}`;

/* ------------------------------ Ataques ------------------------------ */
const SALTOS_N = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const SALTOS_K = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const RECTAS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

/** ¿Ataca el bando `por` a la casilla i? */
export function atacada(b, i, por) {
  const r = i >> 3, c = i & 7;
  const pz = (t) => (por === 'w' ? t.toUpperCase() : t);
  const dr = por === 'w' ? 1 : -1;   // un peón blanco ataca desde la fila de abajo
  for (const dc of [-1, 1]) {
    const rr = r + dr, cc = c + dc;
    if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === pz('p')) return true;
  }
  for (const [a, d] of SALTOS_N) {
    const rr = r + a, cc = c + d;
    if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === pz('n')) return true;
  }
  for (const [a, d] of SALTOS_K) {
    const rr = r + a, cc = c + d;
    if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === pz('k')) return true;
  }
  for (const [dirs, t1] of [[DIAG, 'b'], [RECTAS, 'r']]) {
    for (const [a, d] of dirs) {
      let rr = r + a, cc = c + d;
      while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
        const p = b[rr * 8 + cc];
        if (p) { if (p === pz(t1) || p === pz('q')) return true; break; }
        rr += a; cc += d;
      }
    }
  }
  return false;
}

const rey = (b, t) => b.indexOf(t === 'w' ? 'K' : 'k');
export const enJaque = (e, t = e.turno) => atacada(e.b, rey(e.b, t), rival(t));

/* ------------------------- Movimientos ------------------------- */
function pseudo(e) {
  const { b, turno } = e, out = [];
  const mia = (p) => colorDe(p) === turno;
  const enemiga = (p) => p && colorDe(p) !== turno;
  const mete = (de, a, promo) => {
    const captura = !!b[a];
    if (promo) for (const pp of ['q', 'r', 'b', 'n']) out.push({ de, a, promo: pp, captura });
    else out.push({ de, a, captura });
  };
  for (let i = 0; i < 64; i++) {
    const p = b[i];
    if (!p || !mia(p)) continue;
    const r = i >> 3, c = i & 7, t = p.toLowerCase();
    if (t === 'p') {
      const dir = turno === 'w' ? -1 : 1, ini = turno === 'w' ? 6 : 1, ult = turno === 'w' ? 0 : 7;
      const r1 = r + dir;
      if (r1 < 0 || r1 > 7) continue;
      const f = r1 * 8 + c;
      if (!b[f]) {
        mete(i, f, r1 === ult);
        const f2 = (r + 2 * dir) * 8 + c;
        if (r === ini && !b[f2]) out.push({ de: i, a: f2, doble: true, captura: false });
      }
      for (const dc of [-1, 1]) {
        const cc = c + dc;
        if (cc < 0 || cc > 7) continue;
        const f3 = r1 * 8 + cc;
        if (enemiga(b[f3])) mete(i, f3, r1 === ult);
        else if (f3 === e.ep) out.push({ de: i, a: f3, alPaso: true, captura: true });
      }
    } else if (t === 'n' || t === 'k') {
      for (const [a, d] of t === 'n' ? SALTOS_N : SALTOS_K) {
        const rr = r + a, cc = c + d;
        if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue;
        const f = rr * 8 + cc;
        if (!b[f] || enemiga(b[f])) mete(i, f);
      }
      if (t === 'k') {
        const op = rival(turno), en = e.enroques;
        if (turno === 'w' && i === 60) {
          if (en.includes('K') && !b[61] && !b[62] && b[63] === 'R' && !atacada(b, 60, op) && !atacada(b, 61, op) && !atacada(b, 62, op)) out.push({ de: 60, a: 62, enroque: 'K', captura: false });
          if (en.includes('Q') && !b[59] && !b[58] && !b[57] && b[56] === 'R' && !atacada(b, 60, op) && !atacada(b, 59, op) && !atacada(b, 58, op)) out.push({ de: 60, a: 58, enroque: 'Q', captura: false });
        }
        if (turno === 'b' && i === 4) {
          if (en.includes('k') && !b[5] && !b[6] && b[7] === 'r' && !atacada(b, 4, op) && !atacada(b, 5, op) && !atacada(b, 6, op)) out.push({ de: 4, a: 6, enroque: 'k', captura: false });
          if (en.includes('q') && !b[3] && !b[2] && !b[1] && b[0] === 'r' && !atacada(b, 4, op) && !atacada(b, 3, op) && !atacada(b, 2, op)) out.push({ de: 4, a: 2, enroque: 'q', captura: false });
        }
      }
    } else {
      const dirs = t === 'b' ? DIAG : t === 'r' ? RECTAS : [...DIAG, ...RECTAS];
      for (const [a, d] of dirs) {
        let rr = r + a, cc = c + d;
        while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
          const f = rr * 8 + cc;
          if (!b[f]) mete(i, f);
          else { if (enemiga(b[f])) mete(i, f); break; }
          rr += a; cc += d;
        }
      }
    }
  }
  return out;
}

/** Aplica una jugada y devuelve la posición nueva (no modifica la anterior).
 *  `rapido` omite el historial de repetición (lo usa la búsqueda del rival). */
export function aplicar(e, m, rapido = false) {
  const b = e.b.slice();
  const p = b[m.de], blanco = e.turno === 'w';
  let capturada = b[m.a];
  b[m.a] = m.promo ? (blanco ? m.promo.toUpperCase() : m.promo) : p;
  b[m.de] = '';
  if (m.alPaso) { const ci = m.a + (blanco ? 8 : -8); capturada = b[ci]; b[ci] = ''; }
  if (m.enroque === 'K') { b[61] = 'R'; b[63] = ''; }
  if (m.enroque === 'Q') { b[59] = 'R'; b[56] = ''; }
  if (m.enroque === 'k') { b[5] = 'r'; b[7] = ''; }
  if (m.enroque === 'q') { b[3] = 'r'; b[0] = ''; }
  let en = e.enroques;
  if (p === 'K') en = en.replace(/[KQ]/g, '');
  if (p === 'k') en = en.replace(/[kq]/g, '');
  for (const [sq, letra] of [[63, 'K'], [56, 'Q'], [7, 'k'], [0, 'q']]) if (m.de === sq || m.a === sq) en = en.replace(letra, '');
  return {
    b,
    turno: rival(e.turno),
    enroques: en,
    ep: m.doble ? (m.de + m.a) / 2 : -1,
    medio: p.toLowerCase() === 'p' || capturada ? 0 : e.medio + 1,
    total: e.total + (e.turno === 'b' ? 1 : 0),
    historial: rapido ? e.historial : [...e.historial, clave(e)],
  };
}

/** Jugadas legales del bando al que le toca. */
export function jugadas(e) {
  return pseudo(e).filter((m) => !enJaque(aplicar(e, m, true), e.turno));
}

function materialInsuficiente(b) {
  const resto = [];
  b.forEach((p, i) => { if (p && p.toLowerCase() !== 'k') resto.push([p.toLowerCase(), i]); });
  if (!resto.length) return true;
  if (resto.length === 1 && (resto[0][0] === 'b' || resto[0][0] === 'n')) return true;
  // Solo alfiles, todos en casillas del mismo color.
  if (resto.every(([t]) => t === 'b')) {
    const tono = (i) => ((i >> 3) + (i & 7)) % 2;
    return resto.every(([, i]) => tono(i) === tono(resto[0][1]));
  }
  return false;
}

/** Estado de la partida para el bando al que le toca:
 *  'jugando' | 'jaque' | 'mate' | 'ahogado' | 'material' | 'cincuenta' | 'repeticion'. */
export function estado(e) {
  const legales = jugadas(e);
  const jaque = enJaque(e);
  if (!legales.length) return jaque ? 'mate' : 'ahogado';
  if (materialInsuficiente(e.b)) return 'material';
  if (e.medio >= 100) return 'cincuenta';
  const k = clave(e);
  if (e.historial.filter((h) => h === k).length >= 2) return 'repeticion';
  return jaque ? 'jaque' : 'jugando';
}

export const PIEZAS = { p: 'peón', n: 'caballo', b: 'alfil', r: 'torre', q: 'dama', k: 'rey' };

/** Descripción en español, para la línea de estado y los lectores de pantalla. */
export function describir(e, m) {
  if (m.enroque) return m.enroque.toLowerCase() === 'k' ? 'enroque corto' : 'enroque largo';
  const p = PIEZAS[e.b[m.de].toLowerCase()];
  let t = `${p} ${nombre(m.de)} a ${nombre(m.a)}`;
  if (m.captura) t += `, captura ${m.alPaso ? 'peón al paso' : PIEZAS[e.b[m.a].toLowerCase()]}`;
  if (m.promo) t += `, corona ${PIEZAS[m.promo]}`;
  return t;
}

/* ============================ Rival de la app ============================ */
const VALOR = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
/* Tablas de posición (desde el punto de vista de las blancas, a8 = índice 0). */
const TP = {
  p: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
  n: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
  b: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
  r: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
  q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
  k: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
};

/** Valoración estática desde el punto de vista del bando al que le toca. */
export function valorar(e) {
  let s = 0;
  for (let i = 0; i < 64; i++) {
    const p = e.b[i];
    if (!p) continue;
    const t = p.toLowerCase();
    if (p === t) s -= VALOR[t] + TP[t][(7 - (i >> 3)) * 8 + (i & 7)];   // negras: tabla reflejada
    else s += VALOR[t] + TP[t][i];
  }
  return e.turno === 'w' ? s : -s;
}

const MATE = 100000;
const ordenar = (e, ms) => ms
  .map((m) => ({ m, k: (m.captura ? 10 * VALOR[(e.b[m.a] || 'p').toLowerCase()] - VALOR[e.b[m.de].toLowerCase()] : 0) + (m.promo === 'q' ? 800 : 0) }))
  .sort((x, y) => y.k - x.k).map((x) => x.m);

/** Mejor jugada para el bando al que le toca.
 *  nivel 'facil': comete errores a propósito (un principiante puede ganar).
 *  nivel 'dificil': búsqueda alfa-beta con profundización iterativa,
 *  extensión de capturas y límite de tiempo. */
export function mejorJugada(e, { nivel = 'dificil', ms = 1500, azar = Math.random } = {}) {
  const legales = jugadas(e);
  if (!legales.length) return null;
  if (nivel === 'facil') {
    if (azar() < 0.4) return legales[Math.floor(azar() * legales.length)];
    let mejor = null, mv = -Infinity;
    for (const m of legales) {
      const v = -valorar(aplicar(e, m, true)) + (azar() - 0.5) * 120;
      if (v > mv) { mv = v; mejor = m; }
    }
    return mejor;
  }

  const limite = Date.now() + ms;
  let nodos = 0, agotado = false;
  const tiempo = () => { if ((++nodos & 1023) === 0 && Date.now() > limite) agotado = true; return agotado; };

  function quiescencia(pos, alfa, beta, prof) {
    if (tiempo()) return 0;
    const quieto = valorar(pos);
    if (quieto >= beta) return beta;
    if (quieto > alfa) alfa = quieto;
    if (prof > 6) return alfa;
    for (const m of ordenar(pos, pseudo(pos).filter((x) => x.captura || x.promo))) {
      const n = aplicar(pos, m, true);
      if (enJaque(n, pos.turno)) continue;
      const v = -quiescencia(n, -beta, -alfa, prof + 1);
      if (agotado) return 0;
      if (v >= beta) return beta;
      if (v > alfa) alfa = v;
    }
    return alfa;
  }

  function negamax(pos, prof, alfa, beta, ply) {
    if (tiempo()) return 0;
    if (prof === 0) return quiescencia(pos, alfa, beta, 0);
    let hay = false;
    for (const m of ordenar(pos, pseudo(pos))) {
      const n = aplicar(pos, m, true);
      if (enJaque(n, pos.turno)) continue;
      hay = true;
      const v = -negamax(n, prof - 1, -beta, -alfa, ply + 1);
      if (agotado) return 0;
      if (v >= beta) return beta;
      if (v > alfa) alfa = v;
    }
    if (!hay) return enJaque(pos) ? -MATE + ply : 0;
    return alfa;
  }

  let elegida = ordenar(e, legales)[0];
  for (let prof = 1; prof <= 6; prof++) {
    let mejor = null, alfa = -Infinity;
    const orden = [elegida, ...ordenar(e, legales).filter((m) => m !== elegida)];
    for (const m of orden) {
      const v = -negamax(aplicar(e, m, true), prof - 1, -Infinity, -alfa, 1);
      if (agotado) break;
      if (v > alfa) { alfa = v; mejor = m; }
    }
    if (agotado) break;
    if (mejor) elegida = mejor;
    if (alfa >= MATE - 100) break;   // mate encontrado: no hace falta buscar más
  }
  return elegida;
}
