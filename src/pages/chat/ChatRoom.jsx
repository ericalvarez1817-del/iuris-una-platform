import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import imageCompression from 'browser-image-compression'
import { 
  Send, Image as ImageIcon, Loader2, ArrowLeft, Video, 
  UserPlus, X, Paperclip, Trash2, MoreVertical, Plus,
  ChevronDown, Download, Maximize2, Sun, Moon // <--- Importamos Sun y Moon
} from 'lucide-react'

// --- CONSTANTES Y UTILS ---
const MESSAGES_PER_PAGE = 20

const getMessageDateLabel = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return '' // Validación extra
  
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return 'Hoy'
  if (date.toDateString() === yesterday.toDateString()) return 'Ayer'
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })
}

const formatLastSeen = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return ''

    const now = new Date()
    const diff = now - date
    
    // Si es hace menos de 1 minuto
    if (diff < 60000) return 'Visto hace un momento'
    
    return `Visto por última vez ${getMessageDateLabel(dateString).toLowerCase()} a las ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}

function stringToColor(string) {
    if (!string) return '#ccc';
    let hash = 0;
    for (let i = 0; i < string.length; i++) {
        hash = string.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + "00000".substring(0, 6 - c.length) + c;
}

// --- COMPONENTE LIGHTBOX ---
const ImageLightbox = ({ src, onClose }) => {
    if (!src) return null;
    return (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-200">
            <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition">
                <X size={24}/>
            </button>
            <img src={src} className="max-w-full max-h-[90vh] object-contain rounded-md shadow-2xl animate-in zoom-in-95 duration-200"/>
        </div>
    )
}

export default function ChatRoom() { 
  const { roomId } = useParams()
  const navigate = useNavigate()
  
  // --- ESTADOS DE DATOS ---
  const [session, setSession] = useState(null)
  const [messages, setMessages] = useState([])
  const [roomDetails, setRoomDetails] = useState(null)
  const [loadingInitial, setLoadingInitial] = useState(true)
  
  // --- ESTADOS DE UI/UX ---
  const [newMessage, setNewMessage] = useState('')
  const [uploading, setUploading] = useState(false)
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [lightboxSrc, setLightboxSrc] = useState(null)
  
  // --- REALTIME & PRESENCIA (PREMIUM) ---
  const [onlineUsers, setOnlineUsers] = useState(new Set()) 
  const [typingUsers, setTypingUsers] = useState(new Set())
  const [otherUserStatus, setOtherUserStatus] = useState({ isOnline: false, lastSeen: null })
  const typingTimeoutRef = useRef(null)
  const channelRef = useRef(null)

  // --- TEMA (MODO NOCHE/CLARO) ---
  const [isDarkMode, setIsDarkMode] = useState(() => {
      // Inicializar estado basado en la clase actual del documento
      return document.documentElement.classList.contains('dark')
  })

  const toggleTheme = () => {
      const isDark = document.documentElement.classList.contains('dark')
      if (isDark) {
          document.documentElement.classList.remove('dark')
          localStorage.setItem('theme', 'light')
          setIsDarkMode(false)
      } else {
          document.documentElement.classList.add('dark')
          localStorage.setItem('theme', 'dark')
          setIsDarkMode(true)
      }
  }

  // --- SCROLL INFINITO ---
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const chatContainerRef = useRef(null)
  const messagesEndRef = useRef(null)
  const prevScrollHeightRef = useRef(0)

  // --- ARCHIVOS ---
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [fileType, setFileType] = useState('text') 

  // --- MODALES ---
  const [showAddModal, setShowAddModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])

  // 1. INICIALIZACIÓN SEGURA
  useEffect(() => {
    let mounted = true;
    
    const init = async () => {
        try {
            const { data: { session }, error } = await supabase.auth.getSession()
            if (error || !session) {
                if (mounted) navigate('/auth')
                return
            }
            
            if (mounted) {
                setSession(session)
                if (roomId) await setupRoom(session.user.id)
            }
        } catch (e) {
            console.error("Error init chat:", e)
            if (mounted) setLoadingInitial(false) // Asegurar que quite el loading
        }
    }

    init()
    return () => { mounted = false }
  }, [roomId])

  // 2. REALTIME
  useEffect(() => {
    if (!session?.user?.id || !roomId) return;

    // Limpiar canal anterior si existe
    if (channelRef.current) supabase.removeChannel(channelRef.current)

    const channel = supabase.channel(`room:${roomId}`, {
        config: { 
            presence: { key: session.user.id },
            broadcast: { self: false }
        } 
    })
    channelRef.current = channel

    // A. Mensajes DB
    channel.on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` }, 
        (payload) => {
            setMessages(prev => {
                const exists = prev.find(m => m.id === payload.new.id)
                if (exists) return prev

                // Reconciliación con Broadcast
                const broadcastMatchIndex = prev.findIndex(m => 
                    m.is_broadcast && 
                    m.sender_id === payload.new.sender_id && 
                    m.content === payload.new.content &&
                    new Date(m.created_at).getTime() > new Date(payload.new.created_at).getTime() - 10000
                )

                if (broadcastMatchIndex !== -1) {
                    const newMessages = [...prev]
                    fetchSingleMessage(payload.new.id).then(fullMsg => {
                        if(fullMsg) {
                             setMessages(current => current.map(m => m.id === payload.new.id ? fullMsg : m))
                        }
                    })
                    // Actualizar temporalmente con ID real
                    newMessages[broadcastMatchIndex] = { 
                        ...newMessages[broadcastMatchIndex], 
                        id: payload.new.id, 
                        is_broadcast: false 
                    }
                    return newMessages
                }

                fetchSingleMessage(payload.new.id)
                return prev
            })
        }
    )

    // B. Broadcast (Mensajería Instantánea)
    channel.on('broadcast', { event: 'new_message' }, (payload) => {
        const incomingMsg = payload.payload
        setMessages(prev => {
            if (prev.find(m => m.id === incomingMsg.id)) return prev
            const broadcastMsg = { ...incomingMsg, is_broadcast: true }
            setTimeout(scrollToBottom, 50)
            return [...prev, broadcastMsg]
        })
    })

    // C. Presencia
    channel.on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const online = new Set()
        const typing = new Set()
        
        let otherUserOnline = false
        
        // Iteramos sobre las claves de presencia (user IDs)
        for (const key in state) {
            if (key === session.user.id) continue;
            online.add(key)
            
            // Verificamos si alguien está escribiendo
            // state[key] es un array de presencias para ese usuario (por si tiene multiples dispositivos)
            state[key].forEach(p => {
                if (p.typing) typing.add(p.username || 'Alguien')
            })

            // Verificar si es el otro usuario (para chats 1v1)
            // Usamos una referencia a roomDetails desde una ref o verificando si la key coincide
            // Nota: roomDetails en el closure de este efecto podría ser antiguo, 
            // pero si setupRoom ya corrió, deberíamos tener la data necesaria.
        }
        
        setOnlineUsers(online)
        setTypingUsers(typing)

        // Actualizamos estado del "otro" usuario basado en la lista online actualizada
        // Necesitamos acceder a la info del otro usuario. 
        // Como este closure puede no tener el último roomDetails, confiamos en la actualización de estado
        setOtherUserStatus(prev => {
             // Si no sabemos quién es el otro usuario aún, no cambiamos nada crítico
             return {
                 ...prev,
                 isOnline: online.size > 0 // Simplificación para 1v1: si hay alguien más, es él
             }
        })
    })

    channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
        // Cuando alguien se va, actualizamos su última vez
        if (leftPresences.length > 0) {
            setOtherUserStatus(prev => ({ 
                isOnline: false, 
                lastSeen: new Date().toISOString() 
            }))
        }
    })

    channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
            await channel.track({ 
                user_id: session.user.id,
                online_at: new Date().toISOString(), 
                typing: false 
            })
        }
    })

    return () => supabase.removeChannel(channel)
  }, [roomId, session]) 
  // Nota: Quitamos dependencias inestables para evitar reconexiones constantes

  // --- SETUP ROOM ROBUSTO ---
  const setupRoom = async (myUserId) => {
      try {
        setLoadingInitial(true)

        // 1. Obtener datos de la sala
        const { data: room, error: roomError } = await supabase
            .from('chat_rooms')
            .select('*')
            .eq('id', roomId)
            .single()
        
        if (roomError || !room) throw new Error("Room not found")

        let roomInfo = { 
            name: room.name, 
            avatar: room.image_url, 
            is_group: room.is_group,
            otherUserId: null
        }
        
        // Estado inicial de presencia basado en datos estáticos
        let initialPresence = { 
            isOnline: false, 
            lastSeen: room.last_message_time // Fallback seguro
        }

        if (!room.is_group) {
            // Obtener participantes.
            // IMPORTANTE: No pedimos 'last_seen' explícitamente para evitar crash si la columna no existe.
            const { data: participants, error: partError } = await supabase
                .from('chat_participants')
                .select('profiles(id, full_name, avatar_url)') 
                .eq('room_id', roomId)
            
            if (!partError && participants) {
                // Encontrar al otro usuario
                const otherParticipant = participants.find(p => p.profiles && p.profiles.id !== myUserId)
                const otherUser = otherParticipant?.profiles

                if (otherUser) {
                    roomInfo.name = otherUser.full_name || 'Usuario'
                    roomInfo.avatar = otherUser.avatar_url
                    roomInfo.otherUserId = otherUser.id
                    
                    // Si tienes la columna last_seen, podrías descomentar esto, pero es arriesgado sin migración
                    // if (otherUser.last_seen) initialPresence.lastSeen = otherUser.last_seen
                }
            }
        }

        setRoomDetails(roomInfo)
        setOtherUserStatus(initialPresence)
        
        // 2. Cargar mensajes
        await loadMessages(0)

      } catch (error) {
          console.error("Error en setupRoom:", error)
      } finally {
          // SIEMPRE quitar el loading, pase lo que pase
          setLoadingInitial(false)
      }
  }

  const loadMessages = async (offset = 0) => {
      try {
        if (offset > 0) setLoadingMore(true)
        
        const { data, error } = await supabase
            .from('messages')
            .select('*, profiles(full_name, avatar_url)')
            .eq('room_id', roomId)
            .order('created_at', { ascending: false })
            .range(offset, offset + MESSAGES_PER_PAGE - 1)
        
        if (error) throw error

        if (data) {
            if (data.length < MESSAGES_PER_PAGE) setHasMore(false)
            const orderedMessages = data.reverse()

            setMessages(prev => {
                if (offset === 0) {
                    setTimeout(scrollToBottom, 100)
                    return orderedMessages
                } else {
                    return [...orderedMessages, ...prev]
                }
            })
        }
      } catch (err) {
          console.error("Error loading messages:", err)
      } finally {
          setLoadingMore(false)
      }
  }

  // --- SCROLL & UI LOGIC ---
  const handleScroll = () => {
      const container = chatContainerRef.current
      if (!container) return
      if (container.scrollTop === 0 && hasMore && !loadingMore && !loadingInitial) {
          prevScrollHeightRef.current = container.scrollHeight
          loadMessages(messages.length)
      }
  }

  useEffect(() => {
      if (!loadingMore && prevScrollHeightRef.current > 0 && chatContainerRef.current) {
          const container = chatContainerRef.current
          container.scrollTop = container.scrollHeight - prevScrollHeightRef.current
          prevScrollHeightRef.current = 0
      }
  }, [messages, loadingMore])

  const fetchSingleMessage = async (msgId) => {
    try {
        const { data } = await supabase
        .from('messages')
        .select('*, profiles(full_name, avatar_url)')
        .eq('id', msgId)
        .single()
        
        if(data) {
            setMessages(prev => {
                const idx = prev.findIndex(m => m.id === msgId)
                if (idx >= 0) {
                    const newArr = [...prev]
                    newArr[idx] = data
                    return newArr
                }
                return [...prev, data]
            })
            scrollToBottom()
            return data
        }
    } catch (e) { console.error(e) }
  }

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }

  // --- INPUT & SEND ---
  const handleTypingInput = (e) => {
      setNewMessage(e.target.value)
      e.target.style.height = 'auto'
      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'

      if (!typingTimeoutRef.current) {
         channelRef.current?.track({ 
             user_id: session?.user?.id,
             username: 'Yo', // Enviar nombre si es posible, si no 'Yo'
             typing: true 
         })
      }
      
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => {
         channelRef.current?.track({ 
             user_id: session?.user?.id,
             username: 'Yo',
             typing: false 
         })
         typingTimeoutRef.current = null
      }, 2000)
  }

  const handleSend = async () => {
    if (!newMessage.trim() && !selectedFile) return
    if (!session?.user?.id) return

    const contentToSend = newMessage
    const fileToSend = selectedFile
    const typeToSend = fileToSend ? fileType : 'text'

    setNewMessage('')
    clearFile() 
    setShowAttachMenu(false)
    setUploading(true)
    
    const textarea = document.querySelector('textarea')
    if(textarea) textarea.style.height = 'auto'

    const tempId = `temp-${Date.now()}`
    const messagePayload = {
        id: tempId,
        room_id: roomId,
        sender_id: session.user.id,
        content: contentToSend,
        media_url: fileToSend ? URL.createObjectURL(fileToSend) : null,
        media_type: typeToSend,
        created_at: new Date().toISOString(),
        profiles: { full_name: 'Yo', avatar_url: session.user?.user_metadata?.avatar_url },
        is_sending: true 
    }

    setMessages(prev => [...prev, messagePayload])
    scrollToBottom()

    // BROADCAST INSTANTÁNEO
    if (!fileToSend) {
        channelRef.current?.send({
            type: 'broadcast',
            event: 'new_message',
            payload: { ...messagePayload, is_sending: false, id: `broadcast-${Date.now()}` }
        })
    }

    try {
        let mediaUrl = null
        if (fileToSend) {
            let fileToUpload = fileToSend
            if (typeToSend === 'image') {
                const options = { maxSizeMB: 0.8, maxWidthOrHeight: 1280, useWebWorker: true, fileType: 'image/webp' }
                fileToUpload = await imageCompression(fileToSend, options)
            }
            
            const ext = typeToSend === 'image' ? 'webp' : fileToSend.name.split('.').pop()
            const fileName = `${session.user.id}/${Date.now()}_${typeToSend}.${ext}`
            
            const { error: uploadError } = await supabase.storage.from('chat-media').upload(fileName, fileToUpload)
            if (uploadError) throw uploadError
            
            const { data } = supabase.storage.from('chat-media').getPublicUrl(fileName)
            mediaUrl = data.publicUrl
        }

        const { data: sentData, error } = await supabase.from('messages').insert({
            room_id: roomId,
            sender_id: session.user.id,
            content: contentToSend,
            media_url: mediaUrl,
            media_type: typeToSend
        }).select('*, profiles(full_name, avatar_url)').single()

        if (error) throw error

        setMessages(prev => prev.map(msg => msg.id === tempId ? sentData : msg))

        if (fileToSend) {
            channelRef.current?.send({
                type: 'broadcast',
                event: 'new_message',
                payload: sentData
            })
        }

        await supabase.from('chat_rooms').update({
            last_message: typeToSend !== 'text' ? `📎 ${typeToSend === 'image' ? 'Foto' : 'Video'}` : contentToSend,
            last_message_time: new Date()
        }).eq('id', roomId)

    } catch (error) {
        console.error("Send error:", error)
        // alert("Error al enviar") // Alert removido, mejor UI fail silencioso o toast
        setMessages(prev => prev.filter(m => m.id !== tempId))
    }
    setUploading(false)
  }

  // --- HELPERS ARCHIVOS ---
  const handleFileSelect = (e, type) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0]
        setSelectedFile(file)
        setFileType(type)
        setPreviewUrl(URL.createObjectURL(file))
        setShowAttachMenu(false)
    }
  }
  const clearFile = () => { setSelectedFile(null); setPreviewUrl(null); setFileType('text'); }

  // --- SEARCH MODAL ---
  const handleSearchUsers = async (term) => {
      setSearchTerm(term)
      if (term.length < 3) return setSearchResults([])
      try {
          const { data, error } = await supabase.rpc('search_users_not_in_room', { p_search_term: term, p_room_id: roomId })
          if (!error) setSearchResults(data)
      } catch(e) { console.error(e) }
  }
  const addMember = async (userId) => {
      await supabase.from('chat_participants').insert({ room_id: roomId, user_id: userId })
      setShowAddModal(false); setSearchTerm('')
  }

  // --- RENDER HELPERS ---
  const getHeaderSubtitle = () => {
      if (typingUsers.size > 0) return `${Array.from(typingUsers).join(', ')} escribiendo...`
      
      if (roomDetails?.is_group) {
          return onlineUsers.size > 0 ? `${onlineUsers.size} en línea` : 'Grupo'
      }

      if (otherUserStatus.isOnline) return 'En línea'
      if (otherUserStatus.lastSeen) return formatLastSeen(otherUserStatus.lastSeen)
      
      return 'Desconectado'
  }

  if (loadingInitial) {
      return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-50 dark:bg-slate-950">
              <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                  <p className="text-sm text-slate-500 font-medium">Cifrando mensajes...</p>
              </div>
          </div>
      )
  }

  return (
    // CAMBIO AQUI: z-[100] para sobreponerse a la navbar y h-[100dvh] para altura móvil correcta
    <div className="fixed inset-0 z-[100] h-[100dvh] bg-slate-100 dark:bg-slate-950 flex flex-col md:static md:z-auto md:h-[90vh] md:max-w-5xl md:mx-auto md:shadow-2xl md:my-5 md:rounded-3xl md:overflow-hidden md:border dark:border-slate-800 transition-colors relative">
      
      {/* HEADER */}
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 py-3 shadow-sm flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 z-20 absolute top-0 w-full">
        <button onClick={() => navigate('/chat')} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"><ArrowLeft size={20} className="dark:text-white"/></button>
        
        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-slate-800 flex items-center justify-center text-indigo-600 font-bold overflow-hidden border border-slate-200 dark:border-slate-700 relative shadow-sm">
             {roomDetails?.avatar ? <img src={roomDetails.avatar} className="w-full h-full object-cover"/> : (roomDetails?.name?.charAt(0) || '#')}
             
             {/* Punto Online */}
             {((!roomDetails?.is_group && otherUserStatus.isOnline) || (roomDetails?.is_group && onlineUsers.size > 0)) && (
                 <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
             )}
        </div>
        
        <div className="flex-1 cursor-default min-w-0">
            <h2 className="font-bold text-slate-800 dark:text-white text-base leading-tight truncate">{roomDetails?.name || 'Chat'}</h2>
            <p className={`text-xs font-medium truncate transition-all duration-300 ${
                otherUserStatus.isOnline || typingUsers.size > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'
            }`}>
                {getHeaderSubtitle()}
            </p>
        </div>
        
        {/* BOTONES DE ACCIÓN (Añadir + Tema) */}
        <div className="flex items-center gap-2">
            <button 
                onClick={toggleTheme} 
                className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
                {isDarkMode ? <Sun size={20}/> : <Moon size={20}/>}
            </button>

            {roomDetails?.is_group && (
                <button onClick={() => setShowAddModal(true)} className="p-2 bg-slate-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-full hover:bg-indigo-50 dark:hover:bg-slate-700 transition"><UserPlus size={20}/></button>
            )}
        </div>
      </div>

      {/* MENSAJES */}
      <div 
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto pt-20 pb-4 px-2 md:px-4 space-y-1 bg-[#e5ddd5] dark:bg-slate-950 scroll-smooth"
        style={{ backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')", backgroundBlendMode: 'overlay' }}
      >
        {loadingMore && <div className="text-center py-2"><Loader2 className="animate-spin inline text-indigo-600" size={20}/></div>}

        {messages.map((msg, index) => {
            const isMe = msg.sender_id === session?.user?.id
            const isOptimistic = msg.is_sending 
            
            const prevMsg = messages[index - 1]
            const nextMsg = messages[index + 1]
            
            const showDate = !prevMsg || new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString()
            const isFirstInGroup = !prevMsg || prevMsg.sender_id !== msg.sender_id || showDate
            const isLastInGroup = !nextMsg || nextMsg.sender_id !== msg.sender_id
            
            const roundedClass = isMe 
                ? `${isFirstInGroup ? 'rounded-tr-none' : ''} ${isLastInGroup ? 'rounded-br-2xl' : 'rounded-br-md'} rounded-l-2xl rounded-tr-2xl`
                : `${isFirstInGroup ? 'rounded-tl-none' : ''} ${isLastInGroup ? 'rounded-bl-2xl' : 'rounded-bl-md'} rounded-r-2xl rounded-tl-2xl`

            return (
                <div key={index} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {showDate && (
                        <div className="flex justify-center my-4 sticky top-16 z-10">
                            <span className="bg-slate-200/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-600 dark:text-slate-300 text-[10px] font-bold px-3 py-1 rounded-full shadow-sm border border-white/20">
                                {getMessageDateLabel(msg.created_at)}
                            </span>
                        </div>
                    )}

                    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} group mb-${isLastInGroup ? '2' : '0.5'}`}>
                        <div className={`
                            relative max-w-[85%] sm:max-w-[60%] px-3 py-2 shadow-sm text-[15px]
                            ${isMe 
                                ? 'bg-indigo-600 text-white shadow-indigo-500/20' 
                                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700'} 
                            ${roundedClass}
                            ${isOptimistic ? 'opacity-70' : 'opacity-100'}
                        `}>
                            {isFirstInGroup && (
                                <svg className={`absolute top-0 ${isMe ? '-right-2 text-indigo-600' : '-left-2 text-white dark:text-slate-800'} w-2 h-3`} viewBox="0 0 8 13" fill="currentColor">
                                    <path d={isMe ? "M-3 0v13h11c0-5-2-9-11-13z" : "M11 0v13H0c0-5 2-9 11-13z"} />
                                </svg>
                            )}

                            {!isMe && roomDetails?.is_group && isFirstInGroup && (
                                <p className="text-[11px] font-bold mb-1 opacity-90" style={{ color: stringToColor(msg.profiles?.full_name || 'A') }}>
                                    {msg.profiles?.full_name}
                                </p>
                            )}

                            {msg.media_type === 'image' && (
                                <div className="mb-1 rounded-lg overflow-hidden relative group/img">
                                    <img 
                                        src={msg.media_url} 
                                        className="max-h-80 w-full object-cover cursor-pointer hover:scale-105 transition duration-300" 
                                        onClick={() => setLightboxSrc(msg.media_url)}
                                    />
                                </div>
                            )}
                             {msg.media_type === 'video' && (
                                <video src={msg.media_url} controls className="rounded-lg mb-1 max-h-80 w-full bg-black"/>
                            )}

                            {msg.content && <p className="whitespace-pre-wrap break-words leading-snug">{msg.content}</p>}
                            
                            <div className={`flex justify-end items-center gap-1 mt-1 -mb-1 select-none ${isMe ? 'text-indigo-200' : 'text-slate-400'}`}>
                                <span className="text-[10px]">
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

      {/* INPUT */}
      <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-30">
        
        {selectedFile && (
            <div className="px-4 py-3 flex items-center gap-3 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800 animate-in slide-in-from-bottom-5">
                <div className="w-14 h-14 rounded-xl overflow-hidden relative shrink-0 border border-slate-200 dark:border-slate-700 shadow-sm">
                    {fileType === 'image' ? (
                        <img src={previewUrl} className="w-full h-full object-cover"/>
                    ) : (
                        <div className="w-full h-full bg-slate-200 flex items-center justify-center"><Video size={24} className="text-slate-500"/></div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold dark:text-white truncate">{selectedFile.name}</p>
                    <p className="text-xs text-slate-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Listo para enviar</p>
                </div>
                <button onClick={clearFile} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition group">
                    <Trash2 size={18} className="text-red-500"/>
                </button>
            </div>
        )}

        <div className="p-2 md:p-3 flex items-end gap-2 max-w-5xl mx-auto">
            
            <div className="relative pb-1">
                <button 
                    onClick={() => setShowAttachMenu(!showAttachMenu)}
                    className={`p-3 rounded-full transition-all duration-200 ${showAttachMenu ? 'bg-indigo-100 text-indigo-600 rotate-45' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                >
                    <Plus size={24} />
                </button>

                {showAttachMenu && (
                    <div className="absolute bottom-16 left-0 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 p-2 flex flex-col gap-1 min-w-[160px] animate-in slide-in-from-bottom-5 zoom-in-95 z-50">
                        <label className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl cursor-pointer transition">
                            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600"><ImageIcon size={18}/></div>
                            <span className="text-sm font-bold dark:text-white">Foto</span>
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelect(e, 'image')}/>
                        </label>
                        <label className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl cursor-pointer transition">
                            <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-600"><Video size={18}/></div>
                            <span className="text-sm font-bold dark:text-white">Video</span>
                            <input type="file" accept="video/*" className="hidden" onChange={(e) => handleFileSelect(e, 'video')}/>
                        </label>
                    </div>
                )}
            </div>
            
            <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-[1.5rem] flex items-center px-4 py-1.5 my-1 border border-transparent focus-within:border-indigo-500/30 focus-within:bg-white dark:focus-within:bg-slate-900 transition-all shadow-inner">
                <textarea 
                    className="w-full bg-transparent outline-none text-[15px] dark:text-white max-h-32 resize-none py-2 leading-relaxed"
                    placeholder="Escribe un mensaje..."
                    rows={1}
                    value={newMessage}
                    onChange={handleTypingInput}
                    onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSend()
                        }
                    }}
                />
            </div>

            <button 
                onClick={handleSend}
                disabled={(!newMessage.trim() && !selectedFile) || uploading}
                className={`p-3.5 mb-1 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 
                    ${(!newMessage.trim() && !selectedFile) 
                        ? 'bg-slate-200 text-slate-400 scale-90 opacity-50 cursor-not-allowed dark:bg-slate-800' 
                        : 'bg-indigo-600 text-white hover:scale-110 active:scale-95 hover:shadow-indigo-500/30'
                    }`}
            >
                {uploading ? <Loader2 size={20} className="animate-spin"/> : <Send size={20} className="ml-0.5"/>}
            </button>
        </div>
      </div>

      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] p-6 relative shadow-2xl">
                <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition"><X size={18}/></button>
                <h3 className="font-bold text-lg mb-4 dark:text-white flex items-center gap-2">Añadir al grupo</h3>
                <input 
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl mb-4 outline-none font-bold dark:text-white focus:ring-2 ring-indigo-500/20 transition"
                    placeholder="Buscar persona..."
                    value={searchTerm}
                    autoFocus
                    onChange={e => handleSearchUsers(e.target.value)}
                />
                <div className="max-h-60 overflow-y-auto space-y-2">
                    {searchResults.map(user => (
                        <div key={user.id} onClick={() => addMember(user.id)} className="flex items-center gap-3 p-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl cursor-pointer transition group">
                            <img src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.full_name}&background=random`} className="w-10 h-10 rounded-full"/>
                            <div>
                                <p className="font-bold text-sm dark:text-white">{user.full_name}</p>
                                <p className="text-[10px] text-indigo-500 font-bold group-hover:underline">Añadir ahora</p>
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