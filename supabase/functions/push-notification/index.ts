// supabase/functions/push-notification/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0"

// --- CAMBIO CLAVE: Usamos esm.sh que es 100% compatible con Supabase ---
import webpush from "https://esm.sh/web-push@3.6.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // LOG DE VIDA
  console.log("🔥 EL ROBOT HA DESPERTADO (Versión ESM)")

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    // console.log("📦 Payload recibido:", JSON.stringify(payload)) 

    const record = payload.record
    
    if (!record) {
      console.log("❌ No record found in payload")
      return new Response("No record", { headers: corsHeaders })
    }

    // Inicializar Supabase
    // @ts-ignore
    const supabase = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // @ts-ignore
    const vapidPriv = Deno.env.get('VAPID_PRIVATE_KEY')
    // @ts-ignore
    const vapidPub = Deno.env.get('VAPID_PUBLIC_KEY')

    if (!vapidPriv || !vapidPub) {
      console.error("❌ Faltan las claves VAPID")
      return new Response("Keys missing", { headers: corsHeaders })
    }

    // @ts-ignore
    webpush.setVapidDetails('mailto:test@test.com', vapidPub, vapidPriv)

    // 2. BUSCAR AL USUARIO DESTINO
    // @ts-ignore
    const { data: participants } = await supabase
      .from('chat_participants')
      .select('user_id')
      .eq('room_id', record.room_id)
      .neq('user_id', record.sender_id)

    if (!participants || participants.length === 0) {
      console.log("⚠️ Nadie a quien notificar.")
      return new Response("Alone", { headers: corsHeaders })
    }

    // @ts-ignore
    const userIds = participants.map(p => p.user_id)

    // 3. BUSCAR SI TIENEN NOTIFICACIONES ACTIVAS
    // @ts-ignore
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', userIds)

    if (!subs || subs.length === 0) {
      console.log("🔕 Sin notificaciones activas.")
      return new Response("No subs", { headers: corsHeaders })
    }

    console.log(`🔔 Enviando a ${subs.length} dispositivos...`)

    // 4. ENVIAR
    const notificationPayload = JSON.stringify({
      title: 'Nuevo Mensaje',
      body: record.content || 'Archivo adjunto',
      url: `/chat/${record.room_id}`
    })

    for (const sub of subs) {
      try {
        // @ts-ignore
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth }
        }, notificationPayload)
      } catch (err) {
        console.error(`❌ Error push:`, err)
        // @ts-ignore
        if (err.statusCode === 410 || err.statusCode === 404) {
           await supabase.from('push_subscriptions').delete().eq('id', sub.id)
        }
      }
    }

    return new Response("Done", { headers: corsHeaders })

  } catch (error: any) {
    console.error("💀 ERROR FATAL:", error.message)
    return new Response(JSON.stringify({ error: error.message }), { 
      headers: corsHeaders, 
      status: 500 
    })
  }
})