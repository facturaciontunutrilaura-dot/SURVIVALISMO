/* =========================================================================
   compra.js — COMPRA DE COLAPSO
   La lista está oculta hasta que se pulsa el botón rojo (con confirmación).
   Se calcula para las personas del hogar (guardadas solo en el dispositivo)
   y se puede ir marcando lo comprado en la tienda.
   ========================================================================= */
import { el, esc, toast, confirmar } from './ui.js';
import * as store from './store.js';
import { calcularCompra } from './compra-calc.js';
import { ACTIVIDAD, HOGAR_INICIAL, DURACIONES, AVISOS_COMPRA } from '../../data/content/compra.js';

const kv = async (id, def) => (await store.get('kv', id).catch(() => null))?.v ?? def;
const setKv = (id, v) => store.put('kv', { id, v }).catch(() => {});
const miles = (x) => Math.round(x).toLocaleString('es-ES');
const PERSONA_NUEVA = { nombre: '', sexo: 'm', edad: 30, peso: 65, altura: '', actividad: 'moderada', kcal: '' };

export async function compraView() {
  const n = el('<div></div>');
  let activa = await kv('compra.activa', null);
  let hogar = await kv('compra.hogar', null) || HOGAR_INICIAL.map((p) => ({ ...p }));
  let dias = await kv('compra.dias', 7);
  let marcadas = await kv('compra.marcadas', {});

  /* -------------------------- Oculta: botón rojo -------------------------- */
  function bloqueada() {
    n.innerHTML = `<div class="card colapso-bloq">
      <p>Esta lista de compra está <b>oculta</b> a propósito. Actívala solo ante un colapso real: te dirá qué comprar, y cuánto, para que tu hogar aguante en casa de 72 horas a una semana.</p>
      <button class="btn-colapso" id="co-activar" type="button">
        <span aria-hidden="true">🛒</span><span><b>COLAPSO</b><small>Mostrar la compra urgente</small></span>
      </button>
      <p class="muted" style="margin-bottom:0">Si hay una emergencia con heridos o peligro inmediato, usa <a href="#/emergencia">SOS</a> o llama al <a href="tel:112">112</a>.</p>
    </div>`;
    n.querySelector('#co-activar').addEventListener('click', async () => {
      if (!confirmar('¿Activar el modo colapso y mostrar la lista de compra urgente?')) return;
      activa = Date.now();
      lista();
      setKv('compra.activa', activa);
      n.querySelector('h2')?.focus();
    });
  }

  /* ----------------------------- Activa: lista ---------------------------- */
  function lista() {
    const r = calcularCompra(hogar, dias);
    const fecha = new Date(activa).toLocaleString('es-ES', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
    const item = (id, texto, cant, nota = '') => `<label class="co-item">
        <input type="checkbox" data-k="${esc(id)}"${marcadas[id] ? ' checked' : ''}>
        <span class="co-tx">${esc(texto)}${nota ? `<small>${esc(nota)}</small>` : ''}</span>
        <b class="co-cant">${esc(cant)}</b>
      </label>`;
    const grupo = (ic, t, filas) => `<section class="co-grupo"><h3><span aria-hidden="true">${ic}</span> ${esc(t)}</h3>${filas.join('')}</section>`;
    const comida = (frio) => r.alimentos.filter((a) => a.frio === frio).map((a) => item(a.id, a.t, `${a.n} × ${a.u}`));
    const [aguaG, ...otros] = r.grupos;
    const nombreDe = (p, i) => p.nombre?.trim() || `Persona ${i + 1}`;

    n.innerHTML = `
      <div class="blk-warn co-activa"><b>Modo colapso activado</b> (${esc(fecha)}). <button class="btn sm ghost" id="co-ocultar" type="button">Ocultar de nuevo</button></div>
      <div class="card">
        <h2 tabindex="-1">Lista de compra</h2>
        <div class="btnrow" role="group" aria-label="Duración">
          ${DURACIONES.map(([d, t]) => `<button class="btn sm${d === dias ? '' : ' ghost'}" type="button" data-dias="${d}" aria-pressed="${d === dias}">${t}</button>`).join('')}
        </div>
        <div class="kv co-resumen">
          ${r.personas.map((p, i) => `<div>${esc(nombreDe(p, i))}</div><div>${miles(p.kcal)} kcal · ${p.prot} g proteína · ${String(p.agua).replace('.', ',')} l agua <span class="muted">al día</span></div>`).join('')}
          <div><b>Hogar, ${esc(DURACIONES.find(([d]) => d === dias)?.[1] || `${dias} días`)}</b></div><div><b>${miles(r.kcalDia * dias)} kcal · ${miles(r.protDia * dias)} g proteína · ${r.aguaL} l agua</b></div>
        </div>
        <p id="co-progreso" class="muted" aria-live="polite"></p>
        ${AVISOS_COMPRA.map((a) => `<p class="blk-note">${esc(a)}</p>`).join('')}
      </div>
      <div class="card co-lista">
        ${grupo('💧', '1 · Agua', [item('agua', 'Agua embotellada', `${r.aguaL} l`, `≈ ${r.garrafas} garrafas de 5 l (bebida, cocina e higiene mínima, con un 10 % de margen)`), ...aguaG.items.map((it) => item(it.id, it.t, it.c))])}
        ${grupo('🥫', '2 · Comida que no hay que cocinar', comida(true))}
        ${grupo('🍚', '3 · Comida para cocinar (si hay gas o hornillo)', comida(false))}
        ${otros.map((g, i) => grupo(g.ic, `${i + 4} · ${g.t}`, g.items.map((it) => item(it.id, it.t, it.c)))).join('')}
        <p class="muted">La comida aporta unas ${miles(r.kcalCompra)} kcal y ${miles(r.protCompra)} g de proteína: se redondea hacia arriba para tener margen.</p>
        <div class="btnrow"><button class="btn sm ghost" id="co-desmarcar" type="button">Desmarcar todo</button></div>
      </div>
      <details class="card co-hogar"><summary>Personas en casa (${r.personas.length}) · cambiar</summary><div>
        <p class="muted">Se guarda solo en este dispositivo. La energía se estima con la fórmula de Mifflin-St Jeor y el nivel de actividad; si conoces las kcal de alguien (por ejemplo, pautadas por su nutricionista), escríbelas y se usarán esas.</p>
        <div id="co-personas">${hogar.map((p, i) => persona(p, i)).join('')}</div>
        <div class="btnrow"><button class="btn sm ghost" id="co-mas" type="button">＋ Añadir persona</button></div>
      </div></details>`;
    progreso();
  }

  function persona(p, i) {
    const f = (k, label, attrs = '') => `<div><label for="co-${k}-${i}">${label}</label><input id="co-${k}-${i}" data-i="${i}" data-c="${k}" value="${esc(p[k] ?? '')}" ${attrs}></div>`;
    return `<fieldset class="co-persona"><legend>${esc(p.nombre?.trim() || `Persona ${i + 1}`)}</legend>
      <div class="fieldrow">
        ${f('nombre', 'Nombre (opcional)', 'autocomplete="off" maxlength="30"')}
        <div><label for="co-sexo-${i}">Sexo</label><select id="co-sexo-${i}" data-i="${i}" data-c="sexo">
          <option value="h"${p.sexo === 'h' ? ' selected' : ''}>Hombre</option><option value="m"${p.sexo === 'm' ? ' selected' : ''}>Mujer</option></select></div>
      </div>
      <div class="fieldrow">
        ${f('edad', 'Edad', 'type="number" inputmode="numeric" min="1" max="110"')}
        ${f('peso', 'Peso (kg)', 'type="number" inputmode="decimal" min="3" max="250"')}
        ${f('altura', 'Altura (cm, opcional)', 'type="number" inputmode="numeric" min="50" max="230"')}
      </div>
      <div class="fieldrow">
        <div class="co-ancho"><label for="co-actividad-${i}">Actividad</label><select id="co-actividad-${i}" data-i="${i}" data-c="actividad">
          ${Object.entries(ACTIVIDAD).map(([k, a]) => `<option value="${k}"${p.actividad === k ? ' selected' : ''}>${esc(a.t)}</option>`).join('')}</select></div>
        ${f('kcal', 'kcal/día (opcional)', 'type="number" inputmode="numeric" min="800" max="6000"')}
      </div>
      ${hogar.length > 1 ? `<button class="btn sm ghost" type="button" data-quitar="${i}">Quitar a ${esc(p.nombre?.trim() || `persona ${i + 1}`)}</button>` : ''}
    </fieldset>`;
  }

  function progreso() {
    const cajas = [...n.querySelectorAll('.co-item input')];
    const hechas = cajas.filter((c) => c.checked).length;
    const out = n.querySelector('#co-progreso');
    if (out) out.textContent = `Comprado: ${hechas} de ${cajas.length}.`;
  }

  /* Repinta conservando el panel de personas abierto y el foco. */
  function repintar() {
    const abierto = n.querySelector('.co-hogar')?.open;
    const foco = document.activeElement?.id;
    lista();
    if (abierto) n.querySelector('.co-hogar').open = true;
    if (foco) n.querySelector('#' + CSS.escape(foco))?.focus();
  }

  n.addEventListener('change', async (ev) => {
    const t = ev.target;
    if (t.matches('.co-item input')) {
      if (t.checked) marcadas[t.dataset.k] = 1; else delete marcadas[t.dataset.k];
      progreso();
      return setKv('compra.marcadas', marcadas);
    }
    if (t.dataset.c != null) {
      hogar[+t.dataset.i] = { ...hogar[+t.dataset.i], [t.dataset.c]: t.value };
      repintar();
      return setKv('compra.hogar', hogar);
    }
  });

  n.addEventListener('click', async (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.dias) { dias = +b.dataset.dias; repintar(); return setKv('compra.dias', dias); }
    if (b.id === 'co-desmarcar') { marcadas = {}; repintar(); return setKv('compra.marcadas', marcadas); }
    if (b.id === 'co-mas') {
      hogar = [...hogar, { ...PERSONA_NUEVA }];
      repintar(); setKv('compra.hogar', hogar);
      return n.querySelector(`#co-nombre-${hogar.length - 1}`)?.focus();
    }
    if (b.dataset.quitar != null) {
      hogar = hogar.filter((_, i) => i !== +b.dataset.quitar);
      repintar(); setKv('compra.hogar', hogar);
      return toast('Persona quitada');
    }
    if (b.id === 'co-ocultar') {
      if (!confirmar('¿Ocultar de nuevo la lista de compra? Lo marcado y las personas se conservan.')) return;
      activa = null; bloqueada();
      return setKv('compra.activa', null);
    }
  });

  if (activa) lista(); else bloqueada();
  return n;
}
