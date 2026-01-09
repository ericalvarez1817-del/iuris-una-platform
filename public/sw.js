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
  console.log('¡Push recibido en SW!');

  // 1. Parsear datos (con valores por defecto seguros)
  let data = { 
    title: 'IURIS UNA', 
    body: 'Nueva notificación', 
    url: '/', 
    icon: '/icons/icon-192x192.png', // Ajustado a la ruta estándar de Vite PWA
    badge: '/icons/icon-192x192.png'
  };
  
  try {
    if (event.data) {
      const json = event.data.json();
      data = { ...data, ...json };
    }
  } catch (e) { console.log('Error parseando JSON del Push', e); }

  // 2. Detectar Prioridad
  const isPriority = data.priority === 'high';

  const options = {
    body: data.body,
    icon: data.icon,        
    badge: data.badge, // Icono monocromático para Android

    // --- 🖼️ VISUAL (Solo Noticias) ---
    image: data.image || null, 

    // --- 📳 COMPORTAMIENTO ---
    // High: Vibra fuerte. Chat: Vibra corto.
    vibrate: isPriority ? [500, 200, 500, 200, 500] : [200, 100, 200],
    
    // High: Persistente hasta que el usuario interactúe.
    requireInteraction: isPriority, 
    
    // Agrupación (para no llenar la barra de notificaciones)
    tag: data.tag || 'general', 
    renotify: true,

    // --- 🔘 BOTONES DE ACCIÓN (Solo Noticias Prioritarias) ---
    actions: isPriority ? [
      { action: 'open', title: '👀 Leer ahora' },
      { action: 'close', title: '❌ Cerrar' }
    ] : [],

    // Datos que viajan al hacer clic
    data: {
      url: data.url
    }
  };

  // 3. 🔥 COMUNICACIÓN CON LA APP (NUEVO)
  // Esto avisa a la pestaña abierta (si existe) para mostrar Toasts o actualizar UI en tiempo real
  const channel = new BroadcastChannel('push-messages');
  channel.postMessage({ title: data.title, ...options });

  // 4. Mostrar la notificación nativa
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// -------------------------------------------------------------------------
// CLIC EN NOTIFICACIÓN
// -------------------------------------------------------------------------
self.addEventListener('notificationclick', function(event) {
  event.notification.close(); // Cerrar la alerta visual inmediatamente

  // Acción específica de cerrar
  if (event.action === 'close') return;

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // 1. Buscar si la app ya está abierta
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if ('focus' in client) {
          // Enfocamos la pestaña y navegamos a la URL interna
          return client.focus().then(c => c.navigate(urlToOpen)); 
        }
      }
      // 2. Si no hay pestañas, abrir una nueva
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});