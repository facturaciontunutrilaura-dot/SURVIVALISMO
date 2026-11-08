/* =========================================================================
   volver.js — VOLVER A CASA
   · «Estoy perdido»: dónde estás (coordenadas para dar al 112), hacia dónde
     queda casa con una flecha, a qué distancia y cuánto se tarda andando, y
     la batería que queda.
   · «Mis rutas»: grabar con el GPS el camino del trabajo o del colegio a
     casa, marcar por el camino fuentes y refugios, y verlo sin conexión.
   Todo se guarda SOLO en este móvil: casa y los puntos en 'puntos' (los
   mismos del Mapa) y las rutas en 'geo' (se ven como capas en el Mapa).
   La posición solo se lee cuando el usuario lo pide o mientras graba.
   ========================================================================= */
import { el, esc, toast, alSalir } from './ui.js';
import * as store from './store.js';
import * as V from './volver-core.js';

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const HAY_GPS = typeof navigator !== 'undefined' && 'geolocation' in navigator;

function posicion(opc = {}) {
  return new Promise((ok, mal) => {
    if (!HAY_GPS) return mal(new Error('Este navegador no tiene GPS.'));
    navigator.geolocation.getCurrentPosition(
      (p) => ok({ lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy, ts: p.timestamp }),
      (e) => mal(new Error(e.code === 1 ? 'Has denegado el permiso de ubicación. Actívalo en los ajustes del navegador para esta app.' : 'No se ha podido obtener la posición. Sal a un sitio despejado y vuelve a intentarlo.')),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 30000, ...opc });
  });
}

async function casaGuardada() {
  const pts = await store.all('puntos').catch(() => []);
  return pts.filter((p) => p.tipo === 'casa' && Number.isFinite(p.lat)).sort((a, b) => (b.ts || 0) - (a.ts || 0))[0] || null;
}

/* ------------------------------ Estoy perdido ------------------------------ */
async function perdido() {
  let casa = await casaGuardada();
  let yo = null, heading = null, brujula = false;
  const n = el(`<div class="vc">
    <p class="muted">Pulsa el botón para saber dónde estás. La posición se lee solo cuando lo pides, para gastar poca batería, y no sale del móvil.</p>
    <button type="button" class="btn wide" id="vc-donde">📡 ¿Dónde estoy?</button>
    <p id="vc-est" class="muted" role="status" aria-live="polite"></p>
    <div id="vc-pos"></div>
    <div id="vc-casa"></div>
    <div id="vc-bat" class="card vc-bat"></div>
    <div class="blk-note">Si estás en peligro o herido, llama al <a href="tel:112">112</a> y dicta tus coordenadas. Si te quedas sin batería, quédate en un sitio visible y seguro.</div>
  </div>`);
  const $ = (s) => n.querySelector(s);

  function pintarCasa() {
    const c = $('#vc-casa');
    if (!casa) {
      c.innerHTML = `<div class="card"><h3>🏠 Tu casa</h3><p>Todavía no has guardado dónde está tu casa.</p>
        <button type="button" class="btn sm" id="vc-guardar-casa" ${yo ? '' : 'disabled'}>🏠 Estoy en casa: guardar este sitio</button>
        <p class="muted">${yo ? 'Úsalo solo si ahora mismo estás en casa.' : 'Primero pulsa «¿Dónde estoy?» estando en casa.'} También puedes marcarla en el <a href="#/mapa">Mapa</a> (punto de tipo «Casa»).</p></div>`;
      return;
    }
    if (!yo) { c.innerHTML = `<div class="card"><h3>🏠 Volver a casa</h3><p>Pulsa «¿Dónde estoy?» para ver hacia dónde queda <b>${esc(casa.nombre || 'casa')}</b>.</p></div>`; return; }
    const m = V.metros(yo, casa), r = V.rumbo(yo, casa);
    const giro = heading == null ? r : (r - heading + 360) % 360;
    c.innerHTML = `<div class="card vc-flecha-card"><h3>🏠 Volver a ${esc(casa.nombre || 'casa')}</h3>
      ${m < 50 ? '<p class="dp-grande">✅ Estás en casa o muy cerca.</p>' : `
      <div class="vc-flecha" style="transform: rotate(${giro.toFixed(0)}deg)" aria-hidden="true">⬆</div>
      <p class="dp-grande"><b>${V.distanciaTexto(m)}</b> hacia el <b>${V.haciaDonde(r)}</b> (${Math.round(r)}°)</p>
      <p>Andando, unos <b>${V.tiempoAndando(m)}</b> en línea recta. Por calles o caminos, cuenta bastante más.</p>
      <p class="muted">${heading == null ? 'Ahora la flecha está dibujada con el norte hacia arriba de la pantalla. Activa la brújula para que apunte de verdad hacia casa.' : 'La flecha apunta hacia casa. Sujeta el móvil en horizontal, lejos de metales.'}</p>
      ${brujula ? '' : '<button type="button" class="btn sm ghost" id="vc-brujula">🧭 Activar la brújula</button>'}`}
    </div>`;
  }

  async function pintarBateria() {
    const b = $('#vc-bat');
    try {
      if (!navigator.getBattery) throw new Error();
      const bat = await navigator.getBattery();
      const h = V.horasBateria(bat.level, bat.charging);
      b.innerHTML = `<h3>🔋 Batería: ${Math.round(bat.level * 100)} %</h3><p>${bat.charging ? 'Cargando.' : `Usando el GPS y la pantalla, unas <b>${String(h).replace('.', ',')} h</b> (aproximado).`} Para que dure más: <a href="#/sec/herramientas/bateria">ahorro máximo</a>.</p>`;
    } catch {
      b.innerHTML = '<h3>🔋 Batería</h3><p>Este móvil no deja que las apps web lean la batería (pasa en iPhone): mírala arriba en la pantalla. Para que dure más: <a href="#/sec/herramientas/bateria">ahorro máximo</a>.</p>';
    }
  }

  async function donde() {
    $('#vc-est').textContent = 'Buscando tu posición…';
    $('#vc-donde').disabled = true;
    try {
      yo = await posicion();
      $('#vc-est').textContent = `Posición de las ${new Date(yo.ts).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} · precisión de unos ${Math.round(yo.acc)} m`;
      const txt = V.coordenadasTexto(yo);
      $('#vc-pos').innerHTML = `<div class="card"><h3>📍 Estás aquí</h3>
        <p class="vc-coord">${esc(txt)}</p><p class="muted">${esc(V.gms(yo.lat, yo.lon))}</p>
        <div class="btnrow"><button type="button" class="btn sm ghost" id="vc-copiar">📋 Copiar</button>
        <a class="btn sm ghost" href="sms:?&body=${encodeURIComponent(`Estoy aquí: ${txt} https://www.openstreetmap.org/?mlat=${yo.lat.toFixed(5)}&mlon=${yo.lon.toFixed(5)}#map=16/${yo.lat.toFixed(5)}/${yo.lon.toFixed(5)}`)}">💬 Enviar por SMS</a></div>
        <p class="muted">Al 112 díctale primero la latitud y después la longitud, con sus decimales.</p></div>`;
    } catch (e) { $('#vc-est').textContent = e.message; }
    $('#vc-donde').disabled = false;
    pintarCasa();
  }

  /* Brújula: mismo criterio que compass.js (solo rumbos referidos al norte). */
  let absoluto = false;
  const aplicar = (h) => { heading = h; pintarFlecha(); };
  const pintarFlecha = () => {
    const f = n.querySelector('.vc-flecha');
    if (f && yo && casa) f.style.transform = `rotate(${((V.rumbo(yo, casa) - heading + 360) % 360).toFixed(0)}deg)`;
  };
  const onAbs = (e) => { if (typeof e.alpha === 'number') { absoluto = true; aplicar(360 - e.alpha); } };
  const onOri = (e) => {
    if (typeof e.webkitCompassHeading === 'number' && !Number.isNaN(e.webkitCompassHeading)) return aplicar(e.webkitCompassHeading);
    if (!absoluto && e.absolute === true && typeof e.alpha === 'number') aplicar(360 - e.alpha);
  };
  async function activarBrujula() {
    try {
      const DOE = window.DeviceOrientationEvent;
      if (DOE && typeof DOE.requestPermission === 'function' && (await DOE.requestPermission()) !== 'granted') throw new Error();
      window.addEventListener('deviceorientationabsolute', onAbs, true);
      window.addEventListener('deviceorientation', onOri, true);
      brujula = true; pintarCasa();
      setTimeout(() => { if (heading == null && n.isConnected) toast('Este móvil no da la orientación: usa la flecha con el norte arriba y la brújula de Orientación.'); }, 3000);
    } catch { toast('No se ha podido activar la brújula'); }
  }
  alSalir(() => { window.removeEventListener('deviceorientationabsolute', onAbs, true); window.removeEventListener('deviceorientation', onOri, true); });

  n.addEventListener('click', async (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.id === 'vc-donde') return donde();
    if (b.id === 'vc-brujula') return activarBrujula();
    if (b.id === 'vc-copiar') {
      try { await navigator.clipboard.writeText(V.coordenadasTexto(yo)); toast('Coordenadas copiadas'); } catch { toast(V.coordenadasTexto(yo)); }
      return;
    }
    if (b.id === 'vc-guardar-casa' && yo) {
      if (!confirm('¿Guardar tu posición actual como «Casa»? Hazlo solo si estás en casa.')) return;
      casa = { id: uid(), nombre: 'Casa', tipo: 'casa', lat: Number(yo.lat.toFixed(6)), lon: Number(yo.lon.toFixed(6)), nota: 'Guardada desde Volver a casa', ts: Date.now() };
      await store.put('puntos', casa);
      toast('Casa guardada (también aparece en el Mapa)');
      pintarCasa();
    }
  });
  pintarCasa();
  pintarBateria();
  return n;
}

/* ------------------------------- Mis rutas ------------------------------- */
async function rutas() {
  let grabando = null; // { watch, pts, inicio, lock }
  const n = el(`<div class="vc">
    <p class="muted">Graba una vez, andando, el camino de vuelta a casa desde el trabajo, el colegio de los niños o casa de la familia. Después podrás seguirlo <b>sin internet</b> en el <a href="#/mapa">Mapa</a>. Para ver también el fondo del mapa sin conexión, descarga antes esa zona en el Mapa.</p>
    <section class="card" aria-labelledby="vr-gt">
      <h3 id="vr-gt">⏺ Grabar una ruta</h3>
      <label for="vr-nom">Nombre de la ruta</label>
      <input id="vr-nom" type="text" maxlength="40" placeholder="Ej.: Del trabajo a casa">
      <div id="vr-ctl"></div>
      <p id="vr-est" class="muted" role="status" aria-live="polite"></p>
    </section>
    <section class="card" aria-labelledby="vr-lt"><h3 id="vr-lt">🛤 Mis rutas</h3><div id="vr-lista"></div></section>
    <div class="blk-note">Mientras grabas, deja la pantalla encendida con esta página abierta: si la bloqueas, el móvil puede dejar de leer el GPS. Grabar gasta batería; hazlo con el móvil cargado.</div>
  </div>`);
  const $ = (s) => n.querySelector(s);

  function controles() {
    $('#vr-ctl').innerHTML = grabando
      ? `<div class="btnrow"><button type="button" class="btn sm ghost" data-marcar="agua">💧 Hay agua aquí</button><button type="button" class="btn sm ghost" data-marcar="refugio">🏕 Refugio aquí</button></div>
         <button type="button" class="btn wide" id="vr-fin">⏹ Terminar y guardar</button>`
      : `<button type="button" class="btn wide" id="vr-ini" ${HAY_GPS ? '' : 'disabled'}>⏺ Empezar a grabar</button>`;
  }
  function estadoGrabando() {
    if (!grabando) return;
    const m = V.longitud(grabando.pts);
    $('#vr-est').textContent = `Grabando… ${V.distanciaTexto(m)} · ${grabando.pts.length} puntos · ${Math.round((Date.now() - grabando.inicio) / 60000)} min`;
  }
  async function empezar() {
    const pts = [];
    grabando = { pts, inicio: Date.now(), ultimo: null };
    try { grabando.lock = await navigator.wakeLock?.request('screen'); } catch { /* opcional */ }
    grabando.watch = navigator.geolocation.watchPosition((p) => {
      const q = { lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy };
      grabando.ultimo = q;
      if (V.aceptarPunto(pts[pts.length - 1], q)) pts.push({ lat: q.lat, lon: q.lon });
      estadoGrabando();
    }, (e) => { $('#vr-est').textContent = e.code === 1 ? 'Has denegado el permiso de ubicación.' : 'Esperando señal GPS…'; }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 });
    controles();
    $('#vr-est').textContent = 'Esperando señal GPS…';
  }
  function parar() {
    if (!grabando) return null;
    navigator.geolocation.clearWatch(grabando.watch);
    grabando.lock?.release?.().catch?.(() => {});
    const g = grabando; grabando = null;
    controles();
    return g;
  }
  async function terminar() {
    const g = parar();
    if (!g || g.pts.length < 2) { $('#vr-est').textContent = 'No se ha guardado: hacen falta al menos unos metros de recorrido con señal GPS.'; return; }
    const nombre = $('#vr-nom').value.trim() || `Ruta del ${new Date().toLocaleDateString('es-ES')}`;
    await store.put('geo', { id: `vr${uid()}`, nombre, data: V.rutaGeojson(g.pts, nombre), color: '#2f7fd1', ts: Date.now(), volver: true });
    $('#vr-nom').value = '';
    $('#vr-est').textContent = `Ruta «${nombre}» guardada: ${V.distanciaTexto(V.longitud(g.pts))}.`;
    pintarLista();
  }
  async function marcar(tipo) {
    const q = grabando?.ultimo;
    if (!q) { toast('Todavía no hay señal GPS'); return; }
    await store.put('puntos', { id: uid(), nombre: tipo === 'agua' ? 'Agua' : 'Refugio', tipo, lat: Number(q.lat.toFixed(6)), lon: Number(q.lon.toFixed(6)), nota: `Marcado al grabar «${$('#vr-nom').value.trim() || 'ruta'}»`, ts: Date.now() });
    toast(tipo === 'agua' ? '💧 Punto de agua guardado' : '🏕 Refugio guardado');
  }
  async function pintarLista() {
    const [geo, pts] = await Promise.all([store.all('geo').catch(() => []), store.all('puntos').catch(() => [])]);
    const mias = geo.filter((g) => g.volver).sort((a, b) => b.ts - a.ts);
    const utiles = pts.filter((p) => ['agua', 'refugio', 'sanitario', 'abastecimiento', 'reunion'].includes(p.tipo));
    const ic = { agua: '💧', refugio: '🏕', sanitario: '🏥', abastecimiento: '🛒', reunion: '📍' };
    $('#vr-lista').innerHTML = mias.length ? mias.map((g) => {
      const ruta = V.puntosDeRuta(g.data), m = V.longitud(ruta);
      const cerca = V.cercaDeRuta(utiles, ruta);
      return `<div class="vr-ruta"><p><b>${esc(g.nombre)}</b><br><span class="muted">${V.distanciaTexto(m)} · unos ${V.tiempoAndando(m)} andando · grabada el ${new Date(g.ts).toLocaleDateString('es-ES')}</span></p>
        ${cerca.length ? `<p class="vr-cerca">Por el camino: ${cerca.slice(0, 6).map((p) => `${ic[p.tipo] || '📍'} ${esc(p.nombre || p.tipo)} <span class="muted">(a ${Math.round(p.dist)} m)</span>`).join(' · ')}</p>` : '<p class="muted">Sin fuentes ni refugios marcados cerca. Márcalos al grabar o en el Mapa.</p>'}
        <div class="btnrow"><a class="btn sm ghost" href="#/mapa">🗺 Ver en el mapa</a><button type="button" class="btn sm ghost" data-borrar="${esc(g.id)}">Borrar</button></div></div>`;
    }).join('') : '<p class="muted">Aún no has grabado ninguna ruta. También puedes importar una (GPX) en el Mapa → Capas.</p>';
  }

  n.addEventListener('click', async (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.id === 'vr-ini') return empezar();
    if (b.id === 'vr-fin') return terminar();
    if (b.dataset.marcar) return marcar(b.dataset.marcar);
    if (b.dataset.borrar) {
      if (!confirm('¿Borrar esta ruta?')) return;
      await store.del('geo', b.dataset.borrar); pintarLista();
    }
  });
  alSalir(() => parar());
  controles();
  pintarLista();
  return n;
}

/* ------------------------------- Vista ------------------------------- */
export async function volverView(inicial) {
  const n = el(`<div>
    <div class="tabs tabs-grid vc-tabs" role="tablist" aria-label="Volver a casa">
      <button role="tab" type="button" data-vc="perdido" aria-selected="true">🧭 Estoy perdido</button>
      <button role="tab" type="button" data-vc="rutas" aria-selected="false">🛤 Mis rutas</button>
    </div>
    <div id="vc-body"></div>
  </div>`);
  const body = n.querySelector('#vc-body');
  async function pinta(id) {
    n.querySelectorAll('[data-vc]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.vc === id)));
    body.replaceChildren(await (id === 'rutas' ? rutas() : perdido()));
  }
  n.querySelectorAll('[data-vc]').forEach((b) => b.addEventListener('click', () => pinta(b.dataset.vc)));
  await pinta(inicial === 'rutas' ? 'rutas' : 'perdido');
  return n;
}
