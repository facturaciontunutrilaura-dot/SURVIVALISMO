/* =========================================================================
   compass.js — brújula digital
   Usa DeviceOrientationAbsolute / webkitCompassHeading cuando existen.
   Si no hay sensores, ofrece modo manual (rosa girable) y métodos naturales.
   ========================================================================= */
import { el, esc, toast } from './ui.js';

function roseSVG() {
  const marks = [];
  for (let i = 0; i < 72; i++) {
    const deg = i * 5;
    const long = deg % 45 === 0;
    const mid = deg % 15 === 0;
    const len = long ? 16 : mid ? 10 : 5;
    marks.push(
      `<line x1="100" y1="${8}" x2="100" y2="${8 + len}" stroke="${long ? '#9cb768' : '#6f7a6c'}" stroke-width="${long ? 2 : 1}" transform="rotate(${deg} 100 100)"/>`
    );
  }
  const cardinales = [['N', 0, '#c8402f'], ['E', 90, '#cbbf9f'], ['S', 180, '#cbbf9f'], ['O', 270, '#cbbf9f']];
  const txt = cardinales.map(([l, d, c]) =>
    `<text x="100" y="42" text-anchor="middle" fill="${c}" font-size="18" font-family="monospace" font-weight="bold" transform="rotate(${d} 100 100)">${l}</text>`
  ).join('');
  const sec = [['NE', 45], ['SE', 135], ['SO', 225], ['NO', 315]].map(([l, d]) =>
    `<text x="100" y="40" text-anchor="middle" fill="#6f7a6c" font-size="11" font-family="monospace" transform="rotate(${d} 100 100)">${l}</text>`
  ).join('');
  return `<svg viewBox="0 0 200 200" aria-hidden="true">
    <circle cx="100" cy="100" r="94" fill="none" stroke="#2d372f" stroke-width="1"/>
    <circle cx="100" cy="100" r="72" fill="none" stroke="#2d372f" stroke-width="1"/>
    ${marks.join('')}${txt}${sec}
    <polygon points="100,54 105,100 100,106 95,100" fill="#c8402f"/>
    <polygon points="100,146 95,100 100,94 105,100" fill="#4e6236"/>
    <circle cx="100" cy="100" r="3.5" fill="#cbbf9f"/>
  </svg>`;
}

const CARD = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];
const card = (d) => CARD[Math.round(d / 22.5) % 16];

export function compassView() {
  const n = el(`<div>
    <div class="compass-wrap">
      <div class="compass">
        <div class="needle-fixed"></div>
        <div class="rose" id="cp-rose">${roseSVG()}</div>
        <div class="read"><div><b id="cp-deg">—</b><span id="cp-card">SIN SENSOR</span></div></div>
      </div>
    </div>
    <div class="btnrow">
      <button class="btn" id="cp-start" type="button">Activar sensor</button>
      <button class="btn ghost" id="cp-lock" type="button">Fijar rumbo</button>
      <button class="btn ghost" id="cp-manual" type="button">Modo manual</button>
    </div>
    <div id="cp-info"></div>
    <div class="card" id="cp-pos"><h3>Mi posición</h3>
      <button class="btn ghost wide sm" id="cp-gps" type="button">📍 Obtener coordenadas</button>
      <div id="cp-gpsout" class="sp"></div>
    </div>
  </div>`);

  const rose = n.querySelector('#cp-rose');
  const degEl = n.querySelector('#cp-deg');
  const cardEl = n.querySelector('#cp-card');
  const info = n.querySelector('#cp-info');
  let heading = 0, locked = null, manual = false, manualDeg = 0, running = false;

  function paint(h) {
    heading = h;
    rose.style.transform = `rotate(${-h}deg)`;
    degEl.textContent = `${Math.round(h)}°`;
    cardEl.textContent = card(h) + (locked != null ? ` · FIJO ${Math.round(locked)}°` : '');
  }

  function onOrient(e) {
    let h = null;
    if (typeof e.webkitCompassHeading === 'number') h = e.webkitCompassHeading;
    else if (e.absolute && typeof e.alpha === 'number') h = 360 - e.alpha;
    else if (typeof e.alpha === 'number') h = 360 - e.alpha;
    if (h == null || Number.isNaN(h)) return;
    paint((h + 360) % 360);
  }

  async function start() {
    if (running) return;
    try {
      const DOE = window.DeviceOrientationEvent;
      if (DOE && typeof DOE.requestPermission === 'function') {
        const r = await DOE.requestPermission();
        if (r !== 'granted') throw new Error('Permiso denegado');
      }
      if (!('DeviceOrientationEvent' in window)) throw new Error('Sin API de orientación');
      window.addEventListener('deviceorientationabsolute', onOrient, true);
      window.addEventListener('deviceorientation', onOrient, true);
      running = true;
      info.innerHTML = `<div class="blk-note">Sensor activo. Calibra moviendo el móvil en forma de 8 durante unos segundos. Aléjate de metales, imanes, coches y electrónica: desvían la lectura.</div>`;
      setTimeout(() => {
        if (degEl.textContent === '—') {
          info.innerHTML = `<div class="blk-warn">El navegador no está entregando datos de orientación. Usa el modo manual y los métodos naturales que se explican más abajo.</div>`;
        }
      }, 2500);
    } catch (err) {
      info.innerHTML = `<div class="blk-warn">No se ha podido activar el magnetómetro (${esc(err.message)}). Este dispositivo o navegador puede no tenerlo, o requerir HTTPS. Usa el modo manual.</div>`;
    }
  }

  n.querySelector('#cp-start').addEventListener('click', start);

  n.querySelector('#cp-lock').addEventListener('click', () => {
    locked = locked == null ? heading : null;
    paint(heading);
    toast(locked == null ? 'Rumbo liberado' : `Rumbo fijado en ${Math.round(locked)}° · inverso ${Math.round((locked + 180) % 360)}°`);
  });

  n.querySelector('#cp-manual').addEventListener('click', () => {
    manual = !manual;
    if (manual) {
      info.innerHTML = `<div class="blk-note">Modo manual: arrastra la rosa para alinearla con el norte que hayas determinado por el sol, las estrellas o el terreno. Después podrás leer rumbos sobre ella.</div>`;
      let dragging = false, startX = 0, startDeg = 0;
      const c = n.querySelector('.compass');
      const down = (e) => { dragging = true; startX = (e.touches ? e.touches[0].clientX : e.clientX); startDeg = manualDeg; };
      const move = (e) => {
        if (!dragging) return;
        const x = (e.touches ? e.touches[0].clientX : e.clientX);
        manualDeg = (startDeg + (x - startX) * 0.7 + 360 * 4) % 360;
        paint(manualDeg);
        e.preventDefault();
      };
      const up = () => { dragging = false; };
      c.addEventListener('pointerdown', down);
      window.addEventListener('pointermove', move, { passive: false });
      window.addEventListener('pointerup', up);
      paint(manualDeg);
    } else {
      info.innerHTML = '';
    }
  });

  n.querySelector('#cp-gps').addEventListener('click', () => {
    const out = n.querySelector('#cp-gpsout');
    if (!navigator.geolocation) { out.innerHTML = '<div class="blk-warn">Este navegador no soporta geolocalización.</div>'; return; }
    out.innerHTML = '<div class="muted">Obteniendo posición…</div>';
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const { latitude: la, longitude: lo, accuracy: ac, altitude: al } = p.coords;
        out.innerHTML = `<div class="kv">
          <div>Latitud</div><div class="mono">${la.toFixed(5)}</div>
          <div>Longitud</div><div class="mono">${lo.toFixed(5)}</div>
          <div>Altitud</div><div class="mono">${al != null ? al.toFixed(0) + ' m' : 'no disponible'}</div>
          <div>Precisión</div><div class="mono">±${ac.toFixed(0)} m</div>
        </div>
        <div class="btnrow"><button class="btn sm ghost" id="cp-copy" type="button">Copiar coordenadas</button>
        <a class="btn sm ghost" href="#/mapa">Ver en el mapa</a></div>
        <div class="muted">El GPS funciona sin conexión a Internet: usa satélites. Lo que necesita conexión es descargar mapas, no posicionarte.</div>`;
        out.querySelector('#cp-copy').addEventListener('click', async () => {
          const txt = `${la.toFixed(5)}, ${lo.toFixed(5)}`;
          try { await navigator.clipboard.writeText(txt); toast('Coordenadas copiadas'); }
          catch { toast(txt); }
        });
      },
      (e) => { out.innerHTML = `<div class="blk-warn">No se pudo obtener la posición (${esc(e.message)}). Comprueba los permisos de ubicación del navegador.</div>`; },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  });

  return n;
}
