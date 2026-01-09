import { supabase } from './supabase';

// TU CLAVE PÚBLICA VAPID (La misma que tienes en el backend)
const VAPID_PUBLIC_KEY = "BP03duRRVc6IwZwHMr5UrmKq3a9uw74lzBHBIbNPicQcyWVKpqpLLaAPSuPMZTi05F8zlSbxgAt2nRk_BlVcTps";

// Utilidad para convertir la clave VAPID de string a ArrayBuffer (Requerido por el navegador)
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
      
      // Paso B: Registrar el Service Worker Estándar (sw.js)
      // Nota: Usamos '/sw.js', asegúrate de tener ese archivo en 'public'
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

  // Convertimos el objeto de suscripción a JSON para extraer endpoint y keys
  const subData = subscription.toJSON();

  // Insertamos en la tabla específica para web-push
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ 
      user_id: userId,
      endpoint: subData.endpoint,
      p256dh: subData.keys.p256dh,
      auth: subData.keys.auth
    }, { onConflict: 'endpoint' }); // Evitar duplicados

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
        // Usamos BroadcastChannel para escuchar lo que envía el sw.js
        const channel = new BroadcastChannel('push-messages');
        channel.addEventListener('message', (event) => {
            console.log('📩 Mensaje recibido en primer plano:', event.data);
            resolve({ notification: event.data });
        });
    });
};