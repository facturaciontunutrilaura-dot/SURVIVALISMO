/* =========================================================================
   fondos.js — FONDOS DE PANTALLA (Herramientas SOS → 🖼 Fondos)
     · Fondo de emergencia para la pantalla de bloqueo, con el 112 y lo que
       tú elijas de tu plan (contactos, punto de encuentro, info médica, QR).
     · Fondos decorativos con el estilo de la app.
   Se dibujan en el móvil (canvas), al tamaño de su pantalla, sin conexión.
   Ningún navegador deja a una web cambiar el fondo: la app crea la imagen,
   tú la guardas en Fotos y la eliges como fondo.
   ========================================================================= */
import { el, esc, toast } from './ui.js';
import * as store from './store.js';
import * as F from './fondos-core.js';

const kv = async (id, def) => (await store.get('kv', id).catch(() => null))?.v ?? def;
const setKv = (id, v) => store.put('kv', { id, v }).catch(() => {});
const esIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const FUENTE = 'Manrope, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const OLIVA = '#9CB768', ROJO = '#C8402F';

/* ------------------------------ Dibujo ------------------------------ */
function rosa(ctx, cx, cy, R, { color = OLIVA, letras = true, alfa = 1 } = {}) {
  ctx.save();
  ctx.globalAlpha = alfa;
  ctx.translate(cx, cy);
  ctx.strokeStyle = color; ctx.lineWidth = R * 0.025;
  ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = R * 0.008;
  ctx.beginPath(); ctx.arc(0, 0, R * 0.88, 0, Math.PI * 2); ctx.stroke();
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2, l = i % 18 === 0 ? 0.14 : i % 6 === 0 ? 0.09 : 0.05;
    ctx.lineWidth = R * (i % 18 === 0 ? 0.02 : 0.01);
    ctx.beginPath(); ctx.moveTo(Math.sin(a) * R * 0.98, -Math.cos(a) * R * 0.98); ctx.lineTo(Math.sin(a) * R * (0.98 - l), -Math.cos(a) * R * (0.98 - l)); ctx.stroke();
  }
  const punta = (ang, largo, ancho, c1, c2) => {
    ctx.save(); ctx.rotate(ang);
    ctx.fillStyle = c1; ctx.beginPath(); ctx.moveTo(0, -largo); ctx.lineTo(ancho, 0); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = c2; ctx.beginPath(); ctx.moveTo(0, -largo); ctx.lineTo(-ancho, 0); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
    ctx.restore();
  };
  for (let i = 0; i < 4; i++) punta(Math.PI / 4 + (i * Math.PI) / 2, R * 0.5, R * 0.08, '#4E6236', '#3C4A3E');
  for (let i = 1; i < 4; i++) punta((i * Math.PI) / 2, R * 0.72, R * 0.12, '#6E8A44', '#4E6236');
  punta(0, R * 0.72, R * 0.12, ROJO, '#8E2B1F');
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, 0, R * 0.04, 0, Math.PI * 2); ctx.fill();
  if (letras) {
    ctx.font = `800 ${R * 0.13}px ${FUENTE}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    [['N', 0], ['E', 1], ['S', 2], ['O', 3]].forEach(([l, i]) => {
      const a = (i * Math.PI) / 2;
      ctx.fillStyle = l === 'N' ? ROJO : color;
      ctx.fillText(l, Math.sin(a) * R * 0.76, -Math.cos(a) * R * 0.76);
    });
  }
  ctx.restore();
}

/** Curvas de nivel por «marching squares» sobre un relieve inventado. */
function curvas(ctx, w, h, r, { color = 'rgba(156,183,104,.45)', fuerte = 'rgba(156,183,104,.8)', grosor = 1 } = {}) {
  const montes = Array.from({ length: 7 }, () => ({ x: r() * w, y: r() * h, s: (0.12 + r() * 0.25) * w, a: 0.5 + r() }));
  const f = (x, y) => montes.reduce((s, m) => s + m.a * Math.exp(-((x - m.x) ** 2 + (y - m.y) ** 2) / (2 * m.s * m.s)), 0) + 0.08 * Math.sin(x / w * 7 + y / h * 3);
  const paso = Math.max(4, Math.round(w / 110));
  const nx = Math.ceil(w / paso) + 1, ny = Math.ceil(h / paso) + 1;
  const v = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) v[j * nx + i] = f(i * paso, j * paso);
  for (let k = 1; k <= 22; k++) {
    const nivel = k * 0.07;
    ctx.strokeStyle = k % 5 === 0 ? fuerte : color;
    ctx.lineWidth = (k % 5 === 0 ? 2.2 : 1) * grosor * (w / 1000);
    ctx.beginPath();
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const a = v[j * nx + i], b = v[j * nx + i + 1], c = v[(j + 1) * nx + i + 1], d = v[(j + 1) * nx + i];
      const caso = (a > nivel) | ((b > nivel) << 1) | ((c > nivel) << 2) | ((d > nivel) << 3);
      if (caso === 0 || caso === 15) continue;
      const x = i * paso, y = j * paso;
      const t = (p, q) => (nivel - p) / (q - p);
      const P = [[x + paso * t(a, b), y], [x + paso, y + paso * t(b, c)], [x + paso * t(d, c), y + paso], [x, y + paso * t(a, d)]];
      const seg = { 1: [[3, 0]], 2: [[0, 1]], 3: [[3, 1]], 4: [[1, 2]], 5: [[3, 0], [1, 2]], 6: [[0, 2]], 7: [[3, 2]], 8: [[2, 3]], 9: [[0, 2]], 10: [[0, 1], [2, 3]], 11: [[1, 2]], 12: [[1, 3]], 13: [[0, 1]], 14: [[0, 3]] }[caso];
      for (const [p1, p2] of seg) { ctx.moveTo(...P[p1]); ctx.lineTo(...P[p2]); }
    }
    ctx.stroke();
  }
}

function mancha(ctx, cx, cy, R, r) {
  const n = 9, pts = Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2, rr = R * (0.6 + r() * 0.7); return [cx + Math.cos(a) * rr * 1.4, cy + Math.sin(a) * rr]; });
  ctx.beginPath();
  const m = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  ctx.moveTo(...m(pts[n - 1], pts[0]));
  for (let i = 0; i < n; i++) ctx.quadraticCurveTo(...pts[i], ...m(pts[i], pts[(i + 1) % n]));
  ctx.fill();
}

function marca(ctx, w, h, color = 'rgba(255,255,255,.35)') {
  ctx.save();
  ctx.font = `800 ${w * 0.03}px ${FUENTE}`; ctx.textAlign = 'center'; ctx.fillStyle = color;
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${w * 0.008}px`;
  ctx.fillText('SUPERVIVENCIA', w / 2, h * 0.86);
  ctx.restore();
}

const DIBUJO = {
  brujula(ctx, w, h) {
    const g = ctx.createRadialGradient(w / 2, h * 0.58, 0, w / 2, h * 0.58, h * 0.7);
    g.addColorStop(0, '#24332B'); g.addColorStop(1, '#0D110F');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    rosa(ctx, w / 2, h * 0.58, w * 0.4);
    marca(ctx, w, h);
  },
  topo(ctx, w, h, r) {
    ctx.fillStyle = '#1C2A24'; ctx.fillRect(0, 0, w, h);
    curvas(ctx, w, h, r);
  },
  camo(ctx, w, h, r) {
    ctx.fillStyle = '#4A5440'; ctx.fillRect(0, 0, w, h);
    for (const c of ['#5F6A45', '#2F3A2C', '#7A7651', '#1F2620']) {
      ctx.fillStyle = c;
      for (let i = 0; i < 26; i++) mancha(ctx, r() * w, r() * h, (0.05 + r() * 0.09) * w, r);
    }
  },
  noche(ctx, w, h, r) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 700; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.15 + r() * 0.6})`;
      ctx.beginPath(); ctx.arc(r() * w, r() * h, (r() ** 3 * 2.2 + 0.4) * (w / 1000), 0, Math.PI * 2); ctx.fill();
    }
    // Osa Mayor y la Estrella Polar: prolonga 5 veces el borde del «carro».
    const k = w / 1000, ox = w * 0.08, oy = h * 0.74;
    const osa = [[0, 0], [120, -10], [230, 20], [330, 60], [360, 170], [500, 190], [520, 70]].map(([x, y]) => [ox + x * k, oy + y * k]);
    const [a, b] = [osa[6], osa[5]];
    const pol = [b[0] + (a[0] - b[0]) * 5.2, b[1] + (a[1] - b[1]) * 5.2];
    ctx.strokeStyle = 'rgba(156,183,104,.55)'; ctx.lineWidth = 2 * k;
    ctx.beginPath(); osa.forEach((p, i) => (i ? ctx.lineTo(...p) : ctx.moveTo(...p))); ctx.lineTo(...osa[3]); ctx.stroke();
    ctx.setLineDash([10 * k, 12 * k]); ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...pol); ctx.stroke(); ctx.setLineDash([]);
    for (const p of osa) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(...p, 6 * k, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#FFF6D8'; ctx.shadowColor = '#FFF6D8'; ctx.shadowBlur = 30 * k;
    ctx.beginPath(); ctx.arc(...pol, 11 * k, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.font = `700 ${34 * k}px ${FUENTE}`; ctx.fillStyle = 'rgba(156,183,104,.95)'; ctx.textAlign = 'center';
    ctx.fillText('Estrella Polar', pol[0], pol[1] - 40 * k);
    ctx.font = `600 ${26 * k}px ${FUENTE}`; ctx.fillText('mirando hacia ella, el norte', pol[0], pol[1] + 52 * k);
  },
  mapa(ctx, w, h, r) {
    ctx.fillStyle = '#ECE6D6'; ctx.fillRect(0, 0, w, h);
    curvas(ctx, w, h, r, { color: 'rgba(140,105,70,.35)', fuerte: 'rgba(140,105,70,.6)' });
    const n = 6, p = w / n, k = w / 1000;
    ctx.strokeStyle = 'rgba(47,90,74,.45)'; ctx.lineWidth = 1.5 * k;
    ctx.font = `600 ${22 * k}px ${FUENTE}`; ctx.fillStyle = 'rgba(47,90,74,.8)';
    for (let x = p; x < w; x += p) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); ctx.fillText(`${(x / p * 2).toFixed(0)}`.padStart(2, '0') + '0', x + 6 * k, h * 0.985); }
    for (let y = p, i = 1; y < h; y += p, i++) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); ctx.fillText(`44${String(80 - i).padStart(2, '0')}`, 8 * k, y - 8 * k); }
    rosa(ctx, w * 0.78, h * 0.9, w * 0.11, { color: '#2F5A4A', letras: false, alfa: 0.9 });
  },
};

/** Fondo de emergencia: el 112 y lo elegido, en la zona libre de la pantalla de bloqueo. */
function dibujarEmergencia(ctx, w, h, bloques, { negro = false, qr = null } = {}) {
  ctx.fillStyle = negro ? '#000' : '#101713'; ctx.fillRect(0, 0, w, h);
  if (!negro) curvas(ctx, w, h, F.azar(7), { color: 'rgba(156,183,104,.12)', fuerte: 'rgba(156,183,104,.2)' });
  const x0 = w * 0.08, ancho = w * 0.84, arriba = h * 0.35, abajo = h * 0.88;
  const EST = {
    aviso: { f: 0.04, p: 800, c: '#fff', esp: 0.5 }, nombre: { f: 0.062, p: 800, c: '#fff', esp: 0.35 },
    tel: { f: 0.085, p: 800, c: '#fff', esp: 0.45 }, etiqueta: { f: 0.034, p: 700, c: OLIVA, esp: 0.15, antes: 0.5 },
    contacto: { f: 0.052, p: 700, c: '#fff', esp: 0.2 }, texto: { f: 0.044, p: 500, c: '#DCE5DE', esp: 0.2 },
  };
  const lado = qr ? w * 0.26 : 0;
  const maquetar = (k) => {
    const out = []; let y = 0;
    for (const b of bloques) {
      const e = EST[b.tipo], fs = e.f * w * k;
      ctx.font = `${e.p} ${fs}px ${FUENTE}`;
      if (e.antes) y += fs * e.antes;
      const pad = b.tipo === 'tel' || b.tipo === 'aviso' ? fs * 0.45 : 0;
      const lineas = b.tipo === 'aviso' || b.tipo === 'tel' ? [b.t] : F.partirTexto(b.t, ancho, (t) => ctx.measureText(t).width);
      for (const l of lineas) { out.push({ b, l, fs, e, y: y + pad, pad }); y += fs * 1.22 + pad * 2; }
      y += fs * e.esp;
    }
    return { out, alto: y + (qr ? lado + w * 0.04 : 0) };
  };
  let k = 1, m = maquetar(k);
  while (m.alto > abajo - arriba && k > 0.55) { k -= 0.05; m = maquetar(k); }
  ctx.textBaseline = 'top'; ctx.textAlign = 'left';
  for (const { b, l, fs, e, y, pad } of m.out) {
    const Y = arriba + y;
    ctx.font = `${e.p} ${fs}px ${FUENTE}`;
    if (b.tipo === 'aviso' || b.tipo === 'tel') {
      const tw = ctx.measureText(l).width;
      ctx.fillStyle = b.tipo === 'tel' ? ROJO : 'rgba(200,64,47,.25)';
      ctx.strokeStyle = ROJO; ctx.lineWidth = w * 0.004;
      ctx.beginPath();
      const caja = [x0 - pad * 0.2, Y - pad, tw + pad * 2.2, fs * 1.22 + pad * 2];
      if (ctx.roundRect) ctx.roundRect(...caja, fs * 0.35); else ctx.rect(...caja);
      ctx.fill(); if (b.tipo === 'aviso') ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.fillText(l, x0 + pad, Y + fs * 0.08);
    } else {
      ctx.fillStyle = e.c;
      ctx.fillText(b.tipo === 'etiqueta' ? l.toUpperCase() : l, x0, Y);
    }
  }
  if (qr) {
    const y = arriba + m.alto - lado, n = qr.length, u = lado / (n + 8);
    ctx.fillStyle = '#fff'; ctx.fillRect(x0, y, lado, lado);
    ctx.fillStyle = '#000';
    qr.forEach((fila, r) => fila.forEach((v, c) => { if (v) ctx.fillRect(x0 + (c + 4) * u, y + (r + 4) * u, Math.ceil(u), Math.ceil(u)); }));
    ctx.font = `600 ${w * 0.03 * k}px ${FUENTE}`; ctx.fillStyle = '#DCE5DE';
    F.partirTexto('Escanéalo con la cámara: mis datos de emergencia, sin internet.', ancho - lado - w * 0.05, (t) => ctx.measureText(t).width)
      .forEach((l, i) => ctx.fillText(l, x0 + lado + w * 0.04, y + i * w * 0.04 * k));
  }
}

async function lienzo(tam, pintar) {
  try { await document.fonts?.load(`800 40px Manrope`); } catch { /* fuente del sistema */ }
  const c = document.createElement('canvas');
  c.width = tam.w; c.height = tam.h;
  pintar(c.getContext('2d'), tam.w, tam.h);
  return c;
}
const aBlob = (c) => new Promise((res) => c.toBlob(res, 'image/png'));

/* ------------------------------ Pantalla ------------------------------ */
export async function fondosView() {
  const tam = F.tamanoPantalla(screen.width, screen.height, window.devicePixelRatio || 1);
  const [cs, cerca, punto, lejos, medico, guard] = await Promise.all([
    store.all('contactos').catch(() => []), kv('plan.cerca', ''), kv('plan.punto', ''), kv('plan.lejos', ''), kv('plan.medico', ''),
    kv('fondos.opciones', null),
  ]);
  const contactos = [...cs.filter((c) => c.r !== 'externo'), ...cs.filter((c) => c.r === 'externo')];
  const encuentro = cerca || punto || lejos;
  const op = { nombre: true, contactos: true, encuentro: true, medico: false, qr: false, negro: false, txtNombre: '', ...(guard || {}) };
  const ios = esIOS();

  const casilla = (k, t, ayuda = '', deshab = false) => `<label class="fd-op${deshab ? ' off' : ''}"><input type="checkbox" data-op="${k}" ${op[k] ? 'checked' : ''} ${deshab ? 'disabled' : ''}> <span>${t}${ayuda ? `<small>${ayuda}</small>` : ''}</span></label>`;
  const n = el(`<div class="fondos">
    <p>Fondos para la pantalla de tu móvil, creados aquí mismo al tamaño de tu pantalla (${tam.w} × ${tam.h}) y sin conexión.</p>
    <h3>🆘 Fondo de emergencia para la pantalla de bloqueo</h3>
    <p class="muted">Si te pasa algo, un sanitario o un vecino ve el 112 y a quién avisar sin desbloquear el móvil. Sale de lo que tienes en <a href="#/sec/plan-familiar">Contactos y acuerdos</a>.</p>
    <div class="fd-ops">
      ${casilla('nombre', 'Tu nombre')}
      <input id="fd-nombre" type="text" maxlength="40" placeholder="Nombre (opcional)" aria-label="Tu nombre para el fondo" value="${esc(op.txtNombre)}">
      ${casilla('contactos', 'A quién avisar', contactos.length ? `${contactos.length} contacto${contactos.length > 1 ? 's' : ''} apuntado${contactos.length > 1 ? 's' : ''}: salen hasta 3` : 'Aún no tienes contactos apuntados', !contactos.length)}
      ${casilla('encuentro', 'Punto de encuentro', encuentro ? '' : 'Aún no lo has apuntado', !encuentro)}
      ${casilla('medico', 'Información médica', medico ? 'Alergias, medicación… Lo verá cualquiera que coja tu móvil' : 'Aún no la has apuntado', !medico)}
      ${casilla('qr', 'Código QR con tus datos', 'Lleva lo mismo que marques aquí')}
      ${casilla('negro', 'Fondo negro puro', 'Gasta menos batería en pantallas OLED')}
    </div>
    <div class="fd-prev"><img id="fd-em" alt="Vista previa del fondo de emergencia"></div>
    <button class="btn wide" type="button" data-guardar="em">⬇️ Guardar el fondo de emergencia</button>

    <h3>🎨 Fondos decorativos</h3>
    <div class="fd-rejilla" role="radiogroup" aria-label="Diseños">${F.DISENOS.map((d, i) => `<button type="button" role="radio" class="fd-mini" data-dis="${d.id}" aria-checked="${i === 0}"><img alt="" data-mini="${d.id}"><b>${esc(d.t)}</b><small>${esc(d.d)}</small></button>`).join('')}</div>
    <div class="fd-prev"><img id="fd-dec" alt="Vista previa del fondo elegido"></div>
    <button class="btn wide" type="button" data-guardar="dec">⬇️ Guardar este fondo</button>

    <details class="card plegable fd-como" open><summary>Cómo ponerlo de fondo</summary>
      ${ios ? `<ol><li>Pulsa <b>Guardar</b> y elige <b>Guardar imagen</b>: queda en Fotos.</li><li>Abre <b>Fotos</b>, abre la imagen, pulsa <b>Compartir</b> y después <b>Usar como fondo de pantalla</b>.</li><li>Para el de emergencia, elige <b>pantalla de bloqueo</b>.</li></ol>`
        : `<ol><li>Pulsa <b>Guardar</b>: se guarda en tu galería o en Descargas.</li><li>Abre la imagen en la <b>Galería</b> o en <b>Fotos</b>, pulsa los tres puntos y <b>Establecer como fondo de pantalla</b>.</li><li>Para el de emergencia, elige <b>pantalla de bloqueo</b>.</li></ol>`}
      <p class="muted">Ningún navegador permite que una web cambie el fondo por sí sola. Si cambias tus contactos, vuelve aquí y genera el fondo de nuevo.</p>
    </details>
  </div>`);

  const blobs = {}, urls = [];
  const verUrl = (img, blob) => { const u = URL.createObjectURL(blob); urls.push(u); img.src = u; };
  n.destruir = () => urls.forEach((u) => URL.revokeObjectURL(u));
  let dis = F.DISENOS[0].id;

  async function pintarEmergencia() {
    const nombre = n.querySelector('#fd-nombre').value.trim();
    const bloques = F.bloquesEmergencia({ nombre, contactos, encuentro, medico }, op);
    let qr = null;
    if (op.qr) {
      const X = await import('./herramientas-extra.js');
      qr = X.matrizQR(X.textoQR({ nombre: op.nombre ? nombre : '', medico: op.medico ? medico : '', cerca: op.encuentro ? encuentro : '', contactos: op.contactos ? contactos.filter((c) => c.t).slice(0, 2).map((c) => `${c.n}: ${c.t}`).join(' · ') : '' }));
    }
    const c = await lienzo(tam, (ctx, w, h) => dibujarEmergencia(ctx, w, h, bloques, { negro: op.negro, qr }));
    blobs.em = await aBlob(c);
    verUrl(n.querySelector('#fd-em'), blobs.em);
  }
  async function pintarDecorativo() {
    const c = await lienzo(tam, (ctx, w, h) => DIBUJO[dis](ctx, w, h, F.azar(42)));
    blobs.dec = await aBlob(c);
    verUrl(n.querySelector('#fd-dec'), blobs.dec);
  }
  async function miniaturas() {
    const mini = { w: 240, h: Math.round((240 * tam.h) / tam.w) };
    for (const d of F.DISENOS) {
      const c = await lienzo(mini, (ctx, w, h) => DIBUJO[d.id](ctx, w, h, F.azar(42)));
      n.querySelector(`[data-mini="${d.id}"]`).src = c.toDataURL('image/png');
    }
  }
  const guardarOp = () => setKv('fondos.opciones', { ...op, txtNombre: n.querySelector('#fd-nombre').value.trim() });

  n.querySelectorAll('[data-op]').forEach((i) => i.addEventListener('change', () => { op[i.dataset.op] = i.checked; guardarOp(); pintarEmergencia(); }));
  let espera = null;
  n.querySelector('#fd-nombre').addEventListener('input', () => { clearTimeout(espera); espera = setTimeout(() => { guardarOp(); pintarEmergencia(); }, 400); });
  n.querySelectorAll('[data-dis]').forEach((b) => b.addEventListener('click', () => {
    dis = b.dataset.dis;
    n.querySelectorAll('[data-dis]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
    pintarDecorativo();
  }));
  n.querySelectorAll('[data-guardar]').forEach((b) => b.addEventListener('click', async () => {
    const k = b.dataset.guardar, blob = blobs[k];
    if (!blob) { toast('Un momento: aún se está creando la imagen'); return; }
    const nombre = F.nombreArchivo(k === 'em' ? 'emergencia' : dis, tam);
    const file = new File([blob], nombre, { type: 'image/png' });
    // En el móvil, «Compartir» lleva a «Guardar imagen» (Fotos); si no, se descarga.
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Fondo de pantalla' }); return; } catch (e) { if (e?.name === 'AbortError') return; }
    }
    const u = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = u; a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 60000);
    toast('Imagen guardada: búscala en Descargas o en tu galería', { tipo: 'ok' });
  }));

  pintarEmergencia(); pintarDecorativo(); miniaturas();
  return n;
}
