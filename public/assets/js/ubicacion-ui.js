/* =========================================================================
   ubicacion-ui.js — selector «Mi ubicación»: provincia y municipio
   Dos desplegables (el de municipio depende de la provincia) y, si el
   navegador lo permite, «Usar mi ubicación». Se usa en la portada (la
   primera vez), en Ajustes, en Riesgos → Mi zona y en el Plan de evacuación.
   Se guarda solo en el móvil: códigos de provincia y municipio, nunca
   coordenadas (ver ubicacion.js).
   ========================================================================= */
import { el, esc, toast } from './ui.js';
import * as ubi from './ubicacion.js';

let siguienteId = 0;

/**
 * Pinta el selector dentro de `caja`. `alCambiar(u)` recibe la ubicación
 * guardada ({ cod, nombre, mun, … }) cada vez que cambia.
 * Opciones: { titulo, explicacion, compacto }.
 */
export async function montarSelector(caja, alCambiar = () => {}, { titulo = '📍 Dónde vives', explicacion = '', compacto = false } = {}) {
  const id = `ubs${++siguienteId}`;
  let actual = await ubi.guardada().catch(() => null);
  const provs = ubi.PROVINCIAS_ORDENADAS.map((p) => `<option value="${esc(p.cod)}">${esc(p.nombre)}</option>`).join('');
  const n = el(`<section class="card ubi-sel" aria-labelledby="${id}-t">
    <h3 id="${id}-t">${esc(titulo)}</h3>
    ${explicacion ? `<p class="muted">${esc(explicacion)}</p>` : ''}
    <p class="ubi-act-txt" id="${id}-act" role="status" aria-live="polite"></p>
    <div class="fieldrow">
      <div><label for="${id}-p">Provincia</label><select id="${id}-p"><option value="">— Elige provincia —</option>${provs}</select></div>
      <div><label for="${id}-m">Ciudad o pueblo</label><select id="${id}-m" disabled><option value="">— Elige primero la provincia —</option></select></div>
    </div>
    ${ubi.HAY_GPS ? `<button class="btn sm ghost" type="button" id="${id}-gps">📡 Detectarla con el GPS</button>` : ''}
    <p class="muted" id="${id}-msg"></p>
    ${compacto ? '' : `<details><summary>Qué se guarda y qué no</summary><div>
      <p>Solo se guardan, en este móvil, tu provincia y tu municipio. <b>Nunca tus coordenadas</b> ni tu dirección. Si usas el GPS, la posición se convierte en provincia y municipio dentro del móvil y se descarta.</p>
    </div></details>`}
  </section>`);
  caja.replaceChildren(n);
  const selP = n.querySelector(`#${id}-p`), selM = n.querySelector(`#${id}-m`), act = n.querySelector(`#${id}-act`), msg = n.querySelector(`#${id}-msg`);

  const pintarActual = () => {
    act.innerHTML = actual ? `Ahora: <b>${esc(ubi.nombreUbicacion(actual))}</b>${actual.mun ? '' : ' · elige también tu ciudad o pueblo'}` : 'Todavía no has indicado dónde vives.';
  };
  async function cargarMunicipios(cod, elegido = '') {
    selM.disabled = true;
    selM.innerHTML = '<option value="">Cargando…</option>';
    const lista = cod ? await ubi.municipios(cod).catch(() => []) : [];
    selM.innerHTML = `<option value="">${cod ? '— Elige ciudad o pueblo —' : '— Elige primero la provincia —'}</option>` +
      lista.map((m) => `<option value="${esc(m.ine)}"${m.ine === elegido ? ' selected' : ''}>${esc(m.nombre)}</option>`).join('');
    selM.disabled = !lista.length;
  }
  async function guardar(cod, mun, modo = 'manual') {
    actual = { ...(await ubi.guardar(cod, modo, mun)), modo };
    pintarActual();
    alCambiar(actual);
  }

  if (actual) { selP.value = actual.cod; await cargarMunicipios(actual.cod, actual.mun?.ine || ''); }
  pintarActual();

  selP.addEventListener('change', async () => {
    msg.textContent = '';
    if (!selP.value) return;
    await cargarMunicipios(selP.value);
    await guardar(selP.value, null);
    selM.focus();
  });
  selM.addEventListener('change', async () => {
    if (!selP.value || !selM.value) return;
    await guardar(selP.value, selM.value);
    toast(`Ubicación: ${ubi.nombreUbicacion(actual)}`);
  });
  n.querySelector(`#${id}-gps`)?.addEventListener('click', async (e) => {
    const b = e.currentTarget;
    b.disabled = true; msg.textContent = 'Localizando…';
    try {
      const p = await ubi.localizar();
      selP.value = p.cod;
      await cargarMunicipios(p.cod, p.munIne || '');
      await guardar(p.cod, p.munIne || null, 'gps');
      msg.textContent = 'Detectada. Si no es correcta, cámbiala en los desplegables.';
    } catch (err) {
      msg.textContent = err.message;
    } finally { b.disabled = false; }
  });
  return n;
}
