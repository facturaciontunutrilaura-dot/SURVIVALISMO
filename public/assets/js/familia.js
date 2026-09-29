/* =========================================================================
   familia.js — 👨‍👩‍👧‍👦 CENTRO DE COORDINACIÓN FAMILIAR
   Nodos, estado, rutas offline por situación, mapa familiar, plan 72 h
   y plan de reunificación. Todo local, nada sale del dispositivo.
   ========================================================================= */
import { el, esc, toast, uid } from './ui.js';
import * as store from './store.js';
import {
  NODOS_DEFECTO, ESTADOS, PREPARACION_ESTADO, CORREDORES, SITUACIONES,
  VELOCIDADES, CAPAS_POI, CAPAS_ESTADO, SERVICIOS_VERIFICADOS, CAPITALES,
  AVISO_RUTAS, PLAN72,
} from '../../data/content/familia.js';
import { SOURCE_MAP } from '../../data/content/sources.js';

const kv = async (id, def) => (await store.get('kv', id))?.v ?? def;
const setKv = (id, v) => store.put('kv', { id, v });

let RUTAS_GEO = null;
async function rutasGeo() {
  if (RUTAS_GEO) return RUTAS_GEO;
  const r = await fetch('./data/geo/rutas.geojson');
  RUTAS_GEO = await r.json();
  return RUTAS_GEO;
}
const rutaProps = (geo, id) => geo.features.find((f) => f.properties.id === id)?.properties;

export async function nodos() {
  const guardados = await kv('familia.nodos', null);
  if (guardados) return guardados;
  await setKv('familia.nodos', NODOS_DEFECTO);
  return NODOS_DEFECTO;
}

const fmtTiempo = (h) => {
  const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  return `${hh} h ${String(mm).padStart(2, '0')} min`;
};

/* ========================================================================
   PANEL PRINCIPAL
   ======================================================================== */
export async function familiaView() {
  const ns = await nodos();
  const estados = await kv('familia.estados', {});
  const prep = await kv('familia.prep', {});

  const n = el(`<div>
    <a class="btn wide heart" href="#/familia/ir" style="margin-bottom:12px">❤️ QUIERO LLEGAR A MI FAMILIA</a>

    <h2>👨‍👩‍👧‍👦 Estado familiar</h2>
    <div class="muted" style="margin-bottom:8px">Los estados son <b>manuales</b>: la aplicación no puede saber cómo está realmente una persona. Actualízalos tú cuando tengas información.</div>
    <div class="list" id="fa-estado"></div>

    <div class="btnrow" style="margin-top:14px">
      <a class="btn sm" href="#/familia/rutas">🛣️ Rutas offline</a>
      <a class="btn sm ghost" href="#/familia/mapa">🗺 Mapa familiar</a>
      <a class="btn sm ghost" href="#/familia/plan72">🎒 Plan 72 h</a>
      <a class="btn sm ghost" href="#/familia/reunion">🤝 Reunificación</a>
      <a class="btn sm ghost" href="#/familia/offline">📴 Si no hay Internet</a>
      <a class="btn sm ghost" href="#/riesgos/comparar">📊 Comparar riesgo</a>
      <a class="btn sm ghost" href="#/sec/plan-familiar">📇 Contactos y acuerdos</a>
    </div>

    <h2 style="margin-top:18px">📍 Ubicaciones</h2>
    <div id="fa-nodos"></div>
  </div>`);

  function pintaEstado() {
    n.querySelector('#fa-estado').innerHTML = ns.map((nd) => {
      const e = ESTADOS.find((x) => x.id === (estados[nd.id]?.estado || 'nd')) || ESTADOS[4];
      const p = PREPARACION_ESTADO.find((x) => x.id === (prep[nd.id] || 'revisar'));
      const ts = estados[nd.id]?.ts;
      return `<div class="row" style="border-left-color:${e.c}">
        <span style="font-size:1.3rem">${nd.ic}</span>
        <div class="rt"><b>${esc(nd.nombre)}${nd.persona ? ' · ' + esc(nd.persona) : ''}</b>
          <span>${e.ic} ${esc(e.t)}${ts ? ' · ' + new Date(ts).toLocaleString('es-ES') : ''}<br>Preparación: ${p.ic} ${esc(p.t)}</span></div>
        <button class="btn sm ghost" data-est="${esc(nd.id)}">Cambiar</button>
      </div>`;
    }).join('');

    n.querySelectorAll('[data-est]').forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.est;
      const box = el(`<div class="card"><h3>Actualizar ${esc(ns.find((x) => x.id === id).nombre)}</h3>
        <label>Estado de la persona</label>
        <div class="btnrow">${ESTADOS.map((e) => `<button class="btn sm ghost" data-se="${e.id}" type="button">${e.ic} ${esc(e.t)}</button>`).join('')}</div>
        <label>Estado de preparación</label>
        <div class="btnrow">${PREPARACION_ESTADO.map((p) => `<button class="btn sm ghost" data-sp="${p.id}" type="button">${p.ic} ${esc(p.t)}</button>`).join('')}</div>
        <button class="btn ghost wide sm" data-cerrar type="button">Cerrar</button></div>`);
      b.closest('.row').after(box);
      box.querySelectorAll('[data-se]').forEach((x) => x.addEventListener('click', async () => {
        estados[id] = { estado: x.dataset.se, ts: Date.now() };
        await setKv('familia.estados', estados);
        box.remove(); pintaEstado(); toast('Estado actualizado');
      }));
      box.querySelectorAll('[data-sp]').forEach((x) => x.addEventListener('click', async () => {
        prep[id] = x.dataset.sp;
        await setKv('familia.prep', prep);
        box.remove(); pintaEstado(); toast('Preparación actualizada');
      }));
      box.querySelector('[data-cerrar]').addEventListener('click', () => box.remove());
    }));
  }

  function pintaNodos() {
    n.querySelector('#fa-nodos').innerHTML = ns.map((nd, i) => `
      <details class="card"><summary>${nd.ic} ${esc(nd.nombre)}${nd.persona ? ' — ' + esc(nd.persona) : ''} <span class="badge">${nd.rol === 'base' ? 'base' : 'familia'}</span></summary><div>
        <div class="fieldrow">
          <div><label>Nombre del lugar</label><input data-f="${i}::nombre" value="${esc(nd.nombre)}"></div>
          <div><label>Persona</label><input data-f="${i}::persona" value="${esc(nd.persona || '')}"></div>
        </div>
        <div class="fieldrow">
          <div><label>Código postal</label><input data-f="${i}::cp" value="${esc(nd.cp || '')}" inputmode="numeric"></div>
          <div><label>Provincia</label><input data-f="${i}::prov" value="${esc(nd.prov || '')}"></div>
        </div>
        <label>Teléfonos</label><input data-f="${i}::tel" value="${esc(nd.tel || '')}" inputmode="tel" placeholder="Separados por comas">
        <label>Dirección</label><input data-f="${i}::dir" value="${esc(nd.dir || '')}">
        <label>Punto de encuentro acordado</label><input data-f="${i}::encuentro" value="${esc(nd.encuentro || '')}" placeholder="Un lugar concreto que todos conozcáis">
        <label>Notas</label><textarea data-f="${i}::notas">${esc(nd.notas || '')}</textarea>
        <h4>Personas en esta ubicación</h4>
        <div class="fieldrow">
          <div><label>Adultos</label><input type="number" min="0" data-p="${i}::adultos" value="${nd.personas?.adultos ?? 0}"></div>
          <div><label>Niños</label><input type="number" min="0" data-p="${i}::ninos" value="${nd.personas?.ninos ?? 0}"></div>
        </div>
        <div class="fieldrow">
          <div><label>Mayores</label><input type="number" min="0" data-p="${i}::mayores" value="${nd.personas?.mayores ?? 0}"></div>
          <div><label>Mascotas</label><input type="number" min="0" data-p="${i}::mascotas" value="${nd.personas?.mascotas ?? 0}"></div>
        </div>
        <div class="muted">Todo se guarda automáticamente y <b>solo en este dispositivo</b>.</div>
      </div></details>`).join('');

    const guardar = async () => { await setKv('familia.nodos', ns); };
    n.querySelectorAll('[data-f]').forEach((inp) => {
      let to;
      inp.addEventListener('input', () => {
        const [i, k] = inp.dataset.f.split('::');
        ns[+i][k] = inp.value;
        clearTimeout(to); to = setTimeout(guardar, 350);
      });
    });
    n.querySelectorAll('[data-p]').forEach((inp) => {
      let to;
      inp.addEventListener('input', () => {
        const [i, k] = inp.dataset.p.split('::');
        ns[+i].personas = ns[+i].personas || {};
        ns[+i].personas[k] = Math.max(0, parseInt(inp.value, 10) || 0);
        clearTimeout(to); to = setTimeout(guardar, 350);
      });
    });
  }

  pintaEstado(); pintaNodos();
  return n;
}

/* ========================================================================
   RUTAS
   ======================================================================== */
function tarjetaRuta(p, situacion, sentido) {
  const vel = VELOCIDADES[situacion.vel];
  const horas = p.kmEstimados / vel.v;
  const locs = sentido === 'ida' ? p.localidades : [...p.localidades].reverse();
  return `<article class="ruta ${p.tipo}">
    <h3>${p.tipo === 'principal' ? '🅰️' : '🔀'} ${esc(p.titulo)}</h3>
    <div class="kv">
      <div>Vía</div><div>${esc(p.via)}</div>
      <div>Distancia aproximada</div><div><b>${p.kmEstimados} km</b></div>
      <div>Tiempo estimado</div><div><b>${fmtTiempo(horas)}</b> a ${vel.v} km/h<br><span class="muted">${esc(vel.t)}</span></div>
      <div>Localidades</div><div>${locs.length}</div>
    </div>
    <details><summary>Ver localidades del itinerario</summary><div>
      <ol class="locs">${locs.map((l) => `<li>${esc(l)}${CAPITALES.includes(l) ? ' <span class="badge">capital de provincia · hospital de referencia</span>' : ''}</li>`).join('')}</ol>
      <div class="muted">Vértices calculados sobre los centroides municipales del IGN. Es el corredor real, no una traza calle a calle.</div>
    </div></details>
  </article>`;
}

export async function rutasView(preset = {}) {
  const geo = await rutasGeo();
  const n = el(`<div>
    <div class="blk-warn">${esc(AVISO_RUTAS)}</div>

    <div class="card">
      <label>Corredor</label>
      <select id="ru-cor">${CORREDORES.map((c) => `<option value="${c.id}">${c.ic} ${esc(c.t)}</option>`).join('')}</select>
      <label>Sentido</label>
      <div class="btnrow" id="ru-sent">
        <button class="btn sm" data-s="ida" type="button">Ávila → destino</button>
        <button class="btn sm ghost" data-s="vuelta" type="button">Destino → Ávila</button>
      </div>
      <label>Situación</label>
      <select id="ru-sit">${SITUACIONES.map((s) => `<option value="${s.id}">${s.ic} ${esc(s.t)}</option>`).join('')}</select>
    </div>

    <div id="ru-out"></div>
    <div class="btnrow"><a class="btn ghost" href="#/familia/mapa">🗺 Ver las rutas en el mapa</a></div>
  </div>`);

  let corredor = preset.corredor || CORREDORES[0].id;
  let sentido = preset.sentido || 'ida';
  let sit = preset.situacion || 'normal';
  n.querySelector('#ru-cor').value = corredor;
  n.querySelector('#ru-sit').value = sit;
  n.querySelectorAll('#ru-sent button').forEach((b) => b.classList.toggle('ghost', b.dataset.s !== sentido));

  function pinta() {
    const c = CORREDORES.find((x) => x.id === corredor);
    const s = SITUACIONES.find((x) => x.id === sit);
    const props = c.rutas.map((id) => rutaProps(geo, id)).filter(Boolean);
    const capas = s.capas.map((k) => CAPAS_POI.find((x) => x.id === k)).filter(Boolean);

    n.querySelector('#ru-out').innerHTML = `
      <div class="emg-hd" style="background:var(--panel2);border-color:var(--olive2)">
        <h1 style="color:var(--olive3)">${s.ic} ${esc(s.t)}</h1>
        <p style="color:var(--dim)">${sentido === 'ida' ? 'Ávila → ' + esc(c.t.split('⇄')[1].trim()) : esc(c.t.split('⇄')[1].trim()) + ' → Ávila'}</p>
      </div>

      <div class="card"><h3>Lectura de la situación</h3>
        <p>${esc(s.resumen)}</p>
        <div class="blk-note"><b>Ruta recomendada:</b> ${esc(s.ruta)}</div>
      </div>

      <h2>Rutas</h2>
      ${props.map((p) => tarjetaRuta(p, s, sentido)).join('')}

      <div class="card"><h3>✅ Antes de salir</h3><ol class="steps">${s.antes.map((i) => `<li>${esc(i)}</li>`).join('')}</ol></div>
      <div class="card"><h3>⚠️ Ojo con esto</h3><ol class="steps no">${s.ojo.map((i) => `<li>${esc(i)}</li>`).join('')}</ol></div>

      <div class="card"><h3>🗂 Capas de puntos de interés prioritarias</h3>
        ${capas.map((k) => {
          const e = CAPAS_ESTADO[k.estado];
          return `<div class="row"><span>${k.ic}</span><div class="rt"><b>${esc(k.t)}</b><span>${esc(k.d)}<br>${e.ic} ${esc(e.t)}</span></div></div>`;
        }).join('')}
        <div class="blk-warn">Esta aplicación <b>no incluye un directorio de hospitales, gasolineras ni alojamientos con coordenadas</b>, porque no ha sido posible verificarlos contra una fuente oficial en formato de datos. Inventarlos sería justo lo que este proyecto prohíbe. Lo que sí tienes: las localidades reales del itinerario (IGN), las capitales de provincia señaladas (donde está el hospital de referencia), el directorio verificado de emergencias, y la posibilidad de añadir tus propios puntos e importar capas oficiales desde el mapa.</div>
        <a class="btn ghost sm" href="#/mapa">Añadir mis puntos verificados</a>
      </div>

      <div class="card"><h3>📇 Servicios verificados</h3>
        <div class="tw"><table><thead><tr><th>Servicio</th><th>Dirección</th><th>Teléfono</th></tr></thead>
        <tbody>${SERVICIOS_VERIFICADOS.map((v) => `<tr><td>${esc(v.nombre)}</td><td>${esc(v.dir)}</td><td class="mono">${esc(v.tel)}</td></tr>`).join('')}</tbody></table></div>
        <div class="muted">Datos publicados por las fuentes oficiales citadas. Verifícalos antes de necesitarlos: los teléfonos cambian.</div>
      </div>`;
  }

  n.querySelector('#ru-cor').addEventListener('change', (e) => { corredor = e.target.value; pinta(); });
  n.querySelector('#ru-sit').addEventListener('change', (e) => { sit = e.target.value; pinta(); });
  n.querySelectorAll('#ru-sent button').forEach((b) => b.addEventListener('click', () => {
    sentido = b.dataset.s;
    n.querySelectorAll('#ru-sent button').forEach((x) => x.classList.toggle('ghost', x !== b));
    pinta();
  }));

  pinta();
  return n;
}

/* ========================================================================
   ASISTENTE "QUIERO LLEGAR A MI FAMILIA"
   ======================================================================== */
export async function irView() {
  const ns = await nodos();
  const destinos = ns.filter((x) => x.rol === 'familia');

  const n = el(`<div>
    <div class="emg-hd"><h1>❤️ QUIERO LLEGAR A MI FAMILIA</h1><p>Tres preguntas y tienes el plan.</p></div>
    <div class="card"><h3>1 · ¿A quién quieres llegar?</h3>
      <div class="btnrow" id="w-quien">
        ${destinos.map((d) => `<button class="btn ghost" data-d="${esc(d.id)}" type="button">${d.ic} ${esc((d.persona || d.nombre).toUpperCase())} — ${esc(d.nombre)}</button>`).join('')}
      </div>
    </div>
    <div class="card"><h3>2 · ¿En qué sentido?</h3>
      <div class="btnrow" id="w-sent">
        <button class="btn ghost" data-s="ida" type="button">Yo voy desde Ávila</button>
        <button class="btn ghost" data-s="vuelta" type="button">Ellos vienen a Ávila</button>
      </div>
    </div>
    <div class="card"><h3>3 · ¿En qué situación?</h3>
      <div class="btnrow" id="w-sit">
        ${SITUACIONES.map((s) => `<button class="btn ghost sm" data-s="${s.id}" type="button">${s.ic} ${esc(s.t)}</button>`).join('')}
      </div>
    </div>
    <button class="btn wide" id="w-go" type="button" disabled>Ver plan</button>
    <div id="w-out"></div>
  </div>`);

  const sel = { d: null, s: null, sit: null };
  const check = () => { n.querySelector('#w-go').disabled = !(sel.d && sel.s && sel.sit); };
  const grupo = (cont, key) => n.querySelectorAll(`${cont} button`).forEach((b) => b.addEventListener('click', () => {
    sel[key] = b.dataset.d || b.dataset.s;
    n.querySelectorAll(`${cont} button`).forEach((x) => x.classList.toggle('ghost', x !== b));
    check();
  }));
  grupo('#w-quien', 'd'); grupo('#w-sent', 's'); grupo('#w-sit', 'sit');

  n.querySelector('#w-go').addEventListener('click', async () => {
    const out = n.querySelector('#w-out');
    out.innerHTML = '<div class="muted">Preparando plan…</div>';
    const vista = await rutasView({ corredor: sel.d, sentido: sel.s, situacion: sel.sit });
    out.replaceChildren(vista);
    out.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  return n;
}

/* ========================================================================
   MAPA FAMILIAR
   ======================================================================== */
export async function mapaFamiliarView() {
  const { loadLeaflet } = await import('./maps.js');
  const n = el(`<div>
    <div class="card">
      <label>Mostrar rutas del corredor</label>
      <select id="mf-cor"><option value="">Ninguna</option>${CORREDORES.map((c) => `<option value="${c.id}">${esc(c.t)}</option>`).join('')}</select>
    </div>
    <div id="map"></div>
    <div class="muted" id="mf-st" style="margin-top:6px"></div>
    <div class="card"><h3>Qué estás viendo</h3>
      <ul>
        <li><b>Municipios y provincias</b>: geometría del Equipamiento Geográfico de Referencia Nacional del IGN.</li>
        <li><b>Nodos familiares</b>: Ávila, Terrassa y Getafe, situados en el centroide de su término municipal.</li>
        <li><b>Rutas</b>: polilínea entre centroides de las localidades reales del corredor. Sigue el eje viario, pero <b>no es una traza calle a calle</b>.</li>
        <li><b>Teselas</b>: solo las que hayas descargado desde 🗺 Mapa → Descargar área.</li>
      </ul>
      <div class="blk-note">El GPS del teléfono funciona <b>sin Internet</b> (usa satélites GNSS). Lo que necesita conexión es descargar los mapas, no posicionarte. Por eso, si has descargado el área, "estás aquí" funciona en modo avión.</div>
      <div class="btnrow"><button class="btn sm" id="mf-me" type="button">🎯 Estás aquí</button>
      <a class="btn sm ghost" href="#/mapa">⬇ Descargar área</a></div>
    </div>
  </div>`);

  let L;
  try { L = await loadLeaflet(); } catch {
    n.querySelector('#map').innerHTML = '<div class="blk-warn">No se ha podido cargar el motor de mapas.</div>';
    return n;
  }

  const map = L.map(n.querySelector('#map'), { zoomControl: true }).setView([40.9, -2.5], 7);

  // Capa vectorial base
  try {
    const prov = await (await fetch('./data/geo/es-provincias.geojson')).json();
    L.geoJSON(prov, { style: { color: '#3c4a3e', weight: 1, fillColor: '#141a16', fillOpacity: 0.7 } }).addTo(map);
  } catch { /* opcional */ }

  // Municipios de los nodos
  try {
    const mf = await (await fetch('./data/geo/municipios-familia.geojson')).json();
    L.geoJSON(mf, { style: { color: '#a1a265', weight: 2, fillColor: '#565e35', fillOpacity: 0.45 },
      onEachFeature: (f, l) => l.bindPopup(`<b>${esc(f.properties.nombre)}</b><br><span class="muted">Término municipal · IGN</span>`) }).addTo(map);
  } catch { /* opcional */ }

  // Nodos
  const ns = await nodos();
  try {
    const nodosGeo = await (await fetch('./data/geo/nodos-familia.geojson')).json();
    const grupo = L.featureGroup();
    for (const f of nodosGeo.features) {
      const nd = ns.find((x) => x.id === f.properties.id) || {};
      const [lon, lat] = f.geometry.coordinates;
      L.marker([lat, lon], {
        icon: L.divIcon({ className: '', html: `<div class="fmk">${nd.ic || '📍'}</div>`, iconSize: [30, 30], iconAnchor: [15, 28] }),
      }).bindPopup(`<b>${esc(nd.nombre || f.properties.nombre)}</b>${nd.persona ? '<br>' + esc(nd.persona) : ''}
        ${nd.encuentro ? '<br>📍 ' + esc(nd.encuentro) : ''}
        <br><span class="mono muted">${lat.toFixed(4)}, ${lon.toFixed(4)}</span>
        <br><span class="muted">Centroide municipal (IGN)</span>`).addTo(grupo);
    }
    grupo.addTo(map);
    map.fitBounds(grupo.getBounds().pad(0.3));
  } catch { /* opcional */ }

  // Rutas
  const capaRutas = L.layerGroup().addTo(map);
  const geo = await rutasGeo();
  const colores = { principal: '#a1a265', alternativa: '#b07a45' };

  function pintaRutas(corId) {
    capaRutas.clearLayers();
    if (!corId) { n.querySelector('#mf-st').textContent = ''; return; }
    const c = CORREDORES.find((x) => x.id === corId);
    let total = 0;
    for (const id of c.rutas) {
      const f = geo.features.find((x) => x.properties.id === id);
      if (!f) continue;
      total++;
      L.geoJSON(f, {
        style: { color: colores[f.properties.tipo], weight: f.properties.tipo === 'principal' ? 4 : 2.5, opacity: 0.9, dashArray: f.properties.tipo === 'principal' ? null : '6 5' },
      }).bindPopup(`<b>${esc(f.properties.titulo)}</b><br>${esc(f.properties.via)}<br><b>${f.properties.kmEstimados} km</b> aprox.<br><span class="muted">Estado de las vías: DESCONOCIDO. Verificar antes de salir.</span>`).addTo(capaRutas);
    }
    if (capaRutas.getLayers().length) map.fitBounds(L.featureGroup(capaRutas.getLayers()).getBounds().pad(0.15));
    n.querySelector('#mf-st').innerHTML = `${total} rutas dibujadas · <b>línea continua</b> = principal · <b>discontinua</b> = alternativa`;
  }

  n.querySelector('#mf-cor').addEventListener('change', (e) => pintaRutas(e.target.value));

  n.querySelector('#mf-me').addEventListener('click', () => {
    if (!navigator.geolocation) return toast('Geolocalización no disponible');
    toast('Buscando posición por GPS…');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const ll = [p.coords.latitude, p.coords.longitude];
        map.setView(ll, 12);
        L.circleMarker(ll, { radius: 7, color: '#a1a265', fillColor: '#a1a265', fillOpacity: 1 })
          .bindPopup(`<b>Estás aquí</b><br><span class="mono">${ll[0].toFixed(5)}, ${ll[1].toFixed(5)}</span><br>±${p.coords.accuracy.toFixed(0)} m`)
          .addTo(map).openPopup();
      },
      () => toast('No se pudo obtener la posición. Puedes navegar manualmente por el mapa.'),
      { enableHighAccuracy: true, timeout: 20000 }
    );
  });

  setTimeout(() => map.invalidateSize(), 120);
  return n;
}

/* ========================================================================
   PLAN 72 HORAS
   ======================================================================== */
export async function plan72View() {
  const ns = await nodos();
  const n = el(`<div>
    <div class="blk-note">Cálculo automático a partir de las personas que hayas indicado en cada ubicación. Cámbialas en 👨‍👩‍👧‍👦 Familia → Ubicaciones.</div>
    <div id="p72"></div>
  </div>`);

  n.querySelector('#p72').innerHTML = ns.map((nd) => {
    const p = { adultos: 0, ninos: 0, mayores: 0, mascotas: 0, ...(nd.personas || {}) };
    const tot = p.adultos + p.ninos + p.mayores;
    return `<div class="card"><h3>${nd.ic} ${esc(nd.nombre)}${nd.persona ? ' · ' + esc(nd.persona) : ''}</h3>
      <div class="muted">${tot} persona(s): ${p.adultos} adultos, ${p.ninos} niños, ${p.mayores} mayores${p.mascotas ? ` · ${p.mascotas} mascota(s)` : ''}</div>
      ${tot === 0 ? '<div class="blk-warn">Indica cuántas personas hay en esta ubicación para calcular el plan.</div>' : `
      <div class="kv">${Object.values(PLAN72).map((it) => `<div>${it.ic} ${esc(it.t)}</div><div><b>${esc(String(it.calc(p)))}</b><br><span class="muted">${esc(it.nota)}</span></div>`).join('')}</div>`}
      <div class="btnrow"><a class="btn sm ghost" href="#/check/nivel2">☑ Checklist 72 h</a>
      <a class="btn sm ghost" href="#/check/bob">🎒 Mochila</a></div>
    </div>`;
  }).join('');

  return n;
}

/* ========================================================================
   PLAN DE REUNIFICACIÓN
   ======================================================================== */
export async function reunionView() {
  const ns = await nodos();
  const extra = await kv('familia.encuentros', []);

  const n = el(`<div>
    <div class="blk-note">Un plan de reunificación sirve para decidir <b>en frío</b> qué hacéis si ocurre algo. Escribidlo, acordadlo en voz alta e imprimidlo. Todo se guarda solo en este dispositivo.</div>

    <h2>Puntos principales</h2>
    <div class="list">${ns.map((nd, i) => `<div class="row"><span style="font-size:1.3rem">${nd.ic}</span>
      <div class="rt"><b>PUNTO ${String.fromCharCode(65 + i)} · ${esc(nd.nombre)}</b>
      <span>${esc(nd.persona || '—')}${nd.encuentro ? '<br>📍 ' + esc(nd.encuentro) : '<br><span style="color:var(--amber)">Sin punto de encuentro acordado</span>'}</span></div></div>`).join('')}</div>

    <h2>Puntos de encuentro alternativos</h2>
    <div id="re-list" class="list"></div>
    <details class="card"><summary>➕ Añadir punto alternativo</summary><div>
      <label>Nombre del punto</label><input id="re-n" placeholder="Ej. Casa de la tía en X, aparcamiento del polideportivo…">
      <label>Localidad</label><input id="re-l">
      <label>Cómo se llega</label><textarea id="re-c" placeholder="Referencias que todos entendáis, sin depender del móvil"></textarea>
      <label>Cuándo se usa</label><textarea id="re-u" placeholder="Ej. si no se puede llegar a Ávila y las comunicaciones no funcionan"></textarea>
      <button class="btn wide" id="re-go" type="button" style="margin-top:10px">Guardar</button>
      <div class="blk-warn">No incluyas instalaciones sensibles ni lugares peligrosos. Elige sitios abiertos, conocidos por todos y fáciles de describir sin mapa.</div>
    </div></details>

    <div class="card"><h3>Preguntas que hay que responder juntos</h3>
      <ol class="steps">
        <li>¿Qué hacemos si no podemos volver a casa?</li>
        <li>¿Dónde nos encontramos si nos separamos, y a qué hora?</li>
        <li>¿Quién recoge a quién y en qué orden?</li>
        <li>¿Qué hacemos si no funcionan los móviles?</li>
        <li>¿Cuál es nuestro contacto externo fuera de la zona?</li>
        <li>¿Cuánto esperamos en un punto antes de pasar al siguiente?</li>
        <li>¿Quién se ocupa de las mascotas y de la documentación?</li>
      </ol>
      <a class="btn ghost wide sm" href="#/sec/plan-familiar">Responderlas en el plan familiar</a>
    </div>

    <button class="btn wide ghost" id="re-print" type="button">🖨 Imprimir plan de reunificación</button>
  </div>`);

  function pinta() {
    n.querySelector('#re-list').innerHTML = extra.length
      ? extra.map((e) => `<div class="row"><span>📍</span><div class="rt"><b>${esc(e.n)}</b>
          <span>${esc(e.l || '')}${e.c ? '<br>' + esc(e.c) : ''}${e.u ? '<br><i>' + esc(e.u) + '</i>' : ''}</span></div>
          <button class="btn sm danger" data-del="${esc(e.id)}">✕</button></div>`).join('')
      : '<p class="muted">Ninguno todavía. Añade al menos uno fuera de vuestra zona habitual.</p>';
    n.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
      const i = extra.findIndex((x) => x.id === b.dataset.del);
      extra.splice(i, 1); await setKv('familia.encuentros', extra); pinta();
    }));
  }

  n.querySelector('#re-go').addEventListener('click', async () => {
    const nm = n.querySelector('#re-n').value.trim();
    if (!nm) return toast('Indica un nombre');
    extra.push({ id: uid(), n: nm, l: n.querySelector('#re-l').value.trim(), c: n.querySelector('#re-c').value.trim(), u: n.querySelector('#re-u').value.trim() });
    await setKv('familia.encuentros', extra);
    ['#re-n', '#re-l', '#re-c', '#re-u'].forEach((s) => { n.querySelector(s).value = ''; });
    pinta(); toast('Punto guardado en este dispositivo');
  });
  n.querySelector('#re-print').addEventListener('click', () => window.print());

  pinta();
  return n;
}

/* ========================================================================
   MODO "SI NO HAY INTERNET"
   ======================================================================== */
export async function offlineView() {
  const ns = await nodos();
  const geo = await rutasGeo();
  const tiles = await store.count('tiles');
  const puntos = await store.all('puntos');
  const contactos = await store.all('contactos');

  const n = el(`<div>
    <div class="emg-hd"><h1>📴 PLAN OFFLINE</h1><p>Qué sigue funcionando cuando no hay nada.</p></div>

    <div class="card"><h3>Simulación de escenario</h3>
      <div class="sim">
        <label class="sw"><input type="checkbox" id="s-net" checked> Internet</label>
        <label class="sw"><input type="checkbox" id="s-gps" checked> GPS</label>
        <label class="sw"><input type="checkbox" id="s-dat" checked> Datos móviles</label>
        <label class="sw"><input type="checkbox" id="s-voz" checked> Llamadas</label>
      </div>
      <div class="muted">Desactiva lo que hayas perdido y verás qué te queda.</div>
      <div id="s-out"></div>
    </div>

    <div class="card"><h3>Disponible ahora mismo en este dispositivo</h3>
      <div class="kv">
        <div>Manual completo</div><div>✅ Sí, íntegro</div>
        <div>Escenarios de emergencia</div><div>✅ Sí</div>
        <div>Mapa vectorial IGN</div><div>✅ Sí (provincias, municipios de Ávila, nodos y rutas)</div>
        <div>Teselas de mapa descargadas</div><div>${tiles ? `✅ ${tiles}` : '<span style="color:var(--amber)">⚠ Ninguna — descárgalas con Wi-Fi</span>'}</div>
        <div>Rutas familiares</div><div>✅ ${geo.features.length} rutas</div>
        <div>Puntos personales</div><div>${puntos.length ? '✅ ' + puntos.length : '<span style="color:var(--amber)">⚠ Ninguno</span>'}</div>
        <div>Contactos del plan</div><div>${contactos.length ? '✅ ' + contactos.length : '<span style="color:var(--amber)">⚠ Ninguno</span>'}</div>
        <div>Calculadoras, checklists y juegos</div><div>✅ Sí</div>
      </div>
    </div>

    <div class="card"><h3>📡 GPS con y sin Internet</h3>
      <div class="kv">
        <div>GPS <b>sin</b> Internet</div><div>Funciona. El receptor GNSS del teléfono calcula la posición a partir de las señales de los satélites: no necesita red. Lo que tarda más es el primer posicionamiento, porque sin asistencia de red el teléfono debe descargar los datos orbitales directamente de los satélites (puede tardar minutos y necesita cielo despejado).</div>
        <div>GPS <b>con</b> Internet</div><div>Igual de preciso, pero el primer posicionamiento es casi inmediato porque el teléfono recibe los datos orbitales y una posición aproximada por la red (A-GNSS). Además puede afinar con wifi y antenas de telefonía.</div>
        <div>Los mapas</div><div>Los mapas SÍ necesitan haberse descargado antes. Por eso el bloque crítico es descargar tu área con Wi-Fi: sin teselas verás tu posición sobre la capa vectorial, que sigue siendo utilizable.</div>
        <div>Si deniegas permisos</div><div>No pasa nada: puedes navegar el mapa manualmente y usar coordenadas guardadas.</div>
      </div>
      <div class="btnrow"><a class="btn sm" href="#/familia/mapa">🎯 Probar "estás aquí"</a>
      <a class="btn sm ghost" href="#/sec/orientacion">🧭 Brújula y coordenadas</a></div>
    </div>

    <div class="card"><h3>Tarjeta de bolsillo</h3>
      <div class="qcard"><h4>SIN INTERNET Y SIN COBERTURA</h4><ol>
        <li>Ejecuta el plan acordado: no improvises.</li>
        <li>Ve al punto de encuentro y espera el tiempo pactado.</li>
        <li>Radio a pilas para informarte. El 112 puede funcionar aunque tu operador no dé servicio.</li>
        <li>Mensajes de texto antes que llamadas: salen con cobertura mínima.</li>
        <li>Anota la hora y las decisiones que tomas.</li>
      </ol></div>
      ${ns.map((nd) => `<div class="row"><span>${nd.ic}</span><div class="rt"><b>${esc(nd.nombre)}${nd.persona ? ' · ' + esc(nd.persona) : ''}</b>
        <span>${nd.tel ? '📞 ' + esc(nd.tel) : 'Sin teléfono anotado'}${nd.encuentro ? '<br>📍 ' + esc(nd.encuentro) : ''}</span></div></div>`).join('')}
      <button class="btn ghost wide sm" id="of-print" type="button" style="margin-top:8px">🖨 Imprimir</button>
    </div>
  </div>`);

  const sim = () => {
    const net = n.querySelector('#s-net').checked;
    const gps = n.querySelector('#s-gps').checked;
    const dat = n.querySelector('#s-dat').checked;
    const voz = n.querySelector('#s-voz').checked;
    const f = [];
    if (!net) f.push('❌ Sin Internet → esta app funciona igual. No podrás descargar mapas nuevos ni actualizar contenidos.');
    if (!dat) f.push('❌ Sin datos móviles → usa SMS. La app no los necesita.');
    if (!voz) f.push('❌ Sin llamadas → el 112 puede seguir funcionando enganchándose a la red de otro operador. Prueba también los SMS.');
    if (!gps) f.push('❌ Sin GPS → navega el mapa manualmente y usa las coordenadas y puntos que tengas guardados. La brújula en modo manual y los métodos naturales siguen sirviendo.');
    if (!net && !gps && !dat && !voz) f.push('🎯 Escenario completo: te quedan el manual íntegro, el mapa vectorial, las rutas, tus puntos, las checklists, las calculadoras y el plan familiar. Es exactamente el escenario para el que se diseñó esta aplicación.');
    if (net && gps && dat && voz) f.push('✅ Todo disponible. Aprovecha para descargar teselas del área, exportar tus datos y revisar el plan familiar.');
    n.querySelector('#s-out').innerHTML = `<ul>${f.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
  };
  n.querySelectorAll('.sim input').forEach((i) => i.addEventListener('change', sim));
  n.querySelector('#of-print').addEventListener('click', () => window.print());
  sim();
  return n;
}
