import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import imageCompression from 'browser-image-compression'
import { 
  Send, Image as ImageIcon, Loader2, ArrowLeft, Video, 
  UserPlus, X 
} from 'lucide-react'

export default function ChatRoom() { 
  const { roomId } = useParams()
  const navigate = useNavigate()
  
  // Datos
  const [session, setSession] = useState(null)
  const [messages, setMessages] = useState([])
  const [roomDetails, setRoomDetails] = useState(null)
  
  // UX
  const [newMessage, setNewMessage] = useState('')
  const [uploading, setUploading] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState(new Set()) // Usamos Set para evitar duplicados
  const messagesEndRef = useRef(null)

  // Modales
  const [showAddModal, setShowAddModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if(session && roomId) setupRoom(session.user.id)
    })
  }, [roomId])

  // --- LÓGICA DE REALTIME Y PRESENCIA ---
  useEffect(() => {
    if (!session?.user?.id || !roomId) return;

    const channel = supabase.channel(`room:${roomId}`, {
        config: { presence: { key: session.user.id } } // La clave es el ID del usuario
    })

    // 1. ESCUCHAR MENSAJES (De otros)
    channel.on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` }, 
        (payload) => {
            // Solo procesamos el mensaje si NO lo tenemos ya en la lista
            setMessages(currentMessages => {
                const exists = currentMessages.find(m => m.id === payload.new.id)
                if (exists) return currentMessages // Ya lo tengo (probablemente lo envié yo)
                
                // Si es nuevo, lo fetcheamos para tener los datos del perfil
                fetchSingleMessage(payload.new.id)
                return currentMessages
            })
        }
    )

    // 2. ESCUCHAR PRESENCIA (Usuarios Online)
    channel.on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        // state es un objeto { 'user_id': [data], ... }
        setOnlineUsers(new Set(Object.keys(state)))
    })

    channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
            await channel.track({ online_at: new Date().toISOString() })
        }
    })

    return () => supabase.removeChannel(channel)
  }, [roomId, session])

  const setupRoom = async (myUserId) => {
      const { data: room } = await supabase.from('chat_rooms').select('*').eq('id', roomId).single()
      if (!room) return navigate('/chat')

      if (room.is_group) {
          setRoomDetails({ name: room.name, avatar: room.image_url, is_group: true })
      } else {
          const { data: participants } = await supabase
              .from('chat_participants')
              .select('profiles(full_name, avatar_url, id)')
              .eq('room_id', roomId)
          
          const otherUser = participants.find(p => p.profiles.id !== myUserId)?.profiles
          setRoomDetails({ name: otherUser?.full_name || 'Usuario', avatar: otherUser?.avatar_url, is_group: false })
      }
      fetchMessages()
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

  // --- ENVÍO DE MENSAJES (ARREGLADO) ---
  const handleSend = async (file = null, type = 'text') => {
    if (!newMessage.trim() && !file) return

    // 1. UI OPTIMISTA (Mostrar inmediatamente)
    const tempId = `temp-${Date.now()}`
    const tempMessage = {
        id: tempId,
        room_id: roomId,
        sender_id: session.user.id,
        content: newMessage,
        media_url: file ? URL.createObjectURL(file) : null,
        media_type: type,
        created_at: new Date().toISOString(),
        profiles: { 
            full_name: 'Yo', // No necesitamos buscar el nombre, soy yo
            avatar_url: null 
        },
        is_sending: true // Flag para el spinner
    }

    setMessages(prev => [...prev, tempMessage])
    setNewMessage('')
    scrollToBottom()
    setUploading(true)

    try {
        let mediaUrl = null
        if (file) {
            let fileToUpload = file
            if (type === 'image') {
                const options = { maxSizeMB: 0.8, maxWidthOrHeight: 1280, useWebWorker: true, fileType: 'image/webp' }
                fileToUpload = await imageCompression(file, options)
            }
            if (type === 'video' && file.size > 15 * 1024 * 1024) throw new Error("Video muy pesado (Max 15MB)")

            const ext = type === 'image' ? 'webp' : file.name.split('.').pop()
            const fileName = `${type}_${Date.now()}.${ext}`
            
            await supabase.storage.from('chat-media').upload(fileName, fileToUpload)
            const { data } = supabase.storage.from('chat-media').getPublicUrl(fileName)
            mediaUrl = data.publicUrl
        }

        // 2. INSERTAR Y RECIBIR DATOS REALES (select().single())
        const { data: sentData, error } = await supabase.from('messages').insert({
            room_id: roomId,
            sender_id: session.user.id,
            content: tempMessage.content,
            media_url: mediaUrl,
            media_type: type
        })
        .select('*, profiles(full_name, avatar_url)') // <-- AQUÍ ESTÁ LA MAGIA
        .single()

        if (error) throw error

        // 3. REEMPLAZAR MENSAJE TEMPORAL POR EL REAL (Quita el spinner)
        setMessages(prev => prev.map(msg => 
            msg.id === tempId ? sentData : msg
        ))

        // 4. ACTUALIZAR SALA (Último mensaje)
        await supabase.from('chat_rooms').update({
            last_message: type !== 'text' ? `📎 ${type}` : tempMessage.content,
            last_message_time: new Date()
        }).eq('id', roomId)

    } catch (error) {
        alert("Error al enviar: " + error.message)
        // Si falla, lo borramos de la vista
        setMessages(prev => prev.filter(m => m.id !== tempId))
    }
    setUploading(false)
  }

  const handleSearchUsers = async (term) => {
      setSearchTerm(term)
      if (term.length < 3) return setSearchResults([])
      const { data, error } = await supabase.rpc('search_users_not_in_room', { p_search_term: term, p_room_id: roomId })
      if (!error) setSearchResults(data)
  }

  const addMember = async (userId) => {
      try {
          await supabase.from('chat_participants').insert({ room_id: roomId, user_id: userId })
          alert("Miembro añadido")
          setShowAddModal(false)
          setSearchTerm('')
      } catch (e) { alert("Error al añadir") }
  }

  const handleFileSelect = (e, type) => {
    if (e.target.files && e.target.files[0]) handleSend(e.target.files[0], type)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] md:h-screen bg-slate-100 dark:bg-slate-950">
      
      {/* HEADER */}
      <div className="bg-white dark:bg-slate-900 p-3 shadow-sm flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 z-10">
        <button onClick={() => navigate('/chat')} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><ArrowLeft size={20} className="dark:text-white"/></button>
        
        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-slate-800 flex items-center justify-center text-indigo-600 font-bold overflow-hidden border border-slate-200 dark:border-slate-700">
             {roomDetails?.avatar ? <img src={roomDetails.avatar} className="w-full h-full object-cover"/> : (roomDetails?.name?.charAt(0) || '#')}
        </div>
        
        <div className="flex-1">
            <h2 className="font-bold text-slate-800 dark:text-white text-sm leading-tight line-clamp-1">{roomDetails?.name || 'Cargando...'}</h2>
            <p className="text-[10px] font-bold flex items-center gap-1 text-slate-500">
                <span className={`w-2 h-2 rounded-full ${onlineUsers.size > 1 ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`}></span>
                {onlineUsers.size > 0 ? (onlineUsers.size === 1 ? 'Solo tú' : `${onlineUsers.size} en línea`) : 'Desconectado'}
            </p>
        </div>
        {roomDetails?.is_group && (
            <button onClick={() => setShowAddModal(true)} className="p-2 bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-full hover:bg-indigo-50 transition"><UserPlus size={20}/></button>
        )}
      </div>

      {/* MENSAJES */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#e5ddd5] dark:bg-slate-950/50">
        {messages.map((msg, index) => {
            const isMe = msg.sender_id === session?.user?.id
            // Un mensaje es "optimista" si tiene el flag is_sending
            const isOptimistic = msg.is_sending 
            
            return (
                <div key={index} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                    <div className={`max-w-[80%] sm:max-w-[60%] rounded-2xl p-2.5 shadow-sm relative ${isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-none'} ${isOptimistic ? 'opacity-80' : 'opacity-100'}`}>
                        
                        {!isMe && roomDetails?.is_group && (
                            <p className="text-[10px] font-bold text-orange-500 mb-1">{msg.profiles?.full_name}</p>
                        )}

                        {msg.media_type === 'image' && (
                            <img src={msg.media_url} className="rounded-lg mb-1 max-h-60 w-full object-cover cursor-pointer" onClick={() => window.open(msg.media_url)}/>
                        )}
                        {msg.media_type === 'video' && (
                            <video src={msg.media_url} controls className="rounded-lg mb-1 max-h-60 w-full bg-black"/>
                        )}

                        {msg.content && <p className="text-sm whitespace-pre-wrap break-words leading-snug">{msg.content}</p>}
                        
                        <div className="flex justify-end items-center gap-1 mt-0.5">
                             <p className={`text-[9px] ${isMe ? 'text-indigo-200' : 'text-slate-400'}`}>
                                {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '...'}
                            </p>
                            {/* EL RELOJITO (Solo si es optimista) */}
                            {isOptimistic && <Loader2 size={10} className="animate-spin text-white/70"/>}
                        </div>
                    </div>
                </div>
            )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT BAR */}
      <div className="p-2 bg-white dark:bg-slate-900 flex items-end gap-2 border-t border-slate-200 dark:border-slate-800">
        <label className="p-3 text-slate-400 hover:text-indigo-500 cursor-pointer transition">
            <ImageIcon size={22}/>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelect(e, 'image')} disabled={uploading}/>
        </label>
        <label className="p-3 text-slate-400 hover:text-indigo-500 cursor-pointer transition">
            <Video size={22}/>
            <input type="file" accept="video/*" className="hidden" onChange={(e) => handleFileSelect(e, 'video')} disabled={uploading}/>
        </label>
        
        <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center px-4 py-2 my-1">
            <input 
                className="w-full bg-transparent outline-none text-sm dark:text-white max-h-24 resize-none"
                placeholder="Escribe un mensaje..."
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            />
        </div>
        <button 
            onClick={() => handleSend()}
            disabled={!newMessage.trim() && !uploading}
            className="p-3 mb-1 bg-indigo-600 text-white rounded-full shadow-md hover:scale-105 active:scale-95 transition disabled:opacity-50"
        >
            <Send size={20}/>
        </button>
      </div>

      {/* MODAL AÑADIR */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 relative">
                <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 text-slate-400"><X size={20}/></button>
                <h3 className="font-black text-lg mb-4 dark:text-white flex items-center gap-2"><UserPlus size={20} className="text-indigo-500"/> Añadir Miembro</h3>
                <input 
                    className="w-full p-3 bg-slate-100 dark:bg-slate-800 rounded-xl mb-4 outline-none font-bold dark:text-white"
                    placeholder="Buscar persona..."
                    value={searchTerm}
                    autoFocus
                    onChange={e => handleSearchUsers(e.target.value)}
                />
                <div className="max-h-60 overflow-y-auto space-y-2">
                    {searchResults.map(user => (
                        <div key={user.id} onClick={() => addMember(user.id)} className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition">
                            <img src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.full_name}&background=random`} className="w-10 h-10 rounded-full"/>
                            <div>
                                <p className="font-bold text-sm dark:text-white">{user.full_name}</p>
                                <p className="text-[10px] text-green-500 font-bold">Añadir al grupo</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}
    </div>
  )
}