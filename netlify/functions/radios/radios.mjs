/* GET /api/radios — emisoras en directo con su emisión de menos datos.
   Se guarda 24 h en la CDN: el directorio se consulta pocas veces al día.
   Si falta alguna emisora, solo 15 minutos, para volver a intentarlo pronto. */
import { recopilar, incompleta } from './core.mjs';

export default async () => {
  const datos = await recopilar();
  const corta = incompleta(datos);
  return new Response(JSON.stringify(datos), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': corta ? 'public, max-age=300' : 'public, max-age=3600',
      'Netlify-CDN-Cache-Control': corta ? 'public, durable, max-age=900' : 'public, durable, max-age=86400, stale-while-revalidate=43200',
    },
  });
};
