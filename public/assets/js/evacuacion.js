/* =========================================================================
   evacuacion.js — PLAN DE EVACUACIÓN
   Escenario → respuesta, fases (72 h a meses) y corredores recomendados,
   con el mapa del IGN. Los trazados vienen de data/geo/evac-rutas.geojson
   (generado en el build a partir de la geometría municipal del IGN).
   ========================================================================= */
import { el, esc, alSalir } from './ui.js';
import * as store from './store.js';
import * as M from './maps.js';
import { CLASES, CORREDORES, ESCENARIOS, RESPUESTAS, SALIR_PAIS, AVISO_EVACUACION, CENTRALES } from '../../data/content/evacuacion.js';

const kv = async (id, def) => (await store.get('kv', id).catch(() => null))?.v ?? def;
const setKv = (id, v) => store.put('kv', { id, v }).catch(() => {});
const CORR = Object.fromEntries(CORREDORES.map((c) => [c.id, c]));
const VELOCIDAD = 80;          // km/h de media en condiciones normales
const FACTOR_CRISIS = 2.5;     // atascos, controles y desvíos
const horas = (h) => (h < 1 ? `${Math.round(h * 60)} min` : `${Math.floor(h)} h${Math.round((h % 1) * 60) ? ` ${Math.round((h % 1) * 60)} min` : ''}`);

/** Datos calculados de un corredor: distancia, tiempos y combustible. */
export function datosCorredor(geo, id, autonomia) {
  const km = geo?.km ?? null;
  return {
    km,
    normal: km != null ? horas(km / VELOCIDAD) : '—',
    crisis: km != null ? horas((km / VELOCIDAD) * FACTOR_CRISIS) : '—',
    repostar: km != null && km > autonomia * 0.85,   // margen del 15 %
    nucleares: geo?.nucleares || {},
  };
}

export async function evacuacionView() {
  const n = el(`<div>
    <p class="muted">Desde Ávila hacia el resto de España o fuera del país, según lo que esté pasando.</p>
    <div class="blk-warn">${esc(AVISO_EVACUACION)}</div>
    <div class="card">
      <h2>¿Qué está pasando?</h2>
      <div class="ev-esc ev-esc-1" role="group" aria-label="Escenarios prioritarios"></div>
      <div class="ev-esc" role="group" aria-label="Otros escenarios"></div>
    </div>
    <div id="ev-detalle"></div>
    <div class="card">
      <h2>Mapa de corredores</h2>
      <div id="ev-map" class="ev-map" role="region" aria-label="Mapa de corredores de evacuación desde Ávila"></div>
      <div id="ev-leyenda" class="ev-leyenda"></div>
      <div class="fieldrow" style="margin-top:6px">
        <div><label for="ev-auto">Autonomía del coche (km con el depósito lleno)</label>
        <input id="ev-auto" type="number" inputmode="numeric" min="100" max="2000" step="10"></div>
      </div>
    </div>
    <div id="ev-corredores"></div>
    <details class="card" id="ev-todos"><summary>Todos los corredores (${CORREDORES.length})</summary><div id="ev-todos-lista"></div></details>
    <details class="card"><summary>Salir del país: qué llevar y qué saber</summary><div>
      ${SALIR_PAIS.map((g) => `<h3>${esc(g.t)}</h3><ul>${g.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`).join('')}
    </div></details>
  </div>`);

  let escenario = await kv('evac.escenario', 'colapso');
  if (!ESCENARIOS.some((e) => e.id === escenario)) escenario = 'colapso';
  let autonomia = Number(await kv('evac.autonomia', 600)) || 600;
  n.querySelector('#ev-auto').value = autonomia;

  // Trazados generados en el build (precacheados: funcionan sin conexión).
  let geo = null;
  try { geo = await (await fetch('./data/geo/evac-rutas.geojson')).json(); } catch { /* sin trazados: el texto sigue sirviendo */ }
  const lineas = Object.fromEntries((geo?.features || []).filter((f) => f.properties.tipo === 'corredor').map((f) => [f.properties.id, f]));

  /* ----------------------------- Escenarios ----------------------------- */
  const boton = (e) => `<button type="button" class="ev-chip${e.prioridad === 1 ? ' p1' : ''}" data-esc="${e.id}" aria-pressed="${e.id === escenario}"><span aria-hidden="true">${e.ic}</span> ${esc(e.t)}</button>`;
  n.querySelector('.ev-esc-1').innerHTML = ESCENARIOS.filter((e) => e.prioridad === 1).map(boton).join('');
  n.querySelector('.ev-esc:not(.ev-esc-1)').innerHTML = ESCENARIOS.filter((e) => e.prioridad > 1).map(boton).join('');

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
        <div>Combustible</div><div>${d.repostar ? `⛽ <b>Hay que repostar</b> (tu autonomía: ${autonomia} km)` : `✅ Se llega con un depósito (${autonomia} km)`}</div>
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

  function detalle() {
    const e = ESCENARIOS.find((x) => x.id === escenario);
    n.querySelector('#ev-detalle').innerHTML = `<div class="card ev-detalle">
      <h2><span aria-hidden="true">${e.ic}</span> ${esc(e.t)}</h2>
      <p>${esc(e.resumen)}</p>
      <p class="ev-resp" aria-label="Respuesta, de menos a más movimiento">${e.respuesta.map((r) => `<span class="ev-r"><span aria-hidden="true">${RESPUESTAS[r].ic}</span> ${esc(RESPUESTAS[r].t)}</span>`).join('<span class="ev-flecha" aria-hidden="true">→</span>')}</p>
      <h3>Señales</h3><ul>${e.senales.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
      <div class="kv">
        <div>Quedarse</div><div>${esc(e.quedarse)}</div>
        <div>Salir</div><div>${esc(e.salir)}</div>
      </div>
      <h3>De 72 horas a meses</h3>
      <div class="kv ev-fases">${e.fases.map(([f, t]) => `<div>${esc(f)}</div><div>${esc(t)}</div>`).join('')}</div>
      ${e.nota ? `<div class="blk-warn">${esc(e.nota)}</div>` : ''}
      ${e.zonas ? `<p class="blk-note">${esc(e.zonas)}</p>` : ''}
    </div>`;
    n.querySelector('#ev-corredores').innerHTML = e.corredores.length
      ? `<div class="card"><h2>Corredores recomendados, por orden</h2>${e.corredores.map((id, i) => tarjeta(CORR[id], { orden: i + 1 })).join('')}
         ${e.evitar.length ? `<h2>No usar en este escenario</h2><p class="muted">${e.evitar.map((id) => esc(CORR[id].t)).join(' · ')}</p>` : ''}</div>`
      : '<div class="card"><h2>Corredores</h2><p>En este escenario <b>no se viaja</b>: la respuesta es quedarse dentro. Salid solo por orden de las autoridades y por la ruta que indiquen.</p></div>';
    n.querySelector('#ev-todos-lista').innerHTML = Object.entries(CLASES).map(([k, cl]) =>
      `<h3><span aria-hidden="true">${cl.ic}</span> ${esc(cl.t)}</h3><p class="muted">${esc(cl.d)}</p>${CORREDORES.filter((c) => c.clase === k).map((c) => tarjeta(c, { evitar: e.evitar.includes(c.id) })).join('')}`).join('');
    n.querySelectorAll('[data-esc]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.esc === escenario)));
    pintarMapa();
  }

  /* -------------------------------- Mapa -------------------------------- */
  let L = null, map = null, capa = null, vivo = true;
  const capas = {};
  // Al salir se para todo: un zoom animado sobre un mapa ya retirado falla.
  alSalir(() => { vivo = false; if (map) { map.stop?.(); map.remove(); } });
  async function montarMapa() {
    try { L = await M.loadLeaflet(); } catch {
      if (!vivo) return;
      n.querySelector('#ev-map').innerHTML = '<div class="blk-warn">No se ha podido cargar el mapa. Los corredores siguen descritos abajo.</div>';
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

  function pintarMapa() {
    if (!capa || !geo || !vivo) return;
    capa.clearLayers();
    const e = ESCENARIOS.find((x) => x.id === escenario);
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
      } else if (p.tipo === 'nuclear') {
        const fuerte = escenario === 'nuclear' || escenario === 'guerra';
        L.circle([lat, lon], { radius: 30000, color: '#E6C02E', weight: fuerte ? 2 : 1, fillOpacity: fuerte ? 0.18 : 0.06, dashArray: '4 4' })
          .bindPopup(`<b>☢️ ${esc(p.nombre)}</b><br>Zona de planificación de 30 km (PLABEN)<br>A ≈ ${p.km} km de Ávila en línea recta`).addTo(capa);
      } else if (p.tipo === 'estrategico' && escenario === 'guerra') {
        L.circleMarker([lat, lon], { radius: 7, color: '#E8715F', weight: 2, fillColor: '#E8715F', fillOpacity: 0.35 })
          .bindTooltip(`⚠️ ${p.nombre}: evitar`).addTo(capa);
      }
    }
    n.querySelector('#ev-leyenda').innerHTML =
      Object.values(CLASES).map((cl) => `<span><i style="background:${cl.color}"></i>${esc(cl.t)}</span>`).join('') +
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
