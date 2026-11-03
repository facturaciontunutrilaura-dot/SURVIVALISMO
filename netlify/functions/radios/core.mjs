/* =========================================================================
   Radios en directo — lógica pura (sin red propia: recibe fetchFn)
   Las direcciones de las emisoras cambian a menudo. En vez de escribirlas a
   mano, se piden al directorio abierto Radio Browser (radio-browser.info,
   datos libres) y se elige, de cada emisora, la emisión HTTPS que MENOS
   datos gasta (la app se usa con poca cobertura).
   ========================================================================= */

export const EMISORAS = [
  { id: 'rne', t: 'Radio Nacional (RNE)', tipo: 'noticias', buscar: 'Radio Nacional', debe: /radio nacional|rne/i, evitar: /cl[aá]sica|3|exterior/i },
  { id: 'r5', t: 'Radio 5 (RNE) · todo noticias', tipo: 'noticias', buscar: 'Radio 5', debe: /radio 5|r5/i, evitar: /\b15\b/ },
  { id: 'ser', t: 'Cadena SER', tipo: 'noticias', buscar: 'Cadena SER', debe: /cadena ser|^ser\b/i },
  { id: 'cope', t: 'COPE', tipo: 'noticias', buscar: 'COPE', debe: /cope/i, evitar: /deportes|cadena 100|rock/i },
  { id: 'ondacero', t: 'Onda Cero', tipo: 'noticias', buscar: 'Onda Cero', debe: /onda cero/i },
  { id: 'esradio', t: 'esRadio', tipo: 'noticias', buscar: 'esRadio', debe: /esradio/i },
  { id: 'los40', t: 'LOS40', tipo: 'musica', buscar: 'LOS40', debe: /los ?40/i, evitar: /classic|urban|dance/i },
  { id: 'cadena100', t: 'Cadena 100', tipo: 'musica', buscar: 'Cadena 100', debe: /cadena 100/i },
  { id: 'europafm', t: 'Europa FM', tipo: 'musica', buscar: 'Europa FM', debe: /europa ?fm/i },
  { id: 'dial', t: 'Cadena Dial', tipo: 'musica', buscar: 'Cadena Dial', debe: /cadena dial/i },
  { id: 'rockfm', t: 'Rock FM', tipo: 'musica', buscar: 'Rock FM', debe: /rock ?fm/i },
  { id: 'kissfm', t: 'Kiss FM', tipo: 'musica', buscar: 'Kiss FM', debe: /kiss ?fm/i },
];

/* Servidores espejo de Radio Browser: si uno falla, se prueba el siguiente. */
export const SERVIDORES = ['https://de1.api.radio-browser.info', 'https://nl1.api.radio-browser.info', 'https://at1.api.radio-browser.info', 'https://de2.api.radio-browser.info'];
const AGENTE = 'SupervivenciaApp/1.0';

/** De los resultados del directorio, la emisión HTTPS que menos gasta (≥ 24 kbps). */
export function elegir(e, lista = []) {
  const ok = lista.filter((s) => {
    const url = s.url_resolved || s.url || '';
    return /^https:\/\//i.test(url) && e.debe.test(s.name || '') && !(e.evitar && e.evitar.test(s.name || ''))
      && (s.lastcheckok === 1 || s.lastcheckok === undefined) && !/m3u8?$|\.pls$/i.test(url);
  });
  if (!ok.length) return null;
  const br = (s) => (s.bitrate > 0 ? s.bitrate : 128);
  // Menos kbps primero; a igualdad, la más escuchada.
  ok.sort((a, b) => Math.max(br(a), 24) - Math.max(br(b), 24) || (b.clickcount || 0) - (a.clickcount || 0));
  const s = ok.find((x) => br(x) >= 24) || ok[0];
  return { id: e.id, t: e.t, tipo: e.tipo, url: s.url_resolved || s.url, kbps: s.bitrate || null, codec: s.codec || '', web: s.homepage || '' };
}

async function buscar(fetchFn, e) {
  const q = `/json/stations/search?name=${encodeURIComponent(e.buscar)}&countrycode=ES&hidebroken=true&order=clickcount&reverse=true&limit=25`;
  let ultimo = null;
  for (const base of SERVIDORES) {
    try {
      const r = await fetchFn(base + q, { headers: { 'User-Agent': AGENTE }, signal: AbortSignal.timeout?.(6000) });
      if (!r.ok) { ultimo = `HTTP ${r.status}`; continue; }
      return { lista: await r.json() };
    } catch (err) { ultimo = String(err?.message || err); }
  }
  return { lista: [], error: ultimo };
}

/** Lista de emisoras con su mejor emisión. Las que no se encuentran se indican. */
export async function recopilar(fetchFn = fetch, ahora = new Date()) {
  const res = await Promise.all(EMISORAS.map(async (e) => {
    const { lista, error } = await buscar(fetchFn, e);
    const s = elegir(e, lista);
    return s || { id: e.id, t: e.t, tipo: e.tipo, url: null, error: error || 'No encontrada' };
  }));
  return { generado: ahora.toISOString(), fuente: 'Radio Browser (radio-browser.info)', emisoras: res };
}
