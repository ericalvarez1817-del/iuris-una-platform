import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

// ID del canal (Constante para no equivocarnos)
const CHANNEL_ID = 'iuris_channel_v1';

// --- 1. INICIALIZAR Y PEDIR PERMISOS ---
export const initNotifications = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      console.log("📱 Iniciando sistema de notificaciones nativas...");
      
      // 1. Pedir permiso
      const permission = await LocalNotifications.requestPermissions();
      
      if (permission.display === 'granted') {
        console.log("✅ Permiso CONCEDIDO");
        // 2. Crear canal (Vital para Android)
        await createChannel();
      } else {
        console.warn("🚫 Permiso DENEGADO");
      }
    } catch (e) {
      console.error("❌ Error en initNotifications:", e);
    }
  } else if ('Notification' in window) {
    // Web
    Notification.requestPermission();
  }
};

// Función auxiliar para crear el canal
const createChannel = async () => {
    try {
        await LocalNotifications.createChannel({
            id: CHANNEL_ID,
            name: 'Notificaciones IURIS',
            description: 'Alertas de noticias y chats',
            importance: 5, // 5 = Suena y vibra fuerte
            visibility: 1,
            vibration: true,
            sound: 'beep.wav' 
        });
        console.log("📡 Canal de notificaciones creado/verificado");
    } catch (e) {
        console.error("Error creando canal:", e);
    }
}

// --- 2. ENVIAR NOTIFICACIÓN ---
export const sendNotification = async (title, body, scheduleTime = null) => {
  const id = Math.floor(Math.random() * 100000);

  // --- MODO CELULAR (ANDROID) ---
  if (Capacitor.isNativePlatform()) {
    try {
      // TRUCO DE SEGURIDAD: Intentamos crear el canal de nuevo por si acaso no existía
      await createChannel();

      await LocalNotifications.schedule({
        notifications: [{
          title: title,
          body: body,
          id: id,
          schedule: scheduleTime ? { at: scheduleTime } : undefined,
          channelId: CHANNEL_ID, // Tiene que coincidir con el creado arriba
          smallIcon: 'ic_stat_icon_config_sample',
          actionTypeId: '',
          extra: null
        }]
      });
      console.log("📲 Notificación enviada a Android con éxito");
    } catch (e) {
      console.error("❌ Error enviando notificación nativa:", e);
    }
  } 
  // --- MODO WEB (PC) ---
  else if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body });
  } 
  else {
    console.log("⚠️ No se pudo enviar notificación (Falta permiso o soporte)");
  }
};