/* =========================================================================
   COMPRA DE COLAPSO — datos
   ---------------------------------------------------------------------------
   Lista de compra urgente para quedarse en casa de 72 horas a una semana.
   Las personas del hogar las indica cada usuario y se guardan SOLO en su
   dispositivo; aquí viven la plantilla y los productos.

   Alimentos: cada uno cubre una parte (`parte`) de la energía total del
   hogar. Con sus kcal y proteína por unidad se calcula cuántas unidades
   comprar. Se priorizan productos que no necesitan nevera y, en su
   mayoría, tampoco cocina (puede no haber luz ni gas).
   ========================================================================= */

/** Factor de actividad sobre el metabolismo basal (Mifflin-St Jeor). */
export const ACTIVIDAD = {
  baja: { t: 'Baja (casi todo el día en reposo)', f: 1.4 },
  moderada: { t: 'Moderada', f: 1.6 },
  alta: { t: 'Alta (deportista o trabajo físico)', f: 1.75 },
};

/** Altura por defecto si no se indica (media aproximada de adultos en España). */
export const ALTURA_DEF = { h: 176, m: 163 };

/** Hogar inicial: dos adultos. Se puede cambiar todo y se guarda en el móvil. */
export const HOGAR_INICIAL = [
  { nombre: '', sexo: 'h', edad: 25, peso: 100, altura: '', actividad: 'alta', kcal: '' },
  { nombre: '', sexo: 'm', edad: 27, peso: 60, altura: '', actividad: 'moderada', kcal: '' },
];

export const DURACIONES = [[3, '72 horas'], [5, '5 días'], [7, '1 semana']];

/* Agua: bebida según peso + cocina e higiene mínima (por persona y día). */
export const AGUA = { mlKg: 35, minBebida: 2, maxBebida: 4, extra: 1.5, garrafa: 5, margen: 1.1 };

/* Alimentos. kcal y proteína (g) por unidad de compra; `parte` = fracción de
   la energía total. `frio`: se puede comer sin cocinar. */
export const ALIMENTOS = [
  { id: 'platos', t: 'Platos preparados en lata (fabada, lentejas, cocido)', u: 'lata de 420 g', kcal: 480, prot: 24, parte: 0.10, frio: true },
  { id: 'pescado', t: 'Atún, sardinas o caballa en aceite', u: 'pack de 3 latas', kcal: 570, prot: 60, parte: 0.10, frio: true },
  { id: 'legumbre', t: 'Garbanzos, lentejas o alubias cocidas en bote', u: 'bote de 400 g', kcal: 300, prot: 20, parte: 0.10, frio: true },
  { id: 'embutido', t: 'Embutido curado entero (chorizo, lomo, salchichón)', u: 'pieza de 250 g', kcal: 1000, prot: 60, parte: 0.08, frio: true },
  { id: 'leche', t: 'Leche UHT entera', u: 'brik de 1 l', kcal: 640, prot: 32, parte: 0.06, frio: true },
  { id: 'frutos', t: 'Frutos secos naturales o tostados', u: 'bolsa de 200 g', kcal: 1200, prot: 40, parte: 0.08, frio: true },
  { id: 'cacahuete', t: 'Crema de cacahuete', u: 'bote de 350 g', kcal: 2100, prot: 90, parte: 0.04, frio: true },
  { id: 'pan', t: 'Pan tostado, biscotes o galletas', u: 'paquete de 500 g', kcal: 2000, prot: 50, parte: 0.08, frio: true },
  { id: 'avena', t: 'Copos de avena o cereales', u: 'paquete de 500 g', kcal: 1900, prot: 65, parte: 0.05, frio: true },
  { id: 'chocolate', t: 'Chocolate negro', u: 'tableta de 150 g', kcal: 830, prot: 12, parte: 0.03, frio: true },
  { id: 'fruta', t: 'Fruta en conserva o compota', u: 'bote de 400 g', kcal: 250, prot: 2, parte: 0.03, frio: true },
  { id: 'aceite', t: 'Aceite de oliva', u: 'botella de 1 l', kcal: 8200, prot: 0, parte: 0.05, frio: true },
  { id: 'arroz', t: 'Arroz', u: 'bolsa de 1 kg', kcal: 3500, prot: 70, parte: 0.12, frio: false },
  { id: 'pasta', t: 'Pasta', u: 'paquete de 500 g', kcal: 1780, prot: 62, parte: 0.08, frio: false },
];

/* Productos que no dependen de las calorías. `cant(p, d)` recibe el número
   de personas y de días; `muj` = mujeres en edad fértil (12–55 años). */
export const GRUPOS = [
  {
    id: 'agua', t: 'Agua', ic: '💧', prioridad: 1,
    items: [
      { id: 'potabilizar', t: 'Pastillas potabilizadoras o lejía apta para agua de bebida', cant: () => '1 envase' },
    ],
  },
  {
    id: 'comida-extra', t: 'Vitaminas y fibra (fruta y verdura)', ic: '🥫', prioridad: 2,
    items: [
      { id: 'verdura', t: 'Verdura en conserva (tomate triturado, pimientos, judías verdes, maíz)', cant: (p, d) => `${p * d} botes` },
      { id: 'fruta-fresca', t: 'Fruta fresca que aguante sin nevera (manzanas, naranjas, plátanos)', cant: (p, d) => `${p * Math.min(d, 5)} piezas` },
      { id: 'basicos', t: 'Sal, azúcar o miel, café o infusiones, caldo en brik', cant: () => '1 de cada' },
    ],
  },
  {
    id: 'energia', t: 'Luz, energía y cocina', ic: '🔦', prioridad: 3,
    items: [
      { id: 'hornillo', t: 'Hornillo de camping (solo en exterior o con ventilación)', cant: () => '1' },
      { id: 'cartuchos', t: 'Cartuchos de gas para el hornillo', cant: (p, d) => `${Math.max(2, Math.ceil((p * d) / 4))}` },
      { id: 'mechero', t: 'Mecheros y cerillas', cant: () => '2 + 1 caja' },
      { id: 'frontal', t: 'Linterna frontal', cant: (p) => `${p}` },
      { id: 'pilas', t: 'Pilas AA y AAA', cant: () => '1 paquete grande de cada' },
      { id: 'radio', t: 'Radio de pilas o de dinamo', cant: () => '1' },
      { id: 'powerbank', t: 'Batería externa (20.000 mAh) cargada', cant: (p) => `${Math.max(1, p)}` },
      { id: 'velas', t: 'Velas', cant: () => '1 paquete' },
    ],
  },
  {
    id: 'salud', t: 'Farmacia e higiene', ic: '💊', prioridad: 4,
    items: [
      { id: 'medicacion', t: 'Medicación habitual de cada persona (para el doble de días)', cant: (p, d) => `${d * 2} días` },
      { id: 'botiquin', t: 'Botiquín: gasas, vendas, esparadrapo, antiséptico, analgésico, suero oral', cant: () => '1' },
      { id: 'papel', t: 'Papel higiénico', cant: (p, d) => `${Math.max(4, Math.ceil((p * d) / 2))} rollos` },
      { id: 'toallitas', t: 'Toallitas húmedas y gel hidroalcohólico', cant: (p, d) => `${Math.ceil((p * d) / 7)} + 1` },
      { id: 'jabon', t: 'Jabón y cepillo y pasta de dientes', cant: () => '1 de cada' },
      { id: 'menstrual', t: 'Productos de higiene menstrual', cant: (p, d, muj) => (muj ? `para ${muj > 1 ? `${muj} personas` : '1 persona'}, 1 ciclo completo` : null) },
      { id: 'basura', t: 'Bolsas de basura grandes (también para el WC sin agua)', cant: () => '2 rollos' },
      { id: 'mascarillas', t: 'Mascarillas FFP2 y guantes desechables', cant: () => '1 caja de cada' },
    ],
  },
  {
    id: 'otros', t: 'Otros imprescindibles', ic: '🧰', prioridad: 5,
    items: [
      { id: 'abrelatas', t: 'Abrelatas manual', cant: () => '1' },
      { id: 'desechables', t: 'Platos, vasos y cubiertos desechables', cant: (p, d) => `${p * d * 3} de cada` },
      { id: 'efectivo', t: 'Dinero en efectivo, en billetes pequeños', cant: () => 'sin tarjeta no hay pago' },
      { id: 'cinta', t: 'Cinta americana', cant: () => '1' },
      { id: 'mantas', t: 'Mantas térmicas (de emergencia)', cant: (p) => `${p}` },
    ],
  },
];

export const AVISOS_COMPRA = [
  'Compra primero el agua y la comida que se come sin cocinar: es lo que antes se agota.',
  'Las cantidades son una estimación orientativa. Si alguien tiene una enfermedad, alergias, está embarazada o sigue una pauta de alimentación, ajústalas con su profesional sanitario.',
  'El hornillo de gas, nunca en interiores cerrados: riesgo de intoxicación por monóxido de carbono.',
];
