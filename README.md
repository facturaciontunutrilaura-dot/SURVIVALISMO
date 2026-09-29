# SUPERVIVENCIA

*Herramientas de preparación y emergencia offline.* (Nombre técnico del proyecto y del paquete: `survival-offline`.)

**Manual de campo offline de supervivencia, autoprotección, preparación ante emergencias y bushcraft para España. Incluye además una guía provincial detallada de Ávila.**

Aplicación web progresiva (PWA) sin dependencias externas en tiempo de ejecución. Se instala una vez con Internet y, a partir de ese momento, funciona íntegramente sin conexión: contenido, buscador, brújula, mapas vectoriales, checklists, calculadoras, cursos y plan familiar.

---

## 1. Arranque rápido

```bash
npm install          # instala leaflet, es-atlas y topojson-client (solo para el build)
npm run build        # genera geodatos, iconos y el manifiesto de precache
npm run dev          # servidor local en http://localhost:8080
npm test             # 349 pruebas: 26 unitarias (buscador, datos, build, mapas, portada) + 276 end-to-end de app + 47 de sincronización, incluida la prueba offline real
```

No hay bundler, ni transpilador, ni framework. El directorio `public/` es la
aplicación tal cual se despliega.

> **HTTPS obligatorio en producción.** El Service Worker, la geolocalización y
> el magnetómetro solo funcionan en contextos seguros (`https://` o `localhost`).

---

## 2. Estructura del proyecto

```
survival-offline/
├── netlify.toml                 Despliegue con Git: build, cabeceras, CSP, cache-control
├── PUESTA-EN-MARCHA.md          Guía paso a paso con enlaces (publicar, instalar, respaldar)
├── package.json
├── tools/
│   ├── build-geo.mjs            Genera los GeoJSON offline desde es-atlas (IGN)
│   ├── build-assets.mjs         Genera iconos PNG y precache-manifest.json
│   ├── serve.mjs                Servidor estático de desarrollo
│   ├── test-unit.mjs            Pruebas unitarias sin navegador (node:test): buscador, datos, build
│   ├── test.mjs                 Suite end-to-end de la app (Playwright)
│   └── test-sync.mjs            Suite de sincronización (Supabase simulado)
└── public/                      ← esto es la app; es lo que se publica
    ├── index.html               App shell
    ├── manifest.webmanifest     Manifiesto PWA + atajos
    ├── sw.js                    Service Worker
    ├── precache-manifest.json   Lista de recursos generada en el build
    ├── _redirects               Fallback SPA para despliegues arrastrar-y-soltar
    ├── _headers                 Cabeceras para despliegues arrastrar-y-soltar
    ├── icons/                   Iconos generados
    ├── assets/
    │   ├── css/app.css          Hoja de estilos única (tema campo + modo noche)
    │   ├── js/
    │   │   ├── app.js           Router y vistas
    │   │   ├── store.js         IndexedDB + localStorage + export/import
    │   │   ├── ui.js            Helpers de render
    │   │   ├── calc.js          8 calculadoras
    │   │   ├── compass.js       Brújula (magnetómetro + modo manual)
    │   │   ├── maps.js          Leaflet, capas offline y caché de teselas
    │   │   ├── sync.js          Sincronización opcional con Supabase (REST, sin SDK)
    │   │   ├── juegos.js        Tres en raya, memory, reto y modo calma
    │   │   ├── riesgos.js       Fichas de riesgo 2026–2036 y comparador
    │   │   └── familia.js       Centro familiar, rutas y modo sin Internet
    │   └── vendor/leaflet/      Leaflet 1.9 servido localmente (nunca CDN)
    └── data/
        ├── content/             Base de conocimiento (módulos ES)
        └── geo/                 GeoJSON offline derivados del IGN
```

---

## 3. Cómo funciona el modo offline

### 3.1 Las tres capas de persistencia

| Capa | Qué guarda | Tecnología |
|---|---|---|
| Precache | App shell, JS, CSS, contenido, geodatos, iconos | Cache API vía Service Worker |
| Datos del usuario | Puntos, contactos, checklists, frecuencias, radio log, progreso, capas GeoJSON | IndexedDB |
| Ajustes | Tema, contraste, tamaño de texto, config de sync | localStorage |
| Teselas de mapa | Imágenes de mapa descargadas por el usuario | IndexedDB (Blob) |

### 3.2 Ciclo de vida

1. **Primera visita con Internet.** El Service Worker se instala y precachea el
   app shell completo (~0,9 MB): HTML, CSS, todos los módulos JS, toda la base
   de conocimiento y los cuatro GeoJSON del IGN.
2. **Refuerzo manual.** En `⚙️ Configuración → Descargar todos los recursos` se
   lee `precache-manifest.json` y se añade a la caché cualquier recurso que
   faltara. Ahí mismo se solicita almacenamiento persistente al navegador para
   que no se purgue por presión de espacio.
3. **Descarga de mapas.** En `🗺 Mapa → Descargar área` el usuario elige el área
   visible y el rango de zoom, y las teselas se guardan en IndexedDB.
4. **Sin Internet.** Todo sigue funcionando. El Service Worker sirve desde
   caché, la app lee de IndexedDB, y el mapa muestra la capa vectorial del IGN
   más las teselas descargadas.

**¿Está lista tu app?** (`⚙️ Configuración`, fase 4). Comprueba el estado
real del dispositivo:
- cada archivo del manifiesto está en caché y no está dañado (por ejemplo, el
  HTML del hosting guardado en lugar de un módulo JS), con botón «Reparar»;
- si el navegador protege los datos frente al borrado automático. Se pide solo
  la primera vez que se guarda un dato propio;
- si la app está instalada: botón en Android, instrucciones en iOS;
- fecha de la última copia de seguridad y si hay cambios posteriores.

En la portada solo aparece un aviso, debajo de SOS, cuando algo requiere
atención. Si faltan archivos, siempre; lo demás se puede posponer 7 días con
«Ahora no».

**Si el navegador no deja guardar datos** (navegación privada, memoria llena,
datos de sitios bloqueados), la app no muestra un error técnico:
- las pantallas que guardan información (checklists, plan familiar) explican
  qué ha pasado, qué sigue funcionando, qué no y qué hacer, con el 112, SOS y
  «Reintentar» a un toque;
- SOS, el manual, el buscador, el modo calma y el mapa (sin puntos ni
  descargas) funcionan;
- Configuración abre;
- la portada avisa.

Si el almacenamiento no responde en 6 s, se trata como no disponible.

### 3.3 Estrategias del Service Worker

- **Navegaciones**: **caché primero** con revalidación en segundo plano. Es una
  decisión deliberada, explicada en §3.5.
- **Recursos propios**: caché primero, con relleno desde red y almacenamiento en
  la caché de runtime.
- **Terceros** (teselas de mapa): el Service Worker no interviene; las gestiona
  la propia aplicación con IndexedDB.
- **Versionado**: la constante `VERSION` de `sw.js` nombra las cachés. Al
  cambiarla, la activación borra las anteriores. Si no hay Internet, se conserva
  la versión instalada y la app sigue funcionando con ella.
- **Actualización segura** (fase 4):
  - una versión nueva solo se instala si **todos** sus recursos se descargan
    bien. Un fallo de red, un 404 o el `index.html` que devuelve el hosting en
    lugar de un archivo que falta hacen fallar la instalación;
  - si falla, no se escribe ni se borra ninguna caché y la versión anterior
    sigue completa, también sin conexión;
  - ya instalada, la versión nueva **espera**. Arriba aparece «Hay una versión
    nueva… Actualizar ahora», que no se muestra en las pantallas de emergencia.
    Se aplica al pulsarlo o la próxima vez que se abra la app, nunca a mitad
    de uso;
  - si otra pestaña la aplica, esta ofrece «Recargar» en vez de recargarse
    sola.

### 3.4 Comprobación manual del modo offline

1. Abre la app con Internet y espera a que cargue del todo.
2. Ve a `⚙️ Configuración → Descargar todos los recursos`.
3. Opcional: `🗺 Mapa → Descargar área` sobre tu zona.
4. Activa el modo avión (o desactiva la red en DevTools → Network → Offline).
5. Recarga la página.
6. Debe cargar la portada, el modo emergencia, el buscador, el mapa vectorial,
   los checklists y las calculadoras. El indicador **SIN CONEXIÓN** aparece
   arriba a la derecha.

`npm test` automatiza exactamente esta secuencia.

### 3.5 Qué pasa si el alojamiento se cae

**La app sigue funcionando.** Una vez instalada, el servidor deja de ser parte
de la cadena crítica: el Service Worker responde desde la caché local y el
contenido, los geodatos y los datos del usuario están en el dispositivo.

Esto exigió elegir **caché primero también para las navegaciones**. Con la
estrategia habitual de *red primero*, hay tres formas de fallo silencioso:

| Fallo del hosting | Con "red primero" | Con "caché primero" |
|---|---|---|
| Servidor apagado / DNS caído | `fetch` falla → cae a caché. Funciona, pero tras esperar al *timeout* | Arranque inmediato |
| Servidor devolviendo **5xx** | `fetch` **tiene éxito** con un 502 → se muestra la página de error del proveedor | Arranque inmediato; el 5xx se ignora |
| Servidor muy lento | El usuario espera con la pantalla en blanco | Arranque inmediato |

El caso del 5xx es el peligroso: técnicamente la petición no falla, así que un
Service Worker ingenuo sirve la página de error justo cuando más falta hace la
app. `npm test` cubre los tres escenarios (servidor apagado y servidor
devolviendo 500 con Internet disponible en el dispositivo).

Las actualizaciones siguen llegando igual: el navegador comprueba `sw.js` en
cada navegación y, si hay versión nueva, la instala y se aplica al siguiente
arranque.

**Lo único que el hosting sí condiciona:**

- **La primera instalación.** Si el sitio está caído y el usuario nunca ha
  abierto la app, no hay nada que cachear.
- **Descargar teselas de mapa nuevas** (dependen de los servicios WMTS del
  IGN, no de Netlify).
- **Recibir actualizaciones de contenido.**

**Redundancia recomendada** (todo gratuito y de cinco minutos):

1. Despliega el mismo `public/` en un segundo host — Cloudflare Pages, GitHub
   Pages, Vercel — como espejo. Es una carpeta estática, no hay backend que
   replicar. Ojo: cada origen tiene su propia caché e IndexedDB, así que exporta
   e importa tus datos si cambias de dominio.
2. Guarda el `.zip` del proyecto. Con `npm run dev` (o cualquier servidor
   estático) lo levantas en local. *No sirve abrir `index.html` con doble clic:
   los módulos ES y el Service Worker requieren `http(s)://`, no `file://`.*
3. Añade la app a la pantalla de inicio del móvil. Además de mejorar el arranque,
   reduce el riesgo de que el navegador (sobre todo Safari) purgue el
   almacenamiento de sitios poco visitados.
4. Exporta tus datos e imprime el plan familiar. El papel no depende de nadie.


---

## 3 bis. Persistencia y sincronización

### 3.6 Qué se guarda y dónde (v1.2)

Todo lo que edita el usuario vive en **IndexedDB**, en su dispositivo. Se guarda
igual con conexión que sin ella, y **sobrevive a las actualizaciones de la app**:
el Service Worker solo renueva la caché de archivos; la base de datos no se toca.
Hay una prueba automatizada que lo verifica simulando un salto de versión.

| Almacén | Contenido | ¿Se sincroniza? |
|---|---|---|
| `kv` | Plan familiar, nodos, estados, verificaciones de riesgo, estadísticas de juegos | Sí |
| `checks` | Marcas y caducidades de los checklists | Sí |
| `puntos` | Puntos personales del mapa | Sí |
| `contactos` | Contactos del plan familiar | Sí |
| `frecs` | Frecuencias añadidas por el usuario | Sí |
| `radiolog` | Registro de escuchas de radio | Sí |
| `geo` | Capas GeoJSON importadas | Sí (se omiten las mayores de ~900 KB) |
| `progreso` | Progreso de los cursos | Sí |
| `tombstones` | Registro de borrados, para propagarlos | Interno |
| **`tiles`** | **Teselas de mapa descargadas** | **No, a propósito** |
| `localStorage` | Tema, contraste, tamaño de texto, config de sync | No |

Las teselas quedan fuera porque son decenas de megas de imágenes que se pueden
volver a descargar y que reventarían cualquier cuota razonable de base de datos.

### 3.7 Sincronización con Supabase (opcional)

**Es opcional y local-first.** Si no se configura, el módulo ni siquiera se
carga. IndexedDB sigue siendo la fuente de verdad y Supabase es solo un espejo:
si Supabase cae, si no hay red o si el hosting desaparece, la app funciona
exactamente igual.

**Sin SDK.** Se habla con Supabase por su API REST (GoTrue para autenticación,
PostgREST para datos) usando `fetch`. Ahorra ~120 KB de dependencia y mantiene
la regla del proyecto de no cargar librerías externas en tiempo de ejecución.

**Modelo de datos.** Una sola tabla `sync_items` con clave primaria
`(user_id, store, item_id)` y el registro en una columna `jsonb`. Así los datos
son legibles y editables desde el Table Editor de Supabase, que era el requisito.
La protección la da la política **RLS** (`auth.uid() = user_id`), no la clave
anónima —que está diseñada para ser pública y viajar en el navegador—.

**Ciclo de sincronización.**
1. **Bajar** las filas con `updated_at` posterior al cursor guardado.
2. **Resolver**: si un registro se ha tocado en local desde la última
   sincronización correcta, gana el local; si no, se aplica el remoto.
3. **Subir** todo lo modificado en local, en lotes de 200.
4. **Guardar cursores**: `cursor` = mayor `updated_at` recibido (hora del
   servidor, no del dispositivo, para no depender de relojes desajustados).

**Borrados.** Un borrado escribe una *lápida* en el almacén `tombstones`. Sin
ella, borrar un contacto en el móvil y sincronizar con el portátil lo haría
reaparecer. Las lápidas se limpian una vez subidas.

**Conflictos.** Last-write-wins con preferencia local: si editas lo mismo en dos
dispositivos sin sincronizar entre medias, gana el que sincronice más tarde. La
interfaz lo dice explícitamente y el resumen de cada sincronización informa de
cuántos conflictos se han resuelto.

**Qué cubre `npm run test:sync`.** Levanta un servidor que imita la API de
Supabase y dos contextos de navegador independientes —dos dispositivos— y
comprueba: alta de sesión, subida, bajada, ida y vuelta de ediciones,
propagación de borrados, resolución de conflictos, exclusión de las teselas,
escritura sin red, subida de lo pendiente al recuperar la conexión y error
legible con credenciales incorrectas.

**Diagnóstico integrado.** ⚙️ Configuración → Sincronización → **🩺 Comprobar
configuración** verifica capa por capa: formato de la URL (acepta también
instancias autoalojadas), tipo de clave, respuesta del proyecto, existencia de
la tabla, **que la política RLS esté realmente activa**, sesión y una escritura
y lectura reales de prueba. Cada fallo viene con la acción concreta que hay que
hacer. Dos comprobaciones son de seguridad y merecen mención aparte:

- Si se pega por error una clave `sb_secret_…` o `service_role`, la app lo
  detecta, se niega a seguir y avisa de que hay que revocarla.
- Si la RLS no está activa, la app lo descubre comprobando que sin sesión no se
  devuelve ninguna fila. Es el fallo de configuración más peligroso y el más
  fácil de no notar, porque **la sincronización funcionaría igual de bien** con
  los datos abiertos a cualquiera que tuviera la clave pública.

**Cabeceras.** `netlify.toml` y `public/_headers` incluyen
`https://*.supabase.co` en `connect-src`. Si usas un dominio propio para
Supabase, añádelo ahí o el navegador bloqueará las peticiones.

---

## 4. Arquitectura de mapas: decisión técnica

El requisito era mapas offline sin depender de Google Maps ni de APIs online.
Se evaluaron cuatro opciones:

| Opción | Ventajas | Por qué se descartó / adoptó |
|---|---|---|
| **MBTiles en el navegador** | Formato estándar, un solo archivo | Es SQLite: exige cargar `sql.js` (~1,5 MB de WASM) y mantener el fichero en memoria. Frágil con archivos grandes en móviles de gama media. **Descartado.** |
| **PMTiles** | Diseñado para servir sin backend | Depende de peticiones HTTP Range. Sin servidor no hay rangos; guardar el archivo entero en IndexedDB y trocearlo a mano añade mucha complejidad para el mismo resultado. **Descartado.** |
| **Vectorial completo (MVT) de España** | Escala infinita, ligero por tesela | Un juego completo de España ronda varios GB. Inviable para una instalación de móvil. **Descartado.** |
| **Vectorial ligero + caché ráster por área** | Base siempre disponible, peso mínimo, sin dependencias | **Adoptado.** |

### Lo que se ha implementado

**a) Capa base vectorial, siempre offline (≈390 KB).**
GeoJSON de provincias, comunidades autónomas y los 248 municipios de la
provincia de Ávila, derivados del Equipamiento Geográfico de Referencia Nacional
del IGN a través del paquete `es-atlas` (licencia MIT). Va en el precache: está
disponible desde la primera carga, sin conexión y sin que el usuario haga nada.
Sirve para situarse a escala provincial y municipal, que es la escala en la que
se toman decisiones de evacuación.

**b) Teselas ráster bajo demanda, guardadas en IndexedDB.**
Una subclase de `L.TileLayer` intercepta `createTile`, busca la tesela en
IndexedDB y, si no está y hay red, la descarga y la guarda. El descargador de
área calcula las teselas del *bounding box* visible para un rango de zoom, con
estimación previa de número y tamaño, y un límite duro de 3.000 teselas por
descarga para no saturar el servicio público.

Fuentes configuradas: los servicios **WMTS del Instituto Geográfico Nacional**
(rejilla `GoogleMapsCompatible`, la misma de Leaflet), de uso libre con
atribución (CC BY 4.0):

| Capa | Servicio | Zoom nativo |
|---|---|---|
| Mapa base | `ign-base` · `IGNBaseTodo` | 17 |
| Mapa topográfico (MTN, curvas de nivel) | `mapa-raster` · `MTN` | 16 |
| Ortofoto PNOA | `pnoa-ma` · `OI.OrthoimageCoverage` | 19 |

Por encima del zoom nativo Leaflet amplía la última tesela en vez de pedir
teselas inexistentes, y el descargador no baja niveles que no existen. Si el
servidor no permite leer la tesela desde JavaScript (CORS), se muestra igualmente
como imagen, aunque sin guardarla.

**El mapa nunca queda en blanco.** Si en la vista actual no llega ninguna
tesela (sin descargar, sin conexión, servidor caído o bloqueado), la capa
vectorial se rellena automáticamente y la barra de estado lo explica. Antes esto
solo ocurría sin conexión; con conexión pero sin teselas el mapa quedaba vacío.

Las teselas de versiones anteriores (OpenStreetMap / OpenTopoMap) ya no se
muestran: el mapa ofrece borrarlas para liberar espacio.

> **PENDIENTE DE VERIFICAR EN UN DISPOSITIVO REAL.** Las pruebas automáticas
> simulan el servidor del IGN (el entorno de pruebas no tiene acceso a
> `www.ign.es`). Comprobado por código: plantillas WMTS bien formadas, CSP,
> atribución y comportamiento cuando las teselas fallan. Falta confirmar con
> conexión real, en móvil y en el dominio publicado:
> 1. Que las tres capas se ven (mapa base, MTN, PNOA) en `🗺 Mapa`.
> 2. Que **Descargar área** guarda teselas (el contador sube). Si todas fallan,
>    el IGN no permite leerlas desde JavaScript (CORS) y solo se verían con
>    conexión; habría que buscar otra vía antes de darlo por bueno.
> 3. Que, en modo avión, la zona descargada se sigue viendo.
> 4. Que los zooms máximos (`nativo` en `TILE_SOURCES`) son correctos: si a
>    ese zoom aparecen teselas en blanco o de error, hay que bajarlo.
> 5. Que el formato `image/jpeg` es el que sirve cada capa.

**c) Capas GeoJSON y GPX importables.**
El usuario puede descargar capas oficiales (zonas inundables de las
confederaciones hidrográficas, cartografía de riesgo autonómica, capas del
IGN…) o trazas GPX e importarlas desde `🗺 Mapa → Capas`. El GPX se convierte a
GeoJSON en el propio navegador, sin dependencias. Se guardan en IndexedDB y
quedan disponibles offline.

### Limitaciones reconocidas

- **No se incluyen capas oficiales de riesgo** (zonas inundables, peligrosidad
  sísmica). Esos datos tienen condiciones de uso propias y un peso considerable;
  la app aporta el mecanismo de importación en vez de redistribuirlos.
- **No hay curvas de nivel offline por defecto**: llegan a través de las
  teselas del mapa topográfico (MTN) que el usuario descargue.
- **Descargas grandes.** El servicio WMTS es para consulta. Para cartografía de
  provincias enteras, el IGN ofrece descargas completas en su Centro de
  Descargas (centrodedescargas.cnig.es).
- **La app nunca etiqueta un lugar como “refugio seguro”.** Usa categorías
  neutras (infraestructura sanitaria, transporte, abastecimiento, recurso
  público, posible punto de encuentro, ubicación introducida por el usuario).

---

## 4 bis. Novedades de la versión 1.1

Cuatro bloques nuevos, integrados en la arquitectura existente (mismo router,
mismo sistema de diseño, mismo Service Worker, mismo almacenamiento local).
**Ninguna funcionalidad anterior se ha modificado ni retirado.**

### 4.1 · Psicología → Juegos offline y Modo Calma  (`#/sec/juegos`)

- **Tres en raya** — 2 jugadores o contra IA. La IA usa minimax con poda alfa-beta:
  en modo difícil es imbatible; en fácil falla a propósito. Estadísticas locales.
- **Memory de supervivencia** — 6/8/12 parejas con cartas temáticas (brújula,
  fuego, agua, refugio, mapa…). Modo 1 jugador con récord de intentos y modo
  2 jugadores por turnos con marcador.
- **Reto de supervivencia** — 47 preguntas en 10 categorías y 3 niveles de
  dificultad. Cada respuesta lleva explicación, y **ninguna contradice al
  manual**: las respuestas correctas son las mismas pautas que da la app.
- **Modo Calma** — cuatro patrones de respiración guiada con temporizador
  visual (anillo que se expande y contrae en tiempo real), cinco ejercicios de
  grounding —incluido uno de grupo y uno para niños— y aviso explícito de que
  no es un tratamiento médico, con las líneas 024 y 112.

### 4.2 · Riesgos 2026 → 2036  (`#/sec/riesgos`)

21 riesgos en cinco categorías. Ámbitos: **MI ZONA** (por defecto), España y
Europa. La provincia de Ávila tiene evaluación propia, que se muestra dentro de
MI ZONA cuando el usuario está en ella (ver `ZONAS_PROVINCIALES` en
`data/content/riesgos.js`; es el sitio donde añadir evaluaciones de otras
provincias).

Lo que hace que esta sección sea defendible:

| Elemento | Qué aporta |
|---|---|
| **Tipo de evidencia** | Cada ficha declara si se apoya en estadística, proyección científica, evaluación oficial o si hay incertidumbre alta |
| **Nivel** | Escala cualitativa 🟢🟡🟠🔴🟣, con la advertencia de que **no es una probabilidad** |
| **Confianza** | ★☆ de 1 a 5, visible en cada ficha y en el comparador |
| **Tendencia** | ⬆️ ➡️ ⬇️ |
| **Bloques separados** | SITUACIÓN ACTUAL / PROYECCIÓN 2030 / PROYECCIÓN 2036, visualmente distintos y nunca mezclados |
| **Escenarios** | 🟢 favorable / 🟡 intermedio / 🔴 adverso, con los indicadores concretos que habría que vigilar |
| **Gráfica** | Banda 2026–2036 entre escenario favorable y adverso, dibujada **solo** donde hay proyección científica |
| **Verificación propia** | El usuario puede anotar el nivel que él mismo verifique; se guarda local y aparece marcado como "tuyo" |

**Regla dura aplicada:** cero porcentajes. Hay una prueba automatizada que
falla si aparece cualquier patrón `\d{1,3} %` dentro de una ficha de riesgo.
Donde no hay base, la ficha dice *"NO EXISTE UNA ESTIMACIÓN FIABLE"* y ofrece
escenarios en su lugar. Los riesgos geopolíticos no llevan gráfica.

**Comparador de ubicaciones** (`#/riesgos/comparar`). Compara las ubicaciones
que el usuario configura en el centro familiar, usando la provincia de cada una.
Donde la app tiene evaluación provincial propia muestra su nivel; donde no,
**no inventa un nivel**: indica si la comunidad autónoma tiene plan especial de
protección civil ante ese riesgo (hecho administrativo comprobable, tomado de
`territorios.js`) y, como referencia, el nivel de ámbito España.

Lo que sigue sin contrastar aparece marcado como **"pend."** en el comparador.

### 4.3 · Centro de coordinación familiar  (`#/sec/familia`)

**Configurable por cada usuario. La aplicación no distribuye ninguna ubicación,
persona ni ruta.** Al entrar por primera vez se ofrece añadir la casa propia o
cargar un **ejemplo ficticio** (marcado como tal, sin coordenadas y borrable con
un botón).

- **Ubicaciones**: una **base** (desde donde se parte) y las de familia que se
  quieran. Cada una con nombre, quién vive, icono, provincia (código INE),
  municipio, teléfonos, dirección, punto de encuentro, notas, personas (adultos,
  niños, mayores, mascotas) y posición opcional en el mapa (a mano o por GPS).
  Se recomienda usar un punto de referencia público, no el portal exacto: si se
  activa la sincronización, la posición viaja con el resto del plan.
- **Estado familiar manual** 🟢🟡🔴⚫ con marca de tiempo, más estado de
  preparación por ubicación. La app no intenta deducir el estado real de nadie.
- **Plan 72 h** que calcula agua, alimento, medicación, energía, documentación
  y el resto a partir de las personas de cada ubicación.
- **Plan de reunificación** con un punto por ubicación (A, B, C…) y puntos
  alternativos, más las siete preguntas que hay que responder en familia.
- **Modo "Si no hay Internet"**: simulador con cuatro interruptores e inventario
  en vivo de lo que hay guardado en el dispositivo.
- **Mapa familiar** con las ubicaciones que tienen posición y las trazas de ruta
  importadas, sobre cartografía del IGN.

Los datos de versiones anteriores se migran solos: la provincia que se guardaba
como texto se convierte en código INE.

### 4.4 · Rutas por situación  (`#/familia/rutas`)

Cada ubicación de familia tiene sus **rutas definidas por el usuario**
(principal y alternativas): nombre, vías, km por carretera, notas y,
opcionalmente, la **traza real importada en GPX o GeoJSON** (exportada de
BRouter, OSRM, Graphhopper o cualquier navegador). Al importar la traza se
calcula su longitud y se propone como distancia si no se había anotado.

Se combinan con **12 situaciones** (normal, incendio, inundación, nieve,
temporal, apagón, disturbios, químico, radiológico, médica, sin comunicaciones y
emergencia en carretera). Cada combinación cambia qué ruta elegir y por qué, la
velocidad media de planificación (y por tanto el tiempo estimado), las
comprobaciones antes de salir, las advertencias y los puntos de interés
prioritarios. Si hay posición en ambos extremos se muestra también la distancia
en línea recta, marcada como tal.

El botón **❤️ QUIERO LLEGAR A MI FAMILIA** es un asistente de tres preguntas
—a quién, en qué sentido, en qué situación— que genera el plan completo.

**Lo que NO es.** No es navegación turn-by-turn: eso exigiría la red viaria
completa más un motor de routing (cientos de MB), inviable en una PWA. La app
tampoco dibuja rutas que el usuario no haya importado: no inventa trazados.

**Puntos de interés.** La app **no incluye** un directorio de hospitales,
gasolineras, farmacias ni alojamientos con coordenadas, porque no ha sido
posible verificarlos contra una fuente oficial en formato de datos. El usuario
puede añadir sus propios puntos e importar capas oficiales.

**Aviso permanente en la interfaz:** las rutas son una referencia de
planificación; el estado de cualquier vía es DESCONOCIDO hasta que se verifique
y prevalecen siempre las instrucciones de las autoridades.

---

## 4 quater. Paleta "Military Camo"

El sistema de color se reconstruyó a partir de una paleta de 30 tonos aportada
por el usuario, extraída con precisión del PDF original. Los tonos exactos de la
paleta se usan directamente en acentos, líneas y semántica; para los fondos y el
texto se derivaron tintes y sombras que garantizan contraste suficiente en uso
de campo.

| Rol | Color | Origen |
|---|---|---|
| Verde bosque (primario) | `#565E35` | Paleta, fila 3 |
| Oliva | `#6C6644` | Paleta, fila 1 |
| Verde claro (titulares) | `#A1A265` | Paleta, fila 4 |
| Caqui | `#A69C67` | Paleta, fila 1 |
| Arena | `#BAA37A` | Paleta, fila 1 |
| Pizarra verdosa | `#56594E` | Paleta, fila 1 |
| Óxido (crítico) | `#9E4B31` | Derivado de `#835637` / `#724734` |
| Cobre (importante) | `#B07A45` | Derivado de `#996D4A` |
| Beige (texto) | `#C5B199` → `#E6DCCB` | Paleta, fila 5, aclarado |
| Carbón (fondo) | `#332F2E` → `#171513` | Paleta, fila 1, oscurecido |

El fondo incorpora manchas de camuflaje muy tenues (radial-gradients al 7–12 %
de opacidad con colores exactos de la paleta) sobre la rejilla de mapa de campo
que ya existía. Las tarjetas de portada rotan entre seis acentos de la paleta.
El **modo noche** se rebajó a una variante cálida de muy baja luminancia
(marrones y caquis apagados) en lugar de la verde anterior.

Los nombres de las variables CSS (`--red`, `--amber`, `--green`…) se
mantuvieron intactos y solo cambiaron sus valores, de modo que **ningún
componente existente se rompió** al cambiar la paleta.

---

## 5. Otras limitaciones técnicas reales

**Brújula / magnetómetro.** El acceso al magnetómetro depende del navegador:

- iOS/Safari expone `webkitCompassHeading` y exige un gesto del usuario para
  pedir permiso (`DeviceOrientationEvent.requestPermission()`); la app lo hace
  con el botón *Activar sensor*.
- Android/Chrome usa `deviceorientationabsolute`; la fiabilidad varía según el
  dispositivo y requiere calibración (movimiento en forma de 8).
- Algunos navegadores de escritorio y ciertos móviles de gama baja **no tienen
  magnetómetro**. Por eso existe el **modo manual**: se arrastra la rosa hasta
  alinearla con el norte determinado por el sol o las estrellas, y a partir de
  ahí se leen rumbos. La sección explica además los métodos naturales.
- El magnetómetro se desvía cerca de metales, imanes, vehículos y electrónica.

**Geolocalización.** Funciona sin Internet (usa satélites GNSS), pero el
*primer fix* puede tardar bastante sin asistencia de red. Requiere HTTPS.

**Cuota de almacenamiento.** El navegador puede purgar IndexedDB y la Cache API
bajo presión de espacio. La app solicita `navigator.storage.persist()`; el
navegador puede concederlo o no. Por eso existe la exportación de datos.

**iOS.** Safari limita la instalación PWA y puede recuperar espacio de sitios no
visitados en semanas. Añadir la app a la pantalla de inicio reduce ese riesgo.

**Instagram `@finalworldpreppers`.** No fue posible analizarlo: Instagram bloquea
el acceso automatizado mediante `robots.txt`. El contenido se construyó a partir
de fuentes oficiales españolas y literatura técnica; **todo el texto es original**
y no reproduce material de ese perfil. Queda constancia en `📑 Fuentes`.

---

## 6. Despliegue en Netlify

1. Sube el repositorio a GitHub/GitLab y conéctalo en Netlify, o usa la CLI:

```bash
npm i -g netlify-cli
netlify deploy --prod
```

2. `netlify.toml` ya define:
   - `command = "npm run build"` y `publish = "public"`
   - Redirección SPA `/* → /index.html 200`
   - `Cache-Control: must-revalidate` para `sw.js`, `index.html` y
     `precache-manifest.json` (para que las actualizaciones se detecten)
   - Caché larga para `assets/`, `data/` e `icons/`
   - `Content-Type` correcto para `.webmanifest` y `.geojson`
   - CSP restrictiva: solo recursos propios más los dominios de teselas
   - `Permissions-Policy` que habilita geolocalización y magnetómetro solo para
     el propio origen
   - HSTS. Netlify sirve HTTPS con certificado automático.

### Despliegue por arrastrar y soltar

`netlify.toml` solo se lee cuando el repositorio es la raíz del proyecto. Para
los despliegues en los que se sube directamente la carpeta `public/` (Netlify
Drop, Cloudflare Pages Direct Upload), el mismo comportamiento se consigue con
`public/_redirects` y `public/_headers`, que ambos proveedores interpretan.
GitHub Pages no admite ninguno de los dos: la app funciona igual, pero sin las
cabeceras de seguridad.

La guía completa paso a paso, con enlaces, está en **`PUESTA-EN-MARCHA.md`**.

**Si cambias de proveedor de teselas**, actualiza los dominios en la
`Content-Security-Policy` de `netlify.toml`, o el navegador bloqueará la
descarga.

---

## 7. Cómo actualizar contenidos

### 7.1 Publicar una versión nueva

1. Edita los ficheros de `public/data/content/`.
2. Sube `VERSION` en `public/data/content/index.js`. Es el único sitio: el
   build la copia en `public/sw.js` (es lo que fuerza la renovación de caché)
   y regenera `precache-manifest.json`, que es la lista que precachea el
   Service Worker. Una prueba falla si ambas cosas no están al día.
3. Actualiza `FECHA_CONSULTA` en `public/data/content/sources.js`.
4. `npm run build && npm test`
5. Despliega.

Los usuarios con la versión anterior siguen funcionando con normalidad; la nueva
se aplica la próxima vez que abran la app con Internet.

### 7.1 bis SOS: emergencias sanitarias

Los cinco accesos sanitarios de SOS (parada cardíaca, hemorragia grave,
atragantamiento, infarto, ictus) se definen en `SOS_SANITARIAS`
(`public/data/content/emergencias.js`). **No duplican texto médico**: cada uno
apunta a un artículo de Primeros auxilios (`art`) y SOS lo muestra con su
cabecera, el botón de llamada y la barra fija del 112. Para añadir otro, crea o
elige el artículo y añade una entrada.

Infarto e ictus tienen artículo propio (`pa-infarto`, `pa-ictus`) construido
**solo con lo que el manual ya contenía** (signos del ictus, dolor torácico
como urgencia, aviso al 112 y cuándo iniciar RCP). Llevan un aviso de que están
pendientes de ampliar y verificar contra las guías del ERC: no se ha añadido
contenido médico nuevo.

El botón del 112 es un enlace estándar `tel:112`: el sistema abre el marcador
y es la persona quien confirma. Sin JavaScript, sin servicios externos; en un
dispositivo sin teléfono no hace nada o ofrece una app, sin errores.

`GRUPOS_EMERGENCIA` organiza el resto de escenarios en la pantalla SOS.

### 7.1 ter Buscador y sinónimos

La lógica está en `public/assets/js/search.js` (módulo puro, probado con
`npm run test:unit`) y los datos en `public/data/content/sinonimos.js`:

- **Normalización**: minúsculas, sin tildes y singular/plural.
- **Palabras vacías** (`STOPWORDS`): lista corta que no puntúa ("de", "mucho"…).
- **Sinónimos** (`SINONIMOS`): grupos de formas equivalentes. Las expresiones
  de varias palabras ("corte de luz") se detectan antes que las palabras
  sueltas. `solo_frase` y `ambiguas` evitan asociaciones falsas (ver el
  comentario del archivo). Añade solo equivalencias reales.
- **Ranking**: título ≫ resumen/etiquetas ≫ texto; la forma escrita puntúa
  más que un sinónimo; se premia cubrir todos los conceptos; ante la duda van
  primero SOS y los escenarios.
- **Sin resultados**: corrección de erratas en local (distancia de edición);
  si hay una corrección clara, se muestran sus resultados directamente.

### 7.2 Añadir un escenario de emergencia

En `public/data/content/emergencias.js`, añade un objeto al array:

```js
{
  id: 'mi-escenario',        // usado en la URL: #/emergencia/mi-escenario
  t: 'Nombre del escenario',
  ic: '⚠️',
  pr: 'critico',             // critico | importante | recomendado | info
  card: ['4 líneas máximo para la tarjeta rápida'],
  ahora: ['Primeros minutos…'],
  horas: ['Próximas horas…'],
  dias:  ['Próximos días…'],
  no:    ['Errores peligrosos…'],
  eq:    ['Equipo útil…'],
  ev: { quedarse: [], evacuar: [], nota: '' },
  src: ['pc-es'],            // ids de public/data/content/sources.js
}
```

Aparece automáticamente en el modo emergencia, en el buscador y en el manual.

### 7.3 Añadir un artículo

En el fichero `art-*.js` que corresponda:

```js
{
  id: 'mi-articulo',
  sec: 'agua',               // id de sección (ver SECCIONES en index.js)
  t: 'Título',
  pr: 'importante',
  sum: 'Resumen de una línea que aparece en listados y buscador.',
  tags: ['palabras', 'clave', 'para', 'el', 'buscador'],
  body: [
    { h: 'Subtítulo' },
    { p: 'Párrafo.' },
    { ul: ['Punto 1', 'Punto 2'] },
    { ol: ['Paso 1', 'Paso 2'] },
    { warn: 'Aviso rojo.' },
    { note: 'Nota azul.' },
    { ok: 'Nota verde.' },
    { kv: [['Clave', 'Valor']] },
    { table: { head: ['A', 'B'], rows: [['1', '2']] } },
    { card: { t: 'TARJETA', lines: ['línea 1', 'línea 2'] } },
    { tool: 'calc-agua' },   // incrusta una calculadora
    { check: 'nivel2' },     // enlaza a un checklist
  ],
  src: ['pc-es'],
}
```

### 7.4 Añadir frecuencias

En `public/data/content/comunicaciones.js`, array `FRECUENCIAS`:

```js
{
  id: 'mi-frecuencia',
  grupo: 'Radiodifusión FM',
  nombre: 'Nombre de la emisora o servicio',
  rx: '104.5', tx: '—', unidad: 'MHz',
  modo: 'FM (solo recepción)',
  pot: '—',
  licencia: 'Solo recepción',
  uso: 'Para qué sirve',
  zona: 'Dónde se recibe',
  verificado: true,          // false → se marca en naranja como "sin verificar"
  src: 'mineco-fm',          // id de la fuente
  notas: '',
}
```

> **Regla del proyecto: no se inventan frecuencias.** Si no puedes verificarla
> contra el registro oficial de estaciones de la Secretaría de Estado de
> Telecomunicaciones o contra el CNAF, márcala `verificado: false` o déjala como
> `PENDIENTE DE VERIFICACIÓN`. Los usuarios también pueden añadir las suyas desde
> la app, y quedan claramente etiquetadas como propias.

### 7.5 Añadir checklists y cursos

- Checklists: `public/data/content/checklists.js`. Cada lista tiene `grupos`, y
  cada grupo `items`. El estado (tengo / falta / comprar / revisar + fecha) se
  guarda por usuario en IndexedDB con la clave `listaId::grupo::índice`.
  **Si reordenas o eliminas ítems, las marcas guardadas se desplazan.** Añade
  siempre al final de cada grupo.
- Cursos: `public/data/content/cursos.js`, con `teoria`, `lee` (ids de artículo),
  `ejercicio` y `quiz` (`r` = índice de la opción correcta, base 0).

### 7.6 Actualizar la información de Ávila

Todo lo específico de Ávila está en `public/data/content/art-territorio.js`
(artículos `av-territorio`, `av-riesgos`, `av-servicios`, `av-plan`) y en el
checklist `avila` de `checklists.js`.

Qué conviene revisar cada temporada y dónde:

| Dato | Fuente oficial | Cuándo revisar |
|---|---|---|
| Épocas de peligro de incendios | Junta de Castilla y León, Medio Ambiente | Cada primavera |
| Umbrales de aviso AEMET | Plan METEOALERTA, Anexo I | Anualmente |
| Teléfonos municipales | Ayuntamiento de Ávila | Anualmente |
| Estructura sanitaria | Sacyl, Complejo Asistencial de Ávila | Anualmente |
| Plan territorial (PLATEA) | Diputación de Ávila, SPEIS | Con cada revisión del plan |
| Embalses y caudales | SAIH de la CH del Duero | Consulta en línea, no se cachea |

Añade siempre la fuente y su fecha de consulta en `sources.js`.

### 7.7 Regenerar los geodatos

```bash
npm run build:geo
```

Regenera los cuatro GeoJSON desde `es-atlas`. Para otra provincia, cambia el
prefijo de código INE en `tools/build-geo.mjs` (Ávila es `05`).

---

## 8. Copias de seguridad y restauración

Todos los datos del usuario viven **exclusivamente en su dispositivo**. Nada se
envía a ningún servidor: no hay analítica, ni cookies de terceros, ni backend.

**Copia de seguridad**
`⚙️ Configuración → Exportar datos (JSON)`. Descarga un archivo
`survival-offline-backup-AAAA-MM-DD.json` con puntos del mapa, contactos del
plan familiar, marcas de checklist, frecuencias propias, radio log, capas
GeoJSON importadas, progreso de cursos y ajustes.

**Restauración**
`⚙️ Configuración → Importar datos`. Fusiona con lo existente (no borra).

**Recomendación:** exporta después de cada cambio importante del plan familiar y
guarda el JSON en un lugar distinto del móvil. Imprime además el plan familiar
en papel (`👨‍👩‍👧 Plan familiar → Imprimir plan`) y mete una copia en cada mochila:
el papel no se queda sin batería.

---

## 9. Diseño y accesibilidad

> La auditoría de uso móvil y bajo estrés, con lo implementado y medido, está en `docs/FASE-3-UX.md`.

- **Mobile-first**, usable con una mano: objetivos táctiles de 44–52 px,
  navegación inferior fija de cinco destinos, botones grandes.
- **Estética de manual de campo**: verde oliva, negro, gris, arena, tipografía
  condensada para titulares, monoespaciada para datos técnicos.
- **Modo noche** real: no es una inversión de colores, sino una paleta de baja
  luminancia con filtro de brillo y saturación reducidos, sin superficies claras,
  pensada para preservar la visión nocturna y ahorrar batería en OLED.
- **Contraste alto** y tres tamaños de texto en Configuración.
- Respeta `prefers-reduced-motion`, incluye enlace de salto al contenido y usa
  roles ARIA en pestañas y estados.
- Sin fuentes externas: se usa la pila del sistema, así que no hay ninguna
  petición a Google Fonts ni a CDN alguna.

---

## 10. Seguridad, privacidad y alcance del contenido

- **Local-first absoluto.** Ninguna petición sale de la app salvo dos, y ambas
  las inicia el usuario: descargar teselas de mapa y comprobar si hay versión
  nueva.
- **CSP restrictiva** definida en `netlify.toml`.
- **Sin `innerHTML` con datos de usuario sin escapar**: todo pasa por `esc()`.
- **Enfoque exclusivamente defensivo.** El contenido sobre disturbios y conflicto
  armado trata únicamente de alejarse, refugiarse, evacuar, comunicar y prestar
  primeros auxilios. No hay información táctica, ni de armamento, ni de sabotaje,
  ni de fabricación de explosivos.
- **Contenido sanitario** basado en las guías del European Resuscitation Council,
  siempre distinguiendo lo que puede hacer una persona sin formación de lo que
  requiere atención profesional inmediata. No se inventan tratamientos.
- **Regla de no inventar.** Cuando un dato no se pudo verificar contra fuente
  fiable, se indica expresamente como *pendiente de verificación* en lugar de
  rellenarlo. Aplica sobre todo a frecuencias, ubicaciones exactas, rutas y
  puntos de evacuación.
- **La app no sustituye a Protección Civil ni al 112.** Cuando existan
  instrucciones oficiales, esas mandan.

---

## 11. Créditos y licencias

- **Leaflet** 1.9 — BSD-2-Clause, incluido localmente en `assets/vendor/`.
- **es-atlas** — MIT, TopoJSON derivado del Equipamiento Geográfico de Referencia
  Nacional del **Instituto Geográfico Nacional (IGN)**.
- **Instituto Geográfico Nacional** — teselas WMTS (mapa base, MTN, PNOA), CC BY 4.0.
- Contenido redactado a partir de fuentes oficiales españolas (Protección Civil,
  AEMET, IGN, BOE, Junta de Castilla y León, Diputación de Ávila, Ayuntamiento de
  Ávila, Sacyl, CH del Duero) y literatura técnica. El listado completo con fecha
  de consulta está dentro de la propia app en `📑 Fuentes y referencias`.

---

## 12. Hoja de ruta

Preparado en la arquitectura, no incluido en la versión 1.0:

- Importación de paquetes de teselas como archivo (`.zip` de teselas) para
  compartir áreas entre dispositivos sin volver a descargarlas.
- Capas oficiales de riesgo preempaquetadas, sujeto a condiciones de uso.
- Registro de rutas (tracks GPX) y navegación por waypoints.
- Sincronización opcional cifrada extremo a extremo entre dispositivos propios.
- Modo linterna y señal de socorro luminosa con la pantalla.

## Ámbito «Mi zona»: evaluación según dónde estés

La sección de riesgos ya no es sólo de Ávila. El ámbito **MI ZONA** resuelve dónde
estás y adapta lo que muestra.

**Cómo se resuelve la ubicación.** El navegador da la posición y `ubicacion.js` la
convierte en provincia haciendo punto-en-polígono contra la cartografía del IGN que
la aplicación ya lleva precargada. No hay servicio de geocodificación, ni petición de
red, ni clave de API: funciona en modo avión. También se puede elegir la provincia a
mano, y esa elección manda siempre sobre la detección.

**Qué se guarda.** Únicamente el código de provincia y si se eligió a mano o por GPS.
Nunca las coordenadas. El almacén `kv` entra en la sincronización opcional con
Supabase, así que todo lo que se escriba ahí puede salir del dispositivo si el usuario
la activa. Una provincia basta para elegir el ámbito; un par de coordenadas con diez
metros de precisión sería un registro de dónde vive. Hay una prueba automática que
falla si alguna vez se cuela una coordenada en el almacén.

**Qué se muestra, y qué no se inventa.** No existe una evaluación de riesgo oficial y
homogénea provincia a provincia. Inventarla sería exactamente lo que la regla 32
prohíbe. Así que para cada riesgo se muestran tres cosas, en este orden:

1. **Los planes oficiales que aplican donde estás**, tomados de `territorios.js`: los
   de tu comunidad autónoma y los del Estado. Esto no es una valoración de riesgo, es
   un hecho administrativo comprobable. Que una comunidad tenga plan especial
   aprobado ante un riesgo significa que la administración competente lo reconoce como
   relevante en ese territorio; no dice cuánta probabilidad hay. Es un indicador
   aplicable a todo el Estado.
2. **Un aviso explícito** de que no hay evaluación específica para tu provincia.
3. **La evaluación de ámbito ESPAÑA**, que sí está sostenida por fuentes.

La provincia de Ávila es la excepción: tiene evaluación propia, así que ahí se usa esa
y el aviso no aparece.

**Nivel de confirmación.** Cada plan lleva marca de si está confirmado en fuente
oficial (`✔ oficial`) o si hay indicio pero no se pudo confirmar la norma, la sigla o
el estado (`⚠ pendiente de confirmar`). No se mezclan. Donde la investigación no
llegó, no hay entrada y la aplicación dice DATOS NO DISPONIBLES en vez de rellenar el
hueco.

**La correspondencia provincia → comunidad no está tecleada.** La genera
`tools/build-territorio.mjs` por geometría, contra los polígonos del IGN, y el script
comprueba el reparto de provincias de cada comunidad antes de escribir nada: si un
solo número no cuadra, falla y no genera el archivo. Teclear una tabla de 52 filas de
memoria es justo el tipo de dato que se cuela mal sin que nadie lo note.
