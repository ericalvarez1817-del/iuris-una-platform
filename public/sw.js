// public/sw.js
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

// -------------------------------------------------------------------------
// ESTAS 2 LÍNEAS SON SAGRADAS (NO BORRAR)
// -------------------------------------------------------------------------
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// -------------------------------------------------------------------------
// LÓGICA DE NOTIFICACIONES "HÍBRIDA" (Chat + Noticias)
// -------------------------------------------------------------------------
self.addEventListener('push', function(event) {
  console.log('¡Push recibido!');

  // Valores por defecto
  let data = { title: 'IURIS UNA', body: 'Nueva notificación', url: '/', icon: '/pwa-192x192.png' };
  
  try {
    if (event.data) {
      const json = event.data.json();
      data = { ...data, ...json };
    }
  } catch (e) { console.log('Error parseando JSON'); }

  // Detectamos si es PRIORITARIA (Noticia)
  const isPriority = data.priority === 'high';

  const options = {
    body: data.body,
    icon: data.icon,         
    badge: '/pwa-192x192.png',

    // --- 🖼️ VISUAL (Solo Noticias) ---
    // Si viene una imagen (data.image), se muestra GIGANTE (Big Picture Style) en Android
    image: data.image || null, 

    // --- 📳 COMPORTAMIENTO ---
    // Si es Prioridad: Vibrate como loco (500ms). Si es Chat: Cortito (200ms).
    vibrate: isPriority ? [500, 200, 500, 200, 500] : [200, 100, 200],
    
    // Si es Prioridad: NO DESAPARECE SOLA. El usuario debe descartarla.
    requireInteraction: isPriority, 
    
    tag: data.tag || 'general', // 'news-alert' o 'chat-123'
    renotify: true,

    // --- 🔘 BOTONES DE ACCIÓN (Solo Noticias) ---
    actions: isPriority ? [
      { action: 'open', title: '👀 Leer ahora' },
      { action: 'close', title: '❌ Cerrar' }
    ] : [],

    data: {
      url: data.url
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// -------------------------------------------------------------------------
// CLIC EN NOTIFICACIÓN
// -------------------------------------------------------------------------
self.addEventListener('notificationclick', function(event) {
  event.notification.close(); // Siempre cerrar primero la alerta visual

  // Si el usuario le dio al botón de "Cerrar" (X), no abrimos nada.
  if (event.action === 'close') return;

  // Si le dio al cuerpo o a "Leer ahora", abrimos la App
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // 1. Si la app ya está abierta, la enfocamos y navegamos
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if ('focus' in client) {
          // Si ya está abierta, enfocamos y redirigimos a la URL correcta (ej: /news)
          return client.focus().then(c => c.navigate(event.notification.data.url)); 
        }
      }
      // 2. Si no, abrimos ventana nueva
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});