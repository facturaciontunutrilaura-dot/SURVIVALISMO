/* =========================================================================
   alex-motor.js — el «cerebro» de Pregúntale a Alex
   Módulo PURO (sin DOM): recibe una pregunta y devuelve la respuesta a
   partir del contenido de la app. Funciona sin conexión.
     1. Crisis personal y urgencias vitales (112 primero), por patrones.
     2. Situaciones frecuentes, por patrones.
     3. Todo lo demás, con el buscador de la app (sinónimos y ranking).
   Si nada encaja con suficiente confianza, lo dice: no inventa.
   ========================================================================= */
import { INDICE, EMERGENCIAS_MAP, SOS_SANITARIAS_MAP, ARTICULOS_MAP, CHECKLISTS } from '../../data/content/index.js';
import { INTENCIONES, SALUDOS, GRACIAS, SUGERENCIAS } from '../../data/content/alex.js';
import { crearBuscador, normalizar } from './search.js';

const MAX_PASOS = 6;
const CONFIANZA_MIN = 20;     // por debajo, la pregunta no es de supervivencia
const CONFIANZA_DUDA = 35;    // entre ambas, se responde avisando de la duda
const CHECK_MAP = Object.fromEntries(CHECKLISTS.map((c) => [c.id, c]));
const limpio = (s) => ` ${normalizar(s).replace(/[^a-z0-9ñ]+/g, ' ').trim()} `;

/** ¿Coincide el patrón como palabra o frase completa (o raíz con «*»)? */
export function coincide(texto, patron) {
  const raiz = patron.endsWith('*');
  const p = limpio(raiz ? patron.slice(0, -1) : patron).trimEnd();
  return raiz ? texto.includes(p) : texto.includes(p + ' ');
}

const entrada = (d) => d && INDICE.find((it) => it.tipo === d.tipo && it.id === d.id);

/** Primera lista numerada (o, si no hay, de viñetas) de un artículo. */
function primeraLista(body = []) {
  const ol = body.find((b) => b.ol)?.ol, ul = body.find((b) => b.ul)?.ul;
  return (ol || ul || []).slice(0, MAX_PASOS);
}

/** Pasos y avisos de una entrada del índice, sacados de su contenido. */
export function contenidoDe(it) {
  if (!it) return { pasos: [] };
  if (it.tipo === 'emergencia') {
    const e = EMERGENCIAS_MAP[it.id];
    return { pasos: (e?.card?.length ? e.card : e?.ahora || []).slice(0, MAX_PASOS), mas: e?.ahora?.length ? 'Pasos completos, qué hacer en las próximas horas y qué no hacer' : '' };
  }
  if (it.tipo === 'sos' || it.tipo === 'articulo') {
    const a = it.tipo === 'sos' ? ARTICULOS_MAP[SOS_SANITARIAS_MAP[it.id]?.art] : ARTICULOS_MAP[it.id];
    return { pasos: primeraLista(a?.body), pendiente: a?.revision === 'pendiente', mas: 'Ficha completa' };
  }
  if (it.tipo === 'checklist') {
    const c = CHECK_MAP[it.id];
    const todos = (c?.grupos || []).flatMap((g) => g.items);
    return { pasos: todos.slice(0, MAX_PASOS), mas: todos.length > MAX_PASOS ? `La lista completa (${todos.length} cosas) para marcar lo que tienes` : 'Abrir la lista' };
  }
  return { pasos: [], mas: 'Abrir' };
}

export function crearAlex(indice = INDICE) {
  const buscador = crearBuscador(indice);

  function relacionados(q, excluir, extra = []) {
    const vistos = new Set(excluir.map((x) => x.ruta));
    const out = [];
    const utiles = buscador.buscar(q).resultados.filter((r) => r.puntos >= CONFIANZA_MIN).map((r) => r.it);
    for (const it of [...extra.map(entrada).filter(Boolean), ...utiles]) {
      if (vistos.has(it.ruta) || out.length >= 3) continue;
      vistos.add(it.ruta); out.push({ t: it.t, ruta: it.ruta });
    }
    return out;
  }

  function respuestaDe(it, q, base = {}) {
    const c = contenidoDe(it);
    return { tipo: 'respuesta', titulo: it.t, resumen: it.sum || '', ruta: it.ruta, ...c, relacionados: relacionados(q, [it], base.tambien), ...base, tambien: undefined };
  }

  /** Responde a una pregunta. Devuelve un objeto listo para pintar. */
  function responder(pregunta) {
    const q = String(pregunta || '').trim().slice(0, 300);
    const t = limpio(q);
    if (!t.trim()) return { tipo: 'saludo', sugerencias: SUGERENCIAS };

    for (const intn of INTENCIONES) {
      if (!intn.patrones.some((p) => coincide(t, p))) continue;
      if (intn.crisis) return { tipo: 'crisis', intro: intn.intro, relacionados: [entrada(intn.destino)].filter(Boolean).map((it) => ({ t: it.t, ruta: it.ruta })) };
      if (intn.destino.tipo === 'sos-lista') {
        return { tipo: 'respuesta', urgente: true, titulo: 'Emergencia sanitaria', resumen: 'Mientras llega la ayuda, abre la ficha que corresponda.', ruta: '#/emergencia', pasos: [], mas: 'Ver todas las emergencias sanitarias', relacionados: relacionados(q, [{ ruta: '#/emergencia' }]) };
      }
      const it = entrada(intn.destino);
      if (it) return respuestaDe(it, q, { urgente: !!intn.urgente, intencion: intn.id, tambien: intn.tambien });
    }

    const corto = t.trim().split(' ').length <= 3;
    if (corto && SALUDOS.some((s) => coincide(t, s))) return { tipo: 'saludo', sugerencias: SUGERENCIAS };
    if (corto && GRACIAS.some((s) => coincide(t, s))) return { tipo: 'gracias' };

    const res = buscador.buscar(q).resultados;
    const mejor = res[0];
    if (!mejor || mejor.puntos < CONFIANZA_MIN) return { tipo: 'fuera', sugerencias: SUGERENCIAS };
    return respuestaDe(mejor.it, q, { duda: mejor.puntos < CONFIANZA_DUDA });
  }

  return { responder };
}
