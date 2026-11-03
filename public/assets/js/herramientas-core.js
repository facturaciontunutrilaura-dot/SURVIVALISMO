/* =========================================================================
   herramientas-core.js — lógica pura de las herramientas SOS (sin DOM)
   Mensajes «Estoy bien» por SMS/WhatsApp, días de despensa y avisos de
   caducidad. Lo usan la pantalla y las pruebas unitarias.
   ========================================================================= */

/** Teléfono en formato de marcación: sin espacios ni guiones; +34 si es un móvil español sin prefijo. */
export function telefono(t) {
  let x = String(t || '').replace(/[^\d+]/g, '');
  if (/^[6789]\d{8}$/.test(x)) x = '+34' + x;
  return /^\+?\d{6,15}$/.test(x) ? x : '';
}

export const ESTADOS_MENSAJE = [
  { id: 'bien', t: 'Estoy bien', ic: '🟢', texto: 'Estoy bien.' },
  { id: 'ayuda', t: 'Necesito ayuda', ic: '🟠', texto: 'Necesito ayuda.' },
  { id: 'voy', t: 'Voy al punto de encuentro', ic: '🧭', texto: 'Voy hacia el punto de encuentro.' },
  { id: 'casa', t: 'Me quedo en casa', ic: '🏠', texto: 'Estamos en casa y nos quedamos aquí.' },
];

/** Texto del mensaje. `pos` ({lat, lon}) solo si la persona lo pide. */
export function textoMensaje({ estado, lugar = '', punto = '', pos = null, extra = '', hora = new Date() }) {
  const e = ESTADOS_MENSAJE.find((x) => x.id === estado) || ESTADOS_MENSAJE[0];
  const partes = [e.texto];
  if (lugar) partes.push(`Estoy en ${lugar}.`);
  if (estado === 'voy' && punto) partes.push(`Punto de encuentro: ${punto}.`);
  if (extra) partes.push(extra.trim());
  if (pos) partes.push(`Mi posición: ${pos.lat.toFixed(5)}, ${pos.lon.toFixed(5)} (https://maps.google.com/?q=${pos.lat.toFixed(5)},${pos.lon.toFixed(5)})`);
  partes.push(`(${hora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })})`);
  return partes.join(' ');
}

/** Enlace sms: para uno o varios teléfonos (iPhone y Android lo escriben distinto). */
export function enlaceSms(tels, texto, ios = false) {
  const lista = tels.map(telefono).filter(Boolean);
  const body = encodeURIComponent(texto);
  if (ios) return lista.length > 1 ? `sms:/open?addresses=${lista.join(',')}&body=${body}` : `sms:${lista[0] || ''}&body=${body}`;
  return `sms:${lista.join(',')}?body=${body}`;
}

/** Enlace de WhatsApp (necesita datos). */
export function enlaceWhatsapp(tel, texto) {
  const n = telefono(tel).replace(/^\+/, '');
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(texto)}` : '';
}

/* ------------------------------ Despensa ------------------------------ */
/** Alimentos de despensa: kcal por unidad indicada (kg, l o unidad). */
export const DESPENSA_ALIMENTOS = [
  { id: 'arroz', t: 'Arroz', u: 'kg', kcal: 3600 },
  { id: 'pasta', t: 'Pasta', u: 'kg', kcal: 3600 },
  { id: 'legumbre-seca', t: 'Legumbres secas', u: 'kg', kcal: 3400 },
  { id: 'legumbre-bote', t: 'Legumbres cocidas (bote de 400 g)', u: 'botes', kcal: 360 },
  { id: 'atun', t: 'Latas de atún o sardinas (80 g)', u: 'latas', kcal: 170 },
  { id: 'carne-lata', t: 'Conservas de carne o fabada (400 g)', u: 'latas', kcal: 520 },
  { id: 'verdura-lata', t: 'Verdura en conserva (400 g)', u: 'botes', kcal: 100 },
  { id: 'aceite', t: 'Aceite de oliva', u: 'l', kcal: 8200 },
  { id: 'leche', t: 'Leche UHT', u: 'l', kcal: 630 },
  { id: 'galletas', t: 'Galletas', u: 'kg', kcal: 4500 },
  { id: 'cereales', t: 'Copos de avena o cereales', u: 'kg', kcal: 3700 },
  { id: 'frutos-secos', t: 'Frutos secos', u: 'kg', kcal: 6000 },
  { id: 'azucar', t: 'Azúcar o miel', u: 'kg', kcal: 3800 },
  { id: 'harina', t: 'Harina', u: 'kg', kcal: 3500 },
  { id: 'chocolate', t: 'Chocolate', u: 'kg', kcal: 5400 },
  { id: 'patatas', t: 'Patatas', u: 'kg', kcal: 770 },
];

const num = (v) => { const x = Number(String(v ?? '').replace(',', '.')); return Number.isFinite(x) && x > 0 ? x : 0; };

/**
 * Días de autonomía con lo que hay en casa.
 * @param inv   { agua: litros, [idAlimento]: cantidad }
 * @param kcalDia  kcal al día del hogar; @param aguaDia  litros al día del hogar
 */
export function diasDespensa(inv, kcalDia, aguaDia) {
  const kcal = DESPENSA_ALIMENTOS.reduce((s, a) => s + num(inv[a.id]) * a.kcal, 0);
  const agua = num(inv.agua);
  const dComida = kcalDia > 0 ? kcal / kcalDia : 0;
  const dAgua = aguaDia > 0 ? agua / aguaDia : 0;
  return { kcal: Math.round(kcal), agua, dComida: Math.floor(dComida * 10) / 10, dAgua: Math.floor(dAgua * 10) / 10, dias: Math.floor(Math.min(dComida, dAgua) * 10) / 10, limita: dAgua < dComida ? 'agua' : 'comida' };
}

/* ------------------------------ Recordatorios ------------------------------ */
/** Elementos de las listas con fecha de caducidad vencida o en los próximos `margen` días. */
export function caducidades(checks, nombres = {}, hoy = new Date(), margen = 30) {
  const base = new Date(hoy.toDateString());
  return checks.filter((r) => r.fecha && /^\d{4}-\d{2}-\d{2}$/.test(r.fecha)).map((r) => {
    const dias = Math.round((new Date(r.fecha + 'T00:00:00') - base) / 86400000);
    const lista = String(r.id).split('::')[0];
    return { id: r.id, lista, t: nombres[r.id] || r.id, fecha: r.fecha, dias };
  }).filter((x) => x.dias <= margen).sort((a, b) => a.dias - b.dias);
}

/** ¿Toca revisar la mochila? Cada 6 meses (183 días). */
export const tocaRevision = (ultima, hoy = Date.now()) => !ultima || hoy - ultima > 183 * 86400000;
