/* =========================================================================
   radio.js — RADIO EN DIRECTO (por internet, gastando lo mínimo)
   La lista viene de /api/radios (función de Netlify que consulta el
   directorio abierto Radio Browser y elige, de cada emisora, la emisión
   que menos datos gasta). Se guarda la última lista en el móvil.
   Sin internet no hay radio por aquí: para eso, una radio FM a pilas.
   ========================================================================= */
import { el, esc } from './ui.js';
import * as store from './store.js';

const kv = async (id, def) => (await store.get('kv', id).catch(() => null))?.v ?? def;
const setKv = (id, v) => store.put('kv', { id, v }).catch(() => {});

/** Megas por hora con una emisión de `kbps`. */
export const mbHora = (kbps) => (kbps ? Math.round((kbps * 3600) / 8 / 1024) : null);

/**
 * Une la lista nueva con la guardada: si una emisora llega sin emisión (el
 * directorio falló esa vez), se conserva la última que funcionaba en vez de
 * hacerla desaparecer.
 */
export function unirConGuardadas(nuevas = [], guardadas = []) {
  const prev = new Map((guardadas || []).filter((e) => e?.url).map((e) => [e.id, e]));
  return nuevas.map((e) => (e.url || !prev.has(e.id) ? e : { ...prev.get(e.id), t: e.t, tipo: e.tipo }));
}

let audio = null;          // un solo reproductor para toda la app
let sonando = null;        // id de la emisora que suena

export function pararRadio() {
  if (!audio) return;
  audio.pause();
  audio.removeAttribute('src');
  audio.load();
  sonando = null;
}

export async function radioView() {
  const n = el(`<section class="card rd" aria-labelledby="rd-t">
    <h3 id="rd-t">📻 Radio en directo</h3>
    <p class="muted">Por internet, eligiendo la emisión que menos datos gasta: sirve con poca cobertura. Sin internet, usa una radio FM a pilas (Radio Nacional y las emisoras locales dan los avisos oficiales).</p>
    <p id="rd-estado" role="status" aria-live="polite"></p>
    <div id="rd-lista"></div>
    <p class="muted rd-pie">Directorio de emisoras: Radio Browser (radio-browser.info). Las emisiones son de cada emisora.</p>
  </section>`);
  const estado = n.querySelector('#rd-estado'), lista = n.querySelector('#rd-lista');
  let datos = await kv('radios.cache', null);

  function pintar() {
    const ems = (datos?.emisoras || []).filter((e) => e.url);
    if (!ems.length) { lista.innerHTML = ''; return; }
    const grupo = (tipo, t) => {
      const g = ems.filter((e) => e.tipo === tipo);
      return g.length ? `<p class="rd-grupo">${t}</p><div class="rd-items">${g.map((e) => `<button type="button" class="rd-e" data-rd="${esc(e.id)}" aria-pressed="${sonando === e.id}">
        <span class="rd-ic" aria-hidden="true">${sonando === e.id ? '⏸' : '▶'}</span><span><b>${esc(e.t)}</b>
        <small>${e.kbps ? `${e.kbps} kbps · unos ${mbHora(e.kbps)} MB por hora` : 'consumo desconocido'}</small></span></button>`).join('')}</div>` : '';
    };
    lista.innerHTML = grupo('noticias', '🗞️ Noticias') + grupo('musica', '🎵 Música');
  }

  async function actualizar() {
    estado.textContent = datos ? '' : 'Buscando emisoras…';
    try {
      const r = await fetch('./api/radios', { cache: 'no-store' });
      if (r.status === 404) throw new Error('La radio aún no está disponible en esta instalación.');
      if (!r.ok) throw new Error(`El servicio de radios no responde (${r.status}).`);
      const j = await r.json();
      if (!Array.isArray(j?.emisoras)) throw new Error('Respuesta no válida.');
      datos = { ...j, emisoras: unirConGuardadas(j.emisoras, datos?.emisoras) };
      setKv('radios.cache', datos); estado.textContent = '';
    } catch (e) {
      estado.textContent = datos ? 'Sin conexión con el directorio: se muestran las emisoras guardadas.' : (navigator.onLine ? e.message : 'Sin conexión: la radio por internet necesita datos.');
    }
    pintar();
  }

  lista.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-rd]');
    if (!b) return;
    const e = datos.emisoras.find((x) => x.id === b.dataset.rd);
    if (sonando === e.id) { pararRadio(); estado.textContent = ''; return pintar(); }
    audio ||= new Audio();
    audio.preload = 'none';
    audio.src = e.url;
    sonando = e.id;
    estado.textContent = `Conectando con ${e.t}…`;
    audio.onplaying = () => { estado.textContent = `▶ Suena ${e.t}`; };
    audio.onerror = () => { if (sonando === e.id) { sonando = null; estado.textContent = `${e.t} no responde ahora. Prueba otra emisora.`; pintar(); } };
    audio.play().catch(() => { if (sonando === e.id) { sonando = null; estado.textContent = `No se ha podido reproducir ${e.t}. Prueba otra emisora.`; pintar(); } });
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({ title: e.t, artist: 'Radio en directo', artwork: [{ src: './icons/icon-192.png', sizes: '192x192', type: 'image/png' }] });
        navigator.mediaSession.setActionHandler('pause', () => { pararRadio(); pintar(); });
        navigator.mediaSession.setActionHandler('stop', () => { pararRadio(); pintar(); });
      } catch { /* opcional */ }
    }
    pintar();
  });

  pintar();
  actualizar();
  return n;
}
