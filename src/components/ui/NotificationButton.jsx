import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Bell, BellRing, Loader2, RefreshCw } from 'lucide-react'

// TU CLAVE PÚBLICA
const PUBLIC_VAPID_KEY = "BKWrd9a6QCkWByoTyh-yG3_8-UgG5q1Ojp3mZDRAyqUFqkD0PL9fJJKBItCOqGiQ_JNRgP3J_tSQDDV3naXw9gY"

export default function NotificationButton() {
  const [loading, setLoading] = useState(false)
  // Iniciamos asumiendo lo que diga el navegador, pero permitiremos re-clickear
  const [permissionState, setPermissionState] = useState(Notification.permission)

  const subscribeUser = async () => {
    setLoading(true)
    try {
      // 1. Verificar SW
      const registration = await navigator.serviceWorker.ready

      // 2. Suscribirse (Si ya existe, el navegador devuelve la existente, no pide permiso de nuevo)
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
      })

      // 3. Guardar en Supabase (ESTA ES LA PARTE IMPORTANTE QUE FALLÓ ANTES)
      const subscriptionJson = subscription.toJSON()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) throw new Error("Debes iniciar sesión")

      console.log("Enviando a Supabase:", subscriptionJson) // LOG PARA DEPURAR

      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint: subscriptionJson.endpoint,
        p256dh: subscriptionJson.keys.p256dh,
        auth: subscriptionJson.keys.auth
      }, { onConflict: 'user_id, endpoint' })

      if (error) throw error

      alert("¡Sincronización Exitosa! Ahora sí estás en la base de datos.")
      setPermissionState('granted')

    } catch (error) {
      console.error(error)
      alert("Error: " + error.message)
    }
    setLoading(false)
  }

  return (
    <button 
      onClick={subscribeUser}
      disabled={loading} // YA NO BLOQUEAMOS SI ESTÁ 'GRANTED'
      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition shadow-sm ${
        permissionState === 'granted' 
          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200' 
          : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'
      }`}
    >
      {loading ? <Loader2 size={16} className="animate-spin"/> : (
        permissionState === 'granted' ? <BellRing size={16}/> : <Bell size={16}/>
      )}
      {permissionState === 'granted' ? 'Notificaciones (Toca para Sync)' : 'Activar Alertas'}
    </button>
  )
}

// --- FUNCIÓN UTILITARIA ---
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}