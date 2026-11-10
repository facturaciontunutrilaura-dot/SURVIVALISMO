/* =========================================================================
   ayuda.js — AYUDA Y PREGUNTAS FRECUENTES
   Las dudas típicas de quien usa la app (instalar, sin conexión,
   actualizaciones, permisos, copias…) y un botón que copia un informe
   técnico para soporte. El informe NO lleva datos personales: solo
   versión, navegador y estado técnico de la app.
   ========================================================================= */
import { el, esc, toast } from './ui.js';
import { VERSION } from '../../data/content/index.js';
import { TITULAR } from '../../data/content/legal.js';

export const PREGUNTAS = [
  { g: 'Empezar', q: '¿Cómo instalo la app en el móvil?', a: [
    '<b>iPhone:</b> ábrela en <b>Safari</b> (no en Chrome ni dentro de Instagram) → botón <b>Compartir</b> (el cuadrado con la flecha) → <b>«Añadir a pantalla de inicio»</b>.',
    '<b>Android:</b> ábrela en <b>Chrome</b> → menú <b>⋮</b> → <b>«Instalar aplicación»</b> o «Añadir a pantalla de inicio».',
    'Usa siempre el icono de la pantalla de inicio: así tus datos se guardan de forma estable y funcionan los avisos.'] },
  { g: 'Empezar', q: 'Si abro el enlace desde Instagram o WhatsApp, ¿funciona?', a: [
    'Se ve, pero esos navegadores internos no dejan instalarla ni guardar bien los datos. Pulsa los tres puntos y elige <b>«Abrir en el navegador»</b> (Safari o Chrome) y después instálala.'] },
  { g: 'Sin conexión', q: '¿Cómo sé que funcionará sin internet?', a: [
    'Ve a <a href="#/sec/config">Ajustes</a> → <b>«¿Está lista tu app?»</b>. Si pone <b>«Funciona sin conexión»</b>, todo lo necesario ya está guardado en el móvil.',
    'Basta con abrirla una vez con internet. Lo que <b>sí</b> necesita conexión: Noticias, Radio, los avisos y descargar mapas.',
    'Haz una prueba: pon el móvil en modo avión y abre la app.'] },
  { g: 'Sin conexión', q: 'El mapa sale en blanco sin conexión', a: [
    'El fondo del mapa (calles, montes) hay que descargarlo antes, con internet: <a href="#/mapa">Mapa</a> → <b>Descargar zona</b>. Sin descargar, solo se ven las provincias y tus puntos.'] },
  { g: 'Actualizaciones', q: 'No me llega la última versión', a: [
    'Abre la app con internet y espera unos segundos: aparecerá arriba el aviso <b>«Actualizar ahora»</b>. Si no lo pulsas, se aplica sola la próxima vez que la abras.',
    'Si no aparece, ciérrala del todo (desliza hacia arriba en la lista de apps) y vuelve a abrirla.',
    `La versión que tienes está en <a href="#/sec/config">Ajustes</a> → «Estado offline». Esta es la <b>${esc(VERSION)}</b>.`] },
  { g: 'Datos y copias', q: '¿Se pueden perder mis datos?', a: [
    'Todo lo que apuntas (plan familiar, efectivo, rutas, contactos…) se guarda <b>solo en tu móvil</b>, no en ningún servidor.',
    'En iPhone, si usas la app desde Safari sin instalarla y pasas muchos días sin abrirla, el sistema puede borrar sus datos. <b>Instálala</b> y haz copias de seguridad.',
    'Borrar los datos del navegador o desinstalar la app también los borra.'] },
  { g: 'Datos y copias', q: '¿Cómo hago una copia de seguridad o paso mis datos a otro móvil?', a: [
    '<a href="#/sec/config">Ajustes</a> → <b>Copias de seguridad</b> → <b>«Exportar datos»</b>. Guarda el archivo en Archivos, Google Drive o envíatelo por correo.',
    'En el móvil nuevo: instala la app → Ajustes → Copias de seguridad → <b>«Importar datos»</b> y elige ese archivo.',
    'Hazla cada vez que cambies algo importante. También puedes activar la sincronización entre dispositivos (opcional) en Ajustes.'] },
  { g: 'Permisos', q: 'No encuentra mi ubicación (GPS)', a: [
    'Acepta el permiso cuando la app lo pida. Si lo rechazaste:',
    '<b>iPhone:</b> Ajustes → Privacidad y seguridad → Localización → activada, y en <b>Sitios web de Safari</b> → «Al usar la app».',
    '<b>Android:</b> mantén pulsado el icono de la app → Información → Permisos → Ubicación → Permitir.',
    'Sal a un sitio despejado: dentro de edificios el GPS tarda o falla.'] },
  { g: 'Permisos', q: 'La brújula o la flecha no se mueven', a: [
    'Pulsa <b>«Activar la brújula»</b> y acepta el permiso de <b>movimiento y orientación</b>.',
    'Calíbrala moviendo el móvil en forma de 8 y aléjate de metales, imanes y coches.',
    'Algunos móviles no tienen brújula: entonces la flecha se dibuja con el norte hacia arriba.'] },
  { g: 'Permisos', q: 'No me llegan los avisos graves', a: [
    'Actívalos en <a href="#/sec/noticias">Noticias</a> → «Avisos graves en el móvil».',
    '<b>iPhone:</b> solo funcionan con la app <b>instalada</b> en la pantalla de inicio y con iOS 16.4 o posterior.',
    'Revisa que no tengas un modo Concentración o No molestar activo. Solo se envían ante algo muy grave, como mucho 4 al día.'] },
  { g: 'Sonido y radio', q: 'El silbato o el Morse no suenan', a: [
    'Sube el volumen <b>multimedia</b> (no el del timbre). En iPhone suenan aunque el interruptor de silencio esté activado.',
    'Si tienes auriculares Bluetooth conectados, el sonido sale por ellos.'] },
  { g: 'Sonido y radio', q: 'Una emisora de radio no suena', a: [
    'La radio necesita internet. Si una emisora no responde, prueba otra: a veces la propia emisora está caída o cambia su dirección.',
    'Sin internet, usa una radio FM a pilas: Radio Nacional da los avisos oficiales.'] },
  { g: 'Sonido y radio', q: 'No puedo añadir una canción en Audio', a: [
    'Solo se pueden añadir archivos de música guardados en el móvil (MP3, M4A, AAC, OGG, WAV, FLAC), por ejemplo desde la app Archivos.',
    'Las canciones de Apple Music o Spotify están protegidas y no se pueden importar.'] },
  { g: 'Otros', q: 'La app va lenta o se ve rara', a: [
    'Ciérrala del todo y vuelve a abrirla. Comprueba que tienes la última versión.',
    'Si no se arregla: <a href="#/sec/config">Ajustes</a> → <b>Mantenimiento</b>. Antes de borrar nada, haz una copia de seguridad.'] },
  { g: 'Otros', q: 'En una emergencia real, ¿qué hago primero?', a: [
    'Llama al <a href="tel:112">112</a>. La app es una ayuda para prepararte y organizarte; no sustituye a los servicios de emergencia.'] },
];

/** Informe técnico para soporte (sin datos personales). */
export async function informe(nav = navigator, win = window) {
  const l = [`SUPERVIVENCIA ${VERSION}`, `Fecha: ${new Date().toISOString()}`, `Navegador: ${nav.userAgent}`];
  l.push(`Instalada: ${win.matchMedia?.('(display-mode: standalone)').matches || nav.standalone === true ? 'sí' : 'no (navegador)'}`);
  l.push(`Conexión: ${nav.onLine ? 'sí' : 'no'}`);
  try {
    const r = await nav.serviceWorker?.getRegistration();
    l.push(`Modo sin conexión: ${r?.active ? 'activo' : 'NO activo'}`);
  } catch { l.push('Modo sin conexión: desconocido'); }
  try {
    const e = await nav.storage?.estimate?.();
    if (e) l.push(`Espacio usado: ${Math.round((e.usage || 0) / 1048576)} MB de ${Math.round((e.quota || 0) / 1048576)} MB`);
    l.push(`Almacenamiento persistente: ${(await nav.storage?.persisted?.()) ? 'sí' : 'no'}`);
  } catch { /* opcional */ }
  l.push(`Pantalla: ${win.innerWidth}×${win.innerHeight} · idioma ${nav.language}`);
  return l.join('\n');
}

export function ayudaView() {
  const grupos = [...new Set(PREGUNTAS.map((p) => p.g))];
  const contacto = TITULAR.email.trim();
  const n = el(`<div>
    <label for="ay-q" class="sr-only">Buscar en la ayuda</label>
    <input id="ay-q" type="search" placeholder="Busca tu duda: instalar, mapa, copia…" autocomplete="off">
    <div id="ay-lista">${grupos.map((g) => `<section class="ay-grupo" data-g="${esc(g)}"><h3>${esc(g)}</h3>
      ${PREGUNTAS.filter((p) => p.g === g).map((p) => `<details class="card ay-p"><summary>${esc(p.q)}</summary><div>${p.a.map((x) => `<p>${x}</p>`).join('')}</div></details>`).join('')}
    </section>`).join('')}</div>
    <p id="ay-nada" class="muted" hidden>No hay ninguna pregunta con esas palabras. Prueba con otras o escríbenos.</p>
    <section class="card ay-soporte" aria-labelledby="ay-st">
      <h3 id="ay-st">✉️ ¿No lo encuentras?</h3>
      <p>${contacto ? `Escríbenos a <a href="mailto:${esc(contacto)}?subject=${encodeURIComponent(`Ayuda SUPERVIVENCIA ${VERSION}`)}">${esc(contacto)}</a>.` : 'Escríbenos al correo de contacto que aparece en el <a href="#/legal/aviso">Aviso legal</a>.'} Cuéntanos qué pasa, qué móvil usas y, si puedes, añade una captura de pantalla.</p>
      <p>Para ayudarte más rápido, pega también este informe técnico. <b>No incluye ningún dato personal</b>: solo la versión de la app, el navegador y si funciona sin conexión.</p>
      <button type="button" class="btn" id="ay-copiar">📋 Copiar informe técnico</button>
      <pre id="ay-informe" class="ay-informe" hidden></pre>
    </section>
  </div>`);
  const q = n.querySelector('#ay-q');
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  q.addEventListener('input', () => {
    const t = norm(q.value.trim());
    let algo = false;
    for (const d of n.querySelectorAll('.ay-p')) {
      const si = !t || t.split(/\s+/).every((w) => norm(d.textContent).includes(w));
      d.hidden = !si; if (si) algo = true;
      d.open = !!t && si;
    }
    for (const s of n.querySelectorAll('.ay-grupo')) s.hidden = ![...s.querySelectorAll('.ay-p')].some((d) => !d.hidden);
    n.querySelector('#ay-nada').hidden = algo;
  });
  n.querySelector('#ay-copiar').addEventListener('click', async () => {
    const t = await informe();
    const pre = n.querySelector('#ay-informe');
    pre.textContent = t; pre.hidden = false;
    try { await navigator.clipboard.writeText(t); toast('Informe copiado: pégalo en tu correo'); } catch { toast('Selecciona el texto y cópialo'); }
  });
  return n;
}
