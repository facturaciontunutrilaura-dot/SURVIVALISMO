# Fase 3 — Auditoría UX/UI para uso en situaciones de estrés

Fecha: 29/09/2026 · Versión auditada: 1.5.0 (commit `a92cfc9`, fase 2 cerrada).
**Estado: diagnóstico. No se ha modificado código.** Pendiente de aprobación.

---

## 0. Método

- Revisión de todo el código de interfaz (`app.js`, `familia.js`, `maps.js`,
  `compass.js`, `juegos.js`, `audio.js`, `app.css`), README y auditoría general.
- La app se ejecutó en Chromium con cinco tamaños: **320×568, 375×667,
  390×844, 430×932 (táctiles) y 1280×800 (escritorio)**, recorriendo 20
  pantallas con el plan familiar de ejemplo cargado.
- Medición automática en cada pantalla y tamaño:
  - objetivos táctiles de menos de 44 px;
  - controles pegados (menos de 4 px);
  - texto de menos de 12 px;
  - contraste WCAG por elemento;
  - desplazamiento horizontal;
  - campos sin nombre accesible;
  - longitud de la página en pantallas;
  - tiempo de pintado.
- Repetición con **modo noche** y **contraste alto**, y recorrido con teclado.
- Revisión de código de todo lo que puede quedar activo en segundo plano:
  temporizadores, sensores, geolocalización, wake lock y bucles.
- Capturas revisadas a mano en 320 y 375 px.

Lo que ya está bien, y se mantiene:
- ninguna pantalla desborda en horizontal en ningún tamaño;
- sin errores de consola;
- pintado de cualquier pantalla entre 9 y 35 ms;
- barra inferior al alcance del pulgar;
- el SOS de la fase 2 cumple la regla de los 5 segundos en el modo normal.

---

## A–D. Problemas encontrados

Severidad: **crítica** (puede impedir actuar en una emergencia) · **alta**
(dificulta mucho una tarea importante o arriesga datos) · **media** (fricción
real y repetida) · **baja** (pulido).

### Críticos

| ID | Problema | Evidencia | Propuesta |
|---|---|---|---|
| **C1** | **En modo noche desaparecen de la pantalla la barra de navegación, la barra del 112 y los avisos.** El modo noche aplica `filter` al `<body>`, y un filtro hace que los elementos `position: fixed` se coloquen respecto al cuerpo y no a la pantalla. Esos elementos acaban al final de la página. | Medido a 375×667 en una ficha SOS. Modo normal: navegación en y=608 y barra del 112 en y=539. Modo noche: y=1864 y y=1795, fuera de la pantalla. Captura sin navegación ni 112. Afecta también a los avisos (*toasts*) y al indicador «sin conexión». | Quitar el `filter` del `<body>`. Conseguir el mismo oscurecimiento con una capa fija semitransparente que no capture toques (`pointer-events: none`), más la paleta nocturna que ya existe. Prueba E2E: en modo noche la navegación y el 112 quedan dentro de la pantalla. |

### Altos

| ID | Problema | Evidencia | Propuesta |
|---|---|---|---|
| **A1** | **Modo noche con muy poco contraste en textos secundarios.** Además, el «contraste alto» no mejora nada en modo noche. | Contraste mínimo de 2,25:1 en noche normal y de 2,16:1 en noche con contraste alto (antes del oscurecimiento extra del filtro). Afecta al subtítulo de las filas de protocolos, al progreso y los estados de los checklists, a los fragmentos del buscador y al subtítulo de la cabecera. Causa: el contraste alto no redefine `--dim2`, y el modo noche lo pisa. | Subir `--dim`/`--dim2` en modo noche hasta al menos 4,5:1 sin aclarar fondos. Hacer que «contraste alto» también actúe en modo noche. Prueba automática de contraste en los tres temas. |
| **A2** | **Borrados sin confirmación ni forma de deshacer.** | Un solo toque en un botón «✕» de 36 px borra: un contacto del plan familiar (`app.js:703`), un punto de encuentro alternativo (`familia.js:727`), un audio (`audio.js:124`, puede ser una grabación familiar irrecuperable), una frecuencia propia, una entrada del registro de radio, un punto del mapa y una capa importada. | Aviso con **«Deshacer»** durante unos 5 segundos, en lugar de más ventanas de confirmación. Evita el borrado accidental sin añadir diálogos. Botón de borrado de al menos 44 px y separado de la acción principal. |
| **A3** | **Checklists muy largos y difíciles de usar con el pulgar.** | *Nivel 2* ocupa 13,7 pantallas a 375 px: cada elemento lleva siempre un campo de fecha. Hay 238 controles de menos de 44 px (botones de estado de 34 px con texto de 10,6 px). Ni la fila ni el texto se pueden tocar. «Reiniciar este checklist» está arriba, junto al progreso. | La fecha se pliega y solo aparece si ya tiene valor o si se pulsa «📅 Caducidad». Tocar el texto del elemento marca o desmarca «tengo» (el estado principal); los otros tres estados quedan como botones secundarios de 44 px. Progreso más visible, con número grande y barra gruesa. «Reiniciar» pasa al final y con aviso de deshacer. |
| **A4** | **Mapa: los controles se comen la pantalla y los mensajes quedan ocultos.** No afecta a la lógica de teselas. | A 375×667 hay tres filas de botones (unos 250 px) antes del mapa. El mapa (62 % de la altura) acaba por debajo de la barra inferior, así que su borde y la atribución quedan tapados. El estado («sin teselas en esta zona…», «sin conexión») y el progreso de descarga se pintan **debajo** del mapa, fuera de la pantalla. Los botones de zoom miden 30×30 px. | Una sola fila de botones de 44 px con icono y texto corto. Altura del mapa calculada para no quedar bajo la navegación. Estado y progreso de descarga en una franja visible junto al mapa. Zoom de Leaflet a 44 px solo por CSS. Sin tocar teselas. |
| **A5** | **Audio sin control al salir de su pantalla, y descarga de teselas sin cancelar.** | La reproducción sigue sonando al cambiar de pantalla y ya no hay botón para pararla (`audio.js`; el elemento de audio queda fuera del DOM). El bucle de descarga de teselas (`maps.js:~592`) sigue haciendo peticiones al salir del mapa, sin forma de cancelarlo. Ambos gastan batería y, la descarga, también datos. | Audio: pararlo al salir. **Decisión tuya:** si prefieres que siga sonando (música en un apagón), la alternativa es un mini-reproductor fijo con «Parar». Descarga: botón «Cancelar» y parada al salir de la pantalla, conservando lo ya descargado. |
| **A6** | **El modo calma queda escondido en móviles pequeños**, justo cuando más falta hace. | A 320 px la pestaña «🧘 Modo calma» queda fuera de la pantalla (las pestañas de Juegos se desplazan en horizontal y «Reto» aparece cortado). Al entrar por el enlace «Modo calma», antes del ejercicio hay un bloque informativo de unos 470 px. | Pestañas de Juegos en rejilla, como las de SOS. Cuando se entra por `#/sec/juegos/calma`, el ejercicio de respiración aparece primero y el texto informativo, después. |

### Medios

| ID | Problema | Evidencia | Propuesta |
|---|---|---|---|
| **M1** | **El título se repite en cada pantalla.** La cabecera fija lleva el título y justo debajo hay un H1 igual. | Unos 90 px repetidos en todas las pantallas (el 16 % de un móvil de 568 px): «CENTRO FAMILIAR» / «CENTRO FAMILIAR», «CONFIGURACIÓN» / «CONFIGURACIÓN»… | Dejar un solo título: el H1 de la página, con la cabecera compacta (volver, título pequeño y buscar). |
| **M2** | **La portada no jerarquiza.** Hay 27 tarjetas del mismo peso (3,3 pantallas) y mezcla herramientas, temas del manual, contenido personal y utilidades. «Riesgos 2036» ocupa la primera fila, por delante de Mapa, Brújula o Primeros auxilios. «Familia» y «Plan familiar» son dos tarjetas con el mismo icono. La tarjeta dice «EMERGENCIA» y la barra inferior dice «SOS». | Capturas de portada a 375 y 1280 px. | Sin dashboard, cuatro bloques con títulos: 1) **SOS** (tarjeta roja con el mismo nombre que en la barra) y buscador; 2) **Mi plan y herramientas** (Familia, que absorbe Plan familiar, Mapa, Brújula, Checklists, Calculadoras, Radio); 3) **Manual**, los temas en lista compacta de dos columnas; 4) **Más**: Riesgos, Juegos y calma, Audio, Fuentes, Configuración. No se elimina ninguna sección. |
| **M3** | **El botón «←» no vuelve atrás: siempre va a una pantalla fija.** | Buscar → resultado → «←» lleva a la sección del artículo, no a los resultados. El botón atrás del sistema sí funciona. Al volver a un listado largo se pierde la posición (`scrollTo(0,0)` en cada pantalla). | «←» usa el historial cuando hay una pantalla anterior de la app y la ruta fija como respaldo. Se recuerda la posición de desplazamiento por pantalla. |
| **M4** | **Formularios sin etiqueta asociada** (lector de pantalla) y etiquetas de 11,2 px con contraste de 4,46:1. | 60 campos sin nombre accesible: plan familiar (14), calculadoras (28), configuración y sincronización (9), comunicaciones (9), fechas de riesgos (2) y el selector del modo calma. | Una pequeña función en `ui.js` que genere pares etiqueta/campo con `for`/`id` únicos. Etiquetas a 12,5 px o más con contraste AA. |
| **M5** | **Textos demasiado pequeños o por debajo de AA en el tema normal.** | Por debajo de 12 px: descripciones de la portada (11,2), subtítulos de cabecera (10,6), insignias (9,9) y el lema de la portada (9). Contraste de `--dim2` sobre panel de 4,36:1 (AA pide 4,5:1) en subtítulos de filas, resúmenes y pistas. | Mínimo de 12 px para texto informativo y 11 px solo para insignias en mayúsculas. Ajustar `--dim2` hasta al menos 4,6:1. |
| **M6** | **Acciones importantes con botones de 36 px** (`.btn.sm`). | 36 px de alto: «📍 Mi posición para dar al 112» (SOS), «Obtener coordenadas» (brújula), «Usar mi posición» (calculadoras), «Cambiar» estado familiar, accesos del centro familiar, «Ver referencias», búsquedas frecuentes y teléfonos de la tabla de rutas (25×15 px). | 44 px como mínimo para toda acción de uso en campo. El tamaño de 36 px solo para acciones terciarias en escritorio. Teléfonos de la tabla como botones de llamada completos. |
| **M7** | **El 112 no está al alcance del pulgar en la lista SOS.** En las fichas hay barra inferior fija, pero en la lista el 112 solo está arriba. | En un móvil grande (430×932) el botón queda en la zona de alcance difícil. Coherencia: en SOS el 112 debería estar siempre en el mismo sitio. | Mostrar la barra fija del 112 en **todas** las pantallas SOS, incluida la lista. Se mantiene el botón grande de arriba. No se añaden barras en otras secciones. |
| **M8** | **Centro familiar: no está claro qué es obligatorio, qué es opcional ni cuándo se guarda.** El guardado es automático y no da ninguna señal. | Once campos por ubicación sin distinguir; solo algunos cambios muestran aviso. «❤️ Quiero llegar a mi familia» se ve como texto subrayado (un enlace dentro de un botón). | Marcar «(opcional)» en todo menos nombre, papel y provincia. Indicador discreto «✓ Guardado» junto a lo editado. Una línea arriba con los pasos: 1 casa, 2 familia, 3 rutas. Quitar el subrayado del botón. |
| **M9** | **Avisos (toasts) cortos y encima del 112.** | Duran 2,6 s sea cual sea la longitud. En SOS aparecen justo sobre la barra del 112 (`bottom: 80px`). No distinguen éxito de error. | Duración según la longitud (mínimo 3 s y 6 s en errores). Colocarlos por encima de la barra del 112 cuando exista. Icono ✓ / ⚠ según el tipo. |

### Bajos

| ID | Problema | Evidencia | Propuesta |
|---|---|---|---|
| **B1** | El foco con teclado usa el contorno por defecto del navegador, poco visible sobre el fondo verde oscuro. La regla `select { outline }` se aplica siempre, no solo con foco. | Recorrido con Tab en portada y checklists. | `:focus-visible` común con contorno de 3 px y color de acento; corregir la regla de `select`. |
| **B2** | En listados, la prioridad (crítico, importante…) solo se comunica con el color de la franja izquierda. | Filas de secciones y del manual. | Añadir una marca de texto o icono solo en «crítico» para no recargar. |
| **B3** | Buscador: la «×» para limpiar es la nativa y no aparece igual en todos los navegadores. Las búsquedas frecuentes son botones de 36 px. | Captura del buscador a 375 px. | Botón «Limpiar» propio de 44 px que devuelve el foco al campo. Chips a 44 px. El resto del buscador está bien y no se toca su lógica. |
| **B4** | Configuración ocupa 6 pantallas; la sincronización (opcional y técnica) ocupa el centro. | Captura de configuración. | Plegar «Sincronización» por defecto si no está configurada. |

---

## Modo oscuro / poca luz: decisión

- La app **ya es oscura por defecto** y tiene **modo noche**. No hace falta
  crear un modo oscuro.
- El modo noche **existe pero está roto** (C1) y **se lee mal** (A1). Arreglarlo
  es prioritario porque es justo el modo de las emergencias nocturnas.
- **Modo claro / exterior a pleno sol: no lo implemento.** Un tema oscuro con
  contraste medio se lee peor al sol, pero la opción «Contraste alto» ya da
  texto blanco sobre fondo oscuro (5,3:1 mínimo medido). Tras corregir A1 y M5
  cubre ese caso sin mantener un tercer tema. Se reevaluará si las pruebas en
  exterior con móvil real lo piden.

## Batería: revisión de procesos activos

| Proceso | Estado |
|---|---|
| Temporizador y wake lock del modo calma | Correcto (corregido y probado en la fase 2) |
| Wake lock de SOS | Correcto: se libera al salir (probado) |
| Sensores de la brújula | Correcto: se retiran al salir |
| Mapas de Leaflet | Correcto: se destruyen al salir |
| Geolocalización | Correcto: solo peticiones puntuales, sin seguimiento continuo |
| Sincronización automática | Correcta: solo al abrir la app y al recuperar la conexión, y únicamente si el usuario la configuró |
| **Reproducción de audio** | **Problema (A5)**: sigue sonando al salir y no hay forma de pararla |
| **Descarga de teselas** | **Problema (A5)**: sigue al salir y no se puede cancelar |

---

## E. Qué NO merece la pena cambiar

- **La lógica del buscador:** las pruebas de relevancia la cubren y no se ha
  encontrado ningún fallo. Solo se retoca su presentación (B3).
- **El contenido y la estructura de las fichas SOS y de los protocolos.** Los
  pasos numerados, la tarjeta rápida y las pestañas en rejilla funcionan. Solo
  se ganan los píxeles de M1 y M7.
- **La barra de navegación inferior de cinco destinos:** está bien situada y
  tiene el tamaño correcto (58 px).
- **Transiciones y animaciones:** no se añaden. Hoy no hay ninguna que moleste.
- **Rendimiento percibido:** 9–35 ms por pantalla. No hay nada que optimizar.
- **Tema claro:** ver la decisión anterior.
- **Iconos SVG propios** en lugar de emojis (C3 de la auditoría general):
  mejoraría la coherencia visual, pero es una fase estética y no resuelve
  ningún problema de uso bajo estrés. Se pospone.
- **Mapas:** ningún cambio en teselas, fuentes ni descarga, salvo la UX de A4 y
  la cancelación de A5.
- **Barras flotantes nuevas:** solo se extiende la del 112 dentro de SOS (M7).

---

## F. Orden recomendado de implementación

Cada bloque termina con: `npm test` completo, capturas a 320/375/430/escritorio,
consola sin errores y, cuando aplique, prueba sin conexión. Los bloques se
pueden aprobar por separado.

| Bloque | Contenido | Por qué en este orden | Tamaño |
|---|---|---|---|
| 1 | **C1** (modo noche con elementos fijos) + **A1** (contraste en modo noche) | Hoy el modo noche deja SOS sin 112 fijo ni navegación | Pequeño |
| 2 | **A2** (deshacer borrados) + **M9** (avisos) | Protege datos que no se pueden recuperar; el mecanismo de «Deshacer» usa los avisos | Medio |
| 3 | **A5** (audio y descarga de teselas) | Batería y datos | Pequeño |
| 4 | **A3** (checklists) | La pantalla más larga y con más toques | Medio |
| 5 | **M7** (112 fijo en toda SOS) + **M6** (objetivos de 44 px) + **B1** (foco) | Uso con una mano en todas partes | Pequeño |
| 6 | **A4** (UX del mapa) + **A6** (modo calma y pestañas de Juegos) | Acciones escondidas | Medio |
| 7 | **M1** (título duplicado) + **M3** (volver y posición) | Afecta a todas las pantallas | Medio |
| 8 | **M2** (portada por bloques) | Cambio visible más grande; mejor con lo anterior ya asentado | Medio |
| 9 | **M8** (centro familiar) + **M4**/**M5** (etiquetas y tamaños) + **B2**–**B4** | Pulido y accesibilidad | Medio |

**Pruebas nuevas previstas:**
- elementos fijos dentro de la pantalla en los tres temas;
- contraste mínimo por tema en las pantallas clave;
- deshacer un borrado y borrar sin deshacer;
- que la descarga de teselas se detiene al salir (con el servidor simulado);
- que el audio se detiene al salir;
- objetivos táctiles de al menos 44 px en SOS, checklists y mapa;
- «←» vuelve a los resultados de búsqueda;
- ningún campo sin nombre accesible.

## Preguntas para ti

1. **Audio (A5):** ¿se para al salir de la pantalla, o sigue sonando con un
   mini-reproductor fijo para pararlo?
2. **Portada (M2):** ¿te parece bien el reparto en cuatro bloques y que
   «Plan familiar» deje de tener tarjeta propia (seguiría accesible desde
   Familia)?
3. **Nombre:** la app se presenta como «SURVIVAL OFFLINE» y tú la llamas
   «SUPERVIVENCIA». ¿Cambio el nombre visible? No lo toco sin tu decisión.
