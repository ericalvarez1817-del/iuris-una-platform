// supabase/functions/push-notification/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0"
// @ts-ignore: ignora error de importación si no tienes extensión Deno
import webpush from "https://esm.sh/web-push@3.5.0"

// Configuramos las llaves VAPID
const vapidEmail = 'mailto:iurisuna.help@gmail.com'
const privateKey = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
const publicKey = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''

// @ts-ignore: ignora error de tipo
webpush.setVapidDetails(vapidEmail, publicKey, privateKey)

serve(async (req: Request) => {
  // 1. Recibimos el "Webhook"
  const payload = await req.json()
  const record = payload.record
  
  if (!record || !record.room_id) {
    return new Response('No record found', { status: 200 })
  }

  // 2. Iniciamos Supabase Admin
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // 3. Obtenemos el nombre del que envió
  const { data: sender } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', record.sender_id)
    .single()

  const senderName = sender?.full_name || 'Alguien'

  // 4. Buscamos participantes
  const { data: participants } = await supabase
    .from('chat_participants')
    .select('user_id')
    .eq('room_id', record.room_id)
    .neq('user_id', record.sender_id)

  if (!participants || participants.length === 0) {
    return new Response('No participants', { status: 200 })
  }

  // @ts-ignore: ignora error de tipo map
  const userIds = participants.map((p: any) => p.user_id)

  // 5. Buscamos tokens
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('*')
    .in('user_id', userIds)

  if (!subscriptions || subscriptions.length === 0) {
    return new Response('No subscriptions found', { status: 200 })
  }

  // 6. Enviamos notificación
  const notificationPayload = JSON.stringify({
    title: `Mensaje de ${senderName}`,
    body: record.media_type !== 'text' ? `📎 Envió un ${record.media_type}` : record.content,
    url: `/chat/${record.room_id}`
  })

  // @ts-ignore: ignora error de tipo
  const promises = subscriptions.map((sub: any) => {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth
      }
    }
    
    // @ts-ignore: ignora error de webpush
    return webpush.sendNotification(pushSubscription, notificationPayload)
      .catch((err: any) => {
        if (err.statusCode === 404 || err.statusCode === 410) {
          console.log('Suscripción muerta, borrando...', sub.id)
          return supabase.from('push_subscriptions').delete().eq('id', sub.id)
        }
        console.error('Error enviando push:', err)
      })
  })

  await Promise.all(promises)

  return new Response(`Enviado a ${subscriptions.length} dispositivos`, { status: 200 })
})