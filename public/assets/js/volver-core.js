/* =========================================================================
   volver-core.js — VOLVER A CASA: cálculos (sin pantalla, se prueban solos)
   Rumbo y distancia a casa, coordenadas legibles, tiempo andando y
   limpieza de la ruta grabada con el GPS.
   ========================================================================= */

const R = 6371000, rad = Math.PI / 180;

/** Distancia en metros entre dos puntos {lat, lon}. */
export function metros(a, b) {
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Rumbo inicial de a hacia b, en grados desde el norte (0–360). */
export function rumbo(a, b) {
  const f1 = a.lat * rad, f2 = b.lat * rad, dl = (b.lon - a.lon) * rad;
  const y = Math.sin(dl) * Math.cos(f2);
  const x = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl);
  return (Math.atan2(y, x) / rad + 360) % 360;
}

const PUNTOS = ['norte', 'noreste', 'este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste'];
export const haciaDonde = (g) => PUNTOS[Math.round(((g % 360) + 360) % 360 / 45) % 8];

/** 1234 → «1,2 km»; 340 → «340 m». */
export function distanciaTexto(m) {
  if (m < 1000) return `${Math.round(m / 10) * 10} m`;
  return `${(m / 1000).toLocaleString('es-ES', { maximumFractionDigits: m < 10000 ? 1 : 0 })} km`;
}

/** Tiempo andando (4,5 km/h por defecto; por ciudad o con carga, más). */
export function tiempoAndando(m, kmh = 4.5) {
  const min = Math.max(1, Math.round((m / 1000 / kmh) * 60));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), r = min % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

/** 40.6566, -4.6812 → «40° 39′ 23.8″ N, 4° 40′ 52.3″ O». */
export function gms(lat, lon) {
  const f = (v, pos, neg) => {
    const a = Math.abs(v), g = Math.floor(a), mf = (a - g) * 60, m = Math.floor(mf), s = (mf - m) * 60;
    return `${g}° ${m}′ ${s.toFixed(1)}″ ${v >= 0 ? pos : neg}`;
  };
  return `${f(lat, 'N', 'S')}, ${f(lon, 'E', 'O')}`;
}

/** Texto para dictar o enviar por SMS. */
export const coordenadasTexto = (p) => `${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}`;

/**
 * ¿Se añade este punto GPS a la ruta? Se descartan las lecturas imprecisas
 * (más de 40 m de error) y las que apenas se mueven (menos de 15 m), que
 * solo añaden ruido y ocupan espacio.
 */
export function aceptarPunto(ultimo, p, { precisionMax = 40, pasoMin = 15 } = {}) {
  if (!p || !Number.isFinite(p.lat) || !Number.isFinite(p.lon)) return false;
  if (p.acc != null && p.acc > precisionMax) return false;
  return !ultimo || metros(ultimo, p) >= pasoMin;
}

/** Longitud en metros de una lista de puntos. */
export const longitud = (pts) => pts.reduce((s, p, i) => (i ? s + metros(pts[i - 1], p) : 0), 0);

/** Ruta en GeoJSON (como las capas del mapa: así se ve en «Mapa»). */
export function rutaGeojson(pts, nombre) {
  return { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { nombre, tipo: 'volver' }, geometry: { type: 'LineString', coordinates: pts.map((p) => [Number(p.lon.toFixed(6)), Number(p.lat.toFixed(6))]) } }] };
}

/** Puntos de una ruta GeoJSON como {lat, lon}. */
export function puntosDeRuta(geo) {
  const out = [];
  for (const f of geo?.features || []) if (f.geometry?.type === 'LineString') for (const [lon, lat] of f.geometry.coordinates) out.push({ lat, lon });
  return out;
}

/** Distancia mínima (m) de un punto a la ruta (a sus vértices: basta con rutas grabadas cada ≥15 m). */
export function distanciaARuta(p, pts) {
  let min = Infinity;
  for (const q of pts) { const d = metros(p, q); if (d < min) min = d; }
  return min;
}

/** Puntos guardados (agua, refugio…) a menos de `m` metros de la ruta. */
export function cercaDeRuta(puntos, ruta, m = 300) {
  return puntos.map((p) => ({ ...p, dist: distanciaARuta(p, ruta) })).filter((p) => p.dist <= m).sort((a, b) => a.dist - b.dist);
}

/** Horas que da la batería (si el navegador la informa) a un consumo andando con GPS. */
export function horasBateria(nivel, cargando = false, consumoHora = 0.12) {
  if (cargando || nivel == null) return null;
  return Math.max(0, Math.round((nivel / consumoHora) * 10) / 10);
}
