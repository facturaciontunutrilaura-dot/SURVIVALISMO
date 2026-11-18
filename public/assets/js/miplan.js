/* =========================================================================
   miplan.js — TU PLAN A MEDIDA (asistente, plan y «Tu siguiente paso»)
   Unas pocas preguntas y la app se adapta: lista de preparación por
   prioridad, agua y comida para tu hogar y los riesgos que te tocan.
   Se guarda solo en este móvil (kv 'miplan.*') y entra en las copias.
   ========================================================================= */
import { el, esc, toast } from './ui.js';
import * as store from './store.js';
import * as P from './plan-core.js';
import { PERFIL_INICIAL, VIVIENDAS, ENTORNOS, ZONAS, PROV_ZONA, CONSUMO } from '../../data/content/miplan.js';
import { PRIORIDADES } from '../../data/content/index.js';
import { diasDespensa } from './herramientas-core.js';
import { saldoTotal } from './efectivo-core.js';

const kv = async (id, def) => (await store.get('kv', id).catch(() => null))?.v ?? def;
const setKv = (id, v) => store.put('kv', { id, v });
const es = (x) => String(x).replace('.', ',');
const miles = (x) => Math.round(x).toLocaleString('es-ES');

/** Simulacro para practicar cada riesgo (si lo hay). */
const SIMULACRO_DE = { apagon: 'apagon', inundacion: 'dana', 'ola-calor': 'calor', 'incendio-vivienda': 'humo' };

/** Todo lo que la app sabe de tu preparación, leído del almacenamiento. */
export async function datosPlan() {
  const [kvs, contactos, geo] = await Promise.all([store.all('kv').catch(() => []), store.all('contactos').catch(() => []), store.all('geo').catch(() => [])]);
  const v = Object.fromEntries(kvs.map((r) => [r.id, r.v]));
  const desp = diasDespensa(v['despensa.inventario'] || {}, 1, 1);
  const ef = v['efectivo.datos'];
  let efectivo = 0, efectivoTs = 0;
  if (ef?.bolsillos) {
    try { efectivo = saldoTotal(ef) / 100; } catch { efectivo = 0; }
    efectivoTs = Math.max(0, ...ef.bolsillos.map((b) => b.baseTs || 0), ...(ef.movs || []).map((m) => m.ts || 0));
  }
  const lleno = (k) => typeof v[k] === 'string' && v[k].trim();
  const nodos = Array.isArray(v['familia.nodos']) ? v['familia.nodos'].filter((x) => x && !x.ejemplo) : [];
  return {
    perfil: v['miplan.perfil'] || null,
    aguaL: desp.agua, kcal: desp.kcal,
    efectivo, efectivoTs,
    contactos: contactos.length,
    externo: contactos.some((c) => c.r === 'externo'),
    encuentro: !!(lleno('plan.punto') || lleno('plan.cerca') || lleno('plan.lejos') || nodos.some((x) => String(x.encuentro || '').trim())),
    rutas: nodos.some((x) => x.rutas?.length) || geo.some((g) => g.volver),
    medico: !!lleno('plan.medico'),
    hechos: v['miplan.hechos'] || {},
    pospuestos: v['miplan.pospuestos'] || {},
  };
}

/* ------------------------------ Tu siguiente paso ------------------------------ */
/** Tarjeta «Tu siguiente paso» (portada y pantalla del plan). */
export async function montarSiguientePaso(caja) {
  const d = await datosPlan();
  const paso = P.siguientePaso(d.perfil, d);
  if (!caja.isConnected) return;
  const prog = d.perfil ? P.progresoPlan(d.perfil, d) : null;
  caja.className = `card paso${paso.fin ? ' fin' : ''}`;
  caja.innerHTML = `<p class="paso-et">👣 Tu siguiente paso${prog ? ` <span class="muted">· plan: ${prog.hechas} de ${prog.total}</span>` : ''}</p>
    <h3>${esc(paso.t)}</h3>
    ${paso.d ? `<p>${esc(paso.d)}</p>` : ''}
    <div class="btnrow">
      ${paso.ruta ? `<a class="btn sm" href="${esc(paso.ruta)}">${esc(paso.boton || 'Ir')}</a>` : ''}
      ${paso.marcar ? '<button class="btn sm ghost" type="button" data-hecho>✓ Ya lo tengo</button>' : ''}
      ${d.perfil && !paso.fin ? '<button class="btn sm ghost" type="button" data-luego>Ahora no</button>' : ''}
    </div>`;
  caja.hidden = false;
  caja.querySelector('[data-hecho]')?.addEventListener('click', async () => {
    await setKv('miplan.hechos', { ...d.hechos, [paso.id]: Date.now() }).catch(() => {});
    toast('¡Hecho! Vamos con el siguiente', { tipo: 'ok' });
    montarSiguientePaso(caja);
  });
  caja.querySelector('[data-luego]')?.addEventListener('click', async () => {
    await setKv('miplan.pospuestos', { ...d.pospuestos, [paso.id]: Date.now() }).catch(() => {});
    toast('Te lo recordaré en una semana');
    montarSiguientePaso(caja);
  });
}

/* --------------------------------- Asistente --------------------------------- */
const contador = (k, t, ayuda, v) => `<div class="mp-cont"><div><b>${esc(t)}</b>${ayuda ? `<small>${esc(ayuda)}</small>` : ''}</div>
  <div class="mp-num" role="group" aria-label="${esc(t)}"><button type="button" class="btn-ico" data-menos="${k}" aria-label="Uno menos">−</button><output id="mp-${k}" aria-live="polite">${v}</output><button type="button" class="btn-ico" data-mas="${k}" aria-label="Uno más">+</button></div></div>`;
const siNo = (k, v) => `<div class="mp-sino" role="radiogroup">${[[true, 'Sí'], [false, 'No']].map(([x, t]) => `<button type="button" role="radio" class="mp-op" data-k="${k}" data-v="${x}" aria-checked="${v === x}">${t}</button>`).join('')}</div>`;
const opciones = (k, lista, v) => `<div class="mp-ops" role="radiogroup">${lista.map(([x, t]) => `<button type="button" role="radio" class="mp-op" data-k="${k}" data-v="${esc(x)}" aria-checked="${v === x}">${esc(t)}</button>`).join('')}</div>`;

const PASOS = [
  { t: '¿Cuántos sois en casa?', html: (p) => contador('adultos', 'Adultos', '', p.adultos) + contador('mayores', 'Personas mayores', 'De 65 años o más', p.mayores) + contador('ninos', 'Niños y niñas', 'De 2 a 14 años', p.ninos) + contador('bebes', 'Bebés', 'Menores de 2 años', p.bebes),
    valido: (p) => P.personas(p) > 0 || 'Indica al menos una persona.' },
  { t: '¿Tenéis mascotas?', html: (p) => contador('mascotas', 'Mascotas', 'Perros, gatos u otros animales', p.mascotas) },
  { t: '¿Alguien toma medicación habitual?', html: (p) => siNo('medicacion', p.medicacion) + (p.medicacion ? `<p class="mp-sub">¿Alguna necesita nevera, como la insulina?</p>${siNo('frio', p.frio)}` : '') },
  { t: '¿Alguien necesita ayuda especial?', html: (p) => `<p class="mp-sub">¿Depende de un aparato eléctrico (oxígeno, CPAP, silla eléctrica…)?</p>${siNo('electro', p.electro)}<p class="mp-sub">¿Tiene movilidad reducida?</p>${siNo('movilidad', p.movilidad)}` },
  { t: '¿Dónde vivís?', html: (p) => opciones('vivienda', VIVIENDAS, p.vivienda) },
  { t: '¿Y el entorno?', html: (p) => opciones('entorno', ENTORNOS, p.entorno) },
  { t: '¿Tenéis coche?', html: (p) => siNo('coche', p.coche) },
  { t: '¿En qué zona estás?', html: (p, prop) => `${prop ? '<p class="muted">Te propongo la de tu provincia; cámbiala si no encaja.</p>' : ''}${opciones('zona', Object.entries(ZONAS).map(([k, z]) => [k, z.t]), p.zona)}` },
];

export async function asistente(cont, alTerminar) {
  const guardado = await kv('miplan.perfil', null);
  const ubi = await kv('ubicacion', null);
  const prop = !guardado && ubi?.cod && PROV_ZONA[ubi.cod];
  let p = { ...PERFIL_INICIAL, ...(guardado || {}), ...(prop ? { zona: PROV_ZONA[ubi.cod] } : {}) };
  if (!guardado && ubi?.cod && !PROV_ZONA[ubi.cod]) p.zona = 'interior';
  let i = 0;
  const pintar = (foco = true) => {
    const paso = PASOS[i];
    cont.innerHTML = `<div class="card mp-asis">
      <p class="muted">Pregunta ${i + 1} de ${PASOS.length}</p>
      <div class="progress" aria-hidden="true"><i style="width:${Math.round((i / PASOS.length) * 100)}%"></i></div>
      <h2 id="mp-q" tabindex="-1">${esc(paso.t)}</h2>
      <div class="mp-cuerpo">${paso.html(p, prop)}</div>
      <p class="mp-err" role="alert" hidden></p>
      <div class="btnrow mp-nav">${i ? '<button class="btn ghost" type="button" data-atras>← Atrás</button>' : ''}<button class="btn" type="button" data-sig>${i + 1 < PASOS.length ? 'Siguiente →' : '✓ Ver mi plan'}</button></div>
      <p class="muted">Se guarda solo en este móvil.</p></div>`;
    if (foco) cont.querySelector('#mp-q').focus({ preventScroll: true });
  };
  cont.addEventListener('click', async (ev) => {
    const b = ev.target.closest('button');
    if (!b || !cont.contains(b)) return;
    if (b.dataset.mas || b.dataset.menos) {
      const k = b.dataset.mas || b.dataset.menos;
      p[k] = Math.max(0, Math.min(20, p[k] + (b.dataset.mas ? 1 : -1)));
      cont.querySelector(`#mp-${k}`).textContent = p[k];
      return;
    }
    if (b.dataset.k) {
      const k = b.dataset.k, v = b.dataset.v;
      p[k] = v === 'true' ? true : v === 'false' ? false : v;
      if (k === 'medicacion' && !p.medicacion) p.frio = false;
      pintar(false);
      cont.querySelector(`[data-k="${k}"][data-v="${CSS.escape(v)}"]`)?.focus();
      return;
    }
    if ('atras' in b.dataset) { i--; pintar(); return; }
    if ('sig' in b.dataset) {
      const ok = PASOS[i].valido ? PASOS[i].valido(p) : true;
      if (ok !== true) { const e = cont.querySelector('.mp-err'); e.textContent = ok; e.hidden = false; return; }
      if (i + 1 < PASOS.length) { i++; pintar(); return; }
      try { await setKv('miplan.perfil', P.normalizarPerfil(p)); } catch { toast('No se ha podido guardar en este móvil', { tipo: 'error' }); }
      alTerminar();
    }
  });
  pintar(false);
}

/* --------------------------------- Pantalla --------------------------------- */
export async function miPlanView(sub) {
  const n = el('<div class="miplan"></div>');
  const perfil = await kv('miplan.perfil', null);
  if (!perfil || sub === 'editar') {
    if (!perfil) n.insertAdjacentHTML('afterbegin', '<p class="lead">Contesta unas pocas preguntas (2 minutos) y la app se adapta a tu hogar: qué preparar primero, cuánta agua y comida necesitáis y qué riesgos os tocan.</p>');
    const c = el('<div></div>');
    n.appendChild(c);
    await asistente(c, () => { location.hash = '#/sec/mi-plan'; if (sub !== 'editar') window.dispatchEvent(new HashChangeEvent('hashchange')); });
    return n;
  }
  await pintarPlan(n);
  return n;
}

async function pintarPlan(n) {
  const d = await datosPlan();
  const p = P.normalizarPerfil(d.perfil);
  const nec = P.necesidadesPlan(p);
  const riesgos = P.riesgosPlan(p).slice(0, 5);
  const prog = P.progresoPlan(p, d);
  const quien = Object.entries(CONSUMO).filter(([k]) => p[k]).map(([k, c]) => `${p[k]} ${p[k] === 1 ? c.t : c.tp}`).join(', ');
  const grupos = ['critico', 'importante', 'recomendado'].map((pr) => ({ pr, items: prog.tareas.filter((t) => t.pr === pr) })).filter((g) => g.items.length);
  n.innerHTML = `
    <div id="mp-paso"></div>
    <section class="card">
      <h2>🏠 Tu hogar</h2>
      <p>${esc(quien)} · ${esc(VIVIENDAS.find((v) => v[0] === p.vivienda)?.[1] || '')} · ${p.coche ? 'con coche' : 'sin coche'} · ${esc(ZONAS[p.zona].t)}</p>
      <div class="kv">
        <div>💧 Agua</div><div><b>${es(nec.aguaDia)} l al día</b> · 3 días: ${nec.agua3} l · 1 semana: ${nec.agua7} l <span class="muted">(tienes ${es(d.aguaL)} l)</span></div>
        <div>🥫 Comida</div><div><b>${miles(nec.kcalDia)} kcal al día</b> · 3 días: ${miles(nec.kcal3)} kcal <span class="muted">(tienes ${miles(d.kcal)} kcal)</span></div>
        <div>💶 Efectivo</div><div>Unos <b>${nec.efectivo} €</b> en billetes pequeños <span class="muted">(${d.efectivo ? `tienes ${miles(d.efectivo)} €` : 'sin apuntar'})</span></div>
      </div>
      <p class="muted">Cantidades orientativas para tu hogar. Apunta lo que tienes en la <a href="#/sec/despensa-calc">despensa</a> y en <a href="#/sec/efectivo">Mi efectivo</a> y el plan se actualiza solo.</p>
      <div class="btnrow"><a class="btn sm ghost" href="#/sec/mi-plan/editar">✏️ Cambiar respuestas</a></div>
    </section>
    <section class="card">
      <h2>⚠️ Los riesgos que te tocan</h2>
      <ol class="mp-riesgos">${riesgos.map((r) => `<li><b>${esc(r.t)}</b><small>${esc(r.por.join(' · '))}</small>
        <span class="btnrow"><a class="btn sm ghost" href="#/emergencia/${esc(r.id)}">Qué hacer</a>${SIMULACRO_DE[r.id] ? `<a class="btn sm ghost" href="#/sec/simulacros/${SIMULACRO_DE[r.id]}">Practicar</a>` : ''}</span></li>`).join('')}</ol>
    </section>
    <section>
      <h2>✅ Tu lista de preparación</h2>
      <p class="muted">${prog.hechas} de ${prog.total} · ordenada por prioridad. Lo que depende de tus datos se marca solo.</p>
      <div class="progress" aria-hidden="true"><i style="width:${Math.round((prog.hechas / Math.max(1, prog.total)) * 100)}%"></i></div>
      ${grupos.map((g) => `<h3 class="mp-pr">${PRIORIDADES[g.pr].ic} ${PRIORIDADES[g.pr].t}</h3><ul class="mp-lista">${g.items.map((t) => `<li class="${t.ok ? 'ok' : ''}">
        ${t.auto ? `<span class="chk-box" aria-hidden="true">${t.ok ? '✓' : ''}</span>` : `<button type="button" class="chk-box" data-marca="${esc(t.id)}" aria-pressed="${t.ok}" aria-label="${t.ok ? 'Desmarcar' : 'Marcar como hecho'}: ${esc(t.t)}">${t.ok ? '✓' : ''}</button>`}
        <div><b>${esc(t.t)}</b><small>${esc(t.d)}${t.auto ? ' · se marca con tus datos' : ''}</small>${t.ruta ? ` <a href="${esc(t.ruta)}">Ir ›</a>` : ''}</div></li>`).join('')}</ul>`).join('')}
    </section>
    <div class="btnrow">
      <a class="btn ghost" href="#/sec/modo-crisis">🚨 Modo crisis</a>
      <a class="btn ghost" href="#/sec/simulacros">🎯 Simulacros</a>
      <button class="btn ghost" type="button" id="mp-borrar">🗑 Borrar mi plan</button>
    </div>`;
  montarSiguientePaso(n.querySelector('#mp-paso'));
  n.querySelectorAll('[data-marca]').forEach((b) => b.addEventListener('click', async () => {
    const h = { ...d.hechos };
    if (h[b.dataset.marca]) delete h[b.dataset.marca]; else h[b.dataset.marca] = Date.now();
    await setKv('miplan.hechos', h).catch(() => toast('No se ha podido guardar', { tipo: 'error' }));
    const y = window.scrollY;
    await pintarPlan(n);
    window.scrollTo(0, y);
    n.querySelector(`[data-marca="${CSS.escape(b.dataset.marca)}"]`)?.focus({ preventScroll: true });
  }));
  n.querySelector('#mp-borrar').addEventListener('click', async () => {
    const antes = { perfil: d.perfil, hechos: d.hechos };
    await store.del('kv', 'miplan.perfil').catch(() => {});
    await store.del('kv', 'miplan.hechos').catch(() => {});
    toast('Plan borrado', { tipo: 'ok', accion: { t: 'Deshacer', fn: async () => { await setKv('miplan.perfil', antes.perfil); await setKv('miplan.hechos', antes.hechos); window.dispatchEvent(new HashChangeEvent('hashchange')); } } });
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
}
