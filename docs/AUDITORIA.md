# SURVIVAL OFFLINE — Auditoría técnica, propuesta y roadmap

Fecha: 29/09/2026 · Versión auditada: **1.4.0** (contenido de `survival-offline.zip`)
Alcance: fases 1–3 (diagnóstico, propuesta, priorización). **No se ha modificado código.**

---

## Estado de ejecución

| Fecha | Cambio | Puntos de la auditoría |
|---|---|---|
| 29/09/2026 | Proyecto descomprimido en el repositorio; el ZIP se conserva como referencia | H1 |
| 29/09/2026 | **App genérica**: sin datos personales distribuidos; centro familiar configurable por cada usuario (ubicaciones, rutas propias, trazas GPX/GeoJSON, ejemplo ficticio); comparador de riesgos sobre las ubicaciones del usuario; MI ZONA por defecto | §1.13, pregunta 2 |
| 29/09/2026 | **Mapas del IGN** (WMTS: mapa base, MTN, PNOA) en sustitución de OSM/OpenTopoMap; CSP actualizada | A6, M2 |
| 29/09/2026 | La copia de seguridad incluye el plan familiar (`kv`) | A1, E5 |
| 29/09/2026 | El mapa ya no queda en blanco con conexión pero sin teselas; un único marcador de posición; teselas corruptas gestionadas | A2, A3 (parcial: sin seguimiento continuo), A9, M1, M3, M9 |
| 29/09/2026 | Importación de GPX además de GeoJSON | parte de D6 |
| 29/09/2026 | **Fase 1 completada**: brújula solo con rumbo absoluto, compensación de pantalla y suavizado; limpieza de mapas, sensores, temporizadores y wake lock al salir de cada vista; enlace directo al modo calma; sin recargas completas; versión y precache con una sola fuente | A4, A5, A7, A8, A10 |
| 29/09/2026 | **Fase 2 SOS**: botón `tel:112` y barra fija; cinco accesos sanitarios que reutilizan los artículos; infarto e ictus en fichas propias (solo contenido existente, marcadas como pendientes de ampliar); protocolos agrupados; pestañas en rejilla accesibles por teclado; pantalla encendida en SOS; posición para el 112 | B1, B2, B5, B8, S1–S7 |
| 29/09/2026 | **Fase 2 búsqueda**: módulo `search.js` con normalización, raíces, palabras vacías, sinónimos estructurados, ranking por campos, fragmento resaltado, motivo, filtros, consulta en la URL y corrección de erratas | §1.8, H3, F1 |

| 29/09/2026 | **Cierre de la fase 2**: corregida una carrera en el modo calma (salir mientras se concede el wake lock dejaba el temporizador y el bloqueo activos); prueba instrumentada de intervalos, ticks, listeners y wake lock; infarto e ictus marcadas como incompletas con contenido congelado por prueba; prueba de importación; validación de plantillas WMTS y CSP | A5, S2 |

| 29/09/2026 | **Fase 4 (fiabilidad sin conexión y recuperación ante fallos)**: actualización segura del Service Worker, panel «¿Está lista tu app?», modo degradado sin almacenamiento, copias validadas y restauración todo o nada, privacidad según sincronización, «Mis datos vitales» en SOS, checklists con claves estables, errores con salida a SOS/112, H1 y foco, CI en GitHub. Verificación en `docs/FASE-4-VERIFICACION.md` | R1–R9, E1–E5, S5/D1, H6 |
| 29/09/2026 | **Verificación final de la fase 3**: filtros del buscador a 44 px; palabras que desbordaban o se partían a 320 px (portada y barra del mapa); prefijo de guiones para Safari. Lo que requiere un móvil físico queda como PENDIENTE DE VERIFICACIÓN EN DISPOSITIVO REAL (`docs/FASE-3-UX.md` §H) | Fase 3 |
| 29/09/2026 | **Fase 3 (UX para uso bajo estrés)**: modo noche sin elementos fuera de pantalla y con contraste AA; borrar con «Deshacer»; audio y descargas se detienen al salir; checklists para el pulgar; 44 px en todo; mapa (solo UX); modo calma primero; «←» con historial; portada en cuatro bloques; nombre visible SUPERVIVENCIA; etiquetas y tamaños accesibles. Detalle y métricas en `docs/FASE-3-UX.md` | B3, B4, B5, B7, B9, G1–G5, M1–M9 de fase 3 |

### Pendiente de verificación manual (no automatizable aquí)

- **Mapas IGN en dispositivo real**: ver la lista del README (§4, «Pendiente de verificar en un dispositivo real»).
- **Botón 112**: en un móvil real, que abre el marcador con el 112 escrito (sin llamar). No hacer llamadas de prueba al 112.
- **Wake lock real**: las pruebas usan un sustituto de `navigator.wakeLock`; en un móvil, comprobar que la pantalla no se apaga en modo calma y en SOS, y sí al salir.
- **Brújula con sensor real**: las pruebas simulan eventos de orientación; hay que comprobar en Android e iPhone (incluido el permiso de iOS) y en horizontal.
- **Guiones silábicos** en español en Android/iOS (en el entorno de pruebas no hay diccionario). Ejemplos en `docs/FASE-3-UX.md` §H.
- **Fase 3 en móvil físico** (modo noche OLED, alcance del pulgar, teclado virtual, gesto/botón atrás): PENDIENTE DE VERIFICACIÓN EN DISPOSITIVO REAL; guion de prueba en `docs/FASE-3-UX.md` §H.
- **Fichas de infarto e ictus**: revisión clínica y ampliación con fuentes fiables (ERC, servicios de emergencias). Hasta entonces se muestran como incompletas.

---

## 0. Cómo se ha hecho

- Se ha descomprimido `survival-offline.zip` (es **el único contenido real del repositorio**) y se han leído todos los módulos JS, el CSS, el Service Worker, la configuración de despliegue, el README, los datos y las herramientas de build/test.
- Se ha ejecutado la app en local (`tools/serve.mjs`) y se ha recorrido con Chromium en un viewport de Pixel 7 (capturas, búsquedas reales, mapa, geolocalización simulada).
- Se han ejecutado las suites existentes: **178/178 pruebas pasan** (132 de app, incluida la prueba offline real, y 46 de sincronización).
- **Limitación:** desde este entorno la política de red bloquea `survivalismo.netlify.app` y los servidores de teselas (OSM/OpenTopoMap). No he podido comparar con la web publicada ni probar descargas reales de teselas. Lo que depende de eso se marca como **«a verificar en dispositivo»**.

---

## 1. Diagnóstico (FASE 1)

### 1.1 Tecnología y arquitectura

| Aspecto | Situación |
|---|---|
| Stack | HTML + CSS + JavaScript nativo (módulos ES). Sin framework, sin bundler, sin transpilador. |
| Dependencias en ejecución | Solo **Leaflet 1.9** servido localmente. `es-atlas` y `topojson-client` solo en build. Playwright solo en tests. |
| Router | Hash (`#/…`) en `app.js`, con carga diferida (`import()`) de mapas, familia, riesgos, juegos, audio y sync. |
| Datos del manual | Módulos ES en `public/data/content/` (47 artículos, 20 escenarios SOS, 12 checklists, 10 cursos, 25 frecuencias, 21 riesgos). Índice de búsqueda de 151 entradas construido en memoria. |
| Datos del usuario | IndexedDB (`store.js`, 11 almacenes) + `localStorage` para ajustes. |
| Offline | Service Worker con precache completo (~1,4 MB), navegación **caché primero** con revalidación. |
| Mapas | Leaflet + GeoJSON IGN precacheado + teselas ráster guardadas en IndexedDB bajo demanda. |
| Sync | Opcional, Supabase por REST sin SDK, local-first, con lápidas y diagnóstico. |
| Despliegue | Netlify (`netlify.toml`) + `_headers`/`_redirects` para drag & drop. CSP estricta. |
| Tests | E2E con Playwright muy completos (offline real, hosting caído, actualización de versión, consola). |

**Valoración general:** es un proyecto **bien construido y con criterio** (local-first real, sin inventar datos, CSP estricta, tests serios, decisiones documentadas). No necesita reescribirse. Los problemas son de **experiencia en situación de estrés**, **relevancia de la búsqueda**, **robustez del mapa**, **fugas de recursos** y **mantenibilidad de `app.js`**.

### 1.2 Pantallas y funcionalidades existentes

| Ruta | Qué hace |
|---|---|
| `#/` | Portada: buscador, 27 tarjetas de sección, aviso legal. |
| `#/emergencia` y `#/emergencia/:id` | 20 escenarios. Tarjeta rápida + pestañas Ahora / Horas / Días / No hacer / Equipo / Evacuar. |
| `#/sec/:id` | Listado de artículos por sección, con extras: brújula (orientación), checklists (equipo), frecuencias + radio log (comunicaciones). |
| `#/art/:id` | Artículo con bloques tipados (`p`, `ul`, `warn`, `table`, `tool`…). |
| `#/buscar` | Buscador de texto completo. |
| `#/mapa` | Mapa offline, puntos personales, «mi posición», descarga de área, importación de GeoJSON. |
| `#/check/:id` | Checklists con 4 estados y fecha de caducidad. |
| `#/curso/:id` | Cursos con teoría, lecturas, ejercicio y test. |
| `#/sec/familia`, `#/familia/*` | Centro familiar: estado, nodos, rutas, asistente «Quiero llegar», mapa familiar, plan 72 h, reunificación, modo sin Internet. |
| `#/sec/riesgos`, `#/riesgos/comparar` | Fichas de riesgo 2026–2036, ámbito «Mi zona», comparador. |
| `#/sec/juegos`, `#/sec/audio` | Juegos, modo calma, reproductor de audio local. |
| `#/sec/plan-familiar` | Contactos y acuerdos, imprimible. |
| `#/sec/calculadoras` | 8 calculadoras. |
| `#/sec/config` | Estado offline, apariencia, sync, copias, borrado. |

### 1.3 Navegación

- Barra inferior fija con 5 destinos (Inicio, SOS, Familia, Mapa, Buscar). Correcta para una mano.
- La portada es una **rejilla plana de 27 tarjetas** con el mismo peso visual (salvo Emergencia). Mezcla herramientas (Mapa, Calculadoras), temas del manual (Agua, Fuego…), contenido personal (Familia, Plan familiar) y utilidades (Fuentes, Configuración). En móvil obliga a mucho scroll para llegar a lo útil.
- Hay **dos entradas familiares** que confunden: «Familia» (centro de coordinación) y «Plan familiar» (contactos y acuerdos) con el mismo icono.
- El botón «←» de la barra superior es un enlace fijo (normalmente a `#/`), no «atrás»: desde una búsqueda, volver no devuelve a los resultados.
- Al cambiar de ruta se hace `scrollTo(0,0)` y se pierde la posición al volver a un listado largo.

### 1.4 Datos y almacenamiento

- Bien separados: contenido estático en `data/content`, datos del usuario en IndexedDB, ajustes en `localStorage`.
- **`exportAll()` no exporta `kv`** (plan familiar, nodos, estados, encuentros, ubicación, verificaciones de riesgo, estadísticas) ni `audio`. La copia de seguridad que la app recomienda **no contiene el plan familiar**, que es lo más valioso. (La sync sí incluye `kv`, así que quien no usa Supabase está desprotegido.)
- `importAll()` usa `put()` y re-marca `_upd`, forzando una re-subida completa en la siguiente sync (menor).
- Checklists guardados por índice (`lista::grupo::i`): reordenar ítems desplaza las marcas (documentado, pero frágil).

### 1.5 Modo offline

Fuerte en lo esencial:
- Precache completo, navegación caché-primero (robusta ante hosting caído o 5xx, con test).
- Sin fuentes ni CDN externas.

Debilidades:
- **La lista de precache está duplicada** (`CORE` en `sw.js` y `precache-manifest.json` generado). Añadir un archivo y olvidar uno de los dos rompe el offline sin que nada avise (salvo el test).
- **La versión está duplicada** (`sw.js` y `data/content/index.js`, más el botón de Configuración que abre `survival-static-v`+VERSION).
- El comentario de cabecera de `sw.js` dice «red primero» y el código hace «caché primero» (documentación contradictoria).
- `skipWaiting()` inmediato + caché-primero: una actualización puede aplicarse a mitad de uso con módulos de versiones distintas mezclados (bajo riesgo, pero posible). No hay aviso «Hay una versión nueva — recargar».
- El usuario **no sabe si la app está lista para offline** salvo que entre en Configuración. No hay indicador «✔ Lista sin conexión» ni onboarding de primera vez (instalar, descargar mapa de tu zona, rellenar plan, exportar).
- No hay aviso cuando la última copia de seguridad es antigua.

### 1.6 Mapas (análisis específico)

**Tecnología:** Leaflet 1.9 local + GeoJSON del IGN + `TileLayer` propia que lee/escribe teselas en IndexedDB. La decisión frente a MBTiles/PMTiles/MVT está bien razonada y **recomiendo mantenerla**.

Problemas detectados:

| # | Problema | Evidencia |
|---|---|---|
| M1 | **Mapa en blanco con conexión pero sin teselas** (servidor caído, bloqueado, datos lentos). El relleno del vectorial se decide solo con `navigator.onLine`: si hay «conexión» pero las teselas fallan, los polígonos quedan sin relleno y al acercar no se ve nada. | Reproducido: captura en zoom 14 sobre Ávila, mapa vacío con solo el punto de posición. |
| M2 | **Probable bloqueo de OpenStreetMap.** La política de uso de `tile.openstreetmap.org` exige cabecera `Referer` y **prohíbe la descarga masiva/prefetch**. El sitio envía `Referrer-Policy: no-referrer`, y la app ofrece descargar hasta 3.000 teselas. | *A verificar en dispositivo.* Riesgo real de teselas denegadas y de incumplir la política. |
| M3 | «Mi posición» añade un círculo y un marcador **nuevos cada vez**, sin quitar los anteriores; no hay seguimiento continuo (`watchPosition`) ni rumbo. | Reproducido. |
| M4 | Tras importar o borrar una capa: «Recarga el mapa para verla». | `maps.js` |
| M5 | El mapa familiar no carga ninguna capa ráster (ni las teselas ya descargadas). | `familia.js` |
| M6 | Sin gestión de teselas: no se ve qué áreas hay descargadas, cuánto ocupan, ni se pueden borrar por zona. La descarga es secuencial, sin cancelar ni reanudar. | `maps.js` |
| M7 | Puntos: solo se crean en el centro del mapa (no con pulsación larga), no se pueden editar, no hay lista ni «navegar hasta el punto» (distancia + rumbo con la brújula). | `maps.js` |
| M8 | El control de capas de Leaflet es pequeño en móvil y convive con 4 botones propios encima del mapa. El mapa ocupa 62vh y no hay modo pantalla completa. | Captura |
| M9 | Si una tesela guardada está corrupta, `img.onerror` no está gestionado y Leaflet queda esperando. | `makeOfflineLayer` |
| M10 | Capa vectorial solo de provincias + municipios de Ávila: fuera de Ávila, a escala local no hay referencia sin teselas. | Limitación conocida y documentada. |

### 1.7 SOS (análisis específico)

Lo bueno: tarjeta rápida de 4 líneas arriba, «No hacer» separado, fuentes citadas, tono sobrio.

Problemas:

| # | Problema |
|---|---|
| S1 | **No hay botón para llamar al 112.** El 112 aparece como texto en 3 sitios, pero no es un enlace `tel:` en ninguna pantalla de emergencia. En todo el código solo hay 3 enlaces `tel:` (contactos, 024 y 112 dentro del modo calma). |
| S2 | **Faltan las emergencias sanitarias tiempo-dependientes** en el modo SOS: parada cardiaca/RCP, hemorragia grave, atragantamiento, infarto, ictus, inconsciencia. El contenido **existe** en artículos de Primeros auxilios (p. ej. infarto e ictus están dentro de «Fracturas, esguinces, picaduras e intoxicaciones»), pero no es accesible desde SOS. Es la situación más frecuente en la vida real. |
| S3 | 20 escenarios en una lista larga sin agrupar ni orden por frecuencia; en móvil se ven 8 sin hacer scroll. |
| S4 | No hay acceso inmediato a «mi posición para dictar al 112» (coordenadas + precisión) desde SOS; está en Orientación y en Calculadoras. |
| S5 | No hay acceso a los datos personales críticos desde SOS: contacto externo, información médica, punto de encuentro (existen en el plan familiar). |
| S6 | Las pestañas se desbordan horizontalmente sin indicación («Próximos dí…» cortado); «No hacer» queda fuera de pantalla. |
| S7 | No se mantiene la pantalla encendida en SOS (la API `wakeLock` ya se usa en modo calma). |
| S8 | No existen herramientas de señalización (linterna/pantalla blanca, destello SOS, silbato sonoro). Están en el propio roadmap del README. **Requieren análisis de riesgos** (ver §2.D). |

### 1.8 Búsqueda (análisis específico)

Rápida (índice en memoria, < 5 ms) y offline, pero la **relevancia falla en consultas reales**:

| Consulta | Primer resultado | Problema |
|---|---|---|
| «sangra mucho» | **Apagón eléctrico** | «mucho» cuenta igual que «sangra»; sin stemming («sangra» ≠ «sangrado/hemorragia»). |
| «corte de luz» | **Corte / falta de agua** | «de» cuenta como término; 60 resultados; sin sinónimos (luz → apagón). |
| «infarto», «ictus» | «Fracturas, esguinces…» | Correcto técnicamente, pero el título no ayuda; no hay resaltado del fragmento. |

Otras carencias: sin palabras vacías, sin OR/sinónimos, sin tolerancia a erratas, sin filtros por tipo (SOS / artículo / checklist…), sin fragmento resaltado, resultados de frecuencias y riesgos apuntan a la sección, no a la entrada; la búsqueda no queda en la URL (volver pierde la consulta).

### 1.9 Errores y problemas de código

| # | Archivo | Problema |
|---|---|---|
| E1 | `compass.js` | Escucha a la vez `deviceorientationabsolute` y `deviceorientation`; el segundo, con `alpha` relativo, **sobrescribe el rumbo absoluto** en Android → lecturas erróneas/saltos. No compensa la orientación de pantalla. No suaviza el paso 359°→0° (la rosa gira una vuelta entera). |
| E2 | `compass.js` | Los listeners de orientación y de arrastre del modo manual **nunca se eliminan** (ni al salir de la pantalla ni al desactivar el modo manual); activar el modo manual dos veces duplica listeners. Consumo de batería. |
| E3 | `juegos.js` | El temporizador del modo calma y el `wakeLock` siguen activos al navegar fuera. |
| E4 | `app.js` | No hay ciclo de vida de vistas (`destroy`): mapas Leaflet, intervalos y listeners globales se quedan vivos tras cambiar de ruta. |
| E5 | `store.js` | `exportAll()` no incluye `kv` (plan familiar) — ver §1.4. **Es el fallo más grave para el usuario.** |
| E6 | `app.js` | «Reiniciar checklist» e importar datos hacen `location.reload()`. |
| E7 | `app.js` | El enlace «🧘 Modo calma» de Psicología abre Juegos en la pestaña Tres en raya. |
| E8 | `app.css` | `input:focus, select, textarea:focus` → `select` tiene contorno siempre. Botones y enlaces **no tienen estilo de foco visible**. Regla `.tile.sos` duplicada (líneas 208 y 473). |
| E9 | `ui.js`/vistas | Casi ningún `<label>` está asociado a su campo (`for`/`id`): los lectores de pantalla no anuncian el nombre del campo. |
| E10 | `app.js` | `vHome` contiene `filter((s) => s.id !== 'manual' \|\| true)` (código muerto). |
| E11 | `calc.js` | IDs fijos (`#ca-p`…): si una calculadora se incrusta dos veces en la misma vista, los IDs se duplican. |
| E12 | `sw.js`/README | Comentario de estrategia contradictorio; versión y lista de precache duplicadas (§1.5). |
| E13 | Leaflet | El prefijo de atribución por defecto muestra una bandera; cosmético, pero se puede fijar. |

### 1.10 Rendimiento

- Arranque muy rápido (portada < 100 ms en local tras caché). El peso total (~1,4 MB) es razonable.
- `data/content/index.js` importa **todo** el contenido (incluidos 87 KB de riesgos y 42 KB de territorios) en el arranque solo para construir el índice de búsqueda y los listados. Aceptable hoy, pero crecerá con el contenido.
- `es-provincias.geojson` (175 KB) se descarga dos veces en memoria (mapa y ubicación) en cachés separadas.
- Búsqueda: normaliza el texto de todo el índice en cada pulsación (se podría normalizar una vez).
- Descarga de teselas secuencial (lenta, aunque amable con el servidor).

### 1.11 Experiencia móvil y diseño visual

- Estética coherente de «manual de campo» con paleta camuflaje. Buen tamaño táctil (52 px), buena legibilidad del cuerpo.
- **Jerarquía débil:** todo es mayúsculas condensadas con el mismo peso; títulos, subtítulos, botones y tarjetas compiten. El rojo de alerta (`#C06044`) está desaturado para encajar con la paleta y **lo crítico no destaca** lo suficiente (las filas «crítico» e «importante» solo se diferencian por un borde izquierdo de 3 px).
- Iconografía con emojis: se renderizan distinto en cada sistema (en Android se ven pixelados/incoherentes) y algunos no se leen bien en modo noche.
- Estados de carga: el contenido aparece de golpe; las vistas asíncronas (mapa, familia, config) no tienen esqueleto ni indicador.
- Estados vacíos correctos pero planos («Ninguno todavía»).
- Botones del mapa en dos filas de ancho irregular; pestañas desbordadas sin pista visual.

### 1.12 Accesibilidad

- Positivo: `lang="es"`, enlace «saltar al contenido», `prefers-reduced-motion`, alto contraste, 3 tamaños de texto, roles de pestaña.
- Pendiente: foco visible (E8), etiquetas de formulario (E9), las pestañas no gestionan teclado (flechas) ni `aria-controls`, los toasts usan `role=status` pero se sustituyen demasiado rápido (2,6 s), el icono de la barra inferior es un emoji leído por el lector de pantalla, no se anuncia el cambio de vista (no se mueve el foco al `h1`).

### 1.13 Organización del contenido y personalización

- El contenido es de calidad, citado y con regla estricta de no inventar. Se diferencia bien lo verificado de lo pendiente.
- **Datos personales dentro del código de contenido.** `data/content/familia.js`, `rutas.geojson`, `nodos-familia.geojson` y el comparador de riesgos están construidos alrededor de **una familia concreta** (Ávila, Terrassa «Carlos», Getafe «Padres de mi pareja»). Los nodos son editables, pero la geometría, las rutas, el sentido «→ Ávila» y las zonas del comparador están fijados en datos. Si otra persona instala la app, ve el plan de otra familia. **Decisión de producto pendiente** (ver preguntas al final).

---

## 2. Propuesta de mejora (FASE 2)

Leyenda de tamaño: **P** pequeño (< ½ día) · **M** medio (1–2 días) · **G** grande (varios días).

### A. Errores / problemas

| ID | Qué | Problema que resuelve / beneficio | Archivos | Tamaño |
|---|---|---|---|---|
| A1 | Incluir `kv` (y opcionalmente `audio` como opción aparte) en la exportación; aviso al importar de qué se va a fusionar | Hoy la copia de seguridad **pierde el plan familiar** | `store.js`, `app.js` (config) | P |
| A2 | Relleno del vectorial según **éxito real** de teselas (contador de fallos), no `navigator.onLine` | Mapa en blanco con red pero sin teselas | `maps.js` | P |
| A3 | Un único marcador de posición reutilizado; botón «seguir mi posición» con `watchPosition` | Acumulación de círculos, sin seguimiento | `maps.js`, `familia.js` | P |
| A4 | Brújula: usar solo el evento absoluto cuando existe, compensar `screen.orientation`, suavizado y giro por el camino corto; eliminar listeners al salir | Rumbos erróneos en Android, batería | `compass.js` | M |
| A5 | Ciclo de vida de vistas: `render()` llama a `cleanup()` de la vista anterior (mapas, intervalos, sensores, wakeLock) | Fugas en brújula, modo calma, mapas | `app.js` + módulos | M |
| A6 | Referer/política de teselas: revisar `Referrer-Policy` (p. ej. `strict-origin-when-cross-origin`) y **limitar la descarga masiva de OSM**; valorar proveedor que permita uso offline | Probable bloqueo y posible incumplimiento de la política de OSM | `netlify.toml`, `_headers`, `maps.js` | P (+ decisión) |
| A7 | Corregir enlace «Modo calma» para abrir su pestaña (`#/sec/juegos?t=cal` o similar) | Enlace engañoso | `app.js`, `juegos.js` | P |
| A8 | Quitar `location.reload()` en checklist e importación; refrescar la vista | Saltos de pantalla, pérdida de contexto | `app.js` | P |
| A9 | Gestionar `img.onerror` de teselas corruptas | Teselas que nunca terminan | `maps.js` | P |
| A10 | Unificar versión y lista de precache (el SW lee `precache-manifest.json` generado; una sola constante de versión inyectada en el build) | Evita romper el offline al añadir archivos | `sw.js`, `tools/build-assets.mjs`, `index.js` | M |

### B. Mejoras de UX

| ID | Qué | Beneficio | Archivos | Tamaño |
|---|---|---|---|---|
| B1 | **SOS rediseñado**: botón grande «📞 LLAMAR AL 112» (con confirmación ligera, ver §SOS), bloque «Mi posición para el 112» (coordenadas grandes + precisión + copiar), accesos a «Mi información médica / contacto externo / punto de encuentro», y escenarios agrupados (Sanitarias · Fuego · Agua y clima · Suministros · Seguridad · Personas) | Lo crítico a un toque; menos scroll bajo estrés | `app.js`, `emergencias.js` (campo `grupo`), CSS | M |
| B2 | **Escenarios sanitarios en SOS** reutilizando el contenido existente de Primeros auxilios (RCP, hemorragia, atragantamiento, infarto/ictus, inconsciencia). Solo reorganización; el texto nuevo, si hiciera falta, se marca «pendiente de verificación» | Cubre las emergencias más frecuentes | `emergencias.js`, `art-tecnicas.js` | M |
| B3 | Portada en tres niveles: (1) SOS + «Mi plan» + Mapa + Buscar grandes; (2) «Herramientas» (brújula, calculadoras, checklists, radio); (3) «Manual» por temas, plegable. Unificar «Familia» y «Plan familiar» en una sola entrada | Menos ruido; lo útil arriba | `app.js`, `index.js` (agrupación en datos), CSS | M |
| B4 | Botón «←» como atrás real (`history.back()` con respaldo) y restaurar scroll por ruta | Volver a resultados/listados sin perder sitio | `app.js`, `ui.js` | P |
| B5 | Pestañas de SOS: rejilla de 2–3 columnas o carrusel con indicador; «No hacer» siempre visible | Nada crítico escondido | `app.js`, CSS | P |
| B6 | Mapa: pulsación larga para añadir punto, editar/borrar desde lista, «ir a este punto» con distancia y rumbo, pantalla completa, capas recargadas en caliente | Mapa realmente utilizable en campo | `maps.js`, `compass.js` | G |
| B7 | Onboarding «Prepara tu app en 5 pasos» con estado de cada paso (instalada, offline lista, mapa de tu zona, plan familiar, copia exportada) | El usuario sabe si está preparado **antes** de la emergencia | nuevo `preparacion.js`, `app.js` | M |
| B8 | Wake lock en SOS y en seguimiento de posición | La pantalla no se apaga mientras se leen pasos | `app.js`, `maps.js` | P |
| B9 | Confirmaciones propias (modal accesible) en vez de `window.confirm`, con opción deshacer en borrados | Coherencia y prevención de errores | `ui.js` | M |

### C. Mejoras visuales

| ID | Qué | Beneficio | Archivos | Tamaño |
|---|---|---|---|---|
| C1 | Escala tipográfica clara: condensada en mayúsculas solo para H1/H2 y etiquetas; H3, botones y filas en minúscula normal | Jerarquía legible | `app.css` | M |
| C2 | Semántica de color reforzada: rojo de alerta de verdad en SOS/crítico (manteniendo la paleta en el resto), chip de prioridad visible en filas | Lo crítico destaca | `app.css` | P |
| C3 | Iconos SVG propios en línea (sprite local, ~30 iconos) en navegación, SOS y herramientas; mantener emojis solo como decoración de contenido | Consistencia entre dispositivos y en modo noche | nuevo `assets/icons.svg`, `ui.js`, CSS | M |
| C4 | Sistema de componentes: botones (primario/secundario/peligro/tamaño), tarjetas, alertas, chips, estados vacíos con ilustración/acción, esqueletos de carga | Aspecto profesional y coherente | `app.css`, `ui.js` | M |
| C5 | Barra de acciones del mapa compacta con iconos y control de capas propio | Menos ruido sobre el mapa | `maps.js`, CSS | P |
| C6 | Toasts con icono y tipo (ok/aviso/error), duración según longitud | Feedback más claro | `ui.js`, CSS | P |

### D. Nuevas funcionalidades (útiles de verdad)

| ID | Qué | Beneficio | Archivos | Tamaño |
|---|---|---|---|---|
| D1 | **Ficha «Mi información vital»** (alergias, medicación, grupo sanguíneo si se conoce, contacto de emergencia), visible desde SOS e imprimible como tarjeta de cartera. Reutiliza `plan.medico` existente | Información que sí salva tiempo | `app.js`/nuevo módulo, `store.js` | M |
| D2 | **Linterna / pantalla de señalización** (pantalla blanca a máximo brillo; modo rojo para visión nocturna). *Destello SOS y sonido de silbato solo tras análisis*: parpadeos rápidos pueden provocar crisis fotosensibles (limitar a ≤ 3 Hz, aviso previo) y el sonido agota batería. Nada de esto sustituye al 112 | Utilidad real sin conexión, pedida en el roadmap | nuevo `senal.js` | M |
| D3 | Registro de incidencias («cuaderno de bitácora»): notas con hora y posición opcional, exportable | Recomendado por la propia app («anota hora y decisiones») | nuevo módulo, `store.js` | M |
| D4 | Gestor de áreas descargadas: lista con tamaño, fecha, fuente, borrar, «actualizar esta área» | Control de espacio y de qué hay offline | `maps.js` | M |
| D5 | Recordatorio de caducidades de checklists (panel «caduca en 30 días» en portada) | Aprovecha el dato de fecha que ya se guarda | `app.js` | P |
| D6 | Exportación de puntos y rutas a GPX/GeoJSON y registro de tracks (roadmap del README) | Interoperabilidad con otras apps | `maps.js` | G |

### E. Mejoras offline

| ID | Qué | Archivos | Tamaño |
|---|---|---|---|
| E1 | Indicador persistente «✔ Lista sin conexión / ⚠ incompleta» (compara caché con el manifiesto) | `app.js`, `sw.js` | P |
| E2 | Aviso «Nueva versión disponible — actualizar» en vez de aplicar a ciegas; mantener caché-primero | `sw.js`, `app.js` | P |
| E3 | Pedir almacenamiento persistente automáticamente tras instalar/primer uso significativo | `app.js` | P |
| E4 | Aviso de copia de seguridad antigua (> 30 días o tras cambios en el plan) | `app.js`, `store.js` | P |
| E5 | Botón «Instalar app» propio (`beforeinstallprompt`) + instrucciones para iOS | `app.js` | P |
| E6 | Versionado de caché de teselas y límite de espacio con aviso antes de llenar la cuota | `maps.js` | M |

### F. Rendimiento

| ID | Qué | Archivos | Tamaño |
|---|---|---|---|
| F1 | Normalizar el índice de búsqueda una vez (no en cada tecla) | `app.js`/`search.js` | P |
| F2 | Cargar riesgos y territorios en diferido (el índice guarda solo el texto necesario) | `index.js` | M |
| F3 | Caché compartida de GeoJSON entre `maps.js`, `ubicacion.js` y `familia.js` | módulo `geo.js` | P |
| F4 | Descarga de teselas con concurrencia limitada (2–4), cancelable y reanudable | `maps.js` | M |

### G. Accesibilidad

| ID | Qué | Tamaño |
|---|---|---|
| G1 | `:focus-visible` en todos los controles; corregir la regla de `select` | P |
| G2 | Asociar etiquetas a campos (helper `field()` en `ui.js`) | M |
| G3 | Pestañas accesibles (flechas, `aria-controls`, `tabpanel`) | P |
| G4 | Mover el foco al título al cambiar de vista y anunciarlo | P |
| G5 | Iconos decorativos con `aria-hidden`, nombres accesibles en botones de solo icono | P |
| G6 | Verificar contrastes AA de la paleta en los tres temas (script en los tests) | P |

### H. Arquitectura / código

| ID | Qué | Beneficio | Tamaño |
|---|---|---|---|
| H1 | **Descomprimir el proyecto en el repositorio** y versionar el código fuente (el repo hoy solo guarda un `.zip`: no hay historial, diffs ni revisión posible). Excluir `node_modules` | Requisito previo para todo lo demás | P |
| H2 | Dividir `app.js` (1.129 líneas) en `views/` (home, emergencia, articulo, buscar, checklist, cursos, config, plan-familiar, frecuencias) con un router mínimo y ciclo de vida | Mantenibilidad | M |
| H3 | Extraer el buscador a `search.js` con tests unitarios de relevancia | Calidad medible | M |
| H4 | Mover textos fijos de interfaz que son contenido (sugerencias de búsqueda, preguntas de reunificación, tarjeta de bolsillo offline) a `data/content` | Separación datos/presentación | P |
| H5 | Tests unitarios ligeros con `node:test` (sin dependencias) para búsqueda, cálculo de calculadoras, UTM, export/import | Red de seguridad rápida | M |
| H6 | CI en GitHub Actions ejecutando `npm test` | Evitar regresiones | P |

### I. Ideas avanzadas (a valorar)

- **Búsqueda con sinónimos y lematización ligera** de dominio (tabla propia: luz↔apagón, sangrar↔hemorragia, ahogo↔atragantamiento, «no respira»→RCP) — ver roadmap, es muy rentable.
- **Paquetes de teselas compartibles** (zip/`.pmtiles` importado a IndexedDB) para pasar un área entre móviles sin Internet.
- **Modo «pantalla bloqueada / manos libres»**: lectura en voz alta (Speech Synthesis, offline en la mayoría de móviles) de los pasos de un escenario.
- **Compartir estado sin Internet**: SMS prerredactado con posición y estado («Estoy bien, en X, 40.656,-4.681»), usando `sms:`.
- **Plan familiar genérico**: nodos, rutas y comparador definidos por el usuario (ver pregunta 2).

---

## 3. Contenido: qué hay, qué reorganizar y qué habría que crear/verificar

| Tipo | Detalle |
|---|---|
| **Existe** | 47 artículos, 20 escenarios, 12 checklists, 10 cursos, 25 frecuencias, 21 fichas de riesgo, directorio de servicios verificados. Todo con fuentes y fecha. |
| **Reorganizable** (sin escribir contenido nuevo) | Infarto e ictus están dentro de «Fracturas, esguinces, picaduras e intoxicaciones» → sacarlos a entrada propia y a SOS. RCP, hemorragias y atragantamiento existen como artículos → enlazarlos como escenarios SOS. Agrupar escenarios por tipo. Unificar «Familia» y «Plan familiar». |
| **A crear y verificar** (no lo inventaré) | Posibles escenarios SOS sanitarios que requieran texto nuevo (p. ej. inconsciencia/posición lateral, reacción alérgica grave) → a redactar contra ERC/112 y marcar «pendiente de verificación» hasta revisión. Tabla de sinónimos de búsqueda (no es contenido médico, se puede crear). Contenido de la linterna/señales (convenciones internacionales de socorro) → con fuente. |

---

## 4. Roadmap priorizado (FASE 3)

Orden según: seguridad y fiabilidad → esencial en emergencia → usabilidad → móvil → offline → rendimiento → visual → extras.

### Fase 0 — Base de trabajo (P)
1. **H1** Descomprimir en el repo y versionar el código (sin `node_modules`). Mantener `npm test` en verde.
2. **H6** CI con `npm test`.

### Fase 1 — Seguridad y fiabilidad (1–2 días)
3. **A1** Copia de seguridad completa (incluye plan familiar).
4. **A2 + A3 + A9** Mapa: nunca en blanco, posición única, teselas corruptas.
5. **A4 + A5** Brújula correcta y ciclo de vida de vistas (sin fugas).
6. **A6** Política de teselas / Referer (requiere tu decisión, pregunta 3).
7. **A10** Versión y precache unificados.
8. **A7, A8** Correcciones menores.

### Fase 2 — SOS y búsqueda: lo esencial en una emergencia (2–3 días)
9. **B1 + B5 + B8** SOS rediseñado: llamar al 112, mi posición, datos vitales, grupos, pestañas visibles, pantalla encendida.
10. **B2** Escenarios sanitarios en SOS reutilizando contenido existente.
11. **D1** Ficha «Mi información vital».
12. **H3 + F1 + búsqueda con palabras vacías, stemming ligero, sinónimos, filtros por tipo y fragmento resaltado**, con tests de relevancia («sangra mucho» → hemorragias, «corte de luz» → apagón).

### Fase 3 — Usabilidad y móvil (2–3 días)
13. **B3** Portada por niveles.
14. **B4** Navegación atrás real y scroll restaurado.
15. **B7** «Prepara tu app en 5 pasos».
16. **G1–G5** Accesibilidad.

### Fase 4 — Offline (1 día)
17. **E1–E5** Indicador de preparación offline, aviso de actualización, persistencia, recordatorio de copias, instalación.

### Fase 5 — Mapa avanzado (2–3 días)
18. **B6, D4, F4, C5** Puntos editables, ir-a-punto, gestor de áreas, descarga concurrente cancelable.

### Fase 6 — Sistema visual (2–3 días)
19. **C1–C6** Tipografía, color semántico, iconos SVG, componentes, esqueletos, estados vacíos.

### Fase 7 — Arquitectura y extras
20. **H2, H4, H5, F2, F3** Refactor de `app.js`, datos fuera de la vista, tests unitarios, carga diferida.
21. **D2** (tras análisis de riesgos), **D3, D5, D6** e ideas avanzadas según prioridad.

Cada fase termina con: `npm test` completo, prueba manual en viewport móvil y escritorio, revisión de consola y prueba offline.

---

## 5. Qué NO propongo eliminar

Nada. Riesgos 2036, juegos, audio y sync con Supabase son módulos periféricos para una app de emergencia, pero están bien aislados (carga diferida, no afectan al arranque) y bien probados. La propuesta es **bajarlos de nivel en la portada**, no quitarlos.
