/* =========================================================================
   LEGAL — Aviso legal, condiciones de uso y política de privacidad
   ---------------------------------------------------------------------------
   ANTES DE PUBLICAR O VENDER LA APP: rellena TITULAR con los datos de quien
   la explota (persona o empresa). La LSSI (art. 10) obliga a mostrarlos y el
   RGPD (art. 13) a identificar al responsable del tratamiento. Mientras falte
   algún dato obligatorio, la pantalla legal muestra un aviso visible y las
   pruebas unitarias lo recuerdan (sin fallar).

   Si cambias el texto, actualiza FECHA_LEGAL: la portada vuelve a mostrar el
   aviso inicial a quien aceptó una versión anterior.

   Los textos describen lo que la app hace DE VERDAD con los datos (ver
   store.js, sync.js, avisos.js y netlify/). Si se añade una conexión nueva,
   hay que añadirla aquí. Es una base redactada con cuidado, no un dictamen:
   conviene que la revise un abogado antes de comercializar la app.
   ========================================================================= */

export const FECHA_LEGAL = '2026-11-08';

export const TITULAR = {
  nombre: '',      // Nombre y apellidos o razón social (obligatorio)
  nif: '',         // NIF / CIF (obligatorio)
  domicilio: '',   // Domicilio completo (obligatorio)
  email: '',       // Correo de contacto y para ejercer derechos (obligatorio)
  registro: '',    // Solo sociedades: datos del Registro Mercantil (opcional)
  web: '',         // Dirección pública de la app (opcional)
};

const OBLIGATORIOS = ['nombre', 'nif', 'domicilio', 'email'];

/** Campos obligatorios de TITULAR que siguen vacíos. */
export function faltanDatosTitular(t = TITULAR) {
  return OBLIGATORIOS.filter((k) => !String(t[k] || '').trim());
}

/* Bloques de texto. `p` = párrafos, `li` = lista. Se pintan con esc(), así que
   aquí no va HTML. {titular} y {email} se sustituyen al pintar. */

export const AVISO_INICIAL = [
  'Esta app es una guía de consulta y formación. En una emergencia real, llama al 112 y sigue siempre las instrucciones de Protección Civil y de los servicios de emergencia.',
  'La información sanitaria y de primeros auxilios no sustituye a un profesional. Las técnicas de fuego, herramientas de corte, plantas silvestres, agua y autodefensa conllevan riesgo: practícalas con formación, con prudencia y dentro de la ley.',
  'Tus datos se guardan en este dispositivo. No se envían a nadie salvo que actives tú la sincronización o los avisos.',
];

export const AVISO_LEGAL = [
  { h: 'Objeto', p: [
    'Esta aplicación ofrece información general y material formativo sobre preparación ante emergencias, autoprotección, supervivencia y vida al aire libre, además de herramientas para organizar un plan personal y familiar.',
    'Su uso es gratuito salvo que el titular indique otra cosa en el canal donde se ofrezca. Usarla implica aceptar este aviso legal.',
  ] },
  { h: 'No sustituye a los servicios de emergencia', p: [
    'Ante cualquier emergencia, llama al 112. Las indicaciones de Protección Civil, del 112, de los cuerpos de seguridad y de los servicios sanitarios tienen siempre prioridad sobre el contenido de esta app.',
    'La información sanitaria y de primeros auxilios es divulgativa y no sustituye la valoración, el diagnóstico ni el tratamiento de un profesional sanitario.',
  ] },
  { h: 'Actividades con riesgo', p: [
    'Parte del contenido describe actividades que pueden causar daños a personas o bienes si se hacen mal o en un contexto inadecuado. En particular:',
  ], li: [
    'Fuego: respeta siempre las prohibiciones y épocas de peligro de incendios de tu comunidad autónoma.',
    'Herramientas de corte y armas: cumple la normativa de armas y la de tu municipio; la app no fomenta llevar ni usar armas.',
    'Plantas, setas y animales silvestres: no consumas nada sin una identificación segura por un experto; las confusiones pueden ser mortales.',
    'Agua y alimentos: los métodos de potabilización y conservación reducen riesgos, pero no los eliminan.',
    'Autodefensa: el contenido es preventivo. Solo la legítima defensa, en los términos del Código Penal, ampara el uso de la fuerza.',
    'Radio: emitir en determinadas bandas exige licencia; respeta la normativa de telecomunicaciones.',
    'Caza, pesca, acampada y vivac: dependen de licencias y normas autonómicas y municipales.',
  ], p2: [
    'Practica estas actividades con formación adecuada, bajo tu responsabilidad y, en el caso de menores, con supervisión de un adulto.',
  ] },
  { h: 'Exactitud y actualización', p: [
    'El contenido se ha elaborado a partir de fuentes oficiales y técnicas citadas en «Fuentes y referencias», con la fecha de consulta indicada. Las normas, teléfonos, planes y recursos pueden cambiar, y la información general puede no ajustarse a tu caso concreto. Contrasta lo importante con la fuente oficial.',
    'Las noticias, los avisos automáticos y las emisoras de radio proceden de terceros. El titular no controla su contenido ni garantiza su disponibilidad. Un aviso que no llega no significa que no haya peligro: la vía oficial de alerta a la población es ES-Alert y los canales de Protección Civil.',
  ] },
  { h: 'Responsabilidad', p: [
    'El titular pone el máximo cuidado en la exactitud del contenido, pero no responde de los daños derivados de un uso imprudente, contrario a la ley o a las indicaciones de las autoridades, ni de interrupciones o errores técnicos ajenos a su control, en la medida en que la ley lo permite.',
    'Nada de este aviso limita los derechos que la normativa de consumidores y usuarios reconoce a quien los tenga, ni la responsabilidad que no pueda excluirse legalmente.',
  ] },
  { h: 'Propiedad intelectual', p: [
    'Los textos originales, el diseño, la estructura y el código de la app pertenecen a {titular} o se usan con su autorización. No se permite reproducirlos, distribuirlos ni transformarlos con fines comerciales sin permiso escrito.',
    'Se usan materiales de terceros con sus propias licencias: cartografía del Instituto Geográfico Nacional (CC BY 4.0), la biblioteca Leaflet (BSD-2-Clause) y la tipografía Manrope (SIL Open Font License). Las fuentes citadas pertenecen a sus autores.',
  ] },
  { h: 'Enlaces externos', p: [
    'Los enlaces a webs de terceros se ofrecen como referencia. El titular no es responsable de su contenido ni de sus políticas de privacidad.',
  ] },
  { h: 'Ley aplicable', p: [
    'Este aviso se rige por la legislación española. Si eres consumidor, son competentes los juzgados de tu domicilio.',
  ] },
];

export const PRIVACIDAD = [
  { h: 'Resumen', p: [
    'La app funciona en tu dispositivo. Tu plan familiar, tus contactos, tu información médica, tus puntos del mapa y tu ubicación se guardan en este dispositivo y el titular no tiene acceso a ellos.',
    'No hay cuentas obligatorias, publicidad, analítica ni cookies de seguimiento.',
  ] },
  { h: 'Responsable', p: [
    'El responsable de los tratamientos que hace el servicio de la app (avisos y alojamiento, más abajo) es {titular}. Contacto: {email}.',
  ] },
  { h: 'Datos que se quedan en tu dispositivo', p: [
    'Lo que escribes en la app se guarda en el almacenamiento del navegador (IndexedDB y localStorage) para que funcione sin conexión. No es una cookie de seguimiento: es almacenamiento estrictamente necesario para el servicio que pides. Tu posición GPS se usa solo en el dispositivo.',
    'Puedes exportar una copia o borrarlo todo desde Ajustes. Si guardas datos de otras personas (familiares, contactos), lo haces en el ámbito personal y doméstico; aun así, te recomendamos informarles.',
  ] },
  { h: 'Sincronización entre dispositivos (opcional)', p: [
    'Si la activas, una copia de tus datos se envía a un proyecto de Supabase que configuras tú, con tu cuenta. El titular de la app no recibe esos datos ni tiene acceso a ellos: quien administra ese proyecto decide sobre ellos.',
    'Esa copia puede incluir información médica, que es un dato de salud (categoría especial, art. 9 RGPD). Por eso la app te pide tu consentimiento explícito antes de sincronizar. Puedes retirarlo cuando quieras desactivando la sincronización; lo ya enviado se borra desde tu proyecto de Supabase.',
    'La conexión va cifrada (HTTPS), pero los datos no se cifran de extremo a extremo.',
  ] },
  { h: 'Avisos graves en el móvil (opcional)', p: [
    'Si activas los avisos, el servidor de la app guarda la dirección técnica de suscripción de tu navegador (un identificador y unas claves de cifrado) para poder enviarte notificaciones. No incluye tu nombre, tu correo ni tu ubicación.',
    'Base jurídica: tu consentimiento (art. 6.1.a RGPD). Se conserva hasta que desactivas los avisos o el navegador da la suscripción por caducada. La notificación la entrega el servicio de mensajería de tu navegador (Google, Apple o Mozilla, según el caso).',
  ] },
  { h: 'Conexiones a Internet', p: [
    'Como cualquier web, cuando la app se conecta a un servidor este recibe la dirección IP de tu dispositivo. La app se conecta solo para:',
  ], li: [
    'descargar la app y sus actualizaciones, y consultar las noticias y la lista de emisoras: servidor de la app;',
    'ver o descargar mapas: Instituto Geográfico Nacional (recibe qué zona se pide);',
    'escuchar la radio: el servidor de la emisora que eliges;',
    'sincronizar o recibir avisos, solo si lo activas.',
  ], p2: [
    'El proveedor de alojamiento trata la IP y datos técnicos de la conexión para servir la app y protegerla frente a abusos (interés legítimo, art. 6.1.f RGPD), durante el tiempo limitado que fijan sus registros.',
  ] },
  { h: 'Encargados y transferencias', p: [
    'El alojamiento y los avisos usan Netlify, Inc. como encargado del tratamiento. Netlify puede tratar datos en Estados Unidos con las garantías del Marco de Privacidad de Datos UE-EE. UU. y cláusulas contractuales tipo de la Comisión Europea. No se venden ni se ceden datos a terceros ni se toman decisiones automatizadas con efectos sobre ti.',
  ] },
  { h: 'Menores', p: [
    'Los menores de 14 años no deben activar la sincronización ni los avisos sin el consentimiento de sus padres o tutores (art. 7 LOPDGDD).',
  ] },
  { h: 'Tus derechos', p: [
    'Puedes ejercer los derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad, y retirar tu consentimiento en cualquier momento, escribiendo a {email}. Para los datos de tu dispositivo y de tu proyecto de sincronización no hace falta pedir nada: los controlas tú desde Ajustes.',
    'Si consideras que no se han respetado tus derechos, puedes reclamar ante la Agencia Española de Protección de Datos (www.aepd.es).',
  ] },
];

/** Texto del consentimiento explícito para sincronizar (datos de salud). */
export const CONSENTIMIENTO_SYNC = 'Consiento expresamente que una copia de mis datos, incluida la información médica del plan familiar, se envíe a mi proyecto de Supabase para sincronizarla. He leído la política de privacidad y sé que puedo retirarlo desactivando la sincronización.';
