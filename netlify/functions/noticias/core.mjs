/* =========================================================================
   core.mjs — lógica de NOTICIAS DE ÚLTIMA HORA (sin red ni Netlify)
   Lee RSS y Atom, se queda con lo relevante para la app (emergencias,
   catástrofes, conflictos, suministros…), lo clasifica y lo ordena.
   Solo titular, fuente, fecha y enlace: no se copian textos de los medios.
   Se prueba en tools/test-unit.mjs con canales de ejemplo.
   ========================================================================= */

/* Fuentes. `filtro`: para canales oficiales con muchos avisos menores, solo
   pasan los que cumplen el patrón (p. ej., avisos naranja o rojo).
   `todo`: el canal entero es relevante (no hace falta encontrar un tema). */
export const FUENTES = [
  { id: 'aemet', t: 'AEMET (avisos)', url: 'https://www.aemet.es/documentos_d/eltiempo/prediccion/avisos/rss/CAP_AFAE_wah_RSS.xml', ambito: 'espana', oficial: true, todo: true, filtro: /naranja|rojo|orange|red/i, tema: 'meteo' },
  { id: 'gdacs', t: 'GDACS (ONU y Comisión Europea)', url: 'https://www.gdacs.org/xml/rss.xml', ambito: 'internacional', oficial: true, todo: true, filtro: /\b(orange|red)\b/i },
  { id: 'usgs', t: 'USGS (terremotos importantes)', url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.atom', ambito: 'internacional', oficial: true, todo: true, tema: 'terremoto' },
  { id: 'ep-es', t: 'Europa Press', url: 'https://www.europapress.es/rss/rss.aspx?ch=66', ambito: 'espana' },
  { id: 'ep-int', t: 'Europa Press', url: 'https://www.europapress.es/rss/rss.aspx?ch=69', ambito: 'internacional' },
  { id: 'elpais', t: 'El País', url: 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada', ambito: 'espana' },
  { id: 'elpais-int', t: 'El País', url: 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/internacional/portada', ambito: 'internacional' },
  { id: 'bbc', t: 'BBC Mundo', url: 'https://feeds.bbci.co.uk/mundo/rss.xml', ambito: 'internacional' },
];

/* Temas de la app. `peso`: gravedad (3 = lo más grave). `ruta`: ficha de la
   app relacionada. Las palabras se comparan con el titular normalizado
   (minúsculas, sin tildes); «*» al final = raíz de palabra. */
export const TEMAS = [
  { id: 'nuclear', t: 'Nuclear', ic: '☢️', peso: 3, ruta: '#/emergencia/radiologico', palabras: ['nuclear', 'radiactiv*', 'radiacion', 'central nuclear'] },
  { id: 'guerra', t: 'Conflicto', ic: '⚔️', peso: 3, ruta: '#/emergencia/conflicto', palabras: ['guerra', 'misil*', 'bombarde*', 'ataque aereo', 'invasion', 'ofensiva', 'drones', 'dron', 'otan', 'movilizacion', 'ataque con', 'ataque ruso', 'ataque iran*', 'ataque israel*'] },
  { id: 'terremoto', t: 'Terremoto', ic: '🌍', peso: 3, ruta: '#/emergencia/terremoto', palabras: ['terremoto*', 'sismo*', 'seismo*', 'earthquake', 'tsunami', 'maremoto'] },
  { id: 'apagon', t: 'Apagón', ic: '⚡', peso: 3, ruta: '#/emergencia/apagon', palabras: ['apagon*', 'sin luz', 'corte de luz', 'cero energetico', 'red electrica', 'suministro electrico', 'blackout'] },
  { id: 'inundacion', t: 'Inundación', ic: '🌊', peso: 2, ruta: '#/emergencia/inundacion', palabras: ['inundacion*', 'dana', 'riada*', 'crecida*', 'desbordamiento', 'lluvias torrenciales', 'gota fria', 'flood*'] },
  { id: 'incendio', t: 'Incendio', ic: '🔥', peso: 2, ruta: '#/emergencia/incendio-forestal', palabras: ['incendio forestal', 'incendios forestales', 'incendio', 'wildfire', 'desalojo*', 'desaloja*'] },
  { id: 'meteo', t: 'Aviso meteorológico', ic: '⛈️', peso: 2, ruta: '#/emergencia/tormenta', palabras: ['ola de calor', 'ola de frio', 'temporal', 'nevada*', 'aviso rojo', 'aviso naranja', 'huracan*', 'ciclon*', 'tifon*', 'borrasca', 'tormenta*', 'granizo', 'vendaval*'] },
  { id: 'pandemia', t: 'Salud pública', ic: '🦠', peso: 2, ruta: '#/emergencia/general', palabras: ['pandemia*', 'epidemia*', 'brote de', 'gripe aviar', 'virus', 'alerta sanitaria', 'emergencia sanitaria', 'contagio*'] },
  { id: 'ciber', t: 'Ciberataque', ic: '💻', peso: 2, ruta: '#/emergencia/apagon', palabras: ['ciberataque*', 'ataque informatico', 'hackeo', 'ransomware', 'caida de internet', 'caida masiva'] },
  { id: 'quimico', t: 'Accidente químico', ic: '☣️', peso: 2, ruta: '#/emergencia/quimico', palabras: ['explosion', 'fuga toxica', 'nube toxica', 'escape de gas', 'quimico', 'confinamiento'] },
  { id: 'volcan', t: 'Volcán', ic: '🌋', peso: 2, ruta: '#/emergencia/general', palabras: ['volcan*', 'erupcion', 'volcanic*'] },
  { id: 'suministros', t: 'Suministros', ic: '🛒', peso: 1, ruta: '#/sec/compra', palabras: ['desabastecimiento', 'escasez', 'racionamiento', 'acaparamiento', 'sequia', 'restricciones de agua', 'corte de agua', 'crisis energetica'] },
  { id: 'emergencia', t: 'Emergencia', ic: '🚨', peso: 1, ruta: '#/emergencia', palabras: ['proteccion civil', 'es-alert', 'estado de emergencia', 'estado de alarma', 'es alert', 'emergencia', 'evacua*', 'alerta maxima', 'catastrofe', 'disturbios'] },
];

/* Lo que se descarta aunque coincida: deportes, espectáculos y frases hechas
   en las que «guerra», «tormenta» o «catástrofe» no significan eso. */
const EXCLUIR = [
  'futbol', 'liga', 'champions', 'fichaje*', 'gol', 'goles', 'baloncesto', 'tenis', 'motogp', 'formula 1', 'ciclismo', 'pelicula', 'concierto', 'eurovision', 'videojuego*',
  'pie de guerra', 'tormenta perfecta', 'tormenta politica', 'terremoto politico', 'tsunami politico', 'tiempos volcanicos', 'tiempos de guerra', 'hombre de paz',
  'guerra comercial', 'guerra arancelaria', 'guerra de precios', 'guerra cultural', 'guerra de audiencias', 'guerra sucia', 'guerra interna', 'guerra abierta entre', 'guerra judicial', 'guerra mediatica',
  'catastrofe electoral', 'la espana de la catastrofe', 'desastre electoral',
];

/* Secciones de los medios que no son actualidad de emergencias (por la URL). */
const SECCIONES_FUERA = /\/(eps|opinion|cultura|deportes|television|gente|estilo|babelia|icon|smoda|elviajero|el-viajero|gastronomia|tendencias|ciencia\/[a-z-]*opinion|blogs?)\//i;

/* En los medios, estos temas genéricos no bastan por sí solos: «emergencia» o
   «catástrofe» aparecen a menudo en política. Sí cuentan en canales oficiales. */
const SOLO_OFICIAL = new Set(['emergencia']);

export const VENTANA_HORAS = 48;
export const MAXIMO = 40;

/* ------------------------------ Texto ------------------------------ */
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
export function decodificar(s = '') {
  return String(s)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m)
    .replace(/\s+/g, ' ')
    .trim();
}
export const normalizar = (s) => ` ${String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ-]+/g, ' ').trim()} `;
const coincide = (texto, p) => (p.endsWith('*') ? texto.includes(` ${p.slice(0, -1)}`) : texto.includes(` ${p} `));

/* ------------------------------ RSS / Atom ------------------------------ */
const etiqueta = (xml, nombre) => {
  const m = xml.match(new RegExp(`<${nombre}(?:\\s[^>]*)?>([\\s\\S]*?)</${nombre}>`, 'i'));
  return m ? m[1] : '';
};

/** Extrae {titulo, url, fecha} de un canal RSS o Atom. Tolerante con XML imperfecto. */
export function leerCanal(xml) {
  const out = [];
  const bloques = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  for (const b of bloques) {
    const titulo = decodificar(etiqueta(b, 'title'));
    let url = decodificar(etiqueta(b, 'link'));
    if (!url) url = (b.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i) || b.match(/<link[^>]*href=["']([^"']+)["']/i) || [])[1] || '';
    if (!url) url = decodificar(etiqueta(b, 'guid'));
    const f = decodificar(etiqueta(b, 'pubDate') || etiqueta(b, 'updated') || etiqueta(b, 'published') || etiqueta(b, 'dc:date'));
    const fecha = f ? new Date(f) : null;
    if (titulo && /^https?:\/\//i.test(url)) out.push({ titulo, url: url.replace(/&amp;/g, '&'), fecha: fecha && !isNaN(fecha) ? fecha.toISOString() : null });
  }
  return out;
}

/** Tema principal de un titular (el más grave), o null si no es de la app. */
export function clasificar(titulo, fuente = {}) {
  const t = normalizar(titulo);
  if (EXCLUIR.some((p) => coincide(t, p))) return null;
  const temas = TEMAS.filter((x) => x.palabras.some((p) => coincide(t, p)) && (fuente.oficial || !SOLO_OFICIAL.has(x.id) || x.palabras.slice(0, 4).some((p) => coincide(t, p))));
  if (!temas.length) return fuente.todo ? (TEMAS.find((x) => x.id === fuente.tema) || TEMAS.find((x) => x.id === 'emergencia')) : null;
  return temas.sort((a, b) => b.peso - a.peso)[0];
}

/** Junta, filtra, puntúa y ordena las noticias de todos los canales. */
export function seleccionar(porFuente, ahora = new Date()) {
  const limite = ahora.getTime() - VENTANA_HORAS * 3600e3;
  const vistos = new Set();
  const lista = [];
  for (const { fuente, items } of porFuente) {
    for (const it of items) {
      if (fuente.filtro && !fuente.filtro.test(it.titulo)) continue;
      if (!fuente.oficial && SECCIONES_FUERA.test(it.url)) continue;
      const fecha = it.fecha ? new Date(it.fecha) : null;
      if (fecha && (fecha.getTime() < limite || fecha.getTime() > ahora.getTime() + 3600e3)) continue;
      const tema = clasificar(it.titulo, fuente);
      if (!tema) continue;
      const clave = normalizar(it.titulo).slice(0, 70);
      if (vistos.has(clave) || vistos.has(it.url)) continue;
      vistos.add(clave); vistos.add(it.url);
      const horas = fecha ? (ahora - fecha) / 3600e3 : 24;
      const puntos = tema.peso * 10 + (fuente.oficial ? 8 : 0) - horas * 0.5;
      lista.push({
        t: it.titulo.slice(0, 240), url: it.url, fuente: fuente.t, fuenteId: fuente.id, ambito: fuente.ambito,
        oficial: !!fuente.oficial, fecha: fecha ? fecha.toISOString() : null,
        tema: tema.id, temaT: tema.t, ic: tema.ic, ruta: tema.ruta, puntos: Math.round(puntos * 10) / 10,
      });
    }
  }
  return lista.sort((a, b) => b.puntos - a.puntos).slice(0, MAXIMO);
}

/** Descarga todos los canales en paralelo; un canal caído no tumba al resto. */
export async function recopilar(fetchFn = fetch, ahora = new Date(), fuentes = FUENTES) {
  const resultados = await Promise.all(fuentes.map(async (fuente) => {
    try {
      const r = await fetchFn(fuente.url, { headers: { 'User-Agent': 'SupervivenciaApp/1.0 (+noticias)', Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml' }, signal: AbortSignal.timeout(7000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const items = leerCanal(await r.text());
      return { fuente, items, estado: { id: fuente.id, t: fuente.t, ok: true, n: items.length } };
    } catch (e) {
      return { fuente, items: [], estado: { id: fuente.id, t: fuente.t, ok: false, error: String(e?.message || e).slice(0, 120) } };
    }
  }));
  return {
    generado: ahora.toISOString(),
    ventanaHoras: VENTANA_HORAS,
    noticias: seleccionar(resultados, ahora),
    fuentes: resultados.map((r) => r.estado),
  };
}
