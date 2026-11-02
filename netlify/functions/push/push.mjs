/* =========================================================================
   /api/push — alta y baja de los avisos en el móvil.
   GET    → { clave } (clave pública VAPID para suscribirse)
   POST   → { endpoint, keys } guarda la suscripción
   DELETE → { endpoint } la borra
   ========================================================================= */
import { almacen, clavesVapid, idSuscripcion } from '../../lib/almacen.mjs';
import { suscripcionValida } from '../avisos/criterio.mjs';

const json = (d, status = 200) => new Response(JSON.stringify(d), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});

export default async (req) => {
  const st = almacen();
  if (req.method === 'GET') return json({ clave: (await clavesVapid(st)).publicKey });
  if (req.method !== 'POST' && req.method !== 'DELETE') return json({ error: 'Método no permitido' }, 405);
  const texto = await req.text();
  if (texto.length > 2000) return json({ error: 'Demasiado grande' }, 413);
  let s;
  try { s = JSON.parse(texto); } catch { return json({ error: 'JSON no válido' }, 400); }
  if (req.method === 'DELETE') {
    if (typeof s?.endpoint === 'string') await st.delete(`suscripciones/${idSuscripcion(s.endpoint)}`);
    return json({ ok: true });
  }
  if (!suscripcionValida(s)) return json({ error: 'Suscripción no válida' }, 400);
  await st.setJSON(`suscripciones/${idSuscripcion(s.endpoint)}`, {
    endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth }, alta: new Date().toISOString(),
  });
  return json({ ok: true });
};
