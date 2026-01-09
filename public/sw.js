import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

// -------------------------------------------------------------------------
// MANTENIMIENTO DEL SERVICE WORKER
// -------------------------------------------------------------------------
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// -------------------------------------------------------------------------
// LÓGICA ROBOT V7 (NATIVA)
// -------------------------------------------------------------------------
self.addEventListener('push', function(event) {
  console.log('¡Push Nativo Recibido!');

  // Valores por defecto para evitar errores si el payload viene raro
  let data = { 
    title: 'IURIS UNA', 
    body: 'Nueva notificación', 
    url: '/', 
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png'
  };
  
  try {
    if (event.data) {
      // El backend envía JSON, lo parseamos
      const json = event.data.json();
      data = { ...data, ...json };
    }
  } catch (e) { console.log('Error parseando data push', e); }

  // Detectar si es prioritario (Noticia vs Chat)
  const isPriority = data.priority === 'high';

  const options = {
    body: data.body,
    icon: data.icon,        
    badge: data.badge, // Icono monocromático para Android
    image: data.image || null, // Imagen grande (Big Picture)
    
    // Vibración "Brutal" (Larga) vs "Sutil" (Corta)
    vibrate: isPriority ? [500, 200, 500, 200, 500] : [200, 100, 200],
    
    // Si es noticia importante, se queda pegada en pantalla
    requireInteraction: isPriority, 
    
    tag: data.tag || 'general', 
    renotify: true,
    
    actions: isPriority ? [
      { action: 'open', title: '👀 Leer ahora' },
      { action: 'close', title: '❌ Cerrar' }
    ] : [],
    
    data: {
      url: data.url
    }
  };

  // 1. Avisar a React (si la pestaña está abierta) usando BroadcastChannel
  const channel = new BroadcastChannel('push-messages');
  channel.postMessage({ title: data.title, ...options });

  // 2. Mostrar la Notificación del Sistema Operativo
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// -------------------------------------------------------------------------
// CLIC EN NOTIFICACIÓN
// -------------------------------------------------------------------------
self.addEventListener('notificationclick', function(event) {
  event.notification.close(); // Cerrar la alerta visual

  // Si el usuario dio click en "Cerrar", no hacemos nada más
  if (event.action === 'close') return;

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // A. Si ya está abierta, enfocar la pestaña existente
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if ('focus' in client) {
          return client.focus().then(c => c.navigate(urlToOpen));
        }
      }
      // B. Si no está abierta, abrir una nueva ventana
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});