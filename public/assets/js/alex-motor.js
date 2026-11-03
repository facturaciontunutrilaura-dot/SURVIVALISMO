/* =========================================================================
   alex-motor.js — el «cerebro» de Pregúntale a Alex
   Módulo PURO (sin DOM): recibe una pregunta y devuelve la respuesta a
   partir del contenido de la app. Funciona sin conexión y no inventa.
     1. Crisis personal y urgencias vitales (112 primero), por patrones.
     2. Seguimiento de la conversación: «cuéntame más», «¿qué no hago?»,
        «¿y si…?» siguen con el tema anterior.
     3. Situaciones frecuentes, por patrones.
     4. Todo lo demás, con el buscador de la app (sinónimos y ranking).
        Si dos temas empatan, pregunta cuál; si nada encaja, lo dice.
   Cada respuesta es una «ficha conversada»: lo primero que hay que hacer,
   lo que no hay que hacer, un aviso si lo hay y lo que se puede preguntar
   después. El resto de la ficha se va contando con «cuéntame más».
   ========================================================================= */
import { INDICE, EMERGENCIAS_MAP, SOS_SANITARIAS_MAP, ARTICULOS_MAP, CHECKLISTS } from '../../data/content/index.js';
import { INTENCIONES, SALUDOS, GRACIAS, SUGERENCIAS, SEGUIMIENTO, EMOCION, APERTURAS } from '../../data/content/alex.js';
import { crearBuscador, normalizar } from './search.js';

const MAX_PASOS = 6;
const MAX_ITEMS = 8;
const CONFIANZA_MIN = 20;     // por debajo, la pregunta no es de supervivencia
const CONFIANZA_DUDA = 35;    // entre ambas, se responde avisando de la duda
const EMPATE = 0.85;          // segundo resultado ≥ 85 % del primero → preguntar
const CHECK_MAP = Object.fromEntries(CHECKLISTS.map((c) => [c.id, c]));
const limpio = (s) => ` ${normalizar(s).replace(/[^a-z0-9ñ]+/g, ' ').trim()} `;

/** ¿Coincide el patrón como palabra o frase completa (o raíz con «*»)?
    «a+b» exige las dos partes en cualquier orden: «incendio+edificio». */
export function coincide(texto, patron) {
  if (patron.includes('+')) return patron.split('+').every((p) => coincide(texto, p));
  const raiz = patron.endsWith('*');
  const p = limpio(raiz ? patron.slice(0, -1) : patron).trimEnd();
  return raiz ? texto.includes(p) : texto.includes(p + ' ');
}
const algun = (t, lista = []) => lista.some((p) => coincide(t, p));

const entrada = (d) => d && INDICE.find((it) => it.tipo === d.tipo && it.id === d.id);
const texto = (x) => (typeof x === 'string' ? x : x?.t || x?.txt || x?.text || '');

/** Ficha completa de un artículo, por secciones (título + lista o texto). */
function seccionesArticulo(body = []) {
  const secs = [];
  let actual = { t: '', items: [], texto: [] };
  const ojo = [], notas = [];
  const cerrar = () => { if (actual.items.length || actual.texto.length) secs.push(actual); };
  for (const b of body) {
    if (b.h) { cerrar(); actual = { t: b.h, items: [], texto: [] }; }
    else if (b.ol || b.ul) actual.items.push(...(b.ol || b.ul).map(texto).filter(Boolean));
    else if (b.p) actual.texto.push(b.p);
    else if (b.warn) ojo.push(b.warn);
    else if (b.note) notas.push(b.note);
  }
  cerrar();
  return { secs, ojo, notas };
}

/** Todo lo que Alex puede contar de una entrada del índice. */
export function contenidoDe(it) {
  if (!it) return { pasos: [], secciones: [], no: [] };
  if (it.tipo === 'emergencia') {
    const e = EMERGENCIAS_MAP[it.id] || {};
    const pasos = (e.card?.length ? e.card : e.ahora || []).slice(0, MAX_PASOS);
    const secciones = [
      e.ahora?.length && { t: 'Paso a paso, ahora', items: e.ahora },
      e.horas?.length && { t: 'En las próximas horas', items: e.horas },
      e.dias?.length && { t: 'Si dura días', items: e.dias },
      e.eq?.length && { t: 'Lo que te hará falta', items: e.eq.map(texto) },
    ].filter(Boolean);
    return { pasos, secciones, no: e.no || [], ojo: [], mas: 'Ficha completa: pasos, próximas horas y qué no hacer' };
  }
  if (it.tipo === 'sos' || it.tipo === 'articulo') {
    const a = it.tipo === 'sos' ? ARTICULOS_MAP[SOS_SANITARIAS_MAP[it.id]?.art] : ARTICULOS_MAP[it.id];
    const { secs, ojo, notas } = seccionesArticulo(a?.body);
    const conLista = secs.find((s) => s.items.length);
    const pasos = (conLista?.items || []).slice(0, MAX_PASOS);
    // Lo que no se debe hacer: secciones o avisos que lo dicen.
    const no = secs.filter((s) => /no hagas|qué no|errores|evita|nunca/i.test(s.t)).flatMap((s) => s.items);
    const secciones = secs.filter((s) => s !== conLista || s.items.length > MAX_PASOS || s.texto.length)
      .map((s) => (s === conLista ? { ...s, items: s.items.slice(MAX_PASOS), t: s.t || 'Más pasos' } : s))
      .filter((s) => s.items.length || s.texto.length);
    return { pasos, pasosT: conLista?.t || '', secciones, no, ojo, notas, pendiente: a?.revision === 'pendiente', mas: 'Ficha completa' };
  }
  if (it.tipo === 'checklist') {
    const c = CHECK_MAP[it.id];
    const grupos = c?.grupos || [];
    const todos = grupos.flatMap((g) => g.items.map(texto));
    return {
      pasos: todos.slice(0, MAX_PASOS),
      secciones: grupos.map((g) => ({ t: g.t, items: g.items.map(texto) })),
      no: [], ojo: [],
      mas: todos.length > MAX_PASOS ? `La lista completa (${todos.length} cosas) para marcar lo que tienes` : 'Abrir la lista',
    };
  }
  return { pasos: [], secciones: [], no: [], ojo: [], mas: 'Abrir' };
}

/** Apertura variada pero estable para la misma pregunta. */
function apertura(q, lista = APERTURAS) {
  let h = 0;
  for (const ch of q) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return lista[h % lista.length];
}

export function crearAlex(indice = INDICE) {
  const buscador = crearBuscador(indice);
  // Memoria de la conversación (solo en esta pantalla).
  let ultimo = null;   // { it, c, vistas }

  function relacionados(q, excluir, extra = []) {
    const vistos = new Set(excluir.map((x) => x.ruta));
    const out = [];
    const utiles = buscador.buscar(q).resultados.filter((r) => r.puntos >= CONFIANZA_DUDA).map((r) => r.it);
    for (const it of [...extra.map(entrada).filter(Boolean), ...utiles]) {
      if (vistos.has(it.ruta) || out.length >= 3) continue;
      vistos.add(it.ruta); out.push({ t: it.t, ruta: it.ruta });
    }
    return out;
  }

  /** Preguntas que tiene sentido hacer después de esta respuesta. */
  function siguientes(c, rel) {
    const out = [];
    if (c.secciones?.length) out.push('Cuéntame más');
    if (c.no?.length) out.push('¿Qué no debo hacer?');
    for (const r of rel.slice(0, 2)) out.push(r.t);
    return out.slice(0, 4);
  }

  function respuestaDe(it, q, base = {}) {
    const c = contenidoDe(it);
    const rel = relacionados(q, [it], base.tambien);
    ultimo = { it, c, vistas: 0, q };
    return {
      tipo: 'respuesta', titulo: it.t, resumen: it.sum || '', ruta: it.ruta,
      apertura: base.urgente ? '' : apertura(q), ...c,
      no: (c.no || []).slice(0, 3), ojo: (c.ojo || []).slice(0, 1),
      secciones: undefined, quedan: c.secciones?.length || 0,
      relacionados: rel, siguientes: siguientes(c, rel), ...base, tambien: undefined,
    };
  }

  /** «Cuéntame más»: la siguiente parte de la ficha de la que hablábamos. */
  function continuar(q) {
    const { it, c } = ultimo;
    const s = c.secciones?.[ultimo.vistas];
    if (!s) {
      const rel = relacionados(it.t, [it]);
      return { tipo: 'fin-tema', titulo: it.t, ruta: it.ruta, mas: c.mas, relacionados: rel, siguientes: rel.map((r) => r.t) };
    }
    ultimo.vistas++;
    const quedan = c.secciones.length - ultimo.vistas;
    return {
      tipo: 'seguimiento', titulo: it.t, ruta: it.ruta, mas: c.mas, seccion: { t: s.t, items: s.items.slice(0, MAX_ITEMS), texto: s.texto?.slice(0, 2) || [], recortado: s.items.length > MAX_ITEMS },
      quedan, siguientes: [quedan ? 'Cuéntame más' : null, c.no?.length ? '¿Qué no debo hacer?' : null].filter(Boolean), q,
    };
  }

  /** «¿Qué no debo hacer?» del tema del que hablábamos. */
  function queNo() {
    const { it, c } = ultimo;
    const lista = c.no?.length ? c.no : c.ojo;
    return {
      tipo: 'seguimiento', titulo: it.t, ruta: it.ruta, mas: c.mas,
      seccion: lista?.length ? { t: 'Lo que no debes hacer', items: lista.slice(0, MAX_ITEMS), texto: [] } : { t: '', items: [], texto: ['En esta ficha no hay una lista de errores, pero sí avisos importantes: ábrela entera para verlos.'] },
      quedan: (c.secciones?.length || 0) - ultimo.vistas, siguientes: c.secciones?.length > ultimo.vistas ? ['Cuéntame más'] : [],
    };
  }

  /** Responde a una pregunta. Devuelve un objeto listo para pintar. */
  function responder(pregunta) {
    const q = String(pregunta || '').trim().slice(0, 300);
    const t = limpio(q);
    if (!t.trim()) return { tipo: 'saludo', sugerencias: SUGERENCIAS };
    const empatia = algun(t, EMOCION.patrones) ? EMOCION.texto : '';
    const conEmpatia = (r) => (empatia && r.tipo === 'respuesta' && !r.urgente && r.intencion !== 'ansiedad'
      ? { ...r, empatia, relacionados: [...(r.relacionados || []), ...(r.relacionados?.some((x) => x.ruta === '#/sec/juegos/calma') ? [] : [{ t: 'Modo calma: respirar y bajar la ansiedad', ruta: '#/sec/juegos/calma' }])].slice(0, 4) }
      : r);

    // 1. Lo urgente y la crisis, siempre primero.
    const urgentes = INTENCIONES.filter((i) => i.crisis || i.urgente);
    for (const intn of urgentes) if (algun(t, intn.patrones)) return resolver(intn, q);

    // 2. Seguimiento de la conversación.
    const corto = t.trim().split(' ').length <= 4;
    if (ultimo) {
      if (corto && algun(t, SEGUIMIENTO.mas)) return continuar(q);
      if (algun(t, SEGUIMIENTO.no)) return queNo();
    }

    // 3. Situaciones frecuentes.
    for (const intn of INTENCIONES) {
      if (intn.crisis || intn.urgente || !algun(t, intn.patrones)) continue;
      return conEmpatia(resolver(intn, q));
    }

    if (corto && SALUDOS.some((s) => coincide(t, s))) return { tipo: 'saludo', sugerencias: SUGERENCIAS };
    if (corto && GRACIAS.some((s) => coincide(t, s))) return { tipo: 'gracias', siguientes: ultimo ? ['Cuéntame más'] : [] };

    // 4. Buscador. Con contexto: «¿y si no tengo leña?» sigue con el tema anterior.
    let res = buscador.buscar(q).resultados;
    // Solo si la frase arranca como continuación («y si…», «pero…», «¿y sin…?»).
    const sigue = ultimo && /^ (y|pero|entonces|tambien|ademas|si no|sin|con) /.test(t);
    if (sigue && (!res[0] || res[0].puntos < CONFIANZA_DUDA)) {
      const ctx = buscador.buscar(`${q} ${ultimo.it.t}`).resultados;
      if (ctx[0] && ctx[0].puntos >= CONFIANZA_MIN) res = ctx;
    }
    const [mejor, segundo] = res;
    if (!mejor || mejor.puntos < CONFIANZA_MIN) {
      const cerca = res.filter((r) => r.puntos >= 12).slice(0, 3).map((r) => ({ t: r.it.t, ruta: r.it.ruta }));
      // Parece una emergencia de la que la app no tiene ficha: no se inventa nada.
      if (algun(t, ['que hago', 'que hacer', 'que debo hacer', 'emergencia', 'peligro', 'socorro', 'ayuda'])) return { tipo: 'sin-ficha', cerca, sugerencias: SUGERENCIAS };
      return { tipo: 'fuera', sugerencias: SUGERENCIAS, cerca };
    }
    if (segundo && mejor.puntos < 45 && segundo.puntos >= mejor.puntos * EMPATE && segundo.it.ruta !== mejor.it.ruta) {
      const opciones = res.filter((r) => r.puntos >= mejor.puntos * EMPATE).slice(0, 3).map((r) => r.it.t);
      return { tipo: 'aclarar', opciones };
    }
    return conEmpatia(respuestaDe(mejor.it, q, { duda: mejor.puntos < CONFIANZA_DUDA }));
  }

  function resolver(intn, q) {
    if (intn.crisis) { ultimo = null; return { tipo: 'crisis', intro: intn.intro, relacionados: [entrada(intn.destino)].filter(Boolean).map((it) => ({ t: it.t, ruta: it.ruta })) }; }
    if (intn.destino.tipo === 'sin-contenido') {
      return { tipo: 'sin-contenido', intro: intn.intro, relacionados: relacionados(q, [], [{ tipo: 'articulo', id: 'alim-reserva' }, { tipo: 'checklist', id: 'despensa' }]), sugerencias: SUGERENCIAS };
    }
    if (intn.destino.tipo === 'sos-lista') {
      ultimo = null;
      return { tipo: 'respuesta', urgente: true, titulo: 'Emergencia sanitaria', resumen: 'Mientras llega la ayuda, abre la ficha que corresponda.', ruta: '#/emergencia', pasos: [], no: [], ojo: [], mas: 'Ver todas las emergencias sanitarias', relacionados: relacionados(q, [{ ruta: '#/emergencia' }]), siguientes: [] };
    }
    const it = entrada(intn.destino);
    return respuestaDe(it, q, { urgente: !!intn.urgente, intencion: intn.id, intro: intn.intro, tambien: intn.tambien });
  }

  return { responder, olvidar: () => { ultimo = null; } };
}
