/* =========================================================================
   juegos-nuevos.js — Juegos añadidos en la v1.15
     · Salva la despensa (deslizar el dedo)   · Damas
     · Sudoku                                 · Mochila en 60 segundos
     · Código Morse                           · Juegos sin pantalla (fichas)
   Todo sin conexión. Récords y partidas en IndexedDB (kv), que no cuentan
   como datos propios (no entran en el aviso de copia de seguridad).
   Cada vista expone n.destruir() para parar temporizadores, sonido y
   animaciones al cambiar de juego o de pantalla.
   ========================================================================= */
import { el, esc, toast } from './ui.js';
import * as store from './store.js';
import * as DA from './damas.js';
import * as SU from './sudoku.js';
import * as MO from './morse.js';
import { contextoAudio } from './sonido.js';
import {
  SIN_PANTALLA, SIN_PANTALLA_AVISO, MOCHILA_OBJETOS, MOCHILA_MAX_KG,
  DESPENSA_UTIL, DESPENSA_PELIGRO, DESPENSA_CONSEJOS,
} from '../../data/content/juegos-extra.js';

const kv = async (id, def) => (await store.get('kv', id).catch(() => null))?.v ?? def;
const setKv = (id, v) => store.put('kv', { id, v }).catch(() => {});
const barajar = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const kg = (x) => `${x.toLocaleString('es-ES', { maximumFractionDigits: 2 })} kg`;

/* ========================================================================
   SALVA LA DESPENSA
   ======================================================================== */
export function despensa() {
  const n = el(`<div class="card">
    <h3>🎒 Salva la despensa</h3>
    <p class="muted">Desliza el dedo por encima de lo útil para meterlo en la mochila. Lo peligroso (⚡ 🍄 🦠), déjalo pasar. Si tocas algo peligroso o se te cae algo útil, pierdes una vida.</p>
    <div class="dsp-marcador" aria-live="polite"><span id="dsp-pts">0 puntos</span><span id="dsp-vidas" aria-label="Vidas">❤️❤️❤️</span><span id="dsp-rec" class="muted"></span></div>
    <div class="dsp-zona">
      <canvas id="dsp-c" class="dsp-canvas" aria-label="Zona de juego: desliza el dedo sobre los objetos"></canvas>
      <div id="dsp-capa" class="dsp-capa"><button class="btn" id="dsp-go" type="button">▶ Empezar</button></div>
    </div>
    <div id="dsp-fin"></div>
  </div>`);
  const cv = n.querySelector('#dsp-c'), ctx = cv.getContext('2d');
  const capa = n.querySelector('#dsp-capa'), fin = n.querySelector('#dsp-fin');
  const ptsEl = n.querySelector('#dsp-pts'), vidasEl = n.querySelector('#dsp-vidas'), recEl = n.querySelector('#dsp-rec');
  let W = 0, H = 0, dpr = 1, raf = 0, vivo = true, jugando = false, ultimo = 0;
  let objs, pts, vidas, guardado, combo, ultimoGuardado, proxima, ritmo, tiempo, trazo, avisos, efectos;

  kv('despensa.record', 0).then((r) => { if (vivo) recEl.textContent = r ? `Récord: ${r}` : ''; });

  const medir = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.clientWidth || 320; H = cv.clientHeight || 420;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  function lanzar() {
    const peligro = tiempo > 4 && Math.random() < Math.min(0.18 + tiempo / 200, 0.35);
    const base = peligro ? DESPENSA_PELIGRO[Math.floor(Math.random() * DESPENSA_PELIGRO.length)] : DESPENSA_UTIL[Math.floor(Math.random() * DESPENSA_UTIL.length)];
    const x = W * (0.15 + Math.random() * 0.7);
    const g = H * 1.1;
    const vy = -Math.sqrt(2 * g * H * (0.55 + Math.random() * 0.3));
    objs.push({ ...base, util: !peligro, x, y: H + 30, vx: (W / 2 - x) * (0.2 + Math.random() * 0.4), vy, g, r: 28, hecho: false, rot: 0, vr: (Math.random() - 0.5) * 3 });
  }

  function cruza(o, a, b) {
    // Distancia del centro del objeto al segmento a-b.
    const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1;
    const k = Math.max(0, Math.min(1, ((o.x - a.x) * dx + (o.y - a.y) * dy) / l2));
    const px = a.x + k * dx - o.x, py = a.y + k * dy - o.y;
    return px * px + py * py < o.r * o.r;
  }

  function pintarMarcador() {
    ptsEl.textContent = `${pts} puntos`;
    vidasEl.textContent = '❤️'.repeat(Math.max(vidas, 0)) + '🤍'.repeat(3 - Math.max(vidas, 0));
  }

  function perderVida(texto) {
    vidas--;
    avisos.push({ t: texto, hasta: tiempo + 2.2 });
    if (navigator.vibrate) try { navigator.vibrate(60); } catch {}
    pintarMarcador();
    if (vidas <= 0) terminar();
  }

  function paso(ahora) {
    if (!vivo) return;
    const dt = Math.min(0.05, (ahora - (ultimo || ahora)) / 1000);
    ultimo = ahora;
    if (jugando) {
      tiempo += dt;
      proxima -= dt;
      if (proxima <= 0) { lanzar(); if (tiempo > 15 && Math.random() < 0.35) lanzar(); ritmo = Math.max(0.45, 1.25 - tiempo / 70); proxima = ritmo * (0.7 + Math.random() * 0.6); }
      for (const o of objs) {
        if (o.guardado) continue;   // va volando a la mochila (lo anima dibujar)
        o.vy += o.g * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.rot += o.vr * dt;
        if (!o.hecho && o.vy > 0 && o.y > H + o.r) {
          o.hecho = true;
          if (o.util && jugando) perderVida(`Se te ha caído: ${o.t}`);
        }
      }
      objs = objs.filter((o) => !(o.hecho && (o.y > H + 60 || o.fuera)) && o.y < H + 80);
      if (tiempo - ultimoGuardado > 0.7) combo = 0;
    }
    dibujar();
    raf = requestAnimationFrame(paso);
  }

  function dibujar() {
    const css = getComputedStyle(n);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = css.getPropertyValue('--bg2') || '#eee';
    ctx.fillRect(0, 0, W, H);
    // Mochila (destino de lo guardado)
    ctx.font = '34px system-ui, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🎒', W - 30, 30);
    for (const o of objs) {
      if (o.guardado) {
        // Vuela hacia la mochila
        o.x += (W - 30 - o.x) * 0.2; o.y += (30 - o.y) * 0.2;
        if (Math.abs(o.x - (W - 30)) < 6) { o.hecho = true; o.fuera = true; continue; }
      }
      ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.rot);
      ctx.font = `${o.guardado ? 30 : 44}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
      ctx.fillText(o.ic, 0, 2);
      ctx.restore();
    }
    // Estela del dedo
    if (trazo.length > 1) {
      ctx.strokeStyle = css.getPropertyValue('--olive3') || '#2F5A4A';
      ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(trazo[0].x, trazo[0].y);
      for (const p of trazo) ctx.lineTo(p.x, p.y);
      ctx.stroke();
      trazo = trazo.filter((p) => performance.now() - p.t < 140);
    }
    for (const e of efectos) {
      ctx.globalAlpha = Math.max(0, e.hasta - tiempo);
      ctx.font = '700 18px system-ui, sans-serif';
      ctx.fillStyle = css.getPropertyValue('--olive3') || '#2F5A4A';
      ctx.fillText(e.t, e.x, e.y - (1 - (e.hasta - tiempo)) * 30);
      ctx.globalAlpha = 1;
    }
    efectos = efectos.filter((e) => e.hasta > tiempo);
    const av = avisos.filter((a) => a.hasta > tiempo);
    avisos = av;
    if (av.length) {
      const t = av[av.length - 1].t;
      ctx.font = '600 15px system-ui, sans-serif';
      const w = Math.min(W - 20, ctx.measureText(t).width + 24);
      ctx.fillStyle = css.getPropertyValue('--danger-bg') || '#fbe7e2';
      ctx.fillRect((W - w) / 2, H - 46, w, 32);
      ctx.fillStyle = css.getPropertyValue('--danger-fg') || '#8a2617';
      ctx.fillText(t, W / 2, H - 30, W - 30);
    }
  }

  const punto = (ev) => { const r = cv.getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top, t: performance.now() }; };
  let pulsado = false;
  cv.addEventListener('pointerdown', (ev) => { pulsado = true; trazo = [punto(ev)]; cv.setPointerCapture?.(ev.pointerId); });
  cv.addEventListener('pointerup', () => { pulsado = false; });
  cv.addEventListener('pointercancel', () => { pulsado = false; });
  cv.addEventListener('pointermove', (ev) => {
    if (!pulsado || !jugando) return;
    const b = punto(ev), a = trazo[trazo.length - 1] || b;
    trazo.push(b);
    for (const o of objs) {
      if (o.hecho || o.guardado || !cruza(o, a, b)) continue;
      if (o.util) {
        o.guardado = true;
        combo = tiempo - ultimoGuardado < 0.7 ? combo + 1 : 1;
        ultimoGuardado = tiempo;
        const ganados = 10 * Math.min(combo, 5);
        pts += ganados; guardado.push(o);
        efectos.push({ t: combo > 1 ? `+${ganados} ×${combo}` : `+${ganados}`, x: o.x, y: o.y, hasta: tiempo + 0.9 });
        pintarMarcador();
      } else {
        o.hecho = true; o.fuera = true;
        perderVida(`¡Cuidado! ${o.t}`);
        o.toco = true;
        guardado.peligros = [...(guardado.peligros || []), o];
      }
    }
  });

  async function terminar() {
    jugando = false;
    const rec = await kv('despensa.record', 0);
    const nuevo = pts > rec;
    if (nuevo) setKv('despensa.record', pts);
    if (!vivo) return;
    recEl.textContent = `Récord: ${Math.max(rec, pts)}`;
    const cuenta = {};
    for (const o of guardado) cuenta[o.t] = (cuenta[o.t] || 0) + 1;
    const litros = guardado.filter((o) => o.litros).length;
    const lista = Object.entries(cuenta).sort((a, b) => b[1] - a[1]).map(([t, k]) => `<li>${esc(t)}: ${k}</li>`).join('');
    const peligro = (guardado.peligros || [])[0];
    const consejo = peligro ? peligro.consejo : DESPENSA_CONSEJOS[Math.floor(Math.random() * DESPENSA_CONSEJOS.length)];
    fin.innerHTML = `<div class="dsp-res">
      <h3>${nuevo ? '🏆 ¡Nuevo récord!' : 'Fin de la partida'}</h3>
      <p><b>${pts} puntos.</b> Has guardado ${guardado.length} cosas${litros ? `, entre ellas ${litros} ${litros === 1 ? 'litro' : 'litros'} de agua (${litros >= 6 ? 'suficiente para 2 personas un día' : litros >= 3 ? 'suficiente para 1 persona un día' : 'aún no llega para 1 persona un día'})` : ''}.</p>
      ${lista ? `<ul class="dsp-lista">${lista}</ul>` : ''}
      <div class="blk-note">${esc(consejo)}</div>
    </div>`;
    capa.hidden = false;
    capa.querySelector('#dsp-go').textContent = '↻ Jugar otra vez';
  }

  function empezar() {
    medir();
    objs = []; pts = 0; vidas = 3; guardado = []; combo = 0; ultimoGuardado = -9; proxima = 0.4; ritmo = 1.25; tiempo = 0; trazo = []; avisos = []; efectos = [];
    fin.innerHTML = '';
    pintarMarcador();
    capa.hidden = true;
    jugando = true;
  }
  objs = []; trazo = []; avisos = []; efectos = []; tiempo = 0;
  capa.querySelector('#dsp-go').addEventListener('click', empezar);
  const alOcultar = () => { if (document.hidden) ultimo = 0; };
  document.addEventListener('visibilitychange', alOcultar);
  window.addEventListener('resize', medir);
  requestAnimationFrame(() => { if (vivo) { medir(); raf = requestAnimationFrame(paso); } });
  n.destruir = () => {
    vivo = false; jugando = false; cancelAnimationFrame(raf);
    document.removeEventListener('visibilitychange', alOcultar);
    window.removeEventListener('resize', medir);
  };
  return n;
}

/* ========================================================================
   DAMAS
   ======================================================================== */
export function damas() {
  const n = el(`<div class="card">
    <h3>⚪⚫ Damas</h3>
    <div class="btnrow">
      <button class="btn sm" data-modo="normal" type="button">vs máquina</button>
      <button class="btn sm ghost" data-modo="facil" type="button">vs máquina fácil</button>
      <button class="btn sm ghost" data-modo="pvp" type="button">2 jugadores</button>
    </div>
    <p id="dam-estado" class="center dam-estado" role="status" aria-live="polite"></p>
    <div id="dam-tab" class="dam" role="grid" aria-label="Tablero de damas"></div>
    <div class="btnrow" style="margin-top:10px"><button class="btn ghost sm" id="dam-new" type="button">Nueva partida</button></div>
    <details class="plegable"><summary>Reglas (damas españolas)</summary><div><ul>
      <li>Se juega en las casillas oscuras. Empiezan las blancas.</li>
      <li>Los peones avanzan una casilla en diagonal y solo capturan hacia delante, saltando por encima.</li>
      <li>Si un peón termina su jugada en la última fila, se convierte en dama (♛): se mueve y captura a cualquier distancia en diagonal.</li>
      <li>Capturar es obligatorio, y hay que elegir la jugada que capture más piezas. Se puede encadenar varias capturas.</li>
      <li>Pierde quien se queda sin piezas o sin jugadas.</li>
    </ul></div></details>
  </div>`);
  const tabEl = n.querySelector('#dam-tab'), estado = n.querySelector('#dam-estado');
  let t, turno, modo = 'normal', sel = null, fin = false, sinCambios = 0, vivo = true, temp = 0;

  const ficha = (p) => (p ? `<span class="dam-f ${DA.bando(p)}${p === 'W' || p === 'B' ? ' reina' : ''}" aria-hidden="true">${p === 'W' || p === 'B' ? '♛' : ''}</span>` : '');
  const nombre = (c) => (c === 'w' ? 'blancas' : 'negras');
  const coord = (i) => `${'abcdefgh'[i & 7]}${8 - (i >> 3)}`;

  function pintar() {
    const js = fin ? [] : DA.jugadas(t, turno);
    const movibles = new Set(js.map((m) => m.de));
    const destinos = new Map(sel != null ? js.filter((m) => m.de === sel).map((m) => [m.a, m]) : []);
    tabEl.innerHTML = t.map((p, i) => {
      const os = DA.oscura(i);
      const cls = ['dam-c', os ? 'osc' : 'cla', sel === i ? 'sel' : '', destinos.has(i) ? 'dest' : '', movibles.has(i) && !fin && (modo === 'pvp' || turno === 'w') ? 'mov' : ''].join(' ');
      const lab = `${coord(i)}${p ? `, ${DA.bando(p) === 'w' ? 'blanca' : 'negra'}${p === 'W' || p === 'B' ? ' (dama)' : ''}` : ''}`;
      return os ? `<button type="button" class="${cls}" data-i="${i}" aria-label="${lab}">${ficha(p)}</button>` : `<span class="${cls}"></span>`;
    }).join('');
    if (!fin) {
      const obligada = js.length && js[0].caps.length;
      estado.textContent = `Turno de las ${nombre(turno)}${obligada ? ` · captura obligatoria (${js[0].caps.length})` : ''}`;
    }
  }

  function jugar(m) {
    const avance = /[wb]/.test(t[m.de]);
    t = DA.aplicar(t, m);
    sinCambios = m.caps.length || avance ? 0 : sinCambios + 1;
    turno = turno === 'w' ? 'b' : 'w';
    sel = null;
    if (!DA.jugadas(t, turno).length) {
      fin = true;
      estado.textContent = `🏆 Ganan las ${nombre(turno === 'w' ? 'b' : 'w')}`;
    } else if (sinCambios >= 50) {
      fin = true;
      estado.textContent = '🤝 Tablas: 50 jugadas sin capturas ni avances';
    }
    pintar();
    if (!fin && modo !== 'pvp' && turno === 'b') {
      estado.textContent = 'La máquina piensa…';
      temp = setTimeout(() => { if (!vivo) return; const r = DA.jugadaIA(t, modo); if (r) jugar(r); }, 350);
    }
  }

  tabEl.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-i]');
    if (!b || fin || (modo !== 'pvp' && turno === 'b')) return;
    const i = +b.dataset.i;
    const js = DA.jugadas(t, turno);
    const m = sel != null && js.find((x) => x.de === sel && x.a === i);
    if (m) return jugar(m);
    if (js.some((x) => x.de === i)) sel = i;
    else if (DA.bando(t[i]) === turno && js.length && js[0].caps.length) toast('Hay que capturar: elige una pieza que pueda comer');
    else sel = null;
    pintar();
  });

  function nueva() {
    clearTimeout(temp);
    t = DA.inicial(); turno = 'w'; sel = null; fin = false; sinCambios = 0;
    pintar();
  }
  n.querySelectorAll('[data-modo]').forEach((b) => b.addEventListener('click', () => {
    modo = b.dataset.modo;
    n.querySelectorAll('[data-modo]').forEach((x) => x.classList.toggle('ghost', x !== b));
    nueva();
  }));
  n.querySelector('#dam-new').addEventListener('click', nueva);
  nueva();
  n.destruir = () => { vivo = false; clearTimeout(temp); };
  return n;
}

/* ========================================================================
   SUDOKU
   ======================================================================== */
export function sudoku() {
  const n = el(`<div class="card">
    <h3>🔢 Sudoku</h3>
    <div class="btnrow">${Object.entries(SU.NIVELES).map(([k, v]) => `<button class="btn sm ghost" type="button" data-niv="${k}">${v.t}</button>`).join('')}</div>
    <p id="su-estado" class="center" role="status" aria-live="polite"></p>
    <div id="su-tab" class="su" role="grid" aria-label="Sudoku"></div>
    <div class="su-pad" role="group" aria-label="Números">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => `<button type="button" class="btn ghost" data-n="${k}">${k}</button>`).join('')}<button type="button" class="btn ghost" data-n="0" aria-label="Borrar casilla">⌫</button></div>
    <div class="btnrow" style="margin-top:10px">
      <button class="btn ghost sm" id="su-check" type="button">Comprobar</button>
      <button class="btn ghost sm" id="su-pista" type="button">Pista</button>
    </div>
    <p class="muted">Rellena cada fila, columna y cuadro de 3 × 3 con los números del 1 al 9, sin repetir. La partida se guarda sola.</p>
  </div>`);
  const tabEl = n.querySelector('#su-tab'), estado = n.querySelector('#su-estado');
  let p = null, sel = -1, malas = new Set();

  function pintar() {
    if (!p) return;
    const v = sel >= 0 ? p.actual[sel] : 0;
    tabEl.innerHTML = p.actual.map((x, i) => {
      const fija = p.puzle[i] !== 0;
      const f = Math.floor(i / 9), c = i % 9;
      const cls = ['su-c', fija ? 'fija' : '', sel === i ? 'sel' : '', v && x === v ? 'igual' : '', malas.has(i) ? 'mal' : '',
        c % 3 === 2 && c < 8 ? 'bd' : '', f % 3 === 2 && f < 8 ? 'bb' : ''].join(' ');
      return `<button type="button" class="${cls}" data-i="${i}" aria-label="Fila ${f + 1}, columna ${c + 1}: ${x || 'vacía'}${fija ? ' (fija)' : ''}">${x || ''}</button>`;
    }).join('');
  }
  const guardar = () => setKv('sudoku.partida', p);
  function nuevo(nivel) {
    estado.textContent = 'Preparando…';
    setTimeout(() => {
      const g = SU.generar(nivel);
      p = { nivel, puzle: g.puzle, solucion: g.solucion, actual: g.puzle.slice() };
      sel = -1; malas = new Set();
      estado.textContent = `Nivel ${SU.NIVELES[nivel].t.toLowerCase()}`;
      guardar(); pintar();
    }, 20);
  }
  function poner(k) {
    if (!p || sel < 0 || p.puzle[sel]) return;
    p.actual[sel] = k; malas.delete(sel);
    guardar(); pintar();
    if (SU.completo(p.actual, p.solucion)) { estado.textContent = '🏆 ¡Resuelto! Elige un nivel para jugar otro.'; setKv('sudoku.partida', null); }
  }
  tabEl.addEventListener('click', (ev) => { const b = ev.target.closest('[data-i]'); if (b) { sel = +b.dataset.i; pintar(); tabEl.querySelector(`[data-i="${sel}"]`)?.focus(); } });
  tabEl.addEventListener('keydown', (ev) => { if (/^[1-9]$/.test(ev.key)) poner(+ev.key); else if (ev.key === 'Backspace' || ev.key === 'Delete') poner(0); });
  n.querySelector('.su-pad').addEventListener('click', (ev) => { const b = ev.target.closest('[data-n]'); if (b) poner(+b.dataset.n); });
  n.querySelectorAll('[data-niv]').forEach((b) => b.addEventListener('click', () => nuevo(b.dataset.niv)));
  n.querySelector('#su-check').addEventListener('click', () => {
    if (!p) return;
    malas = new Set(SU.errores(p.actual, p.solucion));
    estado.textContent = malas.size ? `Hay ${malas.size} ${malas.size === 1 ? 'casilla' : 'casillas'} mal (en rojo).` : 'De momento, todo bien.';
    pintar();
  });
  n.querySelector('#su-pista').addEventListener('click', () => {
    if (!p) return;
    const vacias = p.actual.map((x, i) => (x !== p.solucion[i] ? i : -1)).filter((i) => i >= 0);
    if (!vacias.length) return;
    const i = sel >= 0 && vacias.includes(sel) ? sel : vacias[Math.floor(Math.random() * vacias.length)];
    sel = i; poner(p.solucion[i]);
  });
  kv('sudoku.partida', null).then((g) => {
    if (g?.puzle?.length === 81 && !SU.completo(g.actual, g.solucion)) { p = g; estado.textContent = `Partida guardada · nivel ${SU.NIVELES[g.nivel]?.t.toLowerCase() || ''}`; pintar(); }
    else nuevo('facil');
  });
  return n;
}

/* ========================================================================
   MOCHILA EN 60 SEGUNDOS
   ======================================================================== */
export function mochila() {
  const n = el(`<div class="card">
    <h3>⏱️ Mochila en 60 segundos</h3>
    <p class="muted">Tienes que salir de casa ya. Tienes un minuto y una mochila de ${MOCHILA_MAX_KG} kg como máximo. ¿Qué te llevas?</p>
    <div id="mo-barra" class="mo-barra" hidden>
      <span id="mo-reloj" class="mo-reloj">60</span>
      <div class="mo-peso"><div class="en-barra"><i id="mo-kg-b" style="width:0%"></i></div><span id="mo-kg">0 kg de ${MOCHILA_MAX_KG} kg</span></div>
    </div>
    <div id="mo-objs" class="mo-objs"></div>
    <div class="btnrow" style="margin-top:10px"><button class="btn" id="mo-go" type="button">▶ Empezar</button><button class="btn ghost" id="mo-fin" type="button" hidden>Ya está, ¡me voy!</button></div>
    <div id="mo-res"></div>
  </div>`);
  const objsEl = n.querySelector('#mo-objs'), go = n.querySelector('#mo-go'), finB = n.querySelector('#mo-fin');
  const reloj = n.querySelector('#mo-reloj'), kgEl = n.querySelector('#mo-kg'), kgB = n.querySelector('#mo-kg-b'), res = n.querySelector('#mo-res');
  let dentro = new Set(), orden = [], quedan = 60, temp = 0, jugando = false;
  const peso = () => [...dentro].reduce((s, id) => s + MOCHILA_OBJETOS.find((o) => o.id === id).kg, 0);

  function pintar() {
    objsEl.innerHTML = orden.map((o) => `<button type="button" class="mo-o" data-id="${o.id}" aria-pressed="${dentro.has(o.id)}"${jugando ? '' : ' disabled'}>
      <span class="ic" aria-hidden="true">${o.ic}</span><span>${esc(o.t)}</span><small>${kg(o.kg)}</small></button>`).join('');
    const w = peso();
    kgEl.textContent = `${kg(Math.round(w * 100) / 100)} de ${MOCHILA_MAX_KG} kg`;
    kgB.style.width = `${Math.min(100, (w / MOCHILA_MAX_KG) * 100)}%`;
  }
  objsEl.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-id]');
    if (!b || !jugando) return;
    const o = MOCHILA_OBJETOS.find((x) => x.id === b.dataset.id);
    if (dentro.has(o.id)) dentro.delete(o.id);
    else if (peso() + o.kg > MOCHILA_MAX_KG + 1e-9) return toast(`No cabe: pasarías de ${MOCHILA_MAX_KG} kg. Quita algo.`);
    else dentro.add(o.id);
    pintar();
  });
  async function terminar() {
    jugando = false; clearInterval(temp);
    finB.hidden = true; go.hidden = false; go.textContent = '↻ Otra vez';
    n.querySelector('#mo-barra').hidden = true;
    const esenciales = MOCHILA_OBJETOS.filter((o) => o.esencial);
    const llevas = esenciales.filter((o) => dentro.has(o.id));
    const faltan = esenciales.filter((o) => !dentro.has(o.id));
    const sobran = MOCHILA_OBJETOS.filter((o) => o.inutil && dentro.has(o.id));
    const nota = Math.max(0, Math.round(((llevas.length - sobran.length) / esenciales.length) * 10));
    const rec = await kv('mochila.record', 0);
    if (nota > rec) setKv('mochila.record', nota);
    pintar();
    res.innerHTML = `<div class="dsp-res">
      <h3>${nota >= 9 ? '🏆' : nota >= 6 ? '👍' : '🎒'} Nota: ${nota} / 10${nota > rec ? ' · ¡récord!' : ''}</h3>
      <p>Llevas ${llevas.length} de ${esenciales.length} cosas esenciales y ${kg(Math.round(peso() * 100) / 100)} a la espalda${quedan > 0 ? `, y te sobraron ${quedan} segundos` : ''}.</p>
      ${faltan.length ? `<h4>Te faltó</h4><ul>${faltan.map((o) => `<li>${o.ic} <b>${esc(o.t)}</b>: ${esc(o.por)}</li>`).join('')}</ul>` : '<p>¡No te has dejado nada esencial!</p>'}
      ${sobran.length ? `<h4>Te sobró</h4><ul>${sobran.map((o) => `<li>${o.ic} <b>${esc(o.t)}</b>: ${esc(o.por)}</li>`).join('')}</ul>` : ''}
      <p><a href="#/sec/equipo">Prepara tu mochila de verdad en «Mochila y equipo» →</a></p>
    </div>`;
  }
  go.addEventListener('click', () => {
    dentro = new Set(); orden = barajar(MOCHILA_OBJETOS); quedan = 60; jugando = true; res.innerHTML = '';
    n.querySelector('#mo-barra').hidden = false; go.hidden = true; finB.hidden = false;
    reloj.textContent = quedan; reloj.classList.remove('poco');
    pintar();
    clearInterval(temp);
    temp = setInterval(() => {
      quedan--; reloj.textContent = quedan;
      reloj.classList.toggle('poco', quedan <= 10);
      if (quedan <= 0) terminar();
    }, 1000);
  });
  finB.addEventListener('click', terminar);
  n.destruir = () => clearInterval(temp);
  return n;
}

/* ========================================================================
   CÓDIGO MORSE
   ======================================================================== */
export function morse() {
  const letras = Object.keys(MO.MORSE).filter((k) => /[A-ZÑ]/.test(k));
  const n = el(`<div class="card">
    <h3>📡 Código Morse</h3>
    <p class="muted">Con sonido o con luz, el Morse sirve para pedir ayuda cuando no hay voz ni cobertura. Empieza por el más importante: <b>SOS</b> = <span class="mono">... --- ...</span> (tres cortos, tres largos, tres cortos).</p>
    <div class="tabs tabs-grid" role="tablist" aria-label="Modos de Morse">
      <button role="tab" type="button" data-m="sos" aria-selected="true">🆘 SOS</button>
      <button role="tab" type="button" data-m="prac" aria-selected="false">🎯 Practicar</button>
      <button role="tab" type="button" data-m="trad" aria-selected="false">🔤 Traductor</button>
      <button role="tab" type="button" data-m="tabla" aria-selected="false">📋 Tabla</button>
    </div>
    <div id="mo-cuerpo"></div>
    <div id="mo-luz" class="mo-luz" hidden aria-hidden="true"></div>
  </div>`);
  const cuerpo = n.querySelector('#mo-cuerpo'), luz = n.querySelector('#mo-luz');
  let audio = null, sonando = 0, parar = null, aciertos = 0, intentos = 0;
  const UNIDAD = 90; // ms

  function tono(on) {
    try {
      // Apagar no necesita contexto (así no se crea fuera de un toque).
      if (!on) { parar?.(); parar = null; return; }
      audio = contextoAudio();
      const o = audio.createOscillator(), g = audio.createGain();
      o.frequency.value = 650; g.gain.value = 0.6;
      o.connect(g).connect(audio.destination); o.start();
      parar = () => { try { o.stop(); } catch {} };
    } catch { /* sin audio: solo luz */ }
  }
  /** Reproduce texto en Morse con sonido y/o luz. Devuelve una promesa. */
  function emitir(texto, { conLuz = false, bucle = false } = {}) {
    const id = ++sonando;
    const sec = MO.secuencia(texto);
    return new Promise((ok) => {
      let k = 0;
      const sig = () => {
        if (id !== sonando) { tono(false); luz.hidden = true; return ok(); }
        if (k >= sec.length) {
          if (bucle) { k = 0; return setTimeout(sig, UNIDAD * 7); }
          tono(false); luz.hidden = true; return ok();
        }
        const [on, d] = sec[k++];
        tono(on); if (conLuz) luz.hidden = !on;
        setTimeout(sig, d * UNIDAD);
      };
      sig();
    });
  }
  const callar = () => { sonando++; tono(false); luz.hidden = true; };

  const VISTAS = {
    sos: () => `<div class="mo-sos">
        <p>Repite SOS una y otra vez. De noche, la <b>luz</b> de la pantalla se ve desde lejos; de día o entre escombros, mejor el <b>sonido</b> (o golpes y silbato: 3 cortos, 3 largos, 3 cortos).</p>
        <div class="btnrow"><button class="btn danger" type="button" data-acc="sos-luz">💡 SOS con luz y sonido</button><button class="btn ghost" type="button" data-acc="sos-son">🔊 Solo sonido</button><button class="btn ghost" type="button" data-acc="callar">⏹ Parar</button></div>
        <p class="muted">Con luz, la pantalla se pone en blanco a pantalla completa. Tócala para parar.</p></div>`,
    prac: () => `<div class="mo-prac"><p class="mono mo-codigo" id="mo-q"></p>
        <div class="btnrow"><button class="btn ghost sm" type="button" data-acc="oir">🔊 Escuchar</button></div>
        <div class="mo-ops" id="mo-ops"></div><p id="mo-res-p" role="status" aria-live="polite"></p></div>`,
    trad: () => `<div><label for="mo-txt">Escribe un mensaje</label><input id="mo-txt" maxlength="60" value="SOS" autocomplete="off">
        <p class="mono mo-codigo" id="mo-out" aria-live="polite"></p>
        <div class="btnrow"><button class="btn ghost sm" type="button" data-acc="emitir">🔊 Escuchar</button><button class="btn ghost sm" type="button" data-acc="emitir-luz">💡 Con luz</button><button class="btn ghost sm" type="button" data-acc="callar">⏹ Parar</button></div></div>`,
    tabla: () => `<div class="mo-tabla">${Object.entries(MO.MORSE).map(([k, v]) => `<button type="button" class="mo-t" data-oir="${k}"><b>${k}</b><span class="mono">${v}</span></button>`).join('')}</div><p class="muted">Toca una letra para oírla. Truco: la E (un punto) y la T (una raya) son las más usadas.</p>`,
  };
  let actual = null;
  function pregunta() {
    actual = letras[Math.floor(Math.random() * letras.length)];
    const ops = barajar([actual, ...barajar(letras.filter((l) => l !== actual)).slice(0, 3)]);
    cuerpo.querySelector('#mo-q').textContent = MO.MORSE[actual];
    cuerpo.querySelector('#mo-ops').innerHTML = ops.map((l) => `<button type="button" class="btn ghost" data-op="${l}">${l}</button>`).join('');
  }
  function mostrar(m) {
    callar();
    n.querySelectorAll('[data-m]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.m === m)));
    cuerpo.innerHTML = VISTAS[m]();
    if (m === 'prac') pregunta();
    if (m === 'trad') { const i = cuerpo.querySelector('#mo-txt'), o = cuerpo.querySelector('#mo-out'); const up = () => { o.textContent = MO.aMorse(i.value) || '—'; }; i.addEventListener('input', up); up(); }
  }
  n.addEventListener('click', (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.m) return mostrar(b.dataset.m);
    if (b.dataset.oir) return emitir(b.dataset.oir);
    const a = b.dataset.acc;
    if (a === 'sos-luz') emitir('SOS', { conLuz: true, bucle: true });
    if (a === 'sos-son') emitir('SOS', { bucle: true });
    if (a === 'callar') callar();
    if (a === 'oir' && actual) emitir(actual);
    if (a === 'emitir' || a === 'emitir-luz') emitir(cuerpo.querySelector('#mo-txt').value, { conLuz: a === 'emitir-luz' });
    if (b.dataset.op) {
      intentos++;
      const bien = b.dataset.op === actual;
      if (bien) aciertos++;
      cuerpo.querySelector('#mo-res-p').textContent = `${bien ? '✅ ¡Bien!' : `❌ Era la ${actual}`} · ${aciertos} de ${intentos}`;
      pregunta();
    }
  });
  luz.addEventListener('click', callar);
  mostrar('sos');
  n.destruir = callar;
  return n;
}

/* ========================================================================
   JUEGOS SIN PANTALLA (fichas)
   ======================================================================== */
export function sinPantalla() {
  return el(`<div>
    <div class="blk-note">${esc(SIN_PANTALLA_AVISO)}</div>
    ${SIN_PANTALLA.map((g) => `<section class="sp-grupo">
      <h3><span aria-hidden="true">${g.ic}</span> ${esc(g.t)}</h3>
      ${g.nota ? `<p class="muted">${esc(g.nota)}</p>` : ''}
      ${g.juegos.map((j) => `<details class="plegable sp-juego"><summary><b>${esc(j.t)}</b> <span class="muted">· ${esc(j.jug)} · ${esc(j.dur)}</span></summary>
        <div><ol>${j.pasos.map((p) => `<li>${esc(p)}</li>`).join('')}</ol></div></details>`).join('')}
    </section>`).join('')}
  </div>`);
}
