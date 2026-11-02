# FASE 5 — CIERRE PRE-DEPLOY

Fecha: 30/09/2026
**Estado: LISTO PARA DEPLOY. NO se ha desplegado.**

---

## Estado final

| | |
|---|---|
| Versión | **1.6.0** (`public/data/content/index.js` y `public/sw.js`) |
| Rama | `claude/nifty-gates-mhp1yu` |
| **Commit a desplegar** | **`389fb71db71e540446b7ecc668c0ba6ab16eacde`** (`389fb71`, «Fase 5 · Verificación: resultado del CI (en verde)») |
| Coincide con lo probado | Sí. La previsualización local sirve `public/` de este commit sin cambios, y el build de Netlify regenera exactamente los mismos archivos (ver «Build») |
| Commit de este documento | Posterior a `389fb71`. **Solo añade este documento** y no cambia nada de lo que se publica (`public/`, `netlify.toml`) |
| Working tree | Limpio antes del build, después del build y después de las pruebas |
| Local y GitHub | Mismo commit (`389fb71`) |

La propietaria ha probado en ordenador y en móvil físico, con resultado **OK**:
- navegación, SOS, 112, Buscar;
- mapas del IGN reales, descarga de mapas y offline, audio offline;
- modo noche, texto extragrande;
- Configuración, «Información para pruebas» y «Copiar informe»;
- backup.

## Build (reproducibilidad)

Se ejecutó `npm run build` (lo mismo que ejecuta Netlify) y después
`git status`:
- `build:geo` regenera `public/data/geo/*.geojson`: provincias, CCAA,
  municipios y centroides de Ávila.
- `build:assets` regenera los iconos (`icon-192`, `icon-512`,
  `maskable-512`, `favicon.png`), sincroniza `VERSION` en `sw.js` (1.6.0) y
  genera `precache-manifest.json` (50 recursos, 1,35 MB).
- **`git status` tras el build: limpio.** Ningún archivo generado cambia ni
  un byte.

Versiones de las dependencias del build:
- instaladas: `es-atlas` 0.6.0, `topojson-client` 3.1.0, `leaflet` 1.9.4;
- **últimas publicadas en npm** (`npm view`): exactamente las mismas.

Netlify, con `npm install`, obtendría hoy esas mismas versiones y
generaría los mismos archivos. **Reproducibilidad del build validada.** No
se ha cambiado `package.json`, no se ha añadido `package-lock.json` y no se
ha tocado `netlify.toml`.

## Resultado de todos los tests (ejecutados hoy)

`npm test` → código de salida 0.

| Suite | Resultado |
|---|---|
| Unitarias (`node --test tools/test-unit.mjs`) | **29/29** |
| Aplicación E2E (`tools/test.mjs`), bajo la CSP de producción | **394/394** |
| Sincronización (`tools/test-sync.mjs`) | **47/47** |
| **Total** | **470/470**, 0 fallos, sin warnings en la ejecución local |

CI de GitHub sobre `389fb71`: **en verde**. Ejecuciones #13 (push) y #14
(pull request #1): lista de archivos offline al día, unitarias, app 394/394
y sincronización 47/47. Único aviso: GitHub informa de que dos acciones usan
Node 20, que está obsoleto; no afecta.

## Comprobaciones realizadas

| Área | Evidencia |
|---|---|
| Service Worker, caché y offline | 20 pruebas: prueba offline real, hosting caído, error 500, reapertura sin red tras cerrar |
| Actualización segura | 12 pruebas: actualización interrumpida (se conserva la anterior), aviso «Actualizar ahora», datos intactos tras actualizar |
| Almacenamiento local | 16 pruebas: IndexedDB y `localStorage` bloqueados sin errores técnicos |
| Backups | 26 pruebas: resumen previo, 8 tipos de copia inválida, todo o nada, doble restauración |
| Sincronización | 47/47 |
| Mapas | 28 pruebas: descarga robusta, sin red, sin espacio, persistencia, teselas dañadas, capas; **y el IGN real, probado por la propietaria: OK** |
| Audio | 8 pruebas, incluida la reproducción bajo la CSP de producción; **audio offline probado por la propietaria: OK** |
| SOS / 112 | 52 comprobaciones: `tel:112`, barra fija, nombre accesible, datos vitales |
| Navegación | «←», Atrás del navegador, carga lenta abandonada |
| Accesibilidad | 20 pruebas: nombres, foco, orden, títulos, contraste AA en 4 temas, letra XL |
| Configuración | 18 pruebas: «¿Está lista tu app?», informe técnico |
| Cabeceras y configuración de Netlify | Único cambio desde la fase 3: `media-src 'self' blob:` en la CSP de `netlify.toml` y `public/_headers`, idéntico en ambos (prueba unitaria). `[[redirects]]` y el resto de cabeceras, sin cambios |
| Rutas y URLs | Sin rutas añadidas ni eliminadas en el router. Redirección SPA y nombres de archivos publicados, sin cambios |
| Archivos temporales | Ninguno versionado ni en el disco (`tools/` solo contiene los scripts de build, el servidor y las pruebas) |

## Compatibilidad con instalaciones y datos existentes

- IndexedDB, sin cambios de esquema desde antes de la fase 4:
  - nombre `survival-offline`, versión `3`;
  - almacenes y `SYNC_STORES` iguales.
- Claves de `localStorage` (`survival.settings`, `survival.sync`) sin cambios.
- Prefijo de caché `survival-static-v` / `survival-runtime-v`. Solo cambia
  el número de versión, que es el mecanismo de renovación.
- Formato de copia: `app: 'survival-offline'`, `version: 1`. Las copias
  anteriores siguen siendo válidas.
- Marcas de checklists antiguas (por posición): se migran solas al abrir la
  lista, con prueba.
- Probado:
  - «TRAS ACTUALIZAR: el checklist conserva las marcas» y «los datos
    familiares siguen ahí»;
  - la actualización fallida conserva la versión instalada.
- Sincronización (Supabase): sin cambios de arquitectura, tabla ni formato.

## Cambios importantes de la fase 5

1. La previsualización local y las pruebas usan las cabeceras de producción.
   Esto descubrió que **la CSP bloqueaba el audio offline**. Corregido con
   `media-src 'self' blob:`, **incluido en `netlify.toml` y `public/_headers`
   del commit a desplegar**.
2. Mapas:
   - solo se guardan imágenes;
   - las teselas dañadas se reparan;
   - la descarga parcial, sin red o sin espacio se explica;
   - el estado sigue a la conexión;
   - las capas se muestran sin recargar.
3. Indicador «Cargando…» accesible, y reapertura sin red probada.
4. Accesibilidad:
   - lectores de pantalla sin emojis en lo crítico;
   - el foco no queda tapado por las barras fijas;
   - resaltado de búsqueda con contraste AA.
5. «Información para pruebas en el móvil», copiable y sin datos personales.
6. Lista de revisión profesional (`docs/REVISION-PROFESIONAL.md`), sin
   cambios de contenido clínico.
7. Versión 1.6.0.

## Posibles riesgos

| Riesgo | Probabilidad / impacto | Mitigación |
|---|---|---|
| Versiones de dependencias abiertas (`^`) sin `package-lock.json`: si en el futuro se publicara una versión nueva de `es-atlas` 0.6.x o de `topojson-client` 3.x, un build posterior podría generar geodatos distintos | Baja: ambas llevan años sin versiones nuevas. Hoy verificado que no ocurre | Repetir `npm run build` y `git status` antes de cada despliegue futuro. Valorar un `package-lock.json` en otra fase, si se aprueba |
| Dispositivos con una versión anterior instalada | Baja | Actualización segura: la nueva solo se aplica completa, con aviso, nunca a mitad de uso |
| CORS del IGN distinto en otros navegadores | Baja: la propietaria lo probó OK | La app lo detecta y lo explica; el mapa vectorial sigue disponible |

## Elementos pendientes que NO bloquean el deploy

- Revisión profesional de contenidos (`docs/REVISION-PROFESIONAL.md`):
  - infarto e ictus, que siguen marcados como pendientes con aviso visible;
  - primeros auxilios;
  - potabilización y calculadora de cloración;
  - setas y plantas;
  - alimentación y calorías;
  - salud mental.
- Aviso de GitHub sobre Node 20 en `actions/checkout` / `actions/setup-node`.
- `DEP0040 punycode` en CI: aviso de una dependencia, sin efecto.
- Pull request #1 abierto en GitHub sobre esta rama. **No se ha hecho merge.**

## Confirmación

**NO se ha hecho deploy en Netlify.** No se ha hecho merge ni se ha cambiado
código, configuración, versión, URLs, IDs, datos, Supabase ni dependencias
durante este cierre. El único cambio es este documento.

## Cómo desplegar después (cuando se apruebe)

Netlify ejecuta `npm run build` y publica `public/` (`netlify.toml`). Opciones:

- **A · Desplegar esta rama tal cual**: en Netlify → *Site configuration →
  Build & deploy → Branches*, publicar la rama `claude/nifty-gates-mhp1yu`,
  o *Deploys → Trigger deploy* sobre ella. Se publica el commit más reciente
  de la rama, que contiene `389fb71` más este documento, sin cambios en lo
  publicado.
- **B · Por la rama de producción** (la habitual si Netlify publica desde la
  rama principal): hacer merge del pull request #1 cuando se apruebe.
  Netlify desplegará automáticamente.
- **C · Netlify CLI**, desde una copia del repositorio en ese commit:
  ```
  npm install
  npm run build
  git status          # debe quedar limpio
  npx netlify-cli deploy --prod --dir=public
  ```

Tras el despliegue, comprobar en la web publicada:
1. la cabecera `Content-Security-Policy` incluye `media-src 'self' blob:`;
2. Configuración muestra versión **1.6.0**;
3. en un dispositivo con la versión anterior aparece «Actualizar ahora»;
4. el audio offline suena;
5. SOS y 112 funcionan.
