// public/sw.js

self.addEventListener('push', function(event) {
  // 1. Recibimos los datos del servidor
  const data = event.data ? event.data.json() : {};
  
  const title = data.title || 'Nueva Notificación IURIS';
  const options = {
    body: data.body || 'Tienes un nuevo mensaje.',
    icon: '/logo.png', // Asegúrate de tener un logo.png en public, si no, quita esta línea
    badge: '/logo.png',
    data: {
      url: data.url || '/chat' // A donde ir si hacen clic
    }
  };

  // 2. Mostramos la notificación en el celular/PC
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  // 3. Si hacen clic, abrimos la app
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      // Si la app ya está abierta, la enfocamos
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // Si no, abrimos una ventana nueva
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});