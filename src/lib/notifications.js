import { supabase } from './supabase';

// TU CLAVE PÚBLICA VAPID (Debe coincidir con la del backend Robot V7)
const VAPID_PUBLIC_KEY = "BP03duRRVc6IwZwHMr5UrmKq3a9uw74lzBHBIbNPicQcyWVKpqpLLaAPSuPMZTi05F8zlSbxgAt2nRk_BlVcTps";

// Utilidad para convertir la clave VAPID de string a ArrayBuffer (Requisito del navegador)
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// --------------------------------------------------------------------
// 1. SOLICITAR PERMISO Y SUSCRIBIRSE (NATIVO / ROBOT V7)
// --------------------------------------------------------------------
export const requestNotificationPermission = async (userId) => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('⚠️ Push API no soportada en este navegador.');
    return;
  }

  try {
    console.log('🔔 Solicitando permiso nativo...');
    
    // Paso A: Permiso del navegador
    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
      console.log('✅ Permiso concedido.');

      // Paso B: Registrar el Service Worker Nativo ('sw.js')
      // IMPORTANTE: Asegúrate de que el archivo public/sw.js existe
      const registration = await navigator.serviceWorker.register('/sw.js');
      
      // Paso C: Crear la suscripción con las llaves de seguridad
      // Esto genera el "endpoint", "p256dh" y "auth" que necesita el Backend
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      console.log('🎟️ Suscripción Nativa Generada');

      // Paso D: Guardar en Supabase para el Robot V7
      await saveSubscriptionToDatabase(subscription, userId);

    } else {
      console.log('🚫 Permiso denegado.');
    }
  } catch (error) {
    console.error('❌ Error suscripción:', error);
  }
};

// --------------------------------------------------------------------
// 2. GUARDAR EN SUPABASE (Tabla push_subscriptions)
// --------------------------------------------------------------------
const saveSubscriptionToDatabase = async (subscription, userId) => {
  if (!userId) return;

  // Extraemos las llaves de encriptación del objeto nativo
  const subData = subscription.toJSON();

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ 
      user_id: userId,
      endpoint: subData.endpoint,
      p256dh: subData.keys.p256dh,
      auth: subData.keys.auth
    }, { onConflict: 'endpoint' });

  if (error) {
    console.error('❌ Error guardando suscripción en DB:', error);
  } else {
    console.log('💾 Suscripción guardada para Robot V7.');
  }
};

// --------------------------------------------------------------------
// 3. ESCUCHAR MENSAJES EN VIVO (BroadcastChannel)
// --------------------------------------------------------------------
export const onMessageListener = () => {
    return new Promise((resolve) => {
        const channel = new BroadcastChannel('push-messages');
        channel.addEventListener('message', (event) => {
            console.log('📩 Mensaje en vivo:', event.data);
            resolve({ notification: event.data });
        });
    });
};

// --------------------------------------------------------------------
// 4. NOTIFICACIÓN LOCAL (Para compatibilidad con NewsFeed/Vercel)
// --------------------------------------------------------------------
export const sendNotification = (title, body) => {
  if (Notification.permission === 'granted') {
    try {
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(title, {
          body: body,
          icon: '/icons/icon-192x192.png',
          vibrate: [200]
        });
      });
    } catch (e) {
      // Fallback básico si falla el SW
      new Notification(title, { body, icon: '/icons/icon-192x192.png' });
    }
  }
};