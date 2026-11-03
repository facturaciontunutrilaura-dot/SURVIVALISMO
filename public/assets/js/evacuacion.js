/* =========================================================================
   evacuacion.js — PLAN DE EVACUACIÓN
   Escenario → respuesta, fases (72 h a meses) y por dónde salir, con el
   mapa del IGN. Dos modos según «Mi ubicación» (v1.16):
     · Ávila: corredores trazados a mano (data/geo/evac-rutas.geojson).
     · Resto de España: destinos fijos (pasos fronterizos y puertos)
       ordenados por distancia desde el municipio elegido; distancia
       estimada (línea recta × FACTOR_CARRETERA) y trazado en línea recta.
   ========================================================================= */
import { el, esc, alSalir } from './ui.js';
import * as store from './store.js';
import * as M from './maps.js';
import { CLASES, CORREDORES, ESCENARIOS, RESPUESTAS, SALIR_PAIS, AVISO_EVACUACION, CENTRALES, ESTRATEGICOS, DESTINOS, FACTOR_CARRETERA } from '../../data/content/evacuacion.js';
import * as ubi from './ubicacion.js';
import { montarSelector } from './ubicacion-ui.js';

const kv = async (id, def) => (await store.get('kv', id).catch(() => null))?.v ?? def;
const setKv = (id, v) => store.put('kv', { id, v }).catch(() => {});
const CORR = Object.fromEntries(CORREDORES.map((c) => [c.id, c]));
const VELOCIDAD = 80;          // km/h de media en condiciones normales
const FACTOR_CRISIS = 2.5;     // atascos, controles y desvíos
/* Se redondean los minutos totales antes de separar horas y minutos: así
   nunca sale «2 h 60 min». */
export function horas(h) {
  const t = Math.round(h * 60), hh = Math.floor(t / 60), mm = t % 60;
  return hh ? `${hh} h${mm ? ` ${mm} min` : ''}` : `${mm} min`;
}

/** Datos calculados de un corredor: distancia, tiempos y combustible. */
export function datosCorredor(geo, id, autonomia) {
  const km = geo?.km ?? null;
  return {
    km,
    normal: km != null ? horas(km / VELOCIDAD) : '—',
    crisis: km != null ? horas((km / VELOCIDAD) * FACTOR_CRISIS) : '—',
    repostar: km != null && km > autonomia * 0.85,   // margen del 15 %
    conocida: km != null,
    nucleares: geo?.nucleares || {},
  };
}

/* ----------------------------- Modo general ----------------------------- */
const R = 6371, RAD = Math.PI / 180;
export const kmEntre = ([lon1, lat1], [lon2, lat2]) => {
  const a = Math.sin(((lat2 - lat1) * RAD) / 2) ** 2 + Math.cos(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.sin(((lon2 - lon1) * RAD) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};
/** Distancia mínima de un punto a la recta a-b (muestreo cada ~5 km). */
export function distLinea(a, b, p) {
  const n = Math.max(1, Math.ceil(kmEntre(a, b) / 5));
  let m = Infinity;
  for (let k = 0; k <= n; k++) m = Math.min(m, kmEntre([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n], p));
  return m;
}
/** Destinos con distancia estimada desde un origen [lon, lat]. */
export async function destinosDesde(origen) {
  const pt = async (ine) => { const m = await ubi.municipio(ine); return m ? [m.lon, m.lat] : null; };
  const centrales = (await Promise.all(CENTRALES.map(async (c) => ({ ...c, c: await pt(c.ine) })))).filter((c) => c.c);
  const out = [];
  for (const d of DESTINOS) {
    const c = await pt(d.ine);
    if (!c) continue;
    const km = Math.round((kmEntre(origen, c) * FACTOR_CARRETERA) / 10) * 10;
    const nucleares = Object.fromEntries(centrales.map((x) => [x.id, Math.round(distLinea(origen, c, x.c))]));
    out.push({ ...d, c, km, nucleares });
  }
  return { destinos: out.sort((a, b) => a.km - b.km), centrales };
}
/** Destinos recomendados para un escenario en modo general. */
export function recomendadosGenerales(e, destinos) {
  const gen = e.gen || {};
  const evitar = new Set(gen.evitar || []);
  const out = [];
  for (const clase of gen.clases || []) {
    if (clase === 'interior') { out.push({ id: 'interior', clase }); continue; }
    const cuantos = clase === 'portugal' || clase === 'francia' ? 2 : 1;
    out.push(...destinos.filter((d) => d.clase === clase && !evitar.has(d.id)
      && !(e.id === 'nuclear' && Object.values(d.nucleares).some((k) => k <= 30))).slice(0, cuantos));
  }
  return out.slice(0, 5);
}

export async function evacuacionView() {
  // La limpieza se registra antes de cualquier espera: si se sale de la
  // pantalla mientras carga, el mapa ya no se monta. Un zoom animado sobre un
  // mapa retirado también fallaría, por eso se detiene antes de quitarlo.
  let L = null, map = null, capa = null, vivo = true;
  alSalir(() => { vivo = false; if (map) { map.stop?.(); map.remove(); } });
  const n = el(`<div>
    <div class="card ev-origen"><p id="ev-desde" class="ev-desde"></p>
      <details id="ev-ubi-d"><summary>Cambiar desde dónde sales</summary><div id="ev-ubi"></div></details></div>
    <div class="blk-warn" id="ev-aviso"></div>
    <div class="card">
      <h2>¿Qué está pasando?</h2>
      <div class="ev-esc ev-esc-1" role="group" aria-label="Escenarios prioritarios"></div>
      <div class="ev-esc" role="group" aria-label="Otros escenarios"></div>
    </div>
    <div id="ev-detalle"></div>
    <div class="card">
      <h2>Mapa de salidas</h2>
      <div id="ev-map" class="ev-map" role="region" aria-label="Mapa de salidas de evacuación"></div>
      <div id="ev-leyenda" class="ev-leyenda"></div>
      <div class="fieldrow" style="margin-top:6px">
        <div><label for="ev-auto">Autonomía del coche (km con el depósito lleno)</label>
        <input id="ev-auto" type="number" inputmode="numeric" min="100" max="2000" step="10"></div>
      </div>
    </div>
    <div id="ev-corredores"></div>
    <details class="card" id="ev-todos"><summary id="ev-todos-t">Todas las salidas</summary><div id="ev-todos-lista"></div></details>
    <details class="card"><summary>Salir del país: qué llevar y qué saber</summary><div>
      ${SALIR_PAIS.map((g) => `<h3>${esc(g.t)}</h3><ul>${g.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`).join('')}
    </div></details>
  </div>`);

  let escenario = await kv('evac.escenario', 'colapso');
  if (!ESCENARIOS.some((e) => e.id === escenario)) escenario = 'colapso';
  let autonomia = Number(await kv('evac.autonomia', 600)) || 600;
  n.querySelector('#ev-auto').value = autonomia;

  /* --------------------------- Desde dónde sales --------------------------- */
  let u = null, modo = 'sin', origen = null, gen = { destinos: [], centrales: [] };
  // Trazados de Ávila generados en el build (precacheados: funcionan sin conexión).
  let geo = null;
  try { geo = await (await fetch('./data/geo/evac-rutas.geojson')).json(); } catch { /* sin trazados: el texto sigue sirviendo */ }
  const lineas = Object.fromEntries((geo?.features || []).filter((f) => f.properties.tipo === 'corredor').map((f) => [f.properties.id, f]));

  async function prepararOrigen() {
    u = await ubi.guardada().catch(() => null);
    modo = u?.cod === '05' ? 'avila' : u?.mun ? 'general' : 'sin';
    origen = u?.mun ? [u.mun.lon, u.mun.lat] : null;
    gen = modo === 'general' ? await destinosDesde(origen) : { destinos: [], centrales: [] };
    const desde = n.querySelector('#ev-desde');
    desde.innerHTML = modo === 'sin'
      ? '<b>Indica dónde vives</b> para ver por dónde salir y a qué distancia está cada salida.'
      : modo === 'avila'
        ? `Saliendo desde <b>${esc(u.mun?.nombre || 'Ávila')}</b> (${esc(u.nombre)}) · corredores trazados desde Ávila capital${u.mun && u.mun.ine !== '05019' ? ': suma el trayecto hasta la capital' : ''}.`
        : `Saliendo desde <b>${esc(u.mun.nombre)}</b> (${esc(u.nombre)}) · distancias estimadas.`;
    n.querySelector('#ev-ubi-d').open = modo === 'sin';
    n.querySelector('#ev-aviso').textContent = modo === 'avila' ? AVISO_EVACUACION
      : 'Las salidas son una referencia de planificación, no una navegación: la distancia es una estimación (en línea recta, corregida) y el trazado del mapa es una línea recta. Usad un mapa de carreteras o el navegador para la ruta. No se puede saber de antemano si una carretera o una frontera estarán abiertas: prevalecen siempre las órdenes de las autoridades.';
    n.querySelector('#ev-todos-t').textContent = modo === 'avila' ? `Todos los corredores (${CORREDORES.length})` : `Todas las salidas (${gen.destinos.length})`;
  }
  await prepararOrigen();
  montarSelector(n.querySelector('#ev-ubi'), async () => { await prepararOrigen(); detalle(); }, { titulo: 'Desde dónde sales', compacto: true });

  /* ----------------------------- Escenarios ----------------------------- */
  const boton = (e) => `<button type="button" class="ev-chip${e.prioridad === 1 ? ' p1' : ''}" data-esc="${e.id}" aria-pressed="${e.id === escenario}"><span aria-hidden="true">${e.ic}</span> ${esc(e.t)}</button>`;
  n.querySelector('.ev-esc-1').innerHTML = ESCENARIOS.filter((e) => e.prioridad === 1).map(boton).join('');
  n.querySelector('.ev-esc:not(.ev-esc-1)').innerHTML = ESCENARIOS.filter((e) => e.prioridad > 1).map(boton).join('');

  const lineaCombustible = (d) => (!d.conocida ? 'Distancia no disponible: calcula el combustible con un mapa en papel' : d.repostar ? `⛽ <b>Hay que repostar</b> (tu autonomía: ${autonomia} km)` : `✅ Se llega con un depósito (${autonomia} km)`);
  function tarjeta(c, { evitar = false, orden = null } = {}) {
    const cl = CLASES[c.clase];
    const d = datosCorredor(lineas[c.id]?.properties, c.id, autonomia);
    const cerca = CENTRALES.filter((x) => d.nucleares[x.id] != null && d.nucleares[x.id] <= 60);
    return `<article class="ev-corr${evitar ? ' evitar' : ''}" style="--ev-color:${cl.color}" data-corr="${c.id}">
      <h3>${orden != null ? `<span class="ev-n">${orden}</span>` : ''}<span aria-hidden="true">${cl.ic}</span> ${esc(c.t)}</h3>
      <p class="ev-clase">${esc(cl.t)}${evitar ? ' · <b>no usar en este escenario</b>' : ''}</p>
      <div class="kv">
        <div>Destino</div><div>${esc(c.destino)}</div>
        <div>Por</div><div>${esc(c.via)}</div>
        <div>Distancia</div><div><b>≈ ${d.km ?? '—'} km</b> · ${esc(d.normal)} en condiciones normales · <b>${esc(d.crisis)}</b> en una crisis</div>
        <div>Combustible</div><div>${lineaCombustible(d)}</div>
        ${c.frontera ? `<div>Frontera</div><div>${esc(c.frontera)}</div>` : ''}
        ${c.puertos?.length ? `<div>Puertos de montaña</div><div>${esc(c.puertos.join(', '))}</div>` : ''}
        ${cerca.length ? `<div>Centrales nucleares</div><div>☢️ ${cerca.map((x) => `${esc(x.t)} a ≈ ${d.nucleares[x.id]} km`).join('; ')}</div>` : ''}
      </div>
      ${c.pros?.length ? `<p class="ev-pc"><b>A favor</b></p><ul>${c.pros.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
      ${c.contras?.length ? `<p class="ev-pc"><b>En contra</b></p><ul>${c.contras.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
      ${c.alternativa ? `<p class="muted"><b>Alternativa:</b> ${esc(c.alternativa)}</p>` : ''}
      <button class="btn sm ghost" type="button" data-ver="${c.id}">🗺 Ver en el mapa</button>
    </article>`;
  }
  function tarjetaGeneral(dst, { evitar = false, orden = null } = {}) {
    if (dst.id === 'interior') {
      const cl = CLASES.interior;
      return `<article class="ev-corr" style="--ev-color:${cl.color}">
        <h3>${orden != null ? `<span class="ev-n">${orden}</span>` : ''}<span aria-hidden="true">${cl.ic}</span> Refugio en el interior, cerca de ti</h3>
        <p class="ev-clase">${esc(cl.t)}</p>
        <p>Una zona rural de tu provincia o de una limítrofe, a poca distancia (que llegues con medio depósito). Lo que conviene buscar:</p>
        <ul><li>Pocos habitantes y lejos de autovías, ciudades grandes, centrales nucleares y bases militares.</li>
        <li>Agua todo el año: río, fuentes o pozos.</li><li>Leña, huertas o ganadería cerca.</li>
        <li>Mejor si tenéis allí familia, amistades o una segunda vivienda: apúntalo en «Mi plan familiar» como punto de encuentro.</li>
        <li>En verano, evita el monte con riesgo de incendio; en invierno, los puertos de montaña.</li></ul>
      </article>`;
    }
    const cl = CLASES[dst.clase];
    const d = { km: dst.km, normal: horas(dst.km / VELOCIDAD), crisis: horas((dst.km / VELOCIDAD) * FACTOR_CRISIS), repostar: dst.km > autonomia * 0.85, conocida: true };
    const cerca = gen.centrales.filter((x) => dst.nucleares[x.id] <= 60);
    return `<article class="ev-corr${evitar ? ' evitar' : ''}" style="--ev-color:${cl.color}" data-corr="${dst.id}">
      <h3>${orden != null ? `<span class="ev-n">${orden}</span>` : ''}<span aria-hidden="true">${cl.ic}</span> ${esc(dst.t)}</h3>
      <p class="ev-clase">${esc(cl.t)}${evitar ? ' · <b>no usar en este escenario</b>' : ''}</p>
      <div class="kv">
        <div>Por</div><div>${esc(dst.via)}</div>
        <div>Distancia</div><div><b>≈ ${d.km} km</b> (estimada) · ${esc(d.normal)} en condiciones normales · <b>${esc(d.crisis)}</b> en una crisis</div>
        <div>Combustible</div><div>${lineaCombustible(d)}</div>
        ${cerca.length ? `<div>Centrales nucleares</div><div>☢️ ${cerca.map((x) => `${esc(x.t)} a ≈ ${dst.nucleares[x.id]} km de la línea`).join('; ')}</div>` : ''}
      </div>
      ${dst.pros?.length ? `<p class="ev-pc"><b>A favor</b></p><ul>${dst.pros.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
      ${dst.contras?.length ? `<p class="ev-pc"><b>En contra</b></p><ul>${dst.contras.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
      <button class="btn sm ghost" type="button" data-ver="${dst.id}">🗺 Ver en el mapa</button>
    </article>`;
  }

  function detalle() {
    const e0 = ESCENARIOS.find((x) => x.id === escenario);
    const e = modo === 'avila' ? e0 : { ...e0, ...(e0.gen || {}) };
    n.querySelector('#ev-detalle').innerHTML = `<div class="card ev-detalle">
      <h2><span aria-hidden="true">${e.ic}</span> ${esc(e.t)}</h2>
      <p>${esc(e.resumen)}</p>
      <p class="ev-resp" aria-label="Respuesta, de menos a más movimiento">${e.respuesta.map((r) => `<span class="ev-r"><span aria-hidden="true">${RESPUESTAS[r].ic}</span> ${esc(RESPUESTAS[r].t)}</span>`).join('<span class="ev-flecha" aria-hidden="true">→</span>')}</p>
      <h3>Señales</h3><ul>${e.senales.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      <div class="kv">
        <div>Quedarse</div><div>${esc(e.quedarse)}</div>
        <div>Salir</div><div>${esc(e.salir)}</div>
      </div>
      <h3>De 72 horas a meses</h3>
      <div class="kv ev-fases">${e.fases.map(([f, t]) => `<div>${esc(f)}</div><div>${esc(t)}</div>`).join('')}</div>
      ${e.nota ? `<div class="blk-warn">${esc(e.nota)}</div>` : ''}
      ${e.zonas ? `<p class="blk-note">${esc(e.zonas)}</p>` : ''}
    </div>`;
    const caja = n.querySelector('#ev-corredores'), todos = n.querySelector('#ev-todos-lista');
    if (modo === 'avila') {
      caja.innerHTML = e.corredores.length
        ? `<div class="card"><h2>Corredores recomendados, por orden</h2>${e.corredores.map((id, i) => tarjeta(CORR[id], { orden: i + 1 })).join('')}
           ${e.evitar.length ? `<h2>No usar en este escenario</h2><p class="muted">${e.evitar.map((id) => esc(CORR[id].t)).join(' · ')}</p>` : ''}</div>`
        : '<div class="card"><h2>Corredores</h2><p>En este escenario <b>no se viaja</b>: la respuesta es quedarse dentro. Salid solo por orden de las autoridades y por la ruta que indiquen.</p></div>';
      todos.innerHTML = Object.entries(CLASES).map(([k, cl]) =>
        `<h3><span aria-hidden="true">${cl.ic}</span> ${esc(cl.t)}</h3><p class="muted">${esc(cl.d)}</p>${CORREDORES.filter((c) => c.clase === k).map((c) => tarjeta(c, { evitar: e.evitar.includes(c.id) })).join('')}`).join('');
    } else if (modo === 'general') {
      const rec = recomendadosGenerales(e0, gen.destinos);
      const evitar = new Set(e0.gen?.evitar || []);
      caja.innerHTML = rec.length
        ? `<div class="card"><h2>Por dónde salir, por orden</h2>${rec.map((d, i) => tarjetaGeneral(d, { orden: i + 1 })).join('')}</div>`
        : '<div class="card"><h2>Salidas</h2><p>En este escenario <b>no se viaja</b> por tu cuenta: la respuesta es quedarse dentro. Salid solo por orden de las autoridades y por la ruta que indiquen.</p></div>';
      todos.innerHTML = Object.entries(CLASES).filter(([k]) => k !== 'interior').map(([k, cl]) =>
        `<h3><span aria-hidden="true">${cl.ic}</span> ${esc(cl.t)}</h3><p class="muted">${esc(cl.d)}</p>${gen.destinos.filter((d) => d.clase === k).map((d) => tarjetaGeneral(d, { evitar: evitar.has(d.id) })).join('')}`).join('');
    } else {
      caja.innerHTML = '<div class="card"><h2>Por dónde salir</h2><p>Indica arriba tu provincia y tu ciudad o pueblo: la app calculará qué fronteras y puertos tienes más cerca y a qué distancia, sin conexión.</p></div>';
      todos.innerHTML = '';
    }
    n.querySelectorAll('[data-esc]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.esc === escenario)));
    pintarMapa();
  }

  /* -------------------------------- Mapa -------------------------------- */
  const capas = {};
  async function montarMapa() {
    try { L = await M.loadLeaflet(); } catch {
      if (!vivo) return;
      n.querySelector('#ev-map').innerHTML = '<div class="blk-warn">No se ha podido cargar el mapa. Las salidas siguen descritas abajo.</div>';
      return;
    }
    if (!vivo) return;   // se salió de la pantalla mientras cargaba
    map = L.map(n.querySelector('#ev-map'), { zoomControl: true }).setView([40.3, -3.8], 5);
    map.attributionControl.setPrefix('Leaflet');
    M.crearCapaRaster(L).addTo(map);
    try {
      const prov = await (await fetch('./data/geo/es-provincias.geojson')).json();
      L.geoJSON(prov, { style: { color: '#8b7752', weight: 1, fillOpacity: 0 }, interactive: false }).addTo(map);
    } catch { /* opcional */ }
    if (!vivo) return;
    capa = L.featureGroup().addTo(map);
    pintarMapa();
    setTimeout(() => { if (vivo) map.invalidateSize(); }, 120);
  }

  const centralEnMapa = (lat, lon, nombre, km) => {
    const fuerte = escenario === 'nuclear' || escenario === 'guerra';
    L.circle([lat, lon], { radius: 30000, color: '#E6C02E', weight: fuerte ? 2 : 1, fillOpacity: fuerte ? 0.18 : 0.06, dashArray: '4 4' })
      .bindPopup(`<b>☢️ ${esc(nombre)}</b><br>Zona de planificación de 30 km (PLABEN)${km != null ? `<br>A ≈ ${km} km de tu salida en línea recta` : ''}`).addTo(capa);
  };
  function pintarMapa() {
    if (!capa || !vivo) return;
    capa.clearLayers();
    for (const k of Object.keys(capas)) delete capas[k];
    const e = ESCENARIOS.find((x) => x.id === escenario);
    if (modo === 'avila' && geo) {
      const rec = new Set(e.corredores);
      for (const f of geo.features) {
        const p = f.properties, [lon, lat] = f.geometry.coordinates;
        if (p.tipo === 'corredor') {
          const c = CORR[p.id], cl = CLASES[c.clase];
          const evitar = e.evitar.includes(p.id), es = rec.has(p.id);
          const l = L.geoJSON(f, { style: { color: evitar ? '#8a8a7a' : cl.color, weight: es ? 5 : 2.5, opacity: es ? 0.95 : 0.45, dashArray: es ? null : '6 6' } })
            .bindPopup(`<b>${esc(c.t)}</b><br>≈ ${p.km} km · ${esc(c.via)}${evitar ? '<br><b>No usar en este escenario</b>' : ''}<br><span class="muted">Trazado esquemático por: ${esc(p.pasos.join(', '))}</span>`);
          l.addTo(capa); capas[p.id] = l;
        } else if (p.tipo === 'destino') {
          const c = CORR[p.id];
          if (!rec.has(p.id)) continue;
          L.circleMarker([lat, lon], { radius: 6, color: '#1B1F14', weight: 2, fillColor: CLASES[c.clase].color, fillOpacity: 1 })
            .bindTooltip(`${e.corredores.indexOf(p.id) + 1}. ${c.frontera || c.destino}`).addTo(capa);
        } else if (p.tipo === 'origen') {
          L.circleMarker([lat, lon], { radius: 8, color: '#fff', weight: 2, fillColor: '#B3261E', fillOpacity: 1 }).bindTooltip('Ávila (salida)', { permanent: true, direction: 'right' }).addTo(capa);
        } else if (p.tipo === 'nuclear') centralEnMapa(lat, lon, p.nombre, p.km);
        else if (p.tipo === 'estrategico' && escenario === 'guerra') {
          L.circleMarker([lat, lon], { radius: 7, color: '#E8715F', weight: 2, fillColor: '#E8715F', fillOpacity: 0.35 }).bindTooltip(`⚠️ ${p.nombre}: evitar`).addTo(capa);
        }
      }
    } else if (modo === 'general') {
      const rec = recomendadosGenerales(e, gen.destinos).filter((d) => d.c);
      const recIds = rec.map((d) => d.id), evitar = new Set(e.gen?.evitar || []);
      for (const d of gen.destinos) {
        const cl = CLASES[d.clase], es = recIds.includes(d.id), ev = evitar.has(d.id);
        const l = L.polyline([[origen[1], origen[0]], [d.c[1], d.c[0]]], { color: ev ? '#8a8a7a' : cl.color, weight: es ? 5 : 2, opacity: es ? 0.95 : 0.35, dashArray: es ? null : '6 6' })
          .bindPopup(`<b>${esc(d.t)}</b><br>≈ ${d.km} km (estimada) · ${esc(d.via)}${ev ? '<br><b>No usar en este escenario</b>' : ''}<br><span class="muted">Línea recta: no es la carretera.</span>`);
        l.addTo(capa); capas[d.id] = l;
        if (es) L.circleMarker([d.c[1], d.c[0]], { radius: 6, color: '#1B1F14', weight: 2, fillColor: cl.color, fillOpacity: 1 }).bindTooltip(`${recIds.indexOf(d.id) + 1}. ${d.t}`).addTo(capa);
      }
      L.circleMarker([origen[1], origen[0]], { radius: 8, color: '#fff', weight: 2, fillColor: '#B3261E', fillOpacity: 1 }).bindTooltip(`${u.mun.nombre} (salida)`, { permanent: true, direction: 'right' }).addTo(capa);
      for (const c of gen.centrales) centralEnMapa(c.c[1], c.c[0], c.t, Math.round(kmEntre(origen, c.c)));
      if (escenario === 'guerra') {
        Promise.all(ESTRATEGICOS.map(async (x) => ({ ...x, m: await ubi.municipio(x.ine) }))).then((lista) => {
          if (!vivo || !capa) return;
          for (const x of lista) if (x.m) L.circleMarker([x.m.lat, x.m.lon], { radius: 7, color: '#E8715F', weight: 2, fillColor: '#E8715F', fillOpacity: 0.35 }).bindTooltip(`⚠️ ${x.t}: evitar`).addTo(capa);
        });
      }
      if (rec.length) map.fitBounds(L.latLngBounds([[origen[1], origen[0]], ...rec.map((d) => [d.c[1], d.c[0]])]).pad(0.2), { animate: false });
    }
    n.querySelector('#ev-leyenda').innerHTML = modo === 'sin' ? '<span class="muted">Indica dónde vives para ver tus salidas.</span>' :
      Object.values(CLASES).filter((cl) => modo === 'avila' || cl !== CLASES.interior).map((cl) => `<span><i style="background:${cl.color}"></i>${esc(cl.t)}</span>`).join('') +
      '<span><i class="ev-l-nuc"></i>Central nuclear (30 km)</span>' +
      (escenario === 'guerra' ? '<span><i class="ev-l-obj"></i>Objetivo estratégico: evitar</span>' : '') +
      '<span class="muted">Gruesa = recomendada · fina discontinua = otras</span>';
  }

  function verEnMapa(id) {
    const l = capas[id];
    if (!map || !l || !vivo) return;
    n.querySelector('#ev-map').scrollIntoView({ behavior: 'smooth', block: 'center' });
    map.fitBounds(l.getBounds().pad(0.15), { animate: false });
    l.openPopup?.(l.getBounds().getCenter());
  }

  /* ------------------------------ Eventos ------------------------------ */
  n.addEventListener('click', (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.esc) { escenario = b.dataset.esc; detalle(); setKv('evac.escenario', escenario); n.querySelector('#ev-detalle h2')?.scrollIntoView({ block: 'nearest' }); }
    if (b.dataset.ver) verEnMapa(b.dataset.ver);
  });
  n.querySelector('#ev-auto').addEventListener('change', (ev) => {
    const v = Math.round(Number(ev.target.value));
    if (!(v >= 100 && v <= 2000)) { ev.target.value = autonomia; return; }
    autonomia = v; setKv('evac.autonomia', v); detalle();
  });

  detalle();
  montarMapa();
  return n;
}
