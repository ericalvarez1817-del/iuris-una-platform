// public/sw.js

self.addEventListener('push', function(event) {
  // 1. Recibir los datos del Backend
  const data = event.data.json();
  console.log('Push recibido en el navegador:', data);

  const options = {
    body: data.body,
    icon: '/pwa-192x192.png', // Asegúrate de tener un icono aquí o borra esta línea
    badge: '/pwa-192x192.png',
    data: {
      url: data.url // La URL del chat
    }
  };

  // 2. Mostrar la Notificación Visual
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 3. Que pasa si le hacen clic
self.addEventListener('notificationclick', function(event) {
  event.notification.close(); // Cierra la notificación

  // Abre la ventana del chat
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Si ya hay una ventana abierta, enfócala
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus().then(() => client.navigate(event.notification.data.url)); 
      }
      // Si no, abre una nueva
      return clients.openWindow(event.notification.data.url);
    })
  );
});