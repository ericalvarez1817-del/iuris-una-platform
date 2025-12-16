// supabase/functions/push-notification/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0"
// CAMBIO IMPORTANTE: Usamos 'npm:' para máxima compatibilidad
import webpush from "npm:web-push@3.6.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Manejo de CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    const record = payload.record

    if (!record || !record.room_id) {
      return new Response(JSON.stringify({ message: 'No record' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Inicializar Supabase
    // @ts-ignore
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Configurar WebPush con las claves secretas
    // @ts-ignore
    const vapidPriv = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
    // @ts-ignore
    const vapidPub = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''

    // Validación básica de claves para evitar crashes silenciosos
    if (!vapidPriv || !vapidPub) {
      throw new Error("Faltan las claves VAPID en los Secretos de Supabase")
    }

    webpush.setVapidDetails(
      'mailto:iurisuna.help@gmail.com',
      vapidPub,
      vapidPriv
    )

    // 1. Obtener nombre del remitente
    const { data: sender } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', record.sender_id)
      .single()

    const senderName = sender?.full_name || 'Alguien'

    // 2. Buscar participantes (excluyendo al remitente)
    const { data: participants } = await supabase
      .from('chat_participants')
      .select('user_id')
      .eq('room_id', record.room_id)
      .neq('user_id', record.sender_id)

    if (!participants || participants.length === 0) {
      console.log("No hay participantes a quien notificar")
      return new Response(JSON.stringify({ message: 'No participants' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const userIds = participants.map((p: any) => p.user_id)

    // 3. Buscar tokens de esos usuarios
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', userIds)

    if (!subscriptions || subscriptions.length === 0) {
      console.log("Los participantes no tienen notificaciones activas")
      return new Response(JSON.stringify({ message: 'No subscriptions' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    console.log(`Enviando notificación a ${subscriptions.length} dispositivos...`)

    // 4. Enviar
    const notificationPayload = JSON.stringify({
      title: `Mensaje de ${senderName}`,
      body: record.media_type !== 'text' ? `📎 Envió un archivo` : record.content,
      url: `/chat/${record.room_id}`
    })

    const promises = subscriptions.map((sub: any) => {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth }
      }
      return webpush.sendNotification(pushConfig, notificationPayload)
        .catch((err: any) => {
          // Si el error es 404/410, el token ya no sirve (usuario borró caché)
          if (err.statusCode === 404 || err.statusCode === 410) {
            console.log(`Token muerto ${sub.id}, eliminando...`)
            supabase.from('push_subscriptions').delete().eq('id', sub.id).then()
          } else {
            console.error('Error enviando push individual:', err)
          }
        })
    })

    await Promise.all(promises)

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error("CRITICAL ERROR:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})