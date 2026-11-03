/* GET /api/radios — emisoras en directo con su emisión de menos datos.
   Se guarda 24 h en la CDN: el directorio se consulta pocas veces al día. */
import { recopilar } from './core.mjs';

export default async () => {
  const datos = await recopilar();
  return new Response(JSON.stringify(datos), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'Netlify-CDN-Cache-Control': 'public, durable, max-age=86400, stale-while-revalidate=43200',
    },
  });
};
