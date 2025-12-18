// public/sw.js
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

// -------------------------------------------------------------------------
// ESTAS 2 LÍNEAS SON SAGRADAS (NO BORRAR)
// -------------------------------------------------------------------------
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// -------------------------------------------------------------------------
// LÓGICA DE NOTIFICACIONES "SEXY"
// -------------------------------------------------------------------------
self.addEventListener('push', function(event) {
  console.log('¡Push recibido!');

  // Valores por defecto
  let data = { title: 'IURIS UNA', body: 'Nuevo mensaje', url: '/', icon: '/pwa-192x192.png' };
  
  // Intentamos leer los datos enriquecidos del Backend (Robot V4)
  try {
    if (event.data) {
      const json = event.data.json();
      // Si el backend mandó datos, los usamos
      data = { ...data, ...json };
    }
  } catch (e) {
    console.log('Error leyendo JSON, usando defecto');
  }

  const options = {
    body: data.body,
    
    // --- ESTÉTICA ---
    icon: data.icon,         // AQUI VA LA FOTO DE PERFIL (Si el backend la mandó)
    badge: '/pwa-192x192.png', // Icono pequeño en la barra (Android)
    
    // --- COMPORTAMIENTO "HEADS UP" (Para que salga en pantalla) ---
    vibrate: [200, 100, 200, 100, 200], // Patrón de vibración largo y molesto
    tag: 'chat-message',     // Agrupa los mensajes
    renotify: true,          // ¡CLAVE! Hace que suene/vibre de nuevo aunque ya tengas una notificación pendiente
    
    // --- DATOS EXTRA ---
    data: {
      url: data.url
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Cuando le hacen clic a la notificación
self.addEventListener('notificationclick', function(event) {
  event.notification.close(); // Cierra la notificación

  // Lógica inteligente: Si ya tienes la pestaña abierta, la enfoca. Si no, abre una nueva.
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // 1. Buscar si ya está abierta
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(event.notification.data.url) && 'focus' in client) {
          return client.focus();
        }
      }
      // 2. Si no, abrir nueva
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});