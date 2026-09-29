/* =========================================================================
   TERRITORIOS — marco oficial de emergencias por comunidad autónoma
   ---------------------------------------------------------------------------
   QUÉ ES ESTO Y QUÉ NO ES

   Esto NO es una evaluación de riesgo por territorio. No hay aquí ningún
   nivel, ninguna probabilidad y ninguna cifra. Lo que hay es un hecho
   administrativo comprobable: qué planes de protección civil tiene aprobados
   cada comunidad, y ante qué riesgos.

   POR QUÉ SIRVE. En España, que una comunidad tenga un plan especial
   aprobado u homologado ante un riesgo concreto significa que ese riesgo
   está oficialmente reconocido como relevante en ese territorio. No dice
   cuánto riesgo hay: dice que la administración competente lo considera
   suficientemente serio como para planificarlo. Es el mismo indicador que ya
   se usaba en la ficha de Terrassa, aplicado ahora a todo el Estado.

   NIVEL DE CONFIRMACIÓN (campo v). Se distingue expresamente:
     v: 2 → confirmado en fuente oficial (boletín, portal del organismo o BOE).
     v: 1 → hay indicio en fuente oficial pero no se pudo confirmar la norma,
            la sigla exacta o el estado. La app lo muestra marcado como
            PENDIENTE DE CONFIRMACIÓN y no lo trata igual que un dato firme.

   Ningún plan aparece aquí sin haber sido localizado. Donde la investigación
   no llegó, no hay entrada, y la app dice DATOS NO DISPONIBLES en vez de
   rellenar el hueco.

   Los códigos de comunidad son los del INE y coinciden con los de
   territorio-idx.js, que se genera por geometría desde la cartografía del
   IGN. Nunca se teclean a mano.
   ========================================================================= */

export const TERRITORIOS_ACTUALIZADO = '2026-09-04';

/* Correspondencia entre el riesgo que planifica cada plan y el identificador
   de riesgo de la app. null = el plan cubre algo que la app no tiene como
   ficha propia (por ejemplo contaminación marina); se sigue mostrando en el
   bloque territorial, pero no se cuelga de ninguna ficha. */
export const RIESGO_PLAN = {
  'incendio-forestal': 'incendios forestales',
  inundacion: 'inundaciones',
  sismico: 'riesgo sísmico',
  quimico: 'riesgo químico / SEVESO',
  radiologico: 'riesgo radiológico o nuclear',
  transporte: 'transporte de mercancías peligrosas',
  'frio-nieve': 'nevadas y temporales',
  'viento-tormenta': 'fenómenos meteorológicos adversos',
};

/* =========================================================================
   MARCO ESTATAL
   Es el que se aplica siempre, y además el que cubre los huecos cuando una
   comunidad no tiene plan propio ante un riesgo.
   ========================================================================= */
export const ESTATAL = {
  sistema: {
    t: 'Ley 17/2015, de 9 de julio, del Sistema Nacional de Protección Civil',
    url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-7730', v: 2,
  },
  normaBasica: {
    t: 'Real Decreto 524/2023, de 20 de junio, por el que se aprueba la Norma Básica de Protección Civil (deroga el RD 407/1992)',
    url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2023-14679', v: 2,
  },
  autoproteccion: {
    t: 'Real Decreto 393/2007, Norma Básica de Autoprotección',
    url: 'https://www.boe.es/buscar/doc.php?id=BOE-A-2007-6237', v: 2,
  },
  telefono: {
    t: '112',
    d: 'Número único de urgencias en España (Real Decreto 903/1997) y número de emergencia único en toda la Unión Europea. Funciona sin saldo y sin cobertura del propio operador.',
    url: 'https://www.boe.es/buscar/doc.php?id=BOE-A-1997-14058', v: 2,
  },
  esAlert: {
    t: 'ES-Alert',
    d: 'Aviso masivo a los móviles de una zona mediante Cell Broadcast, adaptación del protocolo EU-Alert. No requiere registro ni aplicación: llega a todos los terminales presentes en el área. Lo gestiona el Ministerio del Interior y lo activan los centros de coordinación autonómicos y el Centro Nacional de Seguimiento y Coordinación de Emergencias.',
    url: 'https://www.proteccioncivil.es/coordinacion/redes/ran/public-warning-system', v: 2,
  },
  planes: [
    { r: 'inundacion', t: 'Plan Estatal de Protección Civil ante el Riesgo de Inundaciones', norma: 'Acuerdo del Consejo de Ministros de 29 de julio de 2011', url: 'https://www.boe.es/buscar/doc.php?id=BOE-A-2011-14277', v: 2 },
    { r: 'sismico', t: 'Plan Estatal de Protección Civil ante el Riesgo Sísmico', norma: 'Acuerdo del Consejo de Ministros de 26 de marzo de 2010', url: 'https://www.boe.es/buscar/doc.php?id=BOE-A-2010-5661', v: 2 },
    { r: null, t: 'Plan Estatal de Protección Civil ante el Riesgo Volcánico', norma: 'Acuerdo del Consejo de Ministros de 25 de enero de 2013', url: 'https://www.boe.es/buscar/doc.php?id=BOE-A-2013-1421', v: 2, nota: 'Riesgo geográficamente confinado a Canarias.' },
    { r: 'quimico', t: 'Plan Estatal de Protección Civil ante el Riesgo Químico', norma: 'Real Decreto 1070/2012, de 13 de julio', url: 'https://www.boe.es/buscar/doc.php?id=BOE-A-2012-10653', v: 2 },
    { r: 'incendio-forestal', t: 'Plan Estatal de Protección Civil para Emergencias por Incendios Forestales', norma: 'Acuerdo del Consejo de Ministros de 24 de octubre de 2014', url: 'https://www.boe.es/buscar/doc.php?id=BOE-A-2014-11493', v: 2 },
    { r: 'radiologico', t: 'Plan Básico de Emergencia Nuclear (PLABEN)', norma: 'Real Decreto 1546/2004, de 25 de junio', url: 'https://www.boe.es/buscar/doc.php?id=BOE-A-2004-13061', v: 2 },
    { r: 'transporte', t: 'Directriz Básica de Planificación ante el riesgo de accidentes en el transporte terrestre de mercancías peligrosas', norma: 'Acuerdo del Consejo de Ministros de 21 de abril de 2026, que deroga el RD 387/1996', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2026-9161', v: 1, nota: 'A nivel estatal lo vigente es una directriz básica de planificación, no un plan estatal operativo. Se recoge así para no llamar plan a lo que no lo es.' },
  ],
};

/* =========================================================================
   COMUNIDADES Y CIUDADES AUTÓNOMAS
     o  = organismo competente
     pt = plan territorial
     pe = planes especiales   { r: id de riesgo o null, s: sigla, t: nombre,
                                e: estado, url, v: nivel de confirmación }
     sp = riesgos sin plan propio (se aplica el marco estatal)
     n  = notas
   ========================================================================= */
export const CCAA = {
  '01': {
    o: { t: 'Agencia de Seguridad y Gestión Integral de Emergencias de Andalucía — Dirección General de Emergencias, Protección Civil y Lucha contra Incendios Forestales', url: 'https://www.juntadeandalucia.es/organismos/ema/estructura/dgepclif.html' },
    pt: { s: 'PTEAnd', t: 'Plan Territorial de Emergencias de Protección Civil de Andalucía', norma: 'Decreto 69/2024, de 4 de marzo', url: 'https://www.juntadeandalucia.es/boja/2024/47/1', v: 2 },
    pe: [
      { r: 'incendio-forestal', s: 'INFOCA', t: 'Plan de Emergencia por Incendios Forestales de Andalucía', e: 'aprobado', url: 'https://juntadeandalucia.es/organismos/sobre-junta/planes/detalle/42392.html', v: 2 },
      { r: 'inundacion', s: null, t: 'Plan de Emergencia ante el riesgo de inundaciones en Andalucía', e: 'aprobado, posiblemente en revisión', url: 'https://juntadeandalucia.es/organismos/sobre-junta/planes/detalle/42402.html', v: 1 },
      { r: 'sismico', s: null, t: 'Plan de Emergencias ante el Riesgo Sísmico en Andalucía', e: 'aprobado', url: 'https://www.juntadeandalucia.es/organismos/ema/estructura/transparencia/planificacion-evaluacion-estadistica/planes/detalle/42582.html', v: 2 },
      { r: 'transporte', s: null, t: 'Plan de Emergencia ante accidentes en el transporte de mercancías peligrosas por carretera y ferrocarril', e: 'aprobado', url: 'https://www.juntadeandalucia.es/organismos/sobre-junta/planes/detalle/42403.html', v: 2 },
      { r: null, s: null, t: 'Plan de Emergencia ante el riesgo de contaminación del litoral', e: 'aprobado', url: 'https://www.juntadeandalucia.es/boja/2008/130/1', v: 2 },
      { r: 'radiologico', s: null, t: 'Plan Especial de Riesgos Radiológicos de Andalucía', e: 'existencia citada por el Consejo de Seguridad Nuclear; norma autonómica no localizada', url: 'https://www.csn.es/', v: 1 },
    ],
    sp: ['quimico'],
    n: 'El riesgo químico no tiene plan autonómico único: se cubre con planes de emergencia exterior por instalación.',
  },
  '02': {
    o: { t: 'Dirección General de Interior y Emergencias, Gobierno de Aragón', url: 'https://www.aragon.es/organismos/departamento-de-hacienda-interior-y-administracion-publica/direccion-general-de-interior-y-emergencias' },
    pt: { s: 'PLATEAR', t: 'Plan Territorial de Protección Civil de Aragón', norma: 'Decreto 220/2014, de 16 de diciembre', url: 'https://www.boa.aragon.es/', v: 2 },
    pe: [
      { r: 'incendio-forestal', s: 'PROCINFO', t: 'Plan Especial ante Incendios Forestales en Aragón', e: 'aprobado', url: 'https://transparencia.aragon.es/sites/default/files/documents/procinfo.pdf', v: 2 },
      { r: 'inundacion', s: 'PROCINAR', t: 'Plan Especial ante el riesgo de inundaciones en Aragón', e: 'aprobado, Decreto 201/2019', url: 'https://www.aragon.es/', v: 1 },
      { r: 'sismico', s: 'PROCISIS', t: 'Plan Especial ante Sismos en Aragón', e: 'aprobado', url: 'https://www.aragon.es/documents/20127/2657996/PROCISIS.pdf', v: 1 },
      { r: 'transporte', s: 'PROCIMER', t: 'Plan Especial ante accidentes en el transporte de mercancías peligrosas', e: 'aprobado, Decreto 53/2018', url: 'https://www.aragon.es/', v: 1 },
      { r: 'radiologico', s: 'PROCIRA', t: 'Plan Especial ante el Riesgo Radiológico en Aragón', e: 'aprobado, Decreto 188/2018', url: 'https://www.aragon.es/', v: 1 },
      { r: 'frio-nieve', s: 'PROCIFEMAR', t: 'Plan Especial ante Fenómenos Meteorológicos Adversos de Aragón', e: 'aprobado, Decreto 147/2024', url: 'https://www.aragon.es/', v: 1 },
    ],
    sp: ['quimico'],
    n: 'Comunidad interior: sin riesgo de contaminación del litoral. Marco legal actual: Ley 4/2024 del Sistema de Protección Civil y Gestión de Emergencias de Aragón.',
  },
  '03': {
    o: { t: 'Servicio de Emergencias del Principado de Asturias (SEPA)', url: 'https://www.112asturias.es/' },
    pt: { s: 'PLATERPA', t: 'Plan Territorial de Protección Civil del Principado de Asturias', norma: 'Decreto 69/2014, de 16 de julio', url: 'https://www.112asturias.es/', v: 2 },
    pe: [
      { r: 'incendio-forestal', s: 'INFOPA', t: 'Plan Especial de Emergencias por Incendios Forestales', e: 'aprobado', url: 'https://www.112asturias.es/', v: 2 },
      { r: 'inundacion', s: 'PLANINPA', t: 'Plan Especial ante el Riesgo de Inundaciones', e: 'aprobado', url: 'https://www.112asturias.es/', v: 2 },
      { r: 'radiologico', s: 'RADIOPA', t: 'Plan Especial ante Riesgo Radiológico del Principado de Asturias', e: 'aprobado, publicado en BOPA en enero de 2024', url: 'https://www.boe.es/', v: 1 },
      { r: 'transporte', s: 'PLAMERPA', t: 'Plan de Emergencias ante el riesgo de Transporte de Mercancías Peligrosas', e: 'aprobado', url: 'https://www.112asturias.es/', v: 1 },
      { r: null, s: 'PLACAMPA', t: 'Plan Territorial de Contingencias por Contaminación Marina Accidental', e: 'aprobado', url: 'https://www.112asturias.es/', v: 1 },
      { r: 'frio-nieve', s: null, t: 'Plan de Protección Civil ante el Riesgo de Nevadas', e: 'se publica y actualiza cada temporada', url: 'https://www.112asturias.es/', v: 1 },
      { r: 'quimico', s: null, t: 'Planes de emergencia exterior por instalación', e: 'aprobados por instalación', url: 'https://www.112asturias.es/', v: 1 },
    ],
    sp: ['sismico'],
    n: 'El portal oficial bloquea la extracción automática, así que varios planes se confirmaron por referencias cruzadas del propio dominio y quedan marcados como pendientes. No se localizó plan sísmico: eso no equivale a que no exista.',
  },
  '04': {
    o: { t: "Direcció General d'Emergències i Interior, Govern de les Illes Balears — servicio operativo SEIB112", url: 'https://www.caib.es/webgoib/w/direccio-general-emergencies-i-interior' },
    pt: { s: 'PLATERBAL', t: 'Plan Territorial de Protección Civil de las Illes Balears', norma: 'Decreto 40/2014, de 29 de agosto', url: 'https://www.caib.es/sites/planificacioemergenciesipc/es/platerbal/', v: 2 },
    pe: [
      { r: 'incendio-forestal', s: 'INFOBAL', t: 'Plan Especial de Emergencias por Incendios Forestales', e: 'aprobado', url: 'https://www.caib.es/sites/planificacioemergenciesipc/es/infobal/', v: 2 },
      { r: 'inundacion', s: 'INUNBAL', t: 'Plan Especial ante el Riesgo de Inundaciones', e: 'aprobado', url: 'https://www.caib.es/sites/planificacioemergenciesipc/es/inunbal', v: 2 },
      { r: 'sismico', s: 'GEOBAL', t: 'Plan Especial ante el riesgo sísmico de las Illes Balears', e: 'aprobado', url: 'https://caib.es/sites/planificacioemergenciesipc/es/geobal', v: 2 },
      { r: 'viento-tormenta', s: 'METEOBAL', t: 'Plan Especial ante el riesgo de fenómenos meteorológicos adversos', e: 'aprobado', url: 'https://www.caib.es/sites/planificacioemergenciesipc/es/meteobal/', v: 2 },
      { r: null, s: 'CAMBAL', t: 'Plan Especial de Contingencia por Contaminación Accidental de Aguas Marinas', e: 'aprobado', url: 'https://www.caib.es/sites/planificacioemergenciesipc/es/cambal/', v: 1 },
      { r: 'transporte', s: 'MERPEBAL', t: 'Plan Especial ante el riesgo de transporte de mercancías peligrosas', e: 'aprobado', url: 'https://www.caib.es/sites/planificacioemergenciesipc/es/merpebal/', v: 1 },
      { r: 'radiologico', s: 'RADBAL', t: 'Plan Especial frente a Emergencias Radiológicas', e: 'aprobado', url: 'https://www.caib.es/sites/planificacioemergenciesipc/es/radbal/', v: 1 },
      { r: 'quimico', s: null, t: 'Planes de emergencia exterior por instalación', e: 'aprobados por instalación', url: 'https://www.caib.es/sites/planificacioemergenciesipc/es/seveso/', v: 1 },
    ],
    sp: [],
    n: 'Territorio insular: la contaminación del litoral y los incendios forestales tienen plan propio.',
  },
  '05': {
    o: { t: 'Dirección General de Emergencias del Gobierno de Canarias — centro coordinador CECOES 1-1-2', url: 'https://www.gobiernodecanarias.org/emergencias/' },
    pt: { s: 'PLATECA', t: 'Plan Territorial de Emergencias de Protección Civil de Canarias', norma: 'Decreto 98/2015, de 22 de mayo, modificado por Decreto 195/2022', url: 'https://www.gobiernodecanarias.org/emergencias/', v: 2 },
    pe: [
      { r: null, s: 'PEVOLCA', t: 'Plan Especial por Riesgo Volcánico', e: 'aprobado, Decreto 112/2018', url: 'https://www.gobiernodecanarias.org/emergencias/', v: 2, nota: 'Único plan autonómico de riesgo volcánico de España.' },
      { r: 'incendio-forestal', s: 'INFOCA', t: 'Plan Especial por Incendios Forestales de Canarias', e: 'aprobado', url: 'https://www.gobiernodecanarias.org/emergencias/', v: 2 },
      { r: 'inundacion', s: 'PEINCA', t: 'Plan Especial por Riesgo de Inundaciones', e: 'aprobado', url: 'https://www.gobiernodecanarias.org/emergencias/', v: 2 },
      { r: 'sismico', s: 'PESICAN', t: 'Plan Especial por Riesgo Sísmico', e: 'aprobado', url: 'https://www.gobiernodecanarias.org/emergencias/', v: 2 },
      { r: 'quimico', s: 'RISQCAN', t: 'Plan Especial por Riesgo de Accidentes Graves con Sustancias Peligrosas', e: 'aprobado, Decreto 73/2021', url: 'https://www.gobiernodecanarias.org/emergencias/', v: 2 },
      { r: 'transporte', s: 'PEMERCA', t: 'Plan Especial por Accidentes en el Transporte de Mercancías Peligrosas por Carretera', e: 'aprobado, Decreto 9/2014', url: 'https://www.gobiernodecanarias.org/emergencias/planes-de-emergencias/', v: 2 },
      { r: 'radiologico', s: 'RADICAN', t: 'Plan Especial por Riesgo Radiológico', e: 'aprobado, Decreto 114/2018', url: 'https://www.gobiernodecanarias.org/emergencias/', v: 2 },
      { r: 'viento-tormenta', s: 'PEFMA', t: 'Plan Específico por Riesgos de Fenómenos Meteorológicos Adversos', e: 'aprobado, Decreto 186/2006 actualizado en 2014', url: 'https://www.gobiernodecanarias.org/emergencias/', v: 2 },
    ],
    sp: [],
    n: 'Existen además planes territoriales insulares por cada isla, de ámbito insular y no autonómico.',
  },
  '06': {
    o: { t: 'Servicio de Emergencias de Cantabria (SEC / 112 Cantabria)', url: 'https://112.cantabria.es/' },
    pt: { s: 'PLATERCANT', t: 'Plan Territorial de Emergencias de Protección Civil de Cantabria', norma: 'Decreto 141/1999, con actualización posterior', url: 'https://112.cantabria.es/normativa-y-contratacion/normativa/platercant-2180', v: 1 },
    pe: [
      { r: 'incendio-forestal', s: 'INFOCANT', t: 'Plan Especial de Emergencias por Incendios Forestales', e: 'aprobado, Decreto 192/2023', url: 'https://112.cantabria.es/normativa-y-contratacion/normativa/infocant-2187', v: 2 },
      { r: 'inundacion', s: 'INUNCANT', t: 'Plan Especial ante el Riesgo de Inundaciones', e: 'aprobado, Decreto 57/2010', url: 'https://112.cantabria.es/normativa-y-contratacion/normativa/inuncant', v: 2 },
      { r: 'radiologico', s: 'RADIOCANT', t: 'Plan Especial ante el Riesgo Radiológico', e: 'aprobado, Decreto 69/2024', url: 'https://112.cantabria.es/', v: 1 },
      { r: 'viento-tormenta', s: 'METEOCANT', t: 'Plan Especial ante Riesgos Meteorológicos Adversos', e: 'aprobado, muy reciente', url: 'https://112.cantabria.es/', v: 1 },
      { r: 'quimico', s: null, t: 'Planes de emergencia exterior por instalación, Decreto 70/2018', e: 'aprobados por instalación', url: 'https://112.cantabria.es/', v: 1 },
    ],
    sp: ['sismico', 'transporte'],
    n: 'METEOCANT cubre un hueco de planificación: hasta su aprobación solo había plan para inundaciones.',
  },
  '07': {
    o: { t: 'Agencia de Protección Civil de la Junta de Castilla y León', url: 'https://www.jcyl.es/web/es/administracionpublica/proteccion-civil.html' },
    pt: { s: 'PLANCAL', t: 'Plan Territorial de Protección Civil de Castilla y León', norma: 'Decreto 4/2019, de 28 de febrero', url: 'https://www.jcyl.es/web/es/administracionpublica/proteccion-civil.html', v: 2 },
    pe: [
      { r: 'incendio-forestal', s: 'INFOCAL', t: 'Plan Especial ante Emergencias por Incendios Forestales', e: 'aprobado, Decreto 6/2025', url: 'https://www.jcyl.es/web/es/administracionpublica/proteccion-civil.html', v: 2 },
      { r: 'inundacion', s: 'INUNCYL', t: 'Plan ante el Riesgo de Inundaciones de Castilla y León', e: 'homologado, Acuerdo 19/2010', url: 'https://www.jcyl.es/web/es/administracionpublica/proteccion-civil.html', v: 2 },
      { r: 'transporte', s: 'MPCYL', t: 'Plan ante el Riesgo de Transportes de Mercancías Peligrosas', e: 'homologado, Acuerdo 3/2008', url: 'https://www.jcyl.es/web/es/administracionpublica/proteccion-civil.html', v: 2 },
      { r: 'radiologico', s: 'RADIOCYL', t: 'Plan Especial ante el Riesgo Radiológico', e: 'en tramitación, información pública en 2024', url: 'https://www.jcyl.es/web/es/administracionpublica/proteccion-civil.html', v: 1 },
      { r: 'quimico', s: null, t: 'Planes de emergencia exterior por instalación', e: 'aprobados por instalación', url: 'https://www.jcyl.es/web/es/administracionpublica/proteccion-civil/planificacion-proteccion-civil.html', v: 2 },
    ],
    sp: ['sismico', 'frio-nieve'],
    n: 'No se localizó plan especial homologado de nevadas, solo una campaña anual de carácter operativo. Comunidad interior: sin riesgo de litoral.',
  },
  '08': {
    o: { t: 'Dirección General de Protección Ciudadana de Castilla-La Mancha — Servicio 1-1-2', url: 'https://112.castillalamancha.es/' },
    pt: { s: 'PLATECAM', t: 'Plan Territorial de Emergencia de Castilla-La Mancha', norma: 'revisión de 2021', url: 'https://112.castillalamancha.es/proteccion-civil/planes/plan-territorial-de-emergencia-de-castilla-la-mancha-platecam', v: 1 },
    pe: [
      { r: 'incendio-forestal', s: 'INFOCAM', t: 'Plan Especial de Emergencia por Incendios Forestales', e: 'aprobado, Orden 187/2017', url: 'https://112.castillalamancha.es/proteccion-civil/planes', v: 2 },
      { r: 'inundacion', s: 'PRICAM', t: 'Plan Especial ante el Riesgo de Inundaciones', e: 'aprobado, actualizado por Orden 126/2021', url: 'https://112.castillalamancha.es/proteccion-civil/planes', v: 2 },
      { r: 'sismico', s: 'SISMICAM', t: 'Plan Especial por Riesgo Sísmico', e: 'aprobado, Orden 2/2023', url: 'https://112.castillalamancha.es/proteccion-civil/planes', v: 2 },
      { r: 'transporte', s: 'PETCAM', t: 'Plan Especial de Transporte de Mercancías Peligrosas por Carretera y Ferrocarril', e: 'aprobado, revisado por Orden 27/2026', url: 'https://112.castillalamancha.es/proteccion-civil/planes', v: 2 },
      { r: 'radiologico', s: 'RADIOCAM', t: 'Plan Especial ante el Riesgo Radiológico', e: 'aprobado, con informe favorable del Consejo de Seguridad Nuclear', url: 'https://112.castillalamancha.es/proteccion-civil/planes', v: 2 },
      { r: 'viento-tormenta', s: 'METEOCAM', t: 'Plan Específico ante el Riesgo de Fenómenos Meteorológicos Adversos', e: 'aprobado, versión 2025', url: 'https://112.castillalamancha.es/proteccion-civil/planes', v: 2 },
      { r: 'quimico', s: null, t: 'Planes de emergencia exterior por instalación', e: 'aprobados por instalación', url: 'https://112.castillalamancha.es/proteccion-civil/planes', v: 2 },
    ],
    sp: [],
    n: 'Comunidad interior: sin riesgo de litoral.',
  },
  '09': {
    o: { t: "Direcció General de Protecció Civil, Departament d'Interior i Seguretat Pública, Generalitat de Catalunya", url: 'https://interior.gencat.cat/ca/arees_dactuacio/proteccio_civil/' },
    pt: { s: 'PROCICAT', t: 'Pla territorial de protecció civil de Catalunya', norma: 'Acord GOV/114/2022, de 31 de maig', url: 'https://interior.gencat.cat/ca/arees_dactuacio/proteccio_civil/', v: 2 },
    pe: [
      { r: 'incendio-forestal', s: 'INFOCAT', t: "Pla especial d'emergències per incendis forestals", e: 'aprobado', url: 'https://interior.gencat.cat/ca/arees_dactuacio/proteccio_civil/', v: 2 },
      { r: 'inundacion', s: 'INUNCAT', t: "Pla especial d'emergències per inundacions", e: 'aprobado, con revisión posterior', url: 'https://interior.gencat.cat/ca/arees_dactuacio/proteccio_civil/', v: 2 },
      { r: 'sismico', s: 'SISMICAT', t: "Pla especial d'emergències sísmiques", e: 'aprobado, revisión 2020', url: 'https://interior.gencat.cat/ca/arees_dactuacio/proteccio_civil/', v: 2 },
      { r: 'quimico', s: 'PLASEQCAT', t: "Pla especial d'emergència exterior del sector químic", e: 'aprobado, Acord GOV/29/2015, en actualización', url: 'https://interior.gencat.cat/ca/arees_dactuacio/proteccio_civil/plans-proteccio-civil/plans-especials/plaseqcat/', v: 2 },
      { r: 'transporte', s: 'TRANSCAT', t: "Pla especial per accidents en el transport de mercaderies perilloses", e: 'aprobado', url: 'https://interior.gencat.cat/ca/arees_dactuacio/proteccio_civil/', v: 2 },
      { r: 'radiologico', s: 'RADCAT', t: "Pla especial per a emergències radiològiques", e: 'aprobado', url: 'https://interior.gencat.cat/ca/arees_dactuacio/proteccio_civil/', v: 2 },
      { r: 'frio-nieve', s: 'NEUCAT', t: "Pla especial d'emergències per nevades", e: 'aprobado, Acord GOV/207/2023', url: 'https://interior.gencat.cat/ca/arees_dactuacio/proteccio_civil/plans-proteccio-civil/plans-especials/neucat', v: 2 },
      { r: null, s: 'CAMCAT', t: "Pla especial d'emergències per contaminació marina", e: 'aprobado', url: 'https://interior.gencat.cat/ca/arees_dactuacio/proteccio_civil/plans-proteccio-civil/plans-especials/camcat/', v: 2 },
    ],
    sp: [],
    n: 'Cataluña es la única comunidad con plan especial autonómico único de riesgo químico. Además exige plan de actuación municipal a los municipios que los planes especiales identifican como afectados: por eso la ficha de Terrassa puede decir qué riesgos tiene reconocidos oficialmente.',
  },
  '10': {
    o: { t: "Agència Valenciana de Seguretat i Resposta a les Emergències (AVSRE)", url: 'https://avsre.gva.es/' },
    pt: { s: 'PTECV', t: 'Plan Territorial de Emergencia de la Comunitat Valenciana', norma: 'Decreto 119/2013, de 20 de septiembre', url: 'https://www.112cv.gva.es/', v: 2 },
    pe: [
      { r: 'incendio-forestal', s: 'PEIF', t: 'Plan Especial frente al Riesgo de Incendios Forestales', e: 'aprobado, con actualizaciones posteriores', url: 'https://avsre.gva.es/es/web/emergencias/planes-de-emergencia', v: 2 },
      { r: 'inundacion', s: null, t: 'Plan Especial ante el Riesgo de Inundaciones', e: 'aprobado, Decreto 81/2010', url: 'https://avsre.gva.es/es/web/emergencias/planes-de-emergencia', v: 2 },
      { r: 'sismico', s: null, t: 'Plan Especial frente al Riesgo Sísmico', e: 'aprobado, Decreto 44/2011', url: 'https://dogv.gva.es/', v: 2 },
      { r: 'transporte', s: null, t: 'Plan Especial ante Accidentes en el Transporte de Mercancías Peligrosas', e: 'aprobado, Decreto 49/2011', url: 'https://avsre.gva.es/es/web/emergencias/planes-de-emergencia', v: 2 },
      { r: 'radiologico', s: null, t: 'Plan Especial ante el Riesgo Radiológico', e: 'aprobado, Decreto 114/2013', url: 'https://dogv.gva.es/', v: 2 },
      { r: 'frio-nieve', s: null, t: 'Procedimiento de Actuación frente al riesgo de nevadas', e: 'procedimiento de actuación, rango inferior a plan especial', url: 'https://avsre.gva.es/es/web/emergencias/planes-de-emergencia', v: 1 },
      { r: null, s: null, t: 'Procedimiento de Actuación frente a la Contaminación Marina', e: 'procedimiento de actuación, rango inferior a plan especial', url: 'https://www.112cv.gva.es/', v: 1 },
    ],
    sp: ['quimico'],
    n: 'El organismo distingue formalmente entre planes especiales aprobados por decreto y procedimientos de actuación. Aquí se respeta esa distinción en vez de igualarlos.',
  },
  '11': {
    o: { t: 'Dirección General de Emergencias y Protección Civil, Junta de Extremadura', url: 'https://www.juntaex.es/' },
    pt: { s: 'PLATERCAEX', t: 'Plan Territorial de Protección Civil de Extremadura', norma: 'Decreto 143/2002, con registro regulado por Decreto 32/2023', url: 'https://www.juntaex.es/w/platercaex-1', v: 2 },
    pe: [
      { r: 'incendio-forestal', s: 'INFOEX', t: 'Plan de Lucha contra Incendios Forestales de Extremadura', e: 'aprobado, Decreto 132/2022', url: 'https://doe.juntaex.es/', v: 2 },
      { r: 'inundacion', s: 'INUNCAEX', t: 'Plan Especial de Riesgo de Inundaciones', e: 'aprobado, actualizado por Decreto 39/2025', url: 'https://www.juntaex.es/w/platercaex-1', v: 2 },
      { r: 'sismico', s: 'PLASISMEX', t: 'Plan Especial ante el Riesgo Sísmico', e: 'aprobado, Decreto 127/2009', url: 'https://www.juntaex.es/w/plasismex', v: 2 },
      { r: 'radiologico', s: 'RADIOCAEX', t: 'Plan Especial sobre Riesgo Radiológico', e: 'aprobado, Decreto 200/2019', url: 'https://www.juntaex.es/', v: 2 },
      { r: 'transporte', s: 'TRANSCAEX', t: 'Plan Especial sobre Transporte de Mercancías Peligrosas', e: 'aprobado', url: 'https://www.juntaex.es/', v: 2 },
    ],
    sp: ['quimico', 'frio-nieve'],
    n: 'Comunidad interior: sin riesgo de litoral. El Decreto 32/2023 regula el registro de planes de protección civil de Extremadura.',
  },
  '12': {
    o: { t: 'Dirección Xeral de Emerxencias e Interior / Axencia Galega de Emerxencias (AXEGA)', url: 'https://conselleriadepresidencia.xunta.gal/emerxencias-e-interior' },
    pt: { s: 'PLATERGA', t: 'Plan Territorial de Emergencias de Galicia', norma: 'publicado como anexo del Decreto 56/2000, actualizado en 2009 conforme a la Ley 5/2007 de emergencias de Galicia', url: 'https://www.xunta.gal/', v: 2 },
    pe: [
      { r: 'incendio-forestal', s: 'PEIFOGA', t: 'Plan especial ante emergencias por incendios forestales', e: 'aprobado, Resolución de 28 de mayo de 2015', url: 'https://www.xunta.gal/dog/Publicados/2015/20150609/AnuncioG0244-020615-0001_es.html', v: 2 },
      { r: 'inundacion', s: null, t: 'Plan Especial ante el Riesgo de Inundaciones en Galicia', e: 'aprobado, Resolución de 13 de marzo de 2002', url: 'https://www.xunta.gal/dog/Publicados/2002/20020423/Anuncio68D2_es.html', v: 1 },
      { r: 'sismico', s: 'SISMIGAL', t: 'Plan especial ante el riesgo de terremotos en Galicia', e: 'en tramitación: revisión con informe favorable, el vigente databa de 2009', url: 'https://www.xunta.gal/', v: 1 },
      { r: 'radiologico', s: 'PERRGAL', t: 'Plan Especial ante el Riesgo Radiológico de Galicia', e: 'en tramitación, información pública en 2025', url: 'https://www.xunta.gal/', v: 1 },
      { r: 'transporte', s: 'PLANTRANSGAL', t: 'Plan de Emergencia por Accidente en el Transporte de Mercancías Peligrosas', e: 'aprobado, Resolución de 24 de abril de 2000', url: 'https://www.xunta.gal/dog/Publicados/2000/20000508/AnuncioABC6_es.html', v: 1 },
      { r: 'frio-nieve', s: 'NEGA', t: 'Plan de Protección Civil ante el Riesgo de Nevadas en Galicia', e: 'homologado, revisión de 2002', url: 'https://www.xunta.gal/dog/Publicados/2002/20020726/AnuncioBB46_es.html', v: 1 },
      { r: null, s: 'CAMGAL', t: 'Plan territorial de contingencias por contaminación marina accidental', e: 'aprobado, revisión aprobada en 2021', url: 'https://www.plancamgal.gal/es/documentacion', v: 2 },
    ],
    sp: ['quimico'],
    n: 'Varios planes gallegos son de comienzos de los 2000 y solo se localizó una fuente oficial directa. Los de riesgo sísmico y radiológico están en revisión y todavía no confirmados como aprobados en su versión más reciente.',
  },
  '13': {
    o: { t: 'Dirección General de Protección Civil de la Comunidad de Madrid', url: 'https://www.comunidad.madrid/centros/direccion-general-proteccion-civil' },
    pt: { s: 'PLATERCAM', t: 'Plan Territorial de Protección Civil de la Comunidad de Madrid', norma: 'Acuerdo del Consejo de Gobierno de 30 de abril de 2019', url: 'https://www.comunidad.madrid/transparencia/informacion-institucional/planes-programas/plan-territorial-proteccion-civil-comunidad-madrid', v: 2 },
    pe: [
      { r: 'incendio-forestal', s: 'INFOMA', t: 'Plan Especial de Emergencia por Incendios Forestales', e: 'aprobado', url: 'https://www.comunidad.madrid/transparencia/informacion-institucional/planes-programas/plan-proteccion-civil-incendios-forestales-comunidad', v: 2 },
      { r: 'inundacion', s: 'INUNCAM', t: 'Plan Especial ante el Riesgo de Inundaciones', e: 'aprobado', url: 'https://www.comunidad.madrid/transparencia/informacion-institucional/planes-programas/plan-actuacion-caso-inundaciones-comunidad-madrid', v: 2 },
      { r: 'transporte', s: 'TRANSCAM', t: 'Plan Especial ante accidentes en el transporte de mercancías peligrosas por carretera y ferrocarril', e: 'aprobado', url: 'https://www.comunidad.madrid/transparencia/informacion-institucional/planes-programas/plan-especial-proteccion-civil-riesgo-accidentes', v: 2 },
      { r: 'radiologico', s: 'RADCAM', t: 'Plan Especial ante el Riesgo Radiológico', e: 'aprobado', url: 'https://www.bocm.es/', v: 2 },
      { r: 'frio-nieve', s: null, t: 'Plan de Protección Civil ante Inclemencias Invernales', e: 'aprobado, se revisa cada año', url: 'https://www.comunidad.madrid/transparencia/informacion-institucional/planes-programas/plan-proteccion-civil-inclemencias-invernales-comunidad', v: 2 },
      { r: 'quimico', s: null, t: 'Planes de emergencia exterior por instalación', e: 'aprobados por instalación', url: 'https://www.comunidad.madrid/seguridad-emergencias-asem-112/planes-proteccion-civil-comunidad-madrid', v: 1 },
    ],
    sp: ['sismico'],
    n: 'La Ley 5/2023 crea el Sistema Integrado de Protección Civil y Emergencias de la Comunidad de Madrid. Comunidad interior: sin riesgo de litoral.',
  },
  '14': {
    o: { t: 'Dirección General de Protección Civil de la Región de Murcia', url: 'https://www.112rmurcia.es/' },
    pt: { s: 'PLATEMUR', t: 'Plan Territorial de Protección Civil de la Región de Murcia', norma: null, url: 'https://www.112rmurcia.es/index.php/proteccion-civil/planes-por-territorio/platemur', v: 1 },
    pe: [
      { r: 'incendio-forestal', s: 'INFOMUR', t: 'Plan de Emergencia por Incendios Forestales', e: 'homologado, con revisiones posteriores', url: 'https://www.112rmurcia.es/index.php/proteccion-civil/planes-de-emergencia-autonomicos/infomur', v: 2 },
      { r: 'inundacion', s: 'INUNMUR', t: 'Plan Especial ante el Riesgo de Inundaciones', e: 'aprobado', url: 'https://dspace.carm.es/', v: 1 },
      { r: 'sismico', s: 'SISMIMUR', t: 'Plan Especial ante el Riesgo Sísmico', e: 'aprobado en 2015, revisión de 2021', url: 'https://dspace.carm.es/', v: 2 },
      { r: 'quimico', s: 'PLANQUIES', t: 'Plan de Emergencia Exterior del Sector Químico del Valle de Escombreras', e: 'aprobado', url: 'https://www.carm.es/', v: 2 },
      { r: 'transporte', s: 'TRANSMUR', t: 'Plan Especial sobre Transporte de Mercancías Peligrosas', e: 'aprobado en 2013', url: 'https://www.112rmurcia.es/index.php/proteccion-civil/planes-de-emergencia-autonomicos/transmur', v: 2 },
      { r: 'radiologico', s: 'RADIMUR', t: 'Plan Especial ante el Riesgo Radiológico', e: 'aprobado en 2020, con informe favorable del Consejo de Seguridad Nuclear', url: 'https://www.112rmurcia.es/index.php/proteccion-civil/planes-de-emergencia-autonomicos/radiologico-radimur', v: 2 },
      { r: 'viento-tormenta', s: 'METEOMUR', t: 'Plan Especial ante Fenómenos Meteorológicos Adversos', e: 'aprobado', url: 'https://www.112rmurcia.es/index.php/proteccion-civil/planes-de-emergencia-autonomicos/meteomur', v: 1 },
      { r: null, s: 'CONMAMUR', t: 'Plan Territorial de Contingencias por Contaminación Marina Accidental', e: 'aprobado en 2010', url: 'https://dspace.carm.es/', v: 2 },
    ],
    sp: [],
    n: 'Marco legal: Ley 3/2023 de Emergencias y Protección Civil de la Región de Murcia.',
  },
  '15': {
    o: { t: 'Servicio de Protección Civil y Emergencias, Gobierno de Navarra', url: 'https://gobiernoabierto.navarra.es/es/tema/proteccion-civil' },
    pt: { s: 'PLATENA', t: 'Plan Territorial de Protección Civil de Navarra', norma: 'revisión de diciembre de 2020 conforme al Real Decreto 734/2019', url: 'https://gobiernoabierto.navarra.es/es/gobernanza/planes-y-programas-accion-gobierno/plan-territorial-proteccion-civil-navarra-platena-2020', v: 2 },
    pe: [
      { r: 'incendio-forestal', s: 'INFONA', t: 'Plan Especial de Emergencia por Incendios Forestales', e: 'aprobado en 2022', url: 'https://gobiernoabierto.navarra.es/es/tema/proteccion-civil', v: 2 },
      { r: 'inundacion', s: null, t: 'Plan Especial de Emergencias ante el Riesgo de Inundaciones', e: 'aprobado, Decreto Foral 45/2002, revisado en 2020', url: 'https://gobiernoabierto.navarra.es/es/tema/proteccion-civil', v: 2 },
      { r: 'sismico', s: 'SISNA', t: 'Plan Especial ante el Riesgo Sísmico', e: 'aprobado en 2020', url: 'https://gobiernoabierto.navarra.es/es/tema/proteccion-civil', v: 2 },
      { r: 'transporte', s: null, t: 'Plan Especial ante accidentes en el transporte de mercancías peligrosas', e: 'aprobado en 2020', url: 'https://gobiernoabierto.navarra.es/es/tema/proteccion-civil', v: 2 },
      { r: 'radiologico', s: null, t: 'Plan Especial de emergencia ante el Riesgo Radiológico', e: 'aprobado en 2020', url: 'https://gobiernoabierto.navarra.es/es/tema/proteccion-civil', v: 2 },
      { r: 'frio-nieve', s: null, t: 'Plan Territorial ante Fenómenos Meteorológicos Adversos por grandes nevadas', e: 'aprobado, anexo del plan territorial', url: 'https://www.navarra.es/', v: 2 },
    ],
    sp: ['quimico'],
    n: 'Marco legal: Ley Foral 8/2005 de Protección Civil y Atención de Emergencias, modificada por la Ley Foral 8/2019. Comunidad interior: sin riesgo de litoral.',
  },
  '16': {
    o: { t: 'Dirección de Atención de Emergencias y Meteorología, Departamento de Seguridad, Gobierno Vasco', url: 'https://www.euskadi.eus/emergencias-quienes-somos/web01-s2segur/es/' },
    pt: { s: 'LABI', t: 'Larrialdiei Aurregiteko Bidea — Plan de Protección Civil de Euskadi', norma: 'Decreto 153/1997, con revisión extraordinaria por Decreto 1/2015', url: 'https://www.euskadi.eus/', v: 2 },
    pe: [
      { r: 'incendio-forestal', s: null, t: 'Plan Especial de Emergencias por Riesgo de Incendios Forestales', e: 'vigente, tercera revisión de diciembre de 2024', url: 'https://www.euskadi.eus/', v: 2 },
      { r: 'inundacion', s: null, t: 'Plan Especial de Emergencias ante el Riesgo de Inundaciones', e: 'vigente desde 2015', url: 'https://www.euskadi.eus/plan-especial-emergencias-inundaciones/web01-a2blarri/es/', v: 2 },
      { r: 'sismico', s: null, t: 'Plan de Emergencia ante el Riesgo Sísmico de Euskadi', e: 'vigente desde 2007', url: 'https://www.euskadi.eus/plan-riesgo-sismico/web01-a2blarri/es/', v: 2 },
      { r: 'transporte', s: null, t: 'Plan Especial ante accidentes en el transporte de mercancías peligrosas', e: 'vigente desde 2001', url: 'https://www.euskadi.eus/plan-transporte-mercancias-peligrosas/web01-a2blarri/es/', v: 2 },
      { r: 'radiologico', s: null, t: 'Plan Especial de Emergencia ante el Riesgo Radiológico', e: 'vigente desde 2014', url: 'https://www.euskadi.eus/plan-riesgo-radiologico/web01-a2blarri/es/', v: 2 },
      { r: null, s: 'ITSASERTZA', t: 'Plan Especial ante la Contaminación de la Ribera del Mar', e: 'vigente desde 2019', url: 'https://www.euskadi.eus/', v: 2 },
    ],
    sp: ['quimico', 'frio-nieve'],
    n: 'Ante meteorología adversa existe un protocolo de avisos y actuación, no un plan especial homologado.',
  },
  '17': {
    o: { t: 'Dirección General de Justicia e Interior, Gobierno de La Rioja — servicio operativo SOS Rioja 112', url: 'https://www.larioja.org/emergencias-112/es/proteccion-civil' },
    pt: { s: 'PLATERCAR', t: 'Plan Territorial de Protección Civil de La Rioja', norma: 'Decreto 137/2011, de 30 de septiembre', url: 'https://www.larioja.org/emergencias-112/es/proteccion-civil', v: 2 },
    pe: [
      { r: 'incendio-forestal', s: 'INFOCAR', t: 'Plan Especial de Emergencia por Incendios Forestales', e: 'vigente', url: 'https://www.larioja.org/emergencias-112/es/proteccion-civil', v: 1 },
      { r: 'inundacion', s: 'INUNCAR', t: 'Plan Especial ante Inundaciones', e: 'aprobado, Decreto 2/2019', url: 'https://www.larioja.org/emergencias-112/es/proteccion-civil', v: 1 },
      { r: 'transporte', s: 'TRANSCAR', t: 'Plan Especial sobre Transporte de Mercancías Peligrosas', e: 'aprobado, Decreto 138/2011', url: 'https://www.larioja.org/emergencias-112/es/proteccion-civil', v: 1 },
      { r: 'radiologico', s: 'RADIOCAR', t: 'Plan Especial ante Emergencias Radiológicas', e: 'aprobado, Decreto 1/2019', url: 'https://www.larioja.org/emergencias-112/es/proteccion-civil', v: 1 },
    ],
    sp: ['sismico', 'quimico'],
    n: 'Marco legal: Ley 1/2011 de Protección Civil y Atención de Emergencias de La Rioja. No se pudo confirmar ni descartar un plan específico de nevadas. Comunidad interior: sin riesgo de litoral.',
  },
  '18': {
    o: { t: 'Consejo de Gobierno de la Ciudad Autónoma de Ceuta, con informe de la Comisión Nacional de Protección Civil', url: 'https://www.ceuta.es/' },
    pt: { s: 'PLATERCE', t: 'Plan Territorial de Protección Civil de la Ciudad Autónoma de Ceuta', norma: 'Acuerdo del Consejo de Gobierno de 24 de febrero de 2026, publicado en el BOCCE de 17 de marzo de 2026', url: 'https://www.ceuta.es/', v: 2 },
    pe: [
      { r: 'sismico', s: 'PLASIMCE', t: 'Plan Especial por Riesgo Sísmico', e: 'vigente desde 2026', url: 'https://www.ceuta.es/', v: 2 },
      { r: 'inundacion', s: 'INUNCE', t: 'Plan Especial para Riesgo de Inundaciones', e: 'vigente desde 2026', url: 'https://www.ceuta.es/', v: 2 },
      { r: 'incendio-forestal', s: 'INFOCE', t: 'Plan Especial para Riesgo de Incendio Forestal', e: 'vigente desde 2026', url: 'https://www.ceuta.es/', v: 2 },
    ],
    sp: ['quimico', 'transporte', 'radiologico', 'frio-nieve'],
    n: 'Ceuta es Ciudad Autónoma, no comunidad autónoma. La Administración General del Estado interviene a través de la Delegación del Gobierno, del Centro Nacional de Seguimiento y Coordinación de Emergencias y de la Comisión Nacional de Protección Civil, que informa y homologa sus planes conforme a la Ley 17/2015. Sus tres planes especiales son de 2026: la planificación se ha renovado por completo.',
  },
  '19': {
    o: { t: 'Consejería de Seguridad Ciudadana de la Ciudad Autónoma de Melilla', url: 'https://www.melilla.es/' },
    pt: { s: 'PLATERME', t: 'Plan Territorial de Protección Civil de la Ciudad Autónoma de Melilla', norma: 'homologado por la Comisión Nacional de Protección Civil en diciembre de 1997; en proceso de reforma', url: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-1998-4294', v: 2 },
    pe: [
      { r: null, s: 'PROLIME', t: 'Plan Territorial de Contingencias de protección de la ribera del mar contra la contaminación marina', e: 'vigente', url: 'https://www.melilla.es/', v: 2 },
    ],
    sp: ['incendio-forestal', 'inundacion', 'sismico', 'quimico', 'transporte', 'radiologico', 'frio-nieve'],
    n: 'Melilla es Ciudad Autónoma, no comunidad autónoma. Su plan territorial es de 1997 y está en proceso de reforma tras casi tres décadas. Existe la Comisión de Protección Civil de Melilla, de coordinación con la Administración General del Estado, que además interviene mediante la Delegación del Gobierno y el Centro Nacional de Seguimiento y Coordinación de Emergencias.',
  },
};

/* Aviso que la app muestra siempre junto a este bloque. Va aquí y no en la
   vista para que no se pueda enseñar el dato sin enseñar su límite. */
export const AVISO_TERRITORIOS =
  'Que exista un plan oficial ante un riesgo indica que la administración competente lo reconoce como relevante en ese territorio. NO indica cuánta probabilidad hay ni cuánto daño causaría. Los planes se revisan y se sustituyen: comprueba siempre la versión vigente en el enlace oficial antes de tomar una decisión importante.';
