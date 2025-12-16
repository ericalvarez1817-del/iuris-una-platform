import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import imageCompression from 'browser-image-compression'
import { 
  Send, Image as ImageIcon, Loader2, ArrowLeft, Video, Paperclip
} from 'lucide-react'

export default function ChatRoom() { 
  const { roomId } = useParams()
  const navigate = useNavigate()
  
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [uploading, setUploading] = useState(false)
  const [session, setSession] = useState(null)
  const [roomInfo, setRoomInfo] = useState(null)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if(session && roomId) {
          fetchRoomInfo()
          fetchMessages()
      }
    })

    // REALTIME: Escuchar nuevos mensajes
    const channel = supabase
      .channel(`room:${roomId}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` }, 
        (payload) => fetchSingleMessage(payload.new.id)
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [roomId])

  const fetchRoomInfo = async () => {
      const { data } = await supabase.from('chat_rooms').select('*').eq('id', roomId).single()
      setRoomInfo(data)
  }

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*, profiles(full_name, avatar_url)')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
    setMessages(data || [])
    scrollToBottom()
  }

  const fetchSingleMessage = async (msgId) => {
    const { data } = await supabase
      .from('messages')
      .select('*, profiles(full_name, avatar_url)')
      .eq('id', msgId)
      .single()
    if(data) {
        setMessages(prev => [...prev, data])
        scrollToBottom()
    }
  }

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100)
  }

  // --- LÓGICA DE ENVÍO Y COMPRESIÓN ---
  const handleSend = async (file = null, type = 'text') => {
    if (!newMessage.trim() && !file) return

    setUploading(true)
    try {
        let mediaUrl = null
        let mediaType = type

        if (file) {
            let fileToUpload = file

            // 1. COMPRESIÓN DE IMAGEN
            if (type === 'image') {
                const options = { maxSizeMB: 0.8, maxWidthOrHeight: 1280, useWebWorker: true, fileType: 'image/webp' }
                fileToUpload = await imageCompression(file, options)
            }
            
            // 2. VIDEO (Validación de tamaño, compresión frontend es muy pesada)
            if (type === 'video') {
                if (file.size > 15 * 1024 * 1024) { // 15MB Límite
                    alert("El video es muy pesado (Max 15MB). Intenta enviarlo más corto.")
                    setUploading(false)
                    return
                }
            }

            const ext = type === 'image' ? 'webp' : file.name.split('.').pop()
            const fileName = `${type}_${Date.now()}.${ext}`
            
            await supabase.storage.from('chat-media').upload(fileName, fileToUpload)
            const { data } = supabase.storage.from('chat-media').getPublicUrl(fileName)
            mediaUrl = data.publicUrl
        }

        // INSERTAR MENSAJE
        await supabase.from('messages').insert({
            room_id: roomId,
            sender_id: session.user.id,
            content: newMessage,
            media_url: mediaUrl,
            media_type: mediaType
        })

        // ACTUALIZAR "ÚLTIMO MENSAJE" EN LA SALA
        await supabase.from('chat_rooms').update({
            last_message: mediaType !== 'text' ? `📎 ${mediaType}` : newMessage,
            last_message_time: new Date()
        }).eq('id', roomId)

        setNewMessage('')
    } catch (error) {
        console.error(error)
        alert("Error: " + error.message)
    }
    setUploading(false)
  }

  const handleFileSelect = (e, type) => {
    if (e.target.files && e.target.files[0]) {
        handleSend(e.target.files[0], type)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-slate-100 dark:bg-slate-950">
      
      {/* HEADER */}
      <div className="bg-white dark:bg-slate-900 p-3 shadow-sm flex items-center gap-3 border-b border-slate-200 dark:border-slate-800">
        <button onClick={() => navigate('/chat')} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><ArrowLeft size={20} className="dark:text-white"/></button>
        <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-sm">
             {roomInfo?.name?.charAt(0) || '#'}
        </div>
        <div className="flex-1">
            <h2 className="font-bold text-slate-800 dark:text-white text-sm leading-tight">{roomInfo?.name || 'Cargando...'}</h2>
            <p className="text-[10px] text-green-500 font-bold">En línea</p>
        </div>
      </div>

      {/* MENSAJES */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#e5ddd5] dark:bg-slate-950/50">
        {messages.map((msg, index) => {
            const isMe = msg.sender_id === session?.user?.id
            return (
                <div key={index} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl p-3 shadow-sm relative ${isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-none'}`}>
                        
                        {!isMe && <p className="text-[10px] font-bold text-indigo-500 mb-1">{msg.profiles?.full_name}</p>}

                        {/* RENDERIZADO DE MEDIA */}
                        {msg.media_type === 'image' && (
                            <img src={msg.media_url} className="rounded-lg mb-2 max-h-60 object-cover w-full cursor-pointer" onClick={() => window.open(msg.media_url)}/>
                        )}
                        {msg.media_type === 'video' && (
                            <video src={msg.media_url} controls className="rounded-lg mb-2 max-h-60 w-full bg-black"/>
                        )}

                        {msg.content && <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>}
                        
                        <p className={`text-[9px] text-right mt-1 ${isMe ? 'text-indigo-200' : 'text-slate-400'}`}>
                            {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                    </div>
                </div>
            )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT */}
      <div className="p-3 bg-white dark:bg-slate-900 flex items-end gap-2 border-t border-slate-200 dark:border-slate-800">
        {/* Subir Imagen */}
        <label className="p-3 text-slate-400 hover:text-indigo-500 cursor-pointer transition">
            <ImageIcon size={24}/>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelect(e, 'image')} disabled={uploading}/>
        </label>
        
        {/* Subir Video */}
        <label className="p-3 text-slate-400 hover:text-indigo-500 cursor-pointer transition">
            <Video size={24}/>
            <input type="file" accept="video/*" className="hidden" onChange={(e) => handleFileSelect(e, 'video')} disabled={uploading}/>
        </label>
        
        <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center px-4 py-2">
            <input 
                className="w-full bg-transparent outline-none text-sm dark:text-white max-h-24 resize-none"
                placeholder="Mensaje..."
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend(null, 'text')}
            />
        </div>

        <button 
            onClick={() => handleSend(null, 'text')}
            disabled={!newMessage.trim() && !uploading}
            className="p-3 bg-indigo-600 text-white rounded-full shadow-lg hover:scale-105 active:scale-95 transition disabled:opacity-50 disabled:scale-100"
        >
            {uploading ? <Loader2 className="animate-spin" size={20}/> : <Send size={20}/>}
        </button>
      </div>
    </div>
  )
}