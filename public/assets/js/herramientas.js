/* =========================================================================
   herramientas.js — HERRAMIENTAS SOS
     · Mensajes «Estoy bien» (SMS a un toque; WhatsApp si hay datos)
     · Silbato · Linterna de pantalla · Señales de auxilio
     · Diario de la emergencia · Tarjeta de emergencia en PDF
   Todo funciona sin conexión (el SMS va por la red de telefonía).
   ========================================================================= */
import { el, esc, toast, alSalir } from './ui.js';
import * as store from './store.js';
import * as ubi from './ubicacion.js';
import { ESTADOS_MENSAJE, textoMensaje, enlaceSms, enlaceWhatsapp, telefono } from './herramientas-core.js';
import { contextoAudio } from './sonido.js';
import { A4, C, lit, limpiar, partir, escribir, medirHelvetica } from './compra-pdf.js';

const kv = async (id, def) => (await store.get('kv', id).catch(() => null))?.v ?? def;
const setKv = (id, v) => store.put('kv', { id, v });
const esIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/* ------------------------------- Mensajes ------------------------------- */
async function mensajes() {
  const contactos = (await store.all('contactos').catch(() => [])).filter((c) => telefono(c.t));
  const u = await ubi.guardada().catch(() => null);
  const punto = (await kv('plan.punto', '')) || (await kv('plan.cerca', ''));
  const n = el(`<div>
    <p class="muted">Elige cómo estás y a quién avisar: se abre tu app de Mensajes con el texto ya escrito. Solo tienes que pulsar <b>Enviar</b>. El SMS funciona <b>sin datos ni internet</b>, y suele pasar aunque las llamadas no entren.</p>
    <div class="ms-estados" role="group" aria-label="Cómo estás">${ESTADOS_MENSAJE.map((e, i) => `<button type="button" class="ev-chip" data-est="${e.id}" aria-pressed="${i === 0}"><span aria-hidden="true">${e.ic}</span> ${esc(e.t)}</button>`).join('')}</div>
    <label class="ms-pos"><input type="checkbox" id="ms-pos"> Añadir mi posición GPS (solo va en el mensaje; la app no la guarda)</label>
    <label for="ms-txt">Mensaje</label><textarea id="ms-txt" rows="4"></textarea>
    <div id="ms-dest"></div>
    <p class="muted">Los contactos salen de <a href="#/sec/plan-familiar">Contactos y acuerdos</a>. Si no hay datos móviles, envía primero por SMS.</p>
  </div>`);
  let estado = 'bien', pos = null;
  const txt = n.querySelector('#ms-txt');
  const lugar = u?.mun?.nombre || u?.nombre || '';
  const redactar = () => { txt.value = textoMensaje({ estado, lugar, punto: String(punto).split('\n')[0].slice(0, 120), pos }); pintarDestinos(); };
  function pintarDestinos() {
    const d = n.querySelector('#ms-dest');
    if (!contactos.length) { d.innerHTML = '<div class="blk-note">Todavía no tienes contactos con teléfono. Añádelos en <a href="#/sec/plan-familiar">Contactos y acuerdos</a>.</div>'; return; }
    const t = txt.value;
    d.innerHTML = `${contactos.length > 1 ? `<a class="btn wide" href="${esc(enlaceSms(contactos.map((c) => c.t), t, esIOS()))}">📨 SMS a todos (${contactos.length})</a>` : ''}
      <div class="ms-lista">${contactos.map((c) => `<div class="ms-c"><b>${esc(c.n)}</b>
        <a class="btn sm" href="${esc(enlaceSms([c.t], t, esIOS()))}">💬 SMS</a>
        <a class="btn sm ghost" href="${esc(enlaceWhatsapp(c.t, t))}" target="_blank" rel="noopener noreferrer">WhatsApp</a></div>`).join('')}</div>`;
  }
  n.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-est]');
    if (!b) return;
    estado = b.dataset.est;
    n.querySelectorAll('[data-est]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    redactar();
  });
  n.querySelector('#ms-pos').addEventListener('change', (ev) => {
    if (!ev.target.checked) { pos = null; return redactar(); }
    if (!navigator.geolocation) { ev.target.checked = false; return toast('Este móvil no da la posición.'); }
    toast('Buscando tu posición…');
    navigator.geolocation.getCurrentPosition((p) => { pos = { lat: p.coords.latitude, lon: p.coords.longitude }; redactar(); },
      () => { ev.target.checked = false; toast('No se ha podido obtener la posición.'); }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
  });
  txt.addEventListener('input', pintarDestinos);
  redactar();
  return n;
}

/* ------------------------------- Silbato ------------------------------- */
function silbato() {
  const n = el(`<div>
    <p>Tres pitidos seguidos significan <b>«necesito ayuda»</b> en montaña y en emergencias. Se oyen mucho más lejos que la voz y cansan menos. Sube el volumen del móvil al máximo.</p>
    <div class="btnrow"><button class="btn danger" type="button" id="si-3">📯 3 pitidos (auxilio)</button><button class="btn ghost" type="button" id="si-c">Pitido continuo</button><button class="btn ghost" type="button" id="si-stop">⏹ Parar</button></div>
    <p class="muted">Repite los 3 pitidos cada minuto. Si te responden con 2, te han oído. Un silbato de verdad en la mochila no gasta batería: llévalo también.</p>
  </div>`);
  let ctx = null, osc = null, temp = 0, sonando = false;
  const on = () => { try { ctx = contextoAudio(); const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'square'; o.frequency.value = 3150; g.gain.value = 0.9; o.connect(g).connect(ctx.destination); o.start(); osc = o; } catch { /* sin audio */ } };
  const off = () => { try { osc?.stop(); } catch {} osc = null; };
  const parar = () => { sonando = false; clearTimeout(temp); off(); };
  function tres() {
    parar(); sonando = true;
    const pasos = [[1, 600], [0, 300], [1, 600], [0, 300], [1, 600], [0, 4000]];
    let k = 0;
    const sig = () => { if (!sonando) return; const [s, d] = pasos[k % pasos.length]; s ? on() : off(); k++; temp = setTimeout(sig, d); };
    sig();
  }
  n.querySelector('#si-3').addEventListener('click', tres);
  n.querySelector('#si-c').addEventListener('click', () => { parar(); sonando = true; on(); });
  n.querySelector('#si-stop').addEventListener('click', parar);
  n.destruir = parar;
  return n;
}

/* ------------------------------- Linterna ------------------------------- */
function linterna() {
  const n = el(`<div>
    <p>La pantalla en blanco a pleno brillo sirve para ver de cerca, buscar algo o hacerte visible. Gasta batería: úsala a ratos.</p>
    <div class="btnrow"><button class="btn" type="button" id="li-on">🔦 Encender</button><button class="btn ghost" type="button" id="li-rojo">🔴 Luz roja (no deslumbra de noche)</button></div>
    <p class="muted">Para pedir ayuda con luz, usa el <a href="#/sec/juegos/morse">SOS en Morse</a>. Para apagar, toca la pantalla.</p>
    <div class="li-luz" id="li-luz" hidden role="button" aria-label="Apagar la linterna" tabindex="0"></div>
  </div>`);
  const luz = n.querySelector('#li-luz');
  let lock = null;
  // Sin la API de pantalla completa: la capa fija ya cubre toda la pantalla
  // (y en la app instalada no hay barras del navegador). Esa API podía dejar
  // el navegador «a pantalla completa» sin nada visible y sin responder.
  const encender = async (rojo) => {
    luz.classList.toggle('rojo', rojo); luz.hidden = false; luz.focus();
    try { lock = await navigator.wakeLock?.request('screen'); } catch { lock = null; }
  };
  const apagar = () => { luz.hidden = true; try { lock?.release(); } catch {} lock = null; };
  n.querySelector('#li-on').addEventListener('click', () => encender(false));
  n.querySelector('#li-rojo').addEventListener('click', () => encender(true));
  luz.addEventListener('click', apagar);
  luz.addEventListener('keydown', (e) => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') apagar(); });
  n.destruir = apagar;
  return n;
}

/* ------------------------------- Señales ------------------------------- */
function senales() {
  return el(`<div class="sn">
    <h3>Pedir ayuda sin teléfono</h3>
    <ul>
      <li><b>De tres en tres:</b> tres pitidos, tres destellos de luz, tres golpes o tres hogueras en triángulo significan «auxilio» en todo el mundo.</li>
      <li><b>Espejo de señales</b> (o un CD, el móvil apagado, una lata pulida): pon la mano en «V» delante de ti, apunta entre los dedos al avión, barco o persona y mueve el espejo para que el reflejo del sol pase por la «V». Se ve a muchos kilómetros.</li>
      <li><b>Con los brazos a un helicóptero:</b> los dos brazos en alto formando una «Y» = <b>sí, necesito ayuda</b>. Un brazo arriba y otro abajo = <b>no necesito ayuda</b>.</li>
      <li><b>En el suelo, para verse desde el aire:</b> letras grandes (más de 3 m) con ramas, piedras o ropa que contraste con el terreno: <b>V</b> = necesito ayuda, <b>X</b> = necesito asistencia médica, <b>SOS</b>.</li>
      <li><b>De noche:</b> la linterna o la pantalla del móvil en SOS Morse (· · · — — — · · ·).</li>
    </ul>
    <div class="blk-note">Si hay cobertura aunque sea mínima, intenta siempre el 112: la llamada entra aunque tu operador no tenga cobertura, si hay la de otro, e incluso sin tarjeta SIM.</div>
  </div>`);
}

/* ------------------------------- Diario ------------------------------- */
async function diario() {
  let notas = await kv('diario.emergencia', []);
  const n = el(`<div>
    <p class="muted">Apunta qué pasa y a qué hora: ayuda al 112, al seguro y a no perder la noción del tiempo. Se guarda solo en este móvil (y entra en tus copias de seguridad).</p>
    <div class="dr-rapidos">${['Se ha ido la luz', 'Ha vuelto la luz', 'Sin agua', 'Aviso de las autoridades', 'Salimos de casa', 'Llegamos al punto de encuentro', 'Hemos hablado con la familia'].map((t) => `<button type="button" class="ev-chip" data-dr="${esc(t)}">${esc(t)}</button>`).join('')}</div>
    <label for="dr-txt">Nota</label><textarea id="dr-txt" rows="2" placeholder="Qué ha pasado, quién, dónde…"></textarea>
    <div class="btnrow"><button class="btn" type="button" id="dr-add">➕ Apuntar ahora</button><button class="btn ghost" type="button" id="dr-copiar">📋 Copiar todo</button></div>
    <ol class="dr-lista" id="dr-lista" reversed></ol>
  </div>`);
  const lista = n.querySelector('#dr-lista');
  const f = (ts) => new Date(ts).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const pintar = () => { lista.innerHTML = notas.length ? [...notas].reverse().map((x) => `<li><time>${esc(f(x.ts))}</time> ${esc(x.t)}</li>`).join('') : '<li class="muted">Aún no hay notas.</li>'; };
  const apuntar = async (t) => { t = String(t || '').trim(); if (!t) return; notas = [...notas, { ts: Date.now(), t: t.slice(0, 500) }].slice(-500); await setKv('diario.emergencia', notas); pintar(); toast('Apuntado'); };
  n.querySelector('#dr-add').addEventListener('click', async () => { const a = n.querySelector('#dr-txt'); await apuntar(a.value); a.value = ''; });
  n.addEventListener('click', (ev) => { const b = ev.target.closest('[data-dr]'); if (b) apuntar(b.dataset.dr); });
  n.querySelector('#dr-copiar').addEventListener('click', async () => {
    const texto = notas.map((x) => `${f(x.ts)} — ${x.t}`).join('\n');
    try { await navigator.clipboard.writeText(texto); toast('Copiado: pégalo en un mensaje o una nota'); } catch { toast('No se ha podido copiar'); }
  });
  pintar();
  return n;
}

/* ------------------------------- Tarjeta PDF ------------------------------- */
/** Tarjeta de emergencia (A4 con 2 tarjetas recortables del tamaño de una cartera). */
export function pdfTarjeta(d) {
  const ops = [];
  const fx = (v) => (Math.round(v * 100) / 100).toString();
  const color = (c, s = false) => `${c.map(fx).join(' ')} ${s ? 'RG' : 'rg'}`;
  const rect = (x, y, w, h, c) => ops.push(`${color(c)} ${fx(x)} ${fx(y)} ${fx(w)} ${fx(h)} re f`);
  const marco = (x, y, w, h, c) => ops.push(`${color(c, true)} 0.8 w [4 3] 0 d ${fx(x)} ${fx(y)} ${fx(w)} ${fx(h)} re S [] 0 d`);
  const texto = (s, x, y, tam = 8, neg = false, c = C.txt) => ops.push(`BT /${neg ? 'F2' : 'F1'} ${tam} Tf ${color(c)} ${fx(x)} ${fx(y)} Td ${lit(limpiar(s))} Tj ET`);
  const W = 260, H = 165, x0 = 36;
  rect(0, 0, A4.w, A4.h, [1, 1, 1]);
  texto('Recorta por la línea de puntos, dóblala y llévala en la cartera. Una para cada persona.', x0, A4.h - 40, 9, false, [0.3, 0.3, 0.3]);
  [0, 1].forEach((i) => {
    const y0 = A4.h - 70 - (i + 1) * (H + 24);
    marco(x0, y0, W * 2, H, [0.4, 0.4, 0.4]);
    // Cara A
    rect(x0, y0 + H - 22, W, 22, C.rojo);
    texto('TARJETA DE EMERGENCIA', x0 + 10, y0 + H - 15, 10, true, [1, 1, 1]);
    let y = y0 + H - 36;
    const fila = (et, v) => { if (!v) return; texto(et, x0 + 10, y, 6.5, true, [0.35, 0.35, 0.35]); y -= 9; for (const l of partir(v, W - 20, medirHelvetica, false, 8).slice(0, 2)) { texto(l, x0 + 10, y, 8); y -= 10; } y -= 2; };
    fila('NOMBRE', d.nombre || '____________________________');
    fila('VIVE EN', d.lugar);
    fila('INFORMACIÓN MÉDICA', d.medico || 'Alergias, medicación, enfermedades: ________________');
    fila('EN CASO DE EMERGENCIA, AVISAR A', d.contactos || '____________________________');
    // Cara B
    const xb = x0 + W;
    rect(xb, y0 + H - 22, W, 22, C.olive);
    texto('PLAN FAMILIAR', xb + 10, y0 + H - 15, 10, true, [1, 1, 1]);
    y = y0 + H - 36;
    const filaB = (et, v) => { if (!v) return; texto(et, xb + 10, y, 6.5, true, [0.35, 0.35, 0.35]); y -= 9; for (const l of partir(v, W - 20, medirHelvetica, false, 8).slice(0, 2)) { texto(l, xb + 10, y, 8); y -= 10; } y -= 2; };
    filaB('PUNTO DE ENCUENTRO CERCANO', d.cerca);
    filaB('PUNTO DE ENCUENTRO FUERA DEL BARRIO', d.lejos);
    filaB('SI NO FUNCIONAN LOS MÓVILES', d.sinmovil);
    texto('EMERGENCIAS 112 · Violencia de género 016 · Conducta suicida 024', xb + 10, y0 + 10, 7, true, C.rojo);
  });
  return escribir([ops.join('\n')], 'Tarjeta de emergencia');
}

async function tarjeta() {
  const n = el(`<div>
    <p>Una tarjeta del tamaño de una cartera con lo esencial: quién eres, información médica, a quién avisar y vuestros puntos de encuentro. Se rellena con lo que ya tienes en <a href="#/sec/plan-familiar">Contactos y acuerdos</a>.</p>
    <label for="tj-n">Nombre de la persona</label><input id="tj-n" placeholder="Nombre y apellidos">
    <button class="btn wide" type="button" id="tj-pdf" style="margin-top:10px">📄 Descargar la tarjeta en PDF</button>
    <p class="muted">Haz una por persona y llévala siempre encima. Si cambia algo, vuelve a generarla.</p>
  </div>`);
  n.querySelector('#tj-pdf').addEventListener('click', async () => {
    const [medico, cerca, lejos, sinmovil, u, cs] = await Promise.all([kv('plan.medico', ''), kv('plan.cerca', ''), kv('plan.lejos', ''), kv('plan.sinmovil', ''), ubi.guardada().catch(() => null), store.all('contactos').catch(() => [])]);
    const contactos = cs.filter((c) => c.t).slice(0, 2).map((c) => `${c.n}: ${c.t}`).join(' · ');
    const bytes = pdfTarjeta({ nombre: n.querySelector('#tj-n').value.trim(), lugar: u ? ubi.nombreUbicacion(u) : '', medico, cerca, lejos, sinmovil, contactos });
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'tarjeta-emergencia.pdf'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    toast('Tarjeta descargada');
  });
  return n;
}

/* ------------------------------- Vista ------------------------------- */
const PESTANAS = [
  ['msg', '💬 Estoy bien', mensajes], ['sil', '📯 Silbato', silbato], ['lin', '🔦 Linterna', linterna],
  ['sen', '🆘 Señales', senales], ['dia', '📝 Diario', diario], ['tar', '🪪 Tarjeta', tarjeta],
];

export async function herramientasView(inicial) {
  const n = el(`<div>
    <div class="tabs tabs-grid hr-tabs" role="tablist" aria-label="Herramientas">${PESTANAS.map(([id, t], i) => `<button role="tab" type="button" data-hr="${id}" aria-selected="${i === 0}">${t}</button>`).join('')}</div>
    <div id="hr-body" class="card"></div>
  </div>`);
  const body = n.querySelector('#hr-body');
  const destruir = () => body.firstElementChild?.destruir?.();
  async function pinta(id) {
    destruir();
    const p = PESTANAS.find((x) => x[0] === id) || PESTANAS[0];
    n.querySelectorAll('[data-hr]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.hr === p[0])));
    body.replaceChildren(await p[2]());
  }
  n.querySelectorAll('[data-hr]').forEach((b) => b.addEventListener('click', () => pinta(b.dataset.hr)));
  alSalir(destruir);
  await pinta({ mensajes: 'msg', silbato: 'sil', linterna: 'lin', senales: 'sen', diario: 'dia', tarjeta: 'tar' }[inicial] || 'msg');
  return n;
}
