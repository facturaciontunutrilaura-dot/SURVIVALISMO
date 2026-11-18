/* =========================================================================
   TU PLAN A MEDIDA — datos
   ---------------------------------------------------------------------------
   Reglas pensadas por nosotros (como Alex): sin Internet ni IA. Con unas
   pocas respuestas (personas, bebés, mayores, mascotas, medicación,
   vivienda, coche y zona) la app ordena la preparación por prioridad,
   calcula el agua y la comida y dice qué riesgos te tocan.
   Las cantidades son orientativas y redondeadas al alza.
   ========================================================================= */

/** Respuestas por defecto del asistente. */
export const PERFIL_INICIAL = {
  adultos: 2, ninos: 0, bebes: 0, mayores: 0, mascotas: 0,
  medicacion: false, frio: false, electro: false, movilidad: false,
  vivienda: 'piso-medio', coche: true, zona: 'interior', entorno: 'ciudad',
};

/** Agua (litros al día) y energía (kcal al día) por tipo de persona.
 *  Agua: bebida + cocina e higiene mínima. Bebé: preparar biberones y aseo.
 *  Mascota: un perro mediano; un gato bebe bastante menos. */
export const CONSUMO = {
  adultos: { agua: 3, kcal: 2200, t: 'adulto', tp: 'adultos' },
  mayores: { agua: 3, kcal: 1800, t: 'persona mayor', tp: 'personas mayores' },
  ninos: { agua: 2, kcal: 1600, t: 'niño o niña', tp: 'niños' },
  bebes: { agua: 1.5, kcal: 800, t: 'bebé', tp: 'bebés' },
  mascotas: { agua: 1, kcal: 0, t: 'mascota', tp: 'mascotas' },
};

export const VIVIENDAS = [
  ['piso-bajo', 'Piso bajo, semisótano o planta calle'],
  ['piso-medio', 'Piso (1.ª a 4.ª planta)'],
  ['piso-alto', 'Piso alto (5.ª planta o más)'],
  ['casa', 'Casa o chalé'],
];

export const ENTORNOS = [
  ['ciudad', 'Ciudad'],
  ['pueblo', 'Pueblo'],
  ['campo', 'Campo, monte o casa aislada'],
];

/** Zonas climáticas de España: deciden qué riesgos naturales pesan más. */
export const ZONAS = {
  mediterraneo: { c: 'la costa mediterránea', t: 'Costa mediterránea y Baleares', riesgos: ['inundacion', 'ola-calor', 'incendio-forestal'] },
  norte: { c: 'el norte', t: 'Norte: Galicia, Asturias, Cantabria, País Vasco', riesgos: ['inundacion', 'tormenta', 'nevada'] },
  sur: { c: 'el sur', t: 'Sur y valle del Guadalquivir, Extremadura', riesgos: ['ola-calor', 'incendio-forestal', 'falta-agua'] },
  interior: { c: 'el interior', t: 'Interior: meseta, Aragón, Navarra, La Rioja', riesgos: ['ola-calor', 'ola-frio', 'nevada', 'incendio-forestal'] },
  montana: { c: 'la montaña', t: 'Montaña (Pirineos, Sistema Central, Ibérico…)', riesgos: ['nevada', 'ola-frio', 'aislamiento', 'incendio-forestal'] },
  canarias: { c: 'Canarias', t: 'Canarias', riesgos: ['incendio-forestal', 'ola-calor', 'evacuacion'] },
};

/** Zona que se propone según la provincia guardada (código INE). */
export const PROV_ZONA = {
  '03': 'mediterraneo', '04': 'mediterraneo', '07': 'mediterraneo', '08': 'mediterraneo', '12': 'mediterraneo',
  '17': 'mediterraneo', '29': 'mediterraneo', '30': 'mediterraneo', '43': 'mediterraneo', '46': 'mediterraneo',
  '51': 'mediterraneo', '52': 'mediterraneo',
  '15': 'norte', '27': 'norte', '32': 'norte', '36': 'norte', '33': 'norte', '39': 'norte', '48': 'norte', '20': 'norte', '01': 'norte',
  '06': 'sur', '10': 'sur', '11': 'sur', '14': 'sur', '18': 'sur', '21': 'sur', '23': 'sur', '41': 'sur',
  '22': 'montana', '25': 'montana',
  '35': 'canarias', '38': 'canarias',
};

/** Nombres de los riesgos (los ids son los protocolos de Emergencia). */
export const RIESGO_T = {
  apagon: 'Apagón', inundacion: 'Inundación o DANA', 'ola-calor': 'Ola de calor', 'ola-frio': 'Ola de frío',
  nevada: 'Nevada o temporal', 'incendio-forestal': 'Incendio forestal', 'incendio-vivienda': 'Incendio en casa',
  tormenta: 'Tormenta fuerte', 'falta-agua': 'Corte de agua', aislamiento: 'Quedarse aislados', evacuacion: 'Evacuación',
};

/** Efectivo orientativo: billetes pequeños y monedas para unos días. */
export const EFECTIVO_POR_PERSONA = 50;
