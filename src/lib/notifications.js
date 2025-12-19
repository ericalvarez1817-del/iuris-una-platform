import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

// 1. Inicializar y pedir permisos
export const initNotifications = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      // Pedimos permiso al usuario
      const permission = await LocalNotifications.requestPermissions();
      
      if (permission.display === 'granted') {
        console.log("🔔 Permiso de notificaciones CONCEDIDO");
        
        // Creamos un canal (Obligatorio en Android)
        await LocalNotifications.createChannel({
            id: 'iuris_channel',
            name: 'Notificaciones General',
            description: 'Avisos de la App Iuris',
            importance: 5, // Máxima importancia (suena y vibra)
            visibility: 1,
            vibration: true,
        });
      } else {
        console.log("🔕 Permiso de notificaciones DENEGADO");
      }
    } catch (e) {
      console.error("Error iniciando notificaciones:", e);
    }
  }
};

// 2. Función para programar una notificación
export const scheduleNotification = async (title, body, id = null, scheduleTime = null) => {
    if (!Capacitor.isNativePlatform()) return;

    // Si no pasamos ID, generamos uno aleatorio
    const notifId = id || Math.floor(Math.random() * 100000);

    await LocalNotifications.schedule({
        notifications: [
            {
                title: title,
                body: body,
                id: notifId,
                schedule: scheduleTime ? { at: scheduleTime } : undefined, // Si es null, sale al instante
                sound: 'beep.wav',
                channelId: 'iuris_channel', // Importante: debe coincidir con el creado arriba
                smallIcon: 'ic_stat_icon_config_sample', // Icono por defecto de Android
                actionTypeId: '',
                extra: null
            }
        ]
    });
};