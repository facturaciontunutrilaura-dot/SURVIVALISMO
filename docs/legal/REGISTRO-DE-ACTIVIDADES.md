# Registro de actividades de tratamiento (art. 30 RGPD)

*Última revisión: 17 de noviembre de 2026 · App: SUPERVIVENCIA 1.21.2*

> Es un registro interno: no se publica, pero hay que tenerlo y enseñarlo si la
> Agencia Española de Protección de Datos lo pide. Las empresas de menos de 250
> trabajadores también deben llevarlo cuando el tratamiento **no es
> ocasional**, y los avisos push lo son. Actualízalo cada vez que la app añada
> una conexión o un dato nuevo.

## Responsable del tratamiento

| Campo | Valor |
|---|---|
| Nombre o razón social | *(pendiente: el mismo que `TITULAR` en `public/data/content/legal.js`)* |
| NIF | *(pendiente)* |
| Domicilio | *(pendiente)* |
| Correo de contacto | *(pendiente)* |
| Delegado de protección de datos | No es obligatorio: no hay tratamiento a gran escala de datos sensibles ni observación sistemática (art. 37 RGPD) |

---

## Tratamiento 1 · Avisos graves en el móvil (notificaciones push)

| Campo | Contenido |
|---|---|
| Finalidad | Enviar avisos de emergencias graves a quien los activa |
| Base jurídica | Consentimiento (art. 6.1.a RGPD), dado al pulsar «Activar avisos» y aceptar el permiso del navegador |
| Interesados | Usuarios que activan los avisos |
| Datos | Dirección técnica de suscripción del navegador (*endpoint*) y claves de cifrado. Sin nombre, correo ni ubicación |
| Destinatarios | Netlify, Inc. (encargado: almacenamiento en Netlify Blobs y envío). El servicio push del navegador (Google, Apple, Mozilla o Microsoft) entrega el aviso |
| Transferencias internacionales | Netlify (EE. UU.): Marco de Privacidad de Datos UE-EE. UU. o cláusulas contractuales tipo de su DPA *(comprobar y guardar)* |
| Conservación | Hasta que el usuario desactiva los avisos o el navegador da la suscripción por caducada (se borra sola con los errores 404 y 410) |
| Seguridad | HTTPS; solo se aceptan suscripciones de los servicios push oficiales; identificador cifrado con hash; sin datos identificativos |

## Tratamiento 2 · Alojamiento y funcionamiento del servicio

| Campo | Contenido |
|---|---|
| Finalidad | Servir la app, sus actualizaciones, las noticias y la lista de emisoras, y protegerla frente a abusos |
| Base jurídica | Interés legítimo (art. 6.1.f RGPD) |
| Interesados | Cualquier persona que abre la app o pide datos al servidor |
| Datos | Dirección IP, fecha y hora, recurso pedido y navegador (registros técnicos del proveedor) |
| Destinatarios | Netlify, Inc. (encargado) |
| Transferencias internacionales | Como en el tratamiento 1 |
| Conservación | El plazo de los registros técnicos de Netlify |
| Seguridad | HTTPS, cabeceras de seguridad y política CSP restrictiva |

## Tratamiento 3 · Consultas de soporte por correo

| Campo | Contenido |
|---|---|
| Finalidad | Responder las consultas de los usuarios |
| Base jurídica | Petición del interesado e interés legítimo en atenderla (art. 6.1.b y 6.1.f RGPD) |
| Interesados | Usuarios que escriben al correo de contacto |
| Datos | Dirección de correo, nombre si lo da, contenido del mensaje e informe técnico (sin datos personales) |
| Destinatarios | Proveedor de correo del titular *(indicar cuál, por ejemplo Google Workspace)* |
| Conservación | Mientras dure la consulta y, después, el tiempo necesario para atender posibles reclamaciones |
| Seguridad | Cuenta de correo con verificación en dos pasos. Se pide no enviar información médica ni copias de seguridad |

---

## Lo que NO trata el titular (y por qué)

| Qué | Dónde está | Por qué no es tratamiento del titular |
|---|---|---|
| Plan familiar, contactos, información médica, puntos del mapa, checklists | En el dispositivo del usuario (IndexedDB y localStorage) | No sale del dispositivo. El titular no tiene acceso |
| Ubicación GPS | En el dispositivo | Se usa en local y no se envía |
| Copia sincronizada (incluidos datos de salud) | Proyecto de Supabase **del propio usuario** | Lo configura y administra el usuario con su cuenta. El titular no lo recibe |
| Teselas de mapa | IGN y dispositivo | El usuario se conecta directamente al IGN |
| Radio | Servidor de cada emisora | El usuario se conecta directamente a la emisora |

> **Si esto cambia** (por ejemplo, si el titular ofrece su propio servidor de
> sincronización), el titular pasará a tratar **datos de salud**. Habría que
> añadir aquí un tratamiento nuevo, firmar un contrato de encargado con
> Supabase y hacer una **evaluación de impacto** (art. 35 RGPD) antes de
> ponerlo en marcha.

## Evaluación de impacto (EIPD)

No es obligatoria con el funcionamiento actual. Los únicos tratamientos del
titular son técnicos, de bajo riesgo y sin datos sensibles. Hay que repetir esta
valoración si cambia lo descrito arriba.

## Brechas de seguridad

Si se produce una brecha que afecte a los datos de los tratamientos 1 a 3, hay
que notificarla a la AEPD en un plazo de **72 horas** desde que se conoce,
salvo que sea improbable que suponga un riesgo (art. 33 RGPD). Anota aquí
cualquier incidente aunque no se notifique.

| Fecha | Qué pasó | Datos afectados | ¿Notificada? | Medidas |
|---|---|---|---|---|
| — | — | — | — | — |
