/* =========================================================================
   recordatorios-core.js — RECORDATORIOS INTELIGENTES (sin pantalla)
   Te avisa cuando toca algo: rotar el agua, revisar pilas, caducidades,
   actualizar el efectivo… y, según la época del año, lo de temporada.
   Cada recordatorio se da por hecho con un toque (kv 'recordatorios.hechos'
   = { id: ts }) y vuelve cuando vuelve a tocar.
   ========================================================================= */
const DIA = 86400000;

/** Periódicos. `cada` en días. `si(ctx)` decide si aplica a tu hogar. */
export const PERIODICOS = [
  { id: 'agua', ic: '💧', t: 'Rota el agua almacenada', d: 'La que guardas tú en garrafas, cada 6 meses. La embotellada, mira la fecha de consumo preferente.', cada: 183, ruta: '#/sec/despensa-calc', si: (c) => c.plan || c.agua > 0 },
  { id: 'pilas', ic: '🔋', t: 'Revisa pilas y baterías', d: 'Linterna, radio y frontal; carga la batería externa.', cada: 183, ruta: '#/check/apagon', si: () => true },
  { id: 'caducidades', ic: '📅', t: 'Comprueba las caducidades', d: 'Despensa, mochila y botiquín: consume y repón lo que esté cerca de caducar.', cada: 90, ruta: '#/check/despensa', si: (c) => c.plan || c.agua > 0 || c.checks > 0 },
  { id: 'efectivo', ic: '💶', t: 'Actualiza tu efectivo', d: 'Cuenta lo que tienes y apúntalo: así sabes para cuántos días te llega.', cada: 90, ruta: '#/sec/efectivo', si: (c) => c.efectivoTs > 0, desde: (c) => c.efectivoTs },
  { id: 'mochila', ic: '🎒', t: 'Revisa la mochila', d: 'Ropa de temporada, agua, comida y medicinas.', cada: 183, ruta: '#/check/bob', si: (c) => c.checks > 0 || c.plan },
  { id: 'medicacion', ic: '💊', t: 'Revisa la reserva de medicación', d: 'Que haya para 7 días y no esté caducada.', cada: 60, ruta: '#/sec/plan-familiar', si: (c) => c.perfil?.medicacion },
  { id: 'bebe', ic: '🍼', t: 'Revisa el kit del bebé', d: 'Talla de pañales y de ropa, y la fecha de la leche.', cada: 60, si: (c) => c.perfil?.bebes > 0 },
  { id: 'contactos', ic: '📞', t: 'Repasa contactos y punto de encuentro', d: 'Que los teléfonos sigan bien y que toda la familia sepa dónde quedar.', cada: 365, ruta: '#/sec/plan-familiar', si: (c) => c.plan },
];

/** De temporada: meses (1–12) en que aparecen. Uno por temporada y año. */
export const TEMPORADA = [
  { id: 'invierno', meses: [11, 12, 1], ic: '❄️', t: 'Llega el invierno', d: (c) => `Revisa las mantas y la ropa de abrigo${c.perfil?.coche === false ? '' : ', y el kit del coche: cadenas, rascador y manta'}. Nunca braseros ni generadores dentro de casa.`, ruta: (c) => (c.perfil?.coche === false ? '#/emergencia/ola-frio' : '#/check/vehiculo') },
  { id: 'primavera', meses: [3, 4], ic: '🌧', t: 'Primavera: tormentas y lluvias', d: () => 'Limpia desagües y canalones, y repasa qué hacer en una inundación.', ruta: () => '#/emergencia/inundacion' },
  { id: 'verano', meses: [6, 7], ic: '🌡', t: 'Llega el calor', d: (c) => `Repasa el plan de ola de calor${c.perfil?.mayores || c.perfil?.bebes ? ', sobre todo por los mayores y los bebés' : ''}, y ten agua de más.`, ruta: () => '#/emergencia/ola-calor' },
  { id: 'incendios', meses: [7, 8, 9], ic: '🔥', t: 'Temporada de incendios', d: (c) => (c.perfil?.entorno && c.perfil.entorno !== 'ciudad' ? 'Monte limpio alrededor de casa y la mochila junto a la puerta.' : 'Si vas al campo: nada de fuego y atención a los avisos.'), ruta: () => '#/emergencia/incendio-forestal' },
  { id: 'otono', meses: [9, 10, 11], ic: '🌊', t: 'Otoño: temporada de DANA', d: (c) => (c.perfil?.zona === 'mediterraneo' ? 'En tu zona es la época de más riesgo: repasa el plan de inundación y no aparques en ramblas.' : 'Lluvias fuertes: repasa qué hacer si se inunda la calle.'), ruta: () => '#/sec/simulacros/dana' },
];

/** Clave de una temporada en un año (el invierno de enero cuenta como el del año anterior). */
export function claveTemporada(t, fecha) {
  const m = fecha.getMonth() + 1;
  const y = t.id === 'invierno' && m <= 2 ? fecha.getFullYear() - 1 : fecha.getFullYear();
  return `temp-${t.id}-${y}`;
}

/**
 * Recordatorios que tocan ahora, del más urgente al menos.
 * ctx = { plan: bool, perfil, agua (l), checks (n.º marcados), efectivoTs (último recuento),
 *         hechos: { id: ts } }
 */
export function recordatoriosPendientes(ctx = {}, ahora = Date.now()) {
  const hechos = ctx.hechos || {};
  const fecha = new Date(ahora);
  const out = [];
  for (const t of TEMPORADA) {
    if (!t.meses.includes(fecha.getMonth() + 1)) continue;
    const id = claveTemporada(t, fecha);
    if (hechos[id]) continue;
    out.push({ id, ic: t.ic, t: t.t, d: t.d(ctx), ruta: t.ruta(ctx), temporada: true, retraso: 0 });
  }
  for (const r of PERIODICOS) {
    if (!r.si(ctx)) continue;
    const ultima = Math.max(hechos[r.id] || 0, r.desde ? r.desde(ctx) || 0 : 0);
    // Nunca hecho: aparece, pero detrás de los que llevan retraso.
    const retraso = ultima ? (ahora - ultima) / DIA - r.cada : -1;
    if (ultima && retraso < 0) continue;
    out.push({ id: r.id, ic: r.ic, t: r.t, d: r.d, ruta: r.ruta, retraso, nunca: !ultima });
  }
  return out.sort((a, b) => (Number(!!b.temporada) - Number(!!a.temporada)) || (b.retraso - a.retraso));
}
