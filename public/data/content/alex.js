/* =========================================================================
   PREGÚNTALE A ALEX — conocimiento del asistente
   ---------------------------------------------------------------------------
   Alex no inventa: responde SOLO con el contenido de la app (fichas de SOS,
   escenarios, artículos y listas, ya revisados) y funciona sin conexión.

   INTENCIONES: frases frecuentes que se reconocen directamente, para que lo
   urgente nunca dependa del ranking del buscador. Los patrones se comparan
   con el texto normalizado (minúsculas, sin tildes).
     destino → { tipo, id } de una entrada del índice de búsqueda
     urgente → antes que nada, llamar al 112
   Un patrón coincide como palabra o frase completa; con «*» al final,
   también como comienzo de palabra (raíz: «atragant*» → atragantado).
   El orden importa: gana la primera intención que coincide.
   ========================================================================= */

export const INTENCIONES = [
  // --- Crisis personal: va lo primero ---
  {
    id: 'crisis', patrones: ['suicid*', 'quitarme la vida', 'no quiero vivir', 'hacerme dano', 'acabar con todo'],
    crisis: true, destino: { tipo: 'juego', id: 'calma' },
    intro: 'Siento que estés pasando por esto. No estás solo ni sola: habla ahora con alguien que puede ayudarte.',
  },
  // --- Urgencias vitales: 112 primero ---
  { id: 'parada', urgente: true, patrones: ['no respira', 'inconsciente*', 'no reacciona', 'se ha desmayado', 'parada cardi*', 'no tiene pulso', 'no le late'], destino: { tipo: 'sos', id: 'parada-cardiaca' } },
  { id: 'hemorragia', urgente: true, patrones: ['sangra mucho', 'sangrando mucho', 'hemorragia*', 'no para de sangrar', 'mucha sangre', 'chorro de sangre', 'se desangra'], destino: { tipo: 'sos', id: 'hemorragia' } },
  { id: 'atragantamiento', urgente: true, patrones: ['atragant*', 'algo en la garganta', 'se ha tragado', 'se le ha ido por el otro lado'], destino: { tipo: 'sos', id: 'atragantamiento' } },
  { id: 'infarto', urgente: true, patrones: ['dolor en el pecho', 'dolor de pecho', 'dolor pecho', 'infarto', 'opresion en el pecho', 'me duele el pecho', 'le duele el pecho'], destino: { tipo: 'sos', id: 'infarto' } },
  { id: 'ictus', urgente: true, patrones: ['ictus', 'cara torcida', 'boca torcida', 'no puede hablar', 'habla raro', 'no mueve el brazo', 'no mueve un lado', 'derrame cerebral', 'embolia'], destino: { tipo: 'sos', id: 'ictus' } },
  { id: 'urgencia', urgente: true, patrones: ['no puede respirar', 'convulsion*', 'quemadura grave', 'envenen*', 'intoxica*', 'se esta ahogando', 'ahogandose', 'fractura abierta', 'herido grave', 'se ha caido de'], destino: { tipo: 'sos-lista' } },
  { id: 'incendio-casa', urgente: true, patrones: ['fuego en casa', 'se quema la casa', 'incendio en casa', 'incendio en el piso', 'humo en casa', 'humo en la escalera'], destino: { tipo: 'emergencia', id: 'incendio-vivienda' } },
  // --- Salud: Alex no da dosis ni diagnósticos ---
  {
    id: 'medicacion', patrones: ['ibuprofeno', 'paracetamol', 'dosis', 'que tomo', 'que le doy', 'cuanto tomo', 'pastilla*', 'medicament*', 'antibiotic*', 'fiebre'],
    destino: { tipo: 'articulo', id: 'pa-botiquin' },
    intro: 'No doy dosis, diagnósticos ni tratamientos: dependen de cada persona. Pregunta a tu farmacéutico o a tu médico y, si es urgente, llama al 112. Esto es lo que conviene tener en casa:',
  },
  {
    id: 'cronica', patrones: ['diabet*', 'insulina', 'asma', 'hipertens*', 'epilep*', 'embaraz*', 'dialisis', 'marcapasos', 'enfermedad cronica', 'oxigeno en casa'],
    destino: { tipo: 'articulo', id: 'pa-botiquin' }, tambien: [{ tipo: 'compra', id: 'compra-colapso' }],
    intro: 'Con una enfermedad crónica, lo más importante en una emergencia es: medicación para el doble de días previstos, las recetas y un informe médico en papel, y que tu familia sepa qué hacer. Prepara tu plan personal con tu médico. Para el botiquín de casa:',
  },
  // --- Escenarios frecuentes ---
  { id: 'empieza', patrones: ['que hago ahora', 'acaba de empezar', 'esta pasando algo', 'por donde empiezo', 'primeras horas'], destino: { tipo: 'articulo', id: 'casa-primeras-horas' } },
  { id: 'ataque', urgente: true, patrones: ['bombarde*', 'explosion*', 'misil*', 'ataque aereo', 'alerta aerea', 'refugio antiaereo', 'sirenas de ataque'], destino: { tipo: 'articulo', id: 'casa-ataque' }, tambien: [{ tipo: 'emergencia', id: 'conflicto' }] },
  { id: 'calorias', patrones: ['calorias', 'kcal', 'cuanto comer', 'cuanta comida', 'cuanto como'], destino: { tipo: 'articulo', id: 'alim-reserva' }, tambien: [{ tipo: 'compra', id: 'compra-colapso' }] },
  { id: 'silvestre', patrones: ['plantas comestibles', 'comer plantas', 'setas', 'bayas', 'frutos silvestres', 'comida del monte'], destino: { tipo: 'articulo', id: 'alim-silvestre' } },
  { id: 'bateria', patrones: ['bateria*', 'cargar el movil', 'cargo el movil', 'sin bateria', 'cargar movil', 'power bank', 'placa solar', 'velas'], destino: { tipo: 'articulo', id: 'casa-energia' } },
  { id: 'higiene', patrones: ['ducharme', 'lavarme', 'me lavo', 'lavarse', 'asearme', 'higiene', 'lavar los platos', 'lavar la ropa'], destino: { tipo: 'articulo', id: 'casa-higiene' } },
  { id: 'apagon', patrones: ['se ha ido la luz', 'sin luz', 'apagon*', 'no hay luz', 'corte de luz', 'sin electricidad', 'se fue la luz'], destino: { tipo: 'emergencia', id: 'apagon' } },
  { id: 'agua', patrones: ['sin agua', 'no sale agua', 'corte de agua', 'no hay agua'], destino: { tipo: 'emergencia', id: 'falta-agua' } },
  { id: 'guerra', patrones: ['guerra', 'conflicto armado', 'invasion*'], destino: { tipo: 'emergencia', id: 'conflicto' }, tambien: [{ tipo: 'evacuacion', id: 'plan-evacuacion' }] },
  { id: 'nuclear', patrones: ['nuclear', 'radiacion', 'radiactiv*', 'almaraz'], destino: { tipo: 'emergencia', id: 'radiologico' }, tambien: [{ tipo: 'evacuacion', id: 'plan-evacuacion' }] },
  { id: 'compra', patrones: ['que compro', 'que comprar', 'lista de la compra', 'hacer la compra', 'que tengo que comprar', 'compro', 'comprar'], destino: { tipo: 'compra', id: 'compra-colapso' } },
  { id: 'colapso', patrones: ['colapso', 'saqueo', 'fin del mundo', 'desabastec*', 'caos total', 'se acaba la comida'], destino: { tipo: 'evacuacion', id: 'plan-evacuacion' }, tambien: [{ tipo: 'compra', id: 'compra-colapso' }, { tipo: 'emergencia', id: 'falta-alimentos' }] },
  { id: 'huir', patrones: ['huir', 'salir del pais', 'evacuar', 'frontera', 'escapar de espana', 'irme de espana'], destino: { tipo: 'evacuacion', id: 'plan-evacuacion' } },
  { id: 'inundacion', patrones: ['inundacion*', 'se inunda', 'riada', 'dana', 'crecida'], destino: { tipo: 'emergencia', id: 'inundacion' } },
  { id: 'terremoto', patrones: ['terremoto', 'temblor de tierra', 'sismo', 'tiembla el suelo'], destino: { tipo: 'emergencia', id: 'terremoto' } },
  { id: 'perdido', patrones: ['me he perdido', 'estoy perdido', 'estoy perdida', 'perdido en el monte', 'perdida en el monte', 'no se volver'], destino: { tipo: 'articulo', id: 'ori-perdido' } },
  { id: 'fuego', patrones: ['hacer fuego', 'hago fuego', 'encender fuego', 'encender una hoguera', 'hacer una hoguera', 'sin mechero'], destino: { tipo: 'articulo', id: 'fuego-encender' } },
  { id: 'lesion', patrones: ['tobillo', 'esguince*', 'torcedura', 'me he torcido', 'se ha torcido', 'picadura', 'mordedura', 'me ha picado', 'le ha picado', 'fractura', 'roto un hueso'], destino: { tipo: 'articulo', id: 'pa-varios' } },
  { id: 'mascotas', patrones: ['perro', 'perros', 'gato', 'gatos', 'mascota*'], destino: { tipo: 'articulo', id: 'mascotas' } },
  { id: 'patatas', patrones: ['patata*', 'papas'], destino: { tipo: 'articulo', id: 'huerto-patatas' } },
  { id: 'calendario', patrones: ['cuando sembrar', 'cuando siembro', 'cuando plantar', 'calendario de siembra', 'que siembro', 'que planto'], destino: { tipo: 'articulo', id: 'huerto-calendario' } },
  { id: 'semillas', patrones: ['semilla*'], destino: { tipo: 'articulo', id: 'huerto-semillas' } },
  { id: 'conservas', patrones: ['conserva casera', 'conservas caseras', 'botulismo', 'embotar', 'hacer conservas', 'conservar la cosecha', 'deshidratar'], destino: { tipo: 'articulo', id: 'huerto-conservar' } },
  { id: 'germinados', patrones: ['germin*', 'brotes'], destino: { tipo: 'articulo', id: 'huerto-brotes' } },
  { id: 'huerto', patrones: ['huerto', 'sembrar', 'siembra', 'plantar', 'cultivar', 'cultivo*', 'cosech*', 'hortaliza*'], destino: { tipo: 'articulo', id: 'huerto-empezar' } },
  { id: 'vater', patrones: ['vater', 'water', 'inodoro', 'wc', 'cisterna', 'hacer mis necesidades', 'ir al bano', 'cagar', 'mear'], destino: { tipo: 'articulo', id: 'casa-saneamiento' } },
  { id: 'frio', patrones: ['sin calefaccion', 'frio en casa', 'mucho frio', 'calentar la casa', 'pasar frio', 'no hay calefaccion'], destino: { tipo: 'articulo', id: 'casa-frio' } },
  { id: 'calor', patrones: ['sin aire acondicionado', 'mucho calor', 'calor en casa', 'pasar calor'], destino: { tipo: 'articulo', id: 'casa-calor' } },
  { id: 'lluvia', patrones: ['agua de lluvia', 'recoger agua', 'recoger lluvia'], destino: { tipo: 'articulo', id: 'agua-lluvia' } },
  { id: 'seguridad', patrones: ['robo*', 'ladron*', 'asalto', 'proteger la casa', 'seguridad en casa', 'me quieren robar'], destino: { tipo: 'articulo', id: 'casa-seguridad' } },
  { id: 'trueque', patrones: ['trueque', 'intercambiar', 'dinero', 'efectivo', 'corralito', 'cajero*'], destino: { tipo: 'articulo', id: 'casa-trueque' } },
  { id: 'mochila', patrones: ['mochila', 'que llevo si', 'que meto', 'que me llevo'], destino: { tipo: 'checklist', id: 'bob' } },
  { id: 'entrenar', patrones: ['entren*', 'hacer ejercicio', 'ponerme en forma', 'rutina de ejercicio', 'forma fisica'], destino: { tipo: 'entrenamiento', id: 'entrenamiento-casa' } },
  { id: 'vulnerables', patrones: ['nino*', 'bebe*', 'hijos', 'abuelo*', 'mayores', 'ancianos', 'dependiente*', 'discapacidad'], destino: { tipo: 'articulo', id: 'casa-vulnerables' } },
  { id: 'ansiedad', patrones: ['ansiedad', 'tengo miedo', 'ataque de panico', 'estoy nervios*', 'no puedo calmarme', 'agobiad*'], destino: { tipo: 'juego', id: 'calma' } },
];

export const SALUDOS = ['hola', 'buenas', 'hey', 'que tal', 'buenos dias', 'buenas tardes', 'buenas noches', 'alex'];
export const GRACIAS = ['gracias', 'muchas gracias', 'genial', 'perfecto', 'vale gracias'];

export const PRESENTACION = 'Soy Alex. Te ayudo con emergencias, supervivencia y preparación usando la información revisada de la app, también sin conexión. Cuéntame qué pasa con tus palabras.';
export const FUERA_DE_TEMA = 'Solo puedo ayudarte con emergencias, supervivencia y preparación. Prueba a contarme la situación de otra forma, por ejemplo:';
export const AVISO_ALEX = 'Alex responde con el contenido de la app. No es un profesional sanitario ni sustituye al 112: ante una emergencia, llama primero.';

/* Teléfonos para una crisis personal (España). */
export const CRISIS = [
  { t: 'Línea de atención a la conducta suicida', tel: '024', d: 'Gratuita, confidencial, 24 horas.' },
  { t: 'Emergencias', tel: '112', d: 'Si hay un peligro inmediato.' },
];

export const SUGERENCIAS = [
  'Se ha ido la luz', 'Alguien sangra mucho', '¿Qué meto en la mochila?', '¿Cómo potabilizo agua?',
  'Hay un incendio cerca', '¿Qué hago si hay una guerra?', 'El váter no funciona', '¿Cómo planto patatas?', 'Me he perdido en el monte', 'Tengo ansiedad',
];
