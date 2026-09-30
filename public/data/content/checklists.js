// Plantillas de checklists. El estado del usuario se guarda en IndexedDB.
// Estados por ítem: '' (sin marcar) · tengo · falta · comprar · revisar
// Cada ítem admite además una fecha de caducidad/revisión.

export const CHECKLISTS = [
  {
    id: 'nivel2',
    t: 'Nivel 2 — Autonomía 72 horas',
    desc: 'El objetivo mínimo razonable para cualquier hogar. Complétalo antes de pasar a niveles superiores.',
    grupos: [
      { g: 'Agua', items: ['3 l/persona/día × 3 días almacenados', 'Garrafas o bidones de reserva', 'Pastillas potabilizadoras o filtro de campo', 'Lejía apta para desinfección de agua de bebida', 'Recipientes plegables para transporte'] },
      { g: 'Comida', items: ['3 días de alimento sin necesidad de cocinar', 'Abrelatas manual', 'Frutos secos y barritas energéticas', 'Alimentación específica (bebés, celíacos, diabéticos…)', 'Hornillo de gas + cartucho'] },
      { g: 'Iluminación', items: ['Linterna frontal por persona', 'Linterna de mano', 'Pilas de repuesto en envase aparte', 'Farol o linterna de área', 'Barras luminosas o velas con soporte seguro'] },
      { g: 'Energía', items: ['Power bank cargada (≥10.000 mAh)', 'Cables de carga de todos los dispositivos', 'Cargador de coche', 'Panel solar plegable (opcional)'] },
      { g: 'Comunicaciones', items: ['Radio a pilas o de manivela (AM/FM)', 'ES-Alert activado en todos los móviles', 'Lista de teléfonos en papel', 'Contacto externo fuera de la zona acordado', 'PMR446 con canal y horario acordados (opcional)'] },
      { g: 'Primeros auxilios', items: ['Botiquín completo y revisado', 'Medicación crónica para 7 días mínimo', 'Recetas y listado de principios activos', 'Mascarilla de RCP', 'Guantes de nitrilo'] },
      { g: 'Herramientas', items: ['Multiherramienta o navaja', 'Cinta americana', 'Cuerda / cordino 15 m', 'Llave de corte de gas y de agua', 'Silbato', 'Guantes de trabajo'] },
      { g: 'Ropa', items: ['Capa térmica por persona', 'Cortavientos impermeable', 'Calzado cerrado y resistente accesible', 'Gorro y guantes', 'Calcetines de repuesto'] },
      { g: 'Higiene', items: ['Jabón y gel hidroalcohólico', 'Papel higiénico', 'Bolsas de basura resistentes', 'Toallitas húmedas', 'Higiene menstrual', 'Pañales si procede'] },
      { g: 'Documentación', items: ['Copias de DNI, tarjeta sanitaria y carné de conducir', 'Copia digital cifrada en USB', 'Póliza de seguros y contactos', 'Efectivo en billetes pequeños', 'Fotos de la familia y de las mascotas'] },
      { g: 'Navegación', items: ['Mapa en papel de tu zona', 'Brújula', 'Esta app instalada y con recursos descargados'] },
      { g: 'Refugio y calor', items: ['Manta térmica por persona', 'Saco de dormir o mantas', 'Detector de monóxido de carbono', 'Extintor ABC', 'Plástico y cinta para sellar'] },
    ],
  },
  {
    id: 'bob',
    t: 'Mochila de evacuación (BOB · 72 h)',
    desc: 'Preparada, accesible y revisada. Peso objetivo: máximo 20–25 % de tu peso corporal.',
    grupos: [
      { g: 'Agua', items: ['2–3 l de agua', 'Filtro o pastillas', 'Botella plegable'] },
      { g: 'Comida', items: ['Alimento 72 h sin cocinar', 'Barritas energéticas', 'Sales de rehidratación'] },
      { g: 'Refugio', items: ['Manta térmica o saco de vivac', 'Tarp ligero', 'Cordino 10–15 m', 'Esterilla fina o aislante'] },
      { g: 'Ropa', items: ['Capa térmica', 'Cortavientos impermeable', 'Gorro y guantes', 'Calcetines de repuesto', 'Ropa interior de repuesto'] },
      { g: 'Luz y energía', items: ['Frontal + pilas', 'Power bank + cable', 'Mechero y cerillas estancas'] },
      { g: 'Salud', items: ['Botiquín compacto', 'Medicación personal 7 días', 'Apósitos para ampollas', 'Protección solar'] },
      { g: 'Navegación', items: ['Mapa en papel', 'Brújula', 'Silbato', 'Libreta y lápiz'] },
      { g: 'Documentación', items: ['Copias de documentación en bolsa estanca', 'Efectivo', 'Llaves de casa y coche', 'Lista de contactos en papel'] },
      { g: 'Herramientas', items: ['Multiherramienta', 'Cinta americana enrollada', 'Bolsas de basura', 'Papel higiénico y jabón'] },
    ],
  },
  {
    id: 'ghb',
    t: 'Get Home Bag (volver a casa a pie)',
    desc: 'Vive en el coche o en el trabajo. Su único objetivo: llegar a casa andando.',
    grupos: [
      { g: 'Movilidad', items: ['Calzado cerrado y cómodo', 'Calcetines técnicos', 'Chaleco reflectante', 'Mochila ligera'] },
      { g: 'Básicos', items: ['1–2 l de agua', 'Comida energética', 'Frontal + pilas', 'Power bank', 'Efectivo'] },
      { g: 'Protección', items: ['Chaqueta impermeable', 'Capa térmica', 'Gorra o gorro', 'Guantes', 'Mascarilla FFP2'] },
      { g: 'Salud y orientación', items: ['Botiquín mínimo con apósitos de ampolla', 'Mapa en papel de la ruta casa–trabajo', 'Brújula', 'Silbato'] },
    ],
  },
  {
    id: 'despensa',
    t: 'Despensa de emergencia',
    desc: 'Rotación FIFO. Anota la caducidad de cada elemento en el campo de fecha.',
    grupos: [
      { g: 'Base energética', items: ['Arroz', 'Pasta', 'Harina', 'Avena', 'Aceite de oliva', 'Azúcar', 'Sal'] },
      { g: 'Proteína', items: ['Legumbre cocida en conserva', 'Legumbre seca', 'Conservas de pescado', 'Conservas de carne', 'Leche UHT o en polvo', 'Frutos secos'] },
      { g: 'Listos para comer', items: ['Tomate frito y sofritos', 'Galletas y tostadas', 'Patés y untables', 'Fruta en conserva', 'Chocolate'] },
      { g: 'Moral y sabor', items: ['Café o té', 'Especias', 'Miel', 'Caldo concentrado'] },
      { g: 'Utensilios', items: ['Abrelatas manual', 'Hornillo y cartuchos de gas', 'Olla y sartén', 'Cubertería y platos reutilizables', 'Papel de aluminio y film'] },
    ],
  },
  {
    id: 'botiquin',
    t: 'Botiquín',
    desc: 'Revisar cada 6 meses. Anota caducidades.',
    grupos: [
      { g: 'Material de cura', items: ['Guantes de nitrilo', 'Gasas estériles', 'Compresas grandes', 'Vendas de gasa', 'Venda elástica', 'Esparadrapo', 'Apósitos adhesivos surtidos', 'Apósitos hidrocoloides (ampollas)', 'Suero fisiológico monodosis', 'Clorhexidina'] },
      { g: 'Instrumental', items: ['Tijeras de punta roma', 'Pinzas finas', 'Termómetro', 'Mascarilla de RCP', 'Manta térmica', 'Bolsa de frío instantáneo', 'Triángulo de tela / cabestrillo'] },
      { g: 'Medicación', items: ['Analgésico/antitérmico', 'Antihistamínico oral', 'Sales de rehidratación oral', 'Medicación crónica (30 días)', 'Autoinyector de adrenalina si procede'] },
      { g: 'Ampliación', items: ['Torniquete comercial', 'Vendaje compresivo', 'Férula moldeable', 'Guía impresa de primeros auxilios'] },
    ],
  },
  {
    id: 'vehiculo',
    t: 'Vehículo',
    desc: 'Kit permanente + kit de invierno de octubre a abril.',
    grupos: [
      { g: 'Obligatorio y seguridad', items: ['Chalecos reflectantes (uno por ocupante)', 'Baliza V-16 conectada o triángulos', 'Rueda de repuesto / kit antipinchazos', 'Gato y llave comprobados', 'Rompecristales y cortacinturones al alcance'] },
      { g: 'Autonomía', items: ['Depósito por encima de la mitad', 'Agua 2 l', 'Comida no perecedera', 'Manta térmica y manta gruesa', 'Linterna + pilas', 'Cargador USB de coche'] },
      { g: 'Herramientas', items: ['Pinzas de arranque o arrancador de litio', 'Multiherramienta', 'Cinta americana', 'Cuerda de remolque', 'Guantes de trabajo'] },
      { g: 'Invierno', items: ['Cadenas homologadas y PROBADAS', 'Rascador y anticongelante de parabrisas', 'Pala plegable', 'Saco de dormir o manta gruesa', 'Ropa de abrigo y calzado impermeable'] },
      { g: 'Documentación', items: ['Permiso de circulación y ficha técnica', 'Seguro y teléfono de asistencia', 'Mapa de carreteras en papel'] },
    ],
  },
  {
    id: 'apagon',
    t: 'Apagón — acciones inmediatas',
    desc: 'Marca lo que ya has hecho durante el corte.',
    grupos: [
      { g: 'Primeros 15 minutos', items: ['Linternas encendidas (no velas)', 'Comprobado cuadro eléctrico y diferenciales', 'Comprobado si afecta a vecinos y calle', 'Radio a pilas encendida', 'Móviles en modo ahorro'] },
      { g: 'Primera hora', items: ['Nevera y congelador cerrados', 'Agua almacenada (bañera, garrafas, ollas)', 'Aparatos sensibles desenchufados', 'Comprobado que nadie está atrapado en el ascensor', 'Vecinos vulnerables contactados'] },
      { g: 'Primeras 24 horas', items: ['Efectivo localizado', 'Alimentos perecederos consumidos primero', 'Termómetro en la nevera', 'Depósito del coche comprobado', 'Medicación refrigerada gestionada'] },
    ],
  },
  {
    id: 'casa',
    t: 'Preparación de la vivienda',
    desc: 'Revisión anual.',
    grupos: [
      { g: 'Seguridad', items: ['Detector de humo con pila comprobada', 'Detector de monóxido de carbono', 'Extintor ABC 6 kg', 'Manta ignífuga en la cocina', 'Salidas y llaves accesibles sin luz'] },
      { g: 'Cortes de suministro', items: ['Llave de corte general de agua localizada', 'Llave de corte de gas localizada', 'Cuadro eléctrico accesible y etiquetado', 'Reserva de agua almacenada', 'Fuente de calor alternativa segura'] },
      { g: 'Riesgo exterior', items: ['Perímetro despejado de vegetación seca (interfaz forestal)', 'Canalones y sumideros limpios', 'Toldos y mobiliario exterior asegurables', 'Persianas y cierres en buen estado'] },
      { g: 'Documentación y datos', items: ['Copias de documentos en bolsa estanca', 'Copia digital fuera de casa', 'Inventario fotográfico de la vivienda', 'Póliza de seguro revisada'] },
    ],
  },
  {
    id: 'comunicaciones',
    t: 'Plan de comunicación',
    desc: 'Acordado con la familia y escrito en papel.',
    grupos: [
      { g: 'Antes', items: ['ES-Alert activado en todos los móviles', 'Contacto externo fuera de la zona acordado', 'Lista de teléfonos en papel en cada mochila', 'Horarios de contacto acordados (ej. 9:00 y 21:00)', 'Radio a pilas comprobada'] },
      { g: 'Durante', items: ['Mensajes de texto en vez de llamadas', 'Modo avión cuando no se comunica', 'Batería racionada', 'Solo fuentes oficiales'] },
      { g: 'Radio (opcional)', items: ['PMR446: canal y subtono acordados', 'Horario de escucha acordado', 'Pilas de repuesto', 'Frecuencias anotadas y verificadas'] },
    ],
  },
  {
    id: 'mascotas',
    t: 'Mascotas',
    desc: 'Kit y documentación.',
    grupos: [
      { g: 'Transporte', items: ['Transportín adecuado', 'Correa y arnés', 'Bozal si es necesario', 'Sistema de retención homologado para el coche'] },
      { g: 'Consumibles', items: ['Comida para 7 días', 'Agua 3 días + bebedero plegable', 'Medicación prescrita con pauta escrita', 'Bolsas, empapadores, arena'] },
      { g: 'Documentación', items: ['Cartilla sanitaria', 'Número de microchip y datos actualizados', 'Foto reciente con el animal', 'Teléfono del veterinario'] },
      { g: 'Confort', items: ['Manta con su olor', 'Juguete habitual', 'Botiquín específico'] },
    ],
  },
  {
    id: 'montana',
    t: 'Salida a la montaña',
    desc: 'Antes de cada salida, sea corta o larga.',
    grupos: [
      { g: 'Planificación', items: ['Ruta y horario comunicados a alguien', 'Hora límite para llamar al 112 acordada', 'Previsión meteorológica consultada', 'Hora de salida adecuada a las tormentas vespertinas', 'Alternativa de escape identificada'] },
      { g: 'Material', items: ['Frontal + pilas', 'Manta térmica', 'Botiquín', 'Agua suficiente + extra', 'Comida energética', 'Capa de abrigo extra', 'Chubasquero', 'Mapa en papel y brújula', 'Móvil cargado + power bank', 'Silbato', 'Protección solar'] },
      { g: 'Invierno', items: ['Material de progresión sobre nieve (si sabes usarlo)', 'Guantes y gorro', 'Gafas de sol categoría 3–4', 'Polainas'] },
    ],
  },
  {
    id: 'avila',
    t: 'Plan Ávila (estacional)',
    desc: 'Revisión en junio y en noviembre.',
    grupos: [
      { g: 'Verano — incendio (12 jun – 12 oct)', items: ['Comprobado si la vivienda está en interfaz urbano-forestal', 'Perímetro despejado de vegetación seca', 'Dos rutas de salida conocidas por toda la familia', 'Mochila de evacuación junto a la puerta', 'ES-Alert activado', 'Sin uso de fuego ni maquinaria en monte'] },
      { g: 'Invierno — nieve y frío', items: ['Reserva de 7 días de agua y alimento', 'Sistema de calor sin red eléctrica + ventilación', 'Detector de monóxido de carbono', 'Cadenas probadas en el coche', 'Vecinos vulnerables identificados', 'Linterna, radio y botas accesibles sin luz'] },
      { g: 'Todo el año', items: ['Radio a pilas comprobada', 'Power bank cargada', 'Efectivo en billetes pequeños', 'Depósito del coche por encima de la mitad', 'Teléfonos locales anotados en papel', 'Puntos de encuentro familiares acordados'] },
    ],
  },
];
