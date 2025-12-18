// supabase/functions/push-notification/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0"

// --- MANTENEMOS LA VERSIÓN SÓLIDA DE NPM (NO TOCAR) ---
import webpush from "npm:web-push@3.6.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // LOG DE VIDA
  console.log("🔥 ROBOT V5 (SECURE MODE) INICIADO")

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ============================================================
    // 🛡️ NUEVA CAPA DE SEGURIDAD (EL PORTERO)
    // ============================================================
    const secretHeader = req.headers.get('x-webhook-secret')
    // @ts-ignore
    const correctSecret = Deno.env.get('WEBHOOK_SECRET')

    // Si no hay secreto configurado o no coincide, RECHAZAR.
    if (!correctSecret || secretHeader !== correctSecret) {
      console.warn("⛔ ALERTA: Intento de acceso sin contraseña correcta.")
      return new Response("Unauthorized: Missing or wrong secret", { 
        status: 401, 
        headers: corsHeaders 
      })
    }
    // ============================================================

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

    // 1. OBTENER DATOS DEL REMITENTE (Tu lógica V4 intacta)
    // @ts-ignore
    const { data: sender } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', record.sender_id)
      .single()

    const senderName = sender?.full_name || 'Nuevo Mensaje'
    const senderIcon = sender?.avatar_url || '/pwa-192x192.png'

    // 2. BUSCAR DESTINATARIOS
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

    console.log(`🚀 Enviando mensaje de: ${senderName} a ${subs.length} dispositivos (AUTH OK)`)

    // 4. ENVIAR NOTIFICACIÓN (Tu lógica V4 intacta)
    const notificationPayload = JSON.stringify({
      title: senderName,
      body: record.content || '📷 Archivo adjunto',
      url: `/chat/${record.room_id}`,
      icon: senderIcon,
      badge: '/pwa-192x192.png'
    })

    const promises = subs.map((sub: any) => {
      return webpush.sendNotification({
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth }
      }, notificationPayload)
      .then(() => console.log(`✅ Enviado a ID: ${sub.id}`))
      .catch((err: any) => {
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.log(`🗑️ Borrando token muerto: ${sub.id}`)
          supabase.from('push_subscriptions').delete().eq('id', sub.id).then()
        } else {
          console.error(`⚠️ Falló envío a ID: ${sub.id}`, err.statusCode)
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