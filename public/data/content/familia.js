/* =========================================================================
   CENTRO DE COORDINACIÓN FAMILIAR
   ---------------------------------------------------------------------------
   Los nodos por defecto son EDITABLES por el usuario y se guardan solo en el
   dispositivo (IndexedDB). Aquí únicamente viven los valores iniciales y los
   metadatos de rutas, que se combinan con la geometría de data/geo/rutas.geojson.
   ========================================================================= */

export const NODOS_DEFECTO = [
  {
    id: 'avila', nombre: 'Ávila', rol: 'base', ic: '🏠',
    persona: '', cp: '05001', prov: 'Ávila',
    tel: '', dir: '', encuentro: '', notas: 'Base principal del plan familiar.',
    personas: { adultos: 2, ninos: 0, mayores: 0, mascotas: 0 },
  },
  {
    id: 'terrassa', nombre: 'Terrassa', rol: 'familia', ic: '👨‍👩‍👧',
    persona: 'Carlos', cp: '08224', prov: 'Barcelona',
    tel: '', dir: '', encuentro: '', notas: '',
    personas: { adultos: 2, ninos: 0, mayores: 0, mascotas: 0 },
  },
  {
    id: 'getafe', nombre: 'Getafe', rol: 'familia', ic: '👨‍👩‍👧',
    persona: 'Padres de mi pareja', cp: '28903', prov: 'Madrid',
    tel: '', dir: '', encuentro: '', notas: '',
    personas: { adultos: 2, ninos: 0, mayores: 2, mascotas: 0 },
  },
];

export const ESTADOS = [
  { id: 'ok', t: 'Estoy bien', ic: '🟢', c: '#6f9c4a' },
  { id: 'ayuda', t: 'Necesito ayuda', ic: '🟡', c: '#cfb63f' },
  { id: 'emergencia', t: 'Emergencia', ic: '🔴', c: '#c8402f' },
  { id: 'sincom', t: 'Sin comunicación', ic: '⚫', c: '#6f7a6c' },
  { id: 'nd', t: 'Sin actualizar', ic: '⚪', c: '#3c4a3e' },
];

export const PREPARACION_ESTADO = [
  { id: 'preparado', t: 'Preparado', ic: '🟢' },
  { id: 'revisar', t: 'Revisar', ic: '🟡' },
  { id: 'pendiente', t: 'Pendiente', ic: '🔴' },
];

/* ------------------------------- RUTAS ------------------------------- */
/* Las claves coinciden con las properties.id de data/geo/rutas.geojson.
   kmEstimados y localidades se leen del propio GeoJSON: aquí solo van los
   metadatos que no son geometría. */

export const CORREDORES = [
  {
    id: 'terrassa', origen: 'avila', destino: 'terrassa',
    t: 'Ávila ⇄ Terrassa', ic: '🛣️',
    rutas: ['avila-terrassa-A', 'avila-terrassa-B', 'avila-terrassa-C'],
  },
  {
    id: 'getafe', origen: 'avila', destino: 'getafe',
    t: 'Ávila ⇄ Getafe', ic: '🛣️',
    rutas: ['avila-getafe-A', 'avila-getafe-B', 'avila-getafe-C'],
  },
];

/** Velocidad media conservadora para estimar tiempos, por situación.
 *  NO es un tiempo de navegación: es una referencia de planificación. */
export const VELOCIDADES = {
  normal: { t: 'Circulación normal', v: 90 },
  degradada: { t: 'Circulación degradada (lluvia, tráfico, noche)', v: 70 },
  dificil: { t: 'Condiciones difíciles (nieve, temporal, saturación)', v: 45 },
  muy_dificil: { t: 'Muy difíciles (cortes, desvíos, columna de evacuación)', v: 25 },
  pie: { t: 'A pie (referencia extrema)', v: 4 },
};

/* --------------------------- SITUACIONES --------------------------- */
/* Para cada situación: cómo cambia la lectura de la ruta, qué verificar antes
   de salir y qué capas de puntos de interés priorizar. Ninguna afirma que una
   carretera concreta estará abierta. */

export const SITUACIONES = [
  {
    id: 'normal', t: 'Normal', ic: '✅', vel: 'normal',
    resumen: 'Desplazamiento ordinario. La ruta principal suele ser la más rápida.',
    ruta: 'Ruta A (principal).',
    antes: ['Comprobar el estado de las carreteras en la DGT.', 'Depósito lleno o por encima de la mitad.', 'Móvil cargado y power bank.'],
    ojo: ['Nada específico. Descansa cada 2 horas.'],
    capas: ['transporte', 'abastecimiento'],
  },
  {
    id: 'incendio', t: 'Incendio forestal', ic: '🔥', vel: 'dificil',
    resumen: 'El humo reduce la visibilidad a cero y las carreteras se cortan sin previo aviso. La prioridad es NO entrar en la zona afectada, aunque suponga un rodeo largo.',
    ruta: 'Elegir la ruta que se aleje del frente y del viento dominante. En el corredor a Terrassa, la Ruta B (por Segovia y Soria) evita el eje central; en el corredor a Getafe, valorar la Ruta B por el sur si el fuego está en la sierra.',
    antes: ['Consultar el 112 de la comunidad autónoma y los avisos oficiales.', 'Comprobar dirección e intensidad del viento.', 'Llevar mascarillas FFP2/FFP3 y agua.', 'No salir si la única ruta atraviesa la zona con humo.'],
    ojo: ['Nunca atravesar una columna de humo denso en coche.', 'Si el fuego te sorprende en carretera: no continuar, dar la vuelta si es seguro.', 'Ventanillas cerradas y recirculación de aire.', 'Las evacuaciones saturan las vías: sal pronto o no salgas.'],
    capas: ['emergencias', 'sanitaria', 'transporte'],
  },
  {
    id: 'inundacion', t: 'Inundación', ic: '🌊', vel: 'muy_dificil',
    resumen: 'Los pasos inferiores, badenes y vados son los puntos críticos. 30 cm de agua en movimiento arrastran un turismo.',
    ruta: 'Priorizar la ruta con menor número de cruces de cauce y mayor cota. Evitar itinerarios por vega y por vías de servicio bajas.',
    antes: ['Consultar avisos de AEMET y los sistemas de información hidrológica (SAIH).', 'Retrasar el viaje si hay aviso naranja o rojo.', 'Cargar el móvil y llevar linterna estanca.'],
    ojo: ['NUNCA cruzar una vía inundada, aunque veas pasar a otro vehículo.', 'No rodear barreras de corte.', 'Si el coche se para en el agua, salir de inmediato y buscar altura.', 'Evitar aparcar en garajes subterráneos.'],
    capas: ['emergencias', 'sanitaria', 'transporte'],
  },
  {
    id: 'nieve', t: 'Nieve y hielo', ic: '❄️', vel: 'muy_dificil',
    resumen: 'Los puertos del Sistema Central se cierran o exigen cadenas varias veces cada invierno. El corredor Ávila–Madrid atraviesa el Alto del León.',
    ruta: 'Verificar el estado de los puertos antes de elegir. Si el eje de la sierra está cerrado, las alternativas por el sur (N-403 hacia Maqueda) o por el norte pueden ser la única opción.',
    antes: ['Estado de carreteras en la DGT: es imprescindible, no opcional.', 'Cadenas homologadas y PROBADAS previamente en seco.', 'Depósito lleno, manta, agua, comida, pala y frontal.', 'Avisar a alguien de la ruta y la hora prevista.'],
    ojo: ['No adelantar a las máquinas quitanieves.', 'Si quedas atrapado, permanecer en el vehículo y comprobar que el tubo de escape está libre de nieve antes de arrancar.', 'Señalizar la posición y racionar la batería.', 'El hielo negro al amanecer es el mayor riesgo, no la nieve visible.'],
    capas: ['emergencias', 'sanitaria', 'abastecimiento', 'alojamiento'],
  },
  {
    id: 'temporal', t: 'Temporal de viento', ic: '🌪️', vel: 'dificil',
    resumen: 'Rachas fuertes afectan sobre todo a vehículos altos, zonas de viaducto y salidas de túnel.',
    ruta: 'Cualquiera de las rutas, retrasando el viaje si hay aviso naranja o rojo por viento.',
    antes: ['Consultar avisos de AEMET.', 'Valorar aplazar el desplazamiento.'],
    ojo: ['Sujetar el volante con firmeza en viaductos y adelantamientos.', 'Precaución con caída de ramas y objetos.', 'Aumentar la distancia de seguridad.'],
    capas: ['transporte', 'abastecimiento'],
  },
  {
    id: 'apagon', t: 'Apagón', ic: '⚡', vel: 'degradada',
    resumen: 'Sin electricidad no hay semáforos, ni surtidores en las gasolineras, ni datáfonos, ni muchas veces cobertura móvil. El depósito lleno es lo que determina tu autonomía real.',
    ruta: 'La ruta más corta y conocida. Evitar itinerarios que dependan de repostar a mitad de camino.',
    antes: ['Comprobar el nivel de combustible: si no llegas con lo que tienes, no salgas.', 'Llevar efectivo en billetes pequeños.', 'Llevar mapa en papel: el GPS funciona sin Internet, pero los mapas hay que tenerlos descargados.'],
    ojo: ['Los cruces sin semáforo funcionan como stop: máxima precaución.', 'Los túneles pueden quedar sin ventilación ni iluminación.', 'Las estaciones de servicio sin luz no bombean.', 'Avisar antes de salir de la hora prevista de llegada.'],
    capas: ['abastecimiento', 'emergencias', 'transporte'],
  },
  {
    id: 'disturbios', t: 'Disturbios', ic: '🚨', vel: 'degradada',
    resumen: 'El objetivo es evitar por completo las zonas de concentración, aunque el rodeo sea largo.',
    ruta: 'Priorizar los itinerarios que eviten atravesar núcleos urbanos grandes. En el corredor a Terrassa, la Ruta B evita Madrid; el paso por Zaragoza y Barcelona puede sustituirse por circunvalaciones.',
    antes: ['Informarse por medios oficiales de las zonas afectadas.', 'Valorar seriamente aplazar el viaje.', 'Depósito lleno y móvil cargado.'],
    ojo: ['No detenerse ni grabar.', 'No atravesar un cordón policial ni discutir con agentes.', 'Si te encuentras con una concentración, dar la vuelta con calma.', 'Circular con las puertas bloqueadas.'],
    capas: ['emergencias', 'transporte'],
  },
  {
    id: 'quimico', t: 'Accidente químico', ic: '☣️', vel: 'dificil',
    resumen: 'La respuesta por defecto ante una nube tóxica es el confinamiento, no el desplazamiento. Si ya estás en carretera, aléjate perpendicularmente al viento.',
    ruta: 'No iniciar el viaje si la ruta atraviesa la zona afectada. Rodear siempre por barlovento.',
    antes: ['Comprobar el aviso oficial y la zona de afectación.', 'Si estás en el área afectada, NO salir: confinarse y sellar.'],
    ojo: ['Ventanillas cerradas y recirculación.', 'Alejarse perpendicularmente a la dirección del viento.', 'No detenerse a observar ni fotografiar.', 'Muchos gases son más densos que el aire: evitar zonas bajas y pasos inferiores.'],
    capas: ['emergencias', 'sanitaria'],
  },
  {
    id: 'radiologico', t: 'Riesgo radiológico', ic: '☢️', vel: 'dificil',
    resumen: 'La pauta internacional es entrar, quedarse dentro y mantenerse informado. Evacuar bajo una nube en paso puede ser peor que quedarse.',
    ruta: 'No desplazarse salvo orden expresa de las autoridades, y por la ruta que ellas indiquen.',
    antes: ['Esperar instrucciones oficiales.', 'Preparar documentación y kit por si se ordena evacuación.'],
    ojo: ['No tomar yodo sin indicación de las autoridades sanitarias.', 'Consumir solo agua y alimentos envasados que estuvieran en el interior.', 'Si has estado fuera, retirar la ropa exterior y ducharse antes de viajar.'],
    capas: ['emergencias', 'sanitaria'],
  },
  {
    id: 'medica', t: 'Emergencia médica', ic: '🏥', vel: 'normal',
    resumen: 'La prioridad es el centro sanitario más cercano, no el destino final. Llama al 112 antes de mover a nadie.',
    ruta: 'La que pase por la localidad con hospital más próxima, que no siempre está en el sentido de la marcha.',
    antes: ['Llamar al 112 y seguir sus indicaciones.', 'Localizar el hospital de referencia más cercano.', 'Llevar tarjeta sanitaria y listado de medicación.'],
    ojo: ['No conducir a velocidad excesiva: un accidente empeora la situación.', 'En autovía, el 112 puede coordinar el encuentro con una ambulancia.', 'Las capitales de provincia del itinerario cuentan con hospital de referencia.'],
    capas: ['sanitaria', 'emergencias'],
  },
  {
    id: 'sincom', t: 'Pérdida de comunicaciones', ic: '📡', vel: 'degradada',
    resumen: 'El GPS del teléfono sigue funcionando sin Internet (usa satélites), pero los mapas deben estar descargados previamente. Sin comunicación, el plan acordado de antemano es lo único que queda.',
    ruta: 'La ruta acordada previamente con la familia, sin improvisar desvíos.',
    antes: ['Descargar el área de mapa de toda la ruta.', 'Llevar la ruta y los teléfonos en papel.', 'Acordar horarios de contacto y un punto de encuentro por si no hay forma de avisar.'],
    ojo: ['Mantener el móvil en ahorro de energía.', 'Un SMS puede salir donde una llamada no.', 'Anotar la hora de salida y los hitos alcanzados.', 'Si te desvías del plan, hazlo de forma predecible para quien te busque.'],
    capas: ['familia', 'transporte'],
  },
  {
    id: 'carretera', t: 'Emergencia en carretera', ic: '🚗', vel: 'degradada',
    resumen: 'Avería, accidente o quedarse atrapado. La prioridad es la seguridad fuera de la calzada.',
    ruta: 'Detenerse en el lugar más seguro posible y avisar al 112 con el punto kilométrico.',
    antes: ['Revisión del vehículo antes de un viaje largo.', 'Chalecos reflectantes accesibles DENTRO del habitáculo.', 'Baliza V-16 conectada o triángulos.'],
    ojo: ['Salir por el lado contrario al tráfico y ponerse tras la barrera.', 'Chaleco puesto ANTES de salir del coche.', 'Dar el punto kilométrico y el sentido de la marcha al 112.', 'No permanecer dentro del vehículo en el arcén de una autovía.'],
    capas: ['emergencias', 'sanitaria', 'transporte'],
  },
];

/* ----------------------- CAPAS DE PUNTOS DE INTERÉS ----------------------- */
/* IMPORTANTE — POLÍTICA DE DATOS:
   Esta aplicación NO incluye un directorio de hospitales, gasolineras,
   farmacias o alojamientos con coordenadas, porque no ha sido posible
   verificarlos contra una fuente oficial en formato de datos. Inventarlos
   sería exactamente lo que el proyecto prohíbe.
   Lo que sí ofrece:
     · las localidades REALES de cada ruta, con geometría del IGN;
     · la marca de qué localidades son capital de provincia (dato objetivo),
       que es donde se encuentra el hospital de referencia provincial;
     · un editor para que el usuario añada sus propios puntos verificados;
     · importación de capas GeoJSON oficiales desde el mapa. */

export const CAPAS_POI = [
  { id: 'sanitaria', t: 'Sanitaria', ic: '🏥', d: 'Hospitales, centros de salud y urgencias', estado: 'usuario' },
  { id: 'emergencias', t: 'Emergencias', ic: '🚓', d: 'Bomberos, Policía, Guardia Civil, Mossos, Protección Civil', estado: 'parcial' },
  { id: 'abastecimiento', t: 'Abastecimiento', ic: '⛽', d: 'Estaciones de servicio, supermercados, farmacias, fuentes', estado: 'usuario' },
  { id: 'transporte', t: 'Transporte', ic: '🚉', d: 'Estaciones, aeropuertos y ejes viarios', estado: 'parcial' },
  { id: 'alojamiento', t: 'Alojamiento', ic: '🛏', d: 'Hoteles, albergues e instalaciones públicas', estado: 'usuario' },
  { id: 'familia', t: 'Familia', ic: '👨‍👩‍👧', d: 'Ávila, Terrassa, Getafe y tus puntos de encuentro', estado: 'incluida' },
];

export const CAPAS_ESTADO = {
  incluida: { t: 'Incluida y verificada', ic: '🟢' },
  parcial: { t: 'Parcial — solo datos verificados', ic: '🟡' },
  usuario: { t: 'La rellenas tú', ic: '⚪' },
};

/* Servicios de emergencia verificados contra fuente oficial (Ayuntamiento de
   Ávila, consultado el 15/08/2026). Sin coordenadas: solo dirección y teléfono
   publicados. Se muestran como directorio, no como puntos del mapa. */
export const SERVICIOS_VERIFICADOS = [
  { zona: 'avila', capa: 'emergencias', nombre: 'Policía Local de Ávila', dir: 'C/ Molino del Carril, 1', tel: '920 35 24 24', src: 'avila-emergencias' },
  { zona: 'avila', capa: 'emergencias', nombre: 'Bomberos — Servicio de Extinción de Incendios', dir: 'C/ Jorge Ruiz de Santayana, s/n', tel: '920 21 10 80', src: 'avila-emergencias' },
  { zona: 'avila', capa: 'emergencias', nombre: 'Protección Civil — Ayuntamiento de Ávila', dir: 'C/ Jorge Ruiz de Santayana, s/n', tel: '920 35 40 35 · 630 36 53 04', src: 'avila-emergencias' },
  { zona: 'avila', capa: 'sanitaria', nombre: 'Complejo Asistencial de Ávila — Hospital Nuestra Señora de Sonsoles', dir: 'Dirección pendiente de verificar contra fuente oficial en formato de datos', tel: '112 para urgencias', src: 'sacyl-avila' },
  { zona: 'todas', capa: 'emergencias', nombre: 'Emergencias (todas)', dir: '—', tel: '112', src: 'pc-es' },
  { zona: 'todas', capa: 'emergencias', nombre: 'Guardia Civil', dir: '—', tel: '062', src: 'pc-es' },
  { zona: 'todas', capa: 'emergencias', nombre: 'Policía Nacional', dir: '—', tel: '091', src: 'pc-es' },
  { zona: 'terrassa', capa: 'emergencias', nombre: 'Mossos d\'Esquadra / Policia Municipal de Terrassa', dir: 'DATOS NO DISPONIBLES — verificar en la web del ayuntamiento', tel: '112', src: 'terrassa-pc' },
  { zona: 'getafe', capa: 'emergencias', nombre: 'Policía Local de Getafe / Protección Civil', dir: 'DATOS NO DISPONIBLES — verificar en la web del ayuntamiento', tel: '112', src: 'getafe-ayto' },
];

/** Capitales de provincia presentes en los corredores. Dato objetivo: toda
 *  capital de provincia española cuenta con hospital público de referencia. */
export const CAPITALES = ['Ávila', 'Segovia', 'Soria', 'Madrid', 'Guadalajara', 'Zaragoza', 'Lleida', 'Barcelona', 'Tarragona'];

export const AVISO_RUTAS =
  'Las rutas de esta aplicación son una REFERENCIA DE PLANIFICACIÓN, no una navegación. ' +
  'No afirman que una carretera vaya a estar abierta: en una emergencia real puede estar cortada, ' +
  'inundada, afectada por fuego, bloqueada o saturada. El estado de cualquier vía es DESCONOCIDO ' +
  'hasta que lo verifiques. Prevalecen siempre las instrucciones de las autoridades y los cortes oficiales.';

/* --------------------------- PLAN 72 HORAS --------------------------- */
export const PLAN72 = {
  agua: { t: 'Agua', ic: '💧', calc: (p) => `${(p.adultos + p.mayores) * 9 + p.ninos * 6 + p.mascotas * 4} litros`, nota: '3 l/persona/día × 3 días. Niños 2 l/día. Mascota mediana 1,3 l/día.' },
  comida: { t: 'Alimento sin cocción', ic: '🥫', calc: (p) => `${((p.adultos + p.mayores) * 2200 + p.ninos * 1500) * 3 / 1000} miles de kcal`, nota: 'Conservas, frutos secos, barritas. Abrelatas manual imprescindible.' },
  medicacion: { t: 'Medicación prescrita', ic: '💊', calc: () => 'Mínimo 7 días', nota: 'Con receta y listado de principios activos y dosis. Los mayores suelen necesitar más margen.' },
  iluminacion: { t: 'Iluminación', ic: '🔦', calc: (p) => `${Math.max(2, p.adultos + p.mayores + p.ninos)} frontales + pilas`, nota: 'Un frontal por persona. Nunca velas.' },
  energia: { t: 'Energía', ic: '🔋', calc: (p) => `${Math.max(1, Math.ceil((p.adultos + p.mayores + p.ninos) / 2))} power bank de 20.000 mAh`, nota: 'Cargadas y revisadas cada 3 meses. Cargador de coche.' },
  radio: { t: 'Radio', ic: '📻', calc: () => '1 radio AM/FM a pilas', nota: 'Con pilas de repuesto en envase aparte. Es la fuente de información que sobrevive a todo.' },
  documentacion: { t: 'Documentación', ic: '📄', calc: (p) => `${p.adultos + p.mayores + p.ninos} juegos de copias`, nota: 'DNI, tarjeta sanitaria, seguros, y copia digital cifrada. Cartilla de la mascota y microchip.' },
  ropa: { t: 'Ropa y abrigo', ic: '🧥', calc: (p) => `${p.adultos + p.mayores + p.ninos} equipos completos`, nota: 'Capa térmica, cortavientos, calzado cerrado. Manta térmica por persona.' },
  higiene: { t: 'Higiene', ic: '🧼', calc: (p) => `Jabón, papel y bolsas para ${p.adultos + p.mayores + p.ninos} personas`, nota: 'Toallitas, gel hidroalcohólico. Pañales o higiene menstrual si procede.' },
  transporte: { t: 'Transporte', ic: '🚗', calc: () => 'Depósito por encima de la mitad', nota: 'Kit de invierno de octubre a abril. Cadenas probadas.' },
  comunicaciones: { t: 'Comunicaciones', ic: '📱', calc: () => 'Plan acordado + contacto externo', nota: 'Teléfonos en papel en cada mochila. Horarios de contacto acordados.' },
  efectivo: { t: 'Efectivo', ic: '💶', calc: (p) => `Billetes pequeños para ${p.adultos + p.mayores + p.ninos} personas × 3 días`, nota: 'Sin luz no hay datáfonos ni cajeros.' },
};
