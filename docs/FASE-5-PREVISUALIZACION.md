# Cómo probar la versión nueva ANTES de publicarla

Esta guía es para ti, sin conocimientos de programación. Lo que abras en tu
ordenador es **exactamente el mismo código** que después se publicaría en
Netlify, con las mismas reglas de seguridad. **Todavía no se ha publicado
nada:** la web actual sigue igual hasta que tú lo apruebes.

Versión que vas a probar: **1.6.0** (rama `claude/nifty-gates-mhp1yu`).

---

## Parte 1 · Abrir la previsualización en tu ordenador (una sola vez)

### 1.1 Lo que necesitas

1. **Google Chrome** (o Microsoft Edge).
2. **Node.js**, un programa gratuito que hace de «servidor» en tu ordenador:
   - Ve a **https://nodejs.org** y descarga la versión que pone **«LTS»**.
   - Instálala como cualquier programa (siguiente, siguiente, aceptar).
3. **El código de la versión nueva**:
   - Abre
     **https://github.com/facturaciontunutrilaura-dot/SURVIVALISMO/tree/claude/nifty-gates-mhp1yu**
   - Pulsa el botón verde **«Code»** y luego **«Download ZIP»**.
   - Descomprime el ZIP (doble clic). Tendrás una carpeta llamada algo como
     `SURVIVALISMO-claude-nifty-gates-mhp1yu`.

### 1.2 Arrancar la previsualización

1. Abre una ventana de comandos:
   - **Mac**: abre la app **Terminal** (Aplicaciones → Utilidades).
   - **Windows**: abre **PowerShell** (búscalo en el menú Inicio).
2. Escribe `cd ` (con un espacio al final), **arrastra la carpeta
   descomprimida** a la ventana y pulsa **Intro**.
3. Escribe exactamente esto y pulsa **Intro**:

   ```
   npm start
   ```

4. Debe aparecer un mensaje como:
   `SUPERVIVENCIA (previsualización local, cabeceras de producción) → http://localhost:8080`
5. Abre Chrome y entra en: **http://localhost:8080**

No hace falta instalar nada más: este comando no necesita `npm install`.

**Para cerrarla:** vuelve a la ventana de comandos y pulsa **Ctrl + C**.
**Para volver a abrirla otro día:** repite los pasos 1 a 5 del apartado 1.2.

> Si Chrome ya tenía abierta una versión anterior en esa misma dirección,
> puede aparecer arriba «Hay una versión nueva… **Actualizar ahora**»:
> púlsalo.

---

## Parte 2 · Pruebas en el ordenador (unos 20 minutos)

Para cada prueba, apunta **✅ funciona** o **❌ no funciona + qué ves**.
Si puedes, haz una captura de pantalla.

### A. Lo esencial

1. **Portada.** Arriba ves **SOS** y el botón rojo **112**. ¿Se ve todo sin
   que nada se corte?
2. Pulsa **SOS**. Arriba aparece **«Llamar al 112»**. En el ordenador no
   llamará: es normal.
3. En SOS, pulsa **«Mis datos vitales»**. Si no has apuntado nada, lo dice y
   te lleva al plan familiar.
4. Pulsa **Buscar** (abajo a la derecha) y escribe **«sangra mucho»**. El
   primer resultado debe ser sobre **hemorragias**, con la palabra resaltada.
5. Pulsa la flecha **←** de arriba a la izquierda. Debe volver a donde
   estabas.

### B. «¿Está lista tu app?»

6. Ve a **Inicio → Configuración**. Arriba verás **«¿Está lista tu app?»**
   con una lista de comprobaciones.
7. Justo debajo, abre **«Información para pruebas en el móvil»** y pulsa
   **«Copiar informe»**. Pégalo en un correo o nota: son datos técnicos, sin
   nada personal.

### C. Funcionar sin Internet

8. Navega un poco por la app, con Internet, para que se guarde todo.
9. **Apaga el wifi** del ordenador (o quita el cable).
10. Recarga la página (tecla **F5**). La app debe abrirse igual. Arriba a la
    derecha aparece **«SIN CONEXIÓN»**.
11. Prueba SOS, una ficha de primeros auxilios, el buscador y un checklist.
    Todo debe funcionar.
12. **Vuelve a encender el wifi.** El aviso «SIN CONEXIÓN» desaparece solo.

### D. Mapas del IGN (prueba real importante)

Es la **primera vez que se prueba con el servidor real del IGN**: el entorno
de desarrollo no puede conectarse a él.

13. Con Internet, pulsa **Mapa** (barra inferior). ¿Se ve el mapa del IGN,
    con calles y relieve, y no solo líneas de provincias?
14. Acerca el mapa a tu pueblo o barrio, que se vea una zona pequeña.
15. Pulsa **Descargar**. Deja los valores y pulsa el botón **«Descargar»**
    del recuadro.
16. Espera a que termine y **copia el mensaje final**. Debería decir
    **«Descarga completa»**. Si dice «No se ha podido guardar ninguna
    tesela», **avísame**: significa que el IGN no permite guardar sus mapas
    desde el navegador.
17. Apaga el wifi, recarga (**F5**) y vuelve a **Mapa**, a la misma zona.
    ¿Se sigue viendo el mapa descargado? Arriba debe poner «N teselas
    guardadas · SIN CONEXIÓN».
18. Enciende el wifi.

### E. Copias de seguridad

19. En **Configuración → Exportar datos (JSON)** se descarga un archivo de
    copia.
20. Pulsa **Importar datos** y elige ese archivo. Antes de hacer nada debe
    enseñarte un **resumen** («Copia del…, contiene…») y esperar a que
    pulses **«Restaurar esta copia»**.
21. Prueba a importar un archivo que **no** sea una copia (una foto, un
    PDF…). Debe decir que no se puede restaurar y que **tus datos no se han
    tocado**.

### F. Cerrar del todo y volver a abrir

22. Cierra Chrome del todo. Vuelve a abrirlo y entra en
    **http://localhost:8080**. Con la previsualización todavía en marcha
    (ventana de comandos abierta), todo debe seguir ahí: tus datos,
    checklists…

### G. Solo con el teclado (opcional)

23. Pulsa la tecla **Tab** varias veces en la portada y en SOS. Debe verse
    siempre un **recuadro claro** alrededor de lo que está seleccionado, y
    nunca debe quedar escondido debajo de la barra de abajo.

---

## Parte 3 · Pruebas en el MÓVIL (lo que yo no puedo probar)

### Importante: qué se puede probar en el móvil con la previsualización local

El móvil puede abrir la previsualización de tu ordenador si ambos están en el
**mismo wifi**:
- Ordenador **Mac**: Ajustes del Sistema → Wi-Fi → Detalles → «Dirección
  IP».
- Ordenador **Windows**: en PowerShell escribe `ipconfig` y busca «Dirección
  IPv4».
- En el móvil, abre `http://ESA-DIRECCIÓN:8080` (por ejemplo,
  `http://192.168.1.35:8080`).

Pero, por seguridad, los navegadores **solo** permiten **instalar la app,
usarla sin Internet y proteger los datos** en páginas **https** (o en
`localhost`). Por eso:

| Prueba | Con la previsualización por wifi | Qué haría falta |
|---|---|---|
| Ver la app, botones, textos, teclado, Atrás, gestos, una mano, 112, VoiceOver, TalkBack | ✅ Se puede | Nada más |
| Instalar como app, funcionar sin Internet, datos protegidos, cerrar y reabrir sin red | ❌ No se puede por wifi | **Android**: la opción A de abajo. **iPhone**: una dirección **https** privada de prueba. Implica subir la versión a un servidor (p. ej., una «previsualización» de Netlify que **no** sustituye a la web actual) o un túnel. **Es una decisión tuya; no he hecho nada de esto.** |

**Opción A · Android con cable USB** (hace que el móvil vea `localhost` y
permite probar instalación y offline sin publicar nada):
1. En el móvil, activa las **Opciones de desarrollador** (Ajustes → Acerca
   del teléfono → pulsa 7 veces «Número de compilación») y dentro, la
   **Depuración USB**.
2. Conecta el móvil al ordenador con el cable.
3. En Chrome del **ordenador**, abre `chrome://inspect`. Pulsa **«Port
   forwarding»**, añade `8080` → `localhost:8080`, marca **«Enable port
   forwarding»** y pulsa **Done**.
4. En Chrome del **móvil**, abre `http://localhost:8080`.

### Lista de pruebas en el móvil

Marca cada una con ✅ o ❌ y lo que veas. **Para cada ❌, copia el informe**:
Configuración → «Información para pruebas en el móvil» → «Copiar informe».

**Android (Chrome)**
1. **Botón Atrás** (o gesto de deslizar desde el borde): Portada → SOS →
   Hemorragia → Atrás → debe volver a la lista SOS, en el mismo sitio →
   Atrás → portada.
2. **112**: en SOS pulsa «Llamar al 112». **Debe abrirse el marcador con el
   112 escrito, SIN llamar.** No pulses llamar.
3. **Teclado**: en Buscar, escribe. El campo debe seguir visible encima del
   teclado. Repite en Plan familiar (escribe en «Información médica»).
4. **Una mano**, con el móvil en una mano y el pulgar: ¿alcanzas el botón
   del 112 de abajo en SOS? ¿Y el botón «Deshacer» cuando borras un
   contacto?
5. **TalkBack** (Ajustes → Accesibilidad → TalkBack):
   - Desliza por la barra de abajo. Debe decir «Inicio, SOS, Familia, Mapa,
     Buscar», sin describir dibujos.
   - En SOS debe decir «Llamar al 112, teléfono de emergencias».
   - Al cambiar de pantalla debe leer el título de la nueva.
6. **Letra grande del móvil** (Ajustes → Pantalla → Tamaño de fuente al
   máximo) y en la app, Configuración → Tamaño de texto XL: ¿se lee todo sin
   cortes?
7. Con la **opción A** (cable):
   - **Instalar**: Configuración → «¿Está lista tu app?» → «Instalar», o
     menú ⋮ → «Instalar app». Debe aparecer el icono en el móvil.
   - Abre la app instalada, **activa el modo avión**, cierra la app del todo
     (quítala de recientes) y vuelve a abrirla: debe funcionar, con SOS y
     tus datos.
   - Haz la prueba de mapas D (descargar zona, modo avión, verla).
   - En «¿Está lista tu app?», ¿pone «Datos protegidos»?

**iPhone (Safari)**
8. **Gesto atrás**: desliza desde el borde izquierdo en Portada → SOS →
   Hemorragia: debe volver pantalla a pantalla.
9. **112**: igual que en Android, **sin llamar**.
10. **Teclado**: igual que en Android.
11. **VoiceOver** (Ajustes → Accesibilidad → VoiceOver): las mismas
    comprobaciones que con TalkBack.
12. **Importar una copia desde «Archivos»**: guarda en el iPhone un archivo
    de copia (por correo o AirDrop). En Configuración → Importar datos,
    elígelo desde «Archivos». Debe salir el resumen antes de restaurar.
13. Solo con una dirección **https** (si decides hacerla):
    - **Instalar**: botón Compartir → «Añadir a pantalla de inicio».
    - Abrir la app instalada en modo avión.
    - Pruebas de mapas.

**Modo noche en el móvil** (Configuración → Tema → Modo noche), de noche y
con poco brillo: ¿se lee bien sin deslumbrar? ¿Se ven la barra de abajo y el
112?

---

## Parte 4 · Cómo contarme el resultado

Envíame, por ejemplo:

```
Ordenador: A1 ✅  A2 ✅ … D16 ❌ «No se ha podido guardar ninguna tesela…»
Android (modelo): 1 ✅  2 ✅  3 ❌ el teclado tapa el campo en Plan familiar (captura)
iPhone (modelo): …
Informe técnico: (pega aquí lo de «Copiar informe»)
```

Con eso decido si hay que corregir algo antes de publicar. **Nada se
publicará en Netlify hasta que me digas expresamente que lo apruebas.**
