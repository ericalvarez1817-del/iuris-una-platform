import { supabase } from './supabase';

// TU CLAVE PÚBLICA VAPID (La misma que tienes en el backend)
const VAPID_PUBLIC_KEY = "BP03duRRVc6IwZwHMr5UrmKq3a9uw74lzBHBIbNPicQcyWVKpqpLLaAPSuPMZTi05F8zlSbxgAt2nRk_BlVcTps";

// Utilidad para convertir la clave VAPID de string a ArrayBuffer
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// --------------------------------------------------------------------
// FUNCIÓN PRINCIPAL: Pide permiso y suscribe al usuario
// --------------------------------------------------------------------
export const requestNotificationPermission = async (userId) => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('⚠️ Las notificaciones Push no son soportadas en este navegador.');
    return;
  }

  try {
    console.log('🔔 Solicitando permiso de notificaciones (Web Push)...');
    
    // Paso A: Pedir permiso
    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
      console.log('✅ Permiso concedido.');
      
      // Paso B: Registrar el Service Worker Estándar
      const registration = await navigator.serviceWorker.register('/sw.js');
      
      // Paso C: Crear la suscripción
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      console.log('🎟️ Suscripción generada:', subscription);

      // Paso D: Guardar en la tabla push_subscriptions
      await saveSubscriptionToDatabase(subscription, userId);

    } else {
      console.log('🚫 Permiso denegado.');
    }
  } catch (error) {
    console.error('❌ Error al suscribirse:', error);
  }
};

// --------------------------------------------------------------------
// AUXILIAR: Guardar en Supabase (Tabla push_subscriptions)
// --------------------------------------------------------------------
const saveSubscriptionToDatabase = async (subscription, userId) => {
  if (!userId) return;

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
    console.error('❌ Error guardando suscripción en Supabase:', error);
  } else {
    console.log('💾 Suscripción guardada en Supabase correctamente.');
  }
};

// --------------------------------------------------------------------
// LISTENER: Para recibir mensajes cuando la app está abierta
// --------------------------------------------------------------------
export const onMessageListener = () => {
    return new Promise((resolve) => {
        const channel = new BroadcastChannel('push-messages');
        channel.addEventListener('message', (event) => {
            console.log('📩 Mensaje recibido en primer plano:', event.data);
            resolve({ notification: event.data });
        });
    });
};

// --------------------------------------------------------------------
// [FIX] LOCAL NOTIFICATION: Función recuperada para compatibilidad
// --------------------------------------------------------------------
export const sendNotification = (title, body) => {
  // Esta función crea una notificación LOCAL inmediata (sin ir al servidor)
  // Útil para feedback instantáneo o pruebas en NewsFeed.jsx
  if (Notification.permission === 'granted') {
    try {
      // Intentamos usar el Service Worker para mostrarla (es más estable en móviles)
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(title, {
          body: body,
          icon: '/icons/icon-192x192.png',
          vibrate: [200]
        });
      });
    } catch (e) {
      // Fallback clásico
      new Notification(title, { 
        body, 
        icon: '/icons/icon-192x192.png' 
      });
    }
  } else {
    console.log('⚠️ No hay permiso para enviar notificación local.');
  }
};