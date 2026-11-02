/* =========================================================================
   SINÓNIMOS Y EQUIVALENCIAS DEL BUSCADOR
   ---------------------------------------------------------------------------
   Cada grupo reúne formas de decir LO MISMO en el contexto de esta app
   (emergencias, primeros auxilios, supervivencia). Se escriben en minúsculas
   y pueden llevar tildes: el buscador las normaliza.

   Reglas para ampliarlo:
     · Solo equivalencias reales, no "temas relacionados". "Sangra" y
       "hemorragia" son lo mismo; "sangre" y "transfusión" no.
     · Las expresiones de varias palabras se detectan como frase completa
       antes que las palabras sueltas: "corte de luz" se entiende como apagón
       y no como "corte" (herida) + "luz".
     · `solo_frase: true` marca grupos que solo se activan con la frase
       completa. Sirve para que "agua" siga buscando agua en general y solo
       "falta de agua" / "sin agua" apunte al corte de suministro.
     · `ambiguas`: formas que pertenecen al grupo pero que, por tener otros
       sentidos, solo cuentan si el usuario las escribe literalmente; no se
       usan para ampliar otra palabra del grupo. Ejemplo: "corte" es herida,
       pero también "corte de agua"; al buscar "me he cortado" no debe salir
       la ficha de falta de agua.
   ========================================================================= */

export const SINONIMOS = [
  // --- Sanitarias ---
  { id: 'hemorragia', formas: ['hemorragia', 'sangrado', 'sangrar', 'sangra', 'sangrando', 'desangrar', 'desangra', 'pierde sangre', 'perdida de sangre'] },
  { id: 'herida', formas: ['herida', 'corte', 'cortadura', 'me he cortado', 'se ha cortado'], ambiguas: ['corte'] },
  { id: 'parada', formas: ['parada cardiaca', 'parada cardiorrespiratoria', 'paro cardiaco', 'rcp', 'reanimacion', 'reanimar', 'masaje cardiaco', 'no respira'] },
  { id: 'dea', formas: ['dea', 'desfibrilador'] },
  { id: 'atragantamiento', formas: ['atragantamiento', 'atragantado', 'atragantada', 'atragantarse', 'atraganta', 'se atraganta', 'se ha atragantado', 'ovace', 'heimlich', 'obstruccion de la via aerea'] },
  { id: 'infarto', formas: ['infarto', 'ataque al corazon', 'ataque cardiaco', 'dolor toracico', 'dolor en el pecho', 'dolor de pecho'] },
  { id: 'ictus', formas: ['ictus', 'derrame cerebral', 'accidente cerebrovascular', 'acv', 'embolia cerebral'] },
  { id: 'desmayo', formas: ['desmayo', 'desmayado', 'desmayada', 'desmayarse', 'desmaya', 'se desmaya', 'se ha desmayado', 'perdida de conocimiento', 'perdida de consciencia', 'inconsciente', 'inconsciencia', 'sincope'] },
  { id: 'mareo', formas: ['mareo', 'mareado', 'mareada', 'marearse', 'se marea', 'vertigo'] },
  { id: 'quemadura', formas: ['quemadura', 'quemado', 'quemada', 'quemarse', 'me he quemado', 'se ha quemado'] },
  { id: 'hipotermia', formas: ['hipotermia', 'congelado', 'congelada', 'muerto de frio', 'tiritando'] },
  { id: 'golpe-calor', formas: ['golpe de calor', 'insolacion'] },
  { id: 'fractura', formas: ['fractura', 'hueso roto', 'rotura de hueso'] },
  { id: 'esguince', formas: ['esguince', 'torcedura', 'tobillo torcido'] },
  { id: 'intoxicacion', formas: ['intoxicacion', 'intoxicado', 'intoxicada', 'envenenamiento', 'envenenado', 'envenenada'] },
  { id: 'picadura', formas: ['picadura', 'picado', 'picada', 'mordedura', 'mordido', 'mordida'] },
  { id: 'alergia', formas: ['reaccion alergica', 'alergia', 'anafilaxia', 'shock anafilactico'] },
  { id: 'botiquin', formas: ['botiquin', 'kit de primeros auxilios'] },

  // --- Suministros ---
  { id: 'apagon', formas: ['apagon', 'corte de luz', 'cortes de luz', 'sin luz', 'se ha ido la luz', 'falta de luz', 'corte electrico', 'corte de electricidad', 'fallo electrico', 'sin electricidad', 'luz', 'electricidad', 'suministro electrico'] },
  { id: 'falta-agua', solo_frase: true, formas: ['falta de agua', 'sin agua', 'corte de agua', 'cortes de agua', 'suministro de agua', 'no sale agua', 'no hay agua'] },
  { id: 'potabilizar', formas: ['potabilizar', 'potabilizacion', 'depurar agua', 'purificar agua', 'desinfectar agua', 'hervir agua', 'agua potable'] },
  { id: 'desabastecimiento', formas: ['desabastecimiento', 'falta de alimentos', 'sin comida', 'escasez'] },

  // --- Riesgos naturales ---
  { id: 'inundacion', formas: ['inundacion', 'riada', 'crecida', 'dana', 'gota fria', 'se inunda'] },
  { id: 'incendio', formas: ['incendio', 'fuego descontrolado', 'se quema', 'arde'] },
  { id: 'terremoto', formas: ['terremoto', 'seismo', 'sismo', 'temblor de tierra'] },
  { id: 'tormenta', formas: ['tormenta', 'rayo', 'rayos', 'tempestad'] },
  { id: 'nevada', formas: ['nevada', 'nieve', 'temporal de nieve', 'ventisca'] },
  { id: 'ola-calor', formas: ['ola de calor', 'calor extremo'] },
  { id: 'ola-frio', formas: ['ola de frio', 'frio extremo', 'helada'] },

  // --- Otras situaciones ---
  { id: 'evacuacion', formas: ['evacuacion', 'evacuar', 'desalojo', 'desalojar'] },
  { id: 'perdido', formas: ['perdido', 'perderse', 'desorientado', 'desorientada', 'extraviado', 'me he perdido'] },
  { id: 'nuclear', formas: ['radiologico', 'radiactivo', 'radiacion', 'nuclear'] },
  { id: 'quimico', formas: ['quimico', 'nube toxica', 'fuga de gas toxico'] },
  { id: 'monoxido', formas: ['monoxido', 'monoxido de carbono'] },
  { id: 'radio', formas: ['radio', 'emisora', 'walkie', 'walkie talkie', 'pmr', 'pmr446'] },
  { id: 'brujula', formas: ['brujula', 'orientarse', 'encontrar el norte', 'norte'] },
  { id: 'mochila', formas: ['mochila', 'mochila de emergencia', 'kit de emergencia', 'bolsa de emergencia', 'kit 72 horas', 'mochila 72 horas'] },
  { id: 'refugio', formas: ['refugio', 'cobijo', 'resguardo'] },
  { id: 'ansiedad', formas: ['ansiedad', 'panico', 'ataque de panico', 'nervios', 'estres'] },
];

/* Palabras demasiado genéricas para aportar al ranking. Lista corta a
   propósito: artículos, preposiciones y conectores, más unos pocos
   intensificadores y verbos auxiliares muy frecuentes en consultas
   ("sangra mucho", "qué hago si…"). */
export const STOPWORDS = [
  'a', 'al', 'ante', 'con', 'de', 'del', 'desde', 'e', 'el', 'en', 'entre', 'es', 'esta', 'este', 'esto', 'ha', 'han',
  'hay', 'la', 'las', 'le', 'lo', 'los', 'me', 'mi', 'mis', 'mucho', 'mucha', 'muchos', 'muchas', 'muy', 'o', 'para',
  'pero', 'poco', 'por', 'que', 'qué', 'se', 'si', 'su', 'sus', 'tan', 'te', 'tu', 'un', 'una', 'unos', 'unas', 'y',
  'como', 'cómo', 'hacer', 'hago', 'hacemos', 'debo', 'tengo', 'tiene', 'está', 'estoy', 'algo', 'alguien',
];

/* Sugerencias cuando no hay resultados o el cuadro está vacío. */
export const BUSQUEDAS_FRECUENTES = [
  'hemorragia', 'parada cardíaca', 'atragantamiento', 'apagón', 'incendio forestal', 'inundación',
  'falta de agua', 'potabilizar', 'hipotermia', 'evacuar', 'mochila', 'brújula', 'frecuencias',
];
