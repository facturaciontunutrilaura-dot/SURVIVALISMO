# FASE 5 — VERIFICACIÓN

Fecha: 29/09/2026 · Versión: **1.6.0** · Rama: `claude/nifty-gates-mhp1yu`
Diagnóstico: `docs/FASE-5-DIAGNOSTICO.md`
Guía de prueba para la propietaria: `docs/FASE-5-PREVISUALIZACION.md`
**Estado del despliegue: NO desplegado en Netlify.** Pendiente de aprobación
expresa.

---

## Objetivos

Preparar y verificar lo que quedó fuera de las fases 3 y 4:
- dispositivos reales;
- funcionamiento sin conexión real;
- accesibilidad real;
- mapas del IGN;
- robustez ante fallos.

Todo lo que no se puede comprobar en este entorno (sin móvil físico, sin
lectores de pantalla y sin acceso al servidor del IGN) queda como
**PENDIENTE DE PRUEBA REAL**, con instrucciones concretas.

## Bloques implementados

| Bloque | Commit | Resumen |
|---|---|---|
| Diagnóstico | `d909b33` | Qué se puede verificar aquí y qué no; 11 problemas concretos |
| 1. Previsualización = producción | `e99b7c1` | `serve.mjs` aplica las cabeceras de producción (CSP). **Encontró un fallo real:** la CSP bloqueaba el audio offline |
| 2. Mapas: descarga robusta y persistencia | `930ec8a` | Solo se guardan imágenes; teselas dañadas se reparan; descarga parcial, sin red o sin espacio explicada; estado según la conexión; capas en vivo |
| 3. Estados de carga y conexión | `2278f6b` | «Cargando…» accesible solo si tarda; cierre total y reapertura sin red |
| 4. Accesibilidad y emergencia | `8ad7d02` | Lectores de pantalla sin emojis en lo crítico; foco nunca tapado por las barras fijas |
| 5. Información para pruebas | `f6ddb02` | Informe técnico copiable en Configuración, sin datos personales |
| Revisión profesional | `81c12a4` | `docs/REVISION-PROFESIONAL.md`: lista de contenidos a revisar, sin modificarlos |
| Corrección de la auditoría | `49b12c6` | Contraste del resaltado de la búsqueda y prueba de contraste corregida |
| Versión 1.6.0 | `edcbc93` | Para que los dispositivos instalados reciban la actualización (README §7.1) |

## Cambios realizados

- **`tools/serve.mjs`**:
  - lee `public/_headers` y envía las mismas cabeceras que Netlify;
  - `SIN_CSP=1` solo para la prueba de sincronización.
- **`netlify.toml` y `public/_headers`**: **único cambio de configuración de
  producción**, `media-src 'self' blob:` en la CSP.

  | | |
  |---|---|
  | Qué | Añadir `media-src 'self' blob:` |
  | Por qué | Sin `media-src`, la CSP usa `default-src 'self'`, que bloquea los `blob:` con los que se reproduce el audio guardado offline. La función «Audio» no funcionaba en producción |
  | Qué podría romper | Nada. Solo permite reproducir audio generado por la propia app desde su almacenamiento; nada externo |
  | Cómo se comprobó | Prueba E2E de audio bajo la CSP real y prueba unitaria que exige `'self' blob:` sin orígenes externos |

- **`public/assets/js/maps.js`**:
  - `esImagen()` antes de guardar;
  - borrado de teselas que no se pueden dibujar;
  - descarga con parada por red o espacio y mensajes honestos;
  - estado del mapa con escucha de `online`/`offline`;
  - capas importadas en vivo.

  **Sin cambios** en proveedor, plantillas WMTS, claves de teselas ni
  almacén.
- **`public/assets/js/app.js`**:
  - indicador de carga (`#cargando`, `aria-busy`);
  - emojis críticos con `aria-hidden`;
  - bloque «Información para pruebas».
- **`public/assets/js/preparacion.js`**: `informeTecnico()` y
  `montarInforme()`.
- **`public/assets/css/app.css`**:
  - `scroll-padding` para las barras fijas;
  - estilo del indicador de carga;
  - resaltado de búsqueda (AA y subrayado).
- **`public/index.html`**:
  - iconos de la barra inferior con `aria-hidden`;
  - contenedor `#cargando`.
- **`public/data/content/index.js` y `public/sw.js`**: `VERSION = '1.6.0'`.
  El esquema de nombres de caché no cambia.
- **Pruebas**: `tools/test.mjs`, `tools/test-unit.mjs` y `tools/test-sync.mjs`
  (servidor sin CSP).
- **Documentación**:
  - `README.md`;
  - `docs/FASE-5-DIAGNOSTICO.md`;
  - `docs/REVISION-PROFESIONAL.md`;
  - `docs/FASE-5-PREVISUALIZACION.md`;
  - este documento;
  - `docs/AUDITORIA.md` (estado).

**No se ha tocado:**
- estrategia offline, nombres de caché (salvo el número de versión, que es su
  mecanismo) y actualización segura;
- sincronización y Supabase, URLs e IDs técnicos, estructura de datos;
- SOS y 112 (salvo el nombre accesible de los iconos), copias;
- contenido clínico.

## Tests

| | Antes (fin de la fase 4) | Después (fase 5) |
|---|---|---|
| Unitarias | 28 | **29** (cabeceras sincronizadas) |
| Aplicación E2E | 360 | **394** |
| Sincronización | 47 | **47** |
| **Total** | **435** | **470** |
| Correctas | 435/435 | **470/470** |

Las 34 pruebas E2E nuevas se reparten así:
- 14 de mapas;
- 7 de carga, cierre y conexión;
- 9 de accesibilidad y emergencia;
- 4 del informe técnico.

La prueba de audio ahora se ejecuta bajo la CSP real, y la de contraste
compone los fondos semitransparentes.

Comprobado que las pruebas nuevas detectan los problemas:
- con el `maps.js` anterior fallan 9 de las de mapas;
- sin `scroll-padding` falla la de foco tapado;
- con el CSS anterior falla la de contraste en 3 de los 4 temas;
- sin `media-src` falla la de audio.

**Warnings conocidos:**
- GitHub avisa de que `actions/checkout@v4` y `actions/setup-node@v4` usan
  Node 20 (obsoleto). No afecta al resultado.
- En CI, Node muestra `DEP0040 punycode` al terminar: aviso de una
  dependencia, sin efecto.

**Tests que no pueden ejecutarse aquí** (requieren dispositivo): los de la
sección «Pruebas pendientes en dispositivos reales».

## Auditoría visual

Se hizo con un script temporal (ya borrado) que cubrió **390 pantallas**:
- 13 pantallas: portada, SOS con datos vitales, ficha sanitaria, infarto,
  búsqueda con resultados, checklist, mapa con el panel de descarga,
  Familia, reunificación, Configuración con el informe, modo calma, plan
  familiar y «no encontrado»;
- **5 anchos**: 320, 375, 390, 430 y 1280 px;
- **2 temas**: normal y noche;
- **3 tamaños de letra**: normal, grande y extragrande.

| Medida | Primera pasada | Final |
|---|---|---|
| Desplazamiento horizontal | 0 | 0 |
| Texto fuera de pantalla o cortado | 0 | 0 |
| Controles < 44 px | 0 | 0 |
| Pantallas sin H1 | 0 | 0 |
| Texto por debajo de AA (con fondos compuestos) | **30 pantallas**: el resaltado de búsqueda | **0** |
| Violaciones de CSP / errores de página | 0 / 0 | 0 / 0 |

Además se revisaron capturas a 320, 390 y 1280 px en ambos temas.

## Auditoría funcional

| Área | Evidencia |
|---|---|
| Instalación | Chromium (`Page.getInstallabilityErrors`): el manifiesto no tiene errores y el único motivo es «in-incognito», propio del navegador de pruebas. **La instalación real queda pendiente de dispositivo** |
| Apertura y cierre total | ✅ se cierra la única pestaña y se abre sin red: portada, 112, SOS y datos guardados |
| Navegación | ✅ **Atrás del navegador**: una entrada por pantalla, ficha → SOS → portada; ✅ «←» vuelve a la misma posición (fase 3); ✅ carga lenta abandonada sin pintarse encima |
| Offline | ✅ prueba offline real; hosting caído; reapertura sin red; mapas descargados sin red tras cerrar |
| Pérdida de almacenamiento | ✅ pruebas de la fase 4 (IndexedDB y `localStorage` bloqueados) siguen en verde |
| Recuperación de conexión | ✅ el indicador y el estado del mapa se actualizan solos |
| Actualización | ✅ actualización interrumpida y segura (fase 4) en verde con la versión 1.6.0 |
| Copias y restauración | ✅ fase 4 en verde (corruptas, truncadas, todo o nada) |
| SOS y 112 | ✅ `tel:112` con nombre accesible; barra fija; separación de la barra inferior ≥ 4 px en 320, 375 y 430 px |
| Mapas | ✅ 14 pruebas con servidor del IGN **simulado** (ver apartado Mapas IGN) |
| Sincronización | ✅ 47/47 |
| Errores | ✅ el fallo del motor de mapas no bloquea SOS; error y 404 con 112/SOS |

## Accesibilidad

Verificado técnicamente con el árbol de accesibilidad de Chromium y con
teclado:
- **Nombres de lo crítico:**
  - barra inferior «Inicio, SOS, Familia, Mapa, Buscar», sin emojis;
  - «Llamar al 112, teléfono de emergencias» (enlace `tel:112`);
  - «Mi posición para dar al 112» y «Mis datos vitales».
- **Orden de foco en SOS:** saltar al contenido, volver, buscar, 112, mi
  posición, datos vitales.
- **Foco:**
  - nunca queda tapado por las barras fijas: comprobado con 45 pulsaciones de
    Tab en 3 pantallas largas;
  - foco visible de 3 px;
  - el foco va al título al cambiar de pantalla (fase 4).
- **Títulos:** H1 en todas las pantallas (390 de 390 en la auditoría).
- **Estados dinámicos:**
  - «Cargando…» con `role=status` y `aria-busy`;
  - avisos con `aria-live`;
  - el estado del mapa es `role=status`.
- **Texto grande:** letra XL a 320 px sin desbordes y con controles ≥ 44 px
  en 10 pantallas; auditoría en 3 tamaños × 5 anchos.
- **Contraste:** AA en 4 temas, ahora componiendo fondos semitransparentes.
- **Sin depender del color:**
  - lo crítico, con texto (fase 3);
  - el resaltado de búsqueda, también en negrita y subrayado.

**PENDIENTE DE PRUEBA REAL:** VoiceOver (iOS) y TalkBack (Android). Lectura,
gestos, anuncio del cambio de pantalla y de «Cargando…».

## Mapas IGN

- **Implementado y probado con servidor simulado:**
  - carga online;
  - descarga con validación de imagen;
  - descarga parcial;
  - corte de red a mitad;
  - sin espacio;
  - persistencia en IndexedDB;
  - **reapertura tras cerrar la app sin red, viendo las teselas guardadas**;
  - reparación de teselas dañadas;
  - capas importadas en vivo;
  - fallo del motor de mapas sin afectar a SOS.
- **Limitación técnica documentada:** el entorno de desarrollo no puede
  conectarse a `www.ign.es`.
- **PENDIENTE DE PRUEBA REAL**, las pruebas D13–D18 de la guía:
  - que el IGN permita leer las teselas desde JavaScript (CORS);
  - formato `image/jpeg`;
  - zooms nativos;
  - descarga real y vista sin red.

  **Se puede hacer desde el ordenador de la propietaria con la
  previsualización local**, sin publicar nada.

## Pruebas pendientes en dispositivos reales

Todas: **PENDIENTE DE PRUEBA REAL**. Pasos y resultado esperado en
`docs/FASE-5-PREVISUALIZACION.md`, parte 3.

| Área | Android | iPhone |
|---|---|---|
| Botón o gesto Atrás | Pendiente | Pendiente (gesto de borde) |
| `tel:112` abre el marcador sin llamar | Pendiente | Pendiente |
| Teclado virtual en buscador y formularios | Pendiente | Pendiente |
| Uso con una mano (112, «Deshacer») | Pendiente | Pendiente |
| TalkBack / VoiceOver | Pendiente | Pendiente |
| Letra grande del sistema | Pendiente | Pendiente |
| Modo noche en OLED | Pendiente | Pendiente |
| Instalación como app | Pendiente (cable USB, opción A) | Pendiente (requiere https) |
| Offline real, cerrar y reabrir | Pendiente (opción A) | Pendiente (requiere https) |
| Protección de datos (`persist`) | Pendiente (opción A) | Pendiente (requiere https) |
| Importar copia desde «Archivos» | — | Pendiente |
| Mapas IGN reales | Pendiente | Pendiente |

## Revisión profesional pendiente

`docs/REVISION-PROFESIONAL.md`:
- **infarto e ictus** (siguen `revision: 'pendiente'`, sin cambios);
- primeros auxilios del modo SOS;
- potabilización (incluida la **calculadora de cloración**);
- setas y plantas;
- alimentación y calorías;
- salud mental.

**No se ha modificado ningún contenido clínico.**

## Problemas encontrados y solucionados

| # | Problema | Cómo se encontró | Solución |
|---|---|---|---|
| 1 | **La CSP de producción bloqueaba el audio offline** | Al ejecutar las pruebas bajo la CSP real (bloque 1) | `media-src 'self' blob:` más dos pruebas |
| 2 | Descarga parcial presentada como completa | Diagnóstico y prueba (9 fallan con el código anterior) | Mensajes honestos y reintento sin repetir lo guardado |
| 3 | Descarga sin red o sin espacio: fallos silenciosos | Diagnóstico y prueba | Parada con explicación; lo guardado se conserva |
| 4 | Errores del servidor guardados como teselas «para siempre» | Diagnóstico y prueba | Validación de imagen y reparación al dibujar |
| 5 | «Recarga el mapa para verla» | Pendiente M4 de la auditoría inicial | Capas en vivo |
| 6 | Foco de teclado tapado por la barra del 112 (tarjeta «Ictus») | Prueba nueva | `scroll-padding` |
| 7 | Lectores de pantalla leían emojis en lo crítico | Árbol de accesibilidad | `aria-hidden` en los iconos |
| 8 | **Resaltado de búsqueda por debajo de AA** (3,0–4,0:1) | **Auditoría final** | Texto principal, negrita y subrayado; fondo más suave en modo noche |
| 9 | La prueba de contraste ignoraba fondos semitransparentes | Al investigar el punto 8 | Composición de capas en la prueba |
| 10 | La previsualización y las pruebas no reproducían las cabeceras de producción | Diagnóstico | `serve.mjs` con `_headers`, más una prueba anti-desincronización |

## Problemas conocidos

- **Previsualización en el móvil por wifi** (`http://IP:8080`): sin https no
  se puede instalar ni usar sin conexión. Es una limitación de los
  navegadores, no de la app. Alternativas en la guía; **la decisión es de la
  propietaria**.
- **CORS del IGN sin confirmar**: si el IGN no lo permite, los mapas se ven
  con conexión pero no se pueden guardar. La app lo dice claramente.
- iOS no ofrece botón de instalación: se instala a mano (Compartir → Añadir
  a pantalla de inicio). La app da las instrucciones.

## Estado de la previsualización

- Comando comprobado: **`npm start`** (equivale a `node tools/serve.mjs`;
  también `npm run dev`). No necesita `npm install`.
- Dirección: **http://localhost:8080**. Responde 200, sirve la versión 1.6.0
  y envía la CSP de producción.
- Es **exactamente el código** que se desplegaría: la carpeta `public/`, sin
  build distinto.

## Condiciones para aprobar el despliegue

1. La propietaria prueba la previsualización (guía, partes 2 y 3) y da su
   **aprobación expresa**.
2. Las pruebas de mapas D13–D18 con el IGN real, desde el ordenador: si
   fallan por CORS, decidir antes de publicar.
3. Los ❌ que aparezcan en las pruebas reales, corregidos o aceptados
   expresamente.
4. `npm test` y el CI de GitHub en verde sobre el commit que se despliegue.
5. Recordar al publicar: el cambio de CSP (`media-src`) está en `netlify.toml`
   y `public/_headers`.

---

### CI de GitHub

_Se completa tras el push de este documento._
