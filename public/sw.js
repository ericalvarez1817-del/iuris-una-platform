// public/sw.js

self.addEventListener('push', function(event) {
  console.log('¡Push recibido!'); // Esto saldrá en la consola

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
    icon: '/pwa-192x192.png', // Si no tienes este icono, no saldrá imagen, pero sonará
    vibrate: [200, 100, 200], // Vibración: bzz-pausa-bzz
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'IURIS UNA', options)
  );
});

// Cuando le haces clic a la notificación
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});