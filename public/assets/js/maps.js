/* =========================================================================
   maps.js — mapas offline con Leaflet
   ---------------------------------------------------------------------------
   ARQUITECTURA (decisión técnica documentada en el README):

   1) CAPA BASE VECTORIAL SIEMPRE OFFLINE
      GeoJSON de provincias, comunidades autónomas y municipios de Ávila,
      derivado del Equipamiento Geográfico de Referencia Nacional del IGN
      (paquete es-atlas, MIT). Pesa ~390 KB y va en el precache del Service
      Worker: funciona sin Internet desde la primera carga, siempre.

   2) TESELAS RÁSTER DEL IGN BAJO DEMANDA, GUARDADAS EN INDEXEDDB
      Servicios WMTS del Instituto Geográfico Nacional (mapa base, mapa
      topográfico MTN y ortofoto PNOA), de uso libre con atribución
      (CC BY 4.0). El usuario descarga el área que le interesa mientras
      tiene conexión.
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
import { el, esc, toast, uid, fmtBytes, alSalir, borrarConDeshacer } from './ui.js';
import * as ubi from './ubicacion.js';

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
/* Servicios WMTS del IGN en la rejilla GoogleMapsCompatible (EPSG:3857), la
   misma que usa Leaflet. Licencia CC BY 4.0: basta con citar al IGN.
   Documentación: https://www.ign.es/web/ign/portal/ide-area-nodo-ide-ign
   `nativo` es el zoom máximo que sirve el IGN; por encima, Leaflet amplía la
   última tesela disponible en vez de pedir teselas que no existen. */
const IGN_ATTR = '© <a href="https://www.ign.es" target="_blank" rel="noopener">Instituto Geográfico Nacional</a> (CC BY 4.0)';
const wmts = (servicio, capa) =>
  `https://www.ign.es/wmts/${servicio}?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${capa}` +
  '&STYLE=default&TILEMATRIXSET=GoogleMapsCompatible&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/jpeg';

export const TILE_SOURCES = {
  'ign-base': {
    t: 'IGN · Mapa base',
    url: wmts('ign-base', 'IGNBaseTodo'),
    nativo: 17, max: 19, kb: 22,
    attr: IGN_ATTR,
  },
  'ign-mtn': {
    t: 'IGN · Mapa topográfico (MTN)',
    url: wmts('mapa-raster', 'MTN'),
    nativo: 16, max: 18, kb: 35,
    attr: IGN_ATTR,
  },
  'ign-pnoa': {
    t: 'IGN · Ortofoto PNOA',
    url: wmts('pnoa-ma', 'OI.OrthoimageCoverage'),
    nativo: 19, max: 19, kb: 30,
    attr: IGN_ATTR,
  },
};
export const FUENTE_DEFECTO = 'ign-base';

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
const urlTesela = (cfg, z, x, y) => cfg.url.replace('{z}', z).replace('{x}', x).replace('{y}', y);

/** TileLayer que lee de IndexedDB y, si hay red, completa y cachea.
 *  Informa de cada tesela con `onTesela(ok)` para que la vista sepa si el
 *  ráster se está viendo de verdad o hay que rellenar la capa vectorial. */
function makeOfflineLayer(Lf, srcId, onTesela = () => {}) {
  const cfg = TILE_SOURCES[srcId];
  const pinta = (img, done, blob) => {
    img.src = URL.createObjectURL(blob);
    img.onload = () => { URL.revokeObjectURL(img.src); onTesela(true); done(null, img); };
    img.onerror = () => { URL.revokeObjectURL(img.src); vacia(img, done); };
  };
  const vacia = (img, done) => { img.onload = img.onerror = null; img.src = BLANK; onTesela(false); done(null, img); };
  return Lf.TileLayer.extend({
    createTile(coords, done) {
      const img = document.createElement('img');
      img.alt = '';
      const { z, x, y } = coords;
      getTile(srcId, z, x, y)
        .then((blob) => {
          if (blob) return pinta(img, done, blob);
          if (!navigator.onLine) return vacia(img, done);
          const url = urlTesela(cfg, z, x, y);
          fetch(url, { mode: 'cors' })
            .then((r) => (r.ok ? r.blob() : Promise.reject(new Error('HTTP ' + r.status))))
            .then((b) => {
              saveTile(srcId, z, x, y, b).catch(() => {});
              pinta(img, done, b);
            })
            .catch(() => {
              /* Si el servidor no permite leer la tesela desde JavaScript
                 (CORS), al menos se muestra como imagen normal, sin guardarla. */
              img.onload = () => { onTesela(true); done(null, img); };
              img.onerror = () => vacia(img, done);
              img.src = url;
            });
        })
        .catch(() => vacia(img, done));
      return img;
    },
  });
}

/** Capa ráster offline lista para añadir a un mapa. */
export function crearCapaRaster(Lf, srcId = FUENTE_DEFECTO, onTesela) {
  const cfg = TILE_SOURCES[srcId];
  const Cls = makeOfflineLayer(Lf, srcId, onTesela);
  return new Cls('', { maxZoom: cfg.max, maxNativeZoom: cfg.nativo, attribution: cfg.attr });
}

/* --------------------------- Utilidades geográficas --------------------------- */
/** Distancia de círculo máximo en km (fórmula del haverseno). */
export function distanciaKm(lat1, lon1, lat2, lon2) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad, dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Longitud en km de todas las líneas de un GeoJSON. */
export function longitudKm(geo) {
  let km = 0;
  const linea = (cs) => { for (let i = 1; i < cs.length; i++) km += distanciaKm(cs[i - 1][1], cs[i - 1][0], cs[i][1], cs[i][0]); };
  const geom = (g) => {
    if (!g) return;
    if (g.type === 'LineString') linea(g.coordinates);
    else if (g.type === 'MultiLineString') g.coordinates.forEach(linea);
    else if (g.type === 'GeometryCollection') g.geometries.forEach(geom);
  };
  const feats = geo.type === 'FeatureCollection' ? geo.features : geo.type === 'Feature' ? [geo] : [{ geometry: geo }];
  feats.forEach((f) => geom(f.geometry));
  return km;
}

/** Convierte un GPX (tracks y rutas) en GeoJSON. Sin dependencias. */
export function gpxAGeojson(texto) {
  const doc = new DOMParser().parseFromString(texto, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('El archivo GPX no es válido');
  const pts = (nodos) => [...nodos].map((p) => [parseFloat(p.getAttribute('lon')), parseFloat(p.getAttribute('lat'))])
    .filter(([lo, la]) => Number.isFinite(lo) && Number.isFinite(la));
  const features = [];
  doc.querySelectorAll('trkseg').forEach((seg) => {
    const c = pts(seg.querySelectorAll('trkpt'));
    if (c.length > 1) features.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: c } });
  });
  doc.querySelectorAll('rte').forEach((r) => {
    const c = pts(r.querySelectorAll('rtept'));
    if (c.length > 1) features.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: c } });
  });
  doc.querySelectorAll('wpt').forEach((w) => {
    const [c] = pts([w]);
    if (c) features.push({ type: 'Feature', properties: { nombre: w.querySelector('name')?.textContent || '' }, geometry: { type: 'Point', coordinates: c } });
  });
  if (!features.length) throw new Error('El GPX no contiene tracks, rutas ni puntos');
  return { type: 'FeatureCollection', features };
}

/** Lee un archivo GeoJSON o GPX elegido por el usuario. */
export async function leerCapa(file) {
  const texto = await file.text();
  if (/\.gpx$/i.test(file.name) || /^\s*<\?xml|<gpx[\s>]/i.test(texto.slice(0, 300))) return gpxAGeojson(texto);
  const data = JSON.parse(texto);
  if (!data.type) throw new Error('No parece GeoJSON');
  return data;
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
  const map = Lf.map(n.querySelector('#map'), { zoomControl: true, attributionControl: true })
    .setView([40.2, -3.7], 6);
  map.attributionControl.setPrefix('Leaflet');
  alSalir(() => map.remove());

  /* Si el usuario ha indicado su provincia (Riesgos → Mi zona), el mapa se
     abre sobre ella y la resalta. Si no, muestra toda España. */
  const miProv = await ubi.guardada().catch(() => null);
  if (miProv?.bbox) map.fitBounds([[miProv.bbox[1], miProv.bbox[0]], [miProv.bbox[3], miProv.bbox[2]]]);

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
    const esMia = miProv && f.properties.cod === miProv.cod;
    return {
      color: esMia ? '#a1a265' : modoRaster ? '#8b7752' : '#554e3e',
      weight: esMia ? 2.5 : modoRaster ? 1.2 : 1,
      opacity: modoRaster ? 0.85 : 1,
      fillColor: esMia ? '#565e35' : '#1b1917',
      fillOpacity: modoRaster ? (esMia ? 0.12 : 0) : 0.75,
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

  // --- Capas ráster offline (IGN) ---
  // Se cuentan las teselas que se ven de verdad. Si en una vista no llega
  // ninguna (sin descargar, servidor caído o bloqueado), el vectorial se
  // rellena para que el mapa nunca quede en blanco, haya o no conexión.
  let teselasOk = 0, teselasKo = 0, statusListo = false;
  const onTesela = (ok) => { if (ok) teselasOk++; else teselasKo++; };
  const rasterLayers = {};
  for (const [id, cfg] of Object.entries(TILE_SOURCES)) {
    const capa = crearCapaRaster(Lf, id, onTesela);
    capa.on('loading', () => { teselasOk = 0; teselasKo = 0; });
    capa.on('load', () => {
      const hayRaster = teselasOk > 0 || teselasKo === 0;
      if (hayRaster !== modoRaster) { modoRaster = hayRaster; refrescarVector(); }
      if (statusListo) refreshStatus();
    });
    rasterLayers[cfg.t] = capa;
  }
  rasterLayers[TILE_SOURCES[FUENTE_DEFECTO].t].addTo(map);

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
          <br><button class="btn danger" data-del="${esc(p.id)}" type="button" style="margin-top:8px">Eliminar punto</button>`)
        .addTo(puntosLayer);
    }
  }
  await pintaPuntos();

  map.on('popupopen', (e) => {
    const b = e.popup._contentNode?.querySelector('[data-del]');
    if (b) b.addEventListener('click', async () => {
      const rec = await store.get('puntos', b.dataset.del);
      map.closePopup();
      await borrarConDeshacer({
        que: 'Punto', borrar: () => store.del('puntos', rec.id), restaurar: () => store.restaurar('puntos', rec),
        repintar: () => n.isConnected && pintaPuntos(),
      });
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


  // --- Estado ---
  const status = n.querySelector('#m-status');
  async function refreshStatus() {
    const c = await store.count('tiles');
    const aviso = modoRaster ? '' : ' · <b>sin teselas en esta zona: se muestra el mapa vectorial</b>';
    status.innerHTML = `${c} teselas guardadas offline · capa vectorial IGN siempre disponible · ${navigator.onLine ? 'con conexión' : '<b>sin conexión</b>'}${aviso}`;
  }
  await refreshStatus();
  statusListo = true;

  // Teselas de versiones anteriores (OpenStreetMap / OpenTopoMap): ya no se
  // muestran. Se ofrece borrarlas para liberar espacio.
  (async () => {
    const prefijos = Object.keys(TILE_SOURCES).map((k) => k + '/');
    const viejas = (await store.keys('tiles')).filter((k) => !prefijos.some((p) => String(k).startsWith(p)));
    if (!viejas.length) return;
    const aviso = el(`<div class="blk-note">Tienes ${viejas.length} teselas de una versión anterior (OpenStreetMap / OpenTopoMap) que ya no se usan: ahora los mapas son del IGN. Vuelve a descargar tu zona con la fuente del IGN.
      <div class="btnrow"><button class="btn sm ghost" type="button">Borrar teselas antiguas</button></div></div>`);
    aviso.querySelector('button').addEventListener('click', async () => {
      for (const k of viejas) await store.delRaw('tiles', k);
      aviso.remove(); refreshStatus(); toast('Teselas antiguas borradas');
    });
    status.after(aviso);
  })().catch(() => {});

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

  // --- Mi posición (un único marcador que se reutiliza) ---
  const posicion = { circulo: null, punto: null };
  n.querySelector('#m-me').addEventListener('click', () => {
    if (!navigator.geolocation) return toast('Geolocalización no disponible');
    toast('Buscando posición…');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const ll = [p.coords.latitude, p.coords.longitude];
        map.setView(ll, 14);
        posicion.circulo?.remove();
        posicion.punto?.remove();
        posicion.circulo = Lf.circle(ll, { radius: p.coords.accuracy, color: '#4f7f96', weight: 1, fillOpacity: 0.12 }).addTo(map);
        posicion.punto = Lf.circleMarker(ll, { radius: 6, color: '#9cb768', fillColor: '#9cb768', fillOpacity: 1 })
          .bindPopup(`Tu posición<br><span class="mono">${ll[0].toFixed(5)}, ${ll[1].toFixed(5)}</span><br>±${p.coords.accuracy.toFixed(0)} m`)
          .addTo(map).openPopup();
      },
      () => toast('No se pudo obtener la posición'),
      { enableHighAccuracy: true, timeout: 20000 }
    );
  });

  // --- Descarga de área ---
  /* Una sola descarga a la vez. Se cancela con su botón, al cerrar el panel
     o al salir del mapa: lo ya descargado se conserva. AbortController corta
     también la petición que esté en curso. */
  let descarga = null;
  const cancelarDescarga = () => { if (descarga) { descarga.cancelada = true; descarga.ctrl.abort(); } };
  alSalir(cancelarDescarga);

  n.querySelector('#m-dl').addEventListener('click', () => {
    if (descarga) return;
    const panel = n.querySelector('#m-panel');
    panel.innerHTML = `<div class="card"><h3>Descargar área para uso offline</h3>
      <p class="muted">Se descargan las teselas del área visible y se guardan en este dispositivo. Hazlo con Wi-Fi antes de necesitarlo.</p>
      <label for="dl-src">Fuente</label>
      <select id="dl-src">${Object.entries(TILE_SOURCES).map(([k, v]) => `<option value="${k}">${esc(v.t)}</option>`).join('')}</select>
      <div class="fieldrow">
        <div><label for="dl-z0">Zoom mínimo</label><input id="dl-z0" type="number" value="${Math.max(6, Math.round(map.getZoom()) - 1)}" min="4" max="19"></div>
        <div><label for="dl-z1">Zoom máximo</label><input id="dl-z1" type="number" value="${Math.min(15, Math.round(map.getZoom()) + 3)}" min="4" max="19"></div>
      </div>
      <div class="sp"></div>
      <div id="dl-est" class="muted"></div>
      <div class="btnrow" style="margin-top:10px">
        <button class="btn" id="dl-go" type="button">Descargar</button>
        <button class="btn ghost" id="dl-x" type="button">Cerrar</button>
      </div>
      <div class="progress"><i id="dl-bar" style="width:0"></i></div>
      <div id="dl-log" class="muted"></div>
      <div class="blk-note">Descarga solo el área que realmente necesitas. Las teselas proceden de los servicios públicos del Instituto Geográfico Nacional: no los satures. Para cartografía de provincias enteras, el IGN ofrece descargas completas en su Centro de Descargas (centrodedescargas.cnig.es).</div>
    </div>`;
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    panel.querySelector('#dl-x').addEventListener('click', () => { cancelarDescarga(); panel.innerHTML = ''; });

    const lonlat2tile = (lon, lat, z) => {
      const n2 = 2 ** z;
      const x = Math.floor(((lon + 180) / 360) * n2);
      const rl = (lat * Math.PI) / 180;
      const y = Math.floor(((1 - Math.log(Math.tan(rl) + 1 / Math.cos(rl)) / Math.PI) / 2) * n2);
      return [x, y];
    };

    const listTiles = () => {
      const b = map.getBounds();
      const cfg = TILE_SOURCES[panel.querySelector('#dl-src').value];
      // Por encima del zoom nativo el IGN no tiene teselas: Leaflet amplía
      // la última, así que no tiene sentido descargar más.
      const z0 = Math.max(1, parseInt(panel.querySelector('#dl-z0').value, 10));
      const z1 = Math.min(cfg.nativo, parseInt(panel.querySelector('#dl-z1').value, 10));
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
      const kb = TILE_SOURCES[panel.querySelector('#dl-src').value].kb;
      est.innerHTML = `Área visible: <b>${t.length}</b> teselas · tamaño estimado ≈ <b>${fmtBytes(t.length * kb * 1024)}</b>`;
      return t;
    };
    panel.addEventListener('input', showEst);
    showEst();

    panel.querySelector('#dl-go').addEventListener('click', async (ev) => {
      if (descarga) { cancelarDescarga(); return; }
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
      const boton = ev.currentTarget;
      descarga = { cancelada: false, ctrl: new AbortController() };
      const d = descarga;
      boton.textContent = '✕ Cancelar descarga';
      boton.classList.add('danger');
      let ok = 0, skip = 0, err = 0;
      for (let i = 0; i < tiles.length; i++) {
        if (d.cancelada) break;
        const [z, x, y] = tiles[i];
        try {
          if (await getTile(src, z, x, y)) { skip++; }
          else {
            const r = await fetch(urlTesela(cfg, z, x, y), { mode: 'cors', signal: d.ctrl.signal });
            if (r.ok) { await saveTile(src, z, x, y, await r.blob()); ok++; }
            else err++;
          }
        } catch { if (!d.cancelada) err++; }
        if (i % 5 === 0 || i === tiles.length - 1) {
          bar.style.width = `${((i + 1) / tiles.length) * 100}%`;
          log.textContent = `${i + 1}/${tiles.length} · nuevas ${ok} · ya guardadas ${skip} · fallidas ${err}`;
          await new Promise((r) => setTimeout(r, 0));
        }
      }
      descarga = null;
      boton.textContent = 'Descargar';
      boton.classList.remove('danger');
      if (d.cancelada) {
        log.innerHTML = `<b>Descarga cancelada.</b> Se conservan las ${ok} teselas nuevas ya guardadas.`;
        if (n.isConnected) { toast(`Descarga cancelada · ${ok} teselas guardadas`, { tipo: 'info' }); await refreshStatus(); }
        return;
      }
      log.innerHTML = ok + skip === 0 && err
        ? `<span style="color:var(--red)"><b>No se ha podido guardar ninguna tesela</b> (${err} fallidas). El servidor del IGN no ha respondido o no permite la descarga desde este navegador. Inténtalo más tarde.</span>`
        : `<b>Descarga terminada.</b> Nuevas: ${ok} · ya guardadas: ${skip} · fallidas: ${err}. Ya puedes usar esta zona sin conexión.`;
      toast(ok + skip === 0 && err ? 'No se pudo descargar la zona' : `Zona descargada · ${ok + skip} teselas`, { tipo: ok + skip === 0 && err ? 'error' : 'ok' });
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
        <li>Municipios de la provincia de Ávila (IGN vía es-atlas, guía provincial)</li>
        <li>Tus puntos personales</li>
      </ul>
      <h4>Importar capa (GeoJSON o GPX)</h4>
      <p class="muted">Puedes añadir capas oficiales (zonas inundables de las confederaciones hidrográficas, cartografía de riesgo autonómica, capas del IGN…) o trazas GPX de tus rutas. Quedan guardadas en el dispositivo y disponibles sin conexión.</p>
      <input type="file" id="gi-f" accept=".geojson,.json,.gpx,application/geo+json,application/json,application/gpx+xml">
      <label>Nombre de la capa</label><input id="gi-n" placeholder="Ej. Zonas inundables T=100 (CHD)">
      <div class="btnrow" style="margin-top:8px"><button class="btn" id="gi-go" type="button">Importar</button>
      <button class="btn ghost" id="gi-x" type="button">Cerrar</button></div>
      <h4>Capas importadas</h4>
      ${gs.length ? `<div class="list">${gs.map((g) => `<div class="row"><div class="rt"><b>${esc(g.nombre)}</b><span>${(g.data.features || []).length} elementos</span></div><button class="btn danger borrar" data-gdel="${esc(g.id)}" type="button" aria-label="Borrar la capa ${esc(g.nombre)}">Borrar</button></div>`).join('')}</div>` : '<p class="muted">Ninguna todavía.</p>'}
      <div class="blk-warn">Esta app no marca ningún lugar como "refugio seguro". Un lugar solo es seguro si lo determina la autoridad competente en esa emergencia concreta.</div>
    </div>`;
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    panel.querySelector('#gi-x').addEventListener('click', () => { panel.innerHTML = ''; });
    panel.querySelectorAll('[data-gdel]').forEach((b) =>
      b.addEventListener('click', async () => {
        const rec = await store.get('geo', b.dataset.gdel);
        const fila = b.closest('.row');
        await borrarConDeshacer({
          que: 'Capa', borrar: () => store.del('geo', rec.id), restaurar: () => store.restaurar('geo', rec),
          repintar: async () => { if (fila.isConnected) fila.hidden = !(await store.get('geo', rec.id)); },
        });
      })
    );
    panel.querySelector('#gi-go').addEventListener('click', async () => {
      const f = panel.querySelector('#gi-f').files?.[0];
      if (!f) return toast('Selecciona un archivo');
      try {
        const data = await leerCapa(f);
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
