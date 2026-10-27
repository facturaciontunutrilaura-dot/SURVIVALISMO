# Editor de reels

Convierte un guion en un vídeo vertical (1080×1920) listo para Instagram, TikTok o Shorts. Incluye:
- voz en off en español,
- subtítulos animados palabra a palabra,
- movimiento de cámara sobre cada ilustración,
- efectos (lluvia, humo, brasas, parpadeo de luz, sirena, temblor, polvo, nieve),
- música ambiente.

## Cómo se usa
Escríbele a Claude el escenario. Claude se encarga de todo lo demás:
1. Escribe el guion en `episodios/NNN-nombre/guion.json`, con la narración en primera persona del protagonista.
2. Genera las ilustraciones en Canva usando la imagen de referencia de `personaje.md`, para que el personaje sea siempre el mismo.
3. Las guarda en `episodios/NNN-nombre/imagenes/`.
4. Monta el vídeo con `python3 editor/render.py editor/episodios/NNN-nombre`.

La primera vez hay que ejecutar `editor/instalar.sh`, que instala las voces y las dependencias.

## Formato del guion
```json
{
  "titulo": "El día que se fue la luz",
  "voz": "es_ES-sharvard-medium",
  "tono": "media",
  "velocidad": 1.0,
  "musica": "tension",
  "escenas": [
    {"imagen": "imagenes/01.png", "texto": "Me llamo Álex. Ese día *se fue la luz*.", "movimiento": "acercar", "efecto": "parpadeo"}
  ]
}
```
- **tono:** dureza de la voz: `suave`, `media`, `fuerte` o `natural` (sin procesar).
- **musica:** `tension`, `calma` o `ninguna`.
- **movimiento:** `acercar`, `alejar`, `izquierda`, `derecha`, `subir` o `bajar`.
- **efecto:** `lluvia`, `humo`, `brasas`, `parpadeo`, `sirena`, `temblor`, `polvo`, `nieve` o `ninguno`.
- Las `*palabras entre asteriscos*` salen en amarillo en los subtítulos.
