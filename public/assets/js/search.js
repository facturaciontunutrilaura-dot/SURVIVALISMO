/* =========================================================================
   search.js — buscador offline del manual
   ---------------------------------------------------------------------------
   Módulo puro: no toca el DOM ni la red, así que se prueba directamente con
   Node (tools/test-search.mjs) y funciona igual sin conexión.

   CÓMO FUNCIONA
   1. Normalización: minúsculas y sin tildes, CONSERVANDO la longitud del
      texto, de modo que una posición en el texto normalizado es la misma en
      el original (así se puede resaltar el fragmento real).
   2. Raíz ligera: singular/plural en español ("hemorragias" → "hemorragia",
      "luces" → "luz", "inundaciones" → "inundacion"). Se aplica igual a la
      consulta y al índice.
   3. Conceptos: la consulta se trocea en conceptos. Primero se buscan
      expresiones de varias palabras de la tabla de sinónimos ("corte de
      luz"), luego palabras sueltas. Las palabras vacías ("de", "mucho"…) no
      cuentan salvo dentro de una expresión.
   4. Ranking por concepto, quedándose con la mejor forma (la escrita o un
      sinónimo): título ≫ resumen/etiquetas ≫ texto. Los sinónimos puntúan
      algo menos que la forma escrita. Se premia cubrir todos los conceptos
      y la coincidencia exacta con el título; se penaliza cubrir solo parte.
   ========================================================================= */

import { SINONIMOS, STOPWORDS } from '../../data/content/sinonimos.js';

/* ------------------------------ Normalización ------------------------------ */

/** Minúsculas y sin diacríticos, con la MISMA longitud que la entrada. */
export function normalizar(s = '') {
  s = String(s);
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    const base = c.normalize('NFD')[0] || c;
    const low = base.toLowerCase();
    out += low.length === 1 ? low : base;
  }
  return out;
}

/** Raíz ligera: quita el plural. Deliberadamente conservadora. */
export function raiz(w) {
  if (w.length <= 3) return w;
  if (w.endsWith('ces')) return w.slice(0, -3) + 'z';          // luces → luz
  if (w.endsWith('iones')) return w.slice(0, -2);              // inundaciones → inundacion
  if (/[rlndj]es$/.test(w) && w.length > 4) return w.slice(0, -2); // apagones → apagon
  if (w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1); // heridas → herida
  return w;
}

const PALABRA = /[a-z0-9]+/g;

/** Tokens con su posición en el texto normalizado. */
function tokens(norm) {
  const out = [];
  PALABRA.lastIndex = 0;
  let m;
  while ((m = PALABRA.exec(norm))) out.push({ r: raiz(m[0]), i: m.index, n: m[0].length });
  return out;
}

const PARADAS = new Set(STOPWORDS.map(normalizar));
const frase = (texto) => (normalizar(texto).match(PALABRA) || []).map(raiz).join(' ');

/* Índice de sinónimos: forma normalizada (con raíz) → grupo. */
const GRUPOS = SINONIMOS.map((g) => ({
  ...g,
  formas: [...new Set(g.formas.map(frase))],
  ambiguas: new Set((g.ambiguas || []).map(frase)),
}));
/* Formas con las que se amplía un concepto: todas menos las ambiguas, que
   solo cuentan si son exactamente lo que se ha escrito. */
const ampliar = (g, principal) => g.formas.filter((f) => f === principal || !g.ambiguas.has(f));
const FORMA_A_GRUPO = new Map();
for (const g of GRUPOS) for (const f of g.formas) if (!FORMA_A_GRUPO.has(f)) FORMA_A_GRUPO.set(f, g);
const MAX_PALABRAS_FORMA = Math.max(...[...FORMA_A_GRUPO.keys()].map((f) => f.split(' ').length));

/* ------------------------------ Consulta ------------------------------ */

/** Convierte la consulta en conceptos a buscar. */
export function conceptos(q) {
  const palabras = normalizar(q).match(PALABRA) || [];
  const raices = palabras.map(raiz);
  const out = [];
  let i = 0;
  while (i < raices.length) {
    let hecho = false;
    // 1) Expresiones de varias palabras, de la más larga a la más corta.
    for (let L = Math.min(MAX_PALABRAS_FORMA, raices.length - i); L >= 2; L--) {
      const f = raices.slice(i, i + L).join(' ');
      const g = FORMA_A_GRUPO.get(f);
      if (g) {
        out.push({ texto: palabras.slice(i, i + L).join(' '), principal: f, formas: ampliar(g, f), grupo: g.id });
        i += L; hecho = true; break;
      }
    }
    if (hecho) continue;
    // 2) Palabra suelta.
    const w = palabras[i], r = raices[i];
    i++;
    if (PARADAS.has(w)) continue;
    const g = FORMA_A_GRUPO.get(r);
    const usaGrupo = g && !g.solo_frase;
    out.push({ texto: w, principal: r, formas: usaGrupo ? ampliar(g, r) : [r], grupo: usaGrupo ? g.id : null });
  }
  // Si todo eran palabras vacías ("que", "si"…), se buscan tal cual.
  if (!out.length && raices.length) return raices.map((r, k) => ({ texto: palabras[k], principal: r, formas: [r], grupo: null }));
  return out;
}

/* ------------------------------ Índice ------------------------------ */

function campo(texto = '') {
  const norm = normalizar(texto);
  const toks = tokens(norm);
  return { orig: String(texto), toks, str: ' ' + toks.map((t) => t.r).join(' ') + ' ' };
}

const contiene = (c, f) => c.str.includes(' ' + f + ' ');
function cuenta(c, f) {
  const aguja = ' ' + f + ' ';
  let n = 0, i = c.str.indexOf(aguja);
  while (i !== -1 && n < 50) { n++; i = c.str.indexOf(aguja, i + aguja.length - 1); }
  return n;
}
const empiezaPor = (c, p) => c.toks.some((t) => t.r.length > p.length && t.r.startsWith(p));

/** Posición [inicio, fin) de la primera aparición de la forma en el campo. */
function posicion(c, f) {
  const ws = f.split(' ');
  for (let k = 0; k + ws.length <= c.toks.length; k++) {
    if (ws.every((w, j) => c.toks[k + j].r === w)) {
      const ult = c.toks[k + ws.length - 1];
      return [c.toks[k].i, ult.i + ult.n];
    }
  }
  return null;
}
function posicionPrefijo(c, p) {
  const t = c.toks.find((x) => x.r.startsWith(p));
  return t ? [t.i, t.i + t.n] : null;
}

/** Fragmento del texto original alrededor de la coincidencia. */
function fragmento(c, pos, ancho = 70) {
  if (!pos) return null;
  const [a, b] = pos;
  let ini = Math.max(0, a - ancho), fin = Math.min(c.orig.length, b + ancho + 30);
  if (ini > 0) { const sp = c.orig.indexOf(' ', ini); if (sp !== -1 && sp < a) ini = sp + 1; }
  if (fin < c.orig.length) { const sp = c.orig.lastIndexOf(' ', fin); if (sp > b) fin = sp; }
  return {
    antes: (ini > 0 ? '…' : '') + c.orig.slice(ini, a),
    marca: c.orig.slice(a, b),
    despues: c.orig.slice(b, fin) + (fin < c.orig.length ? '…' : ''),
  };
}

/* Pesos. Un título manda sobre cualquier cantidad de menciones en el texto. */
const P = { titulo: 40, resumen: 16, textoBase: 4, textoPorVez: 2.5, textoMax: 6, prefTitulo: 18, prefTexto: 3, sinonimo: 0.75 };
/* Ante la duda, primero lo que dice qué HACER (SOS, escenarios) y después
   lo que describe o proyecta (fichas de riesgo, rutas, juegos). */
const IMPULSO_TIPO = { sos: 10, emergencia: 8, riesgo: -8, ruta: -6, juego: -6, audio: -6 };
const IMPULSO_PR = { critico: 4, importante: 2 };

export function crearBuscador(indice) {
  const docs = indice.map((it) => ({
    it,
    titulo: campo(it.t),
    resumen: campo([it.sum, it.tags].filter(Boolean).join(' · ')),
    texto: campo(it.texto),
  }));

  function puntuaConcepto(d, c) {
    let mejor = { s: 0 };
    for (const f of c.formas) {
      const w = f === c.principal ? 1 : P.sinonimo;
      let s = 0, donde = null;
      if (contiene(d.titulo, f)) { s += P.titulo * w; donde = 'titulo'; }
      if (contiene(d.resumen, f)) { s += P.resumen * w; donde ||= 'resumen'; }
      const n = cuenta(d.texto, f);
      if (n) { s += (P.textoBase + Math.min(n, P.textoMax) * P.textoPorVez) * w; donde ||= 'texto'; }
      if (s > mejor.s) mejor = { s, forma: f, donde, sinonimo: w < 1 };
    }
    // Palabra a medio escribir ("hemorr"): prefijo, solo de la forma escrita.
    if (!mejor.s && c.formas.length === 1 && !c.principal.includes(' ') && c.principal.length >= 4) {
      if (empiezaPor(d.titulo, c.principal)) mejor = { s: P.prefTitulo, prefijo: c.principal, donde: 'titulo' };
      else if (empiezaPor(d.resumen, c.principal)) mejor = { s: P.prefTexto * 2, prefijo: c.principal, donde: 'resumen' };
      else if (empiezaPor(d.texto, c.principal)) mejor = { s: P.prefTexto, prefijo: c.principal, donde: 'texto' };
    }
    return mejor;
  }

  function buscar(q, { limite = 60 } = {}) {
    const cs = conceptos(q);
    if (!cs.length) return { conceptos: cs, resultados: [] };
    const consultaTitulo = cs.map((c) => c.principal).join(' ');

    const puntuados = [];
    for (const d of docs) {
      const porConcepto = cs.map((c) => ({ c, m: puntuaConcepto(d, c) }));
      const cubiertos = porConcepto.filter((x) => x.m.s > 0);
      if (!cubiertos.length) continue;
      let s = cubiertos.reduce((a, x) => a + x.m.s, 0);
      // Cobertura: cubrir todos los conceptos pesa más que acumular menciones de uno.
      if (cs.length > 1) s *= cubiertos.length === cs.length ? 1.5 : 0.5 + 0.5 * (cubiertos.length / cs.length);
      // Coincidencia exacta o como expresión completa en el título.
      const tituloStr = d.titulo.str.trim();
      if (tituloStr === consultaTitulo) s += 60;
      else if (cs.length > 1 && contiene(d.titulo, consultaTitulo)) s += 25;
      s += (IMPULSO_TIPO[d.it.tipo] || 0) + (IMPULSO_PR[d.it.pr] || 0);
      puntuados.push({ d, s, porConcepto, cubiertos: cubiertos.length });
    }
    puntuados.sort((a, b) => b.s - a.s || a.d.it.t.localeCompare(b.d.it.t, 'es'));

    // Se descartan las coincidencias muy marginales frente a la mejor.
    const tope = puntuados[0]?.s || 0;
    const utiles = puntuados.filter((p, k) => k < 5 || p.s >= tope * 0.12).slice(0, limite);

    return {
      conceptos: cs,
      resultados: utiles.map(({ d, s, porConcepto, cubiertos }) => {
        const principal = porConcepto.filter((x) => x.m.s > 0).sort((a, b) => b.m.s - a.m.s)[0];
        const m = principal.m;
        const campoFrag = m.donde === 'texto' ? d.texto : m.donde === 'resumen' ? d.resumen : d.texto;
        const pos = m.prefijo ? posicionPrefijo(campoFrag, m.prefijo) : posicion(campoFrag, m.forma);
        return {
          it: d.it,
          puntos: Math.round(s * 10) / 10,
          motivo: {
            donde: m.donde,
            sinonimo: !!m.sinonimo,
            buscado: principal.c.texto,
            encontrado: m.forma || m.prefijo,
            parcial: cubiertos < cs.length,
          },
          fragmento: m.donde === 'titulo' && !pos ? null : fragmento(campoFrag, pos),
        };
      }),
    };
  }

  /* Vocabulario para "¿quisiste decir…?": palabras de títulos y sinónimos. */
  const vocab = new Set();
  for (const d of docs) for (const t of d.titulo.toks) if (t.r.length >= 4) vocab.add(t.r);
  for (const f of FORMA_A_GRUPO.keys()) if (!f.includes(' ') && f.length >= 4) vocab.add(f);

  /** Consultas corregidas para errores de escritura, calculadas en local. */
  function sugerir(q, max = 3) {
    const palabras = normalizar(q).match(PALABRA) || [];
    const out = [];
    palabras.forEach((w, k) => {
      if (PARADAS.has(w) || w.length < 4) return;
      const r = raiz(w);
      if (vocab.has(r)) return;
      const tol = r.length >= 7 ? 2 : 1;
      const cands = [...vocab]
        .map((v) => ({ v, dd: distancia(r, v, tol) }))
        .filter((x) => x.dd <= tol)
        .sort((a, b) => a.dd - b.dd || a.v.length - b.v.length)
        .slice(0, max);
      for (const { v } of cands) {
        const nueva = palabras.map((x, j) => (j === k ? v : x)).join(' ');
        if (!out.includes(nueva) && buscar(nueva).resultados.length) out.push(nueva);
      }
    });
    return out.slice(0, max);
  }

  return { buscar, sugerir };
}

/** Distancia de Levenshtein con corte temprano. */
export function distancia(a, b, max = 2) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let minFila = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (cur[j] < minFila) minFila = cur[j];
    }
    if (minFila > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}
