/* =========================================================================
   calc.js — calculadoras offline
   ========================================================================= */
import { el, esc } from './ui.js';

const num = (v, d = 0) => {
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : d;
};

function wrap(title, inner) {
  return `<div class="card"><h3>${esc(title)}</h3>${inner}</div>`;
}

/* ------------------------------- AGUA ------------------------------- */
export function calcAgua() {
  const n = el(wrap('🧮 ¿Cuánta agua necesito?', `
    <div class="fieldrow">
      <div><label>Personas</label><input type="number" inputmode="numeric" id="ca-p" value="4" min="1"></div>
      <div><label>Días</label><input type="number" inputmode="numeric" id="ca-d" value="7" min="1"></div>
    </div>
    <label>Nivel de uso</label>
    <select id="ca-u">
      <option value="3">Mínimo vital — 3 l/persona/día</option>
      <option value="5" selected>Beber + cocinar + higiene básica — 5 l</option>
      <option value="8">Uso holgado con higiene — 8 l</option>
      <option value="10">Calor extremo o esfuerzo — 10 l</option>
    </select>
    <div class="fieldrow">
      <div><label>Perros</label><input type="number" inputmode="numeric" id="ca-pe" value="0" min="0"></div>
      <div><label>Gatos</label><input type="number" inputmode="numeric" id="ca-ga" value="0" min="0"></div>
    </div>
    <div class="sp"></div><div id="ca-out"></div>`));

  const run = () => {
    const p = num(n.querySelector('#ca-p').value, 0);
    const d = num(n.querySelector('#ca-d').value, 0);
    const u = num(n.querySelector('#ca-u').value, 3);
    const pe = num(n.querySelector('#ca-pe').value, 0);
    const ga = num(n.querySelector('#ca-ga').value, 0);
    const base = p * d * u + pe * d * 1.5 + ga * d * 0.25;
    const margen = base * 1.2;
    const gar5 = Math.ceil(margen / 5);
    const bid20 = Math.ceil(margen / 20);
    n.querySelector('#ca-out').innerHTML = `
      <div class="kv">
        <div>Necesidad base</div><div><b>${base.toFixed(0)} litros</b></div>
        <div>Con margen +20 %</div><div><b>${margen.toFixed(0)} litros</b></div>
        <div>Peso aproximado</div><div>${margen.toFixed(0)} kg</div>
        <div>Equivale a</div><div>${gar5} garrafas de 5 l · ${bid20} bidones de 20 l</div>
      </div>
      <div class="blk-note">Si no puedes almacenar todo, prioriza el mínimo vital (3 l/persona/día) y complétalo con un sistema de tratamiento de agua.</div>`;
  };
  n.addEventListener('input', run);
  run();
  return n;
}

/* ------------------------------- CLORO ------------------------------- */
export function calcCloro() {
  const n = el(wrap('🧮 Cloración de emergencia', `
    <div class="fieldrow">
      <div><label>Litros a tratar</label><input type="number" inputmode="decimal" id="cc-l" value="10" min="0.1" step="0.1"></div>
      <div><label>Estado del agua</label>
        <select id="cc-t"><option value="1">Clara</option><option value="2">Turbia, coloreada o muy fría</option></select>
      </div>
    </div>
    <div class="sp"></div><div id="cc-out"></div>`));

  const run = () => {
    const l = num(n.querySelector('#cc-l').value, 0);
    const t = num(n.querySelector('#cc-t').value, 1);
    const gotas = l * 2 * t;
    const ml = gotas * 0.05;
    n.querySelector('#cc-out').innerHTML = `
      <div class="kv">
        <div>Lejía 6 % – 8,25 %</div><div><b>${gotas.toFixed(0)} gotas</b> (≈ ${ml.toFixed(1)} ml)</div>
        <div>Tiempo de espera</div><div><b>30 minutos</b></div>
        <div>Comprobación</div><div>Debe quedar ligero olor a cloro. Si no, repite la dosis y espera 15 min más.</div>
      </div>
      <div class="blk-warn">Solo lejía SIN perfume, SIN detergente y SIN aditivos, preferiblemente etiquetada como apta para desinfección de agua de bebida y con menos de un año. Si dudas de la concentración, hierve el agua: 1 minuto, o 3 minutos por encima de 1.000 m.</div>
      <div class="muted">Dosis de referencia de la EPA (2 gotas por litro de agua clara).</div>`;
  };
  n.addEventListener('input', run);
  run();
  return n;
}

/* ------------------------------- COMIDA ------------------------------- */
export function calcComida() {
  const n = el(wrap('🧮 Reserva alimentaria', `
    <div class="fieldrow">
      <div><label>Adultos</label><input type="number" inputmode="numeric" id="cf-a" value="2" min="0"></div>
      <div><label>Niños</label><input type="number" inputmode="numeric" id="cf-n" value="0" min="0"></div>
    </div>
    <div class="fieldrow">
      <div><label>Días</label><input type="number" inputmode="numeric" id="cf-d" value="7" min="1"></div>
      <div><label>Actividad</label>
        <select id="cf-act">
          <option value="2000">Reposo / confinado — 2.000 kcal</option>
          <option value="2700" selected>Moderada — 2.700 kcal</option>
          <option value="3800">Marcha, frío, montaña — 3.800 kcal</option>
        </select>
      </div>
    </div>
    <div class="sp"></div><div id="cf-out"></div>`));

  const run = () => {
    const a = num(n.querySelector('#cf-a').value, 0);
    const ni = num(n.querySelector('#cf-n').value, 0);
    const d = num(n.querySelector('#cf-d').value, 0);
    const k = num(n.querySelector('#cf-act').value, 2700);
    const kcal = (a * k + ni * k * 0.65) * d;
    // Reparto orientativo por densidad calórica media
    const arroz = (kcal * 0.30) / 3.5;      // g (350 kcal/100 g)
    const legum = (kcal * 0.20) / 1.05;     // g de conserva (105 kcal/100 g)
    const aceite = (kcal * 0.15) / 9;       // ml (900 kcal/100 ml)
    const conservas = (kcal * 0.20) / 1.8;  // g (180 kcal/100 g)
    const otros = (kcal * 0.15) / 4;        // g (400 kcal/100 g)
    n.querySelector('#cf-out').innerHTML = `
      <div class="kv">
        <div>Energía total</div><div><b>${Math.round(kcal).toLocaleString('es-ES')} kcal</b></div>
        <div>Por día</div><div>${Math.round(kcal / (d || 1)).toLocaleString('es-ES')} kcal</div>
      </div>
      <h4>Reparto orientativo</h4>
      <div class="kv">
        <div>Cereal seco (arroz/pasta)</div><div>${(arroz / 1000).toFixed(1)} kg</div>
        <div>Legumbre cocida en conserva</div><div>${(legum / 1000).toFixed(1)} kg (≈ ${Math.ceil(legum / 400)} botes)</div>
        <div>Aceite de oliva</div><div>${(aceite / 1000).toFixed(2)} l</div>
        <div>Conservas de pescado/carne</div><div>${(conservas / 1000).toFixed(1)} kg</div>
        <div>Frutos secos, galletas, chocolate</div><div>${(otros / 1000).toFixed(1)} kg</div>
      </div>
      <div class="blk-note">Es una estimación de partida. Ajústala a lo que realmente coméis: una despensa que no se consume y se rota acaba caducando.</div>`;
  };
  n.addEventListener('input', run);
  run();
  return n;
}

/* ------------------------------- MARCHA ------------------------------- */
export function calcMarcha() {
  const n = el(wrap('🧮 Tiempo de marcha (Naismith)', `
    <div class="fieldrow">
      <div><label>Distancia (km)</label><input type="number" inputmode="decimal" id="cm-d" value="12" step="0.1" min="0"></div>
      <div><label>Desnivel + (m)</label><input type="number" inputmode="numeric" id="cm-h" value="600" min="0"></div>
    </div>
    <div class="fieldrow">
      <div><label>Ritmo llano (km/h)</label><input type="number" inputmode="decimal" id="cm-v" value="4" step="0.1" min="1"></div>
      <div><label>Factor</label>
        <select id="cm-f">
          <option value="1">Normal</option>
          <option value="1.3">Mochila pesada o grupo</option>
          <option value="1.6">Nieve, noche o mal tiempo</option>
          <option value="2">Terreno difícil / niños</option>
        </select>
      </div>
    </div>
    <div class="sp"></div><div id="cm-out"></div>`));

  const run = () => {
    const d = num(n.querySelector('#cm-d').value);
    const h = num(n.querySelector('#cm-h').value);
    const v = num(n.querySelector('#cm-v').value, 4) || 4;
    const f = num(n.querySelector('#cm-f').value, 1);
    const horas = (d / v + h / 600) * f;
    const paradas = horas * (7 / 60);
    const tot = horas + paradas;
    const hh = Math.floor(tot), mm = Math.round((tot - hh) * 60);
    n.querySelector('#cm-out').innerHTML = `
      <div class="kv">
        <div>Tiempo de marcha</div><div><b>${hh} h ${String(mm).padStart(2, '0')} min</b></div>
        <div>Sin paradas</div><div>${horas.toFixed(2)} h</div>
        <div>Paradas estimadas</div><div>${Math.round(paradas * 60)} min</div>
      </div>
      <div class="blk-note">Suma siempre margen de seguridad y calcula la hora de puesta de sol. Si no llegas con una hora de luz de margen, replantea la ruta.</div>`;
  };
  n.addEventListener('input', run);
  run();
  return n;
}

/* ------------------------------- AZIMUT ------------------------------- */
export function calcAzimut() {
  const n = el(wrap('🧮 Rumbo, inverso y desvío', `
    <label>Azimut directo (°)</label>
    <input type="number" inputmode="decimal" id="cz-a" value="120" min="0" max="360" step="1">
    <div class="fieldrow">
      <div><label>Declinación (° E+ / O−)</label><input type="number" inputmode="decimal" id="cz-dec" value="-1" step="0.1"></div>
      <div><label>Distancia (m)</label><input type="number" inputmode="numeric" id="cz-dist" value="1000" min="0"></div>
    </div>
    <label>Error de rumbo (°)</label>
    <input type="number" inputmode="decimal" id="cz-err" value="5" min="0" step="1">
    <div class="sp"></div><div id="cz-out"></div>`));

  const run = () => {
    const a = ((num(n.querySelector('#cz-a').value) % 360) + 360) % 360;
    const dec = num(n.querySelector('#cz-dec').value);
    const dist = num(n.querySelector('#cz-dist').value);
    const err = num(n.querySelector('#cz-err').value);
    const inv = (a + 180) % 360;
    const mag = ((a - dec) % 360 + 360) % 360;
    const desvio = dist * Math.tan((err * Math.PI) / 180);
    const card = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'][Math.round(a / 22.5) % 16];
    n.querySelector('#cz-out').innerHTML = `
      <div class="kv">
        <div>Azimut</div><div><b>${a.toFixed(0)}° (${card})</b></div>
        <div>Rumbo inverso</div><div><b>${inv.toFixed(0)}°</b></div>
        <div>Azimut magnético</div><div>${mag.toFixed(1)}° (aplicando ${dec}° de declinación)</div>
        <div>Desvío lateral</div><div>${desvio.toFixed(0)} m en ${dist} m con ${err}° de error</div>
      </div>
      <div class="muted">Convenio: declinación este positiva, oeste negativa. En la península ibérica es actualmente pequeña; consulta el valor impreso en tu mapa.</div>`;
  };
  n.addEventListener('input', run);
  run();
  return n;
}

/* ----------------------------- COORDENADAS ----------------------------- */
export function calcCoord() {
  const n = el(wrap('🧮 Conversión de coordenadas', `
    <div class="fieldrow">
      <div><label>Latitud (decimal)</label><input type="number" inputmode="decimal" id="cd-lat" value="40.6565" step="0.00001"></div>
      <div><label>Longitud (decimal)</label><input type="number" inputmode="decimal" id="cd-lon" value="-4.6818" step="0.00001"></div>
    </div>
    <button class="btn ghost wide sm" id="cd-gps" type="button">📍 Usar mi posición actual</button>
    <div class="sp"></div><div id="cd-out"></div>`));

  const toDMS = (v, pos, neg) => {
    const s = v < 0 ? neg : pos;
    v = Math.abs(v);
    const d = Math.floor(v);
    const mF = (v - d) * 60;
    const m = Math.floor(mF);
    const sec = (mF - m) * 60;
    return { dms: `${d}° ${m}' ${sec.toFixed(1)}" ${s}`, dmm: `${d}° ${mF.toFixed(3)}' ${s}` };
  };

  // Conversión geodésica WGS84 → UTM
  const toUTM = (lat, lon) => {
    const a = 6378137.0, f = 1 / 298.257223563;
    const e2 = f * (2 - f), e_2 = e2 / (1 - e2), k0 = 0.9996;
    const zone = Math.floor((lon + 180) / 6) + 1;
    const lon0 = ((zone - 1) * 6 - 180 + 3) * Math.PI / 180;
    const rl = lat * Math.PI / 180, ro = lon * Math.PI / 180;
    const N = a / Math.sqrt(1 - e2 * Math.sin(rl) ** 2);
    const T = Math.tan(rl) ** 2;
    const C = e_2 * Math.cos(rl) ** 2;
    const A = Math.cos(rl) * (ro - lon0);
    const M = a * ((1 - e2 / 4 - 3 * e2 ** 2 / 64 - 5 * e2 ** 3 / 256) * rl
      - (3 * e2 / 8 + 3 * e2 ** 2 / 32 + 45 * e2 ** 3 / 1024) * Math.sin(2 * rl)
      + (15 * e2 ** 2 / 256 + 45 * e2 ** 3 / 1024) * Math.sin(4 * rl)
      - (35 * e2 ** 3 / 3072) * Math.sin(6 * rl));
    const easting = k0 * N * (A + (1 - T + C) * A ** 3 / 6 + (5 - 18 * T + T ** 2 + 72 * C - 58 * e_2) * A ** 5 / 120) + 500000;
    let northing = k0 * (M + N * Math.tan(rl) * (A ** 2 / 2 + (5 - T + 9 * C + 4 * C ** 2) * A ** 4 / 24
      + (61 - 58 * T + T ** 2 + 600 * C - 330 * e_2) * A ** 6 / 720));
    if (lat < 0) northing += 10000000;
    const bands = 'CDEFGHJKLMNPQRSTUVWX';
    const band = lat >= -80 && lat <= 84 ? bands[Math.floor((lat + 80) / 8)] : '?';
    return { zone, band, easting, northing };
  };

  const run = () => {
    const lat = num(n.querySelector('#cd-lat').value);
    const lon = num(n.querySelector('#cd-lon').value);
    const la = toDMS(lat, 'N', 'S'), lo = toDMS(lon, 'E', 'W');
    const u = toUTM(lat, lon);
    n.querySelector('#cd-out').innerHTML = `
      <div class="kv">
        <div>Grados decimales</div><div class="mono"><b>${lat.toFixed(5)}, ${lon.toFixed(5)}</b></div>
        <div>Grados y min. dec.</div><div class="mono">${la.dmm} · ${lo.dmm}</div>
        <div>Grados min. seg.</div><div class="mono">${la.dms} · ${lo.dms}</div>
        <div>UTM (WGS84/ETRS89)</div><div class="mono"><b>${u.zone}${u.band} ${Math.round(u.easting)} ${Math.round(u.northing)}</b></div>
      </div>
      <div class="blk-note">Para dar tu posición al 112, lo más claro es dictar los grados decimales dígito a dígito e indicar la altitud. Recuerda: longitud oeste es NEGATIVA.</div>`;
  };

  n.querySelector('#cd-gps').addEventListener('click', () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => {
        n.querySelector('#cd-lat').value = p.coords.latitude.toFixed(5);
        n.querySelector('#cd-lon').value = p.coords.longitude.toFixed(5);
        run();
      },
      () => { n.querySelector('#cd-out').insertAdjacentHTML('afterbegin', '<div class="blk-warn">No se pudo obtener la posición. Comprueba los permisos de ubicación.</div>'); },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  });
  n.addEventListener('input', run);
  run();
  return n;
}

/* ------------------------------ UNIDADES ------------------------------ */
const UNIDADES = {
  Longitud: { m: 1, km: 1000, cm: 0.01, milla: 1609.344, 'milla náutica': 1852, pie: 0.3048, pulgada: 0.0254, yarda: 0.9144 },
  Peso: { kg: 1, g: 0.001, t: 1000, libra: 0.45359237, onza: 0.0283495 },
  Volumen: { l: 1, ml: 0.001, 'm³': 1000, 'galón US': 3.785411784, 'galón imperial': 4.54609, pinta: 0.473176 },
  Velocidad: { 'km/h': 1, 'm/s': 3.6, 'mph': 1.609344, nudo: 1.852 },
  Presión: { hPa: 1, mbar: 1, atm: 1013.25, mmHg: 1.33322, psi: 68.9476 },
};

export function calcUnidades() {
  const n = el(wrap('🧮 Conversión de unidades', `
    <label>Magnitud</label>
    <select id="cu-mag">${Object.keys(UNIDADES).map((k) => `<option>${k}</option>`).join('')}<option>Temperatura</option></select>
    <div class="fieldrow">
      <div><label>Valor</label><input type="number" inputmode="decimal" id="cu-v" value="1" step="any"></div>
      <div><label>De</label><select id="cu-de"></select></div>
    </div>
    <div class="sp"></div><div id="cu-out"></div>`));

  const fill = () => {
    const mag = n.querySelector('#cu-mag').value;
    const sel = n.querySelector('#cu-de');
    const opts = mag === 'Temperatura' ? ['°C', '°F', 'K'] : Object.keys(UNIDADES[mag]);
    sel.innerHTML = opts.map((o) => `<option>${o}</option>`).join('');
    run();
  };

  const run = () => {
    const mag = n.querySelector('#cu-mag').value;
    const v = num(n.querySelector('#cu-v').value);
    const de = n.querySelector('#cu-de').value;
    let rows = '';
    if (mag === 'Temperatura') {
      let c = v;
      if (de === '°F') c = (v - 32) * 5 / 9;
      if (de === 'K') c = v - 273.15;
      rows = `<div>°C</div><div>${c.toFixed(2)}</div><div>°F</div><div>${(c * 9 / 5 + 32).toFixed(2)}</div><div>K</div><div>${(c + 273.15).toFixed(2)}</div>`;
    } else {
      const tabla = UNIDADES[mag];
      const base = v * tabla[de];
      rows = Object.entries(tabla).map(([u, k]) => `<div>${esc(u)}</div><div>${(base / k).toLocaleString('es-ES', { maximumFractionDigits: 4 })}</div>`).join('');
    }
    n.querySelector('#cu-out').innerHTML = `<div class="kv">${rows}</div>`;
  };

  n.querySelector('#cu-mag').addEventListener('change', fill);
  n.addEventListener('input', run);
  fill();
  return n;
}

/* ------------------------------- MOCHILA ------------------------------- */
export function calcMochila() {
  const n = el(wrap('🧮 Peso de mochila y autonomía energética', `
    <div class="fieldrow">
      <div><label>Tu peso (kg)</label><input type="number" inputmode="decimal" id="cb-p" value="70" min="20" step="0.5"></div>
      <div><label>Peso mochila (kg)</label><input type="number" inputmode="decimal" id="cb-m" value="12" min="0" step="0.1"></div>
    </div>
    <h4>Autonomía energética</h4>
    <div class="fieldrow">
      <div><label>Power bank (mAh)</label><input type="number" inputmode="numeric" id="cb-b" value="20000" min="0"></div>
      <div><label>Batería del móvil (mAh)</label><input type="number" inputmode="numeric" id="cb-t" value="4500" min="100"></div>
    </div>
    <div class="sp"></div><div id="cb-out"></div>`));

  const run = () => {
    const p = num(n.querySelector('#cb-p').value, 70);
    const m = num(n.querySelector('#cb-m').value);
    const b = num(n.querySelector('#cb-b').value);
    const t = num(n.querySelector('#cb-t').value, 4500) || 4500;
    const pct = (m / p) * 100;
    const cargas = (b * 0.65) / t; // ~65 % de eficiencia real
    let ev = 'Adecuado';
    if (pct > 25) ev = 'Excesivo para marchas largas';
    else if (pct > 20) ev = 'Alto: solo para gente entrenada';
    else if (pct < 10) ev = 'Ligero';
    n.querySelector('#cb-out').innerHTML = `
      <div class="kv">
        <div>Porcentaje de tu peso</div><div><b>${pct.toFixed(1)} %</b> — ${ev}</div>
        <div>Referencia recomendada</div><div>máx. 20–25 % (${(p * 0.2).toFixed(1)}–${(p * 0.25).toFixed(1)} kg)</div>
        <div>Cargas completas del móvil</div><div><b>${cargas.toFixed(1)}</b> (eficiencia real ≈ 65 %)</div>
        <div>Días con 1 carga/día</div><div>${Math.floor(cargas)} días</div>
      </div>`;
  };
  n.addEventListener('input', run);
  run();
  return n;
}

export const CALCS = {
  'calc-agua': { t: 'Agua necesaria', f: calcAgua },
  'calc-cloro': { t: 'Cloración de agua', f: calcCloro },
  'calc-comida': { t: 'Reserva alimentaria', f: calcComida },
  'calc-marcha': { t: 'Tiempo de marcha', f: calcMarcha },
  'calc-azimut': { t: 'Rumbo y azimut', f: calcAzimut },
  'calc-coord': { t: 'Coordenadas y UTM', f: calcCoord },
  'calc-unidades': { t: 'Conversión de unidades', f: calcUnidades },
  'calc-mochila': { t: 'Peso de mochila y energía', f: calcMochila },
};

/** Sustituye los marcadores <div data-tool="..."> por la calculadora real. */
export function mountTools(root) {
  root.querySelectorAll('[data-tool]').forEach((slot) => {
    const id = slot.dataset.tool;
    const c = CALCS[id];
    if (c) slot.replaceWith(c.f());
  });
}
