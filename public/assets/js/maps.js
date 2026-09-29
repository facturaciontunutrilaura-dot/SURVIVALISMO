/* =========================================================================
   maps.js — mapas offline con Leaflet
   ---------------------------------------------------------------------------
   ARQUITECTURA (decisión técnica documentada en el README):

   1) CAPA BASE VECTORIAL SIEMPRE OFFLINE
      GeoJSON de provincias, comunidades autónomas y municipios de Ávila,
      derivado del Equipamiento Geográfico de Referencia Nacional del IGN
      (paquete es-atlas, MIT). Pesa ~390 KB y va en el precache del Service
      Worker: funciona sin Internet desde la primera carga, siempre.

   2) TESELAS RÁSTER BAJO DEMANDA, GUARDADAS EN INDEXEDDB
      El usuario descarga el área que le interesa mientras tiene conexión.
      Las teselas se guardan como Blob en IndexedDB y una TileLayer propia
      las sirve desde ahí. Sin conexión y sin tesela cacheada, se muestra la
      capa vectorial debajo.

   3) CAPAS PROPIAS IMPORTABLES
      El usuario puede importar cualquier GeoJSON oficial (zonas inundables
      de la CHD, cartografía de riesgo de la JCyL, capas del IGN…). Se
      guardan en IndexedDB y quedan disponibles offline.

   POR QUÉ NO MBTiles/PMTiles NI MAPAS VECTORIALES COMPLETOS:
      · MBTiles es SQLite: en navegador exige cargar sql.js (~1,5 MB de WASM)
        y el fichero entero en memoria. Frágil en móviles con archivos grandes.
      · PMTiles funciona por HTTP Range: sin servidor no hay rangos, y guardar
        el fichero completo en IndexedDB para leer rangos manualmente añade
        mucha complejidad para el mismo resultado.
      · Un mapa vectorial de toda España en formato MVT ronda varios GB.
      La combinación vectorial ligera + teselas del área elegida cubre el caso
      real de uso con una fracción del peso y sin dependencias externas.
   ========================================================================= */

import * as store from './store.js';
import { el, esc, toast, uid, fmtBytes } from './ui.js';

let L = null;

/** Carga Leaflet desde el propio proyecto (nunca desde una CDN). */
export function loadLeaflet() {
  if (L) return Promise.resolve(L);
  if (window.L) { L = window.L; return Promise.resolve(L); }
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = './assets/vendor/leaflet/leaflet.js';
    s.onload = () => { L = window.L; res(L); };
    s.onerror = () => rej(new Error('No se pudo cargar Leaflet'));
    document.head.appendChild(s);
  });
}

/* ------------------------- Fuentes de teselas ------------------------- */
export const TILE_SOURCES = {
  osm: {
    t: 'OpenStreetMap estándar',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    max: 19,
    attr: '© colaboradores de OpenStreetMap',
  },
  topo: {
    t: 'OpenTopoMap (topográfico, curvas de nivel)',
    url: 'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
    max: 17,
    attr: 'Cartografía © OpenTopoMap (CC-BY-SA) · Datos © OpenStreetMap',
  },
};

const tileKey = (src, z, x, y) => `${src}/${z}/${x}/${y}`;

/** Tesela transparente 1×1: evita el icono de "imagen rota" cuando no hay
 *  tesela cacheada ni conexión. Debajo sigue viéndose la capa vectorial. */
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

async function getTile(src, z, x, y) {
  const r = await store.get('tiles', tileKey(src, z, x, y));
  return r?.blob || null;
}
async function saveTile(src, z, x, y, blob) {
  return store.put('tiles', { id: tileKey(src, z, x, y), blob, src, z, ts: Date.now() });
}

/** TileLayer que lee de IndexedDB y, si hay red, completa y cachea. */
function makeOfflineLayer(Lf, srcId) {
  const cfg = TILE_SOURCES[srcId];
  return Lf.TileLayer.extend({
    createTile(coords, done) {
      const img = document.createElement('img');
      img.alt = '';
      const { z, x, y } = coords;
      getTile(srcId, z, x, y)
        .then((blob) => {
          if (blob) {
            img.src = URL.createObjectURL(blob);
            img.onload = () => { URL.revokeObjectURL(img.src); done(null, img); };
            return;
          }
          if (!navigator.onLine) { img.src = BLANK; done(null, img); return; }
          const url = cfg.url.replace('{z}', z).replace('{x}', x).replace('{y}', y);
          fetch(url, { mode: 'cors' })
            .then((r) => (r.ok ? r.blob() : Promise.reject(new Error('HTTP ' + r.status))))
            .then((b) => {
              saveTile(srcId, z, x, y, b).catch(() => {});
              img.src = URL.createObjectURL(b);
              img.onload = () => { URL.revokeObjectURL(img.src); done(null, img); };
            })
            .catch(() => { img.src = BLANK; done(null, img); });
        })
        .catch(() => { img.src = BLANK; done(null, img); });
      return img;
    },
  });
}

/* ------------------------- Capas vectoriales ------------------------- */
const GEO_FILES = {
  provincias: './data/geo/es-provincias.geojson',
  ccaa: './data/geo/es-ccaa.geojson',
  avilaMun: './data/geo/avila-municipios.geojson',
  avilaCen: './data/geo/avila-centroides.geojson',
};
const geoCache = {};

async function loadGeo(k) {
  if (geoCache[k]) return geoCache[k];
  const r = await fetch(GEO_FILES[k]);
  if (!r.ok) throw new Error('No se pudo cargar la capa ' + k);
  geoCache[k] = await r.json();
  return geoCache[k];
}

/* --------------------------- Puntos personales --------------------------- */
export const TIPOS_PUNTO = [
  { id: 'casa', t: 'Casa', ic: '🏠', c: '#9cb768' },
  { id: 'familia', t: 'Familia', ic: '👨‍👩‍👧', c: '#cbbf9f' },
  { id: 'trabajo', t: 'Trabajo', ic: '💼', c: '#4f7f96' },
  { id: 'reunion', t: 'Punto de reunión', ic: '📍', c: '#d4842a' },
  { id: 'agua', t: 'Agua', ic: '💧', c: '#4f7f96' },
  { id: 'refugio', t: 'Refugio personal', ic: '🏕', c: '#6f9c4a' },
  { id: 'vehiculo', t: 'Vehículo', ic: '🚗', c: '#cfb63f' },
  { id: 'sanitario', t: 'Infraestructura sanitaria', ic: '🏥', c: '#c8402f' },
  { id: 'transporte', t: 'Transporte', ic: '🚉', c: '#4f7f96' },
  { id: 'abastecimiento', t: 'Abastecimiento', ic: '🛒', c: '#cbbf9f' },
  { id: 'recurso', t: 'Recurso público', ic: '🏛', c: '#9cb768' },
  { id: 'ruta', t: 'Ruta / paso', ic: '🛤', c: '#d4842a' },
  { id: 'nota', t: 'Nota', ic: '📝', c: '#9aa596' },
];
const tipoMap = Object.fromEntries(TIPOS_PUNTO.map((t) => [t.id, t]));

/* ------------------------------ Vista mapa ------------------------------ */
export async function mapView() {
  const n = el(`<div>
    <div class="btnrow">
      <button class="btn sm" id="m-add" type="button">📍 Añadir punto aquí</button>
      <button class="btn sm ghost" id="m-me" type="button">🎯 Mi posición</button>
      <button class="btn sm ghost" id="m-dl" type="button">⬇ Descargar área</button>
      <button class="btn sm ghost" id="m-layers" type="button">🗂 Capas</button>
    </div>
    <div id="map"></div>
    <div class="muted" id="m-status" style="margin-top:6px"></div>
    <div id="m-panel"></div>
  </div>`);

  try { await loadLeaflet(); } catch {
    n.querySelector('#map').innerHTML = '<div class="blk-warn">No se ha podido cargar el motor de mapas.</div>';
    return n;
  }

  const Lf = L;
  const st = store.settings();
  const map = Lf.map(n.querySelector('#map'), { zoomControl: true, attributionControl: true })
    .setView([40.6565, -4.6818], 9);

  // --- Capa vectorial base (siempre offline) ---
  //
  // CUIDADO CON EL RELLENO: esta capa se dibuja ENCIMA de las teselas. Con
  // opacidad alta, España queda tapada por un manchón oscuro mientras el resto
  // del mundo se ve perfectamente, porque fuera de España no hay polígonos.
  // Por eso el relleno depende del modo:
  //   · con teselas → solo contorno, para no ocultar el mapa real
  //   · sin teselas → relleno sólido, que es lo que hace legible el mapa
  //                   vectorial cuando debajo no hay nada
  let modoRaster = true;

  const estiloProv = (f) => {
    const esAvila = f.properties.cod === '05';
    return {
      color: esAvila ? '#a1a265' : modoRaster ? '#8b7752' : '#554e3e',
      weight: esAvila ? 2.5 : modoRaster ? 1.2 : 1,
      opacity: modoRaster ? 0.85 : 1,
      fillColor: esAvila ? '#565e35' : '#1b1917',
      fillOpacity: modoRaster ? (esAvila ? 0.12 : 0) : 0.75,
    };
  };
  const estiloMun = () => ({
    color: '#6c6644',
    weight: 0.7,
    opacity: modoRaster ? 0.75 : 1,
    fillColor: '#3a3f24',
    fillOpacity: modoRaster ? 0 : 0.45,
  });

  const vector = Lf.layerGroup().addTo(map);
  const overlays = {};
  let capaProv = null, capaMun = null;

  /** Reaplica los estilos cuando se cambia de capa base. */
  function refrescarVector() {
    capaProv?.setStyle(estiloProv);
    capaMun?.setStyle(estiloMun);
  }

  try {
    const prov = await loadGeo('provincias');
    capaProv = Lf.geoJSON(prov, {
      style: estiloProv,
      onEachFeature: (f, l) => l.bindPopup(`<b>${esc(f.properties.nombre)}</b><br><span class="muted">Provincia · cód. INE ${esc(f.properties.cod)}</span>`),
    });
    capaProv.addTo(vector);
    overlays['Provincias (IGN)'] = capaProv;
  } catch (e) { /* la capa vectorial es opcional */ }

  try {
    const mun = await loadGeo('avilaMun');
    capaMun = Lf.geoJSON(mun, {
      style: estiloMun,
      onEachFeature: (f, l) => l.bindPopup(`<b>${esc(f.properties.nombre)}</b><br><span class="muted">Municipio de Ávila · INE ${esc(f.properties.ine)}</span>`),
    });
    overlays['Municipios de Ávila (IGN)'] = capaMun;
  } catch (e) { /* opcional */ }

  // --- Capas ráster offline ---
  const rasterLayers = {};
  for (const [id, cfg] of Object.entries(TILE_SOURCES)) {
    const Cls = makeOfflineLayer(Lf, id);
    rasterLayers[cfg.t] = new Cls('', { maxZoom: cfg.max, attribution: cfg.attr, crossOrigin: true });
  }
  const defaultRaster = rasterLayers[TILE_SOURCES.osm.t];
  defaultRaster.addTo(map);

  // --- Capas GeoJSON importadas por el usuario ---
  const userGeo = await store.all('geo');
  for (const g of userGeo) {
    try {
      const capa = Lf.geoJSON(g.data, {
        style: { color: g.color || '#d4842a', weight: 2, fillOpacity: 0.2 },
        onEachFeature: (f, l) => {
          const p = f.properties || {};
          const txt = Object.entries(p).slice(0, 8).map(([k, v]) => `<b>${esc(k)}</b>: ${esc(v)}`).join('<br>');
          l.bindPopup(`<b>${esc(g.nombre)}</b><br>${txt || '<span class="muted">sin atributos</span>'}`);
        },
      });
      overlays[`${g.nombre} (importada)`] = capa;
    } catch { /* ignora capas corruptas */ }
  }

  // --- Puntos personales ---
  const puntosLayer = Lf.layerGroup().addTo(map);
  async function pintaPuntos() {
    puntosLayer.clearLayers();
    const pts = await store.all('puntos');
    for (const p of pts) {
      const t = tipoMap[p.tipo] || tipoMap.nota;
      const icon = Lf.divIcon({
        className: '',
        html: `<div style="font-size:22px;line-height:1;filter:drop-shadow(0 1px 2px #000)">${t.ic}</div>`,
        iconSize: [24, 24], iconAnchor: [12, 22],
      });
      Lf.marker([p.lat, p.lon], { icon })
        .bindPopup(`<b>${esc(p.nombre)}</b><br><span class="muted">${esc(t.t)}</span>
          ${p.nota ? `<br>${esc(p.nota)}` : ''}
          <br><span class="mono muted">${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}</span>
          <br><button class="btn sm danger" data-del="${esc(p.id)}" style="margin-top:6px">Eliminar</button>`)
        .addTo(puntosLayer);
    }
  }
  await pintaPuntos();

  map.on('popupopen', (e) => {
    const b = e.popup._contentNode?.querySelector('[data-del]');
    if (b) b.addEventListener('click', async () => {
      await store.del('puntos', b.dataset.del);
      map.closePopup();
      await pintaPuntos();
      toast('Punto eliminado');
    });
  });

  overlays['Mis puntos'] = puntosLayer;
  const soloVectorial = Lf.layerGroup();
  Lf.control.layers(
    { ...rasterLayers, 'Solo vectorial (offline)': soloVectorial },
    overlays,
    { collapsed: true }
  ).addTo(map);
  vector.addTo(map);

  // Al cambiar de capa base se recalcula el relleno del vectorial.
  map.on('baselayerchange', (e) => {
    modoRaster = e.layer !== soloVectorial;
    refrescarVector();
  });

  // Si no hay ninguna tesela guardada y tampoco hay conexión, el mapa ráster
  // se vería completamente negro: en ese caso el vectorial se rellena solo.
  (async () => {
    const hayTeselas = await store.count('tiles');
    if (!hayTeselas && !navigator.onLine) {
      modoRaster = false;
      refrescarVector();
    }
  })();

  // --- Estado ---
  const status = n.querySelector('#m-status');
  async function refreshStatus() {
    const c = await store.count('tiles');
    status.innerHTML = `${c} teselas guardadas offline · capa vectorial IGN siempre disponible · ${navigator.onLine ? 'con conexión' : '<b>sin conexión</b>'}`;
  }
  await refreshStatus();

  // --- Añadir punto ---
  n.querySelector('#m-add').addEventListener('click', () => {
    const c = map.getCenter();
    const panel = n.querySelector('#m-panel');
    panel.innerHTML = `<div class="card"><h3>Nuevo punto</h3>
      <label>Nombre</label><input id="np-n" placeholder="Ej. Casa, punto de reunión…">
      <label>Tipo</label><select id="np-t">${TIPOS_PUNTO.map((t) => `<option value="${t.id}">${t.ic} ${t.t}</option>`).join('')}</select>
      <div class="fieldrow">
        <div><label>Latitud</label><input id="np-la" type="number" step="0.00001" value="${c.lat.toFixed(5)}"></div>
        <div><label>Longitud</label><input id="np-lo" type="number" step="0.00001" value="${c.lng.toFixed(5)}"></div>
      </div>
      <label>Nota</label><textarea id="np-no" placeholder="Detalles útiles: acceso, horario, teléfono…"></textarea>
      <div class="btnrow" style="margin-top:10px">
        <button class="btn" id="np-ok" type="button">Guardar</button>
        <button class="btn ghost" id="np-gps" type="button">Usar GPS</button>
        <button class="btn ghost" id="np-x" type="button">Cancelar</button>
      </div>
      <div class="muted">Se guarda únicamente en este dispositivo.</div></div>`;
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    panel.querySelector('#np-x').addEventListener('click', () => { panel.innerHTML = ''; });
    panel.querySelector('#np-gps').addEventListener('click', () => {
      navigator.geolocation?.getCurrentPosition((p) => {
        panel.querySelector('#np-la').value = p.coords.latitude.toFixed(5);
        panel.querySelector('#np-lo').value = p.coords.longitude.toFixed(5);
      }, () => toast('No se pudo obtener la posición'));
    });
    panel.querySelector('#np-ok').addEventListener('click', async () => {
      const nombre = panel.querySelector('#np-n').value.trim() || 'Punto sin nombre';
      const p = {
        id: uid(), nombre,
        tipo: panel.querySelector('#np-t').value,
        lat: parseFloat(panel.querySelector('#np-la').value),
        lon: parseFloat(panel.querySelector('#np-lo').value),
        nota: panel.querySelector('#np-no').value.trim(),
        ts: Date.now(),
      };
      if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) return toast('Coordenadas no válidas');
      await store.put('puntos', p);
      panel.innerHTML = '';
      await pintaPuntos();
      toast('Punto guardado en este dispositivo');
    });
  });

  // --- Mi posición ---
  n.querySelector('#m-me').addEventListener('click', () => {
    if (!navigator.geolocation) return toast('Geolocalización no disponible');
    toast('Buscando posición…');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const ll = [p.coords.latitude, p.coords.longitude];
        map.setView(ll, 14);
        Lf.circle(ll, { radius: p.coords.accuracy, color: '#4f7f96', weight: 1, fillOpacity: 0.12 }).addTo(map);
        Lf.circleMarker(ll, { radius: 6, color: '#9cb768', fillColor: '#9cb768', fillOpacity: 1 })
          .bindPopup(`Tu posición<br><span class="mono">${ll[0].toFixed(5)}, ${ll[1].toFixed(5)}</span><br>±${p.coords.accuracy.toFixed(0)} m`)
          .addTo(map).openPopup();
      },
      () => toast('No se pudo obtener la posición'),
      { enableHighAccuracy: true, timeout: 20000 }
    );
  });

  // --- Descarga de área ---
  n.querySelector('#m-dl').addEventListener('click', () => {
    const panel = n.querySelector('#m-panel');
    panel.innerHTML = `<div class="card"><h3>Descargar área para uso offline</h3>
      <p class="muted">Se descargan las teselas del área visible y se guardan en este dispositivo. Hazlo con Wi-Fi antes de necesitarlo.</p>
      <label>Fuente</label>
      <select id="dl-src">${Object.entries(TILE_SOURCES).map(([k, v]) => `<option value="${k}">${esc(v.t)}</option>`).join('')}</select>
      <div class="fieldrow">
        <div><label>Zoom mínimo</label><input id="dl-z0" type="number" value="${Math.max(6, Math.round(map.getZoom()) - 1)}" min="4" max="17"></div>
        <div><label>Zoom máximo</label><input id="dl-z1" type="number" value="${Math.min(15, Math.round(map.getZoom()) + 3)}" min="4" max="17"></div>
      </div>
      <div class="sp"></div>
      <div id="dl-est" class="muted"></div>
      <div class="btnrow" style="margin-top:10px">
        <button class="btn" id="dl-go" type="button">Descargar</button>
        <button class="btn ghost" id="dl-x" type="button">Cerrar</button>
      </div>
      <div class="progress"><i id="dl-bar" style="width:0"></i></div>
      <div id="dl-log" class="muted"></div>
      <div class="blk-note">Descarga solo el área que realmente necesitas. Las teselas proceden de servidores comunitarios con políticas de uso justo: descargar regiones enteras a zoom alto no está permitido y puede bloquear el acceso.</div>
    </div>`;
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    panel.querySelector('#dl-x').addEventListener('click', () => { panel.innerHTML = ''; });

    const lonlat2tile = (lon, lat, z) => {
      const n2 = 2 ** z;
      const x = Math.floor(((lon + 180) / 360) * n2);
      const rl = (lat * Math.PI) / 180;
      const y = Math.floor(((1 - Math.log(Math.tan(rl) + 1 / Math.cos(rl)) / Math.PI) / 2) * n2);
      return [x, y];
    };

    const listTiles = () => {
      const b = map.getBounds();
      const z0 = Math.max(1, parseInt(panel.querySelector('#dl-z0').value, 10));
      const z1 = Math.min(17, parseInt(panel.querySelector('#dl-z1').value, 10));
      const out = [];
      for (let z = z0; z <= z1; z++) {
        const [x0, y0] = lonlat2tile(b.getWest(), b.getNorth(), z);
        const [x1, y1] = lonlat2tile(b.getEast(), b.getSouth(), z);
        for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++)
          for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) out.push([z, x, y]);
      }
      return out;
    };

    const est = panel.querySelector('#dl-est');
    const showEst = () => {
      const t = listTiles();
      est.innerHTML = `Área visible: <b>${t.length}</b> teselas · tamaño estimado ≈ <b>${fmtBytes(t.length * 18000)}</b>`;
      return t;
    };
    panel.addEventListener('input', showEst);
    showEst();

    panel.querySelector('#dl-go').addEventListener('click', async () => {
      const src = panel.querySelector('#dl-src').value;
      const cfg = TILE_SOURCES[src];
      const tiles = listTiles();
      const LIMITE = 3000;
      if (tiles.length > LIMITE) {
        panel.querySelector('#dl-log').innerHTML = `<span style="color:var(--red)">Demasiadas teselas (${tiles.length}). Reduce el zoom máximo o acerca el mapa. Límite: ${LIMITE}.</span>`;
        return;
      }
      if (!navigator.onLine) {
        panel.querySelector('#dl-log').innerHTML = '<span style="color:var(--amber)">Sin conexión: no se pueden descargar teselas nuevas.</span>';
        return;
      }
      const bar = panel.querySelector('#dl-bar');
      const log = panel.querySelector('#dl-log');
      let ok = 0, skip = 0, err = 0;
      for (let i = 0; i < tiles.length; i++) {
        const [z, x, y] = tiles[i];
        try {
          if (await getTile(src, z, x, y)) { skip++; }
          else {
            const url = cfg.url.replace('{z}', z).replace('{x}', x).replace('{y}', y);
            const r = await fetch(url);
            if (r.ok) { await saveTile(src, z, x, y, await r.blob()); ok++; }
            else err++;
          }
        } catch { err++; }
        if (i % 5 === 0 || i === tiles.length - 1) {
          bar.style.width = `${((i + 1) / tiles.length) * 100}%`;
          log.textContent = `${i + 1}/${tiles.length} · nuevas ${ok} · ya guardadas ${skip} · fallidas ${err}`;
          await new Promise((r) => setTimeout(r, 0));
        }
      }
      log.innerHTML = `<b>Descarga terminada.</b> Nuevas: ${ok} · ya guardadas: ${skip} · fallidas: ${err}. Ya puedes usar esta zona sin conexión.`;
      await refreshStatus();
      await store.persistStorage();
    });
  });

  // --- Panel de capas / importación ---
  n.querySelector('#m-layers').addEventListener('click', async () => {
    const panel = n.querySelector('#m-panel');
    const gs = await store.all('geo');
    panel.innerHTML = `<div class="card"><h3>Capas y datos</h3>
      <h4>Siempre disponibles offline</h4>
      <ul>
        <li>Provincias de España (IGN vía es-atlas)</li>
        <li>Comunidades autónomas (IGN vía es-atlas)</li>
        <li>Municipios de la provincia de Ávila (IGN vía es-atlas)</li>
        <li>Tus puntos personales</li>
      </ul>
      <h4>Importar capa oficial (GeoJSON)</h4>
      <p class="muted">Puedes descargar capas oficiales (zonas inundables de la Confederación Hidrográfica, cartografía de riesgo de la Junta de Castilla y León, capas del IGN…) y añadirlas aquí. Quedan guardadas en el dispositivo y disponibles sin conexión.</p>
      <input type="file" id="gi-f" accept=".geojson,.json,application/geo+json,application/json">
      <label>Nombre de la capa</label><input id="gi-n" placeholder="Ej. Zonas inundables T=100 (CHD)">
      <div class="btnrow" style="margin-top:8px"><button class="btn" id="gi-go" type="button">Importar</button>
      <button class="btn ghost" id="gi-x" type="button">Cerrar</button></div>
      <h4>Capas importadas</h4>
      ${gs.length ? `<div class="list">${gs.map((g) => `<div class="row"><div class="rt"><b>${esc(g.nombre)}</b><span>${(g.data.features || []).length} elementos</span></div><button class="btn sm danger" data-gdel="${esc(g.id)}">Borrar</button></div>`).join('')}</div>` : '<p class="muted">Ninguna todavía.</p>'}
      <div class="blk-warn">Esta app no marca ningún lugar como "refugio seguro". Un lugar solo es seguro si lo determina la autoridad competente en esa emergencia concreta.</div>
    </div>`;
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    panel.querySelector('#gi-x').addEventListener('click', () => { panel.innerHTML = ''; });
    panel.querySelectorAll('[data-gdel]').forEach((b) =>
      b.addEventListener('click', async () => { await store.del('geo', b.dataset.gdel); toast('Capa eliminada. Recarga el mapa.'); })
    );
    panel.querySelector('#gi-go').addEventListener('click', async () => {
      const f = panel.querySelector('#gi-f').files?.[0];
      if (!f) return toast('Selecciona un archivo');
      try {
        const data = JSON.parse(await f.text());
        if (!data.type) throw new Error('No parece GeoJSON');
        await store.put('geo', {
          id: uid(),
          nombre: panel.querySelector('#gi-n').value.trim() || f.name,
          data, color: '#d4842a', ts: Date.now(),
        });
        toast('Capa importada. Recarga el mapa para verla.');
      } catch (e) { toast('Error: ' + e.message); }
    });
  });

  setTimeout(() => map.invalidateSize(), 120);
  return n;
}

export async function borrarTeselas() {
  await store.clear('tiles');
}
