/* =========================================================================
   avisos.js — AVISOS GRAVES EN EL MÓVIL (notificaciones push)
   Alta/baja en /api/push. Solo se avisa de lo muy grave (lo decide el
   servidor: netlify/functions/avisos/criterio.mjs), como mucho 4 al día.
   No se envía ningún dato personal: solo la dirección técnica del navegador.
   ========================================================================= */
import * as store from './store.js';

export const esIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const instalada = () => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
export const compatible = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

/** Clave VAPID en base64url → bytes, como pide pushManager.subscribe. */
export function claveABytes(b64) {
  const s = (b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

async function registro() {
  const r = await navigator.serviceWorker.getRegistration();
  if (!r) throw new Error('La app aún se está instalando. Prueba de nuevo en unos segundos.');
  return r;
}

/** 'sin-soporte' | 'instalar' | 'bloqueado' | 'activo' | 'inactivo' */
export async function estado() {
  if (!compatible()) return esIOS() && !instalada() ? 'instalar' : 'sin-soporte';
  if (Notification.permission === 'denied') return 'bloqueado';
  const r = await navigator.serviceWorker.getRegistration().catch(() => null);
  const s = await r?.pushManager.getSubscription().catch(() => null);
  return s && Notification.permission === 'granted' ? 'activo' : 'inactivo';
}

export async function activar() {
  const permiso = await Notification.requestPermission();
  if (permiso !== 'granted') throw new Error('Sin permiso no se pueden mostrar avisos. Puedes darlo en los ajustes del navegador.');
  const r = await registro();
  const res = await fetch('./api/push', { cache: 'no-store' });
  if (res.status === 404) throw new Error('Los avisos aún no están disponibles en esta instalación.');
  if (!res.ok) throw new Error(`El servidor de avisos no responde (${res.status}).`);
  const { clave } = await res.json();
  let s = await r.pushManager.getSubscription();
  if (!s) {
    try { s = await r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: claveABytes(clave) }); } catch {
      throw new Error('El navegador no ha permitido los avisos. Ocurre en modo incógnito, sin conexión o con el ahorro de datos activado. Prueba desde la app instalada.');
    }
  }
  const alta = await fetch('./api/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(s) });
  if (!alta.ok) { await s.unsubscribe().catch(() => {}); throw new Error('No se ha podido dar de alta el aviso. Prueba más tarde.'); }
  await store.put('kv', { id: 'avisos.activos', v: true }).catch(() => {});
}

export async function desactivar() {
  const r = await navigator.serviceWorker.getRegistration();
  const s = await r?.pushManager.getSubscription();
  if (s) {
    await fetch('./api/push', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: s.endpoint }) }).catch(() => {});
    await s.unsubscribe().catch(() => {});
  }
  await store.put('kv', { id: 'avisos.activos', v: false }).catch(() => {});
}

/** Aviso de prueba local (no pasa por el servidor). */
export async function probar() {
  const r = await registro();
  await r.showNotification('🔔 Aviso de prueba', {
    body: 'Así te llegará un aviso grave. Tócalo para abrir las noticias.',
    icon: './icons/icon-192.png', badge: './icons/icon-192.png', tag: 'prueba', data: { url: './#/sec/noticias' },
  });
}
