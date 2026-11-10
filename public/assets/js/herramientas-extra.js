/* =========================================================================
   herramientas-extra.js — pestañas «Walkie» y «Batería» de Herramientas SOS
   y el código QR de emergencia (para la pestaña «Tarjeta»).
   · Walkie: guía de PMR446 (sin licencia) y plan de canales de la familia,
     con tabla imprimible en PDF. Plan en kv 'walkie.plan' (entra en copias).
   · Batería: ahorro máximo dentro de la app y guía para el móvil, con un
     atajo de iPhone que lo activa todo de una vez.
   · QR: texto plano (se lee con la cámara de cualquier móvil, sin app).
   ========================================================================= */
import { el, esc, toast } from './ui.js';
import * as store from './store.js';
import qrcode from '../vendor/qrcode/qrcode.js';
import { A4, C, lit, limpiar, escribir } from './compra-pdf.js';

const kv = async (id, def) => (await store.get('kv', id).catch(() => null))?.v ?? def;
const setKv = (id, v) => store.put('kv', { id, v }).catch(() => {});

/* --------------------------------- QR --------------------------------- */
/** Matriz de módulos (true = negro) de un texto. Nivel M: aguanta ~15 % de daño. */
export function matrizQR(texto) {
  const q = qrcode(0, 'M');
  q.addData(String(texto).slice(0, 1200));
  q.make();
  const k = q.getModuleCount();
  return Array.from({ length: k }, (_, r) => Array.from({ length: k }, (_, c) => q.isDark(r, c)));
}

/** SVG del QR (con margen blanco de 4 módulos, como pide la norma). */
export function svgQR(texto, etiqueta = 'Código QR') {
  const m = matrizQR(texto), k = m.length, t = k + 8;
  let d = '';
  m.forEach((fila, r) => fila.forEach((x, c) => { if (x) d += `M${c + 4} ${r + 4}h1v1h-1z`; }));
  return `<svg class="qr-svg" viewBox="0 0 ${t} ${t}" role="img" aria-label="${esc(etiqueta)}" shape-rendering="crispEdges"><rect width="${t}" height="${t}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}

/** Operaciones PDF que dibujan el QR en (x, y) con lado `lado` puntos. */
export function opsQR(texto, x, y, lado) {
  const m = matrizQR(texto), k = m.length, u = lado / (k + 8);
  const ops = [`1 1 1 rg ${x} ${y} ${lado} ${lado} re f`, '0 0 0 rg'];
  m.forEach((fila, r) => fila.forEach((v, c) => { if (v) ops.push(`${(x + (c + 4) * u).toFixed(2)} ${(y + lado - (r + 5) * u).toFixed(2)} ${u.toFixed(3)} ${u.toFixed(3)} re f`); }));
  return ops.join('\n');
}

/** Texto del QR de emergencia: solo lo que el usuario ha escrito. */
export function textoQR(d) {
  const l = ['EMERGENCIA - DATOS DE CONTACTO'];
  if (d.nombre) l.push(`Nombre: ${d.nombre}`);
  if (d.lugar) l.push(`Vive en: ${d.lugar}`);
  if (d.medico) l.push(`Info médica: ${d.medico}`);
  if (d.contactos) l.push(`Avisar a: ${d.contactos}`);
  if (d.cerca) l.push(`Punto de encuentro: ${d.cerca}`);
  l.push('Emergencias: 112');
  return l.join('\n');
}

/* ------------------------------- Walkie ------------------------------- */
/** Frecuencia (MHz) del canal PMR446 n (1–16). */
export const frecuenciaPMR = (n) => (446.00625 + (n - 1) * 0.0125).toFixed(5);

export const PLAN_INICIAL = {
  canal: 3, subtono: 0, alt: 6, subtonoAlt: 0, escucha: 'Los 5 primeros minutos de cada hora en punto',
  personas: [], claves: [['Verde', 'Todo bien'], ['Ámbar', 'Necesitamos ayuda, no es urgente'], ['Rojo', 'Urgencia: venid o llamad al 112']],
};

export function pdfWalkie(p) {
  const ops = [];
  const texto = (s, x, y, tam = 10, neg = false, col = [0.1, 0.1, 0.1]) => ops.push(`BT /${neg ? 'F2' : 'F1'} ${tam} Tf ${col.join(' ')} rg ${x} ${y} Td ${lit(limpiar(s))} Tj ET`);
  ops.push(`${C.olive.join(' ')} rg 0 ${A4.h - 34} ${A4.w} 34 re f`);
  texto('PLAN DE WALKIES DE LA FAMILIA (PMR446)', 36, A4.h - 22, 13, true, [1, 1, 1]);
  let y = A4.h - 64;
  const fila = (a, b) => { texto(a, 36, y, 10, true); texto(b, 210, y, 10); y -= 18; };
  fila('Canal principal', `${p.canal} (${frecuenciaPMR(p.canal)} MHz) · subtono ${p.subtono || 'ninguno'}`);
  fila('Canal de reserva', `${p.alt} (${frecuenciaPMR(p.alt)} MHz) · subtono ${p.subtonoAlt || 'ninguno'}`);
  fila('Cuándo escuchamos', p.escucha || '-');
  y -= 8; texto('Quién es quién', 36, y, 12, true); y -= 18;
  (p.personas.length ? p.personas : [{ nombre: '__________________', indicativo: '__________' }]).forEach((x) => { texto(x.nombre, 46, y, 10); texto(`Indicativo: ${x.indicativo || '-'}`, 260, y, 10); y -= 16; });
  y -= 8; texto('Palabras clave', 36, y, 12, true); y -= 18;
  p.claves.forEach(([k, v]) => { texto(k, 46, y, 10, true); texto(v, 140, y, 10); y -= 16; });
  y -= 8; texto('Cómo hablar', 36, y, 12, true); y -= 18;
  ['Escucha antes de hablar. Pulsa, espera 1 segundo y habla a 5 cm, sin gritar.', '«Aquí [tu indicativo] para [el suyo]». Frases cortas. Di «cambio» al acabar tu turno.', 'Todo el mundo puede oíros: no digas tu dirección ni que la casa está vacía.', 'Si no contestan, sube a un sitio alto y repite en el canal de reserva.', 'Emergencias: 112. El walkie no sustituye al 112.']
    .forEach((s) => { texto(`- ${s}`, 46, y, 9.5); y -= 15; });
  return escribir([ops.join('\n')], 'Plan de walkies');
}

export async function walkie() {
  let p = { ...PLAN_INICIAL, ...(await kv('walkie.plan', {})) };
  const opCanal = (sel) => Array.from({ length: 16 }, (_, i) => `<option value="${i + 1}"${i + 1 === sel ? ' selected' : ''}>Canal ${i + 1} · ${frecuenciaPMR(i + 1)} MHz</option>`).join('');
  const opSub = (sel) => `<option value="0"${!sel ? ' selected' : ''}>Sin subtono</option>` + Array.from({ length: 38 }, (_, i) => `<option value="${i + 1}"${i + 1 === sel ? ' selected' : ''}>Subtono ${i + 1}</option>`).join('');
  const n = el(`<div>
    <p>Los walkies <b>PMR446</b> se compran en cualquier tienda, son baratos y <b>no necesitan licencia</b> en España ni en la UE. Funcionan sin cobertura, sin internet y con pilas.</p>
    <details open><summary>📖 Lo esencial</summary><div><ul>
      <li><b>Alcance:</b> de 0,5 a 3 km en ciudad; hasta 5–10 km en campo abierto si os veis. Desde un sitio alto, mucho más. Lo que anuncian las cajas («hasta 10 km») es con visión directa.</li>
      <li><b>Canales:</b> 16 (los equipos antiguos solo tienen del 1 al 8). Todos los walkies de la familia deben estar en el <b>mismo canal y subtono</b>.</li>
      <li><b>El subtono no da privacidad:</b> solo hace que no oigas a otros. Cualquiera en ese canal te oye.</li>
      <li><b>Potencia:</b> 0,5 W y antena fija, por ley. No los modifiques.</li>
      <li><b>Pilas:</b> lleva recambio. Para ahorrar, enciéndelos solo a las horas acordadas.</li>
      <li>En España muchos aficionados escuchan el <b>canal 7 con subtono 7</b> para pedir ayuda entre particulares. No es un servicio oficial: el que vale es el <a href="tel:112">112</a>.</li>
    </ul></div></details>
    <h3>📋 Plan de canales de la familia</h3>
    <div class="fieldrow">
      <div><label for="wk-c">Canal principal</label><select id="wk-c" data-k="canal">${opCanal(p.canal)}</select></div>
      <div><label for="wk-s">Subtono</label><select id="wk-s" data-k="subtono">${opSub(p.subtono)}</select></div>
    </div>
    <div class="fieldrow">
      <div><label for="wk-a">Canal de reserva</label><select id="wk-a" data-k="alt">${opCanal(p.alt)}</select></div>
      <div><label for="wk-sa">Subtono de reserva</label><select id="wk-sa" data-k="subtonoAlt">${opSub(p.subtonoAlt)}</select></div>
    </div>
    <label for="wk-e">Cuándo encendemos y escuchamos</label><input id="wk-e" data-k="escucha" maxlength="80">
    <h4>Quién es quién</h4>
    <div id="wk-pers"></div>
    <div class="ef-fila"><input id="wk-pn" maxlength="30" placeholder="Nombre" aria-label="Nombre"><input id="wk-pi" maxlength="20" placeholder="Indicativo (ej.: Águila)" aria-label="Indicativo"><button type="button" class="btn sm" id="wk-padd">Añadir</button></div>
    <h4>Palabras clave</h4>
    <ul class="wk-claves">${p.claves.map(([k, v]) => `<li><b>${esc(k)}:</b> ${esc(v)}</li>`).join('')}</ul>
    <button type="button" class="btn wide" id="wk-pdf">📄 Descargar el plan en PDF para imprimir</button>
    <p class="muted">Imprime una copia para cada walkie y guárdala con él. Se guarda solo en este móvil.</p>
  </div>`);
  const guardar = () => setKv('walkie.plan', p);
  const pintarPersonas = () => {
    n.querySelector('#wk-pers').innerHTML = p.personas.length ? `<ul class="wk-pers">${p.personas.map((x, i) => `<li>${esc(x.nombre)} · <b>${esc(x.indicativo || '—')}</b> <button type="button" class="btn sm ghost" data-pdel="${i}" aria-label="Quitar a ${esc(x.nombre)}">✕</button></li>`).join('')}</ul>` : '<p class="muted">Añade a cada persona con un indicativo corto y fácil de entender por radio.</p>';
  };
  n.querySelector('#wk-e').value = p.escucha;
  n.addEventListener('change', (ev) => {
    const k = ev.target.dataset?.k;
    if (!k) return;
    p = { ...p, [k]: k === 'escucha' ? ev.target.value : Number(ev.target.value) };
    guardar();
  });
  n.addEventListener('click', (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.id === 'wk-padd') {
      const nombre = n.querySelector('#wk-pn').value.trim();
      if (!nombre) return n.querySelector('#wk-pn').focus();
      p = { ...p, personas: [...p.personas, { nombre, indicativo: n.querySelector('#wk-pi').value.trim() }] };
      n.querySelector('#wk-pn').value = ''; n.querySelector('#wk-pi').value = '';
      guardar(); pintarPersonas();
    }
    if (b.dataset.pdel) { p = { ...p, personas: p.personas.filter((_, i) => i !== Number(b.dataset.pdel)) }; guardar(); pintarPersonas(); }
    if (b.id === 'wk-pdf') {
      p.escucha = n.querySelector('#wk-e').value; guardar();
      const url = URL.createObjectURL(new Blob([pdfWalkie(p)], { type: 'application/pdf' }));
      const a = document.createElement('a'); a.href = url; a.download = 'plan-walkies.pdf'; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      toast('Plan descargado');
    }
  });
  pintarPersonas();
  return n;
}

/* ------------------------------- Batería ------------------------------- */
export async function bateria() {
  const ajustes = store.settings();
  const activo = ajustes.theme === 'ahorro';
  const n = el(`<div>
    <p id="bt-nivel" class="dp-grande"></p>
    <section class="card bt-app">
      <h3>🔋 Ahorro máximo en la app</h3>
      <p>Pantalla en negro puro (gasta mucho menos en móviles con pantalla OLED), sin animaciones y con la radio apagada.</p>
      <button type="button" class="btn wide" id="bt-app">${activo ? '↩ Volver al aspecto normal' : '🔋 Activar ahorro máximo'}</button>
    </section>
    <h3>📱 Ahorro máximo en el móvil</h3>
    <p class="muted">Una app web no puede cambiar los ajustes del móvil: hazlo tú en unos segundos.</p>
    <details open><summary> iPhone</summary><div><ol>
      <li><b>Modo de bajo consumo:</b> Ajustes → Batería → Modo de bajo consumo (o desde el Centro de control).</li>
      <li><b>Brillo al mínimo</b> que puedas leer.</li>
      <li><b>Modo avión</b> cuando no esperes llamadas; actívalo con la wifi y el Bluetooth apagados. Enciende la red solo unos minutos a horas fijas.</li>
      <li>Ajustes → General → <b>Actualización en segundo plano</b>: desactivada.</li>
      <li>Ajustes → Privacidad → <b>Localización</b>: desactivada salvo cuando la necesites.</li>
      <li>Cierra las apps que no uses y baja el tiempo de <b>bloqueo automático</b> a 30 segundos.</li>
    </ol></div></details>
    <details><summary>🤖 Android</summary><div><ol>
      <li>Ajustes → Batería → <b>Ahorro de batería</b> o <b>ahorro extremo</b> (el nombre cambia según la marca: «Ahorro de energía máximo», «Modo ultra ahorro»…). Deja solo las apps imprescindibles, incluida esta.</li>
      <li>Brillo al mínimo, <b>tema oscuro</b> y modo avión cuando no esperes llamadas.</li>
      <li>Desactiva la ubicación, el Bluetooth, la wifi y la sincronización automática.</li>
    </ol></div></details>
    <details><summary>⚡ Atajo de iPhone: «Modo supervivencia» en un toque</summary><div>
      <ol>
        <li>Abre la app <b>Atajos</b> → <b>+</b> y llámalo «Modo supervivencia».</li>
        <li>Añade estas acciones: <b>Establecer modo de bajo consumo</b> (activado), <b>Establecer brillo</b> (10 %), <b>Establecer Bluetooth</b> (desactivado), <b>Establecer wifi</b> (desactivada) y, si quieres, <b>Establecer modo avión</b> (activado).</li>
        <li>Lánzalo desde Atajos, desde un widget o diciendo a Siri «Modo supervivencia».</li>
        <li>Opcional: en Atajos → <b>Automatización</b> → <b>Nivel de batería</b> → «cae por debajo del 20 %» → ejecutar el atajo. Se activará solo.</li>
      </ol>
    </div></details>
    <div class="blk-note">Lleva una batería externa cargada y, si puedes, un cargador solar o de manivela. Con el móvil en modo avión y la pantalla apagada, la batería puede durar varios días.</div>
  </div>`);
  try {
    const b = await navigator.getBattery?.();
    if (b) n.querySelector('#bt-nivel').textContent = `Batería: ${Math.round(b.level * 100)} %${b.charging ? ' · cargando' : ''}`;
  } catch { /* iPhone: no se puede leer */ }
  n.querySelector('#bt-app').addEventListener('click', async (ev) => {
    const boton = ev.currentTarget;
    if (store.settings().theme === 'ahorro') {
      const antes = await kv('ahorro.temaAnterior', 'auto');
      store.setSetting('theme', antes === 'ahorro' ? 'auto' : antes);
      boton.textContent = '🔋 Activar ahorro máximo';
      toast('Aspecto normal');
    } else {
      await setKv('ahorro.temaAnterior', store.settings().theme);
      store.setSetting('theme', 'ahorro');
      try { (await import('./radio.js')).pararRadio(); } catch { /* sin radio */ }
      boton.textContent = '↩ Volver al aspecto normal';
      toast('Ahorro máximo activado');
    }
  });
  return n;
}
