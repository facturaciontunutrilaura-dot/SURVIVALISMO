# Revisión jurídica de SUPERVIVENCIA

*Fecha: 17 de noviembre de 2026 · Versión revisada: 1.21.2*

> **Aviso importante.** Esta revisión la ha hecho una IA con criterio jurídico,
> no un abogado colegiado. Sirve para detectar problemas y preparar el trabajo.
> **No sustituye a un dictamen profesional.** Antes de vender la app o de cobrar
> por ella, un abogado especialista en derecho digital debe revisar este
> documento y los textos legales de la app. Es una revisión corta si le llevas
> esto preparado.

---

## 1. Resumen

| Situación | Cuántos | Qué significa |
|---|---|---|
| ✅ Corregido en esta versión | 7 | Ya está arreglado en el código |
| 🔴 Grave, pendiente de ti | 5 | Hay que resolverlo **antes de publicar con tu nombre o vender** |
| 🟠 Riesgo medio | 6 | Decisiones de negocio con riesgo legal |
| 🟢 Correcto | 10 | Revisado y sin problema |

**Conclusión:** la app está bien planteada desde el punto de vista legal. Guarda
los datos en el dispositivo, no usa analítica ni publicidad y el contenido es
prudente. Los vacíos importantes no están en el código, sino **fuera de él**:
quién es el titular, de quién es la propiedad intelectual, el uso de marcas y
contenidos de terceros (radios y prensa) y el encaje con tu actividad
profesional y tu seguro.

---

## 2. ✅ Corregido en esta versión (1.21.2)

1. **Escuchas de radio. Era incorrecto.** La app decía que *«escuchar no está
   penalizado en general»*. No es así: interceptar sin autorización
   comunicaciones no destinadas al público (policía, emergencias,
   conversaciones privadas) es una infracción de la Ley 11/2022, General de
   Telecomunicaciones, y difundir lo escuchado puede ser delito (art. 197 del
   Código Penal). El texto ahora lo dice y limita la escucha a la radiodifusión,
   la radioafición y los canales de uso común.

2. **Caza y pesca.** La app decía que *«en una emergencia real, prima la ley de
   necesidad»*. Eso podía leerse como un permiso para cazar sin licencia. El
   estado de necesidad (art. 20.5 CP) es una eximente que valora un juez caso
   por caso, no una autorización. Ahora el texto dice que cazar sin
   autorización es infracción y, con lazos, cepos, veneno o especies
   protegidas, delito (arts. 334 a 336 CP; Ley 42/2007 de Patrimonio Natural).
   También deja claro que la guía no enseña a cazar ni a poner trampas.

3. **Avisos push que podían confundirse con alertas oficiales.** Los avisos
   basados en noticias de prensa ahora terminan siempre con *«Prensa, no es un
   aviso oficial»*. Así se reduce el riesgo de alarma injustificada y de
   reclamaciones si un titular es erróneo. Los avisos de fuentes oficiales
   (AEMET, GDACS, USGS) no llevan esa coletilla.

4. **Alex.** Tiene nombre y cara de persona. Ahora se avisa de que *«es un
   asistente automático, no una persona»*. Técnicamente no es un sistema de IA
   en el sentido del Reglamento (UE) 2024/1689: funciona con reglas y un
   buscador. Aun así, aclararlo evita reclamaciones por publicidad engañosa y
   cumple el espíritu de su art. 50.

5. **Licencia de Leaflet.** La licencia BSD-2 exige incluir su texto al
   distribuir la librería y no estaba. Se ha añadido
   `public/assets/vendor/leaflet/LICENSE.txt`. La de qrcode-generator (MIT) ya
   estaba incluida.

6. **Consultas de soporte.** La nueva sección de Ayuda invita a escribir al
   correo de contacto, pero la política de privacidad no lo recogía. Se ha
   añadido ese tratamiento: finalidad, base jurídica y plazo de conservación.
   Se recomienda no enviar por correo información médica ni la copia de
   seguridad.

7. **Prensa, marcas y licencias en el aviso legal.** Ahora explica que de las
   noticias solo se muestran el titular y un enlace, que los nombres de medios
   y emisoras son marcas de terceros usadas solo para identificarlos y qué
   licencias de terceros se usan.

---

## 3. 🔴 Grave: resolver antes de publicar con tu nombre o vender

### 3.1 Falta el titular (LSSI, art. 10; RGPD, art. 13)
Toda web o app que se ofrezca en España debe identificar a su titular: nombre o
razón social, NIF, domicilio y correo. Ahora mismo esos campos están vacíos y la
pantalla legal muestra un aviso en rojo.
**Qué hacer:** rellenar `TITULAR` en `public/data/content/legal.js` y poner la
variable `VAPID_SUBJECT=mailto:<correo>` en Netlify.
**Ojo:** decide antes **quién es el titular**: tú como autónoma, Tunutrilaura u
otra sociedad. Ver el punto 3.4.

### 3.2 Propiedad intelectual del código y los textos (vacío legal)
Este es **el principal vacío legal del proyecto**. La Ley de Propiedad
Intelectual (art. 5) solo considera autor a una **persona física**. Gran parte
del código y del texto de la app se ha generado con IA. En España (y en la UE)
no está resuelto si ese material tiene protección por derechos de autor. Lo más
probable es que **las partes generadas por IA sin una aportación creativa
humana relevante no estén protegidas**.

Consecuencias prácticas:
- Si vendes «exclusividad» a una influencer, lo que le vendes con seguridad es
  **el trabajo, el control del código y tu compromiso contractual**, no
  necesariamente un derecho de autor que pueda hacer valer frente a terceros
  que la copien.
- La protección real es **contractual** y de **secreto empresarial** (Ley
  1/2019): no publicar el código, mantener el repositorio privado y firmar
  cláusulas de confidencialidad.

**Qué hacer:**
- Mantener el repositorio de GitHub **privado** (compruébalo).
- Guardar prueba de fecha y autoría (el historial de Git ya la da). Si quieres
  más, inscribe en el Registro de la Propiedad Intelectual o en un servicio de
  sellado de tiempo las partes en las que tu aportación sea clara: estructura,
  selección y orden del contenido, diseño.
- En cualquier contrato de venta, **no garantizar** que «todo el código está
  protegido por derechos de autor». Garantizar solo que lo has desarrollado tú
  (con herramientas) y que no infringe derechos de terceros que conozcas.

### 3.3 La foto de Alex
Es un rostro realista. El historial del proyecto solo dice que es un *«recorte
de la imagen del personaje»*, sin indicar de dónde sale.
- Si la generó una IA, sin parecido con una persona real: **sin problema**.
  Conviene guardar prueba de cómo se generó.
- Si es una persona real o se le parece mucho: hace falta su **consentimiento
  por escrito** (LO 1/1982, de derecho a la propia imagen).
- Si sale de un banco de imágenes: hay que revisar la licencia de uso comercial.

**Qué hacer:** confirmar el origen y guardarlo por escrito. Si no se puede
acreditar, cambiar la imagen.

### 3.4 Encaje con tu actividad profesional, tus impuestos y tu seguro
Eres nutricionista. Esta app no tiene relación con tu actividad sanitaria
registrada. Si la publicas o la vendes con tu nombre o con el de Tunutrilaura:
- **Alta fiscal:** vender o licenciar software es una actividad distinta. Hay que
  darse de alta en el epígrafe del IAE adecuado y facturar con el IVA que
  corresponda. **Consúltalo con tu gestoría.**
- **Seguro de responsabilidad civil:** tu póliza de nutricionista casi seguro
  **no cubre** daños derivados de una app de supervivencia. Por ejemplo: alguien
  se intoxica con una planta, se quema o se lesiona siguiendo el contenido.
  Pide a tu aseguradora una ampliación o una póliza de RC para contenidos
  digitales.
- **Imagen profesional:** conviene que la app **no** se asocie a tu marca
  sanitaria. Evita que tus colegios profesionales o pacientes la vean como
  consejo sanitario tuyo.

### 3.5 Contrato con la influencer (pendiente por decisión tuya)
Sin contrato escrito no hay amparo. Cuando retomes ese tema, el contrato debe
fijar como mínimo:
- qué se cede (licencia o venta), en qué territorio y durante cuánto tiempo, y
  si hay exclusividad;
- **quién es titular y responsable** de la app publicada: datos legales,
  privacidad y contenido;
- quién responde por el contenido y frente a los usuarios, con una cláusula de
  indemnidad;
- quién es responsable del tratamiento de datos y, si tú mantienes el servidor,
  un **contrato de encargado del tratamiento** (art. 28 RGPD);
- mantenimiento, actualizaciones, precio y forma de pago;
- confidencialidad del código y prohibición de revenderlo;
- qué pasa si se termina la relación.

---

## 4. 🟠 Riesgo medio: decisiones de negocio

### 4.1 Emisoras comerciales en la radio
La app reproduce el directo de SER, COPE, Onda Cero, esRadio, LOS40, Cadena 100,
Europa FM, Dial, Rock FM y Kiss FM a partir de un directorio abierto.
Técnicamente, el móvil se conecta directamente al servidor de la emisora. Según
el TJUE, enlazar a un contenido libremente accesible no es en principio un
nuevo «acto de comunicación pública». Pero:
- las condiciones de uso de los grupos de radio suelen prohibir integrar su
  señal en aplicaciones de terceros **con fines comerciales**;
- se usan sus nombres, que son marcas registradas;
- las **emisoras musicales** añaden el riesgo de los derechos de la música
  (SGAE, AGEDI, AIE) y no aportan nada en una emergencia.

**Recomendación:** en una versión de pago o patrocinada, **quitar las emisoras
musicales** y dejar RNE y Radio 5 (servicio público), o pedir autorización a los
grupos. Mientras la app sea gratuita y sin publicidad, el riesgo es bajo.

### 4.2 Titulares de prensa (El País, Europa Press, BBC Mundo)
Solo se muestran el titular y el enlace. El derecho de los editores de prensa
(art. 129 bis LPI) excluye los enlaces y los *extractos muy breves*, así que el
uso actual es defendible. Pero las condiciones de los canales RSS de muchos
medios limitan su uso a fines **personales y no comerciales**.
**Recomendación:** en una versión comercial, revisar las condiciones de cada
medio o limitar las noticias a fuentes oficiales (AEMET, GDACS, USGS, 112 y
Protección Civil), que no tienen esa restricción.

### 4.3 Responsabilidad por el contenido
El aviso legal limita la responsabilidad, pero **en España no se puede excluir
la responsabilidad por negligencia grave** (art. 1102 del Código Civil), y
frente a consumidores esas cláusulas pueden ser abusivas (art. 86 del Texto
Refundido de Consumidores). La mejor protección es que el contenido sea
correcto.
**Recomendación:**
- Que un profesional sanitario (médico o enfermero) revise el contenido de
  primeros auxilios. Las fichas marcadas como *«pendiente de revisión»* ya lo
  avisan.
- Mantener las fechas de consulta de las fuentes y revisar el contenido al
  menos una vez al año: teléfonos, planes y normativa cambian.

### 4.4 Si cobras a los usuarios finales
Si la app se vende directamente a consumidores, y no a la influencer:
- hace falta **información precontractual** y **condiciones de venta**;
- el **derecho de desistimiento** de 14 días solo se pierde si el usuario da su
  consentimiento expreso a empezar la descarga y reconoce que lo pierde
  (art. 103.m TRLGDCU);
- hay obligación de **conformidad y actualizaciones** del contenido digital
  (arts. 114 y siguientes TRLGDCU).

Si se vende a través de Google Play o App Store, ellos gestionan el cobro, pero
**no** las obligaciones del titular sobre el contenido.

### 4.5 Marca
«Supervivencia» o «Survivalismo» son términos **descriptivos**: la Oficina
Española de Patentes y Marcas no los registraría como marca (art. 5 de la Ley
17/2001, de Marcas), y cualquiera puede usarlos.
**Recomendación:** si el producto va a tener recorrido comercial, elegir un
nombre distintivo, comprobar en la OEPM y en la EUIPO que está libre y
registrarlo.

### 4.6 Proveedores (Netlify)
Netlify trata las suscripciones a los avisos y los registros técnicos del
servidor. Es tu **encargado del tratamiento** (art. 28 RGPD).
**Recomendación:** aceptar o descargar el *Data Processing Agreement* de Netlify
desde su web y guardarlo. Comprobar que Netlify figura en la lista del Marco de
Privacidad de Datos UE-EE. UU. (*Data Privacy Framework*) o que su DPA incluye
cláusulas contractuales tipo.

---

## 5. 🟢 Revisado y correcto

- **Cookies:** no hay cookies de terceros, analítica ni publicidad. El
  almacenamiento local (IndexedDB y localStorage) es estrictamente necesario
  para el servicio y **no necesita banner de consentimiento** (art. 22.2 LSSI).
- **Datos de salud:** se quedan en el dispositivo. La sincronización exige un
  consentimiento explícito (art. 9.2.a RGPD) y va a un servidor del propio
  usuario. El titular no los recibe.
- **Geolocalización:** se usa solo en el dispositivo.
- **Menores:** la política indica que los menores de 14 años necesitan el
  consentimiento de sus padres o tutores (art. 7 LOPDGDD).
- **Defensa personal:** el enfoque es preventivo. Explica bien la legítima
  defensa (art. 20.4 CP) y desaconseja llevar armas. No enseña técnicas ofensivas.
- **Armas blancas:** advierte de su regulación y de que está prohibido llevarlas
  en la vía pública sin causa.
- **Medicación:** no da dosis. Alex remite al farmacéutico, al médico o al 112.
  El yodo solo se toma con indicación de las autoridades.
- **Electricidad y gas:** solo explica cómo cortar el suministro y qué hacer en
  una fuga, sin trabajos de instalación.
- **Plantas y setas:** insiste en que nada se consume sin una identificación
  experta.
- **Fuentes:** cada dato tiene su fuente oficial y su fecha de consulta.

---

## 6. Lista de comprobación antes de vender o cobrar

- [ ] Decidir quién es el titular (tú, Tunutrilaura u otra sociedad).
- [ ] Rellenar `TITULAR` en `public/data/content/legal.js`.
- [ ] Poner `VAPID_SUBJECT` en Netlify.
- [ ] Confirmar y documentar el origen de la foto de Alex.
- [ ] Comprobar que el repositorio de GitHub es **privado**.
- [ ] Consultar con la gestoría el alta fiscal de la actividad de software.
- [ ] Revisar con la aseguradora la cobertura de responsabilidad civil.
- [ ] Guardar el DPA de Netlify.
- [ ] Decidir qué hacer con las emisoras musicales y los medios de prensa en la
      versión comercial.
- [ ] Que un sanitario revise el contenido de primeros auxilios.
- [ ] Elegir y registrar una marca distintiva (si va a tener recorrido).
- [ ] Contrato con la influencer (cuando lo retomes).
- [ ] **Revisión final de un abogado** de este documento y de los textos de
      `legal.js`.

---

## 7. Documentos legales del proyecto

| Documento | Dónde está | Estado |
|---|---|---|
| Aviso legal y condiciones de uso | App: `#/legal/aviso` · `public/data/content/legal.js` | ✅ Falta el titular |
| Política de privacidad | App: `#/legal/privacidad` · mismo archivo | ✅ Falta el titular |
| Consentimiento para sincronizar | App: Ajustes → Sincronización | ✅ |
| Registro de actividades de tratamiento (art. 30 RGPD) | `docs/legal/REGISTRO-DE-ACTIVIDADES.md` | ✅ Falta el titular |
| Licencias de terceros | `public/assets/vendor/*/LICENSE.txt`, `assets/fonts/OFL-Manrope.txt` | ✅ |
| Contrato de venta o licencia con la influencer | — | ⏸ Pendiente por decisión tuya |
| Condiciones de venta a consumidores | — | Solo si se cobra a usuarios finales |
| Evaluación de impacto (EIPD, art. 35 RGPD) | — | Solo si el titular aloja la sincronización de datos de salud |
