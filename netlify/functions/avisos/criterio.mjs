/* =========================================================================
   Qué noticia merece un AVISO en el móvil (notificación push).

   Mucho más estricto que la pestaña de noticias: un aviso interrumpe, así
   que solo salta ante algo grave que puede exigir actuar. Ejemplo: la guerra
   de Ucrania sale a diario en las noticias, pero solo avisa si hay un salto
   de escalada (artículo 5, movilización general, ataque nuclear…).
   ========================================================================= */
import { normalizar } from '../noticias/core.mjs';

/** Frases que por sí solas justifican un aviso, se den donde se den. */
export const CRITICO_MUNDO = [
  'ataque nuclear', 'explosion nuclear', 'detonacion nuclear', 'accidente nuclear', 'fuga radiactiva',
  'nube radiactiva', 'alerta nuclear', 'emergencia nuclear', 'articulo 5', 'ataque a la otan',
  'ataca a la otan', 'ataca a un pais de la otan', 'guerra entre la otan', 'guerra mundial',
  'declara la guerra', 'declaracion de guerra', 'movilizacion general', 'tsunami', 'es-alert', 'es alert',
  'cierre del estrecho de ormuz', 'cierra el estrecho de ormuz', 'cierran el estrecho de ormuz',
];
/** Frases que avisan si la noticia es de España (sección nacional o menciona España). */
export const CRITICO_ESPANA = [
  'estado de alarma', 'estado de excepcion', 'estado de sitio', 'ley marcial', 'toque de queda',
  'corralito', 'gran apagon', 'apagon general', 'apagon masivo', 'cero energetico', 'apagon en toda espana',
  'servicio militar obligatorio', 'movilizacion de reservistas', 'racionamiento', 'desabastecimiento',
  'alerta antiterrorista nivel 5', 'nivel 5 de alerta antiterrorista', 'ciberataque masivo', 'huelga general indefinida',
];
const ESPANA = [' espana ', ' espanol', ' espanola', ' madrid ', ' peninsula '];
const tiene = (t, frases) => frases.some((f) => t.includes(` ${f}`));

/** ¿Esta noticia (formato de seleccionar()) merece aviso? */
export function esCritica(n) {
  const t = normalizar(n.t);
  if (n.fuenteId === 'aemet') return / rojo /.test(t);
  if (n.fuenteId === 'gdacs') return / red /.test(t) || / roja /.test(t);
  if (n.fuenteId === 'usgs') {
    const m = parseFloat((n.t.match(/M\s?(\d+(?:\.\d)?)/) || [])[1]);
    const cerca = /spain|portugal|morocco|algeria|mediterranean|gibraltar|alboran/i.test(n.t);
    return (cerca && m >= 5) || m >= 8;
  }
  if (tiene(t, CRITICO_MUNDO)) return true;
  return tiene(t, CRITICO_ESPANA) && (n.ambito === 'espana' || ESPANA.some((p) => t.includes(p)));
}

/** Clave estable para no avisar dos veces de lo mismo. */
export const claveAviso = (n) => normalizar(n.t).trim().slice(0, 80);

export const MAX_AVISOS_DIA = 4;

/**
 * De las noticias del momento, las que hay que enviar ahora.
 * `enviados`: { clave: fechaISO } de los últimos días. Respeta el máximo diario.
 */
export function avisosPendientes(noticias, enviados = {}, ahora = new Date()) {
  const hoy = Object.values(enviados).filter((f) => ahora - new Date(f) < 24 * 3600e3).length;
  const hueco = Math.max(0, MAX_AVISOS_DIA - hoy);
  return noticias
    .filter((n) => esCritica(n) && !enviados[claveAviso(n)])
    .filter((n) => !n.fecha || ahora - new Date(n.fecha) < 6 * 3600e3) // solo lo reciente
    .slice(0, hueco);
}

/** Lo que llega al móvil. Sin datos personales; abre la pestaña de noticias. */
export function cargaAviso(n) {
  return {
    title: `${n.ic || '🚨'} ${n.temaT || 'Aviso'}`.slice(0, 60),
    body: `${n.t} · ${n.fuente}`.slice(0, 200),
    url: '/#/sec/noticias',
    tag: claveAviso(n).slice(0, 60),
  };
}

/** Solo se aceptan suscripciones de los servicios push de los navegadores. */
const SERVICIOS = /^https:\/\/([a-z0-9-]+\.)*(fcm\.googleapis\.com|push\.services\.mozilla\.com|push\.apple\.com|notify\.windows\.com)\//;
export function suscripcionValida(s) {
  return !!(s && typeof s.endpoint === 'string' && s.endpoint.length < 1000 && SERVICIOS.test(s.endpoint)
    && s.keys && typeof s.keys.p256dh === 'string' && typeof s.keys.auth === 'string'
    && s.keys.p256dh.length < 200 && s.keys.auth.length < 100);
}
