import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

// --- 1. INICIALIZAR Y PEDIR PERMISOS (HÍBRIDO) ---
export const initNotifications = async () => {
  // A. Si es Celular (Android/iOS)
  if (Capacitor.isNativePlatform()) {
    try {
      const permission = await LocalNotifications.requestPermissions();
      if (permission.display === 'granted') {
        console.log("📱 Android: Permiso concedido");
        // Crear canal de alta prioridad para que suene fuerte
        await LocalNotifications.createChannel({
            id: 'iuris_channel',
            name: 'Alertas Iuris',
            importance: 5,
            visibility: 1,
            vibration: true,
            sound: 'beep.wav' 
        });
      }
    } catch (e) {
      console.error("Error en permisos móvil:", e);
    }
  } 
  // B. Si es Web (Chrome/PC)
  else if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    console.log(`💻 Web: Permiso ${permission}`);
  }
};

// --- 2. ENVIAR NOTIFICACIÓN (EL CÓDIGO INTELIGENTE) ---
// Úsa esta función en tu Agenda, Chat o Tracker. Ella sabrá qué hacer.
export const sendNotification = async (title, body, scheduleTime = null) => {
  const id = Math.floor(Math.random() * 100000); // ID único

  // --- MODO CELULAR ---
  if (Capacitor.isNativePlatform()) {
    try {
      await LocalNotifications.schedule({
        notifications: [{
          title: title,
          body: body,
          id: id,
          schedule: scheduleTime ? { at: scheduleTime } : undefined,
          channelId: 'iuris_channel',
          smallIcon: 'ic_stat_icon_config_sample', // Icono por defecto
          actionTypeId: '',
          extra: null
        }]
      });
      console.log("📲 Notificación enviada al sistema Android");
    } catch (e) {
      console.error("Error enviando notificación nativa:", e);
    }
  } 
  // --- MODO WEB ---
  else if ('Notification' in window && Notification.permission === 'granted') {
    // Si hay tiempo programado, usamos setTimeout para simular la espera en web
    if (scheduleTime) {
      const now = new Date().getTime();
      const delay = scheduleTime.getTime() - now;
      if (delay > 0) {
        setTimeout(() => new Notification(title, { body }), delay);
        return;
      }
    }
    // Si es inmediata
    new Notification(title, { body });
  } else {
    console.log("⚠️ No hay permisos o soporte para notificaciones.");
  }
};