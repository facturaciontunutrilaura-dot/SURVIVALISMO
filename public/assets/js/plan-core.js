/* =========================================================================
   plan-core.js — TU PLAN A MEDIDA y TU SIGUIENTE PASO (cálculos)
   Módulo PURO: sin pantalla ni almacenamiento, se prueba solo.
   ========================================================================= */
import { PERFIL_INICIAL, CONSUMO, ZONAS, RIESGO_T, EFECTIVO_POR_PERSONA } from '../../data/content/miplan.js';

const ent = (v, max = 20) => Math.max(0, Math.min(max, Math.floor(Number(v) || 0)));

/** Perfil limpio (números enteros, valores conocidos). */
export function normalizarPerfil(p = {}) {
  const r = { ...PERFIL_INICIAL, ...p };
  for (const k of ['adultos', 'ninos', 'bebes', 'mayores', 'mascotas']) r[k] = ent(r[k]);
  for (const k of ['medicacion', 'frio', 'electro', 'movilidad', 'coche']) r[k] = !!r[k];
  if (!r.medicacion) r.frio = false;
  if (!ZONAS[r.zona]) r.zona = PERFIL_INICIAL.zona;
  return r;
}

export const personas = (p) => p.adultos + p.ninos + p.bebes + p.mayores;

/** Agua (l) y energía (kcal) al día del hogar y para 3 y 7 días. */
export function necesidadesPlan(perfil) {
  const p = normalizarPerfil(perfil);
  let agua = 0, kcal = 0;
  for (const [k, c] of Object.entries(CONSUMO)) { agua += p[k] * c.agua; kcal += p[k] * c.kcal; }
  return {
    aguaDia: agua, kcalDia: kcal,
    agua3: Math.ceil(agua * 3), agua7: Math.ceil(agua * 7),
    kcal3: kcal * 3, kcal7: kcal * 7,
    efectivo: Math.max(1, personas(p)) * EFECTIVO_POR_PERSONA,
  };
}

/** Riesgos que te tocan, del más al menos importante, con el porqué. */
export function riesgosPlan(perfil) {
  const p = normalizarPerfil(perfil);
  const m = new Map();
  const add = (id, peso, por) => {
    const x = m.get(id) || { id, t: RIESGO_T[id] || id, peso: 0, por: [] };
    x.peso += peso; if (por && !x.por.includes(por)) x.por.push(por);
    m.set(id, x);
  };
  add('apagon', 3, 'Puede pasar en cualquier zona de España');
  ZONAS[p.zona].riesgos.forEach((id, i) => add(id, 4 - i * 0.5, `Frecuente en ${ZONAS[p.zona].c}`));
  if (p.electro) add('apagon', 6, 'Alguien depende de un aparato eléctrico');
  if (p.frio) add('apagon', 2, 'Hay medicación que necesita frío');
  if (p.vivienda === 'piso-bajo') add('inundacion', 3, 'Vives a pie de calle o por debajo');
  if (p.vivienda === 'piso-alto') { add('apagon', 2, 'Sin luz no hay ascensor'); add('falta-agua', 2, 'Sin luz, las bombas no suben el agua a los pisos altos'); }
  if (p.vivienda === 'casa') add('incendio-vivienda', 2, 'Chimenea, estufas e instalación propia');
  if (p.entorno === 'campo') { add('incendio-forestal', 3, 'Vives junto al monte o el campo'); add('aislamiento', 2, 'Si se cortan los caminos, la ayuda tarda más'); }
  if (p.entorno === 'pueblo') add('aislamiento', 1, 'Los servicios quedan más lejos');
  if (p.mayores || p.bebes) { add('ola-calor', 2, 'Los mayores y los bebés lo sufren más'); if (['interior', 'montana', 'norte'].includes(p.zona)) add('ola-frio', 1, 'Los mayores y los bebés lo sufren más'); }
  if (!p.coche) add('evacuacion', 1, 'Sin coche, una evacuación hay que planearla antes');
  return [...m.values()].sort((a, b) => b.peso - a.peso);
}

/** Lista de preparación ordenada por prioridad. `pr`: critico | importante | recomendado. */
export function tareasPlan(perfil) {
  const p = normalizarPerfil(perfil);
  const n = necesidadesPlan(p);
  const nb = p.bebes;
  const riesgos = new Set(riesgosPlan(p).slice(0, 5).map((r) => r.id));
  const t = [];
  const add = (id, pr, tx, d, ruta) => t.push({ id, pr, t: tx, d, ruta });

  add('agua', 'critico', `Agua para 3 días: ${n.agua3} litros`, `Unos ${String(n.aguaDia).replace('.', ',')} litros al día para tu hogar: beber, cocinar y aseo mínimo.`, '#/sec/despensa-calc');
  add('comida', 'critico', 'Comida para 3 días que no necesite nevera', `Unas ${Math.round(n.kcalDia / 100) * 100} kcal al día: conservas, legumbre cocida, frutos secos, galletas, leche UHT.`, '#/sec/despensa-calc');
  add('contactos', 'critico', 'Contactos de emergencia apuntados', 'Al menos uno de la familia y otro que viva fuera de tu zona.', '#/sec/plan-familiar');
  if (p.medicacion) add('medicacion', 'critico', 'Reserva de medicación para al menos 7 días', 'Con la lista de medicamentos y dosis apuntada en tu plan. Pregunta a tu médico o farmacia cómo tener reserva.', '#/sec/plan-familiar');
  if (p.frio) add('frio', 'critico', 'Nevera portátil y acumuladores de frío', 'Para la insulina u otros medicamentos que necesitan frío si se va la luz. Pregunta en tu farmacia cuánto aguantan fuera de la nevera.', null);
  if (p.electro) add('electro', 'critico', 'Plan para el aparato eléctrico (oxígeno, CPAP…)', 'Batería de respaldo, autonomía apuntada y a qué hospital ir. Comunica a tu compañía eléctrica y a tu centro de salud que hay un paciente que depende de electricidad.', null);
  if (nb) add('bebe', 'critico', `Kit del bebé para 3 días${nb > 1 ? ` (×${nb})` : ''}`, `Unos ${24 * nb} pañales, toallitas, leche de fórmula lista para tomar o en polvo con agua embotellada, biberones y una muda.`, null);
  if (p.movilidad || (p.mayores && p.vivienda === 'piso-alto')) add('movilidad', 'critico', 'Quién ayuda a bajar si no funciona el ascensor', 'Habla con un vecino o familiar y apuntadlo. Ten una silla de evacuación o una manta resistente si hace falta.', '#/sec/plan-familiar');
  add('luz', 'importante', 'Linterna, pilas y radio a pilas o de dinamo', 'Una linterna por persona, pilas de repuesto y una radio para oír a las autoridades sin Internet.', '#/check/apagon');
  add('efectivo', 'importante', `Efectivo en billetes pequeños: unos ${n.efectivo} €`, 'Sin luz, los datáfonos y los cajeros no funcionan.', '#/sec/efectivo');
  add('encuentro', 'importante', 'Punto de encuentro acordado', 'Uno cerca de casa y otro fuera del barrio, por si no podéis volver.', '#/sec/plan-familiar');
  add('mochila', 'importante', 'Mochila de evacuación preparada', 'Agua, comida, linterna, botiquín, documentos, cargador y ropa. Junto a la puerta.', '#/check/bob');
  add('botiquin', 'importante', 'Botiquín revisado', 'Con lo básico y sin caducar.', '#/check/botiquin');
  if (p.mayores) add('mayores', 'importante', 'Gafas, audífonos y pilas de repuesto para los mayores', 'Y su lista de medicación y el teléfono de su centro de salud.', null);
  if (p.mascotas) add('mascotas', 'importante', `Kit de ${p.mascotas > 1 ? 'las mascotas' : 'la mascota'} para 3 días`, `Comida, ${3 * p.mascotas} l de agua, transportín o correa, cartilla y una foto reciente.`, '#/check/mascotas');
  if (p.coche) add('coche', 'importante', 'Coche: depósito por encima de la mitad y kit', 'Manta, agua, linterna, cargador, chaleco y, en invierno, cadenas.', '#/check/vehiculo');
  else add('sin-coche', 'importante', 'Cómo saldríais sin coche', 'Transporte público, un vecino o familiar con coche, o a pie: decidid la ruta antes.', '#/sec/evacuacion');
  if (p.vivienda === 'piso-alto') add('agua-extra', 'importante', 'Agua extra por vivir en un piso alto', 'Sin luz, las bombas no suben el agua: llena garrafas o la bañera al primer aviso de apagón largo.', '#/emergencia/falta-agua');
  if (p.vivienda === 'piso-bajo') add('inundacion-casa', 'importante', 'Preparado contra el agua', 'Documentos y lo de valor en alto; bolsas o tablas para tapar la puerta; sabe cómo cortar la luz.', '#/emergencia/inundacion');
  if (p.vivienda === 'casa') add('incendio-casa', 'importante', 'Detector de humo y extintor', 'Y revisa la chimenea, la estufa y la instalación de gas una vez al año.', '#/check/casa');
  if (riesgos.has('incendio-forestal') && p.entorno !== 'ciudad') add('franja', 'importante', 'Monte limpio alrededor de la casa', 'Sin leña ni maleza pegada a la vivienda y la mochila lista en verano.', '#/emergencia/incendio-forestal');
  if (riesgos.has('ola-calor')) add('calor', 'recomendado', 'Plan de calor', 'La habitación más fresca, persianas, ventilador a pilas y agua de más para los mayores y los niños.', '#/emergencia/ola-calor');
  if (riesgos.has('nevada') || riesgos.has('ola-frio')) add('frio-casa', 'recomendado', 'Plan de frío', 'Mantas, ropa de abrigo y calefacción alternativa SEGURA (nunca brasero ni generador dentro de casa).', '#/emergencia/ola-frio');
  if (riesgos.has('inundacion') && p.vivienda !== 'piso-bajo') add('zona-alta', 'recomendado', 'Sabe cuál es la zona alta más cercana', 'Y cómo llegar a pie: en una DANA el coche es una trampa.', '#/emergencia/inundacion');
  if (p.ninos) add('ninos', 'recomendado', 'Los niños saben el 112 y el punto de encuentro', 'Y llevan una tarjeta con un teléfono de la familia. Practicad un simulacro juntos.', '#/sec/simulacros');
  add('documentos', 'recomendado', 'Copia de los documentos', 'DNI, tarjeta sanitaria y seguros: en papel en la mochila y en el móvil.', '#/sec/herramientas/tarjeta');
  add('rutas', 'recomendado', 'Una ruta a pie para volver a casa', 'Desde el trabajo o el colegio, por si no hay transporte.', '#/sec/volver');
  return t;
}

/* ------------------------------ Tu siguiente paso ------------------------------
   Una sola tarea concreta cada vez. Cruza el plan con lo que hay apuntado en
   la app: despensa (agua y kcal), efectivo, contactos, punto de encuentro,
   rutas e información médica.
   datos = { aguaL, kcal, efectivo (€), contactos, externo, encuentro, rutas,
             medico, hechos: {id: ts}, pospuestos: {id: ts} } */
const POSPONER = 7 * 86400000;
const num = (x) => (Number.isFinite(Number(x)) ? Number(x) : 0);
const es = (x) => String(x).replace('.', ',');

export function siguientePaso(perfil, datos = {}, ahora = Date.now()) {
  const hechos = datos.hechos || {}, posp = datos.pospuestos || {};
  const libre = (id) => !(posp[id] && ahora - posp[id] < POSPONER);
  if (!perfil) return { id: 'plan', t: 'Haz tu plan a medida en 2 minutos', d: 'Unas pocas preguntas y la app ordena tu preparación, calcula el agua y la comida y te dice qué riesgos te tocan.', ruta: '#/sec/mi-plan', boton: 'Empezar' };
  const p = normalizarPerfil(perfil);
  const n = necesidadesPlan(p);
  const agua = num(datos.aguaL), kcal = num(datos.kcal);
  const cand = [];
  const c = (id, ok, paso) => { if (!ok && libre(id)) cand.push({ id, ...paso }); };

  c('contactos', num(datos.contactos) > 0, { t: 'No tienes ningún contacto de emergencia apuntado', d: 'Apunta al menos uno de la familia: lo tendrás en SOS a un toque.', ruta: '#/sec/plan-familiar', boton: 'Apuntar contactos' });
  c('agua', agua >= n.agua3, { t: `Te faltan ${es(Math.ceil(n.agua3 - agua))} litros de agua para llegar a 3 días`, d: agua ? `Tienes ${es(agua)} l apuntados; tu hogar necesita unos ${n.agua3} l para 3 días.` : `Tu hogar necesita unos ${n.agua3} l para 3 días. Si ya tienes agua, apúntala en la despensa.`, ruta: '#/sec/despensa-calc', boton: 'Apuntar el agua' });
  if (p.medicacion) c('medico', !!datos.medico, { t: 'Apunta la medicación y las dosis', d: 'En el plan familiar, en «Información médica». Aparecerá en SOS para dárselo al 112.', ruta: '#/sec/plan-familiar', boton: 'Apuntarla' });
  c('comida', kcal >= n.kcal3, { t: `Te falta comida para llegar a 3 días`, d: `Faltan unas ${Math.ceil((n.kcal3 - kcal) / 100) * 100} kcal: por ejemplo, ${Math.ceil((n.kcal3 - kcal) / 360)} botes de legumbre cocida o su equivalente.`, ruta: '#/sec/despensa-calc', boton: 'Apuntar la comida' });
  c('efectivo', num(datos.efectivo) > 0, { t: 'No tienes efectivo apuntado', d: `Sin luz no funcionan ni cajeros ni datáfonos. Para tu hogar, unos ${n.efectivo} € en billetes pequeños.`, ruta: '#/sec/efectivo', boton: 'Apuntar efectivo' });
  c('externo', !!datos.externo, { t: 'Añade un contacto que viva fuera de tu zona', d: 'Si la red local se satura, a menudo es más fácil llamar lejos: os sirve de punto de contacto.', ruta: '#/sec/plan-familiar', boton: 'Añadirlo' });
  c('encuentro', !!datos.encuentro, { t: 'Decidid un punto de encuentro', d: 'Por si no podéis volver a casa: uno cerca y otro fuera del barrio.', ruta: '#/sec/plan-familiar', boton: 'Decidirlo' });
  if (cand.length) return { ...cand[0], quedan: cand.length };

  const conDatos = new Set(['agua', 'comida', 'contactos', 'efectivo', 'encuentro']);
  const tareas = tareasPlan(p).filter((x) => !conDatos.has(x.id) && !(x.id === 'rutas' && datos.rutas));
  const pendiente = (pr) => tareas.find((x) => x.pr === pr && !hechos[x.id] && libre(x.id));
  const x = pendiente('critico') || pendiente('importante');
  if (x) return { id: x.id, t: x.t, d: x.d, ruta: x.ruta, marcar: true, boton: 'Ver cómo' };
  c('agua7', agua >= n.agua7, { t: `Siguiente objetivo: agua para una semana (te faltan ${es(Math.ceil(n.agua7 - agua))} l)`, d: 'Ya cubres 72 horas. Una semana te da margen ante cortes largos.', ruta: '#/sec/despensa-calc', boton: 'Apuntar el agua' });
  c('comida7', kcal >= n.kcal7, { t: 'Siguiente objetivo: comida para una semana', d: `Faltan unas ${Math.ceil((n.kcal7 - kcal) / 100) * 100} kcal.`, ruta: '#/sec/despensa-calc', boton: 'Apuntar la comida' });
  if (cand.length) return cand[0];
  const r = pendiente('recomendado');
  if (r) return { id: r.id, t: r.t, d: r.d, ruta: r.ruta, marcar: true, boton: 'Ver cómo' };
  return { id: 'fin', t: '¡Lo tienes todo al día!', d: 'Repasa tu plan cada pocos meses y practica un simulacro en familia.', ruta: '#/sec/simulacros', boton: 'Hacer un simulacro', fin: true };
}

/** Progreso del plan: tareas cubiertas (por datos o marcadas) sobre el total. */
export function progresoPlan(perfil, datos = {}) {
  const p = normalizarPerfil(perfil);
  const n = necesidadesPlan(p);
  const hechos = datos.hechos || {};
  const porDatos = {
    agua: num(datos.aguaL) >= n.agua3, comida: num(datos.kcal) >= n.kcal3, contactos: num(datos.contactos) > 0,
    efectivo: num(datos.efectivo) > 0, encuentro: !!datos.encuentro, rutas: !!datos.rutas,
  };
  const soloDatos = new Set(['agua', 'comida', 'contactos', 'efectivo', 'encuentro']);
  const tareas = tareasPlan(p).map((x) => ({ ...x, auto: soloDatos.has(x.id), ok: !!porDatos[x.id] || (!soloDatos.has(x.id) && !!hechos[x.id]) }));
  return { tareas, hechas: tareas.filter((x) => x.ok).length, total: tareas.length };
}
