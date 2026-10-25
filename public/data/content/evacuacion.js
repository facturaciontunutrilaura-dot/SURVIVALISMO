/* =========================================================================
   PLAN DE EVACUACIÓN — salir de Ávila hacia el resto de España o fuera
   ---------------------------------------------------------------------------
   Corredores de evacuación desde Ávila capital por escenario. El trazado de
   cada corredor pasa por las localidades indicadas (código INE). El build
   (tools/build-geo.mjs) toma su posición de la geometría municipal del IGN
   (es-atlas) y genera data/geo/evac-rutas.geojson con distancias y la
   cercanía a centrales nucleares. Es un trazado ESQUEMÁTICO por
   localidades: la carretera concreta es la que indica `via`.

   Nada de esto afirma que una carretera o una frontera vayan a estar
   abiertas: prevalecen siempre las órdenes de las autoridades.
   ========================================================================= */

export const ORIGEN = { ine: '05019', t: 'Ávila' };

/* Clases de corredor: a dónde lleva. */
export const CLASES = {
  interior: { t: 'Refugio en el interior', ic: '🏞️', color: '#A1A265', d: 'Sin salir de España: zonas rurales con agua y baja densidad, a poca distancia.' },
  portugal: { t: 'Salida a Portugal', ic: '🇵🇹', color: '#C08A52', d: 'La frontera más cercana: menos de 3 horas desde Ávila. UE y Schengen: basta el DNI.' },
  francia: { t: 'Salida a Francia', ic: '🇫🇷', color: '#7FA3B8', d: 'Por el Pirineo. UE y Schengen: basta el DNI. Trayectos largos.' },
  andorra: { t: 'Salida a Andorra', ic: '🇦🇩', color: '#B48FB8', d: 'Fuera de la UE: hay control de aduanas; el DNI es válido.' },
  mar: { t: 'Salida por mar', ic: '⛴️', color: '#E8715F', d: 'Ferris al Reino Unido o a África. Pasaporte obligatorio salvo a Ceuta.' },
};

/* Corredores. `pasos`: localidades por las que pasa, en orden (INE). */
export const CORREDORES = [
  {
    id: 'int-gredos', clase: 'interior', t: 'Sierra de Gredos · Alto Tormes',
    destino: 'Piedrahíta y El Barco de Ávila', pasos: ['05019', '05186', '05021'],
    via: 'N-110 (puerto de Villatoro)',
    pros: ['Muy cerca: alrededor de 1 hora.', 'Agua abundante (río Tormes y gargantas), ganadería y baja densidad.', 'Se puede volver a Ávila si la situación mejora.'],
    contras: ['Inviernos muy duros (más de 1.000 m): leña y abrigo imprescindibles.', 'Puerto de Villatoro (1.350 m) con nieve y hielo.', 'En verano, riesgo alto de incendio forestal.'],
    puertos: ['Villatoro'],
  },
  {
    id: 'int-tietar', clase: 'interior', t: 'Valle del Tiétar · Gredos sur',
    destino: 'Arenas de San Pedro y Candeleda', pasos: ['05019', '05132', '05014', '05047'],
    via: 'N-502 (puerto del Pico) y CL-501',
    pros: ['Clima suave, agua, huertas, frutales y castaños: el mejor sitio cercano para meses.', 'Alrededor de 1 h 15 min.'],
    contras: ['Puerto del Pico (1.395 m) con nieve.', 'Riesgo muy alto de incendio forestal en verano.', 'Es el destino cercano más próximo a la central nuclear de Almaraz.'],
    puertos: ['Pico'],
  },
  {
    id: 'pt-vilar', clase: 'portugal', t: 'Portugal · Fuentes de Oñoro – Vilar Formoso',
    destino: 'Vilar Formoso (Portugal) y la A-25 hacia Guarda', pasos: ['05019', '37274', '37107', '37140'],
    via: 'A-50 → Salamanca → A-62 → frontera → A-25 (PT)',
    alternativa: 'N-501 y N-620, en paralelo a las autovías.',
    frontera: 'Fuentes de Oñoro (ES) – Vilar Formoso (PT)',
    pros: ['La frontera más cercana: unas 2 h 30 min.', 'Autovía todo el trayecto, por la meseta (poca nieve).'],
    contras: ['Es el paso principal hacia Portugal: en una crisis general se satura pronto. Salir temprano.', 'Atraviesa Salamanca, la única ciudad grande del camino.'],
  },
  {
    id: 'pt-quintanilha', clase: 'portugal', t: 'Portugal · Alcañices – Quintanilha',
    destino: 'Bragança (Portugal), Trás-os-Montes', pasos: ['05019', '37274', '49275', '49003'],
    via: 'A-50 → Salamanca → A-66 → Zamora → N-122 → frontera → IP4/A4 (PT)',
    frontera: 'Alcañices (ES) – Quintanilha (PT)',
    pros: ['Paso secundario y poco transitado: menos colas que Vilar Formoso.', 'Zonas muy despobladas a ambos lados, lejos de objetivos estratégicos.'],
    contras: ['N-122: un carril por sentido desde Zamora.', 'En invierno, hielo y niebla en Aliste y Trás-os-Montes.'],
  },
  {
    id: 'pt-caya', clase: 'portugal', t: 'Portugal · Badajoz – Elvas (Caya)',
    destino: 'Elvas (Portugal) y el Alentejo', pasos: ['05019', '37274', '37046', '10148', '10037', '06015'],
    via: 'A-50 → Salamanca → A-66 (Béjar, Plasencia, Cáceres) → N-523 → Badajoz → frontera → A6 (PT)',
    alternativa: 'N-110 por Piedrahíta y El Barco hasta Plasencia: más corta, pero con los puertos de Villatoro y Tornavacas. Desde Cáceres, la N-521 lleva al paso de Valencia de Alcántara – Marvão.',
    frontera: 'Badajoz/Caya (ES) – Elvas (PT)',
    pros: ['Autovía casi todo el trayecto; el puerto de Béjar va por autovía.', 'Abre el sur de Portugal (Alentejo, Algarve).'],
    contras: ['Pasa a unos 50 km de la central nuclear de Almaraz: no usarlo en un accidente nuclear.', 'Calor extremo en verano en Extremadura: agua de sobra en el coche.'],
  },
  {
    id: 'pt-valenca', clase: 'portugal', t: 'Portugal · Tui – Valença (Galicia)',
    destino: 'Valença y el norte de Portugal (Minho)', pasos: ['05019', '05001', '47165', '49021', '49166', '32054', '36055'],
    via: 'N-403 → A-6 → Benavente → A-52 (Sanabria, Ourense) → A-55 → Tui → frontera',
    frontera: 'Tui (ES) – Valença (PT)',
    pros: ['Galicia y el Minho: lluvia, agua y agricultura.', 'Alternativa si los pasos de Castilla están saturados.'],
    contras: ['Trayecto largo.', 'Puertos de la A-52 (Padornelo y A Canda) con nieve.'],
    puertos: ['Padornelo', 'A Canda'],
  },
  {
    id: 'fr-irun', clase: 'francia', t: 'Francia · Irún – Hendaya',
    destino: 'Hendaya (Francia) y la A-63 hacia Burdeos', pasos: ['05019', '05001', '47165', '47186', '09059', '09219', '01059', '31010', '20071', '20069', '20045'],
    via: 'N-403 → A-6 → A-62 (Valladolid, Burgos) → AP-1/A-1 (Vitoria) → A-1 (Etxegarate) → AP-8 → frontera',
    alternativa: 'Desde Burgos, la AP-68/A-68 hasta Bilbao y la AP-8 por la costa.',
    frontera: 'Irún (ES) – Hendaya (FR)',
    pros: ['Autovía todo el trayecto.', 'Es el paso a Francia más directo desde Ávila.'],
    contras: ['Puerto de Etxegarate (A-1) con nieve.', 'El tramo final, en el País Vasco, está muy poblado y se satura.'],
    puertos: ['Etxegarate'],
  },
  {
    id: 'fr-somport', clase: 'francia', t: 'Francia · túnel de Somport (Canfranc)',
    destino: 'Valle de Aspe y Pau (Francia)', pasos: ['05019', '40194', '42173', '42004', '50251', '50297', '22125', '22130', '22078'],
    via: 'N-110 (Segovia, Soria) → N-122 (Ágreda, Tarazona) → Zaragoza → A-23 (Huesca, Jaca) → N-330 → túnel de Somport',
    frontera: 'Túnel de Somport (ES–FR)',
    pros: ['Evita Madrid por completo.', 'Paso pirenaico secundario, poco transitado.'],
    contras: ['Muy largo.', 'Nieve en el Pirineo en invierno; el túnel puede cerrarse.', 'Atraviesa Zaragoza, con base aérea: evitarla en guerra.'],
    puertos: ['Somport'],
  },
  {
    id: 'fr-jonquera', clase: 'francia', t: 'Francia · La Jonquera – Le Perthus',
    destino: 'Perpiñán (Francia)', pasos: ['05019', '40194', '42173', '42004', '50251', '50297', '25120', '25072', '08113', '08298', '17079', '17086'],
    via: 'N-110 → N-122 → Zaragoza → A-2 (Lleida, Cervera) → C-25 Eix Transversal (Manresa, Vic: evita Barcelona) → Girona → AP-7/N-II → frontera',
    frontera: 'La Jonquera (ES) – Le Perthus (FR)',
    pros: ['El paso por carretera más importante con Francia: siempre abierto al tráfico pesado.', 'El Eix Transversal evita el área de Barcelona.'],
    contras: ['El más largo de todos.', 'Paso muy concurrido; Zaragoza y el litoral, en guerra, son zonas de riesgo.', 'Cerca de las centrales nucleares de Ascó y Vandellòs (Tarragona): no usarlo en un accidente nuclear allí.'],
  },
  {
    id: 'ad-valira', clase: 'andorra', t: 'Andorra · La Seu d’Urgell',
    destino: 'Andorra la Vella', pasos: ['05019', '40194', '42173', '42004', '50251', '50297', '25120', '25040', '25172', '25203', '25239'],
    via: 'N-110 → N-122 → Zaragoza → A-2 → Lleida → Balaguer → Ponts → C-14 → La Seu d’Urgell → N-145 → frontera',
    frontera: 'Les Valls de Valira (ES) – Andorra',
    pros: ['País de montaña y neutral, con control de entrada.', 'El DNI es válido.'],
    contras: ['Muy largo.', 'Fuera de la UE: aduana y posibles restricciones de entrada en una crisis.', 'Capacidad de acogida muy pequeña.', 'Pasa cerca de la central nuclear de Ascó (Tarragona): no usarlo en un accidente nuclear allí.'],
  },
  {
    id: 'mar-uk', clase: 'mar', t: 'Mar · Santander (ferri al Reino Unido)',
    destino: 'Portsmouth o Plymouth (Reino Unido)', pasos: ['05019', '05001', '47165', '47186', '34120', '34004', '39059', '39087', '39075'],
    via: 'N-403 → A-6 → A-62 (Valladolid, Palencia) → A-67 (Aguilar de Campoo, Reinosa) → Santander',
    alternativa: 'También hay ferris desde Bilbao (por Burgos y la AP-68/A-68).',
    frontera: 'Puerto de Santander',
    pros: ['Salida de la península sin cruzar Francia.'],
    contras: ['Pasaporte obligatorio para el Reino Unido.', 'Plazas limitadas; en una crisis, los barcos pueden suspenderse o requisarse.', 'Puerto de Pozazal (A-67) con nieve.'],
    puertos: ['Pozazal'],
  },
  {
    id: 'mar-africa', clase: 'mar', t: 'Mar · Algeciras y Tarifa (ferri a Ceuta y Marruecos)',
    destino: 'Ceuta (España) o Tánger (Marruecos)', pasos: ['05019', '05132', '45165', '13011', '14021', '41091', '11020', '11008', '11004'],
    via: 'N-502 (puerto del Pico, Talavera, Almadén) → Córdoba → A-4 (Sevilla) → AP-4/A-4 (Jerez) → A-381 → Algeciras',
    alternativa: 'Desde Algeciras, Tarifa (ferri rápido a Tánger) y La Línea (frontera terrestre con Gibraltar).',
    frontera: 'Puerto de Algeciras',
    pros: ['Ceuta es España: no hace falta pasaporte.', 'Sale de Europa si el conflicto afecta a todo el continente.'],
    contras: ['Muy largo.', 'Puerto del Pico (1.395 m).', 'Pasa por Sevilla y cerca de las bases de Morón y Rota: evitar en guerra.', 'Marruecos y Gibraltar exigen pasaporte.'],
    puertos: ['Pico'],
  },
];

/* Lugares a vigilar: centrales nucleares (zonas de planificación del
   PLABEN: 10 y 30 km) y objetivos estratégicos conocidos públicamente. */
export const CENTRALES = [
  { id: 'almaraz', t: 'C. N. de Almaraz (Cáceres)', ine: '10019' },
  { id: 'trillo', t: 'C. N. de Trillo (Guadalajara)', ine: '19291' },
  { id: 'asco', t: 'C. N. de Ascó (Tarragona)', ine: '43019' },
  { id: 'vandellos', t: 'C. N. de Vandellòs II (Tarragona)', ine: '43162' },
  { id: 'cofrentes', t: 'C. N. de Cofrentes (Valencia)', ine: '46097' },
];
export const ESTRATEGICOS = [
  { t: 'Madrid (capital del Estado)', ine: '28079' },
  { t: 'Base aérea de Torrejón', ine: '28148' },
  { t: 'Base aérea de Zaragoza', ine: '50297' },
  { t: 'Base naval de Rota', ine: '11030' },
  { t: 'Base aérea de Morón', ine: '41065' },
  { t: 'Base naval de Cartagena', ine: '30016' },
];

/* Respuestas, de menos a más movimiento. */
export const RESPUESTAS = {
  C: { t: 'Quedarse en casa', ic: '🏠' },
  R: { t: 'Refugio inmediato', ic: '🛡️' },
  I: { t: 'Refugio en el interior', ic: '🏞️' },
  S: { t: 'Salir de España', ic: '🌍' },
};

/* Escenarios. `corredores`: recomendados, en orden de preferencia.
   `evitar`: corredores que no se deben usar en ese escenario. */
export const ESCENARIOS = [
  {
    id: 'colapso', prioridad: 1, ic: '🛒', t: 'Colapso social',
    resumen: 'Fallo prolongado del Estado: sin suministros, sin orden público y sin servicios. Es el escenario en el que más importa decidir a tiempo.',
    respuesta: ['C', 'I', 'S'],
    senales: ['Desabastecimiento que no se resuelve en días.', 'Cortes de luz, agua o comunicaciones sin fecha de vuelta.', 'Policía y servicios desbordados; saqueos.', 'Retirada de efectivo limitada; gasolineras sin combustible.'],
    quedarse: 'Mientras la casa sea segura, haya agua y el barrio esté tranquilo. Perfil bajo: no mostrar lo que tenéis.',
    salir: 'Antes de que se agote el combustible y se colapsen las carreteras: la ventana suele ser corta, en las primeras 24–72 h tras el detonante. Salir de madrugada, con el depósito lleno.',
    fases: [
      ['Primeras 72 h', 'Quedarse en casa. Activar la compra de colapso. Llenar el depósito y garrafas de agua. Decidir juntos el escenario de salida y la hora límite.'],
      ['Hasta 2 semanas', 'Si falta el agua más de 3 días, hay violencia en el barrio o no se puede calentar la casa: salir al interior (Gredos o Tiétar).'],
      ['Hasta 3 meses', 'Vida rural: agua del río tratada, huerta, leña y trueque. Integrarse con la gente del pueblo: la comunidad protege más que el aislamiento.'],
      ['Más de 3 meses', 'Si el colapso es nacional y aumenta la violencia: salir a Portugal (lo más cercano) o, si también está afectado, a Francia.'],
    ],
    corredores: ['int-tietar', 'int-gredos', 'pt-vilar', 'pt-quintanilha', 'fr-irun'],
    evitar: [],
    zonas: 'Evitar las grandes ciudades y las autovías de salida de Madrid.',
  },
  {
    id: 'guerra', prioridad: 1, ic: '⚔️', t: 'Guerra o conflicto armado',
    resumen: 'Ataques aéreos o con misiles, sabotajes de infraestructuras, movilización o combates en territorio. La dirección de huida depende de dónde venga la amenaza.',
    respuesta: ['R', 'C', 'S'],
    senales: ['Declaración de estado de sitio o de guerra.', 'Alertas de ataque aéreo o sirenas.', 'Ataques a infraestructuras: electricidad, comunicaciones, combustible.', 'Orden de movilización.'],
    quedarse: 'Ante una alerta de ataque: refugio inmediato en sótano o garaje, lejos de ventanas, hasta el fin de la alerta. Entre alertas, en casa y siguiendo a Protección Civil.',
    salir: 'De forma temprana y por los corredores que indiquen las autoridades, antes de que se cierren las fronteras. Alejarse del frente y de los objetivos estratégicos: capital, bases, puertos militares, centrales nucleares y nudos de comunicación.',
    fases: [
      ['Primeras 72 h', 'Refugio ante las alertas. Mochila preparada, documentación (DNI y pasaporte), efectivo y depósito lleno. Seguir solo la información oficial.'],
      ['Hasta 2 semanas', 'Si el conflicto llega al territorio o hay ataques en la zona: salir. Si la amenaza viene del Mediterráneo o del este, la salida más alejada es la del oeste: Portugal por pasos secundarios.'],
      ['Hasta 3 meses', 'Fuera del país: pedir protección temporal en la UE (Directiva 2001/55/CE, la que se aplicó a Ucrania en 2022) o asilo. Inscribirse en el consulado.'],
      ['Más de 3 meses', 'Establecerse en el país de acogida; valorar el regreso solo con información oficial.'],
    ],
    corredores: ['pt-quintanilha', 'pt-vilar', 'mar-uk', 'fr-irun', 'pt-valenca'],
    evitar: ['fr-somport', 'fr-jonquera', 'mar-africa', 'ad-valira'],
    zonas: 'Evitar Madrid y Torrejón, Zaragoza, Rota y Morón, Cartagena, los puertos militares y las centrales nucleares.',
    nota: 'En una movilización general, las autoridades pueden restringir la salida del país a los hombres en edad militar (Ucrania lo hizo en 2022). Si llega a ocurrir, la salida tardía puede no ser posible para todos: decidir pronto.',
  },
  {
    id: 'nuclear', prioridad: 2, ic: '☢️', t: 'Accidente nuclear o ataque nuclear',
    resumen: 'La central más cercana es Almaraz (Cáceres), a unos 130 km en línea recta. La primera respuesta es quedarse dentro: evacuar bajo la nube es peor.',
    respuesta: ['C', 'S'],
    senales: ['Aviso oficial de emergencia nuclear.', 'Explosión o alerta en una central.'],
    quedarse: 'Confinamiento en el interior, sin ventanas, las primeras 24–48 h. No tomar yodo sin indicación de las autoridades sanitarias.',
    salir: 'Solo por orden oficial y por la ruta que se indique, alejándose de la central en perpendicular al viento.',
    fases: [
      ['Primeras 72 h', 'Interior sellado. Agua y comida envasadas. Radio a pilas.'],
      ['Hasta 2 semanas', 'Si se ordena evacuar: lejos de la central. Desde Ávila, hacia el norte (Burgos o Santander) o hacia Zamora.'],
      ['Hasta 3 meses', 'No volver hasta que se autorice. Controles de contaminación.'],
      ['Más de 3 meses', 'Según las autoridades.'],
    ],
    corredores: ['pt-quintanilha', 'fr-irun', 'mar-uk', 'pt-vilar'],
    evitar: ['pt-caya', 'int-tietar', 'mar-africa'],
    zonas: 'Mantenerse fuera de los 30 km de cualquier central accidentada (zona de planificación del PLABEN).',
  },
  {
    id: 'apagon', prioridad: 2, ic: '⚡', t: 'Apagón prolongado o ciberataque',
    resumen: 'Sin electricidad no funcionan las gasolineras, los datáfonos, los semáforos ni, a menudo, la cobertura. Solo se llega hasta donde llega el depósito.',
    respuesta: ['C', 'I'],
    senales: ['Apagón general de más de 24 h.', 'Fallo de comunicaciones y pagos.'],
    quedarse: 'En casa, con la compra de colapso, mientras haya agua y la temperatura sea tolerable.',
    salir: 'Si pasa de 5–7 días o hace frío extremo: al interior y solo por corredores que se cubran con lo que hay en el depósito.',
    fases: [
      ['Primeras 72 h', 'Casa. Radio a pilas. No gastar combustible.'],
      ['Hasta 2 semanas', 'Si se prolonga: interior (Gredos o Tiétar), sin repostar.'],
      ['Hasta 3 meses', 'Como en el colapso.'],
      ['Más de 3 meses', 'Como en el colapso.'],
    ],
    corredores: ['int-gredos', 'int-tietar', 'pt-vilar', 'pt-quintanilha'],
    evitar: ['fr-somport', 'fr-jonquera', 'ad-valira', 'mar-africa', 'pt-valenca'],
    zonas: 'No contar con repostar por el camino.',
  },
  {
    id: 'desabastecimiento', prioridad: 2, ic: '📉', t: 'Crisis económica o desabastecimiento de meses',
    resumen: 'Hiperinflación, paro masivo o desabastecimiento duradero sin violencia generalizada. Se vive mejor cerca de donde se producen los alimentos.',
    respuesta: ['C', 'I'],
    senales: ['Precios disparados durante meses.', 'Racionamiento.', 'Corralito bancario.'],
    quedarse: 'Mientras se pueda pagar la vivienda y abastecerse.',
    salir: 'Mudarse a una zona rural con agua y huertas antes de que el combustible sea inasequible.',
    fases: [
      ['Primeras 72 h', 'Efectivo, despensa y reducción del gasto.'],
      ['Hasta 2 semanas', 'Buscar alojamiento rural (alquiler, familia, amistades).'],
      ['Hasta 3 meses', 'Huerta, trabajo local y trueque.'],
      ['Más de 3 meses', 'Si la crisis es solo española: valorar Portugal o Francia, dentro de la UE.'],
    ],
    corredores: ['int-tietar', 'int-gredos', 'pt-vilar'],
    evitar: [],
    zonas: 'Lejos de las grandes ciudades, donde la escasez se nota antes.',
  },
  {
    id: 'agua', prioridad: 3, ic: '🚱', t: 'Corte de agua o sequía extrema',
    resumen: 'Sin agua corriente, una casa en la ciudad es habitable unos pocos días.',
    respuesta: ['C', 'I'],
    senales: ['Corte sin fecha de vuelta.', 'Restricciones severas.'],
    quedarse: 'Con el agua almacenada y las cisternas municipales, si las hay.',
    salir: 'A más de 72 h sin agua: a una zona con ríos y fuentes (Tormes, Tiétar).',
    fases: [['Primeras 72 h', 'Agua almacenada: 8–9 l al día para los dos.'], ['Hasta 2 semanas', 'Interior con río: potabilizar siempre.'], ['Hasta 3 meses', 'Igual.'], ['Más de 3 meses', 'Según la evolución.']],
    corredores: ['int-gredos', 'int-tietar'],
    evitar: [],
  },
  {
    id: 'incendio', prioridad: 3, ic: '🔥', t: 'Incendio forestal',
    resumen: 'En verano, Gredos y el Tiétar son zonas de riesgo muy alto. En julio de 2026 hubo desalojos en la provincia.',
    respuesta: ['C', 'S'],
    senales: ['Humo y aviso de las autoridades.', 'Orden de desalojo.'],
    quedarse: 'En la ciudad, en casa, con puertas y ventanas cerradas.',
    salir: 'Solo por la ruta que indiquen las autoridades. Nunca hacia la sierra en verano.',
    fases: [['Primeras 72 h', 'Seguir al 112 y a las autoridades.'], ['Hasta 2 semanas', 'Volver solo cuando se autorice.'], ['Hasta 3 meses', '—'], ['Más de 3 meses', '—']],
    corredores: ['pt-vilar', 'fr-irun'],
    evitar: ['int-gredos', 'int-tietar', 'mar-africa'],
    zonas: 'Evitar las sierras y los valles forestales en verano.',
  },
  {
    id: 'nevada', prioridad: 3, ic: '❄️', t: 'Nevada extrema u ola de frío',
    resumen: 'Ávila está a 1.130 m de altitud. Los puertos de montaña se cierran primero.',
    respuesta: ['C'],
    senales: ['Aviso rojo de AEMET.', 'Cortes de carreteras.'],
    quedarse: 'En casa: es la opción más segura. Conservar el calor en una sola habitación.',
    salir: 'Solo si es imprescindible, y por autovía por la meseta.',
    fases: [['Primeras 72 h', 'Casa.'], ['Hasta 2 semanas', 'Casa; salir solo por la A-50 y la A-62.'], ['Hasta 3 meses', '—'], ['Más de 3 meses', '—']],
    corredores: ['pt-vilar', 'pt-caya'],
    evitar: ['int-gredos', 'int-tietar', 'fr-irun', 'fr-somport', 'mar-africa', 'mar-uk', 'pt-valenca'],
    zonas: 'Evitar todos los puertos de montaña.',
  },
  {
    id: 'pandemia', prioridad: 3, ic: '🦠', t: 'Pandemia grave',
    resumen: 'Rara vez se evacua: las fronteras se cierran y los desplazamientos se restringen.',
    respuesta: ['C'],
    senales: ['Declaración de emergencia sanitaria.'],
    quedarse: 'En casa, con aislamiento y abastecimiento.',
    salir: 'Solo si la ciudad se vuelve inhabitable, al interior y respetando las restricciones.',
    fases: [['Primeras 72 h', 'Casa.'], ['Hasta 2 semanas', 'Casa.'], ['Hasta 3 meses', 'Casa o interior.'], ['Más de 3 meses', 'Según las autoridades.']],
    corredores: ['int-gredos', 'int-tietar'],
    evitar: [],
  },
  {
    id: 'quimico', prioridad: 3, ic: '☣️', t: 'Accidente químico',
    resumen: 'Por carretera o por ferrocarril: vuestro barrio está junto a la estación y la vía del tren. La respuesta es confinarse, no viajar.',
    respuesta: ['C'],
    senales: ['Aviso oficial; olor o nube.'],
    quedarse: 'Interior sellado: puertas y ventanas cerradas, ventilación apagada.',
    salir: 'Solo por orden oficial, en perpendicular al viento.',
    fases: [['Primeras 72 h', 'Confinamiento.'], ['Hasta 2 semanas', '—'], ['Hasta 3 meses', '—'], ['Más de 3 meses', '—']],
    corredores: [],
    evitar: [],
  },
];

/* Salir del país: lo que hay que llevar y saber. */
export const SALIR_PAIS = [
  { t: 'Documentación', items: ['DNI en vigor: basta en la UE, Schengen y Andorra.', 'Pasaporte en vigor: obligatorio para el Reino Unido, Gibraltar y Marruecos. Sacadlo ahora: en una crisis, las oficinas se colapsan.', 'Permiso de conducir (el español vale en toda la UE) y documentación del coche.', 'Tarjeta Sanitaria Europea, una por persona.', 'Copias en papel y en el móvil de todo lo anterior.'] },
  { t: 'Coche', items: ['Seguro: en la UE basta el seguro español. En Marruecos hace falta la carta verde.', 'Depósito lleno al salir y una garrafa homologada de reserva.', 'Mapa de carreteras en papel de España y de Portugal.'] },
  { t: 'Dinero', items: ['Efectivo en euros (en billetes pequeños) para varios días.', 'Dos tarjetas de bancos distintos.', 'Libras o dírhams solo si vais al Reino Unido o a Marruecos.'] },
  { t: 'En la frontera', items: ['En una crisis se pueden restablecer los controles en las fronteras interiores de Schengen.', 'Cruzar de día, con calma y con la documentación preparada.', 'Si un paso está colapsado, ir a uno secundario (Alcañices, Valencia de Alcántara, Somport).'] },
  { t: 'Al llegar', items: ['Inscribirse en el consulado español (Registro de Matrícula Consular).', 'Si hay guerra: protección temporal en la UE (Directiva 2001/55/CE) o asilo.', 'Avisar a la familia del lugar y de la hora de llegada.'] },
];

export const AVISO_EVACUACION =
  'Los corredores son una referencia de planificación, no una navegación. El trazado del mapa es esquemático (une las localidades de paso); seguid la carretera indicada. ' +
  'No se puede saber de antemano si una carretera o una frontera estarán abiertas. En una emergencia real prevalecen siempre las órdenes de las autoridades.';
