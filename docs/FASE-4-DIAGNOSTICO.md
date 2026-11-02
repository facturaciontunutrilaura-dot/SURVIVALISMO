# FASE 4 — DIAGNÓSTICO Y PROPUESTA

Fecha: 29/09/2026 · Versión analizada: **1.5.0** (tras el cierre de la fase 3,
commit `94a6ae3`).
Estado de este documento: **propuesta pendiente de aprobación. No se ha
modificado código.**

Fuentes revisadas:
- `README.md`, `docs/AUDITORIA.md` (diagnóstico y roadmap originales) y
  `docs/FASE-3-UX.md`.
- Código de `public/` y las tres suites de `tools/`.
- Dos comprobaciones de solo lectura, con un script temporal ya borrado: qué
  pasa si falla IndexedDB y qué pasa si falla `localStorage`.

Leyenda de prioridad (técnica, por tarea; no es una nota de la aplicación):
- **P0 — Crítico:** puede afectar a la seguridad, al funcionamiento esencial,
  a la accesibilidad de forma grave o al uso durante una emergencia.
- **P1 — Importante:** afecta de forma significativa a la experiencia o a la
  fiabilidad.
- **P2 — Mejora:** útil, pero no imprescindible.

---

## 1. Estado de la aplicación después de la fase 3

### Lo que está resuelto y cubierto por pruebas (349/349)

| Área | Estado |
|---|---|
| **SOS** | Botón `tel:112`, barra fija del 112 y cinco accesos sanitarios que reutilizan artículos existentes. Protocolos agrupados, pestañas accesibles, pantalla encendida y «mi posición para el 112». |
| **Búsqueda** | Normalización, raíces, palabras vacías, sinónimos, ranking, filtros y la consulta guardada en la URL. |
| **Offline** | Precache generado desde un manifiesto único y versión única. Navegación «caché primero», con prueba de hosting caído. Prueba offline real. |
| **Ciclo de vida** | Mapas, sensores, temporizadores, audio, descargas y wake lock se limpian al salir de cada vista. Hay prueba instrumentada de batería. |
| **Datos** | Copia de seguridad con el plan familiar (`kv`). «Deshacer» en los borrados. Sincronización opcional con Supabase (47 pruebas: conflictos, borrados, diagnóstico). |
| **UX bajo estrés** | Modo noche sin elementos fuera de pantalla y con contraste AA. Controles de 44 px, checklists para el pulgar, portada en cuatro bloques y «←» con historial real. |
| **Accesibilidad** | Etiquetas asociadas, foco visible, textos de al menos 11 px, pestañas con flechas y lo crítico indicado también con texto. |
| **Mapas** | Capas WMTS del IGN, vectorial de respaldo, descarga cancelable y limpieza al salir. **Solo probado con servidor simulado.** |

### Comprobación nueva hecha para este diagnóstico: fallo de almacenamiento

Se simuló un navegador en el que IndexedDB no se puede abrir (modo privado de
algunos navegadores, almacenamiento bloqueado o dañado) y otro en el que
`localStorage` lanza error.

| Pantalla | IndexedDB no disponible | `localStorage` no disponible |
|---|---|---|
| Portada, SOS, fichas, búsqueda, modo calma | ✅ Funcionan (con 112) | ✅ Funcionan |
| Checklist | ❌ Pantalla «Error» con el texto técnico «bloqueado» | ✅ |
| Centro familiar | ❌ «Error · bloqueado» | ✅ |
| Mapa (incluido el vectorial, que no necesita IndexedDB) | ❌ «Error · bloqueado» | ✅ |
| Configuración (donde está el diagnóstico) | ❌ «Error · bloqueado» | ❌ «Error · denied» |
| Consola | — | Error no capturado en cada navegación (`setSetting('lastRoute')`) |

Lo esencial (SOS y 112) resiste. Pero lo demás falla con un mensaje técnico,
sin explicar qué pasa ni qué hacer.

---

## 2. Problemas pendientes

Se separan en cuatro tipos, como se pidió. Cada problema incluye su evidencia.

### 2.1 Problemas reales detectados (verificados en el código o reproducidos)

| ID | Problema | Evidencia | Prioridad |
|---|---|---|---|
| **R1** | **Una actualización con red inestable puede dejar la app incompleta sin conexión.** Al instalar una versión nueva, el Service Worker ignora los recursos que fallan (`cache.add(...).catch(warn)`). Aun así, la instalación se da por buena. Después, `activate` borra la caché anterior, que sí estaba completa. Si el archivo que falló es un módulo JS o un contenido, esa parte deja de funcionar offline. Nadie avisa: el usuario lo descubre en la emergencia. | `public/sw.js`, líneas 21–47 | **P0** |
| **R2** | **Se mezclan versiones a mitad de uso.** `skipWaiting()` y `clients.claim()` activan la versión nueva mientras la página sigue abierta con los módulos antiguos. Los módulos que se cargan después (mapa, familia, sync, juegos) llegan ya de la versión nueva. No hay aviso de «versión nueva disponible». Ya estaba identificado (AUDITORIA §1.5, E2) y sigue pendiente. | `sw.js:34`, `sw.js:44`; no existe `updatefound` ni `controllerchange` en `app.js` | **P1** |
| **R3** | **Si falla el almacenamiento, las pantallas no esenciales se quedan en «Error» con un texto técnico.** Configuración, la pantalla que serviría para diagnosticarlo, también falla. El mapa vectorial no necesita IndexedDB y aun así no se muestra. | §1, tabla anterior | **P1** |
| **R4** | **La nota de privacidad de la app no es exacta cuando la sincronización está activa.** Configuración dice «no envía ningún dato a ningún servidor» y el Plan familiar dice «No se envía a ningún servidor». Con la sincronización opcional configurada, contactos, información médica, ubicaciones y checklists sí se suben al proyecto Supabase del propio usuario. El texto debe ser condicional. No es un fallo de seguridad técnica, pero es una afirmación falsa sobre datos sensibles. | `app.js:828`, `app.js:1216`; `store.js` `SYNC_STORES` | **P1** |
| **R5** | **La importación de copias no valida ni es atómica.** Solo comprueba `data.app`. Escribe fila a fila sin validar la forma, así que un archivo dañado a medias deja datos parciales. No muestra qué se va a fusionar. Además, vuelve a marcar `_upd` en todo, lo que fuerza a subir todo en la siguiente sincronización (AUDITORIA §1.4). | `store.js`, `importAll` | **P1** |
| **R6** | **Las marcas de los checklists se guardan por posición** (`lista::grupo::índice`). Si se edita o reordena un checklist, las marcas pasan en silencio a otro elemento: la app diría «tengo X» cuando se marcó otra cosa. Hoy no ocurre porque el contenido no cambia, pero es un riesgo latente. | `app.js:622`, `app.js:678`; documentado en AUDITORIA §1.4 | **P2** (pasa a **P1** antes de editar cualquier checklist) |
| **R7** | **Las pantallas de «No encontrado» y «Error» solo ofrecen «Volver al inicio».** No hay acceso directo a SOS ni al 112 (queda el SOS de la barra inferior) y se muestran mensajes técnicos. | `app.js:1457` (`v404`), `app.js` (`catch` del router) | **P2** |
| **R8** | **Algunas vistas no tienen H1**: Buscar, Mapa, Rutas, Reunificación, Mapa familiar y Plan 72 h. El título del `topbar` es un `div`. Al cambiar de vista tampoco se mueve el foco ni se anuncia la vista nueva (AUDITORIA G4, pendiente). Con lector de pantalla, cuesta orientarse. | `ui.js:59` (`topbar`), `render()` en `app.js:29` | **P2** |
| **R9** | **La página de primera visita sin conexión muestra el nombre antiguo** «SURVIVAL OFFLINE» en lugar de SUPERVIVENCIA. | `sw.js`, respuesta 503 de navegación | **P2** (requiere tocar `sw.js`: se hará dentro del bloque de R1/R2 si se aprueba) |

### 2.2 Documentación desactualizada (no afecta al funcionamiento)

| ID | Qué | Dónde | Prioridad |
|---|---|---|---|
| **D-1** | Dice que el modo noche usa un «filtro de brillo y saturación». Ese filtro se quitó en la fase 3, porque sacaba de pantalla la navegación y el 112. | README §9 | P2 |
| **D-2** | La lista de lo que contiene la copia de seguridad no menciona el plan familiar (`kv`), que ya se exporta. | README §8 | P2 |
| **D-3** | «Local-first absoluto. Ninguna petición sale de la app salvo dos» y «no hay backend» no reflejan la sincronización opcional (misma causa que R4). | README §8 y §10 | P1 (junto con R4) |

### 2.3 Tareas pendientes ya documentadas (en `AUDITORIA.md`, roadmap original)

El roadmap original reservaba la **fase 4 para «Offline»** (E1–E5). Se ha
comprobado qué queda de cada punto:

| ID original | Qué | Estado actual | Prioridad propuesta |
|---|---|---|---|
| E1 | Indicador «✔ Lista sin conexión / ⚠ incompleta» | **Pendiente.** Configuración muestra cuántos archivos hay en caché, pero no los compara con el manifiesto. | **P1** (es la otra mitad de R1) |
| E2 | Aviso de versión nueva | **Pendiente** (= R2) | P1 |
| E3 | Pedir almacenamiento persistente de forma automática | **Parcial:** se pide al pulsar un botón en Configuración, al descargar teselas y al guardar audio. No se pide tras rellenar el plan familiar. | P1 |
| E4 | Aviso de copia de seguridad antigua | **Pendiente.** No se guarda la fecha de la última exportación. | P1 |
| E5 | Botón «Instalar app» e instrucciones para iOS | **Pendiente.** No hay `beforeinstallprompt`. Según el README §5, iOS puede borrar los datos de una web no instalada tras semanas sin uso: afecta al plan familiar. | P1 |
| S5 / D1 | Datos vitales propios (información médica, contacto externo, punto de encuentro) accesibles desde SOS | **Pendiente.** La información médica se escribe en el Plan familiar (`k-medico`), pero SOS no la muestra. Son datos del usuario, no contenido médico nuevo. | **P1** |
| B7 | «Prepara tu app en N pasos» | **Pendiente.** Se propone resolverlo con el mismo panel que E1/E3/E4/E5, sin crear un asistente aparte. | P1 |
| H6 | Integración continua (GitHub Actions con `npm test`) | **Pendiente.** No existe `.github/`. | P2 |
| M4 | «Capa importada. Recarga el mapa para verla.» | **Pendiente** (`maps.js:681`) | Fuera de la fase 4 (ver §8) |
| M5, M7, D4, F4, E6 | Mapa familiar con teselas; puntos editables e «ir a punto»; gestor de áreas descargadas; descarga concurrente; cuota de teselas | **Pendientes** | Fuera de la fase 4 (ver §8) |
| C1–C6 | Sistema visual (escala tipográfica, iconos SVG, componentes, esqueletos de carga) | **Pendiente.** No es un fallo. | Fuera de la fase 4 |
| H2, F2, F3 | Dividir `app.js` (81 KB), carga diferida del contenido, caché compartida de GeoJSON | **Pendiente.** No hay problema medido: el arranque sigue por debajo de 100 ms. | Fuera de la fase 4 |
| D2, D3, D5, D6 | Linterna/señales, cuaderno de bitácora, caducidades en portada, exportar GPX | **Pendientes.** Son funcionalidades nuevas. | Fuera de la fase 4 |

### 2.4 Posibles mejoras futuras que no son necesarias ahora

- Paquetes de teselas compartibles, lectura en voz alta de los pasos y SMS
  prerredactado con la posición (AUDITORIA §2.I).
- Sincronización cifrada de extremo a extremo (README §12).
- Esqueletos de carga. Offline, las vistas aparecen en decenas de
  milisegundos, así que el beneficio sería pequeño. Solo se justificaría si en
  un móvil de gama baja se ve un retraso real (se puede anotar durante la
  verificación en dispositivo).

No se proponen para la fase 4.

---

## 3. Mejoras propuestas

Solo se incluyen las que resuelven un problema de §2.1 o una tarea ya
documentada de §2.3 con prioridad P0/P1, más tres P2 baratas y de bajo riesgo.
**No se añade ninguna funcionalidad nueva que no estuviera ya identificada.**

| Mejora | Resuelve | Prioridad |
|---|---|---|
| Actualización segura del Service Worker: no dar la versión nueva por instalada si falta algún recurso y no borrar la caché anterior hasta tener la nueva completa | R1 | **P0** |
| Aviso «Hay una versión nueva — Actualizar», que se aplica al pulsarlo o en el siguiente arranque, nunca a mitad de uso | R2, E2 | P1 |
| Panel «¿Está lista tu app?» con estado real y acción en cada punto: recursos offline completos (con «Reparar»), almacenamiento persistente, instalada, fecha de la última copia | E1, E3, E4, E5, B7 | P1 |
| Modo degradado si falla el almacenamiento: mensaje claro, lo que sigue funcionando, SOS/112 a la vista, Configuración accesible y mapa vectorial disponible | R3 | P1 |
| Textos de privacidad condicionales al estado de la sincronización | R4, D-3 | P1 |
| Importación validada antes de escribir, con resumen previo y sin marcar todo como modificado | R5 | P1 |
| «Mis datos vitales» en SOS (solo lo que el usuario escribió; si no hay nada, un enlace para rellenarlo) | S5 / D1 | P1 |
| Identificadores estables en los checklists, con migración de las marcas existentes | R6 | P2 |
| Error y 404 con acceso a SOS/112 y mensaje comprensible; H1 en todas las vistas y foco al título al navegar | R7, R8 | P2 |
| Documentación al día; CI con `npm test` | D-1, D-2, H6 | P2 |

---

## 4. Priorización

| Prioridad | Tareas |
|---|---|
| **P0** | R1 — Actualización del Service Worker que puede romper el modo offline sin aviso |
| **P1** | R2/E2 aviso de versión · E1/E3/E4/E5/B7 panel de preparación · R3 modo degradado de almacenamiento · R4/D-3 privacidad exacta · R5 importación segura · S5/D1 datos vitales en SOS |
| **P2** | R6 checklists con identificadores estables · R7/R8 errores y accesibilidad de navegación · R9 nombre en la página offline · D-1/D-2 documentación · H6 CI |

Por qué solo R1 es P0: es el único punto que puede **eliminar en silencio** una
función que el usuario cree tener justo cuando no hay red. El resto, o bien
avisa (R3 falla a la vista, sin corromper nada), o bien afecta a la
comodidad y la claridad y no al acceso a SOS/112.

---

## 5. Dependencias

```
R1 (SW seguro) ──► R2 (aviso de versión) ──► Panel de preparación (usa el mismo recuento de recursos)
                                                  ▲
R5 (importación) ── guarda la fecha de copia ─────┘   (E4 necesita la fecha de la última exportación)

R3 (modo degradado) ── independiente (store.js / router)
R4 (privacidad)     ── independiente (texto condicional a sync.cfg())
S5/D1 (datos vitales en SOS) ── depende de R3 (con IndexedDB caído, SOS no debe romperse al leer datos)
R6 (checklists)     ── independiente; OBLIGATORIO antes de cualquier edición de checklists
R7/R8 (errores y H1)── después de R3 (comparten la pantalla de error)
H6 (CI)             ── independiente; conviene al principio para vigilar el resto
```

Dependencias externas:
- **R1 y R2 tocan `sw.js`.** En fases anteriores se pidió no modificar el
  Service Worker sin aprobación explícita. **Aprobar el bloque 1 implica
  aprobar ese cambio.** Los nombres de caché, la estrategia caché-primero y la
  arquitectura de sincronización no cambian.
- **R3 toca la apertura del almacenamiento en `maps.js`** para que el
  vectorial funcione sin IndexedDB. No cambia la lógica de teselas del IGN
  (proveedor, plantillas, descarga).

---

## 6. Pruebas necesarias

Todas nuevas en `tools/test.mjs`, salvo que se indique otra cosa. La suite
actual (349) debe seguir en verde.

| Tarea | Prueba automática | ¿Dispositivo físico? |
|---|---|---|
| R1 | Versión N instalada; se sirve N+1 con un recurso que responde 500. Resultado esperado: la N sigue activa, sin conexión funciona todo y la caché de N no se borra. Repetir con todos los recursos bien: se instala N+1. | Sí, para confirmar: actualización real en Android e iOS con red mala (modo avión a mitad) |
| R2 | Con la página abierta se publica una versión nueva: aparece el aviso, no se cambian módulos hasta pulsar y, tras pulsar, carga la N+1 completa. | Sí (iOS gestiona las actualizaciones de las PWA instaladas de otra forma) |
| Panel de preparación | Con la caché completa muestra ✔. Tras borrar un recurso muestra ⚠ y «Reparar» lo vuelve a descargar. Muestra el estado de persistencia y la fecha de la última copia; sin copia, avisa. | Sí: instalación real, `persist()` concedido o no, instrucciones de iOS |
| R3 | La comprobación de §1 como prueba permanente. Con IndexedDB caído, ninguna vista muestra el mensaje técnico, Configuración abre, el mapa vectorial se ve y SOS/112 siguen. Con `localStorage` caído, no hay errores no capturados. | No |
| R4 | Sin sincronización, el texto dice «solo en este dispositivo». Con sincronización configurada, el texto indica qué se sube y a dónde. | No |
| R5 | Un archivo con una fila inválida no escribe nada y explica el error. Un archivo válido muestra el resumen antes de fusionar. Tras importar, la siguiente sincronización no lo sube todo (prueba en `test-sync.mjs`). | No |
| S5/D1 | Con información médica y contacto externo rellenos, SOS los muestra. Vacíos, muestra un enlace para rellenarlos. Con IndexedDB caído, SOS sigue igual que hoy. | No |
| R6 | Las marcas guardadas con índice se migran a identificadores. Reordenar un checklist en una copia de prueba no mueve las marcas. | No |
| R7/R8 | Toda vista tiene un H1. Al navegar, el foco va al título. Error y 404 ofrecen SOS/112. | Sí, recomendable: TalkBack y VoiceOver |
| H6 | La propia CI ejecuta `npm test` en cada push. | No |

---

## 7. Propuesta de bloques de fase 4

Tema de la fase: **fiabilidad sin conexión y recuperación ante fallos**. Es
coherente con la fase 4 «Offline» del roadmap original, ampliada con los
problemas reales detectados después.

### Bloque 1 — Actualización segura del Service Worker · **P0**

| Campo | Detalle |
|---|---|
| Objetivo | Que una actualización nunca deje la app peor de lo que estaba y que no se apliquen versiones a mitad de uso. |
| Problema que resuelve | R1, R2 (y R9 de paso) |
| Archivos | `public/sw.js`, `public/assets/js/app.js` (registro y aviso), `public/assets/css/app.css` (aviso), `tools/test.mjs`, `README.md` §3 |
| Pruebas | R1 y R2 de §6 |
| Dependencias | Ninguna. Requiere **aprobación explícita para modificar `sw.js`**. |
| Dispositivo físico | Sí, para validar actualizaciones reales en Android e iOS (la lógica se prueba aquí) |
| Revisión clínica | No |

### Bloque 2 — Panel «¿Está lista tu app?» · **P1**

| Campo | Detalle |
|---|---|
| Objetivo | Que el usuario sepa **antes** de la emergencia si la app funcionará sin red y si sus datos están a salvo. Cada punto debe tener una acción. |
| Problema que resuelve | E1, E3, E4, E5, B7 |
| Contenido | 1) Recursos offline completos o «Reparar». 2) Almacenamiento persistente, con solicitud automática la primera vez que se guarda algo del plan familiar. 3) App instalada: botón en Android e instrucciones en iOS. 4) Última copia de seguridad y aviso si hay cambios posteriores o tiene más de 30 días. En Configuración y como línea discreta en portada **solo si algo falla**; la portada no crece cuando todo está bien. |
| Archivos | `app.js` (Configuración y portada), `store.js` (fecha de exportación), `public/data/content/index.js` (textos), CSS, `tools/test.mjs` |
| Pruebas | «Panel de preparación» de §6 |
| Dependencias | Bloque 1 (mismo recuento de recursos) y bloque 4 (fecha de la copia) |
| Dispositivo físico | Sí, para la instalación y `persist()` reales |
| Revisión clínica | No |

### Bloque 3 — Modo degradado ante fallos de almacenamiento · **P1**

| Campo | Detalle |
|---|---|
| Objetivo | Si el navegador no deja guardar datos, la app lo dice en lenguaje claro, sigue ofreciendo todo lo que no depende de guardar y nunca muestra un error técnico. |
| Problema que resuelve | R3 |
| Archivos | `store.js` (estado «almacenamiento no disponible» y `setSetting` protegido), `app.js` (router y vistas de checklist y Configuración), `maps.js` (el vectorial sin IndexedDB; **sin cambios en la lógica IGN**), `familia.js`, `tools/test.mjs` |
| Pruebas | R3 de §6 |
| Dependencias | Ninguna |
| Dispositivo físico | No (recomendable probar el modo privado de Safari y Firefox) |
| Revisión clínica | No |

### Bloque 4 — Copias de seguridad fiables · **P1**

| Campo | Detalle |
|---|---|
| Objetivo | Que restaurar una copia nunca deje datos a medias y que el usuario vea qué va a entrar antes de confirmar. |
| Problema que resuelve | R5; aporta la fecha de exportación que necesita el bloque 2 |
| Archivos | `store.js` (`importAll`, `exportAll`), `app.js` (Configuración), `tools/test.mjs`, `tools/test-sync.mjs`, `README.md` §8 |
| Pruebas | R5 de §6 |
| Dependencias | Ninguna |
| Dispositivo físico | No (recomendable: importar un archivo desde «Archivos» de iOS) |
| Revisión clínica | No |

### Bloque 5 — Privacidad exacta · **P1**

| Campo | Detalle |
|---|---|
| Objetivo | Que lo que la app afirma sobre los datos sea verdad en todos los casos. |
| Problema que resuelve | R4, D-3 |
| Archivos | `app.js` (Plan familiar y Privacidad en Configuración), `README.md` §8 y §10, `store.js` (comentario de cabecera) |
| Pruebas | R4 de §6 |
| Dependencias | Ninguna. **No cambia la arquitectura de sincronización.** |
| Dispositivo físico | No |
| Revisión clínica | No |

### Bloque 6 — «Mis datos vitales» en SOS · **P1**

| Campo | Detalle |
|---|---|
| Objetivo | En una emergencia, tener a un toque desde SOS lo que el usuario ya apuntó: información médica, contacto externo y punto de encuentro. |
| Problema que resuelve | S5 / D1 (roadmap original) |
| Límite | Solo muestra datos escritos por el usuario. **No añade contenido médico ni recomendaciones.** Si no hay nada, enlaza a donde se rellena. No sustituye al 112 ni lo desplaza: el 112 sigue siendo lo primero. |
| Archivos | `app.js` (lista SOS y lectura del plan), CSS, `tools/test.mjs` |
| Pruebas | S5/D1 de §6 |
| Dependencias | Bloque 3 (SOS no puede depender de que IndexedDB responda) |
| Dispositivo físico | Recomendable, para comprobar el alcance con una mano (junto con la verificación de la fase 3) |
| Revisión clínica | No. Solo muestra datos del usuario. La etiqueta de los campos puede revisarse en la revisión profesional, pero no la bloquea. |

### Bloque 7 — Robustez menor y accesibilidad de navegación · **P2**

| Campo | Detalle |
|---|---|
| Objetivo | Cerrar los detalles pendientes que no justifican un bloque propio. |
| Problema que resuelve | R6 (identificadores de checklist con migración), R7 (error y 404 con SOS/112), R8 (H1 en todas las vistas y foco al navegar), D-1/D-2 (README) |
| Archivos | `app.js`, `ui.js`, `familia.js`, `maps.js` (solo el H1), `data/content/checklists.js` (identificadores; **sin cambiar el texto**), `README.md`, `tools/test.mjs`, `tools/test-unit.mjs` |
| Pruebas | R6 y R7/R8 de §6 |
| Dependencias | Bloque 3 (comparte la pantalla de error) |
| Dispositivo físico | Recomendable: TalkBack y VoiceOver |
| Revisión clínica | No |

### Bloque 8 — Integración continua · **P2**

| Campo | Detalle |
|---|---|
| Objetivo | Que `npm test` se ejecute en cada push y avise de regresiones. |
| Problema que resuelve | H6 |
| Archivos | Nuevo `.github/workflows/test.yml`; `package.json` solo si hiciera falta un script |
| Pruebas | La propia ejecución en verde |
| Dependencias | Ninguna. Conviene hacerlo **primero** si se aprueba. |
| Dispositivo físico | No |
| Revisión clínica | No |

Orden propuesto: **8 → 1 → 3 → 4 → 2 → 5 → 6 → 7**. Primero la red de
seguridad (CI), después el P0, después los fallos y por último lo que depende
de ellos.

---

## 8. Elementos que deben quedar fuera de la fase 4

Son procesos independientes. No se mezclan con la fase 4.

### 8.1 Verificación en dispositivo físico (proceso propio, puede ir en paralelo)

Pendiente de las fases 2 y 3. El guion está en `docs/FASE-3-UX.md` §H y en
`docs/AUDITORIA.md` («Pendiente de verificación manual»):
- modo noche en OLED;
- alcance con una mano de la barra del 112 y de «Deshacer»;
- teclado virtual;
- gesto atrás en iOS y botón atrás en Android;
- wake lock y brújula real;
- `tel:112` (abrir el marcador **sin llamar**);
- guiones en español con letra XL.

No requiere código. Si detecta fallos, se corrigen como incidencias
concretas. La fase 4 añade sus propias comprobaciones en dispositivo (bloques
1 y 2), que pueden hacerse en la misma sesión.

### 8.2 Mapas reales del IGN (fase de mapas aparte, condicionada)

- **Primero**, la prueba en dispositivo de los cinco puntos del README §4:
  capas visibles, descarga que guarda teselas (CORS real), modo avión, zooms
  nativos y formato. Hoy **ninguna prueba** comprueba que las teselas
  descargadas se guarden y se vean sin red (`FASE-3-UX.md` §H).
- **Después**, y según el resultado, las mejoras pendientes del mapa:
  - M4: capa visible sin recargar;
  - M5: mapa familiar con teselas;
  - M7: puntos editables e «ir a punto»;
  - D4: gestor de áreas;
  - F4: descarga concurrente;
  - E6: cuota.

  Si el IGN no permite leer las teselas desde JavaScript, la estrategia de
  descarga tendría que replantearse, y hacer ahora esas mejoras sería trabajo
  perdido.
- Cambiar la lógica del mapa IGN sigue requiriendo aprobación explícita.

### 8.3 Revisión clínica de infarto e ictus (proceso profesional independiente)

- Siguen marcadas como `revision: 'pendiente'`, con aviso visible y texto
  congelado por prueba. **La fase 4 no las toca.**
- La revisión debe hacerla un profesional sanitario contra fuentes como ERC o
  los protocolos del 112 o de los servicios de emergencias. Solo después se
  cambia el texto y se retira la marca. Debe actualizarse la prueba que
  congela el texto.

### 8.4 Otras áreas que deberían someterse más adelante a revisión profesional

Solo se señalan; **no se revisan ahora**:
- **Primeros auxilios del modo SOS**: RCP y DEA, hemorragias (incluido el
  torniquete) y atragantamiento. Hoy citan al ERC y no llevan marca de
  pendiente, pero no consta revisión por un profesional sanitario.
- **Hipotermia, golpe de calor e intoxicaciones** (artículos de técnicas).
- **Potabilización del agua** (uso de lejía apta para agua de bebida) y
  **advertencias sobre plantas y setas tóxicas**: revisión técnica de salud
  pública.
- **Cálculos de agua y comida** (calorías por nivel de actividad en
  Calculadoras) y el apartado de alimentación: revisión por dietista-nutricionista.
- **Modo calma y psicología** (aviso sobre el 024 y límites de las técnicas):
  revisión por profesional de salud mental.

### 8.5 Otras exclusiones

- Sistema visual (C1–C6, iconos SVG), tema claro y animaciones: sin problema
  que lo justifique ahora.
- Refactor de `app.js` y carga diferida (H2, F2, F3): no hay un problema
  medido y la regla es no reescribir.
- Funcionalidades nuevas (linterna/señales, bitácora, GPX, paquetes de
  teselas, voz, SMS): no son necesarias para la fiabilidad. La linterna con
  destellos, además, requiere un análisis de riesgos (fotosensibilidad).
- Cambios de repositorio, URLs, identificadores técnicos o arquitectura de
  sincronización.

---

## 9. Criterios para considerar terminada la fase 4

1. **R1 resuelto y probado**: una actualización con un recurso fallido deja la
   versión anterior intacta y operativa sin conexión (prueba automática).
2. **Versión nueva solo con aviso**: nunca se mezclan versiones en una sesión
   abierta (prueba automática).
3. **El panel de preparación refleja el estado real** de los recursos offline,
   la persistencia, la instalación y la última copia, y cada aviso tiene su
   acción (prueba automática).
4. **Ningún fallo de almacenamiento muestra un mensaje técnico**. SOS y 112
   siguen siempre disponibles, Configuración abre y el mapa vectorial se ve
   (prueba automática con IndexedDB y `localStorage` caídos).
5. **Importar un archivo inválido no escribe nada** y un archivo válido
   muestra un resumen antes de fusionar (prueba automática).
6. **Los textos de privacidad son exactos** con y sin sincronización.
7. **SOS muestra los datos vitales** que el usuario haya escrito y no añade
   contenido médico.
8. Los P2 aprobados, con sus pruebas.
9. **`npm test` en verde** (349 actuales más las nuevas), sin errores de
   consola, y el recorrido visual de la fase 3 repetido a 320, 375, 390 y
   430 px y en escritorio, en tema normal y modo noche.
10. Documentación actualizada: README, `AUDITORIA.md` (estado de ejecución) y
    un apartado de implementación en este documento.
11. Lo que requiere un móvil queda como **PENDIENTE DE VERIFICACIÓN EN
    DISPOSITIVO REAL**, con un guion concreto, y no se da por validado.
12. Infarto e ictus siguen marcadas como pendientes de revisión clínica.
