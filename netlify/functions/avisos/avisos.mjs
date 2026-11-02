/* =========================================================================
   Función programada: cada 30 minutos revisa las noticias y, si hay algo
   GRAVE (ver criterio.mjs), envía un aviso a los móviles suscritos.
   Máximo 4 avisos al día y nunca dos veces el mismo. Las suscripciones que
   el navegador da por caducadas (404/410) se borran solas.
   Solo funciona en la web publicada (no en las previsualizaciones).
   ========================================================================= */
import { recopilar } from '../noticias/core.mjs';
import { avisosPendientes, cargaAviso, claveAviso } from './criterio.mjs';
import { almacen, clavesVapid, prepararEnvio } from '../../lib/almacen.mjs';

export const config = { schedule: '*/30 * * * *' };

export default async () => {
  const st = almacen();
  const ahora = new Date();
  const enviados = (await st.get('estado/enviados', { type: 'json' })) || {};
  for (const [k, f] of Object.entries(enviados)) if (ahora - new Date(f) > 3 * 24 * 3600e3) delete enviados[k];

  const { noticias } = await recopilar(fetch, ahora);
  const nuevos = avisosPendientes(noticias, enviados, ahora);
  if (!nuevos.length) { await st.setJSON('estado/enviados', enviados); return; }

  const webpush = prepararEnvio(await clavesVapid(st));
  const { blobs } = await st.list({ prefix: 'suscripciones/' });
  let ok = 0, borradas = 0;
  for (const n of nuevos) {
    const carga = JSON.stringify(cargaAviso(n));
    await Promise.all(blobs.map(async ({ key }) => {
      const s = await st.get(key, { type: 'json' });
      if (!s) return;
      try {
        await webpush.sendNotification(s, carga, { TTL: 6 * 3600, urgency: 'high' });
        ok++;
      } catch (e) {
        if (e?.statusCode === 404 || e?.statusCode === 410) { await st.delete(key); borradas++; }
      }
    }));
    enviados[claveAviso(n)] = ahora.toISOString();
  }
  await st.setJSON('estado/enviados', enviados);
  console.log(`avisos: ${nuevos.length} noticias, ${ok} envíos, ${borradas} suscripciones caducadas borradas`);
};
