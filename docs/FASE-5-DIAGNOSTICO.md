# FASE 5 — DIAGNÓSTICO

Fecha: 29/09/2026 · Punto de partida: commit `9dd369a` (fase 4 cerrada, 435/435,
CI en verde).
Secuencia acordada:
**diagnóstico → implementación → pruebas → auditoría → previsualización local
→ aprobación → despliegue**. En esta fase **no se despliega nada en Netlify**.

## 1. Qué se puede verificar desde aquí y qué no

El entorno de desarrollo es un contenedor en la nube con Chromium sin interfaz
(headless). Esto marca lo que se puede afirmar:

| Se puede verificar aquí | NO se puede verificar aquí (PENDIENTE DE PRUEBA REAL) |
|---|---|
| Lógica offline, Service Worker y cachés, en Chromium | Android y iPhone físicos; Safari/WebKit de iOS |
| IndexedDB, copias, fallos de almacenamiento simulados | Instalación real («Añadir a pantalla de inicio», `beforeinstallprompt` real) |
| Mapas con un servidor del IGN **simulado** | El servidor real del IGN: la red de este entorno bloquea `www.ign.es` |
| Árbol de accesibilidad de Chromium, foco, títulos y contraste | VoiceOver y TalkBack (lectores de pantalla reales) |
| Navegación «Atrás» del navegador (`history.back`) | Botón y gesto Atrás de Android, gesto de borde de iOS |
| Anchos de 320 a 1280 px y tamaños de letra de la app | Teclado virtual real, uso con una mano, brillo real (OLED) |
| Enlace `tel:112` bien formado | Que el marcador se abra con el 112 escrito |

Nada de la segunda columna se dará por probado.

## 2. Problemas reales encontrados en el código

| ID | Problema | Evidencia | Prioridad |
|---|---|---|---|
| **P5-1** | **La previsualización y las pruebas no usan las cabeceras de producción.** `tools/serve.mjs` no envía la CSP ni el resto de cabeceras de `netlify.toml` / `_headers`. Algo que la CSP bloquea en Netlify (un script en línea, un recurso externo) funcionaría en local y en las pruebas, y fallaría publicado. Pasó cerca en la fase 4: un `onclick` en línea se detectó revisando el código, no con una prueba. | `tools/serve.mjs`: solo `Content-Type` y `Cache-Control` | **P1** (condición para que la previsualización sea fiel) |
| **P5-2** | **Descarga de mapas: una descarga parcial se presenta como completa.** Con teselas fallidas dice «Ya puedes usar esta zona sin conexión». | `maps.js`, final de la descarga | **P1** |
| **P5-3** | **Descarga de mapas: si se pierde la conexión a mitad, sigue intentándolo** y acumula fallos, sin decir que se ha cortado la red. | `maps.js`, bucle de descarga | P1 |
| **P5-4** | **Descarga de mapas: sin espacio, falla en silencio.** El error de cuota se cuenta como «fallida», sin avisar de que el dispositivo está lleno. | `maps.js`, `saveTile` dentro de `try` | P1 |
| **P5-5** | **Teselas dañadas guardadas para siempre.** Se guarda cualquier respuesta 200, aunque no sea una imagen (p. ej., un error XML del servidor). Luego cuenta como «ya guardada», no se vuelve a descargar y se ve en blanco. | `maps.js`: `r.ok` → `saveTile` en la descarga y al navegar | **P1** |
| **P5-6** | «Capa importada. **Recarga el mapa para verla**.» (pendiente M4 de la auditoría inicial). | `maps.js`, importación | P2 |
| **P5-7** | El estado del mapa («con conexión / SIN CONEXIÓN») no se actualiza al perder o recuperar la conexión. Solo cambia cuando llega una tesela. | `maps.js`, `refreshStatus` | P2 |
| **P5-8** | **No hay prueba de que las teselas descargadas se vean sin red** tras cerrar y volver a abrir la app. Ya se señaló en la fase 4 (§H de la fase 3). | `tools/test.mjs` | **P1** (cobertura) |
| **P5-9** | **Sin indicación de carga**: al abrir una vista lenta (mapa, Configuración, Familia) no cambia nada hasta que aparece. Un lector de pantalla no anuncia nada, y con estrés se tiende a volver a pulsar. | `app.js`, `route()` | P2 |
| **P5-10** | **Elementos fijos que pueden tapar el foco**: al moverse con teclado o lector por una página larga, el elemento enfocado puede quedar debajo de la barra inferior o de la del 112. No hay `scroll-padding`. | `app.css` | P2 |
| **P5-11** | **Sin datos técnicos para informar de problemas desde un móvil real.** Probando en Android o iPhone, no hay forma sencilla de saber o copiar si la app está instalada, si hay Service Worker, la versión, la protección de datos, etc. | Configuración | P2 (prepara la prueba real) |

## 3. Lo que ya está bien (no se toca)

- SOS, `tel:112`, barra del 112, «Mis datos vitales», actualización segura,
  copias, modo degradado y privacidad: fases 2–4, con pruebas.
- Estrategia offline: nombres de caché, caché primero, `precache-manifest.json`.
- Sincronización con Supabase: arquitectura, IDs y estructura de datos.
- El mapa familiar ya usa las teselas del IGN (M5 de la auditoría inicial está
  resuelto).
- Navegación «Atrás»: la app usa el historial real (`history.back`), así que
  el botón Atrás de Android y el gesto de iOS deberían comportarse igual que
  «←». Se añadirá una prueba con el Atrás del navegador. El dispositivo real
  queda pendiente.

## 4. Limitaciones técnicas conocidas (no se pueden resolver con código aquí)

- **CORS del IGN**: si el servidor real no permite leer las teselas desde
  JavaScript, se ven con conexión, pero no se pueden guardar. La app ya lo
  detecta y lo dice. Hay que confirmarlo con conexión real.
- **Previsualización en el móvil**: el Service Worker, la instalación y la
  protección de datos solo funcionan en un «contexto seguro» (HTTPS o
  `localhost`). Si se abre la previsualización local desde el móvil con la IP
  del ordenador (`http://192.168.x.x:8080`), **esas funciones no estarán
  disponibles**. No es un fallo de la app. Probar offline e instalación en un
  móvil real exige HTTPS. Las opciones se explican en la guía de
  previsualización, y **la decisión es de la propietaria** (§7).
- **iOS**: Safari no implementa `beforeinstallprompt`; se instala a mano con
  «Compartir → Añadir a pantalla de inicio». Puede borrar datos de webs no
  instaladas tras semanas sin uso.

## 5. Bloques propuestos

| Bloque | Resuelve | Cambia arquitectura | Prioridad |
|---|---|---|---|
| **1. Previsualización = producción** | P5-1. `serve.mjs` aplica las cabeceras de `public/_headers` (las mismas que `netlify.toml`) y una prueba vigila que no se desincronicen | No: solo la herramienta local. La configuración de producción no se toca | P1 |
| **2. Mapas: descarga robusta y persistencia** | P5-2 a P5-8 | No: misma capa, mismo almacén `tiles` y mismas claves. Solo se valida lo que se guarda y se informa mejor | P1 |
| **3. Estados de carga y conexión** | P5-9 y reapertura tras cierre total | No | P2 |
| **4. Accesibilidad y uso en emergencia** | P5-10, árbol de accesibilidad de lo crítico, orden de foco en SOS, «Atrás» del navegador, letra XL | No | P2 |
| **5. Datos para pruebas en dispositivo real** | P5-11. «Información para pruebas» en Configuración, con botón de copiar | No | P2 |
| **6. Revisión profesional y guías** | Lista de contenidos para revisión profesional, guía de previsualización y verificación | No: solo documentación | — |

Cambios que tocan partes sensibles, justificados según lo pedido:

| Qué | Por qué | Qué podría romper | Cómo se comprueba |
|---|---|---|---|
| `serve.mjs` envía la CSP | Que la previsualización y las pruebas sean fieles a producción | Algo que hoy funciona en local sin CSP. La prueba de sincronización usa un Supabase simulado en `http://localhost:8151`, que la CSP real no permite | La suite completa bajo CSP. Para la prueba de sincronización, una variable explícita que desactiva la CSP **solo ahí**, documentada |
| Validar el tipo de imagen antes de guardar teselas | P5-5: evita guardar errores como si fueran mapas | Si el IGN sirviera teselas con un tipo inesperado, no se guardarían | Se acepta cualquier `image/*`. La prueba cubre imagen, XML y HTML. La confirmación con el IGN real queda pendiente de prueba real |
| Borrar una tesela guardada que no se puede dibujar | Que se vuelva a descargar en lugar de quedar en blanco para siempre | Nada más: solo afecta a teselas que ya no se ven | Prueba con una tesela dañada en IndexedDB |

## 6. Fuera de esta fase

- Revisión clínica y profesional de contenidos: solo se prepara la lista
  (`docs/REVISION-PROFESIONAL.md`). No se modifica ningún contenido.
- Despliegue en Netlify: solo tras la aprobación expresa.

## 7. Decisión que queda para la propietaria

Cómo probar en un móvil real lo que exige HTTPS: offline, instalación y
protección de datos. Las opciones están en `docs/FASE-5-PREVISUALIZACION.md`.
No se ha elegido ninguna, porque alguna implica publicar en un servidor.
