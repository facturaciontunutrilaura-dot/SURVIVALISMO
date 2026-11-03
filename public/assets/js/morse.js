/* =========================================================================
   morse.js — Código Morse internacional (sin interfaz)
   Tiempos (unidad = un punto): raya = 3, entre señales = 1,
   entre letras = 3, entre palabras = 7.
   ========================================================================= */

export const MORSE = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---',
  K: '-.-', L: '.-..', M: '--', N: '-.', Ñ: '--.--', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...',
  T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
  0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.',
};
const INVERSO = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));

/** Quita tildes (salvo la Ñ) y pasa a mayúsculas. */
const limpiar = (s) => String(s).toUpperCase().replace(/Ñ/g, '\u0001').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\u0001/g, 'Ñ');

/** Texto → Morse. Letras separadas por espacio, palabras por « / ». */
export function aMorse(texto) {
  return limpiar(texto).trim().split(/\s+/).filter(Boolean)
    .map((p) => [...p].map((ch) => MORSE[ch]).filter(Boolean).join(' '))
    .filter(Boolean).join(' / ');
}

/** Morse → texto (lo que no se reconoce sale como «?»). */
export function deMorse(codigo) {
  return String(codigo).trim().split(/\s*\/\s*/).map((p) => p.split(/\s+/).filter(Boolean).map((c) => INVERSO[c] || '?').join('')).join(' ');
}

/** Secuencia de [encendido, duración en unidades] para reproducir un texto. */
export function secuencia(texto) {
  const out = [];
  const palabras = limpiar(texto).trim().split(/\s+/).filter(Boolean);
  palabras.forEach((p, ip) => {
    const letras = [...p].filter((ch) => MORSE[ch]);
    letras.forEach((ch, il) => {
      [...MORSE[ch]].forEach((s, is) => {
        out.push([true, s === '.' ? 1 : 3]);
        if (is < MORSE[ch].length - 1) out.push([false, 1]);
      });
      if (il < letras.length - 1) out.push([false, 3]);
    });
    if (ip < palabras.length - 1) out.push([false, 7]);
  });
  return out;
}
