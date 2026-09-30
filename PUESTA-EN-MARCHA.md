# SURVIVAL OFFLINE — Puesta en marcha

Guía práctica y ordenada. Los pasos **1 a 4** son los imprescindibles; el resto
es redundancia. Tiempo total con la redundancia completa: unos 30–40 minutos.

---

## PASO 1 · Publicar la app (elige una vía)

Da igual cuál elijas: el resultado es una URL `https://…` desde la que instalar
la app en el móvil. La carpeta que se publica es siempre **`public/`**, que ya
viene construida en el zip.

### Vía A — Netlify Drop (la más rápida, sin cuenta para empezar)

1. Descomprime `survival-offline.zip` en tu ordenador.
2. Abre **https://app.netlify.com/drop**
3. Arrastra la carpeta **`survival/public`** (la carpeta entera, no su
   contenido) al recuadro de la página.
4. En unos segundos tendrás una URL tipo `https://algo-aleatorio.netlify.app`.
5. Crea una cuenta gratuita cuando te lo ofrezca: **si no lo haces, el sitio es
   temporal**. Con cuenta, se queda permanente.
6. Opcional, en *Site configuration → Change site name*: pon un nombre legible,
   por ejemplo `survival-offline-avila.netlify.app`.

> El zip incluye `public/_redirects` y `public/_headers`, así que la
> configuración de rutas, seguridad y caché se aplica también por esta vía.

### Vía B — Netlify conectado a Git (recomendada si vas a actualizar contenido)

1. Crea una cuenta en **https://app.netlify.com/signup**
2. Sube el proyecto a un repositorio en **https://github.com/new**
   (privado o público, da igual).
3. En Netlify: **Add new site → Import an existing project** → conecta GitHub →
   elige el repositorio.
4. Netlify detectará `netlify.toml` y usará automáticamente
   `npm run build` con la carpeta `public`. Pulsa *Deploy*.
5. A partir de ahí, cada `git push` republica el sitio solo.

- Documentación: https://docs.netlify.com/site-deploys/create-deploys/

### Vía C — Cloudflare Pages (buena como espejo, ver PASO 5)

1. **https://pages.cloudflare.com** → *Create a project* → *Direct Upload*
2. Arrastra la carpeta `public`.
3. Documentación: https://developers.cloudflare.com/pages/get-started/direct-upload/

También existe **https://cloudflare.com/drop** para probar sin cuenta, pero el
sitio caduca **en 1 hora** si no lo reclamas con una cuenta. Para algo que
quieres tener siempre, usa Pages con cuenta.

### Vía D — GitHub Pages (gratis y muy estable)

1. Crea el repositorio en **https://github.com/new**
2. Sube el **contenido de `public/`** a la raíz del repositorio (o sube todo el
   proyecto y publica desde la carpeta `/docs` renombrando `public` a `docs`).
3. En el repositorio: **Settings → Pages** → *Source: Deploy from a branch* →
   rama `main`, carpeta `/ (root)` o `/docs` → *Save*.
4. En 1–10 minutos estará en `https://TUUSUARIO.github.io/NOMBREREPO/`
5. Guía oficial: https://docs.github.com/en/pages/quickstart

> Funciona porque la app usa rutas relativas y navegación por hash. Ten en
> cuenta que GitHub Pages **no admite** `_headers` ni `_redirects`: no tendrás
> las cabeceras de seguridad, pero la app funciona igual.

---

## PASO 2 · Instalarla en el móvil

Esto es lo que convierte una web en una app que sobrevive sin Internet.

**Android (Chrome)**
1. Abre la URL en Chrome.
2. Menú **⋮** → **Añadir a pantalla de inicio** / *Instalar aplicación*.
3. Acepta. Aparecerá un icono de brújula en tu escritorio.

**iPhone / iPad (Safari — tiene que ser Safari, no Chrome)**
1. Abre la URL en **Safari**.
2. Botón **Compartir** (el cuadrado con la flecha hacia arriba).
3. **Añadir a pantalla de inicio** → *Añadir*.

> En iOS este paso no es opcional: Safari puede borrar los datos de sitios web
> poco visitados al cabo de unas semanas. Las apps añadidas a la pantalla de
> inicio quedan protegidas de esa limpieza.

---

## PASO 3 · Descargar todo para que funcione sin Internet

Con Wi-Fi y batería, dentro de la app:

1. **⚙️ Configuración → ⬇ Descargar todos los recursos**
   Espera al mensaje *"N recursos guardados"*.
2. **⚙️ Configuración → 🔒 Solicitar almacenamiento persistente**
   Pide al navegador que no borre los datos si le falta espacio.
3. **👨‍👩‍👧 Familia → 🏠 Añadir mi casa** y después **➕ Añadir ubicación** por cada
   persona a la que querrías llegar. Indica la provincia, las personas y, en
   cada ubicación de familia, al menos una ruta principal y una alternativa. Si
   quieres ver cómo queda antes, pulsa *Ver un ejemplo ficticio* y bórralo luego.
4. **🗺 Mapa → ⬇ Descargar área**
   - Centra el mapa en tu zona y ajusta el zoom.
   - Fuente (mapas del IGN): *Mapa base* para calles, *Mapa topográfico (MTN)* para montaña, *Ortofoto PNOA* para ver el terreno.
   - Zoom mínimo 8, zoom máximo 14–15 para una zona amplia.
   - Comprueba la estimación de teselas antes de pulsar (límite: 3.000).
   - Repite para cada zona que te importe: tu municipio, la ruta a casa desde el
     trabajo, la zona de montaña donde vayas.

**Cuánto ocupa:** la app entera son ~1 MB. Las teselas son lo que pesa: unos
20–35 KB cada una según la capa, así que 2.000 teselas ≈ 40–70 MB. Un móvil normal aguanta de sobra
varias zonas.

---

## PASO 4 · Comprobar que de verdad funciona sin Internet

Hazlo ahora, no el día que haga falta:

1. Activa el **modo avión**.
2. Abre la app desde el icono de la pantalla de inicio.
3. Comprueba: la portada carga, entra en 🚨 Emergencia → *Apagón eléctrico*,
   busca "hipotermia", abre 🗺 Mapa y comprueba que se ve tu zona.
4. Arriba a la derecha debe aparecer el aviso **SIN CONEXIÓN**.

Si algo falla, vuelve al PASO 3 con Wi-Fi y repite la descarga de recursos.

---

## PASO 5 · Redundancia (opcional pero recomendable)

### 5.1 Un segundo alojamiento como espejo

Publica exactamente el mismo `public/` en otro proveedor de los del PASO 1.
Así, si uno cae o cambia de condiciones, tienes de dónde reinstalar.

- Cloudflare Pages: https://pages.cloudflare.com
- GitHub Pages: https://docs.github.com/en/pages/quickstart
- Vercel: https://vercel.com/new

> **Importante:** cada dominio tiene su propia caché y su propia base de datos
> local. Si te cambias de dominio, exporta tus datos en el antiguo e impórtalos
> en el nuevo (ver 5.3). No se sincronizan solos: es el precio de que nada salga
> de tu dispositivo.

### 5.2 Copia local del proyecto

Guarda el `survival-offline.zip` en un disco externo, un USB y/o tu nube.
Para levantarlo en un ordenador sin Internet:

```bash
cd survival
npm run dev
# abre http://localhost:8080
```

Si no tienes Node instalado, cualquier servidor estático vale. Con Python:

```bash
cd survival/public
python3 -m http.server 8080
```

> **No sirve abrir `index.html` con doble clic.** Los módulos JavaScript y el
> Service Worker exigen `http://` o `https://`; con `file://` la app no arranca.
> Node.js se descarga en https://nodejs.org

### 5.3 Copia de tus datos

Tus puntos del mapa, contactos, checklists y plan familiar **solo están en tu
móvil**. Si lo pierdes, se pierden.

1. **⚙️ Configuración → ⬆ Exportar datos (JSON)**
2. Guarda ese archivo fuera del móvil (correo a ti mismo, nube, ordenador).
3. Para restaurar: **⚙️ Configuración → ⬇ Importar datos**.

La copia incluye el centro familiar completo: ubicaciones, rutas, estados,
puntos de encuentro y acuerdos (las teselas de mapa y el audio no, porque pesan
mucho y se pueden volver a añadir).

Hazlo cada vez que cambies algo importante del plan familiar.

### 5.4 La copia que nunca falla: papel

1. **👨‍👩‍👧 Plan familiar** → rellena los campos → **🖨 Imprimir plan**.
2. Imprime dos o tres copias.
3. Mete una en cada mochila y otra en la guantera del coche.

El papel no se queda sin batería, no necesita cobertura y no depende de ningún
servidor. Añade a mano: teléfonos clave, puntos de encuentro y el mapa de tu
zona impreso.

---

## PASO 5 bis · Sincronizar entre tus dispositivos (opcional)

Solo si quieres editar en el móvil y verlo en el ordenador. **No hace falta para
que los datos se guarden**: eso ya funciona sin nada de esto.

1. Crea una cuenta gratuita en **https://supabase.com** y un proyecto nuevo.
2. En el proyecto, ve a **Settings → API Keys** y copia dos cosas:
   - **Project URL** (algo como `https://xxxxxxxx.supabase.co`), que está en
     **Settings → API** o en el botón **Connect** del proyecto
   - la clave pública: vale la nueva **`sb_publishable_…`** o la antigua
     **`anon`** (las dos funcionan; la `anon` se retirará a finales de 2026)
   > ⚠️ **Nunca copies la clave `secret` ni la `service_role`.** Saltan la
   > seguridad RLS y dan acceso total a todos los datos. Las claves publishable
   > y anon están pensadas para ir en el navegador.
3. Ve a **SQL Editor → New query**, pega el script que te da la app en
   ⚙️ Configuración → Sincronización → *"2 · Crear la tabla"* y pulsa **Run**.
   Crea la tabla y, sobre todo, la política **RLS** que impide que nadie más
   pueda leer tus filas.
4. En **Authentication → Providers → Email**, decide si quieres confirmación por
   correo. Si la dejas activada, tendrás que confirmar el correo antes de poder
   entrar.
5. En la app: ⚙️ Configuración → Sincronización. Puedes pegar el bloque entero
   que te da Supabase en **Connect** (o un `.env`) en el campo de arriba y pulsar
   **✨ Detectar URL y clave**: la app separa las dos cosas sola. Después
   **Guardar conexión** → **Crear cuenta** con tu correo y una contraseña.
6. Pulsa **🩺 Comprobar configuración**. Revisa una por una la URL, la clave, la
   conexión, la existencia de la tabla, **que la seguridad RLS esté realmente
   activa**, la sesión y una escritura y lectura de prueba. Si algo falla, te
   dice exactamente qué hacer. No sigas hasta que esté todo en verde.
7. Pulsa **🔄 Sincronizar ahora**. Verás cuántos registros suben.
8. Para el segundo dispositivo: en el primero pulsa **📤 Pasar al otro
   dispositivo** (copia URL y clave al portapapeles), pégalo allí en la
   detección automática, y esta vez pulsa **Entrar** en lugar de *Crear cuenta*.
   Sincroniza y se descargará todo.
9. Activa **"Sincronizar automáticamente"** en ambos para que lo haga al abrir
   la app y al recuperar la conexión.

**Cosas que conviene saber:**

- Los datos quedan **legibles** en Supabase (**Table Editor → `sync_items`**),
  que es justo lo que pediste: puedes verlos y editarlos desde ahí. Eso significa
  también que direcciones, teléfonos y puntos de encuentro están en un servidor
  de terceros. Si algún día prefieres que no lo estén, se puede añadir cifrado.
- **Las teselas de mapa no se sincronizan**: pesan mucho. Descárgalas en cada
  dispositivo desde 🗺 Mapa → Descargar área.
- Si editas lo mismo en dos sitios sin sincronizar entre medias, **gana el que
  sincroniza más tarde**.
- La exportación a JSON sigue existiendo y **sigue siendo tu copia de seguridad
  de verdad**: la sincronización protege contra perder un dispositivo, no contra
  un borrado accidental que se propague.

---

## PASO 6 · Mantenimiento

| Cuándo | Qué hacer |
|---|---|
| Tras cada cambio importante | Pulsar 🔄 Sincronizar ahora en el otro dispositivo |
| Cada 6 meses | Revisar caducidades en 🎒 Equipo → checklists (botiquín, despensa, pilas) |
| Cada 6 meses | Comprobar que la radio a pilas funciona y tiene pilas de repuesto |
| Cada junio | Revisar la preparación ante incendios forestales de tu zona (en Ávila, checklist *Plan Ávila*, bloque de verano) |
| Cada noviembre | Revisar el bloque de invierno (nieve, cadenas, autonomía 7 días) |
| Tras cada cambio | Exportar datos e imprimir el plan familiar actualizado |
| Anualmente | Verificar teléfonos oficiales y umbrales AEMET (ver README §7.6) |

---

## Resumen de enlaces

| Para qué | Enlace |
|---|---|
| Publicar arrastrando (Netlify Drop) | https://app.netlify.com/drop |
| Cuenta de Netlify | https://app.netlify.com/signup |
| Documentación de despliegue Netlify | https://docs.netlify.com/site-deploys/create-deploys/ |
| Crear repositorio en GitHub | https://github.com/new |
| GitHub Pages (guía oficial) | https://docs.github.com/en/pages/quickstart |
| Cloudflare Pages | https://pages.cloudflare.com |
| Cloudflare Pages — Direct Upload | https://developers.cloudflare.com/pages/get-started/direct-upload/ |
| Vercel | https://vercel.com/new |
| Node.js (para uso local) | https://nodejs.org |
| Supabase (sincronización opcional) | https://supabase.com |
| Avisos AEMET — provincia de Ávila | https://www.aemet.es/es/eltiempo/prediccion/avisos?p=6705 |
| Emergencias 112 Castilla y León | https://112.jcyl.es/ |
| Épocas de peligro de incendios (JCyL) | https://medioambiente.jcyl.es/web/es/medio-natural/actividades-epocas-peligro-incendios.html |
| Estado de carreteras (DGT) | https://infocar.dgt.es/etraffic/ |
| SAIH Duero (caudales y embalses) | https://www.saihduero.es/ |
| Registro oficial de emisoras FM | https://avancedigital.mineco.gob.es/espectro/servicio-radiodifusion/radiodifusion-FM/Paginas/estaciones-radiodifusion-fm.aspx |
| Protección Civil — Ayuntamiento de Ávila | https://www.avila.es/articles/emergencias-y-seguridad-ciudadana |
