# Noticias de última hora y despliegue conectado a GitHub

## Cómo funciona

```
Fuentes (AEMET, GDACS, USGS, Europa Press, El País, BBC Mundo)
        │  RSS / Atom
        ▼
netlify/functions/noticias  ──►  /api/noticias (JSON)  ──►  CDN de Netlify (30 min)
                                                                │
                                                                ▼
                                       App: pestaña «Noticias de última hora»
                                       (última copia guardada para usar sin red)
```

- **Función** `netlify/functions/noticias/noticias.mjs`:
  - lee todas las fuentes en paralelo (7 s como máximo cada una);
  - si una cae, la respuesta lo indica en `fuentes[]` y el resto sigue funcionando.
- **Lógica** `netlify/functions/noticias/core.mjs`:
  - lee RSS y Atom y se queda con lo relevante para la app;
  - descarta deportes y espectáculos;
  - de AEMET solo pasan los avisos naranja y rojo; de GDACS, las alertas naranja y roja;
  - solo noticias de las últimas 48 h, sin duplicados;
  - ordena por gravedad y da prioridad a las fuentes oficiales.
- **Qué se muestra:** solo **titular, fuente, hora y enlace**. No se copian textos de los medios (LPI art. 32.2).
- **Frecuencia:**
  - la CDN guarda la respuesta 30 minutos, así que las fuentes se consultan unas pocas veces por hora, haya los usuarios que haya;
  - la app vuelve a pedirlas cada 30 minutos mientras está abierta y al volver a ella.
- **Service Worker:** `/api/` va siempre a la red, nunca a la caché del SW. Es la única excepción y está documentada en `sw.js`. Sin conexión, la app muestra la última copia que guardó (`kv noticias.cache`).
- **Rutas:** `/api/noticias` → `/.netlify/functions/noticias`. Está en `public/_redirects` y en `netlify.toml`, antes de la regla de la SPA.

### Verificar las fuentes tras publicar
Abre `https://TU-SITIO/api/noticias`. Al final del JSON, `fuentes` dice cuáles responden (`ok: true`) y cuántos titulares dan (`n`). Las direcciones de AEMET y Europa Press están verificadas; las demás se comprueban así tras el primer despliegue y se corrigen en `core.mjs` si alguna falla.

## Por qué hace falta cambiar la forma de publicar
Arrastrar un ZIP (Netlify Drop) solo publica archivos. **Las funciones solo se publican con el despliegue conectado a GitHub** (o con la CLI de Netlify).

## Pasos, en este orden

> ⚠️ La rama `main` de GitHub todavía tiene la **primera versión** del proyecto (un ZIP subido a mano). Todo el trabajo está en la rama `claude/nifty-gates-mhp1yu` (pull request #1). Si conectas Netlify con `main` **antes** de incorporar ese trabajo, Netlify publicaría la versión antigua y **la web dejaría de funcionar**.

1. **Repositorio privado** (recomendado antes de vender): en GitHub, *Settings → General → Danger Zone → Change visibility → Private*.
2. **Aprobar la versión:** incorporar el pull request #1 a `main` (hacer el «merge»). Solo con tu aprobación expresa.
3. **Conectar Netlify** (en tu sitio actual, para conservar la dirección):
   - *Site configuration → Build & deploy → Continuous deployment → Link repository*;
   - elegir **GitHub**, autorizar y seleccionar `facturaciontunutrilaura-dot/SURVIVALISMO`;
   - **Branch to deploy:** `main`. El comando (`npm run build`), la carpeta (`public`) y las funciones se leen solos de `netlify.toml`;
   - guardar. Netlify construye y publica.
4. **Comprobar:**
   - la app muestra la versión nueva;
   - `/api/noticias` responde con noticias;
   - la pestaña Noticias funciona.

### Cómo se trabaja a partir de entonces
- Los cambios se preparan en una rama aparte con su pull request.
- Netlify crea una **previsualización** (*Deploy Preview*) de cada pull request: una dirección privada para probarlo todo, incluidas las noticias, **sin tocar la web publicada**.
- **Se publica solo cuando apruebas e incorporas el pull request a `main`.** Ya no hay ZIP.
