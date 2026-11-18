/* =========================================================================
   fondos-core.js — FONDOS DE PANTALLA (cálculos, sin pantalla)
   Los fondos se dibujan en el propio móvil (canvas), sin descargas ni
   conexión. Aquí viven el tamaño, el azar con semilla (el mismo diseño sale
   siempre igual) y el texto del fondo de emergencia.
   ========================================================================= */

/** Diseños decorativos. */
export const DISENOS = [
  { id: 'brujula', t: 'Rosa de los vientos', d: 'El icono de la app en grande' },
  { id: 'topo', t: 'Curvas de nivel', d: 'Como un mapa topográfico' },
  { id: 'camo', t: 'Camuflaje', d: 'Los colores de la app' },
  { id: 'noche', t: 'Cielo nocturno', d: 'Negro puro: gasta menos batería' },
  { id: 'mapa', t: 'Cuadrícula de mapa', d: 'Papel con coordenadas' },
];

/** Tamaño en píxeles reales de la pantalla, en vertical, con límites sensatos. */
export function tamanoPantalla(w, h, dpr = 1) {
  let a = Math.round(Math.min(w, h) * dpr), b = Math.round(Math.max(w, h) * dpr);
  if (!a || !b || b / a < 1.3 || Math.min(w, h) >= 1000) { a = 1170; b = 2532; }   // ordenador o datos raros → móvil típico
  const k = Math.min(1, 1440 / a, 3200 / b);
  return { w: Math.round(a * k), h: Math.round(b * k) };
}

/** Generador pseudoaleatorio con semilla (mulberry32). */
export function azar(semilla = 1) {
  let s = semilla >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Parte un texto en líneas que caben en `ancho` según `medir(texto)`. */
export function partirTexto(texto, ancho, medir) {
  const lineas = [];
  for (const parrafo of String(texto || '').split(/\n+/)) {
    let linea = '';
    for (const palabra of parrafo.split(/\s+/).filter(Boolean)) {
      const prueba = linea ? `${linea} ${palabra}` : palabra;
      if (!linea || medir(prueba) <= ancho) linea = prueba;
      else { lineas.push(linea); linea = palabra; }
    }
    if (linea) lineas.push(linea);
  }
  return lineas;
}

const limpio = (t) => String(t || '').replace(/\s+/g, ' ').trim();

/**
 * Bloques del fondo de emergencia, en orden. Solo lo que el usuario ha
 * escrito y ha elegido mostrar. La información médica va desactivada de
 * entrada: el fondo de bloqueo lo ve cualquiera.
 * d = { nombre, contactos: [{n, t, r}], encuentro, medico }
 * op = { nombre, contactos, encuentro, medico }
 */
export function bloquesEmergencia(d = {}, op = {}) {
  const b = [{ tipo: 'aviso', t: 'EN CASO DE EMERGENCIA' }];
  if (op.nombre && limpio(d.nombre)) b.push({ tipo: 'nombre', t: limpio(d.nombre) });
  b.push({ tipo: 'tel', t: 'Llama al 112' });
  const cs = (d.contactos || []).filter((c) => limpio(c.t)).slice(0, 3);
  if (op.contactos && cs.length) {
    b.push({ tipo: 'etiqueta', t: 'Avisa a' });
    for (const c of cs) b.push({ tipo: 'contacto', t: limpio(c.n) ? `${limpio(c.n)} · ${limpio(c.t)}` : limpio(c.t) });
  }
  if (op.encuentro && limpio(d.encuentro)) { b.push({ tipo: 'etiqueta', t: 'Punto de encuentro' }); b.push({ tipo: 'texto', t: limpio(d.encuentro).slice(0, 160) }); }
  if (op.medico && limpio(d.medico)) { b.push({ tipo: 'etiqueta', t: 'Información médica' }); b.push({ tipo: 'texto', t: limpio(d.medico).slice(0, 220) }); }
  return b;
}

/** Nombre del archivo: fondo-<diseño>-<ancho>x<alto>.png */
export const nombreArchivo = (id, t) => `fondo-${id}-${t.w}x${t.h}.png`;
