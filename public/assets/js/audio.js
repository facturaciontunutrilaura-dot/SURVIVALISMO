/* =========================================================================
   audio.js — 🎵 AUDIO OFFLINE
   ---------------------------------------------------------------------------
   Reproductor de archivos de sonido que el usuario añade desde su dispositivo.
   Se guardan como Blob en IndexedDB y se reproducen sin conexión.

   POR QUÉ NO HAY DESCARGA DESDE YOUTUBE NI SIMILARES
   Descargar audio de plataformas de streaming infringe sus condiciones de uso
   y, salvo excepciones muy limitadas, los derechos de autor de la obra.
   Además exigiría un servidor propio procesando descargas, lo que rompería la
   arquitectura local-first de esta aplicación. Aquí solo entran archivos que
   ya tienes: música tuya, pistas de bibliotecas libres y grabaciones propias.

   IDEA DE FONDO: en una emergencia, el audio más valioso no suele ser música.
   Es la voz de alguien de tu familia explicando el punto de encuentro, o unas
   instrucciones que puedes escuchar con las manos ocupadas.
   ========================================================================= */

import { el, esc, toast, uid, fmtBytes, confirmar, borrarConDeshacer, alSalir } from './ui.js';
import * as store from './store.js';

const CATEGORIAS = [
  { id: 'voz', t: 'Mensajes de voz', ic: '🗣', d: 'Grabaciones de la familia: puntos de encuentro, acuerdos, quién recoge a quién.' },
  { id: 'instrucciones', t: 'Instrucciones', ic: '🩹', d: 'Pasos que quieres poder escuchar con las manos ocupadas.' },
  { id: 'musica', t: 'Música', ic: '🎵', d: 'Para un apagón largo o un aislamiento. Moral y rutina.' },
  { id: 'ninos', t: 'Para niños', ic: '🧸', d: 'Cuentos, canciones. Sirve más de lo que parece.' },
  { id: 'otro', t: 'Otros', ic: '📼', d: '' },
];
const CAT = Object.fromEntries(CATEGORIAS.map((c) => [c.id, c]));

const TIPOS_OK = /^audio\/(mpeg|mp3|mp4|m4a|x-m4a|aac|ogg|opus|wav|webm|flac)$/i;
const EXT_OK = /\.(mp3|m4a|aac|ogg|opus|wav|weba|webm|flac)$/i;
const MAX = 60 * 1024 * 1024; // 60 MB por archivo

const kv = async (id, def) => (await store.get('kv', id))?.v ?? def;
const setKv = (id, v) => store.put('kv', { id, v });

const dur = (s) => {
  if (!Number.isFinite(s)) return '—';
  const m = Math.floor(s / 60), ss = Math.round(s % 60);
  return `${m}:${String(ss).padStart(2, '0')}`;
};

/** Lee la duración sin cargar el archivo entero en memoria dos veces. */
function duracionDe(blob) {
  return new Promise((res) => {
    const a = document.createElement('audio');
    const url = URL.createObjectURL(blob);
    const fin = (v) => { URL.revokeObjectURL(url); res(v); };
    a.preload = 'metadata';
    a.onloadedmetadata = () => fin(a.duration);
    a.onerror = () => fin(NaN);
    setTimeout(() => fin(NaN), 5000);
    a.src = url;
  });
}

export async function audioView() {
  const n = el(`<div>
    <div class="blk-note">Los archivos se guardan <b>en este dispositivo</b> y se reproducen sin conexión, igual que los mapas. No se sincronizan con la nube: pesan demasiado. Añádelos en cada dispositivo donde los quieras.</div>

    <div class="card">
      <h3>➕ Añadir audio</h3>
      <input type="file" id="au-file" accept="audio/*" multiple>
      <label>Categoría</label>
      <select id="au-cat">${CATEGORIAS.map((c) => `<option value="${c.id}">${c.ic} ${esc(c.t)}</option>`).join('')}</select>
      <div id="au-prog" class="muted"></div>
      <details style="margin-top:10px"><summary>¿De dónde saco música legal y gratuita?</summary><div>
        <ul>
          <li><b>Biblioteca de audio de YouTube</b> (dentro de YouTube Studio): descarga oficial y permitida, pensada para creadores.</li>
          <li><b>Pixabay Music</b>, <b>Free Music Archive</b>, <b>ccMixter</b>: pistas libres o con licencia Creative Commons. Comprueba la licencia de cada una.</li>
          <li><b>Tu propia música</b>: los MP3 que hayas comprado o copiado de tus CDs son tuyos.</li>
        </ul>
        <div class="blk-warn">Esta app no descarga audio de YouTube ni de otras plataformas de streaming: va contra sus condiciones de uso y contra los derechos de autor de la obra.</div>
      </div></details>
    </div>

    <div class="card" id="au-player" hidden>
      <h3 id="au-titulo">—</h3>
      <div class="muted" id="au-sub"></div>
      <audio id="au-el" preload="metadata" style="width:100%;margin:10px 0"></audio>
      <div class="btnrow">
        <button class="btn sm" id="au-prev" type="button">⏮</button>
        <button class="btn sm" id="au-next" type="button">⏭</button>
        <button class="btn sm ghost" id="au-loop" type="button" aria-pressed="false">🔁 Repetir</button>
        <button class="btn sm ghost" id="au-auto" type="button" aria-pressed="true">▶ Encadenar</button>
      </div>
    </div>

    <div class="filtros" id="au-filtros">
      <button class="btn sm" data-f="" type="button">Todo</button>
      ${CATEGORIAS.map((c) => `<button class="btn sm ghost" data-f="${c.id}" type="button">${c.ic} ${esc(c.t)}</button>`).join('')}
    </div>

    <div id="au-lista" class="list"></div>

    <div class="card">
      <h3>Espacio</h3>
      <div class="kv" id="au-espacio"></div>
      <div class="btnrow"><button class="btn ghost sm danger" id="au-clear" type="button">Borrar todo el audio</button></div>
      <div class="muted">El audio no entra en la copia de seguridad JSON: haría el archivo enorme. Guarda los originales aparte.</div>
    </div>
  </div>`);

  let filtro = '';
  let cola = [];
  let indice = -1;
  let urlActual = null;

  const elAudio = n.querySelector('#au-el');
  const player = n.querySelector('#au-player');

  /* ------------------------------ Listado ------------------------------ */
  async function pinta() {
    const todos = (await store.all('audio')).sort((a, b) => (b.ts || 0) - (a.ts || 0));
    cola = todos.filter((a) => !filtro || a.cat === filtro);

    n.querySelector('#au-lista').innerHTML = cola.length
      ? cola.map((a, i) => `<div class="row${i === indice ? ' pr-info' : ''}" data-i="${i}">
          <span style="font-size:1.25rem">${(CAT[a.cat] || CAT.otro).ic}</span>
          <div class="rt"><b>${esc(a.nombre)}</b>
            <span>${esc((CAT[a.cat] || CAT.otro).t)} · ${dur(a.dur)} · ${fmtBytes(a.tam)}</span></div>
          <button class="btn" data-play="${i}" type="button" aria-label="Reproducir ${esc(a.nombre)}">▶</button>
          <button class="btn danger borrar" data-del="${esc(a.id)}" type="button" aria-label="Borrar ${esc(a.nombre)}">✕</button>
        </div>`).join('')
      : `<p class="muted">${todos.length ? 'Nada en esta categoría.' : 'Todavía no has añadido ningún archivo. Empieza por una nota de voz con vuestro punto de encuentro: en una emergencia se escucha mejor de lo que se lee.'}</p>`;

    n.querySelectorAll('[data-play]').forEach((b) =>
      b.addEventListener('click', () => reproducir(+b.dataset.play)));
    n.querySelectorAll('[data-del]').forEach((b) =>
      b.addEventListener('click', async () => {
        // El registro guardado incluye el archivo: deshacer lo recupera entero.
        const rec = await store.get('audio', b.dataset.del);
        if (cola[indice]?.id === rec.id) parar();
        await borrarConDeshacer({
          que: 'Audio', borrar: () => store.del('audio', rec.id), restaurar: () => store.restaurar('audio', rec),
          repintar: async () => { if (n.isConnected) { await pinta(); await espacio(); } },
        });
      }));

    // Marca el que está sonando
    n.querySelectorAll('#au-lista .row').forEach((r, i) =>
      r.classList.toggle('pr-info', i === indice));
  }

  async function espacio() {
    const todos = await store.all('audio');
    const bytes = todos.reduce((s, a) => s + (a.tam || 0), 0);
    const est = await store.storageEstimate();
    const porCat = CATEGORIAS.map((c) => {
      const l = todos.filter((a) => a.cat === c.id);
      return l.length ? `<div>${c.ic} ${esc(c.t)}</div><div>${l.length} · ${fmtBytes(l.reduce((s, a) => s + (a.tam || 0), 0))}</div>` : '';
    }).join('');
    n.querySelector('#au-espacio').innerHTML =
      `<div>Archivos</div><div><b>${todos.length}</b></div>
       <div>Ocupan</div><div><b>${fmtBytes(bytes)}</b></div>
       ${porCat}
       ${est?.usage != null ? `<div>Total de la app</div><div>${fmtBytes(est.usage)}${est.quota ? ' de ' + fmtBytes(est.quota) : ''}</div>` : ''}`;
  }

  /* ---------------------------- Reproducción ---------------------------- */
  function parar() {
    elAudio.pause();
    if (urlActual) { URL.revokeObjectURL(urlActual); urlActual = null; }
    elAudio.removeAttribute('src');
    indice = -1;
    player.hidden = true;
  }

  async function reproducir(i) {
    if (i < 0 || i >= cola.length) return;
    const a = cola[i];
    if (urlActual) URL.revokeObjectURL(urlActual);
    urlActual = URL.createObjectURL(a.blob);
    indice = i;
    elAudio.src = urlActual;
    player.hidden = false;
    n.querySelector('#au-titulo').textContent = a.nombre;
    n.querySelector('#au-sub').textContent =
      `${(CAT[a.cat] || CAT.otro).ic} ${(CAT[a.cat] || CAT.otro).t} · ${dur(a.dur)} · ${fmtBytes(a.tam)}`;
    try { await elAudio.play(); } catch { /* el navegador puede exigir un gesto */ }
    n.querySelectorAll('#au-lista .row').forEach((r, j) => r.classList.toggle('pr-info', j === i));
    await setKv('audio.ultimo', a.id);
  }

  elAudio.addEventListener('ended', () => {
    const enc = n.querySelector('#au-auto').getAttribute('aria-pressed') === 'true';
    if (elAudio.loop) return;
    if (enc && indice + 1 < cola.length) reproducir(indice + 1);
  });

  n.querySelector('#au-prev').addEventListener('click', () => reproducir(indice - 1));
  n.querySelector('#au-next').addEventListener('click', () => reproducir(indice + 1));
  n.querySelector('#au-loop').addEventListener('click', (e) => {
    elAudio.loop = !elAudio.loop;
    e.currentTarget.setAttribute('aria-pressed', String(elAudio.loop));
    e.currentTarget.classList.toggle('ghost', !elAudio.loop);
  });
  n.querySelector('#au-auto').addEventListener('click', (e) => {
    const v = e.currentTarget.getAttribute('aria-pressed') !== 'true';
    e.currentTarget.setAttribute('aria-pressed', String(v));
    e.currentTarget.classList.toggle('ghost', !v);
  });

  /* ------------------------------ Importar ------------------------------ */
  n.querySelector('#au-file').addEventListener('change', async (ev) => {
    const files = [...(ev.target.files || [])];
    if (!files.length) return;
    const cat = n.querySelector('#au-cat').value;
    const prog = n.querySelector('#au-prog');
    let ok = 0; const fallos = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      prog.textContent = `Añadiendo ${i + 1} de ${files.length}: ${f.name}…`;
      if (!TIPOS_OK.test(f.type) && !EXT_OK.test(f.name)) { fallos.push(`${f.name} (formato no reconocido)`); continue; }
      if (f.size > MAX) { fallos.push(`${f.name} (${fmtBytes(f.size)}, máximo ${fmtBytes(MAX)})`); continue; }
      try {
        const blob = f.slice(0, f.size, f.type || 'audio/mpeg');
        const d = await duracionDe(blob);
        await store.put('audio', {
          id: uid(),
          nombre: f.name.replace(/\.[^.]+$/, ''),
          tipo: f.type || 'audio/mpeg',
          tam: f.size,
          dur: d,
          cat,
          blob,
          ts: Date.now(),
        });
        ok++;
      } catch (e) { fallos.push(`${f.name} (${e.message})`); }
    }

    ev.target.value = '';
    prog.innerHTML = `<b>${ok} añadido(s).</b>`
      + (fallos.length ? `<br><span style="color:var(--amber)">No se pudieron añadir: ${esc(fallos.join(', '))}</span>` : '');
    await pinta(); await espacio();
    if (ok) await store.persistStorage();
  });

  n.querySelector('#au-clear').addEventListener('click', async () => {
    if (!confirmar('¿Borrar TODOS los archivos de audio guardados? Los mapas y el resto de datos no se tocan.')) return;
    parar();
    await store.clear('audio');
    await pinta(); await espacio();
    toast('Audio borrado');
  });

  n.querySelectorAll('#au-filtros button').forEach((b) => b.addEventListener('click', async () => {
    filtro = b.dataset.f;
    n.querySelectorAll('#au-filtros button').forEach((x) => x.classList.toggle('ghost', x !== b));
    indice = -1;
    await pinta();
  }));

  await pinta(); await espacio();
  // Al salir de la pantalla el audio se detiene: sin sus controles no habría
  // forma de pararlo, y seguiría gastando batería.
  alSalir(parar);

  return n;
}
