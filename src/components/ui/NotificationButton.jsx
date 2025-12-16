import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Bell, BellRing, Loader2 } from 'lucide-react'
import { urlBase64ToUint8Array } from 'url-base64-to-uint8array'

// TU CLAVE PÚBLICA (Esta sí es segura ponerla aquí)
const PUBLIC_VAPID_KEY = "BKWrd9a6QCkWByoTyh-yG3_8-UgG5q1Ojp3mZDRAyqUFqkD0PL9fJJKBItCOqGiQ_JNRgP3J_tSQDDV3naXw9gY"

export default function NotificationButton() {
  const [loading, setLoading] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(Notification.permission === 'granted')

  const subscribeUser = async () => {
    setLoading(true)
    try {
      // 1. Obtener registro del Service Worker
      const registration = await navigator.serviceWorker.ready

      // 2. Pedir suscripción al navegador (Google/Apple)
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
      })

      // 3. Preparar datos para Supabase
      // La suscripción es un objeto complejo, lo desglosamos
      const subscriptionJson = subscription.toJSON()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) throw new Error("Debes iniciar sesión")

      // 4. Guardar en Base de Datos
      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint: subscriptionJson.endpoint,
        p256dh: subscriptionJson.keys.p256dh,
        auth: subscriptionJson.keys.auth
      }, { onConflict: 'user_id, endpoint' }) // Evita duplicados si es el mismo dispositivo

      if (error) throw error

      alert("¡Notificaciones Activadas! Recibirás avisos de nuevos mensajes.")
      setIsSubscribed(true)

    } catch (error) {
      console.error(error)
      alert("Error al activar notificaciones: " + error.message)
    }
    setLoading(false)
  }

  return (
    <button 
      onClick={subscribeUser}
      disabled={loading || isSubscribed}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition shadow-sm ${
        isSubscribed 
          ? 'bg-green-100 text-green-700 cursor-default border border-green-200' 
          : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'
      }`}
    >
      {loading ? <Loader2 size={16} className="animate-spin"/> : (isSubscribed ? <BellRing size={16}/> : <Bell size={16}/>)}
      {isSubscribed ? 'Notificaciones Activas' : 'Activar Alertas'}
    </button>
  )
}