// src/lib/notifications.js (Versión Web)
export const initNotifications = async () => {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    console.log(`💻 Permiso Web: ${permission}`);
  }
};

export const sendNotification = async (title, body) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body });
  }
};