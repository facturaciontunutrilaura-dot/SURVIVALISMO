# Ubicación y contenido local (v1.16)

La app ya no da por hecho que se vive en Ávila. Cada persona indica su **provincia** y su **ciudad o pueblo** con dos desplegables:
- en la portada, la primera vez;
- en Ajustes;
- en Riesgos → Mi zona;
- en el Plan de evacuación.

También se puede detectar con el GPS.

## Qué se guarda
- En `kv ubicacion` se guarda `{ cod, mun, modo, ts }`: el código de provincia, el código INE del municipio y si se eligió a mano o con el GPS.
- **Nunca se guardan coordenadas ni direcciones.** Con el GPS, la posición se convierte dentro del móvil en provincia y municipio, y se descarta.
- La lista de municipios está en `data/geo/municipios.json`. La genera `tools/build-geo.mjs` a partir de es-atlas (IGN): 8.213 municipios con el centro de su término municipal.

## Contenido solo para una provincia
- `prov: '05'` en una sección, checklist, curso o categoría del reto hace que solo se muestre a quien vive en esa provincia.
- En los bloques de un artículo:
  - `soloProv: '05'`: el bloque se muestra solo en esa provincia;
  - `noProv: '05'`: el bloque se muestra en todas menos en esa.
- `ubicacion.esLocal(cod)` y `provinciaActual()` deciden qué se ve. La provincia se lee antes de pintar la primera pantalla.
- **Ávila:** su contenido local se conserva tal cual (Guía de Ávila, Plan Ávila, curso 09, preguntas del reto, teléfonos locales, umbrales de AEMET), pero solo lo ve quien elige Ávila.

## Plan de evacuación: dos modos
- **Ávila:** corredores trazados a mano desde Ávila capital (`evac-rutas.geojson`), como hasta ahora.
- **Resto de España:** 17 salidas fijas (`DESTINOS` en `data/content/evacuacion.js`): pasos a Portugal, Francia y Andorra, y puertos.
  - Se ordenan por distancia desde el municipio elegido.
  - La distancia es una **estimación**: línea recta × 1,3.
  - En el mapa, el trazado es una línea recta y la app lo dice.
  - Cada escenario tiene textos generales en `gen` (qué tipos de salida, en qué orden y cuáles evitar).
  - En un accidente nuclear se descartan las salidas cuya línea pasa a menos de 30 km de una central.
  - El «refugio en el interior» se explica con criterios, sin nombrar lugares concretos.

## Textos generalizados
- Las notas de emergencias que daban umbrales de AEMET de Ávila ahora remiten a los de cada zona.
- También se han generalizado las alusiones a Ávila en los husos UTM, la latitud, la altitud al hervir el agua y los puertos de montaña.
- En la ficha de RCP, «Ávila cuenta con espacios cardioprotegidos…» pasa a «Muchos municipios tienen espacios cardioprotegidos…». Es un dato local, **no una instrucción clínica**: los pasos de RCP no se han tocado.
- En los escenarios de evacuación se han quitado dos detalles del hogar de la propietaria: el agua «para los dos» y «vuestro barrio junto a la estación».
