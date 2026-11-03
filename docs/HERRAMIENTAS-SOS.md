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
