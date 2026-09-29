/* =========================================================================
   riesgos.js — Sección 📊 RIESGOS 2026 → 2036
   Sin porcentajes inventados: niveles cualitativos, confianza explícita,
   tipo de evidencia y escenarios. Todo offline.
   ========================================================================= */
import { el, esc, toast } from './ui.js';
import * as store from './store.js';
import {
  RIESGOS, NIVELES, TENDENCIAS, EVIDENCIA, ZONAS, ZONAS_FAMILIA, ANIOS,
  CATEGORIAS_RIESGO, COMPARADOR, conf, CONFIANZA_T,
  RIESGOS_ACTUALIZADO, RIESGOS_PROXIMA_REVISION,
} from '../../data/content/riesgos.js';
import { SOURCE_MAP } from '../../data/content/sources.js';
import { CCAA, ESTATAL, AVISO_TERRITORIOS } from '../../data/content/territorios.js';
import * as ubi from './ubicacion.js';

const RIESGO_MAP = Object.fromEntries(RIESGOS.map((r) => [r.id, r]));

const kv = async (id, def) => (await store.get('kv', id))?.v ?? def;
const setKv = (id, v) => store.put('kv', { id, v });

function chip(nivel) {
  const n = NIVELES[nivel] || NIVELES.nd;
  return `<span class="lvl" style="--lc:${n.c}">${n.ic} ${esc(n.t)}</span>`;
}

/* ------------------------------------------------------------------------
   GRÁFICA DE BANDA 2026–2036
   Mapeo de color = escala semántica de nivel de riesgo (la misma que usan las
   fichas), no una paleta decorativa. Sin rejilla superflua, con etiquetado
   directo y la incertidumbre representada como banda, no como línea única.
   ------------------------------------------------------------------------ */
function grafica(serie) {
  if (!serie || !serie.cen) {
    return `<div class="blk-note">Sin estimación fiable para este horizonte. No existe una base cuantificable que permita dibujar una evolución año a año sin inventarla. Consulta los escenarios más abajo.</div>`;
  }
  const W = 320, H = 130, PL = 26, PR = 20, PT = 10, PB = 22;
  const iw = W - PL - PR, ih = H - PT - PB;
  const x = (i) => PL + (i / (ANIOS.length - 1)) * iw;
  const y = (v) => PT + ih - (v / 4) * ih;

  const area = [
    ...serie.adv.map((v, i) => `${x(i)},${y(v)}`),
    ...serie.fav.map((v, i) => `${x(serie.fav.length - 1 - i)},${y(serie.fav[serie.fav.length - 1 - i])}`),
  ].join(' ');
  const linea = serie.cen.map((v, i) => `${x(i)},${y(v)}`).join(' ');

  const bandas = [0, 1, 2, 3, 4].map((v) =>
    `<line x1="${PL}" y1="${y(v)}" x2="${W - PR}" y2="${y(v)}" stroke="var(--line)" stroke-width="0.5"/>
     <text x="${PL - 4}" y="${y(v) + 3}" text-anchor="end" font-size="7" fill="var(--dim2)" font-family="monospace">${['MB', 'B', 'MO', 'A', 'MA'][v]}</text>`
  ).join('');

  const xticks = [0, 4, 10].map((i) =>
    `<text x="${x(i)}" y="${H - 6}" text-anchor="middle" font-size="8" fill="var(--dim2)" font-family="monospace">${ANIOS[i]}</text>`
  ).join('');

  return `<figure class="chart">
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolución cualitativa del nivel de riesgo entre 2026 y 2036, con banda entre escenario favorable y adverso">
      ${bandas}${xticks}
      <polygon points="${area}" fill="var(--olive3)" opacity="0.18"/>
      <polyline points="${linea}" fill="none" stroke="var(--olive3)" stroke-width="2" stroke-linejoin="round"/>
      ${serie.cen.map((v, i) => (i % 5 === 0 ? `<circle cx="${x(i)}" cy="${y(v)}" r="2.5" fill="var(--olive3)"/>` : '')).join('')}
    </svg>
    <figcaption class="muted">Escala cualitativa de nivel de riesgo — <b>no es una probabilidad</b>. La línea es el escenario central; la banda va del escenario favorable al adverso. MB muy bajo · B bajo · MO moderado · A alto · MA muy alto.</figcaption>
  </figure>`;
}

/* --------------------------------- Ficha --------------------------------- */
function ficha(r, zonaId) {
  const z = r.z[zonaId];
  if (!z) return `<div class="card"><h3>${r.ic} ${esc(r.t)}</h3><div class="blk-warn">DATOS NO DISPONIBLES para esta zona.</div></div>`;
  const t = TENDENCIAS[z.tend] || TENDENCIAS.nd;
  const ev = EVIDENCIA[z.ev];

  const escenarios = z.escenarios ? `
    <h4>Escenarios a 2036</h4>
    ${z.escenarios.map((e) => `<details class="esc esc-${e.n}"><summary>${e.n === 'favorable' ? '🟢' : e.n === 'intermedio' ? '🟡' : '🔴'} ${esc(e.t)}</summary><div>
      <p>${esc(e.d)}</p>
      <b class="muted">Indicadores que habría que vigilar</b>
      <ul>${e.ind.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
    </div></details>`).join('')}` : '';

  const lista = (arr, titulo) => arr?.length
    ? `<h4>${titulo}</h4><ul>${arr.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : '';

  return `<article class="card riesgo" data-r="${esc(r.id)}">
    <div class="riesgo-hd">
      <span class="ric">${r.ic}</span>
      <div><h3>${esc(r.t)}</h3>
        <div class="riesgo-meta">${chip(z.nivel)} <span class="badge">${t.ic} ${esc(t.t)}</span>
        <span class="badge" title="${esc(CONFIANZA_T[z.conf] || '')}">${conf(z.conf)}</span></div>
      </div>
    </div>

    <div class="evi"><b>${esc(ev.t)}</b> — ${esc(ev.d)}</div>
    ${z.pend ? '<div class="blk-warn">Valoración PENDIENTE DE VERIFICACIÓN contra la documentación oficial. Consulta las fuentes al final de la ficha y anota tú el valor verificado.</div>' : ''}

    <div class="bloque bloque-actual"><h4>SITUACIÓN ACTUAL</h4><p>${esc(z.actual)}</p></div>
    ${z.h2030 ? `<div class="bloque bloque-2030"><h4>PROYECCIÓN 2030</h4><p>${esc(z.h2030)}</p></div>` : ''}
    ${z.h2036 ? `<div class="bloque bloque-2036"><h4>PROYECCIÓN 2036</h4><p>${esc(z.h2036)}</p></div>` : ''}

    ${grafica(z.serie)}
    ${escenarios}

    ${lista(z.sube, '⬆️ Qué podría aumentar el riesgo')}
    ${lista(z.baja, '⬇️ Qué podría reducirlo')}
    ${lista(z.ciudad, '👤 Qué puedo hacer como ciudadano')}
    ${lista(z.prep, '🎒 Preparación que recomienda la aplicación')}

    ${z.src?.length ? `<h4>Fuentes</h4><div>${z.src.map((s) => {
      const f = SOURCE_MAP[s];
      return f ? `<a class="tag" href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.org)} ↗</a>` : `<span class="tag">${esc(s)}</span>`;
    }).join('')}</div>` : ''}

    <div class="verif">
      <label>Mi verificación (solo en este dispositivo)</label>
      <div class="fieldrow">
        <select data-vn="${esc(r.id)}::${esc(zonaId)}">
          <option value="">Sin verificar por mí</option>
          ${Object.entries(NIVELES).filter(([k]) => k !== 'nd').map(([k, v]) => `<option value="${k}">${v.ic} ${esc(v.t)}</option>`).join('')}
        </select>
        <input type="date" data-vf="${esc(r.id)}::${esc(zonaId)}" aria-label="Fecha de verificación">
      </div>
    </div>
  </article>`;
}

/* =========================================================================
   ÁMBITO "MI ZONA"
   ---------------------------------------------------------------------------
   Aquí NO se inventa una evaluación por provincia. No existe una valoración
   oficial homogénea provincia a provincia, así que lo que se muestra es:

     1. Un hecho administrativo comprobable: qué planes oficiales tiene tu
        comunidad ante ese riesgo, y cuáles hay a nivel estatal. Que exista
        un plan significa que la administración competente reconoce el riesgo
        como relevante ahí. No dice cuánto riesgo hay.
     2. Un aviso explícito de que no hay evaluación específica para tu zona.
     3. La evaluación de ámbito ESTADO, que sí está sostenida por fuentes.

   Excepción: la provincia de Ávila (05) sí tiene evaluación propia en la
   app, así que ahí se usa esa en vez de la estatal.
   ========================================================================= */

const ZONA_LOCAL = { '05': 'avila' };

function marcaVerif(v) {
  return v === 2
    ? '<span class="badge ok" title="Confirmado en fuente oficial">✔ oficial</span>'
    : '<span class="badge warn" title="Hay indicio en fuente oficial pero no se pudo confirmar la norma, la sigla o el estado">⚠ pendiente de confirmar</span>';
}

function planEnlace(p) {
  const nom = [p.s, p.t].filter(Boolean).join(' — ');
  const cuerpo = `${esc(nom)}${p.e ? ` <span class="muted">(${esc(p.e)})</span>` : ''} ${marcaVerif(p.v)}`;
  return p.url
    ? `<li><a href="${esc(p.url)}" target="_blank" rel="noopener">${cuerpo} ↗</a></li>`
    : `<li>${cuerpo}</li>`;
}

function bloqueTerritorial(riesgoId, prov) {
  const c = CCAA[prov.ccaa];
  const propios = (c?.pe || []).filter((x) => x.r === riesgoId);
  const estatales = ESTATAL.planes.filter((x) => x.r === riesgoId);
  const sinPlan = (c?.sp || []).includes(riesgoId);

  let cuerpo = '';
  if (propios.length) {
    cuerpo += `<h4>Planes de ${esc(prov.ccaaNombre)}</h4><ul class="planes">${propios.map(planEnlace).join('')}</ul>`;
  } else if (sinPlan) {
    cuerpo += `<div class="blk-note">${esc(prov.ccaaNombre)} no tiene plan autonómico propio ante este riesgo. Se aplica el marco estatal.</div>`;
  } else {
    cuerpo += `<div class="blk-warn">DATOS NO DISPONIBLES: no se ha localizado plan autonómico de ${esc(prov.ccaaNombre)} ante este riesgo. Eso no significa que no exista, sólo que no se ha podido verificar.</div>`;
  }
  if (estatales.length) {
    cuerpo += `<h4>Marco estatal</h4><ul class="planes">${estatales.map((x) => planEnlace({ ...x, s: null, e: x.norma })).join('')}</ul>`;
  }

  return `<section class="card terr">
    <h3>🏛️ Planificación oficial en ${esc(prov.nombre)}</h3>
    ${cuerpo}
  </section>`;
}

function fichaMiZona(r, prov) {
  const base = ZONA_LOCAL[prov.cod];
  const aviso = base
    ? ''
    : `<div class="blk-warn"><b>Sin evaluación específica para ${esc(prov.nombre)}.</b> La aplicación no tiene una valoración propia de este riesgo en tu provincia y no se la va a inventar. Debajo va la de ámbito ESPAÑA, que sí está sostenida por fuentes, y arriba los planes oficiales que sí aplican donde estás.</div>`;
  const zonaBase = base || 'espana';
  if (!r.z[zonaBase]) {
    return `<div class="mizona">${bloqueTerritorial(r.id, prov)}
      <div class="card"><h3>${r.ic} ${esc(r.t)}</h3><div class="blk-warn">DATOS NO DISPONIBLES para este ámbito.</div></div></div>`;
  }
  return `<div class="mizona">${bloqueTerritorial(r.id, prov)}${aviso}${ficha(r, zonaBase)}</div>`;
}

function panelUbicacion(prov, modo) {
  const opciones = ubi.PROVINCIAS_ORDENADAS
    .map((p) => `<option value="${esc(p.cod)}"${prov && p.cod === prov.cod ? ' selected' : ''}>${esc(p.nombre)}</option>`)
    .join('');
  const cabecera = prov
    ? `<div class="ubi-act"><b>${esc(prov.nombre)}</b><span class="muted">${esc(prov.ccaaNombre)}</span>
       <span class="badge">${modo === 'gps' ? '📡 detectada' : '✍️ elegida a mano'}</span></div>`
    : '<div class="blk-note">Todavía no has indicado dónde estás. Detéctalo o elige tu provincia.</div>';

  return `<section class="card ubi" id="ubi">
    <h3>📍 Dónde estás</h3>
    ${cabecera}
    <div class="fieldrow">
      <button class="btn" id="ubi-gps" type="button"${ubi.HAY_GPS ? '' : ' disabled'}>📡 Usar mi ubicación</button>
      <div><label for="ubi-sel">O elígela a mano</label>
        <select id="ubi-sel"><option value="">— Provincia —</option>${opciones}</select></div>
    </div>
    <p class="muted" id="ubi-msg"></p>
    <details><summary>Qué se guarda y qué no</summary><div>
      <p>La posición se convierte en provincia <b>dentro del móvil</b>, comparándola con la cartografía del IGN que la aplicación ya lleva descargada. No se consulta ningún servicio, así que funciona en modo avión.</p>
      <p><b>Nunca se guardan tus coordenadas.</b> Sólo se guarda la provincia. El almacén donde se escribe entra en la sincronización opcional, y una provincia basta para elegir el ámbito, mientras que unas coordenadas precisas serían un registro de dónde vives.</p>
      <p class="muted">Cerca de un límite provincial la detección puede equivocarse por unos cientos de metros: corrígela a mano si hace falta.</p>
    </div></details>
  </section>`;
}

/* ------------------------------- Vista principal ------------------------------- */
export async function riesgosView() {
  const zonaGuardada = await kv('riesgos.zona', 'avila');
  const fechas = await kv('riesgos.fechas', { act: RIESGOS_ACTUALIZADO, prox: RIESGOS_PROXIMA_REVISION });

  /* MI ZONA se antepone a los ámbitos fijos: es el que responde a "dónde
     estoy", que es la primera pregunta cuando pasa algo. */
  const AMBITOS = [{ id: 'mizona', t: 'MI ZONA', ic: '📍' }, ...ZONAS];

  const n = el(`<div>
    <div class="zonasel" id="rz">
      ${AMBITOS.map((z) => `<button type="button" data-z="${z.id}" aria-pressed="${z.id === zonaGuardada}">${z.ic}<b>${esc(z.t)}</b></button>`).join('')}
    </div>
    <div id="ubi-wrap"></div>

    <details class="card"><summary>📐 Cómo leer esta sección (metodología)</summary><div>
      <p>Esta sección <b>no contiene probabilidades numéricas inventadas</b>. En ningún punto verás algo como «guerra: 27 %», porque no existe una metodología pública que permita justificarlo.</p>
      <h4>Tipo de evidencia</h4>
      <div class="kv">${Object.values(EVIDENCIA).map((e) => `<div>${esc(e.t)}</div><div>${esc(e.d)}</div>`).join('')}</div>
      <h4>Nivel</h4>
      <p class="muted">Escala cualitativa de exposición y consecuencia. <b>No es una probabilidad matemática.</b> "Riesgo alto" no significa "80 % de que ocurra".</p>
      <div class="kv">${Object.entries(NIVELES).map(([, v]) => `<div>${v.ic} ${esc(v.t)}</div><div>${v.v == null ? 'Sin datos suficientes' : 'Nivel ' + v.v + ' de 4'}</div>`).join('')}</div>
      <h4>Confianza</h4>
      <div class="kv">${[5, 4, 3, 2, 1].map((c) => `<div>${conf(c)}</div><div>${esc(CONFIANZA_T[c])}</div>`).join('')}</div>
      <div class="blk-warn">Nunca se mezcla una proyección climática (donde hay modelos) con una valoración geopolítica (donde no los hay). Cada ficha declara con qué se ha construido.</div>
    </div></details>

    <div class="card">
      <div class="fieldrow">
        <div><label>Última actualización</label><input type="date" id="rf-act" value="${esc(fechas.act)}"></div>
        <div><label>Próxima revisión</label><input type="date" id="rf-prox" value="${esc(fechas.prox)}"></div>
      </div>
      <div class="muted">Puedes modificar estas fechas cuando revises los contenidos con Internet.</div>
    </div>

    <a class="btn wide ghost" href="#/riesgos/comparar" style="margin-bottom:10px">📊 Comparar Ávila · Terrassa · Getafe</a>
    <div class="filtros">
      <button class="btn sm" id="r-todos" type="button">Todos</button>
      ${Object.entries(CATEGORIAS_RIESGO).map(([k, v]) => `<button class="btn sm ghost" data-cat="${k}" type="button">${v.ic} ${esc(v.t)}</button>`).join('')}
    </div>

    <div id="r-list"></div>
  </div>`);

  let zona = zonaGuardada, cat = '';

  let miProv = await ubi.guardada();

  function pintaPanel() {
    const w = n.querySelector('#ubi-wrap');
    if (zona !== 'mizona') { w.innerHTML = ''; return; }
    w.innerHTML = panelUbicacion(miProv, miProv?.modo);

    const msg = w.querySelector('#ubi-msg');
    w.querySelector('#ubi-gps')?.addEventListener('click', async (e) => {
      const b = e.currentTarget;
      b.disabled = true; msg.textContent = 'Localizando…';
      try {
        const p = await ubi.localizar();
        miProv = { ...(await ubi.guardar(p.cod, 'gps')), modo: 'gps' };
        toast(`Ubicación: ${p.nombre}`);
        pintaPanel(); pinta();
      } catch (err) {
        /* El navegador da mensajes crípticos; ubicacion.js ya los traduce.
           Se muestran tal cual, sin envolverlos en un "ha ocurrido un error". */
        msg.textContent = err.message;
        b.disabled = false;
      }
    });
    w.querySelector('#ubi-sel')?.addEventListener('change', async (e) => {
      if (!e.target.value) return;
      miProv = { ...(await ubi.guardar(e.target.value, 'manual')), modo: 'manual' };
      toast(`Ubicación: ${miProv.nombre}`);
      pintaPanel(); pinta();
    });
  }

  async function pinta() {
    if (zona === 'mizona') {
      const cont = n.querySelector('#r-list');
      if (!miProv) {
        cont.innerHTML = '<div class="blk-note">Indica arriba dónde estás y aquí aparecerán los planes oficiales que aplican en tu comunidad, junto con la evaluación de ámbito estatal.</div>';
        return;
      }
      const lista = RIESGOS.filter((r) => !cat || r.cat === cat);
      cont.innerHTML = `<div class="blk-note">${esc(AVISO_TERRITORIOS)}</div>`
        + (lista.length
          ? lista.map((r) => fichaMiZona(r, miProv)).join('')
          : '<div class="blk-note">Sin riesgos en esta categoría.</div>');
      await restauraVerif();
      return;
    }

    const lista = RIESGOS.filter((r) => (!cat || r.cat === cat) && r.z[zona]);
    n.querySelector('#r-list').innerHTML = lista.length
      ? lista.map((r) => ficha(r, zona)).join('')
      : '<div class="blk-note">Sin riesgos en esta categoría para la zona seleccionada.</div>';

    await restauraVerif();
  }

  async function restauraVerif() {
    // Restaurar verificaciones del usuario
    const verif = await kv('riesgos.verif', {});
    n.querySelectorAll('[data-vn]').forEach((s) => {
      const v = verif[s.dataset.vn];
      if (v) s.value = v.nivel || '';
      s.addEventListener('change', async () => {
        const all = await kv('riesgos.verif', {});
        all[s.dataset.vn] = { ...(all[s.dataset.vn] || {}), nivel: s.value };
        await setKv('riesgos.verif', all);
        toast('Verificación guardada en este dispositivo');
      });
    });
    n.querySelectorAll('[data-vf]').forEach((i) => {
      const v = verif[i.dataset.vf];
      if (v) i.value = v.fecha || '';
      i.addEventListener('change', async () => {
        const all = await kv('riesgos.verif', {});
        all[i.dataset.vf] = { ...(all[i.dataset.vf] || {}), fecha: i.value };
        await setKv('riesgos.verif', all);
      });
    });
  }

  n.querySelectorAll('#rz button').forEach((b) => b.addEventListener('click', async () => {
    zona = b.dataset.z;
    n.querySelectorAll('#rz button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    await setKv('riesgos.zona', zona);
    pintaPanel();
    pinta();
  }));

  n.querySelector('#r-todos').addEventListener('click', () => {
    cat = '';
    n.querySelectorAll('[data-cat]').forEach((x) => x.classList.add('ghost'));
    n.querySelector('#r-todos').classList.remove('ghost');
    pinta();
  });
  n.querySelectorAll('[data-cat]').forEach((b) => b.addEventListener('click', () => {
    cat = b.dataset.cat;
    n.querySelectorAll('[data-cat]').forEach((x) => x.classList.toggle('ghost', x !== b));
    n.querySelector('#r-todos').classList.add('ghost');
    pinta();
  }));

  n.querySelector('#rf-act').addEventListener('change', async (e) => {
    const f = await kv('riesgos.fechas', {}); f.act = e.target.value; await setKv('riesgos.fechas', f);
  });
  n.querySelector('#rf-prox').addEventListener('change', async (e) => {
    const f = await kv('riesgos.fechas', {}); f.prox = e.target.value; await setKv('riesgos.fechas', f);
  });

  pintaPanel();
  await pinta();
  return n;
}

/* ------------------------------- Comparador ------------------------------- */
export async function compararView() {
  const filas = COMPARADOR.map((id) => RIESGO_MAP[id]).filter(Boolean);
  const verif = await kv('riesgos.verif', {});

  const celda = (r, z) => {
    const d = r.z[z];
    if (!d) return '<td><span class="muted">—</span></td>';
    const v = verif[`${r.id}::${z}`];
    const nivel = v?.nivel || d.nivel;
    const t = TENDENCIAS[d.tend] || TENDENCIAS.nd;
    return `<td>${chip(nivel)}<div class="muted" style="margin-top:3px">${t.ic} ${conf(d.conf)}${v?.nivel ? ' ·<b> tuyo</b>' : ''}${d.pend && !v?.nivel ? ' · <span style="color:var(--amber)">pend.</span>' : ''}</div></td>`;
  };

  return el(`<div>
    <div class="blk-note">Comparación de las tres ubicaciones familiares.
      <b>Ávila</b> se apoya en INFOCAL, AEMET, IGN y el plan provincial PLATEA.
      <b>Terrassa</b>, en su DUPROCIM homologado (aprobado el 31/03/2023): en Cataluña, que un municipio esté obligado a redactar un Plan de Actuación Municipal para un riesgo significa que el plan autonómico lo identifica como afectado, así que es un indicador oficial.
      <b>Getafe</b> se apoya en el marco autonómico (PLATERCAM y planes especiales), porque su plan de emergencias municipal seguía pendiente de aprobación según información pública de septiembre de 2025.
      Lo que lleva la marca <b>"pend."</b> sigue sin contrastar. Puedes verificarlo tú y anotar el valor en cada ficha: se guarda en tu dispositivo y aparece aquí como "tuyo".</div>
    <div class="tw"><table class="cmp">
      <thead><tr><th>Riesgo</th>${ZONAS_FAMILIA.map((z) => `<th>${z.ic} ${esc(z.t)}</th>`).join('')}</tr></thead>
      <tbody>${filas.map((r) => `<tr>
        <th class="rn">${r.ic} ${esc(r.t)}</th>
        ${ZONAS_FAMILIA.map((z) => celda(r, z.id)).join('')}
      </tr>`).join('')}</tbody>
    </table></div>
    <div class="card"><h3>Cómo leer la tabla</h3>
      <div class="kv">
        <div>Chip de color</div><div>Nivel cualitativo de riesgo, no una probabilidad</div>
        <div>Flecha</div><div>Tendencia esperada en el horizonte 2026–2036</div>
        <div>Estrellas</div><div>Confianza en la valoración</div>
        <div>"pend."</div><div>Nivel pendiente de verificar contra fuente oficial municipal</div>
        <div>"tuyo"</div><div>Valor que has verificado y anotado tú</div>
      </div>
    </div>
    <div class="btnrow"><a class="btn ghost" href="#/sec/riesgos">← Volver a las fichas</a></div>
  </div>`);
}
