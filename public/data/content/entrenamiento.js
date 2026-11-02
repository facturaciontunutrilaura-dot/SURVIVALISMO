/* =========================================================================
   ENTRENAMIENTO EN CASA — sin material o con muy poco
   ---------------------------------------------------------------------------
   Forma física útil en una emergencia: levantarse del suelo, cargar agua,
   caminar con mochila, subir escaleras. Cinco niveles, de principiante a
   extremo, y planes de 2, 3, 4 o 5 días por semana.

   Cada PATRÓN de movimiento tiene una escalera de 5 ejercicios: el nivel
   elige el peldaño. `con` es la variante con poco material (mochila con
   peso, garrafas de agua, silla, toalla); si no hay `con`, se hace igual.
   Sin cifras de calorías ni objetivos de peso: el objetivo es la capacidad.
   ========================================================================= */

export const NIVELES = [
  { n: 1, t: 'Principiante', d: 'Empiezas de cero o vuelves tras mucho tiempo.', series: 2, reps: '8–10', seg: 20, descanso: 90, rpe: [5, 6] },
  { n: 2, t: 'Básico', d: 'Haces algo de actividad, pero sin rutina.', series: 3, reps: '10–12', seg: 30, descanso: 75, rpe: [6, 7] },
  { n: 3, t: 'Intermedio', d: 'Entrenas con regularidad desde hace meses.', series: 3, reps: '12–15', seg: 40, descanso: 60, rpe: [7, 7] },
  { n: 4, t: 'Avanzado', d: 'Llevas tiempo entrenando fuerte.', series: 4, reps: '12–15', seg: 45, descanso: 45, rpe: [7, 8] },
  { n: 5, t: 'Extremo', d: 'Para quien ya domina el nivel avanzado. Incluye un final de alta intensidad.', series: 5, reps: '15–20', seg: 50, descanso: 30, rpe: [8, 9] },
];

/* Escala de esfuerzo percibido (RPE) que se pide al terminar. */
export const RPE = [
  [3, 'Muy fácil'], [5, 'Cómodo'], [6, 'Algo exigente'], [7, 'Exigente'], [8, 'Duro'], [9, 'Muy duro'], [10, 'Al límite'],
];

/* Patrones de movimiento. `tiempo`: se mide en segundos, no en repeticiones. */
export const PATRONES = {
  piernas: {
    t: 'Piernas', tiempo: false,
    escalera: [
      { t: 'Sentadilla a una silla', como: 'Siéntate y levántate de una silla sin ayudarte con las manos.', clave: 'Rodillas en la dirección de los pies.' },
      { t: 'Sentadilla', como: 'Baja como si fueras a sentarte, con el pecho alto, y sube empujando el suelo.', clave: 'Talones apoyados todo el tiempo.' },
      { t: 'Zancada atrás alterna', como: 'Da un paso atrás y baja la rodilla casi al suelo; vuelve y cambia de pierna.', clave: 'El tronco, recto.', con: 'Zancada atrás con una garrafa de 5 l en cada mano' },
      { t: 'Sentadilla búlgara', como: 'Pie de atrás sobre una silla; baja con la pierna de delante. Las repeticiones son por pierna.', clave: 'Silla contra la pared para que no se mueva.', con: 'Sentadilla búlgara con mochila cargada' },
      { t: 'Sentadilla con salto', como: 'Sentadilla y salto vertical; aterriza suave y encadena.', clave: 'Aterriza con las rodillas flexionadas; sin dolor de rodilla.', con: 'Sentadilla búlgara con salto o con mochila pesada' },
    ],
  },
  bisagra: {
    t: 'Cadera y espalda baja', tiempo: false,
    escalera: [
      { t: 'Puente de glúteo', como: 'Tumbado boca arriba, rodillas dobladas: sube la cadera y aprieta glúteos.', clave: 'Sin arquear la zona lumbar.' },
      { t: 'Puente de glúteo a una pierna', como: 'Igual, con una pierna estirada. Las repeticiones son por pierna.', clave: 'La cadera no se inclina.' },
      { t: 'Buenos días', como: 'De pie, manos en el pecho: inclina el tronco con la espalda recta y vuelve.', clave: 'El movimiento sale de la cadera, no de la espalda.', con: 'Buenos días con mochila cargada al pecho' },
      { t: 'Peso muerto a una pierna', como: 'Sobre una pierna, inclínate llevando la otra atrás, con la espalda recta.', clave: 'Apóyate en la pared si pierdes el equilibrio.', con: 'Peso muerto a una pierna con garrafa de 5 l' },
      { t: 'Puente a una pierna con pie elevado', como: 'Puente a una pierna con el talón sobre una silla o el sofá.', clave: 'Pausa de 2 s arriba.', con: 'Peso muerto a una pierna con mochila pesada' },
    ],
  },
  empuje: {
    t: 'Empuje: pecho, hombros y brazos', tiempo: false,
    escalera: [
      { t: 'Flexiones en la pared', como: 'De pie, manos en la pared a la altura del pecho: acerca el pecho y empuja.', clave: 'Cuerpo en línea recta.' },
      { t: 'Flexiones inclinadas', como: 'Manos en una mesa o encimera estable.', clave: 'Cuanto más baja la superficie, más difícil.' },
      { t: 'Flexiones con rodillas', como: 'Rodillas en el suelo, cuerpo recto de rodillas a cabeza.', clave: 'Codos a unos 45° del cuerpo.' },
      { t: 'Flexiones', como: 'Pecho casi al suelo y arriba, sin hundir la cadera.', clave: 'Si no completas las repeticiones, termina con rodillas.' },
      { t: 'Flexiones con pies elevados', como: 'Pies sobre una silla o un escalón.', clave: 'Cadera firme; abdomen apretado.', con: 'Flexiones con mochila cargada a la espalda' },
    ],
  },
  tiron: {
    t: 'Tirón: espalda y brazos', tiempo: false,
    escalera: [
      { t: 'Superman alterno', como: 'Boca abajo: levanta brazo y pierna contrarios, sostén 2 s y cambia.', clave: 'Mirada al suelo; cuello largo.', con: 'Remo con una mano con una garrafa de 5 l, la otra apoyada en una silla' },
      { t: 'Y-T-W tumbado', como: 'Boca abajo, sube los brazos formando una Y, luego una T y una W. Cada letra cuenta una repetición.', clave: 'Junta los omóplatos.', con: 'Remo con una mano con mochila de 5–8 kg' },
      { t: 'Remo con toalla en el suelo', como: 'Sentado, toalla bajo los pies: tira de los extremos hacia el ombligo haciendo fuerza contra ti mismo, 3 s por repetición.', clave: 'Codos pegados; hombros abajo.', con: 'Remo con las dos manos con mochila de 8–12 kg, tronco inclinado' },
      { t: 'Remo invertido bajo una mesa', como: 'Tumbado bajo una mesa ROBUSTA, agarra el borde y sube el pecho hacia ella.', clave: 'Comprueba antes que la mesa aguanta tu peso y no vuelca.' },
      { t: 'Remo invertido con pies elevados', como: 'Igual, con los pies sobre una silla.', clave: 'Solo con una mesa muy estable.', con: 'Remo invertido con mochila a la espalda' },
    ],
  },
  core: {
    t: 'Abdomen y estabilidad', tiempo: true,
    escalera: [
      { t: 'Plancha con rodillas', como: 'Antebrazos y rodillas en el suelo, cuerpo recto.', clave: 'Respira; no aguantes el aire.' },
      { t: 'Plancha', como: 'Antebrazos y puntas de los pies; cuerpo como una tabla.', clave: 'Ni cadera alta ni hundida.' },
      { t: 'Plancha lateral', como: 'Sobre un antebrazo y el lateral del pie. El tiempo es por lado.', clave: 'Cadera alta.' },
      { t: 'Barca (hollow)', como: 'Boca arriba, despega hombros y piernas del suelo y sostén.', clave: 'La zona lumbar pegada al suelo.' },
      { t: 'Plancha con toque de hombro', como: 'En plancha alta, toca el hombro contrario sin que la cadera se balancee.', clave: 'Pies separados para más estabilidad.', con: 'Plancha con mochila cargada en la espalda' },
    ],
  },
  cardio: {
    t: 'Resistencia', tiempo: true,
    escalera: [
      { t: 'Marcha en el sitio', como: 'Rodillas altas y braceo, a ritmo vivo.', clave: 'Puedes hablar con frases cortas.' },
      { t: 'Saltos de tijera sin salto', como: 'Abre una pierna al lado mientras subes los brazos, y alterna.', clave: 'Sin impacto: ideal en un piso.' },
      { t: 'Escaladores', como: 'En plancha alta, lleva las rodillas al pecho alternando.', clave: 'Hombros encima de las manos.' },
      { t: 'Burpees sin flexión', como: 'Manos al suelo, pies atrás, pies adelante y de pie.', clave: 'Controla la bajada.' },
      { t: 'Burpees completos', como: 'Con flexión y salto al final.', clave: 'Si la técnica se rompe, para.' },
    ],
  },
  carga: {
    t: 'Carga: como en una evacuación', tiempo: true,
    escalera: [
      { t: 'Subir y bajar un escalón', como: 'Sube y baja un escalón o el primer tramo de escalera.', clave: 'Agárrate a la barandilla.', con: 'Paseo con una garrafa de 5 l en cada mano' },
      { t: 'Subir y bajar un escalón, más rápido', como: 'Alterna la pierna que sube primero.', clave: 'Sin correr.', con: 'Paseo con dos garrafas de 5 l y mochila ligera' },
      { t: 'Escaleras a paso vivo', como: 'Sube y baja escaleras de tu edificio.', clave: 'Agárrate a la barandilla.', con: 'Escaleras con mochila de 8–10 kg' },
      { t: 'Escaleras de dos en dos', como: 'Sube de dos en dos y baja de uno en uno.', clave: 'Baja siempre despacio.', con: 'Paseo con mochila de 12–15 kg y garrafas' },
      { t: 'Escaleras con sentadilla en cada rellano', como: 'Escaleras a paso vivo y 5 sentadillas en cada rellano.', clave: 'Lo más exigente: solo nivel extremo.', con: 'Escaleras con mochila de 15 kg o más' },
    ],
  },
};

/* Sesiones: lista de patrones; `-1` = un peldaño más fácil (para más volumen). */
export const SESIONES = {
  A: { t: 'Cuerpo completo A', ejercicios: [['piernas'], ['empuje'], ['bisagra'], ['tiron'], ['core']] },
  B: { t: 'Cuerpo completo B', ejercicios: [['bisagra'], ['empuje'], ['piernas'], ['tiron'], ['cardio']] },
  C: { t: 'Cuerpo completo C', ejercicios: [['piernas'], ['tiron'], ['empuje'], ['core'], ['carga']] },
  SUP: { t: 'Tren superior', ejercicios: [['empuje'], ['tiron'], ['empuje', -1], ['tiron', -1], ['core']] },
  INF: { t: 'Tren inferior', ejercicios: [['piernas'], ['bisagra'], ['piernas', -1], ['carga'], ['core']] },
  EMP: { t: 'Empuje y abdomen', ejercicios: [['empuje'], ['empuje', -1], ['core'], ['cardio']] },
  TIR: { t: 'Tirón y espalda', ejercicios: [['tiron'], ['bisagra'], ['tiron', -1], ['core']] },
  PIE: { t: 'Piernas y carga', ejercicios: [['piernas'], ['bisagra'], ['piernas', -1], ['carga']] },
  RES: { t: 'Resistencia en circuito', ejercicios: [['cardio'], ['piernas', -1], ['empuje', -1], ['cardio'], ['core']], circuito: true },
};

/* Planes por días a la semana, con el reparto recomendado. */
export const PLANES = {
  2: { sesiones: ['A', 'B'], reparto: 'Lunes y jueves (deja 2–3 días entre sesiones).' },
  3: { sesiones: ['A', 'B', 'C'], reparto: 'Lunes, miércoles y viernes.' },
  4: { sesiones: ['SUP', 'INF', 'SUP', 'INF'], reparto: 'Lunes, martes, jueves y viernes.' },
  5: { sesiones: ['EMP', 'PIE', 'TIR', 'RES', 'A'], reparto: 'De lunes a viernes; fin de semana de descanso activo (caminar).' },
};

export const CALENTAMIENTO = [
  'Movilidad: círculos de cuello, hombros, cadera, rodillas y tobillos (1 min).',
  'Marcha en el sitio subiendo poco a poco el ritmo (2 min).',
  '10 sentadillas suaves y 10 flexiones en la pared (1 min).',
];
export const VUELTA_CALMA = [
  'Caminar despacio por casa hasta que la respiración se normalice (1–2 min).',
  'Estiramientos suaves de piernas, pecho y espalda: 20–30 s cada uno, sin rebotes.',
];
/* Final de alta intensidad del nivel extremo. */
export const FINAL_EXTREMO = 'Final: 8 minutos EMOM (al inicio de cada minuto): 6 burpees completos + 6 sentadillas con salto; el resto del minuto, descanso.';

export const ANTES_DE_EMPEZAR = [
  'Si tienes una enfermedad del corazón, hipertensión no controlada, una lesión, estás embarazada o has tenido una operación reciente, consulta antes con tu médico.',
  'Para si notas dolor en el pecho, mareo, falta de aire desproporcionada o dolor articular agudo.',
  'La técnica va antes que la cantidad: si una repetición sale mal, ya no cuenta.',
  'Bebe agua y descansa bien. El progreso llega con la constancia, no con el agotamiento.',
];
