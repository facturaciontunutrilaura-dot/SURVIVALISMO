/* =========================================================================
   Función de Netlify: GET /api/noticias
   Devuelve las noticias de última hora relevantes para la app.

   Cada 30 minutos como mucho se vuelven a leer las fuentes: la respuesta
   queda en la caché de la red de Netlify (CDN) 30 minutos y, mientras se
   renueva, se sirve la anterior. Así se consulta a los medios unas pocas
   veces por hora, sea cual sea el número de usuarios.
   ========================================================================= */
import { recopilar } from './core.mjs';

export default async () => {
  const datos = await recopilar();
  return new Response(JSON.stringify(datos), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      'Netlify-CDN-Cache-Control': 'public, durable, max-age=1800, stale-while-revalidate=900',
    },
  });
};
