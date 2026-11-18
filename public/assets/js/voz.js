/* =========================================================================
   voz.js — LEER EN VOZ ALTA (Alex por voz)
   Usa la síntesis de voz del propio sistema (speechSynthesis): en iPhone y
   Android las voces en español vienen instaladas y funcionan sin Internet.
   Se prefieren las voces locales (localService) a las de la nube.
   ========================================================================= */
const AJUSTE = 'survival.voz';

export const disponible = () => typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

/** ¿Leer las respuestas automáticamente? (se recuerda en este móvil) */
export function auto() { try { return localStorage.getItem(AJUSTE) === '1'; } catch { return false; } }
export function setAuto(on) { try { localStorage.setItem(AJUSTE, on ? '1' : '0'); } catch { /* sin localStorage */ } }

/** Mejor voz en español: local, de España si la hay. */
export function elegirVoz(voces = []) {
  const es = voces.filter((v) => /^es([-_]|$)/i.test(v.lang || ''));
  const punt = (v) => (v.localService ? 4 : 0) + (/es[-_]ES/i.test(v.lang) ? 2 : 0) + (v.default ? 1 : 0);
  return es.sort((a, b) => punt(b) - punt(a))[0] || null;
}

/** Texto limpio para leer: sin emojis ni flechas, y con «112» dicho bien. */
export function textoParaLeer(t) {
  return String(t || '')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}→›←•✓✕]/gu, ' ')
    .replace(/\b112\b/g, 'uno uno dos')
    .replace(/\b024\b/g, 'cero dos cuatro')
    .replace(/\s+/g, ' ').trim();
}

let actual = null;
export const hablando = () => disponible() && (speechSynthesis.speaking || speechSynthesis.pending);

export function parar() {
  if (!disponible()) return;
  actual = null;
  speechSynthesis.cancel();
}

/** Lee el texto. `alTerminar` se llama al acabar o al pararlo. */
export function leer(texto, alTerminar = () => {}) {
  if (!disponible()) return false;
  parar();
  const limpio = textoParaLeer(texto);
  if (!limpio) return false;
  // Trozos cortos: algunos motores (Chrome en Android) cortan textos largos.
  const trozos = limpio.match(/[^.!?;:]+[.!?;:]*/g)?.reduce((acc, f) => {
    if (acc.length && (acc[acc.length - 1] + f).length < 200) acc[acc.length - 1] += f; else acc.push(f);
    return acc;
  }, []) || [limpio];
  const voz = elegirVoz(speechSynthesis.getVoices());
  const yo = {};
  actual = yo;
  trozos.forEach((t, i) => {
    const u = new SpeechSynthesisUtterance(t.trim());
    u.lang = voz?.lang || 'es-ES';
    if (voz) u.voice = voz;
    u.rate = 1;
    if (i === trozos.length - 1) u.onend = () => { if (actual === yo) { actual = null; alTerminar(); } };
    u.onerror = () => { if (actual === yo) { actual = null; alTerminar(); } };
    speechSynthesis.speak(u);
  });
  return true;
}

// Algunas plataformas cargan las voces tarde.
if (disponible()) { try { speechSynthesis.getVoices(); speechSynthesis.addEventListener?.('voiceschanged', () => {}); } catch { /* nada */ } }
