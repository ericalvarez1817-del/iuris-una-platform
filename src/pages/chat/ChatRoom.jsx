import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import imageCompression from 'browser-image-compression'
import { 
  Send, Image as ImageIcon, Loader2, ArrowLeft, Video, 
  UserPlus, X, Paperclip, Trash2 
} from 'lucide-react'

// --- HELPER PARA FECHAS (UI MEJORADA) ---
const getMessageDateLabel = (dateString) => {
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return 'Hoy'
  if (date.toDateString() === yesterday.toDateString()) return 'Ayer'
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })
}

// --- HELPER PARA COLOR DE NOMBRE EN GRUPOS ---
function stringToColor(string) {
    let hash = 0;
    for (let i = 0; i < string.length; i++) {
        hash = string.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + "00000".substring(0, 6 - c.length) + c;
}

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
  const [onlineUsers, setOnlineUsers] = useState(new Set()) 
  const messagesEndRef = useRef(null)

  // PREVIEW DE ARCHIVO (NUEVO ✨)
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [fileType, setFileType] = useState('text') // 'text', 'image', 'video'

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

  // --- LÓGICA DE REALTIME Y PRESENCIA (INTACTA) ---
  useEffect(() => {
    if (!session?.user?.id || !roomId) return;

    const channel = supabase.channel(`room:${roomId}`, {
        config: { presence: { key: session.user.id } } 
    })

    // 1. ESCUCHAR MENSAJES (De otros)
    channel.on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` }, 
        (payload) => {
            setMessages(currentMessages => {
                const exists = currentMessages.find(m => m.id === payload.new.id)
                if (exists) return currentMessages 
                fetchSingleMessage(payload.new.id)
                return currentMessages
            })
        }
    )

    // 2. ESCUCHAR PRESENCIA (Usuarios Online)
    channel.on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
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

  // --- MANEJO DE ARCHIVOS (MEJORADO ✨) ---
  const handleFileSelect = (e, type) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0]
        setSelectedFile(file)
        setFileType(type)
        setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const clearFile = () => {
      setSelectedFile(null)
      setPreviewUrl(null)
      setFileType('text')
  }

  // --- ENVÍO DE MENSAJES (ACTUALIZADO) ---
  const handleSend = async () => {
    if (!newMessage.trim() && !selectedFile) return

    // Guardamos referencias locales antes de limpiar estado
    const contentToSend = newMessage
    const fileToSend = selectedFile
    const typeToSend = fileToSend ? fileType : 'text'

    // Limpiamos UI inmediatamente
    setNewMessage('')
    clearFile() 
    setUploading(true)

    // 1. UI OPTIMISTA
    const tempId = `temp-${Date.now()}`
    const tempMessage = {
        id: tempId,
        room_id: roomId,
        sender_id: session.user.id,
        content: contentToSend,
        media_url: fileToSend ? URL.createObjectURL(fileToSend) : null,
        media_type: typeToSend,
        created_at: new Date().toISOString(),
        profiles: { 
            full_name: 'Yo', 
            avatar_url: null 
        },
        is_sending: true 
    }

    setMessages(prev => [...prev, tempMessage])
    scrollToBottom()

    try {
        let mediaUrl = null
        if (fileToSend) {
            let fileToUpload = fileToSend
            if (typeToSend === 'image') {
                const options = { maxSizeMB: 0.8, maxWidthOrHeight: 1280, useWebWorker: true, fileType: 'image/webp' }
                fileToUpload = await imageCompression(fileToSend, options)
            }
            if (typeToSend === 'video' && fileToSend.size > 15 * 1024 * 1024) throw new Error("Video muy pesado (Max 15MB)")

            const ext = typeToSend === 'image' ? 'webp' : fileToSend.name.split('.').pop()
            const fileName = `${typeToSend}_${Date.now()}.${ext}`
            
            await supabase.storage.from('chat-media').upload(fileName, fileToUpload)
            const { data } = supabase.storage.from('chat-media').getPublicUrl(fileName)
            mediaUrl = data.publicUrl
        }

        const { data: sentData, error } = await supabase.from('messages').insert({
            room_id: roomId,
            sender_id: session.user.id,
            content: contentToSend,
            media_url: mediaUrl,
            media_type: typeToSend
        })
        .select('*, profiles(full_name, avatar_url)') 
        .single()

        if (error) throw error

        setMessages(prev => prev.map(msg => 
            msg.id === tempId ? sentData : msg
        ))

        await supabase.from('chat_rooms').update({
            last_message: typeToSend !== 'text' ? `📎 ${typeToSend === 'image' ? 'Foto' : 'Video'}` : contentToSend,
            last_message_time: new Date()
        }).eq('id', roomId)

    } catch (error) {
        alert("Error al enviar: " + error.message)
        setMessages(prev => prev.filter(m => m.id !== tempId))
    }
    setUploading(false)
  }

  // --- BÚSQUEDA Y MIEMBROS (INTACTO) ---
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

  return (
    // FIX MÓVIL: h-[100dvh] asegura que ocupe el alto real en móviles
    <div className="flex flex-col h-screen md:h-[100dvh] bg-slate-100 dark:bg-slate-950">
      
      {/* HEADER */}
      <div className="bg-white dark:bg-slate-900 px-4 py-3 shadow-sm flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 z-10">
        <button onClick={() => navigate('/chat')} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"><ArrowLeft size={20} className="dark:text-white"/></button>
        
        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-slate-800 flex items-center justify-center text-indigo-600 font-bold overflow-hidden border border-slate-200 dark:border-slate-700 relative">
             {roomDetails?.avatar ? <img src={roomDetails.avatar} className="w-full h-full object-cover"/> : (roomDetails?.name?.charAt(0) || '#')}
             {/* Indicador Online en el Avatar */}
             {onlineUsers.size > 1 && (
                 <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
             )}
        </div>
        
        <div className="flex-1 cursor-default">
            <h2 className="font-bold text-slate-800 dark:text-white text-base leading-tight line-clamp-1">{roomDetails?.name || 'Cargando...'}</h2>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {onlineUsers.size > 0 ? (onlineUsers.size === 1 ? 'Visto hoy' : `${onlineUsers.size} en línea`) : 'Desconectado'}
            </p>
        </div>
        
        {roomDetails?.is_group && (
            <button onClick={() => setShowAddModal(true)} className="p-2.5 bg-slate-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-full hover:bg-indigo-50 dark:hover:bg-slate-700 transition"><UserPlus size={20}/></button>
        )}
      </div>

      {/* MENSAJES (ÁREA PRINCIPAL) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-[#e5ddd5] dark:bg-slate-950/50">
        {messages.map((msg, index) => {
            const isMe = msg.sender_id === session?.user?.id
            const isOptimistic = msg.is_sending 
            
            // Lógica de Agrupación Visual
            const prevMsg = messages[index - 1]
            const nextMsg = messages[index + 1]
            
            // 1. Mostrar Fecha si cambia de día
            const showDate = !prevMsg || new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString()
            
            // 2. Agrupar mensajes del mismo usuario (burbujas pegadas)
            const isFirstInSequence = !prevMsg || prevMsg.sender_id !== msg.sender_id || showDate
            const isLastInSequence = !nextMsg || nextMsg.sender_id !== msg.sender_id
            
            // Estilos de bordes condicionales
            const roundedTop = isFirstInSequence ? 'rounded-2xl' : isMe ? 'rounded-tr-md rounded-tl-2xl' : 'rounded-tl-md rounded-tr-2xl'
            const roundedBottom = isLastInSequence ? 'rounded-2xl' : isMe ? 'rounded-br-md rounded-bl-2xl' : 'rounded-bl-md rounded-br-2xl'
            const tailStyle = isLastInSequence ? (isMe ? 'rounded-br-none' : 'rounded-bl-none') : ''

            return (
                <div key={index}>
                    {/* SEPARADOR DE FECHA */}
                    {showDate && (
                        <div className="flex justify-center my-4 sticky top-0 z-0">
                            <span className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold px-3 py-1 rounded-full shadow-sm opacity-90 backdrop-blur-sm">
                                {getMessageDateLabel(msg.created_at)}
                            </span>
                        </div>
                    )}

                    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} group ${isFirstInSequence ? 'mt-2' : 'mt-0.5'}`}>
                        <div className={`
                            max-w-[85%] sm:max-w-[65%] px-3 py-2 shadow-sm relative text-sm
                            ${isMe ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100'} 
                            ${roundedTop} ${roundedBottom} ${tailStyle}
                            ${isOptimistic ? 'opacity-80' : 'opacity-100'}
                        `}>
                            
                            {/* Nombre en grupos (Solo en el primero de la secuencia) */}
                            {!isMe && roomDetails?.is_group && isFirstInSequence && (
                                <p className={`text-[10px] font-bold mb-1 opacity-80`} style={{ color: stringToColor(msg.profiles?.full_name || 'A') }}>
                                    {msg.profiles?.full_name}
                                </p>
                            )}

                            {/* Multimedia */}
                            {msg.media_type === 'image' && (
                                <img src={msg.media_url} className="rounded-lg mb-1 max-h-80 w-full object-cover cursor-pointer hover:opacity-95 transition" onClick={() => window.open(msg.media_url)}/>
                            )}
                            {msg.media_type === 'video' && (
                                <video src={msg.media_url} controls className="rounded-lg mb-1 max-h-80 w-full bg-black"/>
                            )}

                            {/* Texto */}
                            {msg.content && <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>}
                            
                            {/* Metadata (Hora + Check) */}
                            <div className={`flex justify-end items-center gap-1 mt-0.5 select-none ${isMe ? 'text-indigo-200' : 'text-slate-400'}`}>
                                <span className="text-[9px] min-w-[35px] text-right">
                                    {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                                </span>
                                {isOptimistic && <Loader2 size={10} className="animate-spin"/>}
                            </div>
                        </div>
                    </div>
                </div>
            )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT BAR (PIE DE PÁGINA) */}
      <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        
        {/* PREVIEW AREA (Si hay archivo seleccionado) */}
        {selectedFile && (
            <div className="px-4 py-2 flex items-center gap-3 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800 animate-in slide-in-from-bottom-5">
                <div className="w-12 h-12 rounded-lg overflow-hidden relative shrink-0 border border-slate-200 dark:border-slate-700">
                    {fileType === 'image' ? (
                        <img src={previewUrl} className="w-full h-full object-cover"/>
                    ) : (
                        <div className="w-full h-full bg-slate-200 flex items-center justify-center"><Video size={20}/></div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold dark:text-white truncate">{selectedFile.name}</p>
                    <p className="text-[10px] text-slate-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button onClick={clearFile} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition">
                    <Trash2 size={16} className="text-red-500"/>
                </button>
            </div>
        )}

        <div className="p-2 flex items-end gap-2">
            <div className="flex items-center gap-1 pb-2 pl-1">
                <label className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full cursor-pointer transition">
                    <ImageIcon size={22}/>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelect(e, 'image')} disabled={uploading}/>
                </label>
                <label className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full cursor-pointer transition">
                    <Paperclip size={20}/> 
                    <input type="file" accept="video/*" className="hidden" onChange={(e) => handleFileSelect(e, 'video')} disabled={uploading}/>
                </label>
            </div>
            
            <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center px-4 py-2 my-1 border border-transparent focus-within:border-indigo-500/30 transition-colors">
                <textarea 
                    className="w-full bg-transparent outline-none text-sm dark:text-white max-h-32 resize-none py-1"
                    placeholder="Mensaje..."
                    rows={1}
                    value={newMessage}
                    onChange={e => {
                        setNewMessage(e.target.value)
                        e.target.style.height = 'auto'
                        e.target.style.height = e.target.scrollHeight + 'px'
                    }}
                    onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSend()
                        }
                    }}
                />
            </div>
            <button 
                onClick={() => handleSend()}
                disabled={(!newMessage.trim() && !selectedFile) || uploading}
                className="p-3 mb-1 bg-indigo-600 text-white rounded-full shadow-md hover:scale-105 active:scale-95 transition disabled:opacity-50 disabled:scale-100 flex items-center justify-center"
            >
                {uploading ? <Loader2 size={20} className="animate-spin"/> : <Send size={20} className="ml-0.5"/>}
            </button>
        </div>
      </div>

      {/* MODAL AÑADIR (INTACTO) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 relative shadow-2xl">
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