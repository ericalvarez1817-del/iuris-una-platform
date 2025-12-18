// public/sw.js
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

// -------------------------------------------------------------------------
// ESTAS 2 LÍNEAS SON LAS QUE ARREGLAN EL ERROR DE "UNABLE TO INJECT MANIFEST"
// -------------------------------------------------------------------------
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// -------------------------------------------------------------------------
// LÓGICA DE PUSH NOTIFICATIONS (TU CÓDIGO ANTERIOR)
// -------------------------------------------------------------------------
self.addEventListener('push', function(event) {
  console.log('¡Push recibido!');

  let data = { title: 'Nuevo Mensaje', body: 'Revisa el chat' };
  
  // Intentamos leer los datos que manda Supabase
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    console.log('Error leyendo JSON, usando texto por defecto');
  }

  const options = {
    body: data.body || 'Tienes una novedad',
    icon: '/pwa-192x192.png', 
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'IURIS UNA', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});