// Service Worker para Push Notifications
// Este archivo maneja las notificaciones cuando la web está cerrada o en segundo plano.

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// TU CONFIGURACIÓN REAL DE FIREBASE (La misma que en notifications.js)
const firebaseConfig = {
  apiKey: "AIzaSyDL94jEUVgsq62MxhHBUlnv-AZaJLG1EJI",
  authDomain: "iuris-una-d033e.firebaseapp.com",
  projectId: "iuris-una-d033e",
  storageBucket: "iuris-una-d033e.firebasestorage.app",
  messagingSenderId: "145842843234",
  appId: "1:145842843234:web:50877ca13a547811352b3b",
  measurementId: "G-XCLQ4Y1X5R"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Manejador de mensajes en segundo plano (Cuando la app está cerrada)
messaging.onBackgroundMessage((payload) => {
  console.log('[Service Worker] Notificación recibida en background:', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icons/icon-192x192.png', // Asegúrate de que este icono exista en public/icons
    badge: '/icons/icon-192x192.png', // Icono para la barra de estado (Android)
    data: payload.data, // Datos extra (url, chat_id, etc)
    vibrate: [200, 100, 200],
    actions: [
      {
        action: 'open',
        title: 'Ver ahora'
      }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Manejo del clic en la notificación
self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notificación clickeada');
  event.notification.close();

  // Intenta abrir la URL que viene en los datos o va al inicio
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Si ya hay una pestaña abierta con esa URL, enfocarla
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      // Si no, abrir una nueva
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});