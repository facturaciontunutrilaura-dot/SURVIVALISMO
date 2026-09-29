# Contenidos pendientes de revisión profesional

Preparado en la fase 5. **Este documento NO revisa ni cambia ningún
contenido.** Identifica qué debe revisar un profesional antes de darlo por
validado, dónde está en el código y qué conviene comprobar.

Regla que se mantiene: **no se corrige ni se sustituye contenido sanitario o
técnico basándose solo en conocimiento general**. Cualquier cambio debe salir
de la revisión profesional, con su fuente.

## Cómo usar esta lista

- Cada fila indica el **archivo** y el **identificador** (`id`) del contenido,
  para localizarlo y cambiarlo sin tocar nada más.
- Al terminar una revisión, anotar: quién revisa (profesión), fecha, fuentes
  y cambios.
- Si hay que cambiar texto:
  1. Editar solo ese `id`.
  2. En el caso de infarto e ictus, cambiar también `revision: 'pendiente'` y
     actualizar la prueba unitaria que congela su texto.
  3. Pasar `npm test`.
- Prioridad: **A** = lo que se usa en una emergencia (SOS); **B** =
  preparación; **C** = formación y complementos.

## 1. Primeros auxilios — revisión por profesional sanitario (medicina, enfermería o emergencias)

| Prioridad | Contenido | Dónde | Estado actual | Qué comprobar |
|---|---|---|---|---|
| **A** | **Infarto: dolor torácico** | `data/content/art-tecnicas.js` · `pa-infarto` | **`revision: 'pendiente'`**, aviso «Ficha incompleta» visible, texto congelado por prueba | Completitud, signos de alarma, qué hacer y qué no hasta que llegue la ayuda, adecuación a las guías vigentes |
| **A** | **Ictus: reconocerlo y avisar** | `art-tecnicas.js` · `pa-ictus` | **`revision: 'pendiente'`**, igual que infarto | Escala de reconocimiento usada, tiempo, qué no hacer |
| **A** | RCP y desfibrilador (DEA) | `art-tecnicas.js` · `pa-rcp` (acceso SOS «Parada cardíaca») | Cita al ERC; sin marca de pendiente | Secuencia, frecuencia y profundidad, uso del DEA, niños y lactantes |
| **A** | Hemorragias y heridas | `art-tecnicas.js` · `pa-hemorragias` (acceso SOS «Hemorragia grave») | Cita fuentes; sin marca | Presión directa, torniquete: cuándo y cómo, lo que no se debe hacer |
| **A** | Atragantamiento (OVACE) | `art-tecnicas.js` · `pa-atragantamiento` (acceso SOS) | Sin marca | Maniobras en adulto, embarazada, obeso, niño y lactante |
| **A** | Resumen de 1–2 líneas de cada acceso sanitario de SOS | `data/content/emergencias.js` · `SOS_SANITARIAS` + `resumenSanitaria()` en `assets/js/app.js` | Se genera del artículo | Que el resumen no induzca a error cuando se lee aislado |
| B | PAS y valoración inicial | `art-tecnicas.js` · `pa-pas` | Sin marca | Orden de actuación, valoración de consciencia y respiración |
| B | Hipotermia, golpe de calor, quemaduras y congelaciones | `art-tecnicas.js` · `pa-termicas` | Sin marca | Medidas de enfriamiento y recalentamiento, lo que no se debe hacer |
| B | Fracturas, esguinces, picaduras e intoxicaciones | `art-tecnicas.js` · `pa-varios` | Sin marca | Inmovilización, mordeduras (incluye «qué no hacer»), intoxicaciones y el teléfono de toxicología |
| B | Botiquín: qué llevar | `art-tecnicas.js` · `pa-botiquin` y checklist `botiquin` (`data/content/checklists.js`) | Sin marca | Contenido, medicación y caducidades |
| B | Tarjetas SOS con consejos de salud: ola de calor, ola de frío, químico, radiológico, monóxido | `data/content/emergencias.js` · `ola-calor`, `ola-frio`, `quimico`, `radiologico` y el resto con pasos sanitarios | Sin marca | Que los pasos sanitarios sean correctos y no contradigan a la ficha de primeros auxilios |
| C | Curso «Primeros auxilios» (preguntas y respuestas) | `data/content/cursos.js` · `c06` | Sin marca | Que las respuestas marcadas como correctas lo sean |

## 2. Potabilización del agua — revisión técnica de salud pública o sanidad ambiental

| Prioridad | Contenido | Dónde | Qué comprobar |
|---|---|---|---|
| **A** | **Calculadora de cloración** (dosis de lejía por volumen) | `assets/js/calc.js` · `calc-cloro` | **Dosis y tiempos de contacto**, tipo de lejía («apta para desinfección de agua de bebida»), agua turbia |
| **A** | Potabilizar agua: hervir, cloro y filtros | `data/content/art-recursos.js` · `agua-tratar` | Tiempos de ebullición, dosis de cloro, limitaciones de filtros y pastillas |
| B | Encontrar agua en el campo | `art-recursos.js` · `agua-encontrar` | Riesgos de cada fuente |
| B | Cuánta agua necesito + calculadora | `art-recursos.js` · `agua-cuanta`, `calc.js` · `calc-agua` | Litros por persona y día según situación |
| C | Curso «Agua» | `cursos.js` · `c02` | Respuestas correctas |

## 3. Setas, plantas y alimento silvestre — revisión por especialista (micología, botánica o toxicología)

| Prioridad | Contenido | Dónde | Qué comprobar |
|---|---|---|---|
| **A** | Alimento silvestre: criterio y precauciones | `art-recursos.js` · `alim-silvestre` | Que la regla «si no lo identificas con certeza, no lo comas» prevalezca; ninguna indicación que anime a consumir |
| **A** | Plantas y animales peligrosos en España | `data/content/art-preparacion.js` · `bib-plantas` | Especies (p. ej., *Amanita phalloides*), síntomas y latencia, qué hacer |
| C | Curso «Bushcraft» (pregunta sobre setas) | `cursos.js` · `c08` | Respuesta correcta |

## 4. Alimentación y calorías — revisión por dietista-nutricionista

| Prioridad | Contenido | Dónde | Qué comprobar |
|---|---|---|---|
| B | Calculadora de reserva alimentaria (kcal según actividad: 2.000 / 2.700 / 3.800) | `assets/js/calc.js` · `calc-comida` | Necesidades energéticas por edad, sexo y actividad; hidratación; grupos con necesidades especiales |
| B | Calculadora de peso de mochila y energía («porcentaje de tu peso») | `calc.js` · `calc-mochila` | Límites de carga recomendados |
| B | Despensa de emergencia: qué almacenar | `art-recursos.js` · `alim-reserva` | Equilibrio, dietas especiales (celiaquía, diabetes, lactantes), rotación |
| B | Conservar y cocinar sin electricidad | `art-recursos.js` · `alim-sin-luz` | Seguridad alimentaria: conservación, cadena de frío, recalentado |
| C | Checklists con alimentación (Nivel 2, mochila…) | `data/content/checklists.js` | Cantidades orientativas |

## 5. Salud mental — revisión por profesional de psicología o psiquiatría

| Prioridad | Contenido | Dónde | Qué comprobar |
|---|---|---|---|
| **A** | Aviso del modo calma y recursos: 024 (conducta suicida) y 112 | `data/content/juegos.js` (texto del aviso) y pantalla Modo calma | Que el mensaje y los teléfonos sean correctos y estén al día; límites de las técnicas |
| B | Técnicas del modo calma: respiración 4-4-6, táctica 4-4-4-4, lenta 5-5, anclaje 5-4-3-2-1, versión infantil | `juegos.js` · `coherente`, `tactica`, `lenta`, `54321` y la infantil | Indicaciones y contraindicaciones (p. ej., en crisis de pánico, asma, embarazo), lenguaje |
| B | Tomar decisiones bajo presión | `art-tecnicas.js` · `psi-decisiones` | Enfoque y límites |
| B | Resistencia psicológica en crisis prolongadas | `art-tecnicas.js` · `psi-resistencia` | Enfoque, cuándo derivar a ayuda profesional |

## 6. Lo que NO es revisión clínica (pero conviene revisar aparte)

- Frecuencias de radio, planes de emergencia autonómicos y teléfonos: ya
  llevan su nivel de verificación y fecha. Revisión técnica, no sanitaria.
- Datos que escribe el usuario («Mis datos vitales»): la app no los
  interpreta ni los revisa. Solo se revisaría la redacción de las etiquetas.

## 7. Registro de revisiones

| Fecha | Contenido (`id`) | Revisado por (profesión) | Fuentes | Resultado / cambios |
|---|---|---|---|---|
| — | — | — | — | — |
