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
  // --- Escenarios frecuentes ---
  { id: 'apagon', patrones: ['se ha ido la luz', 'sin luz', 'apagon*', 'no hay luz', 'corte de luz', 'sin electricidad', 'se fue la luz'], destino: { tipo: 'emergencia', id: 'apagon' } },
  { id: 'agua', patrones: ['sin agua', 'no sale agua', 'corte de agua', 'no hay agua'], destino: { tipo: 'emergencia', id: 'falta-agua' } },
  { id: 'guerra', patrones: ['guerra', 'conflicto armado', 'bombarde*', 'misil*', 'invasion*', 'ataque aereo'], destino: { tipo: 'emergencia', id: 'conflicto' }, tambien: [{ tipo: 'evacuacion', id: 'plan-evacuacion' }] },
  { id: 'nuclear', patrones: ['nuclear', 'radiacion', 'radiactiv*', 'almaraz'], destino: { tipo: 'emergencia', id: 'radiologico' }, tambien: [{ tipo: 'evacuacion', id: 'plan-evacuacion' }] },
  { id: 'compra', patrones: ['que compro', 'que comprar', 'lista de la compra', 'hacer la compra', 'que tengo que comprar'], destino: { tipo: 'compra', id: 'compra-colapso' } },
  { id: 'colapso', patrones: ['colapso', 'saqueo', 'fin del mundo', 'desabastec*', 'caos total', 'se acaba la comida'], destino: { tipo: 'evacuacion', id: 'plan-evacuacion' }, tambien: [{ tipo: 'compra', id: 'compra-colapso' }, { tipo: 'emergencia', id: 'falta-alimentos' }] },
  { id: 'huir', patrones: ['huir', 'salir del pais', 'evacuar', 'frontera', 'escapar de espana', 'irme de espana'], destino: { tipo: 'evacuacion', id: 'plan-evacuacion' } },
  { id: 'inundacion', patrones: ['inundacion*', 'se inunda', 'riada', 'dana', 'crecida'], destino: { tipo: 'emergencia', id: 'inundacion' } },
  { id: 'terremoto', patrones: ['terremoto', 'temblor de tierra', 'sismo', 'tiembla el suelo'], destino: { tipo: 'emergencia', id: 'terremoto' } },
  { id: 'perdido', patrones: ['me he perdido', 'estoy perdido', 'estoy perdida', 'perdido en el monte', 'perdida en el monte', 'no se volver'], destino: { tipo: 'articulo', id: 'ori-perdido' } },
  { id: 'fuego', patrones: ['hacer fuego', 'hago fuego', 'encender fuego', 'encender una hoguera', 'hacer una hoguera', 'sin mechero'], destino: { tipo: 'articulo', id: 'fuego-encender' } },
  { id: 'lesion', patrones: ['tobillo', 'esguince*', 'torcedura', 'me he torcido', 'se ha torcido', 'picadura', 'mordedura', 'me ha picado', 'le ha picado', 'fractura', 'roto un hueso'], destino: { tipo: 'articulo', id: 'pa-varios' } },
  { id: 'mascotas', patrones: ['perro', 'perros', 'gato', 'gatos', 'mascota*'], destino: { tipo: 'articulo', id: 'mascotas' } },
  { id: 'mochila', patrones: ['mochila', 'que llevo si', 'que meto', 'que me llevo'], destino: { tipo: 'checklist', id: 'bob' } },
  { id: 'entrenar', patrones: ['entren*', 'hacer ejercicio', 'ponerme en forma', 'rutina de ejercicio', 'forma fisica'], destino: { tipo: 'entrenamiento', id: 'entrenamiento-casa' } },
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
  'Hay un incendio cerca', '¿Qué hago si hay una guerra?', 'Me he perdido en el monte', 'Tengo ansiedad',
];
