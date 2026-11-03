/* =========================================================================
   sonido.js — un solo contexto de audio para silbato y Morse
   En iPhone, el audio web se silencia con el interruptor de silencio y
   puede quedarse «suspendido». Aquí se pide la sesión de reproducción
   (Safari 16.4+: navigator.audioSession), se reanuda el contexto dentro del
   toque del usuario y, en iOS, se reproduce un instante de silencio con un
   <audio>, que pasa el móvil al modo «reproducción» (suena aunque esté en
   silencio, como un vídeo).
   ========================================================================= */
let ctx = null, desbloqueado = false;

function silencioWav() {
  // WAV PCM de 0,1 s en silencio (8 kHz, 8 bits, mono).
  const n = 800, b = new Uint8Array(44 + n), v = new DataView(b.buffer);
  const txt = (o, s) => [...s].forEach((c, i) => { b[o + i] = c.charCodeAt(0); });
  txt(0, 'RIFF'); v.setUint32(4, 36 + n, true); txt(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true); txt(36, 'data'); v.setUint32(40, n, true);
  b.fill(128, 44);
  return URL.createObjectURL(new Blob([b], { type: 'audio/wav' }));
}

/** Contexto listo para sonar. Llamar dentro del manejador de un toque. */
export function contextoAudio() {
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* opcional */ }
  ctx ||= new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  if (!desbloqueado && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))) {
    // Solo cuenta como desbloqueado si el navegador deja reproducir (dentro de un toque).
    try { const a = new Audio(silencioWav()); a.setAttribute('playsinline', ''); a.play().then(() => { desbloqueado = true; }).catch(() => {}); } catch { /* opcional */ }
  }
  return ctx;
}
