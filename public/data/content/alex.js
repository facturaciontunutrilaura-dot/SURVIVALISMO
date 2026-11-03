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
  { id: 'incendio-monte', urgente: true, patrones: ['incendio forestal', 'fuego en el monte', 'incendio en el monte', 'incendio+monte', 'incendio+campo', 'incendio+bosque', 'humo+monte', 'fuego+monte', 'incendio cerca', 'hay un incendio cerca'], destino: { tipo: 'emergencia', id: 'incendio-forestal' } },
  { id: 'incendio-casa', urgente: true, patrones: ['fuego en casa', 'se quema la casa', 'incendio en casa', 'incendio en el piso', 'humo en casa', 'humo en la escalera', 'incendio+edificio', 'incendio+bloque', 'incendio+piso', 'incendio+casa', 'incendio+portal', 'incendio+cocina', 'incendio+garaje', 'fuego+edificio', 'fuego+cocina', 'humo+edificio', 'humo+escalera', 'humo+pasillo', 'se esta quemando'], destino: { tipo: 'emergencia', id: 'incendio-vivienda' } },
  { id: 'perdido-alguien', urgente: true, patrones: ['se ha perdido mi', 'mi hijo se ha perdido', 'mi hija se ha perdido', 'nino perdido', 'no encuentro a mi', 'ha desaparecido'], destino: { tipo: 'emergencia', id: 'persona-perdida' } },
  { id: 'gas', urgente: true, patrones: ['olor a gas', 'huele a gas', 'fuga de gas', 'escape de gas'], destino: { tipo: 'articulo', id: 'bric-cortes' } },
  {
    id: 'violencia', urgente: true, patrones: ['violencia de genero', 'maltrat*', 'mi pareja me pega', 'mi marido me pega', 'me pega mi pareja', 'violencia machista'],
    destino: { tipo: 'articulo', id: 'def-familia' },
    intro: 'No estás sola. Llama al 016 (24 horas, no aparece en la factura) o escribe por WhatsApp al 600 000 016. Si estás en peligro ahora, llama al 112.',
  },
  { id: 'agresion', urgente: true, patrones: ['me atacan', 'me estan atacando', 'me han atacado', 'me agrede*', 'me pega*', 'me sigue*', 'me persigue*', 'me quieren pegar', 'atraco', 'me atracan'], destino: { tipo: 'articulo', id: 'def-ataque' } },
  { id: 'intruso', urgente: true, patrones: ['alguien en casa', 'han entrado en casa', 'hay un intruso', 'intruso*', 'ladron en casa', 'oigo ruidos en casa'], destino: { tipo: 'articulo', id: 'def-hogar' } },
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
  { id: 'noticias', patrones: ['noticias', 'ultima hora', 'que esta pasando', 'que pasa hoy', 'actualidad'], destino: { tipo: 'noticias', id: 'noticias-ultima-hora' } },
  { id: 'empieza', patrones: ['que hago ahora', 'acaba de empezar', 'esta pasando algo', 'por donde empiezo', 'primeras horas'], destino: { tipo: 'articulo', id: 'casa-primeras-horas' } },
  { id: 'sin-comida', patrones: ['sin supermercado*', 'supermercados cerrados', 'no hay comida', 'que comer si', 'que como si', 'escasez de comida', 'falta comida', 'se acaba la comida', 'no queda comida', 'comida para sobrevivir'], destino: { tipo: 'emergencia', id: 'falta-alimentos' }, tambien: [{ tipo: 'articulo', id: 'alim-reserva' }] },
  { id: 'comunicar', patrones: ['sin cobertura', 'no hay cobertura', 'sin internet', 'no hay internet', 'caen las redes', 'comunicarme con mi familia', 'contactar con mi familia', 'avisar a mi familia', 'hablar con mi familia', 'hablo con mi familia', 'comunicarnos', 'sin telefono', 'no funciona el movil', 'walkie*'], destino: { tipo: 'articulo', id: 'com-plan' }, tambien: [{ tipo: 'articulo', id: 'com-radio' }] },
  { id: 'caducidad', patrones: ['caduc*', 'fecha de consumo', 'consumo preferente', 'cuanto dura una', 'cuanto aguanta', 'cuanto duran', 'rotar la despensa'], destino: { tipo: 'articulo', id: 'alim-reserva' } },
  { id: 'cocinar-sin-luz', patrones: ['cocinar sin luz', 'cocino sin luz', 'cocinar sin electricidad', 'cocinar en un apagon', 'conservar sin nevera', 'conservo la comida', 'sin nevera', 'se ha roto la nevera', 'congelador'], destino: { tipo: 'articulo', id: 'alim-sin-luz' }, tambien: [{ tipo: 'articulo', id: 'bric-cocina' }] },
  { id: 'potabilizar', patrones: ['potabiliz*', 'purific*', 'agua del rio', 'agua de rio', 'agua de un rio', 'hervir agua', 'desinfectar agua', 'agua potable', 'beber agua de'], destino: { tipo: 'articulo', id: 'agua-tratar' }, tambien: [{ tipo: 'articulo', id: 'bric-filtro' }] },
  { id: 'cuanta-agua', patrones: ['cuanta agua', 'litros de agua', 'agua por persona', 'agua necesito', 'almacenar agua', 'guardar agua'], destino: { tipo: 'articulo', id: 'agua-cuanta' }, tambien: [{ tipo: 'articulo', id: 'agua-almacenar' }] },
  { id: 'prepararse', patrones: ['prepararme', 'prepararse', 'prepararnos', 'empezar a prepararme', 'como me preparo', 'estar preparado', 'estar preparada', 'por donde empiezo a preparar*', 'kit de emergencia', 'kit de supervivencia'], destino: { tipo: 'articulo', id: 'eq-niveles' }, tambien: [{ tipo: 'checklist', id: 'nivel2' }, { tipo: 'checklist', id: 'bob' }] },
  { id: 'ataque', urgente: true, patrones: ['bombarde*', 'explosion*', 'misil*', 'ataque aereo', 'alerta aerea', 'refugio antiaereo', 'sirenas de ataque'], destino: { tipo: 'articulo', id: 'casa-ataque' }, tambien: [{ tipo: 'emergencia', id: 'conflicto' }] },
  { id: 'calorias', patrones: ['calorias', 'kcal', 'cuanto comer', 'cuanta comida', 'cuanto como'], destino: { tipo: 'articulo', id: 'alim-reserva' }, tambien: [{ tipo: 'compra', id: 'compra-colapso' }] },
  { id: 'silvestre', patrones: ['plantas comestibles', 'comer plantas', 'setas', 'bayas', 'frutos silvestres', 'comida del monte', 'comida+monte', 'comer+monte', 'comida+campo', 'comer+campo', 'cazar', 'pescar'], destino: { tipo: 'articulo', id: 'alim-silvestre' } },
  { id: 'bateria', patrones: ['bateria*', 'cargar el movil', 'cargo el movil', 'sin bateria', 'cargar movil', 'power bank', 'placa solar', 'velas'], destino: { tipo: 'articulo', id: 'casa-energia' } },
  { id: 'higiene', patrones: ['ducharme', 'lavarme', 'me lavo', 'lavarse', 'asearme', 'higiene', 'lavar los platos', 'lavar la ropa'], destino: { tipo: 'articulo', id: 'casa-higiene' } },
  { id: 'ola-calor', patrones: ['ola de calor', 'calor extremo', 'mucho calor fuera', 'aviso por calor', 'temperaturas muy altas'], destino: { tipo: 'emergencia', id: 'ola-calor' }, tambien: [{ tipo: 'articulo', id: 'casa-calor' }, { tipo: 'articulo', id: 'casa-vulnerables' }] },
  { id: 'ola-frio', patrones: ['ola de frio', 'frio extremo', 'heladas fuertes', 'temperaturas bajo cero'], destino: { tipo: 'emergencia', id: 'ola-frio' }, tambien: [{ tipo: 'articulo', id: 'casa-frio' }] },
  { id: 'nevada', patrones: ['nevada*', 'mucha nieve', 'atrapado por la nieve', 'nieve+coche', 'temporal de nieve'], destino: { tipo: 'emergencia', id: 'nevada' }, tambien: [{ tipo: 'articulo', id: 'veh-preparacion' }] },
  { id: 'tormenta', patrones: ['tormenta*', 'rayo*', 'granizo', 'vendaval', 'viento muy fuerte', 'temporal'], destino: { tipo: 'emergencia', id: 'tormenta' } },
  { id: 'apagon', patrones: ['se ha ido la luz', 'se va la luz', 'se ira la luz', 'sin luz', 'apagon*', 'luz+dias', 'apagon+dias', 'no hay luz', 'corte de luz', 'sin electricidad', 'se fue la luz'], destino: { tipo: 'emergencia', id: 'apagon' } },
  { id: 'agua', patrones: ['sin agua', 'no sale agua', 'corte de agua', 'no hay agua'], destino: { tipo: 'emergencia', id: 'falta-agua' } },
  { id: 'guerra', patrones: ['guerra', 'conflicto armado', 'invasion*'], destino: { tipo: 'emergencia', id: 'conflicto' }, tambien: [{ tipo: 'evacuacion', id: 'plan-evacuacion' }] },
  { id: 'nuclear', patrones: ['nuclear', 'radiacion', 'radiactiv*', 'almaraz'], destino: { tipo: 'emergencia', id: 'radiologico' }, tambien: [{ tipo: 'evacuacion', id: 'plan-evacuacion' }] },
  { id: 'compra', patrones: ['que compro', 'que comprar', 'lista de la compra', 'hacer la compra', 'que tengo que comprar', 'compro', 'comprar'], destino: { tipo: 'compra', id: 'compra-colapso' } },
  { id: 'colapso', patrones: ['colapso', 'saqueo', 'fin del mundo', 'desabastec*', 'caos total', 'se acaba la comida'], destino: { tipo: 'evacuacion', id: 'plan-evacuacion' }, tambien: [{ tipo: 'compra', id: 'compra-colapso' }, { tipo: 'emergencia', id: 'falta-alimentos' }] },
  { id: 'huir', patrones: ['huir', 'salir del pais', 'evacuar', 'frontera', 'escapar de espana', 'irme de espana'], destino: { tipo: 'evacuacion', id: 'plan-evacuacion' } },
  { id: 'inundacion', patrones: ['inundacion*', 'se inunda', 'riada', 'dana', 'crecida'], destino: { tipo: 'emergencia', id: 'inundacion' } },
  { id: 'terremoto', patrones: ['terremoto', 'temblor de tierra', 'sismo', 'tiembla el suelo'], destino: { tipo: 'emergencia', id: 'terremoto' } },
  { id: 'perdido', patrones: ['me he perdido', 'estoy perdido', 'estoy perdida', 'perdido en el monte', 'perdida en el monte', 'no se volver', 'me pierdo', 'perderme', 'si me pierdo', 'perdido+monte', 'perdida+monte', 'perdido+campo', 'perdido+montana', 'desorientad*', 'no se donde estoy'], destino: { tipo: 'articulo', id: 'ori-perdido' } },
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
  { id: 'fuga', patrones: ['fuga de agua', 'fuga*', 'tuberia*', 'gotera*', 'gotea', 'se sale el agua'], destino: { tipo: 'articulo', id: 'bric-fugas' } },
  { id: 'cristal', patrones: ['cristal roto', 'ventana rota', 'cristales rotos', 'puerta rota', 'tapar la ventana'], destino: { tipo: 'articulo', id: 'bric-ventanas' } },
  { id: 'cortes', patrones: ['llave de paso', 'cortar el agua', 'cortar el gas', 'cortar la luz', 'cuadro electrico', 'llave del gas'], destino: { tipo: 'articulo', id: 'bric-cortes' } },
  { id: 'electricidad', patrones: ['generador*', 'salta el diferencial', 'salta la luz', 'diferencial', 'cortocircuito', 'enchufe*'], destino: { tipo: 'articulo', id: 'bric-electricidad' } },
  { id: 'sellar', patrones: ['sellar', 'nube toxica', 'confinarme', 'confinamiento'], destino: { tipo: 'articulo', id: 'bric-sellar' } },
  { id: 'cocinar', patrones: ['ahorrar gas', 'ahorro gas', 'ahorro de gas', 'caja termica', 'horno solar', 'cocinar sin gas', 'ahorrar combustible'], destino: { tipo: 'articulo', id: 'bric-cocina' } },
  { id: 'filtro', patrones: ['filtro casero', 'filtro de agua', 'filtrar agua', 'agua turbia'], destino: { tipo: 'articulo', id: 'bric-filtro' } },
  { id: 'coser', patrones: ['coser', 'coso', 'remendar', 'reparar ropa', 'botas rotas', 'cremallera'], destino: { tipo: 'articulo', id: 'bric-reparar' } },
  { id: 'herramientas', patrones: ['herramienta*', 'bricolaje', 'reparar', 'arreglar'], destino: { tipo: 'articulo', id: 'bric-herramientas' } },
  { id: 'legal', patrones: ['legitima defensa', 'defenderme legalmente', 'es legal defenderme', 'puedo defenderme', 'denunciar'], destino: { tipo: 'articulo', id: 'def-legal' } },
  { id: 'desescalar', patrones: ['discusion', 'agresivo*', 'pelea*', 'calmar a alguien', 'alguien agresivo', 'me amenaza*', 'amenaza*'], destino: { tipo: 'articulo', id: 'def-desescalada' } },
  { id: 'defensa', patrones: ['defensa personal', 'defenderme', 'autodefensa', 'protegerme'], destino: { tipo: 'articulo', id: 'def-principios' } },
  { id: 'familia-seg', patrones: ['palabra clave', 'seguridad familiar', 'secuestr*', 'desconocido*'], destino: { tipo: 'articulo', id: 'def-familia' } },
  { id: 'calle', patrones: ['volver sola', 'volver solo', 'de noche por la calle', 'seguridad en la calle', 'estar alerta'], destino: { tipo: 'articulo', id: 'def-alerta' } },
  { id: 'disturbio', patrones: ['disturbio*', 'barricada*', 'manifestacion violenta', 'control policial'], destino: { tipo: 'articulo', id: 'def-desplazamientos' } },
  { id: 'mochila', patrones: ['mochila', 'que llevo si', 'que meto', 'que me llevo'], destino: { tipo: 'checklist', id: 'bob' } },
  { id: 'entrenar', patrones: ['entren*', 'hacer ejercicio', 'ponerme en forma', 'rutina de ejercicio', 'forma fisica'], destino: { tipo: 'entrenamiento', id: 'entrenamiento-casa' } },
  { id: 'vulnerables', patrones: ['nino*', 'bebe*', 'hijos', 'abuelo*', 'abuela*', 'mayores', 'ancianos', 'dependiente*', 'discapacidad'], destino: { tipo: 'articulo', id: 'casa-vulnerables' } },
  { id: 'ansiedad', patrones: ['ansiedad', 'tengo miedo', 'ataque de panico', 'estoy nervios*', 'no puedo calmarme', 'agobiad*'], destino: { tipo: 'juego', id: 'calma' } },
];

/* Seguimiento de la conversación: se aplica al tema del que se hablaba. */
export const SEGUIMIENTO = {
  mas: ['cuentame mas', 'dime mas', 'mas', 'sigue', 'siguiente', 'continua', 'y despues', 'y luego', 'que mas', 'mas detalles', 'mas informacion', 'explicame mejor', 'explicamelo', 'amplia', 'y ahora que', 'y ahora', 'ok y', 'vale y'],
  no: ['que no debo hacer', 'que no hago', 'que no hacer', 'que no debo', 'que evito', 'errores', 'que debo evitar', 'lo que no'],
};

/* Si la persona expresa miedo o angustia, Alex lo reconoce antes de responder. */
export const EMOCION = {
  patrones: ['miedo', 'asustad*', 'acojon*', 'preocupad*', 'agobi*', 'nervios*', 'angusti*', 'panico', 'ansiedad', 'estres*', 'no puedo dormir', 'estoy mal', 'me preocupa'],
  texto: 'Es normal tener miedo: prepararte es justo lo que más ayuda a sentir que tienes el control. Vamos paso a paso.',
};

/* Frases de entrada, para que Alex no suene siempre igual. */
export const APERTURAS = [
  'Vamos por partes. Lo primero:',
  'Te cuento lo importante, empezando por lo primero:',
  'Esto es lo que haría yo:',
  'Bien, para eso lo clave es esto:',
  'Tranquilidad, que tiene solución. Empieza así:',
];

export const SALUDOS = ['hola', 'buenas', 'hey', 'que tal', 'buenos dias', 'buenas tardes', 'buenas noches', 'alex'];
export const GRACIAS = ['gracias', 'muchas gracias', 'genial', 'perfecto', 'vale gracias'];

export const PRESENTACION = 'Soy Alex. Te ayudo con emergencias, supervivencia y preparación usando la información revisada de la app, también sin conexión. Cuéntame qué pasa con tus palabras; después puedes pedirme «cuéntame más» o preguntarme «¿y si…?», y sigo con el mismo tema.';
export const SIN_FICHA = 'Todavía no tengo una ficha sobre eso y no quiero inventarme nada. Si es una emergencia, llama al 112 y sigue las instrucciones de Protección Civil y de los avisos ES-Alert de tu móvil.';
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
