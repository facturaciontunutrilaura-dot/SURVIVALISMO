/* =========================================================================
   HUERTO DE SUPERVIVENCIA
   Producir parte de tu comida en un terreno, un patio o un balcón. Fechas
   orientativas para la península: dependen de la última helada de tu zona
   (en el interior y en altura, como Ávila, mucho más tarde que en la costa).
   ========================================================================= */

export const ART_HUERTO = [
  {
    id: 'huerto-empezar',
    sec: 'huerto',
    t: 'Empezar un huerto de supervivencia',
    pr: 'importante',
    sum: 'Sol, agua y buena tierra. Empieza pequeño con lo que más alimenta: patata, judía, calabaza, haba y hoja verde.',
    tags: ['huerto', 'cultivar', 'sembrar', 'plantar', 'autoabastecimiento', 'balcón', 'macetas'],
    body: [
      { p: 'Un huerto no sustituye a la despensa: la primera cosecha tarda meses. Es la solución para crisis largas y una gran ayuda para tener alimento fresco y vitaminas.' },
      { h: 'Lo que necesita cualquier huerto' },
      { ul: [
        'Sol: al menos 6 horas de sol directo al día. Sin sol no hay cosecha, por buena que sea la tierra.',
        'Agua cercana: un huerto en verano bebe mucho. Recoger agua de lluvia y acolchar el suelo reduce el riego a la mitad.',
        'Tierra suelta y con materia orgánica: añade compost o estiércol bien descompuesto (nunca fresco).',
        'Protección: valla o malla contra conejos y aves; red contra el granizo si tu zona lo sufre.',
      ] },
      { h: 'Qué cultivar primero (lo que más alimenta)' },
      {
        table: {
          head: ['Cultivo', 'Por qué', 'Dificultad'],
          rows: [
            ['Patata', 'La que más calorías da por metro cuadrado en clima templado; se conserva meses', 'Baja'],
            ['Judía (para grano seco)', 'Proteína que se guarda años, seca', 'Baja'],
            ['Calabaza de invierno', 'Se conserva 3–6 meses sin nevera', 'Baja'],
            ['Haba y guisante', 'Se siembran en otoño o al final del invierno; proteína temprana', 'Baja'],
            ['Acelga, espinaca, col, lechuga', 'Vitaminas y fibra durante casi todo el año', 'Baja'],
            ['Tomate y pimiento', 'Vitaminas y sabor; exigen calor, sol y riego regular', 'Media'],
            ['Cebolla y ajo', 'Se conservan meses y dan sabor a todo', 'Baja'],
          ],
        },
      },
      { h: 'Sin terreno: balcón o terraza' },
      { ul: [
        'Macetas de al menos 20 litros para tomate y patata; sacos de cultivo o cajas de fruta forradas también sirven.',
        'Lo más productivo en poco espacio: hoja verde, rábano, judía de enrame (crece hacia arriba), tomate cherry y patata en saco.',
        'Riega por la mañana o al anochecer; en maceta la tierra se seca mucho antes que en el suelo.',
        'Comprueba el peso que soporta tu balcón: la tierra mojada pesa mucho.',
      ] },
      { note: 'Empieza ahora, antes de necesitarlo: el primer año se aprende más de lo que se cosecha. Pregunta a los agricultores de tu zona y a la oficina agraria comarcal: saben qué funciona en tu clima.' },
      { check: 'huerto' },
    ],
    src: ['mapa-huerto'],
  },
  {
    id: 'huerto-patatas',
    sec: 'huerto',
    t: 'Patatas paso a paso',
    pr: 'importante',
    sum: 'Patata de siembra certificada, plantación tras las últimas heladas, aporcado y cosecha a los 3–4 meses. Se conservan meses a oscuras.',
    tags: ['patata', 'patatas', 'sembrar patatas', 'plantar patatas', 'cosechar', 'tubérculo', 'huerto'],
    body: [
      { h: '1. La semilla' },
      { ul: [
        'Usa patata de siembra certificada (con etiqueta oficial): está libre de enfermedades y viene preparada para brotar. Se vende en cooperativas, viveros y tiendas agrícolas.',
        'La patata de supermercado suele estar tratada para que no brote y puede llevar enfermedades al suelo. En una emergencia real, si es lo único que hay, usa las que ya hayan echado brotes.',
        'Las patatas grandes se pueden cortar en trozos con al menos 2 «ojos» (yemas) cada uno; deja secar el corte 1–2 días antes de plantar.',
        'Truco: pon las patatas de siembra 2–3 semanas antes en un sitio luminoso y fresco para que echen brotes cortos y fuertes.',
      ] },
      { h: '2. Cuándo plantar' },
      { ul: [
        'Cuando ya no haya riesgo de heladas fuertes: la planta no aguanta la helada.',
        'Orientativo: en la costa y el sur, de enero a marzo; en el interior, de marzo a mayo; en zonas frías y de montaña, en mayo.',
        'Algunas zonas cálidas hacen una segunda siembra a finales del verano.',
      ] },
      { h: '3. Plantar' },
      { ol: [
        'Suelo suelto y sin encharcamientos: la patata se pudre con exceso de agua.',
        'Surco o agujero de unos 10 cm de profundidad.',
        'Una patata (o trozo) cada 30–35 cm, con los brotes hacia arriba; 60–70 cm entre filas.',
        'Cubre con tierra y riega si el suelo está seco.',
      ] },
      { h: '4. Cuidados' },
      { ul: [
        'Aporcar: cuando la planta tenga unos 15–20 cm, arrima tierra a su base formando un caballón. Repite 2–3 semanas después. Las patatas que ven la luz se vuelven verdes.',
        'Riego regular, sobre todo durante la floración; sin encharcar.',
        'Revisa las hojas: el escarabajo de la patata (rayado amarillo y negro) y sus larvas rojizas se retiran a mano.',
      ] },
      { h: '5. Cosecha y conservación' },
      { ul: [
        'Patata nueva: cuando florece, se pueden sacar algunas para consumo inmediato.',
        'Patata para guardar: cuando la planta amarillea y se seca, normalmente a los 3–4 meses de plantar. Espera 1–2 semanas más para que la piel se endurezca.',
        'Sácalas con horca, con cuidado de no herirlas; déjalas secar unas horas a la sombra.',
        'Guárdalas a oscuras, en un lugar fresco (4–10 °C), seco y ventilado; en cajas o sacos de rafia, nunca en bolsas de plástico. Duran meses.',
        'Separa las dañadas: una patata podrida estropea las de alrededor.',
      ] },
      { warn: 'No comas patatas verdes ni los brotes: contienen solanina, que es tóxica. Si una patata tiene una zona verde pequeña, pélala con generosidad; si está muy verde, deséchala.' },
      { h: 'En saco o maceta' },
      { ul: [
        'Saco de cultivo o maceta de 30–40 litros: 3–4 patatas de siembra sobre 15 cm de tierra.',
        'Ve añadiendo tierra según crecen los tallos (es el aporcado en vertical).',
        'Riego frecuente: la maceta se seca rápido.',
      ] },
    ],
    src: ['patata-siembra', 'mapa-huerto'],
  },
  {
    id: 'huerto-calendario',
    sec: 'huerto',
    t: 'Calendario de siembra en España',
    pr: 'recomendado',
    sum: 'Qué sembrar en cada estación. En el interior y en altura, retrasa las siembras de primavera hasta que pasen las heladas.',
    tags: ['calendario de siembra', 'cuándo sembrar', 'estaciones', 'huerto', 'siembra'],
    body: [
      { p: 'Fechas orientativas para la península. La referencia que manda es la última helada de tu zona: en el interior y en la montaña puede llegar hasta mayo.' },
      {
        table: {
          head: ['Época', 'Sembrar o plantar', 'Cosechar'],
          rows: [
            ['Otoño (oct.–nov.)', 'Haba, guisante, ajo, cebolla de día corto, espinaca, lechuga de invierno', 'Calabaza, patata tardía, judía seca, pimiento'],
            ['Invierno (dic.–feb.)', 'Semilleros protegidos de tomate y pimiento al final del invierno; patata en zonas cálidas', 'Col, acelga, espinaca, puerro, nabo'],
            ['Primavera (mar.–may.)', 'Patata, judía, calabaza, calabacín, tomate, pimiento, maíz (tras las heladas)', 'Haba, guisante, ajo tierno, lechuga'],
            ['Verano (jun.–ago.)', 'Coles y puerros para el invierno; segunda judía; lechuga a la sombra', 'Tomate, pimiento, calabacín, judía verde, patata, ajo, cebolla'],
          ],
        },
      },
      { h: 'Cultivos rápidos (para comer pronto)' },
      {
        table: {
          head: ['Cultivo', 'Días hasta cosechar (aprox.)'],
          rows: [
            ['Rábano', '25–35'],
            ['Lechuga (hojas sueltas)', '30–45'],
            ['Espinaca', '40–50'],
            ['Acelga', '50–60'],
            ['Calabacín', '50–60'],
            ['Judía verde', '55–70'],
          ],
        },
      },
      { note: 'Siembra escalonada: siembra un poco cada 2–3 semanas en lugar de todo a la vez. Así tendrás cosecha continua y no un exceso que se estropea.' },
    ],
    src: ['mapa-huerto'],
  },
  {
    id: 'huerto-semillas',
    sec: 'huerto',
    t: 'Semillas: elegir, guardar y reproducir',
    pr: 'recomendado',
    sum: 'Variedades tradicionales (no híbridas F1) para poder guardar tu propia semilla. Secas, frescas y a oscuras duran años.',
    tags: ['semillas', 'guardar semillas', 'variedades tradicionales', 'híbridas', 'banco de semillas', 'huerto'],
    body: [
      { h: 'Qué semillas tener' },
      { ul: [
        'Variedades tradicionales o «de polinización abierta»: de su cosecha se obtiene semilla que da plantas iguales.',
        'Las híbridas («F1» en el sobre) producen mucho, pero su semilla no da plantas iguales: sirven para un año, no para reproducir.',
        'Busca variedades locales: están adaptadas a tu clima. Las redes de semillas y los bancos de semillas locales intercambian variedades.',
        'Kit básico: judía, haba, guisante, calabaza, tomate, pimiento, lechuga, acelga, espinaca, rábano, cebolla y zanahoria.',
      ] },
      { h: 'Guardar semilla de tu cosecha' },
      { ul: [
        'Judía, guisante y haba: deja secar las vainas en la planta y desgrana. Lo más fácil para empezar.',
        'Tomate: elige frutos sanos y maduros, deja fermentar las semillas con su jugo 2–3 días en un vaso, lávalas y sécalas sobre papel.',
        'Calabaza y pimiento: semillas de frutos bien maduros, lavadas y secas.',
        'Lechuga y rábano: deja que algunas plantas «se espiguen» y florezcan; recoge la semilla seca.',
      ] },
      { h: 'Conservar las semillas' },
      { ul: [
        'Bien secas, en sobres de papel o frascos cerrados, en un lugar fresco, seco y a oscuras.',
        'Etiqueta: cultivo, variedad y año. La mayoría germina bien 2–5 años (cebolla y puerro, solo 1–2).',
        'Prueba de germinación: pon 10 semillas en papel húmedo; si brotan menos de 5, renueva.',
      ] },
    ],
    src: ['mapa-huerto'],
  },
  {
    id: 'huerto-conservar',
    sec: 'huerto',
    t: 'Conservar la cosecha sin nevera',
    pr: 'importante',
    sum: 'Almacenar en frío y a oscuras, secar y deshidratar. Las conservas caseras en tarro son seguras solo con una esterilización correcta: el riesgo es el botulismo.',
    tags: ['conservar', 'conservas caseras', 'botulismo', 'deshidratar', 'secar', 'cosecha', 'sin nevera', 'huerto'],
    body: [
      { h: 'Lo más seguro y sencillo' },
      { ul: [
        'Almacenar entero: patata, cebolla, ajo, calabaza de invierno y manzana duran meses en un lugar fresco, seco, ventilado y a oscuras.',
        'Secar: judía y garbanzo en grano, setas cultivadas, hierbas aromáticas, tomate y pimiento en tiras finas al sol o con aire caliente y seco, protegidos de insectos.',
        'Dejar en la tierra: zanahoria, puerro y nabo aguantan semanas en el huerto en invierno; se sacan según se necesitan.',
        'Encurtidos con vinagre y salazón: el vinagre y la sal en cantidad suficiente frenan las bacterias.',
      ] },
      { h: 'Conservas caseras en tarro' },
      { warn: 'El principal riesgo de las conservas caseras es el botulismo: una toxina que puede ser mortal y que no siempre cambia el olor ni el sabor. Se produce sobre todo por una esterilización insuficiente de alimentos poco ácidos (judía verde, pimiento, berenjena, espárrago, setas, carnes y pescados).' },
      { ul: [
        'Higiene total: tarros y tapas lavados con agua caliente y jabón; manos y superficies limpias.',
        'Los alimentos ácidos (tomate con limón o vinagre, frutas) son los más seguros para el baño María. Los poco ácidos necesitan acidificarse o esterilizarse con olla a presión siguiendo una receta fiable.',
        'Sigue siempre recetas con tiempos y proporciones comprobados (por ejemplo, la guía de la AESAN); no improvises.',
        'Guarda los tarros a oscuras y en lugar fresco; consúmelos dentro del año.',
      ] },
      { warn: 'Desecha sin probar cualquier conserva con la tapa abombada, que salpique al abrir, con burbujas, olor raro o líquido turbio. Ante visión doble, dificultad para tragar o para hablar tras comer una conserva, llama al 112.' },
    ],
    src: ['aesan-conservas'],
  },
  {
    id: 'huerto-brotes',
    sec: 'huerto',
    t: 'Germinados y cultivos de interior',
    pr: 'recomendado',
    sum: 'Germinar legumbres en un tarro da alimento fresco en 3–5 días y sin tierra. Higiene estricta: los brotes pueden transmitir Salmonella o E. coli.',
    tags: ['germinados', 'brotes', 'germinar', 'lentejas', 'interior', 'sin tierra', 'vitaminas'],
    body: [
      { p: 'Cuando no hay verdura fresca, los germinados aportan frescura y variedad con muy poco: un tarro, agua limpia y semillas para germinar.' },
      { h: 'Cómo germinar en un tarro' },
      { ol: [
        'Usa semillas vendidas para germinar (lenteja, alfalfa, soja verde, garbanzo).',
        'Lava bien las semillas y ponlas en remojo en agua potable 8–12 horas.',
        'Escurre y deja el tarro inclinado, tapado con una gasa, a temperatura ambiente y sin sol directo.',
        'Enjuaga con agua potable dos veces al día y escurre bien: el agua estancada favorece las bacterias.',
        'En 3–5 días están listos. Guárdalos en frío si puedes y consúmelos pronto.',
      ] },
      { warn: 'Los germinados crudos han causado brotes de Salmonella y E. coli. Si hay personas embarazadas, mayores, niños pequeños o con defensas bajas, cocínalos: unos minutos de hervor o salteado eliminan el riesgo. Desecha los que huelan mal o estén viscosos.' },
      { h: 'Otros cultivos de interior' },
      { ul: [
        'Hojas tiernas en bandejas junto a una ventana luminosa: lechuga, rúcula, espinaca, cosechadas jóvenes.',
        'Hierbas aromáticas en maceta: perejil, albahaca, cebollino.',
        'Rebrotes: la base de puerros y cebolletas con raíz vuelve a echar hojas en un vaso de agua.',
      ] },
    ],
    src: ['consumer-germinar'],
  },
];
