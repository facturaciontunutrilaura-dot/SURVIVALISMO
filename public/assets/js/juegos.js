/* =========================================================================
   juegos.js — Juegos offline y Modo Calma (sección PSICOLOGÍA)
   Todo funciona sin conexión. Las estadísticas se guardan en IndexedDB.
   ========================================================================= */
import { el, esc, toast, alSalir } from './ui.js';
import * as store from './store.js';
import { MEMORY_CARTAS, QUIZ, QUIZ_CATEGORIAS, DIFICULTAD, RESPIRACIONES, GROUNDING, CALMA_AVISO } from '../../data/content/juegos.js';

const kv = async (id, def) => (await store.get('kv', id))?.v ?? def;
const setKv = (id, v) => store.put('kv', { id, v });

/* ========================================================================
   1 · TRES EN RAYA
   ======================================================================== */
export function tresEnRaya() {
  const n = el(`<div class="card">
    <h3>❌⭕ Tres en raya</h3>
    <div class="btnrow">
      <button class="btn sm" data-modo="pvp" type="button">2 jugadores</button>
      <button class="btn sm ghost" data-modo="facil" type="button">vs IA fácil</button>
      <button class="btn sm ghost" data-modo="dificil" type="button">vs IA difícil</button>
    </div>
    <div id="ttt-turno" class="center" style="font-family:var(--ff);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px"></div>
    <div id="ttt-board" class="ttt"></div>
    <div class="btnrow" style="margin-top:10px">
      <button class="btn ghost sm" id="ttt-new" type="button">Nueva partida</button>
      <button class="btn ghost sm" id="ttt-reset" type="button">Borrar estadísticas</button>
    </div>
    <div id="ttt-stats" class="muted"></div>
  </div>`);

  let tab, turno, fin, modo = 'pvp';
  const board = n.querySelector('#ttt-board');
  const turnoEl = n.querySelector('#ttt-turno');

  const LINEAS = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  const ganador = (t) => {
    for (const [a, b, c] of LINEAS) if (t[a] && t[a] === t[b] && t[b] === t[c]) return { s: t[a], l: [a, b, c] };
    return t.every(Boolean) ? { s: 'empate', l: [] } : null;
  };

  /* Minimax con poda: la IA "difícil" es imbatible; la "fácil" falla a propósito. */
  function minimax(t, jug, prof = 0, alfa = -Infinity, beta = Infinity) {
    const g = ganador(t);
    if (g) return g.s === 'O' ? 10 - prof : g.s === 'X' ? prof - 10 : 0;
    let mejor = jug === 'O' ? -Infinity : Infinity;
    for (let i = 0; i < 9; i++) {
      if (t[i]) continue;
      t[i] = jug;
      const v = minimax(t, jug === 'O' ? 'X' : 'O', prof + 1, alfa, beta);
      t[i] = '';
      if (jug === 'O') { mejor = Math.max(mejor, v); alfa = Math.max(alfa, v); }
      else { mejor = Math.min(mejor, v); beta = Math.min(beta, v); }
      if (beta <= alfa) break;
    }
    return mejor;
  }

  function jugadaIA() {
    const libres = tab.map((v, i) => (v ? null : i)).filter((v) => v !== null);
    if (!libres.length) return;
    if (modo === 'facil' && Math.random() < 0.45) return libres[Math.floor(Math.random() * libres.length)];
    let mejor = -Infinity, jugada = libres[0];
    for (const i of libres) {
      tab[i] = 'O';
      const v = minimax(tab, 'X', 0);
      tab[i] = '';
      if (v > mejor) { mejor = v; jugada = i; }
    }
    return jugada;
  }

  async function stats(add) {
    const s = await kv('ttt.stats', { partidas: 0, x: 0, o: 0, empates: 0 });
    if (add) { Object.keys(add).forEach((k) => { s[k] = (s[k] || 0) + add[k]; }); await setKv('ttt.stats', s); }
    n.querySelector('#ttt-stats').innerHTML =
      `Partidas: <b>${s.partidas}</b> · Gana ❌: <b>${s.x}</b> · Gana ⭕: <b>${s.o}</b> · Empates: <b>${s.empates}</b>`;
    return s;
  }

  function pinta(res) {
    board.innerHTML = tab.map((v, i) =>
      `<button class="ttt-c${res && res.l.includes(i) ? ' win' : ''}" data-i="${i}" ${v || fin ? 'disabled' : ''}>${v === 'X' ? '❌' : v === 'O' ? '⭕' : ''}</button>`
    ).join('');
    board.querySelectorAll('[data-i]').forEach((b) => b.addEventListener('click', () => juega(+b.dataset.i)));
    turnoEl.textContent = fin
      ? (res.s === 'empate' ? '🤝 Empate' : `Gana ${res.s === 'X' ? '❌' : '⭕'}`)
      : `Turno de ${turno === 'X' ? '❌' : '⭕'}${modo !== 'pvp' && turno === 'O' ? ' (IA)' : ''}`;
  }

  async function juega(i) {
    if (fin || tab[i]) return;
    tab[i] = turno;
    let res = ganador(tab);
    if (res) return terminar(res);
    turno = turno === 'X' ? 'O' : 'X';
    pinta();
    if (modo !== 'pvp' && turno === 'O') {
      await new Promise((r) => setTimeout(r, 280));
      const j = jugadaIA();
      if (j != null) {
        tab[j] = 'O';
        res = ganador(tab);
        if (res) return terminar(res);
        turno = 'X';
      }
      pinta();
    }
  }

  async function terminar(res) {
    fin = true;
    pinta(res);
    await stats(res.s === 'empate' ? { partidas: 1, empates: 1 } : { partidas: 1, [res.s.toLowerCase()]: 1 });
  }

  function nueva() {
    tab = Array(9).fill(''); turno = 'X'; fin = false;
    pinta();
  }

  n.querySelectorAll('[data-modo]').forEach((b) => b.addEventListener('click', () => {
    modo = b.dataset.modo;
    n.querySelectorAll('[data-modo]').forEach((x) => x.classList.toggle('ghost', x !== b));
    nueva();
  }));
  n.querySelector('#ttt-new').addEventListener('click', nueva);
  n.querySelector('#ttt-reset').addEventListener('click', async () => {
    await setKv('ttt.stats', { partidas: 0, x: 0, o: 0, empates: 0 });
    stats(); toast('Estadísticas borradas');
  });

  nueva(); stats();
  return n;
}

/* ========================================================================
   2 · MEMORY
   ======================================================================== */
export function memory() {
  const n = el(`<div class="card">
    <h3>🃏 Memory de supervivencia</h3>
    <div class="btnrow">
      <button class="btn sm" data-pares="6" type="button">6 parejas</button>
      <button class="btn sm ghost" data-pares="8" type="button">8 parejas</button>
      <button class="btn sm ghost" data-pares="12" type="button">12 parejas</button>
    </div>
    <label>Jugadores</label>
    <div class="btnrow">
      <button class="btn sm ghost" data-j="1" type="button">1 jugador</button>
      <button class="btn sm" data-j="2" type="button">2 jugadores</button>
    </div>
    <div id="mem-marc" class="kv"></div>
    <div id="mem-board" class="mem"></div>
    <div class="btnrow" style="margin-top:10px"><button class="btn ghost sm" id="mem-new" type="button">Nueva partida</button></div>
    <div id="mem-fin"></div>
  </div>`);

  let pares = 8, jugadores = 2, mazo = [], abiertas = [], turno = 0, puntos = [0, 0], bloqueo = false, encontradas = 0;
  const board = n.querySelector('#mem-board');

  function nueva() {
    const sel = [...MEMORY_CARTAS].sort(() => Math.random() - 0.5).slice(0, pares);
    mazo = [...sel, ...sel].map((c, i) => ({ ...c, id: i, vista: false, hecha: false }))
      .sort(() => Math.random() - 0.5);
    abiertas = []; turno = 0; puntos = [0, 0]; encontradas = 0; bloqueo = false;
    n.querySelector('#mem-fin').innerHTML = '';
    pinta();
  }

  function marcador() {
    n.querySelector('#mem-marc').innerHTML = jugadores === 2
      ? `<div>Jugador 1${turno === 0 ? ' ◀' : ''}</div><div><b>${puntos[0]}</b></div>
         <div>Jugador 2${turno === 1 ? ' ◀' : ''}</div><div><b>${puntos[1]}</b></div>
         <div>Parejas</div><div>${encontradas} de ${pares}</div>`
      : `<div>Parejas encontradas</div><div><b>${encontradas} de ${pares}</b></div>
         <div>Intentos</div><div>${puntos[0]}</div>`;
  }

  function pinta() {
    board.style.setProperty('--cols', pares > 8 ? 4 : pares > 6 ? 4 : 3);
    board.innerHTML = mazo.map((c, i) =>
      `<button class="mem-c${c.vista || c.hecha ? ' up' : ''}${c.hecha ? ' done' : ''}" data-i="${i}" aria-label="${esc(c.vista || c.hecha ? c.t : 'Carta oculta')}">
        <span>${c.vista || c.hecha ? c.ic : '❓'}</span>
        <small>${c.vista || c.hecha ? esc(c.t) : ''}</small>
      </button>`).join('');
    board.querySelectorAll('[data-i]').forEach((b) => b.addEventListener('click', () => voltea(+b.dataset.i)));
    marcador();
  }

  function voltea(i) {
    if (bloqueo) return;
    const c = mazo[i];
    if (c.vista || c.hecha) return;
    c.vista = true;
    abiertas.push(i);
    pinta();
    if (abiertas.length < 2) return;
    bloqueo = true;
    const [a, b] = abiertas;
    if (mazo[a].t === mazo[b].t) {
      setTimeout(() => {
        mazo[a].hecha = mazo[b].hecha = true;
        encontradas++;
        if (jugadores === 2) puntos[turno]++; else puntos[0]++;
        abiertas = []; bloqueo = false;
        pinta();
        if (encontradas === pares) fin();
      }, 420);
    } else {
      if (jugadores === 1) puntos[0]++;
      setTimeout(() => {
        mazo[a].vista = mazo[b].vista = false;
        abiertas = []; bloqueo = false;
        if (jugadores === 2) turno = turno === 0 ? 1 : 0;
        pinta();
      }, 950);
    }
  }

  async function fin() {
    let txt;
    if (jugadores === 2) {
      txt = puntos[0] === puntos[1] ? '🤝 Empate' : `🏆 Gana el jugador ${puntos[0] > puntos[1] ? 1 : 2} (${Math.max(...puntos)}–${Math.min(...puntos)})`;
    } else {
      const best = await kv('mem.best', {});
      const k = String(pares);
      const nuevo = !best[k] || puntos[0] < best[k];
      if (nuevo) { best[k] = puntos[0]; await setKv('mem.best', best); }
      txt = `Completado en <b>${puntos[0]}</b> intentos.${nuevo ? ' 🏅 ¡Nuevo récord!' : ` Tu récord: ${best[k]}.`}`;
    }
    n.querySelector('#mem-fin').innerHTML = `<div class="blk-ok">${txt}</div>`;
  }

  n.querySelectorAll('[data-pares]').forEach((b) => b.addEventListener('click', () => {
    pares = +b.dataset.pares;
    n.querySelectorAll('[data-pares]').forEach((x) => x.classList.toggle('ghost', x !== b));
    nueva();
  }));
  n.querySelectorAll('[data-j]').forEach((b) => b.addEventListener('click', () => {
    jugadores = +b.dataset.j;
    n.querySelectorAll('[data-j]').forEach((x) => x.classList.toggle('ghost', x !== b));
    nueva();
  }));
  n.querySelector('#mem-new').addEventListener('click', nueva);

  nueva();
  return n;
}

/* ========================================================================
   3 · RETO DE SUPERVIVENCIA
   ======================================================================== */
export function reto() {
  const cats = Object.entries(QUIZ_CATEGORIAS);
  const n = el(`<div class="card">
    <h3>🎯 Reto de supervivencia</h3>
    <p class="muted">${QUIZ.length} preguntas. Todas las respuestas correctas son coherentes con el manual de la aplicación, y cada una lleva su explicación.</p>
    <label>Categoría</label>
    <select id="rt-cat"><option value="">Todas</option>${cats.map(([k, v]) => `<option value="${k}">${v.ic} ${esc(v.t)}</option>`).join('')}</select>
    <label>Número de preguntas</label>
    <select id="rt-num"><option>5</option><option selected>10</option><option>20</option><option value="0">Todas</option></select>
    <button class="btn wide" id="rt-go" type="button" style="margin-top:10px">Empezar</button>
    <div id="rt-stats" class="muted" style="margin-top:8px"></div>
    <div id="rt-play"></div>
  </div>`);

  const play = n.querySelector('#rt-play');

  async function pintaStats() {
    const s = await kv('quiz.stats', { jugadas: 0, aciertos: 0, total: 0, mejor: 0 });
    n.querySelector('#rt-stats').innerHTML = s.jugadas
      ? `Partidas: <b>${s.jugadas}</b> · Aciertos: <b>${s.aciertos}/${s.total}</b> (${Math.round((s.aciertos / s.total) * 100)} %) · Mejor: <b>${s.mejor} %</b>`
      : 'Sin partidas todavía.';
  }

  n.querySelector('#rt-go').addEventListener('click', () => {
    const cat = n.querySelector('#rt-cat').value;
    const num = +n.querySelector('#rt-num').value;
    let pool = cat ? QUIZ.filter((q) => q.c === cat) : [...QUIZ];
    pool = pool.sort(() => Math.random() - 0.5);
    if (num > 0) pool = pool.slice(0, num);
    if (!pool.length) return toast('No hay preguntas en esa categoría');
    let i = 0, aciertos = 0;

    function pinta() {
      if (i >= pool.length) return fin();
      const q = pool[i];
      const c = QUIZ_CATEGORIAS[q.c];
      play.innerHTML = `
        <div class="progress"><i style="width:${(i / pool.length) * 100}%"></i></div>
        <div class="muted">Pregunta ${i + 1} de ${pool.length} · ${c.ic} ${esc(c.t)} · <span class="badge">${esc(DIFICULTAD[q.d])}</span></div>
        <p style="font-size:1.05rem;margin-top:8px"><b>${esc(q.q)}</b></p>
        <div id="rt-op">${q.o.map((o, j) => `<button class="btn ghost quiz-opt" data-o="${j}" type="button">${String.fromCharCode(65 + j)}. ${esc(o)}</button>`).join('')}</div>
        <div id="rt-exp"></div>`;
      play.querySelectorAll('.quiz-opt').forEach((b) => b.addEventListener('click', () => {
        const j = +b.dataset.o;
        const ok = j === q.r;
        if (ok) aciertos++;
        play.querySelectorAll('.quiz-opt').forEach((x) => { x.disabled = true; });
        b.classList.add(ok ? 'right' : 'wrong');
        if (!ok) play.querySelector(`[data-o="${q.r}"]`).classList.add('right');
        play.querySelector('#rt-exp').innerHTML =
          `<div class="blk-${ok ? 'ok' : 'warn'}">${ok ? '✔ Correcto. ' : '✘ Respuesta correcta: ' + String.fromCharCode(65 + q.r) + '. '}${esc(q.e)}</div>
           <button class="btn wide" id="rt-next" type="button">${i + 1 < pool.length ? 'Siguiente' : 'Ver resultado'}</button>`;
        play.querySelector('#rt-next').addEventListener('click', () => { i++; pinta(); });
      }));
    }

    async function fin() {
      const pct = Math.round((aciertos / pool.length) * 100);
      const s = await kv('quiz.stats', { jugadas: 0, aciertos: 0, total: 0, mejor: 0 });
      s.jugadas++; s.aciertos += aciertos; s.total += pool.length; s.mejor = Math.max(s.mejor, pct);
      await setKv('quiz.stats', s);
      await pintaStats();
      play.innerHTML = `<div class="qcard"><h4>RESULTADO</h4><ol>
        <li>Aciertos: <b>${aciertos} de ${pool.length}</b> (${pct} %)</li>
        <li>${pct >= 80 ? 'Excelente. Repasa solo lo que hayas fallado.' : pct >= 60 ? 'Bien. Vuelve a las secciones de las preguntas falladas.' : 'Conviene repasar el manual: empieza por 🎓 Formación.'}</li>
      </ol></div>
      <div class="btnrow"><button class="btn" id="rt-again" type="button">Jugar otra vez</button>
      <a class="btn ghost" href="#/sec/cursos">Ir a Formación</a></div>`;
      play.querySelector('#rt-again').addEventListener('click', () => { play.innerHTML = ''; });
    }

    pinta();
    play.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  pintaStats();
  return n;
}

/* ========================================================================
   4 · MODO CALMA
   ======================================================================== */
export function modoCalma() {
  const n = el(`<div>
    <div class="card">
      <h3>🧘 Respiración guiada</h3>
      <label>Ejercicio</label>
      <select id="ca-sel">${RESPIRACIONES.map((r) => `<option value="${r.id}">${esc(r.t)}</option>`).join('')}</select>
      <p class="muted" id="ca-desc"></p>
      <div class="breath"><div class="breath-ring" id="ca-ring"></div>
        <div class="breath-txt"><b id="ca-fase">LISTO</b><span id="ca-num"></span></div></div>
      <div class="center muted" id="ca-ciclo"></div>
      <div class="btnrow" style="margin-top:10px">
        <button class="btn" id="ca-start" type="button">Empezar</button>
        <button class="btn ghost" id="ca-stop" type="button">Parar</button>
      </div>
      <div class="muted">Si en algún momento te mareas o te resulta incómodo, para y respira con normalidad.</div>
    </div>

    <div class="card">
      <h3>🪨 Grounding y ejercicios</h3>
      <div id="ca-gr"></div>
    </div>

    <div class="card"><div class="blk-note">${esc(CALMA_AVISO)}</div>
      <div class="btnrow"><a class="btn ghost sm" href="tel:024">📞 024 · Conducta suicida</a>
      <a class="btn ghost sm" href="tel:112">📞 112 · Emergencias</a></div>
    </div>
  </div>`);

  const sel = n.querySelector('#ca-sel');
  const ring = n.querySelector('#ca-ring');
  const faseEl = n.querySelector('#ca-fase');
  const numEl = n.querySelector('#ca-num');
  const cicloEl = n.querySelector('#ca-ciclo');
  let timer = null, wake = null;
  /* Cada pulsación de «Empezar» abre una sesión nueva; parar() la invalida.
     Pedir el wake lock es asíncrono: si mientras tanto se para o se sale de
     la pantalla, la sesión ya no es la vigente y no debe arrancar nada. */
  let sesion = 0;

  const desc = () => {
    const r = RESPIRACIONES.find((x) => x.id === sel.value);
    n.querySelector('#ca-desc').textContent = r.desc;
  };
  sel.addEventListener('change', () => { parar(); desc(); });
  desc();

  function parar() {
    sesion++;
    clearInterval(timer); timer = null;
    ring.style.transition = 'none';
    ring.style.transform = 'scale(0.55)';
    faseEl.textContent = 'LISTO'; numEl.textContent = ''; cicloEl.textContent = '';
    if (wake) { wake.release?.().catch(() => {}); wake = null; }
  }

  n.querySelector('#ca-stop').addEventListener('click', parar);

  n.querySelector('#ca-start').addEventListener('click', async () => {
    parar();
    const mia = sesion;
    const r = RESPIRACIONES.find((x) => x.id === sel.value);
    let lock = null;
    try { lock = await navigator.wakeLock?.request('screen'); } catch { /* opcional */ }
    if (mia !== sesion) { lock?.release?.().catch(() => {}); return; }
    wake = lock;
    let ciclo = 0, fase = 0, seg = 0;

    const aplica = () => {
      const [nombre, dur] = r.fases[fase];
      faseEl.textContent = nombre;
      numEl.textContent = `${dur - seg} s`;
      cicloEl.textContent = `Ciclo ${ciclo + 1} de ${r.ciclos}`;
      if (seg === 0) {
        const escala = nombre === 'INSPIRA' ? 1 : nombre === 'ESPIRA' ? 0.55 : null;
        if (escala !== null) {
          ring.style.transition = `transform ${dur}s linear`;
          ring.style.transform = `scale(${escala})`;
        } else {
          ring.style.transition = 'none';
        }
      }
    };

    aplica();
    timer = setInterval(() => {
      seg++;
      const [, dur] = r.fases[fase];
      if (seg >= dur) {
        seg = 0; fase++;
        if (fase >= r.fases.length) {
          fase = 0; ciclo++;
          if (ciclo >= r.ciclos) {
            parar();
            faseEl.textContent = 'HECHO';
            numEl.textContent = '✔';
            return;
          }
        }
      }
      aplica();
    }, 1000);
  });

  // Al cambiar de pestaña o de pantalla se para el temporizador y se libera
  // el wake lock: si no, seguirían activos en segundo plano.
  n.destruir = parar;

  n.querySelector('#ca-gr').innerHTML = GROUNDING.map((g) => `
    <details><summary>${esc(g.t)}</summary><div>
      <p class="muted">${esc(g.desc)}</p>
      <ol class="steps">${g.pasos.map((p) => `<li>${esc(p)}</li>`).join('')}</ol>
    </div></details>`).join('');

  return n;
}

/* --------------------------- Vista de la sección --------------------------- */
export function juegosView(inicial) {
  const n = el(`<div>
    <div class="tabs tabs-grid" role="tablist" id="jg-tabs" aria-label="Juegos y modo calma">
      <button role="tab" data-t="ttt" aria-selected="true">Tres en raya</button>
      <button role="tab" data-t="mem" aria-selected="false">Memory</button>
      <button role="tab" data-t="ret" aria-selected="false">Reto</button>
      <button role="tab" data-t="cal" aria-selected="false">🧘 Modo calma</button>
    </div>
    <div id="jg-body"></div>
    <details class="card jg-info"><summary>¿Para qué sirven los juegos?</summary><div>
      <p>Los juegos no son solo entretenimiento. En un aislamiento prolongado, y muy especialmente con niños o adolescentes, tener actividades sencillas que ocupen la atención reduce el estrés, el aburrimiento y la tensión del grupo. Todo funciona sin conexión y sin gastar apenas batería.</p>
    </div></details>
  </div>`);

  const body = n.querySelector('#jg-body');
  const vistas = { ttt: tresEnRaya, mem: memory, ret: reto, cal: modoCalma };
  const destruir = () => body.firstElementChild?.destruir?.();
  const pinta = (t) => {
    destruir();
    body.replaceChildren(vistas[t]());
    n.querySelectorAll('#jg-tabs button').forEach((x) => x.setAttribute('aria-selected', String(x.dataset.t === t)));
  };
  n.querySelectorAll('#jg-tabs button').forEach((b) => b.addEventListener('click', () => pinta(b.dataset.t)));
  alSalir(destruir);
  // '#/sec/juegos/calma' abre directamente el modo calma.
  pinta({ calma: 'cal', memory: 'mem', reto: 'ret' }[inicial] || 'ttt');
  return n;
}
