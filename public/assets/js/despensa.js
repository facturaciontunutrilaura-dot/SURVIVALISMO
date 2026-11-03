/* =========================================================================
   despensa.js — CALCULADORA DE DESPENSA
   Apuntas lo que tienes en casa y te dice para cuántos días os llega, con
   las necesidades de tu hogar (las mismas personas que en la compra
   urgente). Se guarda solo en este móvil y entra en las copias.
   ========================================================================= */
import { el, esc } from './ui.js';
import * as store from './store.js';
import { necesidades } from './compra-calc.js';
import { HOGAR_INICIAL } from '../../data/content/compra.js';
import { DESPENSA_ALIMENTOS, diasDespensa } from './herramientas-core.js';

const kv = async (id, def) => (await store.get('kv', id).catch(() => null))?.v ?? def;
const setKv = (id, v) => store.put('kv', { id, v }).catch(() => {});
const miles = (x) => Math.round(x).toLocaleString('es-ES');

export async function despensaView() {
  const hogar = (await kv('compra.hogar', null)) || HOGAR_INICIAL.map((p) => ({ ...p }));
  const nec = hogar.map(necesidades);
  const kcalDia = nec.reduce((s, x) => s + x.kcal, 0), aguaDia = nec.reduce((s, x) => s + x.agua, 0);
  let inv = await kv('despensa.inventario', {});
  const n = el(`<div>
    <p class="muted">Apunta lo que tienes ahora en casa. Calculado para tu hogar: ${hogar.length} ${hogar.length === 1 ? 'persona' : 'personas'}, unas ${miles(kcalDia)} kcal y ${String(Math.round(aguaDia * 10) / 10).replace('.', ',')} l de agua al día. <a href="#/sec/compra">Cambiar las personas</a> (en Compra urgente).</p>
    <div class="card dp-res" id="dp-res" role="status" aria-live="polite"></div>
    <div class="card">
      <h3>💧 Agua</h3>
      <div class="dp-fila"><label for="dp-agua">Agua embotellada o almacenada</label><span class="dp-in"><input id="dp-agua" data-k="agua" type="number" inputmode="decimal" min="0" step="0.5"> l</span></div>
      <h3>🥫 Comida</h3>
      ${DESPENSA_ALIMENTOS.map((a) => `<div class="dp-fila"><label for="dp-${a.id}">${esc(a.t)}</label><span class="dp-in"><input id="dp-${a.id}" data-k="${a.id}" type="number" inputmode="decimal" min="0" step="${a.u === 'kg' || a.u === 'l' ? '0.5' : '1'}"> ${esc(a.u)}</span></div>`).join('')}
    </div>
    <div class="blk-note">Es una estimación por calorías y agua de bebida y cocina. Para comer equilibrado durante días, combina cereales, legumbres, conservas de pescado o carne, aceite y algo de fruta o verdura en conserva.</div>
  </div>`);
  const res = n.querySelector('#dp-res');
  function pintar() {
    const r = diasDespensa(inv, kcalDia, aguaDia);
    const dias = (d) => (d >= 1 ? `${String(d).replace('.', ',')} días` : d > 0 ? 'menos de 1 día' : '0 días');
    res.innerHTML = `<p class="dp-grande"><b>${dias(r.dias)}</b> de autonomía</p>
      <div class="kv"><div>Comida</div><div>${dias(r.dComida)} (${miles(r.kcal)} kcal)</div><div>Agua</div><div>${dias(r.dAgua)} (${String(r.agua).replace('.', ',')} l)</div></div>
      ${r.dias < 3 ? '<p class="dp-aviso">⚠ Menos de 3 días: lo mínimo recomendado son 72 horas.</p>' : r.dias < 7 ? '<p>✅ Cubres 72 horas. El siguiente objetivo, una semana.</p>' : '<p>✅ Más de una semana: muy buen nivel.</p>'}
      ${r.dias > 0 ? `<p class="muted">Lo que antes se acaba: <b>${r.limita}</b>.</p>` : ''}`;
  }
  for (const i of n.querySelectorAll('[data-k]')) {
    i.value = inv[i.dataset.k] ?? '';
    i.addEventListener('input', () => { inv = { ...inv, [i.dataset.k]: i.value }; setKv('despensa.inventario', inv); pintar(); });
  }
  pintar();
  return n;
}
