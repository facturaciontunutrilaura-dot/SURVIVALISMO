/* =========================================================================
   CENTRO DE COORDINACIÓN FAMILIAR
   ---------------------------------------------------------------------------
   Las ubicaciones, personas y rutas las define cada usuario y se guardan solo
   en su dispositivo (IndexedDB). Aquí únicamente viven las plantillas, los
   datos de ejemplo ficticios y el contenido de planificación genérico.
   ========================================================================= */

/* Ya no se distribuye ninguna ubicación precargada: cada usuario crea las
   suyas. PLANTILLA_NODO define los campos de una ubicación nueva.
     rol   → 'base' (desde donde se parte) o 'familia' (a donde se quiere llegar)
     cod   → código INE de provincia (lo usan riesgos y el comparador)
     lat/lon → OPCIONALES; solo si el usuario las fija. Recomendación: un punto
             de referencia público (plaza, centro del pueblo), no el portal.
     rutas → rutas desde la base definidas por el usuario (ver RUTA_PLANTILLA) */
export const PLANTILLA_NODO = {
  nombre: '', rol: 'familia', ic: '👨‍👩‍👧',
  persona: '', cod: '', municipio: '', lat: null, lon: null,
  tel: '', dir: '', encuentro: '', notas: '',
  personas: { adultos: 1, ninos: 0, mayores: 0, mascotas: 0 },
  rutas: [],
};

/* Una ruta es texto de planificación del usuario: nunca navegación.
   geoId → capa GeoJSON importada (almacén 'geo') con la traza real, opcional. */
export const RUTA_PLANTILLA = { nombre: '', tipo: 'principal', via: '', km: null, notas: '', geoId: null };

export const ICONOS_NODO = ['🏠', '👨‍👩‍👧', '👵', '🧒', '🏢', '🏫', '🏡', '⛺'];

/* Datos de ejemplo FICTICIOS para ver cómo funciona el centro familiar. No
   corresponden a ninguna persona real, no tienen coordenadas y se marcan
   como ejemplo en la interfaz para que el usuario los sustituya o borre. */
export const EJEMPLO_NODOS = [
  {
    nombre: 'Casa (ejemplo)', rol: 'base', ic: '🏠', persona: 'Nosotros',
    encuentro: 'Ejemplo: parque junto al colegio', ejemplo: true,
    personas: { adultos: 2, ninos: 1, mayores: 0, mascotas: 1 },
  },
  {
    nombre: 'Abuelos (ejemplo)', rol: 'familia', ic: '👵', persona: 'Abuela y abuelo',
    encuentro: 'Ejemplo: plaza del ayuntamiento', ejemplo: true,
    personas: { adultos: 0, ninos: 0, mayores: 2, mascotas: 0 },
    rutas: [
      { nombre: 'Ruta habitual (ejemplo)', tipo: 'principal', via: 'Autovía habitual', km: 120, notas: 'Ejemplo ficticio: sustitúyelo por tu ruta real.' },
      { nombre: 'Alternativa (ejemplo)', tipo: 'alternativa', via: 'Carretera nacional', km: 140, notas: '' },
    ],
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
    ruta: 'La ruta principal que hayáis acordado.',
    antes: ['Comprobar el estado de las carreteras en la DGT.', 'Depósito lleno o por encima de la mitad.', 'Móvil cargado y power bank.'],
    ojo: ['Nada específico. Descansa cada 2 horas.'],
    capas: ['transporte', 'abastecimiento'],
  },
  {
    id: 'incendio', t: 'Incendio forestal', ic: '🔥', vel: 'dificil',
    resumen: 'El humo reduce la visibilidad a cero y las carreteras se cortan sin previo aviso. La prioridad es NO entrar en la zona afectada, aunque suponga un rodeo largo.',
    ruta: 'Elegir la ruta que se aleje del frente y del viento dominante, aunque sea más larga. Revisa qué alternativa de las que has definido evita las zonas forestales.',
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
    resumen: 'Los puertos de montaña se cierran o exigen cadenas con frecuencia en invierno. Identifica qué tramos de montaña atraviesan tus rutas.',
    ruta: 'Verificar el estado de los puertos antes de elegir. Si el paso de montaña de tu ruta principal está cerrado, una alternativa por menor altitud puede ser la única opción.',
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
    ruta: 'Priorizar los itinerarios que eviten atravesar núcleos urbanos grandes, usando circunvalaciones cuando existan.',
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
    ojo: ['No conducir a velocidad excesiva: un accidente empeora la situación.', 'En autovía, el 112 puede coordinar el encuentro con una ambulancia.', 'Las capitales de provincia cuentan con hospital público de referencia.'],
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
     · la cartografía del IGN (vectorial precargada y teselas descargables);
     · un editor para que el usuario añada sus propios puntos verificados;
     · importación de capas GeoJSON oficiales y de trazas de ruta desde el mapa. */

export const CAPAS_POI = [
  { id: 'sanitaria', t: 'Sanitaria', ic: '🏥', d: 'Hospitales, centros de salud y urgencias', estado: 'usuario' },
  { id: 'emergencias', t: 'Emergencias', ic: '🚓', d: 'Bomberos, Policía, Guardia Civil, Mossos, Protección Civil', estado: 'parcial' },
  { id: 'abastecimiento', t: 'Abastecimiento', ic: '⛽', d: 'Estaciones de servicio, supermercados, farmacias, fuentes', estado: 'usuario' },
  { id: 'transporte', t: 'Transporte', ic: '🚉', d: 'Estaciones, aeropuertos y ejes viarios', estado: 'usuario' },
  { id: 'alojamiento', t: 'Alojamiento', ic: '🛏', d: 'Hoteles, albergues e instalaciones públicas', estado: 'usuario' },
  { id: 'familia', t: 'Familia', ic: '👨‍👩‍👧', d: 'Tus ubicaciones y puntos de encuentro', estado: 'usuario' },
];

export const CAPAS_ESTADO = {
  incluida: { t: 'Incluida y verificada', ic: '🟢' },
  parcial: { t: 'Parcial — solo datos verificados', ic: '🟡' },
  usuario: { t: 'La rellenas tú', ic: '⚪' },
};

/* Teléfonos de emergencia de ámbito estatal. Los servicios locales dependen
   de dónde viva cada usuario: se anotan como contactos del plan familiar. */
export const SERVICIOS_VERIFICADOS = [
  { capa: 'emergencias', nombre: 'Emergencias (todas)', dir: '—', tel: '112', src: 'pc-es' },
  { capa: 'emergencias', nombre: 'Guardia Civil', dir: '—', tel: '062', src: 'pc-es' },
  { capa: 'emergencias', nombre: 'Policía Nacional', dir: '—', tel: '091', src: 'pc-es' },
];

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
