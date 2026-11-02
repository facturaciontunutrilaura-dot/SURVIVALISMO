/* =========================================================================
   Almacén de los avisos push (Netlify Blobs) y claves VAPID.
   · suscripciones/<id> → { endpoint, keys, alta }  (sin nombres ni datos personales)
   · estado/enviados    → { claveNoticia: fechaISO } de los últimos 3 días
   · estado/vapid       → claves VAPID. Se generan solas la primera vez, así
     no hay que configurar nada en Netlify. Si existen las variables de
     entorno VAPID_PUBLIC y VAPID_PRIVATE, mandan ellas.
   ========================================================================= */
import { getStore } from '@netlify/blobs';
import webpush from 'web-push';
import { createHash } from 'node:crypto';

export const almacen = () => getStore({ name: 'avisos', consistency: 'strong' });
export const idSuscripcion = (endpoint) => createHash('sha256').update(endpoint).digest('hex').slice(0, 40);

export async function clavesVapid(st = almacen()) {
  if (process.env.VAPID_PUBLIC && process.env.VAPID_PRIVATE) {
    return { publicKey: process.env.VAPID_PUBLIC, privateKey: process.env.VAPID_PRIVATE };
  }
  const hay = await st.get('estado/vapid', { type: 'json' });
  if (hay?.publicKey) return hay;
  const nuevas = webpush.generateVAPIDKeys();
  // Si dos peticiones llegan a la vez, gana la primera y todas usan esa.
  await st.setJSON('estado/vapid', nuevas, { onlyIfNew: true });
  return st.get('estado/vapid', { type: 'json' });
}

export function prepararEnvio(claves) {
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:avisos@survivalismo.app', claves.publicKey, claves.privateKey);
  return webpush;
}
