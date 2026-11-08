# Herramientas SOS, despensa, recordatorios y ahorro de batería (v1.18)

## Herramientas SOS
Sección `herramientas`, en la portada dentro de «Si está pasando». También se llega desde SOS con el botón «Avisar a la familia».

- **Estoy bien:**
  - Abre la app de Mensajes con el contacto y el texto ya puestos. Se usan enlaces `sms:`; iPhone y Android los escriben distinto.
  - Una app web no puede enviar un SMS por sí sola: hay que pulsar Enviar.
  - El SMS va por la red de telefonía, sin datos.
  - La posición GPS solo se añade si la persona lo marca y **solo va en el mensaje**: no se guarda.
  - También ofrece WhatsApp (`wa.me`), que necesita datos.
  - Los contactos se cogen de Contactos y acuerdos (almacén `contactos`).
- **Silbato:** tres pitidos de 3,15 kHz (la señal internacional de auxilio) o un pitido continuo, con WebAudio.
- **Linterna:** pantalla blanca o roja a pantalla completa, sin que se apague (Wake Lock). Se apaga tocándola.
- **Señales:** espejo de señales, señales de brazos a un helicóptero, señales tierra-aire (V = necesito ayuda, X = necesito asistencia médica) y la regla de «tres de cualquier cosa».
- **Diario:** notas con la hora, en `kv diario.emergencia` (dato propio: entra en las copias de seguridad). Se puede copiar todo.
- **Tarjeta:** PDF con dos tarjetas recortables (cara A: datos y contactos; cara B: puntos de encuentro). Se genera en el móvil con el motor PDF de la compra.

## Calculadora de despensa
Sección `despensa-calc`, en el grupo «Mochila y despensa».
- Calcula los días de autonomía: los mínimos entre comida (kcal) y agua.
- Usa las necesidades del hogar de Compra urgente (Mifflin-St Jeor).
- Guarda el inventario en `kv despensa.inventario` (dato propio).

## Recordatorios
Tarjeta en la portada que solo aparece si hay algo que recordar:
- lo que caduca en los próximos 30 días o ya ha caducado (las fechas que se ponen en los checklists);
- la revisión de la mochila cada 6 meses (`kv revision.mochila`), con el botón «Revisada hoy».

## Ahorro de batería
Nuevo tema en Ajustes → Tema: `ahorro`.
- Negro puro, sin animaciones, transiciones ni sombras.
- En las pantallas OLED apaga los píxeles negros.

## Mi efectivo (v1.19)

Sección `#/sec/efectivo` (portada → «Si está pasando»). Lleva la cuenta del dinero en efectivo si fallan bancos y tarjetas.

- Datos: `kv 'efectivo.datos'` = `{ bolsillos: [{id,t,base,baseTs,conteo}], movs: [{id,ts,tipo,imp,cat,bol,nota}], presupuesto, discreto }`. Importes en **céntimos**.
- Saldo de un bolsillo = último recuento (`base`) + entradas − gastos posteriores a ese recuento. Volver a contar manda.
- «Te dura X días» = saldo ÷ gasto medio de los últimos 7 días (o de los días que lleva apuntando); sin gastos, usa el presupuesto diario.
- Solo en el móvil; entra en las copias (`KV_PROPIO` incluye `efectivo.`). PDF generado en el dispositivo (`pdfEfectivo`).
- Lógica pura en `efectivo-core.js` (pruebas en `tools/test-unit.mjs`).

## Radio desde Atajos (v1.19)

Cada emisora tiene un botón «📋 Atajos» que copia la dirección de su emisión para usarla en la app Atajos de iPhone con la acción «Abrir URLs». Una app web no puede exponer acciones propias a Atajos ni a Siri: eso requeriría una app de la App Store.

## Volver a casa (v1.20)

Sección `#/sec/volver` (portada → «Si tienes que salir» → «Volver a casa y mapas»).

- **Estoy perdido:** la posición se lee solo al pulsar «¿Dónde estoy?» (una lectura, no seguimiento). Muestra coordenadas decimales y en grados/minutos/segundos, copiar y SMS. Casa = el punto más reciente de tipo `casa` del store `puntos` (el mismo del Mapa); se puede guardar desde aquí. Flecha con rumbo y distancia en línea recta y tiempo andando a 4,5 km/h; con «Activar la brújula» la flecha gira con el móvil (mismo criterio que `compass.js`). Batería con `navigator.getBattery` cuando existe (no en iPhone).
- **Mis rutas:** graba con `watchPosition` (descarta lecturas con más de 40 m de error o a menos de 15 m de la anterior) y guarda la ruta en el store `geo` con `volver: true`, así aparece como capa en el Mapa. «Hay agua aquí» y «Refugio aquí» guardan puntos en `puntos`. Muestra los puntos útiles a menos de 300 m de cada ruta.
- Las coordenadas de casa y de las rutas se guardan **solo en el móvil** (y en las copias de seguridad, como el resto de puntos y capas), y solo cuando el usuario lo pide.
- Lógica pura en `volver-core.js`.

## Tarjeta con QR, walkies y batería (v1.20)

- **QR:** `herramientas-extra.js` (`textoQR`, `svgQR`, `opsQR`) con la librería `public/assets/vendor/qrcode/qrcode.mjs` (qrcode-generator 1.4.4, MIT, adaptada a módulo ES y UTF-8). El QR es texto plano con lo que el usuario ha escrito; se ve en pantalla y va en el PDF de la tarjeta.
- **Walkie:** guía PMR446 y plan de canales en `kv 'walkie.plan'` (entra en las copias), con PDF imprimible.
- **Batería:** «Ahorro máximo» pone el tema `ahorro` (guarda el anterior en `kv 'ahorro.temaAnterior'` para volver) y para la radio. Guía de ahorro para iPhone y Android y un atajo de iPhone «Modo supervivencia». Una app web no puede cambiar los ajustes del móvil.
