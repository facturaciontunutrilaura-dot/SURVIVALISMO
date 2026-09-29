# FASE 4 — VERIFICACIÓN FINAL

Fecha: 29/09/2026 · Versión: 1.5.0 · Rama: `claude/nifty-gates-mhp1yu`
Alcance: bloques 1–8 de `docs/FASE-4-DIAGNOSTICO.md`, ya implementados
(commits `1b222bf` … `9fc689f`), más las correcciones encontradas en esta
verificación.

---

## Resultado general

Los ocho bloques funcionan como se especificó. La auditoría final encontró
**cuatro problemas**:
- un contraste insuficiente;
- falta de información al usuario cuando una actualización falla;
- un icono descolocado;
- un fallo del CI de GitHub causado por una prueba demasiado estricta.

Los cuatro están corregidos y cubiertos por pruebas. No se ha tocado ninguna
funcionalidad fuera de la fase 4. Lo que solo se puede comprobar en un móvil
físico queda como **PENDIENTE DE VERIFICACIÓN EN DISPOSITIVO REAL**.

## Suite de pruebas

| Suite | Antes de la verificación | Final |
|---|---|---|
| Unitarias (`node --test tools/test-unit.mjs`) | 28/28 | **28/28** |
| Aplicación E2E (`tools/test.mjs`) | 354/354 | **360/360** |
| Sincronización (`tools/test-sync.mjs`) | 47/47 | **47/47** |
| **Total** (`npm test`) | 429 | **435/435** |

Las 6 pruebas E2E nuevas de esta verificación son:
- actualización fallida informada;
- la nota se retira al actualizar;
- copia truncada;
- copia sin datos;
- copia con estructura incorrecta;
- restauración todo o nada con un fallo real de escritura.

Además, se ha corregido la condición de la prueba de listeners (ver CI).

## Auditoría visual

Se usó un script temporal de Playwright (`tools/_audit4.mjs`, ya borrado).
Cubrió 54 pantallas: **320, 375 y 430 px** × **tema normal y modo noche** ×
**almacenamiento funcionando / bloqueado**. Se revisaron:
- portada con el aviso «Actualizar ahora» y el de preparación;
- SOS con «Mis datos vitales» abierto;
- Configuración: panel «¿Está lista tu app?», resumen previo a restaurar y
  privacidad;
- la pantalla «No encontrado»;
- con almacenamiento bloqueado: checklist, Configuración, mapa, SOS y portada.

En cada pantalla se midió:
- desplazamiento horizontal;
- elementos fuera de la pantalla;
- controles de menos de 44 px;
- contraste de todo el texto, componiendo los fondos semitransparentes.

Además se revisaron las capturas una a una.

| Medida | Resultado final |
|---|---|
| Desplazamiento horizontal | 0 de 54 |
| Texto fuera de la pantalla o cortado | 0 |
| Controles < 44 px | 0 |
| Texto por debajo de AA | 0. Había 1: el ⚠ del panel, corregido |
| Mensajes técnicos visibles | 0. El detalle técnico de un error va plegado |

**Falso positivo descartado:** la primera medición marcó como bajo contraste
el texto de los avisos `.blk-warn` / `.blk-note`. El script tomaba su fondo
semitransparente (`rgba(…, .09)`) como opaco. Tras componer las capas, todos
cumplen AA, igual que en la prueba de temas de la fase 3.

## Actualización segura

Pruebas en `tools/test.mjs`, sección «Actualización segura (fase 4)».

| Requisito | Evidencia |
|---|---|
| La versión anterior sigue disponible | Se publica una versión con `juegos.js` ausente: el hosting devuelve `index.html` con 200. ✅ «la caché de la versión instalada sigue intacta» |
| No se borra la anterior | ✅ La misma prueba: la caché `survival-static-v1.5.0` sigue presente |
| No se instala una versión incompleta | ✅ «no se crea la caché de la versión incompleta»; ✅ «no queda ninguna versión esperando» |
| Funciona sin conexión | ✅ «sin red, la app sigue completa con la versión anterior»: abre Juegos, el módulo que faltaba |
| El usuario recibe información clara | **Faltaba (corregido).** Ahora «¿Está lista tu app?» dice que la última actualización no se pudo descargar entera, que sigue con la versión 1.5.0 completa y que se reintentará. ✅ prueba nueva |
| No se aplica automáticamente | ✅ «no se aplica sola a mitad de uso»; ✅ aviso «Actualizar ahora», oculto en pantallas de emergencia; se aplica al pulsar |
| Primera instalación sin aviso falso | ✅ «Primera instalación: sin aviso de versión nueva» |

Con el `sw.js` anterior a la fase 4 fallan 7 de estas pruebas (comprobado en
el bloque 1). Es el fallo P0 reproducido.

## Almacenamiento bloqueado

Se simulan IndexedDB fallando y `localStorage` lanzando error.

| Requisito | Evidencia |
|---|---|
| Nunca solo «Error · bloqueado» | ✅ «ninguna pantalla muestra un error técnico», en 9 pantallas × 2 modos |
| Explica qué ocurre, qué funciona y qué no | ✅ «Qué ha pasado», «Sigue funcionando», «No funciona ahora», revisado en capturas a 320 px |
| Acciones útiles | ✅ ventana normal, liberar espacio, permitir datos de sitios y «Reintentar» |
| SOS y 112 accesibles | ✅ 112 y «Ir a SOS» arriba en la pantalla del aviso; SOS completo |
| Configuración | ✅ abre y lo explica. La sincronización y la copia fallan con mensaje claro |
| Mapa | ✅ vectorial visible (> 40 polígonos); «Punto» y «Descargar» desactivados y explicados |
| Portada | ✅ aviso no aplazable |

## Copias de seguridad

| Caso | Evidencia |
|---|---|
| Archivo que no es JSON | ✅ rechazado, «no se puede leer» |
| Archivo corrupto (cortado a la mitad) | ✅ rechazado (nuevo) |
| Copia incompleta (sin datos) | ✅ rechazada, «no contiene datos» (nuevo) |
| Estructura incorrecta (un almacén que no es lista) | ✅ rechazada (nuevo) |
| Un registro dañado o coordenadas inválidas | ✅ rechaza la copia entera |
| Copia de otra app o de una versión futura | ✅ rechazadas |
| Una copia inválida no toca nada | ✅ «los datos actuales siguen exactamente igual» y el aviso lo dice |
| Resumen antes de restaurar | ✅ fecha y elementos por tipo; sin confirmar no se escribe nada |
| Restauración válida | ✅ ubicaciones, rutas y marcas restauradas |
| Todo o nada | ✅ **nuevo**: un fallo real de escritura a mitad (`QuotaExceededError` en el 20.º `put`) → error y 0 registros nuevos |
| Repetir la misma copia | ✅ 0 cambios; la sincronización no lo vuelve a subir |

## Privacidad

| Estado | Evidencia |
|---|---|
| Sin sincronización | ✅ «La sincronización no está activada: … no se envían a ningún servidor». El plan familiar dice «solo en este dispositivo» |
| Con sincronización (servidor configurado + sesión) | ✅ dice qué se envía, incluida la información médica, y qué no (teselas, audio, ajustes); va por HTTPS sin cifrado de extremo a extremo; qué pasa al desactivarla |
| Ninguna afirmación absoluta falsa | ✅ con sincronización, ningún texto dice «solo en este dispositivo» ni «ningún servidor» |
| Conexiones reales | ✅ se explican los mapas del IGN (qué zona se pide) y la comprobación de versión |

Coincide con el código: `store.syncActiva()` usa la misma condición que
`sync.js` para enviar datos (URL, clave, token y usuario). `SYNC_STORES` es
la lista que se enumera.

## Mis datos vitales

| Requisito | Evidencia |
|---|---|
| Solo datos del usuario | ✅ información médica mostrada **literalmente**; solo el contacto marcado «externo» (otros no); puntos de encuentro del plan |
| Sin contenido médico generado | ✅ sin «recomend», «diagnóstic», «dosis»…; nota «Es lo que tú has anotado; la app no lo revisa» |
| No desplaza lo urgente | ✅ plegado; después del 112 y antes de las emergencias sanitarias |
| Sin datos | ✅ lo dice y enlaza al plan familiar |
| Sin almacenamiento | ✅ SOS completo (5 accesos sanitarios) y mensaje claro |

## Accesibilidad

- ✅ Todas las pantallas tienen H1 (comprobado en 10, incluidas las que no lo
  mostraban).
- ✅ Al navegar, el foco pasa al título; no al repintar.
- ✅ El foco no se roba al buscador.
- ✅ Suites de la fase 3 en verde: nombres accesibles, textos ≥ 11 px, 44 px,
  contraste AA en 4 temas y foco visible.
- ✅ Pantallas nuevas: 0 controles < 44 px y 0 textos bajo AA en 54
  combinaciones.
- **Corregido:** el ⚠ de las filas del panel tenía 4,1:1 en tema normal y
  **2,6:1 en modo noche**. Ahora tiene 5,4:1 y 4,6:1 (`app.css`).
- **Corregido:** en los avisos que empiezan con un párrafo (sin
  almacenamiento, error de restauración), el ⚠ quedaba solo en una línea.
  Ahora va al lado del texto.

## SOS y 112

- ✅ El 112 está siempre accesible:
  - en SOS, barra fija;
  - en la pantalla sin almacenamiento, en «No encontrado» y en la de error;
  - en la portada.
- ✅ El aviso de versión no aparece en las pantallas de emergencia.
- ✅ SOS no depende del almacenamiento: los datos vitales se cargan aparte.
- ✅ Sin red, SOS muestra el 112 y los 5 accesos sanitarios (prueba offline
  real).

## Navegación y cargas lentas

- ✅ «Navegación rápida: una vista lenta no se pinta encima de la siguiente».
  Se sale de Configuración antes de que termine de construirse: se ve SOS y
  no queda nada de Configuración.
- Este fallo se detectó durante el bloque 2: una prueba se colgó por él. Se
  corrigió con un número por navegación en `route()`.

## CI de GitHub

Workflow «Pruebas» (`.github/workflows/test.yml`).

| Ejecución | Commit | Resultado |
|---|---|---|
| #1 · run 36601344900 | `9fc689f` | **Falló.** ✅ dependencias, ✅ Chromium, ✅ **lista de archivos offline al día**, ✅ unitarias. ❌ app: **353/354**. Falló «Batería: ningún listener de window pendiente» con `deviceorientation(absolute): 0→-1`. La sincronización no llegó a ejecutarse (la cadena `&&` se detiene) |

**Causa**, reproducida en local: el Chromium de CI no tiene
`DeviceOrientationEvent`, así que la brújula no añade sus listeners. Al
salir los retira de todos modos, lo cual es inocuo, y el recuento baja a
−1. La prueba exigía igualdad exacta. No era un listener vivo ni un fallo de
la app.

**Corrección**: la prueba marca como pendiente solo lo que se añade y no se
quita (el recuento sube). Así sigue detectando fugas reales.

El resultado del CI sobre el commit final de esta verificación se añade al
final de este documento.

## Problemas encontrados y corregidos durante la verificación

| # | Problema | Tipo | Corrección | Prueba |
|---|---|---|---|---|
| 1 | Una actualización fallida no se comunicaba al usuario | Funcional (requisito de la fase 4) | Nota en «¿Está lista tu app?» (`preparacion.js`, `app.js`); se retira al instalarse una versión completa | 2 E2E nuevas |
| 2 | ⚠ del panel con 2,6:1 en modo noche (4,1:1 en tema normal) | Contraste | Colores propios que cumplen AA (`app.css`) | Auditoría visual: 0 fallos |
| 3 | ⚠ solo en una línea en avisos que empiezan con párrafo | Visual | `float` del icono con `:has()` (`app.css`) | Capturas a 320 px |
| 4 | CI rojo por la prueba de listeners en un navegador sin API de orientación | Prueba demasiado estricta | Condición «pendiente = recuento que sube» (`tools/test.mjs`) | Reproducido en local sin la API |
| — | Faltaban casos de copia: truncada, sin datos, estructura, atomicidad real | Cobertura | 4 comprobaciones nuevas | E2E |

También ocurrió, en la herramienta de auditoría y no en la app: el script
borraba el archivo de copia antes de que el navegador lo leyera y marcaba «no
se puede leer». Se corrigió en el script.

## Pendientes que quedan fuera de la fase 4

- **PENDIENTE DE VERIFICACIÓN EN DISPOSITIVO REAL:**
  - actualización real en Android e iOS con red mala y la app instalada;
  - `persist()` e instalación reales (botón en Android, instrucciones en
    iOS);
  - modo privado de Safari y Firefox;
  - importar una copia desde «Archivos» de iOS;
  - TalkBack y VoiceOver con el foco al navegar;
  - y todo lo de la fase 3 (`docs/FASE-3-UX.md` §H).
- **Mapas reales del IGN:** proveedor, CORS y teselas guardadas en modo
  avión. Fase de mapas aparte (`docs/FASE-4-DIAGNOSTICO.md` §8.2).
- **Revisión clínica de infarto e ictus:** siguen `revision: 'pendiente'`,
  con aviso visible y texto congelado por prueba. No se han tocado.
- **Revisiones profesionales** (§8.4 del diagnóstico): primeros auxilios,
  potabilización, plantas y setas, calorías y alimentación, salud mental.
- **Aviso del CI:** GitHub avisa de que `actions/checkout@v4` y
  `actions/setup-node@v4` usan Node 20, obsoleto. No afecta al resultado.

## Estado final

- Auditoría visual y funcional hechas; problemas corregidos.
- Suite completa: **435/435** en local.
- `tools/_audit4.mjs` eliminado; no quedan archivos temporales sin seguimiento.
- CI de GitHub: ver el apartado siguiente.

### Resultado del CI sobre el commit final

_Se completa tras el push del commit final._
