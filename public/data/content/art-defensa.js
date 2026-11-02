/* =========================================================================
   DEFENSA PERSONAL Y FAMILIAR
   Prevenir, evitar, escapar y pedir ayuda. Defenderse físicamente es el
   último recurso, solo para poder huir. Nada material vale una vida.
   No se enseñan ni recomiendan armas: llevarlas puede ser delito y empeora
   casi siempre la situación.
   ========================================================================= */

export const ART_DEFENSA = [
  {
    id: 'def-principios',
    sec: 'defensa',
    t: 'Los principios de la defensa personal',
    pr: 'critico',
    sum: 'Evitar, alejarse, desescalar y, solo si no hay otra salida, defenderse lo justo para escapar. Lo que te pidan, dalo: tu vida vale más.',
    tags: ['defensa personal', 'seguridad personal', 'agresión', 'atraco', 'robo', 'principios'],
    body: [
      { ol: [
        'Evitar: la mejor pelea es la que no ocurre. Lugares, horas y personas de riesgo, mejor no.',
        'Alejarse: en cuanto algo te dé mala espina, vete. No hace falta tener razón para irse.',
        'Desescalar: si no puedes irte, calma, distancia y una salida para el otro.',
        'Ceder lo material: si te piden el bolso, el móvil o la cartera, dáselo. Nada de eso vale tu vida.',
        'Defenderse solo como último recurso y solo para romper el contacto y huir: no para «ganar».',
        'Pedir ayuda y denunciar: 112, 091 (Policía Nacional) o 062 (Guardia Civil).',
      ] },
      { note: 'Leer ayuda, pero la defensa personal se aprende practicando: un curso con instructores titulados (en un gimnasio, en tu ayuntamiento o en asociaciones) te dará reflejos que ningún texto da.' },
    ],
    src: ['pn-consejos'],
  },
  {
    id: 'def-alerta',
    sec: 'defensa',
    t: 'Estar alerta sin vivir con miedo',
    pr: 'importante',
    sum: 'Mirar alrededor, no ir absorto en el móvil, confiar en tu intuición y tener siempre en mente una salida y un lugar con gente.',
    tags: ['conciencia situacional', 'estar alerta', 'intuición', 'calle', 'noche', 'transporte', 'seguridad en la calle'],
    body: [
      { ul: [
        'Por la calle, cabeza alta y mirada al frente; el móvil y los auriculares, guardados en zonas solitarias.',
        'Fíjate en quién hay alrededor y en lo que no encaja: alguien que te sigue, que se acerca demasiado, que vigila.',
        'Confía en tu intuición: si algo no te gusta, cambia de acera, entra en un comercio o vuelve por donde has venido.',
        'Ten siempre localizada una salida y un lugar con gente (bar, farmacia, portal con conserje).',
        'Por la noche: calles iluminadas y transitadas; las llaves en la mano antes de llegar al portal.',
        'Comparte tu ubicación con alguien de confianza cuando vuelvas tarde.',
      ] },
      { note: 'Estar alerta no es vivir con miedo: es un hábito tranquilo, como mirar antes de cruzar.' },
    ],
    src: ['pn-consejos'],
  },
  {
    id: 'def-desescalada',
    sec: 'defensa',
    t: 'Calmar una situación tensa (desescalada)',
    pr: 'importante',
    sum: 'Distancia, manos abiertas y visibles, voz baja y tranquila, nada de insultos ni de humillar, y dejarle al otro una salida digna.',
    tags: ['desescalada', 'discusión', 'conflicto', 'pelea', 'calmar', 'amenaza', 'tensión'],
    body: [
      { ol: [
        'Mantén distancia: más de dos brazos. Colócate de lado, no de frente.',
        'Manos abiertas y a la altura del pecho, a la vista: transmiten calma y te protegen.',
        'Voz baja, lenta y firme. Frases cortas: «Tranquilo, no busco problemas», «Tienes razón, me voy».',
        'No insultes, no te burles, no le toques, no le acorrales ni le pidas que «se calme» a gritos.',
        'Dale una salida: que pueda irse sin quedar mal. A veces basta con pedir perdón aunque no tengas la culpa.',
        'En cuanto haya hueco, vete hacia donde haya gente.',
      ] },
      { warn: 'Si hay un arma, no discutas ni intentes quitársela: obedece, entrega lo que pida, fíjate en sus rasgos para describirlos después y, en cuanto sea seguro, llama al 112.' },
    ],
    src: ['pn-consejos'],
  },
  {
    id: 'def-ataque',
    sec: 'defensa',
    t: 'Si te atacan: escapar y pedir ayuda',
    pr: 'critico',
    sum: 'Grita, protege la cabeza, rompe el agarre para soltarte y huye hacia donde haya gente. Después, a salvo, llama al 112.',
    tags: ['me atacan', 'agresión', 'ataque', 'agarre', 'huir', 'gritar', 'pedir ayuda', 'defenderse'],
    body: [
      { ol: [
        'Grita fuerte y con frases concretas: «¡Ayuda!», «¡Suéltame!», «¡Llamad al 112!». Atrae a otros y desconcierta al agresor.',
        'Protege la cabeza y el cuello con los brazos.',
        'Para soltarte de un agarre: gira hacia el lado del pulgar del agresor (es la parte débil de la mano) con un tirón seco; usa tu peso, no solo los brazos.',
        'Si no hay más remedio, golpea lo justo para soltarte y crear distancia, y huye inmediatamente: no te quedes a pelear.',
        'Corre hacia lugares con gente, luz y testigos: un comercio, un portal con gente, una parada de taxis.',
        'Ya a salvo: llama al 112, 091 o 062. Anota cuanto antes cómo era el agresor y por dónde se fue.',
      ] },
      { note: 'Si te han herido: presión directa sobre la herida que sangra y abre la ficha de hemorragia de SOS.' },
    ],
    src: ['pn-consejos'],
  },
  {
    id: 'def-legal',
    sec: 'defensa',
    t: 'Legítima defensa: lo que dice la ley en España',
    pr: 'importante',
    sum: 'El Código Penal (artículo 20.4) exige una agresión ilegítima, que la forma de defenderse sea racionalmente necesaria y no haber provocado. Pasarse puede convertirte en culpable.',
    tags: ['legítima defensa', 'ley', 'código penal', 'denuncia', 'proporcionalidad', 'armas', 'defensa del domicilio'],
    body: [
      { h: 'Los tres requisitos (artículo 20.4 del Código Penal)' },
      { ol: [
        'Agresión ilegítima: un ataque real, actual o inminente. Insultos o amenazas vagas, por sí solos, no lo son. La entrada indebida en tu casa se considera agresión ilegítima.',
        'Necesidad racional del medio empleado: lo que haces para defenderte debe ser razonable para impedir o repeler el ataque, valorado desde tu situación en ese momento.',
        'Falta de provocación suficiente: no haber provocado tú la agresión.',
      ] },
      { ul: [
        'La defensa acaba cuando acaba el ataque: golpear a alguien que ya huye o está en el suelo ya no es defensa.',
        'Si falta alguno de los requisitos, los tribunales pueden reducir la pena o no eximirla.',
        'Llevar armas (navajas, porras, puños americanos…) para defenderte puede ser una infracción o un delito y casi siempre empeora la situación.',
      ] },
      { h: 'Después de defenderte' },
      { ol: [
        'Ponte a salvo y llama al 112 o a la policía: cuenta lo ocurrido con calma.',
        'Si hay heridos, pide asistencia sanitaria para todos.',
        'Busca testigos y pide sus datos; conserva grabaciones de cámaras si las hay.',
        'Denuncia y, ante cualquier duda, habla con un abogado antes de declarar sobre los detalles.',
      ] },
      { note: 'Esto es información general, no asesoramiento jurídico. Cada caso lo valoran los tribunales.' },
    ],
    src: ['boe-cp'],
  },
  {
    id: 'def-hogar',
    sec: 'defensa',
    t: 'Proteger tu casa y qué hacer si entra alguien',
    pr: 'importante',
    sum: 'Puerta y cerraduras buenas, ventanas cerradas, luz y vecinos atentos. Si entra alguien: no te enfrentes, enciérrate con tu familia y llama al 112 en silencio.',
    tags: ['intruso', 'ladrones en casa', 'okupas', 'robo en casa', 'seguridad del hogar', 'cerradura', 'puerta blindada'],
    body: [
      { h: 'Prevención' },
      { ul: [
        'Puerta sólida con cerradura de seguridad y, si puedes, mirilla; echa la llave siempre, también estando dentro.',
        'Ventanas y accesos bajos (planta baja, terrazas, patios) con cierre; no dejes escaleras ni muebles que faciliten subir.',
        'Que parezca habitada: luces con temporizador, buzón vacío, persianas no siempre bajadas.',
        'No publiques en redes que estás de viaje ni fotos que muestren lo que tienes o dónde vives.',
        'Conoce a tus vecinos y avisaos entre vosotros de lo que no encaja.',
      ] },
      { h: 'Si oyes que alguien ha entrado' },
      { ol: [
        'No vayas a ver ni te enfrentes: los objetos se recuperan; las personas, no.',
        'Reúne a tu familia en una habitación que se pueda cerrar (con el móvil); bloquea la puerta.',
        'Llama al 112 o al 091 y habla en voz baja; si no puedes hablar, deja la llamada abierta.',
        'Si te encuentras con el intruso, deja que se vaya: no le cortes la salida.',
        'Después, no toques nada hasta que llegue la policía: hay huellas y pruebas.',
      ] },
    ],
    src: ['pn-consejos'],
  },
  {
    id: 'def-familia',
    sec: 'defensa',
    t: 'Plan de seguridad familiar',
    pr: 'importante',
    sum: 'Una palabra clave familiar, niños que saben a quién pedir ayuda y cómo llamar al 112, contactos de emergencia en papel y ubicaciones compartidas.',
    tags: ['familia', 'niños', 'palabra clave', 'seguridad familiar', 'hijos', 'perderse', 'secuestro', 'desconocidos'],
    body: [
      { h: 'En familia' },
      { ul: [
        'Una palabra clave familiar: si alguien dice que va a recoger a los niños de vuestra parte, tiene que saberla.',
        'Contactos de emergencia en papel, en la mochila y en la cartera, no solo en el móvil.',
        'Ubicación compartida entre los adultos cuando haya riesgo.',
        'Un punto de encuentro si os separáis (ver Plan familiar).',
      ] },
      { h: 'Lo que deben saber los niños (según su edad)' },
      { ul: [
        'Su nombre completo, el de sus padres y un teléfono de memoria.',
        'Cómo llamar al 112 y qué decir: «Me llamo…, estoy en…, pasa…».',
        'Si se pierden: quedarse quietos y pedir ayuda a una persona con uniforme, a un dependiente de una tienda o a una madre o un padre con niños.',
        'Que nadie puede tocarles de forma que les haga sentir mal, y que pueden contarlo siempre sin miedo a castigos.',
        'No irse con nadie ni subir a ningún coche sin la palabra clave, aunque digan que es urgente.',
      ] },
      { h: 'Teléfonos y recursos' },
      {
        table: {
          head: ['Para qué', 'Contacto'],
          rows: [
            ['Cualquier emergencia', '112'],
            ['Policía Nacional / Guardia Civil', '091 / 062'],
            ['Violencia contra las mujeres: atención 24 h, en 53 idiomas; no aparece en la factura (bórralo del historial del móvil)', '016 · WhatsApp 600 000 016'],
            ['Crisis emocional o ideas de suicidio', '024'],
            ['Avisar a la policía desde el móvil, también sin hablar (no en Cataluña ni el País Vasco)', 'App AlertCops (Ministerio del Interior)'],
          ],
        },
      },
    ],
    src: ['pn-consejos', 'gob-016', 'alertcops'],
  },
  {
    id: 'def-desplazamientos',
    sec: 'defensa',
    t: 'Moverse con seguridad durante disturbios o una crisis',
    pr: 'importante',
    sum: 'Si tienes que desplazarte: de día, por rutas conocidas, sin paradas innecesarias, depósito lleno, puertas bloqueadas y nunca hacia una concentración.',
    tags: ['disturbios', 'desplazarse', 'coche', 'control', 'barricada', 'seguridad en carretera', 'crisis', 'colapso'],
    body: [
      { ul: [
        'Infórmate antes de salir de las zonas afectadas (fuentes oficiales) y evita los grandes núcleos urbanos.',
        'Mejor de día, por rutas que conozcas y con un plan B.',
        'En el coche: depósito lleno, puertas bloqueadas, ventanillas subidas, sin objetos de valor a la vista.',
        'No pares a ayudar en lugares aislados si la situación es sospechosa: avisa al 112 desde un lugar seguro.',
        'Ante un grupo o una concentración: da la vuelta con calma; no grabes ni discutas.',
        'En un control oficial: detente, manos a la vista, obedece y no hagas movimientos bruscos.',
        'Ve en grupo si es posible y avisa a alguien de tu ruta y de la hora prevista de llegada.',
      ] },
    ],
    src: ['pn-consejos', 'pc-es'],
  },
];
