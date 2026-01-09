// supabase/functions/push-notification/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0"
import webpush from "npm:web-push@3.6.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log("🔥 ROBOT V7 (REPORTER CHECK) INICIADO")

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ============================================================
    // 🛡️ 1. SEGURIDAD (EL PORTERO)
    // ============================================================
    const secretHeader = req.headers.get('x-webhook-secret')
    // @ts-ignore
    const correctSecret = Deno.env.get('WEBHOOK_SECRET')

    // Nota: Si no has configurado WEBHOOK_SECRET en Supabase, esto fallará.
    if (!correctSecret || secretHeader !== correctSecret) {
      console.warn("⛔ ALERTA: Intento de acceso sin contraseña correcta.")
      // return new Response("Unauthorized", { status: 401, headers: corsHeaders })
      // Comentado temporalmente para facilitar pruebas si falta la variable, 
      // pero DEBERÍAS descomentarlo en producción.
    }

    // ============================================================
    // 📦 2. PREPARAR DATOS
    // ============================================================
    const payload = await req.json()
    const { table, record } = payload 

    if (!record) {
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
        throw new Error("Faltan las variables de entorno VAPID_PRIVATE_KEY o VAPID_PUBLIC_KEY")
    }

    webpush.setVapidDetails('mailto:iurisuna.help@gmail.com', vapidPub, vapidPriv)


    // ============================================================
    // 📰 3. LÓGICA DE NOTICIAS (TABLA 'news')
    // ============================================================
    if (table === 'news') {
      
      // 🛑 FILTRO DE REPORTERO (CAMBIADO A is_reporter) 🛑
      // @ts-ignore
      const { data: author } = await supabase
        .from('profiles')
        .select('is_reporter') // <--- BUSCAMOS ESTA COLUMNA ESPECÍFICA
        .eq('id', record.author_id)
        .single()

      // Si el autor no existe O is_reporter es falso, CANCELAMOS.
      if (!author || !author.is_reporter) {
        console.log(`🔕 ALERTA CANCELADA: El usuario ${record.author_id} no es reportero.`)
        return new Response("Skipped: Not a reporter", { headers: corsHeaders })
      }

      console.log(`📢 NOTICIA OFICIAL DE REPORTERO: ${record.title}`)

      // A. Obtener TODOS los dispositivos
      // @ts-ignore
      const { data: subs } = await supabase.from('push_subscriptions').select('*')

      if (!subs || subs.length === 0) return new Response("No subs", { headers: corsHeaders })

      // B. Preparar Payload "PRIORITARIO"
      const newsPayload = JSON.stringify({
        title: `🚨 ${record.title}`, 
        body: record.content.substring(0, 100) + '...',
        url: '/news',
        icon: '/pwa-192x192.png',
        image: record.image_url || null, 
        tag: 'news-alert',
        priority: 'high'
      })

      console.log(`🚀 Enviando noticia a ${subs.length} personas...`)

      const promises = subs.map((sub: any) => 
        webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth }
        }, newsPayload)
        .catch((e: any) => {
          if (e.statusCode === 410 || e.statusCode === 404) {
             supabase.from('push_subscriptions').delete().eq('id', sub.id).then()
          }
        })
      )
      
      await Promise.all(promises)
      return new Response("News Sent", { headers: corsHeaders })
    }


    // ============================================================
    // 💬 4. LÓGICA DE CHAT (TABLA 'messages')
    // ============================================================
    if (table === 'messages' || record.room_id) {
      
      // A. Datos del Remitente
      // @ts-ignore
      const { data: sender } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', record.sender_id)
        .single()

      const senderName = sender?.full_name || 'Nuevo Mensaje'
      const senderIcon = sender?.avatar_url || '/pwa-192x192.png'

      // B. Buscar Participantes
      // @ts-ignore
      const { data: participants } = await supabase
        .from('chat_participants')
        .select('user_id')
        .eq('room_id', record.room_id)
        .neq('user_id', record.sender_id)

      if (!participants?.length) return new Response("Alone", { headers: corsHeaders })
      // @ts-ignore
      const userIds = participants.map(p => p.user_id)

      // C. Buscar Tokens
      // @ts-ignore
      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('*')
        .in('user_id', userIds)

      if (!subs?.length) return new Response("No subs", { headers: corsHeaders })

      // D. Enviar Notificación de Chat
      const chatPayload = JSON.stringify({
        title: senderName,
        body: record.content || '📷 Archivo adjunto',
        url: `/chat/${record.room_id}`,
        icon: senderIcon,
        badge: '/pwa-192x192.png',
        tag: `chat-${record.room_id}`
      })

      console.log(`🚀 Chat de ${senderName} enviado a ${subs.length} dispositivos`)

      const promises = subs.map((sub: any) => {
        return webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth }
        }, chatPayload)
        .catch((err: any) => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            supabase.from('push_subscriptions').delete().eq('id', sub.id).then()
          }
        })
      })

      await Promise.all(promises)
      return new Response("Chat Sent", { headers: corsHeaders })
    }

    return new Response("Ignored table", { headers: corsHeaders })

  } catch (error: any) {
    console.error("💀 ERROR FATAL:", error.message)
    return new Response(JSON.stringify({ error: error.message }), { 
      headers: corsHeaders, 
      status: 500 
    })
  }
})