# Estética y portada (v1.14)

## Estética
- **Refugio**, el tema claro: piedra, verde salvia y esquinas redondeadas.
- **Noche serena**, el tema oscuro: azul noche, crema y ámbar.
- **Ajustes → Tema:**
  - *Automático* (por defecto): sigue el modo claro u oscuro del móvil;
  - *Refugio*;
  - *Noche serena*;
  - *Modo noche* (baja luminosidad).
- **Ajustes guardados con el tema antiguo:** el valor `dark` de las versiones anteriores pasa solo a `auto` (`store.js`). Las copias de seguridad antiguas siguen sirviendo.
- **Contraste alto:** se mantiene en todos los temas. Las pruebas comprueban el contraste AA en 6 combinaciones.
- **Rojo reservado:** solo para Emergencia, el 112 y lo crítico.
- **Letra:** Manrope, incluida en la app (`assets/fonts/`, licencia SIL OFL 1.1), así que funciona sin conexión. Se acaban las mayúsculas estrechas.
- **Variables de color:** las de la paleta anterior (`--olive`, `--sand`…) conservan el nombre para no tocar cientos de reglas. Las nuevas, como `--danger-bg`, `--warn-txt` u `--on-accent`, sustituyen a los colores que antes estaban escritos a mano.

## Portada
Está ordenada por **momentos**, no por temas: `PORTADA` y `GRUPOS` en `data/content/index.js`.

| Bloque | Puertas |
|---|---|
| Prepárate | Mi plan familiar · Mochila y despensa · Plan de evacuación · Entrenamiento |
| Si está pasando | En casa durante la crisis · Primeros auxilios · Agua y comida · Comunicaciones · Seguridad y defensa |
| Si tienes que salir | Orientación y mapas · Vida en el campo · Coche y mascotas |
| Calma y ánimo | Calma y ánimo |
| Aprende más | Riesgos en España y Ávila · Formación · Biblioteca |

- **Arriba:**
  - *Emergencia ahora* y el 112;
  - un solo buscador, que también permite preguntar a Alex (`#/sec/alex?q=…`);
  - una franja si la última copia de noticias trae algo muy grave de las últimas 12 horas.
- **Barra inferior:** Inicio · SOS · Noticias · Alex · Mi plan. Ajustes está en la cabecera (⚙️).
- **Grupos:** cada uno es una pantalla nueva (`#/grupo/<id>`) que lleva a las secciones de siempre. **No se ha borrado ni renombrado ningún id ni ninguna ruta.** Solo cambian los nombres que se ven, por ejemplo «Compra urgente», «Mochila y equipo», «Seguridad y defensa» o «Ajustes».
