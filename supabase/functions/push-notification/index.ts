// supabase/functions/push-notification/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0"

// --- SOLUCIÓN FINAL: Usamos 'npm:' para evitar el error de Object prototype ---
import webpush from "npm:web-push@3.6.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // LOG DE VIDA
  console.log("🔥 ROBOT V3 (NPM MODE) INICIADO")

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    const record = payload.record

    if (!record) {
      console.log("❌ Payload vacío o sin record")
      return new Response("No record", { headers: corsHeaders })
    }

    // Inicializar Supabase
    // @ts-ignore
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // @ts-ignore
    const vapidPriv = Deno.env.get('VAPID_PRIVATE_KEY')
    // @ts-ignore
    const vapidPub = Deno.env.get('VAPID_PUBLIC_KEY')

    if (!vapidPriv || !vapidPub) {
      console.error("❌ ERROR CRÍTICO: Faltan claves VAPID en Secrets")
      throw new Error("Missing VAPID Keys")
    }

    // Configurar WebPush
    try {
      webpush.setVapidDetails(
        'mailto:iurisuna.help@gmail.com',
        vapidPub,
        vapidPriv
      )
    } catch (err) {
      console.error("❌ Error configurando VAPID:", err)
      throw err
    }

    // 2. BUSCAR AL USUARIO DESTINO (Excluyendo al remitente)
    // @ts-ignore
    const { data: participants } = await supabase
      .from('chat_participants')
      .select('user_id')
      .eq('room_id', record.room_id)
      .neq('user_id', record.sender_id)

    if (!participants || participants.length === 0) {
      console.log("⚠️ Nadie más en la sala.")
      return new Response("Alone", { headers: corsHeaders })
    }

    // @ts-ignore
    const userIds = participants.map(p => p.user_id)

    // 3. BUSCAR TOKENS
    // @ts-ignore
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', userIds)

    if (!subs || subs.length === 0) {
      console.log("🔕 Los participantes no tienen alertas activas.")
      return new Response("No subs", { headers: corsHeaders })
    }

    console.log(`🚀 Enviando a ${subs.length} dispositivos...`)

    // 4. ENVIAR NOTIFICACIÓN
    const notificationPayload = JSON.stringify({
      title: 'Nuevo Mensaje',
      body: record.content || 'Archivo adjunto',
      url: `/chat/${record.room_id}`,
      icon: '/pwa-192x192.png'
    })

    const promises = subs.map((sub: any) => {
      return webpush.sendNotification({
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth }
      }, notificationPayload)
      .then(() => console.log(`✅ Enviado a ID: ${sub.id}`))
      .catch((err: any) => {
        console.error(`⚠️ Falló envío a ID: ${sub.id}`, err.statusCode)
        // Si el error es 410 (Gone) o 404, el token ya no sirve
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.log(`🗑️ Borrando token muerto: ${sub.id}`)
          supabase.from('push_subscriptions').delete().eq('id', sub.id).then()
        }
      })
    })

    await Promise.all(promises)

    return new Response("Done", { headers: corsHeaders })

  } catch (error: any) {
    console.error("💀 ERROR FATAL:", error.message)
    return new Response(JSON.stringify({ error: error.message }), { 
      headers: corsHeaders, 
      status: 500 
    })
  }
})