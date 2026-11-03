/* =========================================================================
   Contenido de los juegos nuevos (v1.15): fichas de juegos SIN PANTALLA,
   objetos de «Mochila en 60 segundos» y de «Salva la despensa».
   Las reglas son las tradicionales, contadas con nuestras palabras.
   ========================================================================= */

export const SIN_PANTALLA_AVISO = 'Sin batería, sin conexión: estos juegos solo necesitan una baraja, papel o ganas de hablar. Ayudan a llevar mejor la espera y la tensión, sobre todo con niños.';

export const SIN_PANTALLA = [
  {
    id: 'baraja', t: 'Con baraja española', ic: '🃏',
    juegos: [
      {
        t: 'Brisca', jug: '2 a 4 (con 4, por parejas)', dur: '15 min',
        pasos: [
          'Se reparten 3 cartas a cada uno. Se da la vuelta a la siguiente: su palo es el «triunfo» y se deja debajo del mazo, a la vista.',
          'Por turnos, cada jugador echa una carta. No hace falta seguir el palo.',
          'Gana la baza la carta más alta del palo que salió primero, salvo que alguien eche triunfo: entonces gana el triunfo más alto.',
          'Quien gana la baza roba primero y empieza la siguiente. Se roba hasta acabar el mazo y se juegan las últimas cartas.',
          'Orden de fuerza: as, tres, rey, caballo, sota, 7, 6, 5, 4, 2.',
          'Puntos: as 11, tres 10, rey 4, caballo 3, sota 2; el resto, 0. Hay 120 en total: gana quien pase de 60.',
        ],
      },
      {
        t: 'Cinquillo', jug: '3 a 5', dur: '10 min',
        pasos: [
          'Se reparten todas las cartas.',
          'Empieza quien tenga el 5 de oros y lo pone en el centro.',
          'Por turnos, cada uno pone una carta: otro 5 para abrir un palo nuevo, o la carta siguiente o anterior de un palo que ya está en la mesa (4 y 6 junto al 5, luego 3 y 7…).',
          'Si no puedes poner, pasas.',
          'Gana quien se queda antes sin cartas.',
        ],
      },
      {
        t: 'Escoba', jug: '2 a 4', dur: '20 min',
        pasos: [
          'Valor de las cartas: del as (1) al 7 su número; sota 8, caballo 9, rey 10.',
          'Se reparten 3 cartas a cada uno y se ponen 4 boca arriba en la mesa.',
          'En tu turno echas una carta. Si con ella y una o varias de la mesa sumas 15, te las llevas.',
          'Si te llevas todas las de la mesa, es una «escoba»: deja tu carta boca arriba en tu montón para contarla.',
          'Al acabar el mazo se cuenta: 1 punto por escoba, por tener más cartas, por más oros, por el 7 de oros y por más sietes. Se juega a 21 puntos.',
        ],
      },
      {
        t: 'Chinchón', jug: '2 a 6', dur: '30 min',
        pasos: [
          'Se reparten 7 cartas a cada uno. El resto, boca abajo, y se da la vuelta a una para empezar el montón de descarte.',
          'En tu turno robas una carta (del mazo o la de arriba del descarte) y tiras otra.',
          'El objetivo es combinar las cartas: tríos o cuartetos del mismo número, o escaleras de 3 o más cartas seguidas del mismo palo.',
          'Cuando lo que no combinas suma muy poco (lo habitual: 3 puntos o menos), puedes cerrar al tirar tu carta.',
          'Cada uno suma las cartas que no ha combinado (las figuras valen 10) y se apunta. Quien pasa de 100, queda fuera.',
          'Si cierras con una escalera de las 7 cartas del mismo palo, haces «chinchón» y ganas la partida entera.',
        ],
      },
    ],
  },
  {
    id: 'papel', t: 'Con papel y boli', ic: '✏️',
    juegos: [
      {
        t: 'Hundir la flota', jug: '2', dur: '20 min',
        pasos: [
          'Cada uno dibuja dos cuadrículas de 10 × 10 (columnas A–J, filas 1–10): una para sus barcos y otra para apuntar sus disparos.',
          'Sin que el otro lo vea, coloca en horizontal o vertical: 1 barco de 4 casillas, 2 de 3, 3 de 2 y 4 de 1. No pueden tocarse.',
          'Por turnos, se dispara diciendo una casilla («C7»). El otro responde «agua», «tocado» o «hundido».',
          'Gana quien hunde antes toda la flota contraria.',
        ],
      },
      {
        t: 'Ahorcado', jug: '2 o más', dur: '5 min',
        pasos: [
          'Uno piensa una palabra y dibuja una raya por letra.',
          'Los demás dicen letras. Si está, se escribe en su sitio; si no, se dibuja una parte del muñeco.',
          'Se gana si se adivina la palabra antes de completar el dibujo (unos 7 fallos).',
          'Variante tranquila para niños: en vez de un ahorcado, dibujad una flor que pierde pétalos.',
        ],
      },
      {
        t: 'Stop (tutti frutti)', jug: '2 o más', dur: '10 min',
        pasos: [
          'Cada uno hace una tabla con columnas: nombre, animal, país o ciudad, comida, cosa…',
          'Se elige una letra al azar.',
          'Todos rellenan una palabra por columna que empiece por esa letra. El primero que acaba grita «¡Stop!» y todos paran.',
          'Puntos: 10 si nadie más ha puesto esa palabra, 5 si está repetida, 0 si está en blanco.',
        ],
      },
      {
        t: 'Puntos y cajas', jug: '2', dur: '10 min',
        pasos: [
          'Dibujad una rejilla de puntos (por ejemplo, 6 × 6).',
          'Por turnos, cada uno une dos puntos vecinos con una línea, en horizontal o vertical.',
          'Quien cierra un cuadrado escribe su inicial dentro y vuelve a jugar.',
          'Cuando no quedan líneas, gana quien tiene más cuadrados.',
        ],
      },
    ],
  },
  {
    id: 'palabras', t: 'Solo con palabras', ic: '🗣️',
    nota: 'Perfectos para el coche, una cola, una evacuación o la oscuridad de un apagón.',
    juegos: [
      {
        t: 'Veo, veo', jug: '2 o más', dur: 'lo que queráis',
        pasos: [
          'Uno elige algo que está a la vista y dice: «Veo, veo… una cosita que empieza por la letra…».',
          'Los demás preguntan y prueban hasta acertar. Quien acierta, elige la siguiente.',
          'Con niños pequeños, mejor por colores: «una cosita de color rojo».',
        ],
      },
      {
        t: 'Palabras encadenadas', jug: '2 o más', dur: 'lo que queráis',
        pasos: [
          'Uno dice una palabra. El siguiente dice otra que empiece por la última sílaba de la anterior: «casa» → «sapo» → «pomo»…',
          'No vale repetir. Quien se atasca o repite, queda fuera de esa ronda.',
        ],
      },
      {
        t: 'Veinte preguntas', jug: '2 o más', dur: '10 min',
        pasos: [
          'Uno piensa en algo: un animal, una persona, un objeto.',
          'Los demás tienen 20 preguntas que solo se responden con «sí» o «no» para adivinarlo.',
          'Truco: empezad por lo general («¿está vivo?», «¿es más grande que una caja de zapatos?»).',
        ],
      },
    ],
  },
  {
    id: 'ninos', t: 'Para niños en casa', ic: '🧸',
    nota: 'Sirven para mantener una rutina y el ánimo. Que los adultos jueguen también ayuda a que los niños se sientan seguros.',
    juegos: [
      {
        t: 'Búsqueda del tesoro', jug: '1 o más', dur: '20 min',
        pasos: [
          'Un adulto esconde un «tesoro» (un dibujo, una galleta, un juguete) en casa.',
          'Prepara 4 o 5 pistas en papel; cada una lleva a la siguiente («donde guardamos el frío» → nevera).',
          'Con los más pequeños, pistas con dibujos; con los mayores, adivinanzas o coordenadas en un plano de la casa.',
        ],
      },
      {
        t: '¿Qué falta?', jug: '2 o más', dur: '10 min',
        pasos: [
          'Poned 8 a 10 objetos pequeños en una bandeja y miradlos un minuto.',
          'Se tapan y alguien quita uno sin que se vea.',
          'Se destapan: ¿qué falta? Para hacerlo más difícil, se cambia el orden o se quitan dos.',
        ],
      },
      {
        t: 'Cuento encadenado', jug: '2 o más', dur: '15 min',
        pasos: [
          'Uno empieza un cuento con una frase: «Había una vez un perro que vivía en un faro…».',
          'Cada uno añade una o dos frases, por turnos.',
          'Se puede poner un reto: que salgan tres palabras elegidas al principio, o que el cuento acabe bien.',
        ],
      },
    ],
  },
];

/* ---------------- Mochila en 60 segundos ----------------
   Peso máximo 10 kg (una mochila de emergencia que se pueda llevar
   andando). `esencial`: lo que no debería faltar en una mochila de
   evacuación (agua, comida, luz, información, salud, documentos, abrigo). */
export const MOCHILA_MAX_KG = 10;
export const MOCHILA_OBJETOS = [
  { id: 'agua', t: 'Agua (3 litros)', ic: '💧', kg: 3, esencial: true, por: 'El agua es lo primero: unos 3 litros por persona y día.' },
  { id: 'comida', t: 'Comida que no necesita cocina', ic: '🥫', kg: 1.5, esencial: true, por: 'Latas con abrefácil, frutos secos, barritas: energía sin fuego ni nevera.' },
  { id: 'linterna', t: 'Linterna', ic: '🔦', kg: 0.2, esencial: true, por: 'Sin luz no se puede andar seguro de noche ni en un edificio a oscuras.' },
  { id: 'pilas', t: 'Pilas de repuesto', ic: '🔋', kg: 0.2, esencial: true, por: 'La linterna y la radio sin pilas no sirven.' },
  { id: 'radio', t: 'Radio de pilas o dinamo', ic: '📻', kg: 0.3, esencial: true, por: 'Si cae Internet, la radio sigue dando las instrucciones oficiales.' },
  { id: 'botiquin', t: 'Botiquín', ic: '🩹', kg: 0.5, esencial: true, por: 'Para las heridas pequeñas, que en una evacuación son muy frecuentes.' },
  { id: 'medicinas', t: 'Tus medicinas habituales', ic: '💊', kg: 0.1, esencial: true, por: 'Si tomas medicación, lleva para varios días y una copia de la receta.' },
  { id: 'documentos', t: 'DNI y documentos (copia)', ic: '🪪', kg: 0.1, esencial: true, por: 'Para identificarte, cobrar ayudas o pasar controles.' },
  { id: 'dinero', t: 'Dinero en efectivo', ic: '💶', kg: 0.05, esencial: true, por: 'Sin luz no funcionan las tarjetas ni los cajeros.' },
  { id: 'abrigo', t: 'Ropa de abrigo e impermeable', ic: '🧥', kg: 1, esencial: true, por: 'El frío y la lluvia agotan muy rápido.' },
  { id: 'manta', t: 'Manta térmica', ic: '✨', kg: 0.05, esencial: true, por: 'Pesa casi nada y conserva el calor del cuerpo.' },
  { id: 'cargador', t: 'Batería externa y cable', ic: '🔌', kg: 0.3, esencial: true, por: 'Para el móvil: llamar al 112 y tener esta app.' },
  { id: 'silbato', t: 'Silbato', ic: '📯', kg: 0.02, esencial: true, por: 'Se oye mucho más lejos que la voz y cansa menos.' },
  { id: 'navaja', t: 'Navaja multiusos', ic: '🔧', kg: 0.15, esencial: false, por: 'Muy útil, aunque no imprescindible.' },
  { id: 'higiene', t: 'Higiene básica y papel', ic: '🧻', kg: 0.4, esencial: false, por: 'Ayuda a evitar infecciones y a sentirse mejor.' },
  { id: 'mapa', t: 'Mapa en papel de la zona', ic: '🗺️', kg: 0.1, esencial: false, por: 'Por si el móvil se queda sin batería.' },
  { id: 'mascarillas', t: 'Mascarillas', ic: '😷', kg: 0.05, esencial: false, por: 'Para humo, polvo o un refugio con mucha gente.' },
  { id: 'cuerda', t: 'Cuerda (10 m)', ic: '🪢', kg: 0.3, esencial: false, por: 'Sirve para mil cosas, pero no es lo primero.' },
  // Lo que no conviene llevar
  { id: 'portatil', t: 'Ordenador portátil', ic: '💻', kg: 2, esencial: false, inutil: true, por: 'Pesa mucho y sin red ni enchufe no ayuda.' },
  { id: 'consola', t: 'Videoconsola', ic: '🎮', kg: 0.5, esencial: false, inutil: true, por: 'Gasta batería que necesitas para el móvil.' },
  { id: 'secador', t: 'Secador de pelo', ic: '💨', kg: 0.6, esencial: false, inutil: true, por: 'Sin electricidad no sirve.' },
  { id: 'libros', t: 'Tres libros gordos', ic: '📚', kg: 1.5, esencial: false, inutil: true, por: 'Uno pequeño entretiene; tres, pesan.' },
  { id: 'botellas', t: 'Refrescos en lata (6)', ic: '🥤', kg: 2.1, esencial: false, inutil: true, por: 'Mejor agua: pesa lo mismo y sirve para todo.' },
  { id: 'zapatos', t: 'Zapatos de vestir', ic: '👞', kg: 0.9, esencial: false, inutil: true, por: 'Para andar, el calzado cómodo que ya llevas puesto.' },
  { id: 'joyas', t: 'Joyero completo', ic: '💍', kg: 0.8, esencial: false, inutil: true, por: 'Lo de valor pequeño, sí; el joyero entero, no.' },
];

/* ---------------- Salva la despensa ----------------
   `util`: se guarda en la mochila deslizando el dedo por encima.
   `peligro`: hay que dejarlo pasar; si lo tocas, pierdes una vida. */
export const DESPENSA_UTIL = [
  { ic: '💧', t: 'agua', litros: 1 },
  { ic: '🥫', t: 'lata de conserva' },
  { ic: '🔋', t: 'pilas' },
  { ic: '🔦', t: 'linterna' },
  { ic: '🩹', t: 'botiquín' },
  { ic: '📻', t: 'radio' },
  { ic: '🍫', t: 'chocolate' },
  { ic: '🍚', t: 'arroz' },
  { ic: '🧻', t: 'papel higiénico' },
  { ic: '🕯️', t: 'vela' },
];
export const DESPENSA_PELIGRO = [
  { ic: '⚡', t: 'cable pelado', consejo: 'Un cable pelado no se toca: corta la luz en el cuadro antes de acercarte.' },
  { ic: '🍄', t: 'seta del campo', consejo: 'Nunca comas setas silvestres que no conozcas con total seguridad.' },
  { ic: '🦠', t: 'comida estropeada', consejo: 'Si una lata está hinchada o la comida huele mal, a la basura.' },
];
export const DESPENSA_CONSEJOS = [
  'Calcula unos 3 litros de agua por persona y día.',
  'Las pilas, mejor guardadas fuera del aparato y en un sitio seco.',
  'La comida de emergencia, la que coméis normalmente: así se va rotando y no caduca.',
  'Una linterna por persona evita sustos en un apagón.',
  'Revisa la despensa cada 6 meses y apunta las fechas de caducidad.',
];
