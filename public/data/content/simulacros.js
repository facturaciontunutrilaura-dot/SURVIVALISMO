/* =========================================================================
   SIMULACROS CON DECISIONES — datos
   ---------------------------------------------------------------------------
   Pequeñas historias interactivas: una escena, tres opciones. Al elegir, la
   app explica si fue buena idea y por qué. Puntos por opción: 2 = lo mejor,
   1 = mejorable, 0 = peligroso. Al final, la puntuación.
   Las explicaciones resumen los protocolos de Emergencia de la app.
   `ninos: true` → historia pensada para practicar con niños.
   ========================================================================= */

export const SIMULACROS = [
  {
    id: 'humo', t: 'Humo de madrugada', ic: '🔥', desc: 'Fuego en casa mientras dormís', emg: 'incendio-vivienda',
    escenas: [
      { texto: 'Son las 3 de la madrugada. Te despierta el pitido del detector y huele a humo. ¿Qué haces?', opciones: [
        { t: 'Despierto a todos gritando «¡Fuego!» y salimos ya, agachados si hay humo', p: 2, exp: 'Exacto. En un incendio tienes muy poco tiempo y el humo mata antes que las llamas. Agachados, el aire está más limpio.' },
        { t: 'Busco de dónde sale el humo para apagarlo', p: 0, exp: 'Peligroso. Pierdes minutos vitales y respiras humo tóxico. Primero salir; los bomberos apagan.' },
        { t: 'Llamo al 112 desde la cama antes de moverme', p: 1, exp: 'Llamar es importante, pero primero sal y saca a los demás. Llama desde fuera, ya a salvo.' },
      ] },
      { texto: 'Llegas a la puerta del dormitorio. ¿Qué haces antes de abrirla?', opciones: [
        { t: 'Toco la puerta y el pomo con el dorso de la mano', p: 2, exp: 'Muy bien. Si están calientes, al otro lado hay fuego: no abras.' },
        { t: 'La abro de golpe para salir más rápido', p: 0, exp: 'Si hay fuego detrás, entran de golpe el calor y el humo. Toca antes la puerta.' },
        { t: 'La abro un poco para mirar', p: 0, exp: 'Incluso una rendija deja entrar humo y aire que aviva el fuego. Toca antes la puerta con el dorso de la mano.' },
      ] },
      { texto: 'La puerta quema: el pasillo está ardiendo. Vives en un cuarto piso.', opciones: [
        { t: 'Cierro, tapo las rendijas con ropa mojada, voy a la ventana, llamo al 112 y hago señales', p: 2, exp: 'Correcto. Una puerta cerrada frena el fuego mucho tiempo. Haz que te vean y oigan desde la ventana.' },
        { t: 'Salto por la ventana', p: 0, exp: 'Desde un cuarto piso la caída puede ser mortal. Protege la habitación y espera a los bomberos haciendo señales.' },
        { t: 'Me escondo bajo la cama o en el armario', p: 0, exp: 'Nunca te escondas: los bomberos no te encontrarían. Ve a la ventana y haz que te vean.' },
      ] },
      { texto: 'Ya estáis todos en la calle. Tu gato sigue dentro.', opciones: [
        { t: 'Vuelvo a entrar a por él', p: 0, exp: 'Nunca vuelvas a entrar. Muchas víctimas de incendios son personas que volvieron a por algo.' },
        { t: 'Aviso a los bomberos de que hay un animal y dónde suele estar', p: 2, exp: 'Bien. Ellos tienen equipo para entrar con seguridad.' },
        { t: 'Le pido a un vecino que entre él', p: 0, exp: 'Pondrías en peligro a otra persona. Avisa a los bomberos.' },
      ] },
    ],
  },
  {
    id: 'apagon', t: 'Apagón en toda la ciudad', ic: '🔌', desc: 'Sin luz durante horas', emg: 'apagon',
    escenas: [
      { texto: 'A media mañana se va la luz en toda la ciudad. Tu móvil tiene un 40 % de batería.', opciones: [
        { t: 'Miro redes y vídeos para enterarme de qué pasa', p: 0, exp: 'Gastas batería y te expones a bulos. La radio a pilas es la fuente fiable.' },
        { t: 'Enciendo la radio a pilas y pongo el móvil en ahorro de batería', p: 2, exp: 'Perfecto. La radio informa sin gastar el móvil, que guardas para lo importante.' },
        { t: 'Llamo a todos mis contactos para ver si están bien', p: 1, exp: 'Las llamadas saturan la red. Mejor un mensaje corto: «Estamos bien, en casa».' },
      ] },
      { texto: 'Han pasado tres horas. ¿Qué haces con la nevera?', opciones: [
        { t: 'La abro a menudo para ver si sigue fría', p: 0, exp: 'Cada vez que la abres se escapa el frío. Mantenla cerrada.' },
        { t: 'La mantengo cerrada y comemos primero lo que hay en ella', p: 2, exp: 'Bien. Un congelador lleno y cerrado aguanta unas 48 horas; medio lleno, unas 24.' },
        { t: 'Lo tiro todo ya, por si acaso', p: 0, exp: 'Es pronto: si está cerrada, la comida aguanta horas. Consume primero lo perecedero.' },
      ] },
      { texto: 'Anochece y hace frío. Un vecino propone encender la barbacoa de carbón en el salón.', opciones: [
        { t: 'Vale, con la ventana un poco abierta', p: 0, exp: 'Muy peligroso: el carbón produce monóxido de carbono, que no huele y mata. Nunca brasas ni generadores dentro.' },
        { t: 'No: nos juntamos en una habitación con ropa por capas y mantas', p: 2, exp: 'Correcto. Una sola habitación cerrada y bien abrigados conserva el calor sin riesgos.' },
        { t: 'Encendemos el horno de gas con la puerta abierta', p: 0, exp: 'El horno no está hecho para calentar la casa y puede llenarla de monóxido de carbono.' },
      ] },
      { texto: 'Vives en un séptimo piso y deja de salir agua del grifo.', opciones: [
        { t: 'Usamos las garrafas y la bañera que llenamos al empezar', p: 2, exp: 'Muy bien. En pisos altos el agua depende de bombas eléctricas: llenar agua al principio es clave.' },
        { t: 'Bajo a buscar una fuente', p: 1, exp: 'Puede servir, pero sin ascensor y sin saber si el agua es potable cuesta. Mejor guardar agua al principio.' },
        { t: 'Bebemos el agua del depósito de la cisterna tal cual', p: 0, exp: 'Úsala para el váter o potabilízala antes. Para beber, agua embotellada o guardada.' },
      ] },
    ],
  },
  {
    id: 'dana', t: 'DANA y aviso rojo', ic: '🌊', desc: 'Lluvia torrencial e inundación', emg: 'inundacion',
    escenas: [
      { texto: 'Hay aviso rojo por lluvias. Vas en coche y delante tienes un paso inferior con agua.', opciones: [
        { t: 'Cruzo despacio: parece poca agua', p: 0, exp: 'Con 30 cm de agua en movimiento un coche flota y se lo lleva. Nunca cruces.' },
        { t: 'Doy la vuelta y busco una ruta por zona alta', p: 2, exp: 'Correcto. Evita pasos inferiores, ramblas y cauces, aunque estén secos.' },
        { t: 'Espero dentro del paso a que baje el agua', p: 0, exp: 'El agua puede subir en minutos. Sal de las zonas bajas.' },
      ] },
      { texto: 'Llegas a casa: vivís en un bajo. Tu familia quiere bajar al garaje a sacar el coche.', opciones: [
        { t: 'Nadie baja: subimos a un piso alto', p: 2, exp: 'Exacto. Los garajes y sótanos se llenan en minutos y son trampas mortales.' },
        { t: 'Bajamos rápido antes de que suba el agua', p: 0, exp: 'Muchas víctimas de las DANA murieron intentando sacar el coche. Un coche no vale una vida.' },
        { t: 'Baja solo uno, el más rápido', p: 0, exp: 'Sigue siendo una trampa. Nadie al garaje.' },
      ] },
      { texto: 'Empieza a entrar agua en casa.', opciones: [
        { t: 'Corro al cuadro eléctrico aunque tenga que pisar agua', p: 0, exp: 'Agua y electricidad: riesgo de electrocución. Solo si puedes hacerlo en seco.' },
        { t: 'Corto la luz solo si llego sin pisar agua; si no, subo', p: 2, exp: 'Correcto. Tu seguridad primero; la casa después.' },
        { t: 'Subo sin preocuparme de la luz', p: 1, exp: 'Subir es lo primero. Si puedes cortar la luz sin pisar agua, mejor hacerlo antes.' },
      ] },
      { texto: 'Lo peor ha pasado y tenéis sed.', opciones: [
        { t: 'Bebemos del grifo', p: 0, exp: 'La red puede estar contaminada. Espera a que las autoridades lo autoricen.' },
        { t: 'Bebemos agua embotellada o la que guardamos', p: 2, exp: 'Muy bien, hasta que digan que el grifo es seguro.' },
        { t: 'Hervimos agua del grifo', p: 1, exp: 'Hervir mata gérmenes, pero no quita barro ni productos químicos. Mejor embotellada; sigue las indicaciones oficiales.' },
      ] },
    ],
  },
  {
    id: 'calor', t: 'Ola de calor con la abuela', ic: '🌡', desc: 'Cuidar a una persona mayor', emg: 'ola-calor',
    escenas: [
      { texto: 'Son las cuatro de la tarde y hace 42 °C. Tu abuela quiere ir a la compra.', opciones: [
        { t: 'La acompaño ahora', p: 0, exp: 'Es la peor hora. Los mayores sufren más el calor.' },
        { t: 'Hago yo la compra o vamos mañana a primera hora', p: 2, exp: 'Perfecto. Las salidas, temprano por la mañana o al anochecer.' },
        { t: 'Que vaya con paraguas y una botella de agua', p: 1, exp: 'Ayuda, pero mejor que no salga en las horas centrales.' },
      ] },
      { texto: 'En casa hace mucho calor. ¿Qué hacéis con las persianas?', opciones: [
        { t: 'Bajadas y ventanas cerradas de día; ventilamos de noche', p: 2, exp: 'Así entra menos calor. Al anochecer y a primera hora, abre para refrescar.' },
        { t: 'Todo abierto para que corra el aire', p: 0, exp: 'Si fuera hace más calor que dentro, entra aire caliente.' },
        { t: 'Persianas subidas y ventilador a tope', p: 1, exp: 'El ventilador ayuda, pero con el sol entrando la casa se calienta. Baja las persianas.' },
      ] },
      { texto: 'Le ofreces agua y dice que no tiene sed.', opciones: [
        { t: 'Espero a que tenga sed', p: 0, exp: 'Los mayores notan menos la sed. No esperes.' },
        { t: 'Le ofrezco agua a menudo, poca cada vez', p: 2, exp: 'Correcto. Pequeños sorbos frecuentes, también fruta y caldos fríos.' },
        { t: 'Le doy un café con hielo', p: 1, exp: 'Mejor agua: la cafeína en exceso no ayuda a hidratarse.' },
      ] },
      { texto: 'Por la tarde la notas confusa, con la piel muy caliente y seca.', opciones: [
        { t: 'Le doy agua y la dejo dormir', p: 0, exp: 'Pueden ser señales de golpe de calor, una emergencia. No esperes.' },
        { t: 'Llamo al 112, la llevo a un sitio fresco, le quito ropa y la refresco con paños húmedos', p: 2, exp: 'Exacto. Si está inconsciente, no le des de beber.' },
        { t: 'La llevo en coche a urgencias sin avisar a nadie', p: 1, exp: 'Llamar al 112 es mejor: te guían y mientras tanto puedes enfriarla.' },
      ] },
    ],
  },
  {
    id: 'monte', t: 'Perdido en el monte', ic: '🌲', desc: 'Anochece y no encuentras el camino', emg: 'persona-perdida',
    escenas: [
      { texto: 'Paseando por el monte, ya no reconoces el camino. Anochecerá en una hora.', opciones: [
        { t: 'Sigo andando rápido a ver si lo encuentro', p: 0, exp: 'Andar sin rumbo te aleja más y cansa. Para primero.' },
        { t: 'Me paro, respiro y pienso: dónde estaba, qué tengo y qué hago', p: 2, exp: 'Muy bien. Parar, pensar, observar y planificar es lo primero.' },
        { t: 'Atajo campo a través hacia un pueblo que se ve a lo lejos', p: 0, exp: 'Las distancias engañan y el terreno puede tener barrancos. Mejor pedir ayuda.' },
      ] },
      { texto: 'Te queda un 15 % de batería y hay algo de cobertura.', opciones: [
        { t: 'Llamo al 112 y doy mi posición', p: 2, exp: 'Correcto. En SOS esta app te da tus coordenadas para dictarlas.' },
        { t: 'Subo una foto a redes para que me ayuden', p: 0, exp: 'Gastas la poca batería que tienes. Al 112.' },
        { t: 'Uso el GPS con la pantalla encendida todo el rato', p: 0, exp: 'Agotarás la batería. Llama, da tu posición y ahórrala.' },
      ] },
      { texto: 'El 112 te dice que esperes a los equipos de rescate.', opciones: [
        { t: 'Me quedo donde estoy, visible, abrigado y con la linterna lista', p: 2, exp: 'Perfecto. Si te mueves, cuesta más encontrarte.' },
        { t: 'Sigo andando para entrar en calor', p: 0, exp: 'Te buscarán donde dijiste. Abrígate y quédate.' },
        { t: 'Busco un sitio escondido y abrigado lejos del camino', p: 1, exp: 'Abrigarse está bien, pero que te vean: quédate cerca del camino o en un claro.' },
      ] },
      { texto: 'Oyes voces a lo lejos.', opciones: [
        { t: 'Hago tres pitidos con el silbato y repito', p: 2, exp: 'Tres señales es la llamada de socorro. El silbato se oye más lejos y cansa menos que gritar.' },
        { t: 'Grito sin parar', p: 1, exp: 'Puede servir, pero te quedas sin voz. Silbato o linterna: tres señales.' },
        { t: 'Corro hacia las voces a oscuras', p: 0, exp: 'Riesgo de caída. Haz señales y deja que lleguen a ti.' },
      ] },
    ],
  },
  {
    id: 'perdido-ninos', t: 'Me he perdido (para niños)', ic: '🧒', desc: 'En un centro comercial o una feria', ninos: true, emg: 'persona-perdida',
    escenas: [
      { texto: 'Estás con tu familia en un centro comercial y, de repente, no los ves. ¿Qué haces?', opciones: [
        { t: 'Me quedo quieto donde estoy y miro alrededor', p: 2, exp: '¡Muy bien! Si te quedas quieto, es más fácil que te encuentren.' },
        { t: 'Salgo a la calle a buscarlos', p: 0, exp: 'Fuera es más difícil encontrarte. Quédate dentro.' },
        { t: 'Me voy con alguien que dice que me lleva fuera a buscarlos', p: 0, exp: 'Nunca te vayas con nadie a otro sitio. Pide ayuda allí mismo.' },
      ] },
      { texto: 'No aparecen. ¿A quién pides ayuda?', opciones: [
        { t: 'A un vigilante o a alguien que trabaje en una tienda', p: 2, exp: '¡Eso es! También puedes pedírsela a una mamá o un papá con niños.' },
        { t: 'A cualquier persona que pase', p: 1, exp: 'Mejor alguien con uniforme o que trabaje allí: sabe qué hacer.' },
        { t: 'A nadie: me escondo hasta que vengan', p: 0, exp: 'Escondido nadie te ve. Pide ayuda.' },
      ] },
      { texto: 'Te preguntan cómo pueden llamar a tu familia.', opciones: [
        { t: 'Digo el teléfono de memoria o enseño mi tarjeta', p: 2, exp: '¡Genial! Practicad en casa el teléfono de papá o mamá.' },
        { t: 'Digo cómo se llaman mamá o papá', p: 1, exp: 'Ayuda, pero con el teléfono es mucho más rápido. Apréndelo.' },
        { t: 'No lo sé', p: 0, exp: 'Por eso es importante aprenderlo o llevarlo apuntado. ¡Practicadlo!' },
      ] },
    ],
  },
];
