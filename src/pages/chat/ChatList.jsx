import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { 
  MessageCircle, Plus, Search, Users, ArrowLeft, X, 
  CheckCheck, Camera, Loader2 
} from 'lucide-react'

// 1. IMPORTAMOS EL CEREBRO DE NOTIFICACIONES
import { sendNotification } from '../../lib/notifications'

// --- UTILS: FORMATO DE FECHA TIPO WHATSAPP ---
const formatChatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return 'Ayer'
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'long' })
  return date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' })
}

// --- COMPONENTE SKELETON (CARGA ELEGANTE) ---
const ChatSkeleton = () => (
  <div className="flex items-center gap-3 p-3 animate-pulse border-b border-slate-50 dark:border-slate-800/50">
    <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800"/>
    <div className="flex-1 space-y-2">
      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3"/>
      <div className="h-3 bg-slate-100 dark:bg-slate-800/50 rounded w-3/4"/>
    </div>
  </div>
)

export default function ChatList() {
  const navigate = useNavigate()
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  
  // Modales
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [showUserModal, setShowUserModal] = useState(false)
  
  // Forms & UI States
  const [newGroupName, setNewGroupName] = useState('')
  const [searchTerm, setSearchTerm] = useState('') 
  const [localFilter, setLocalFilter] = useState('') 
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)

  // Inicialización
  useEffect(() => {
    // 1. Obtener sesión y cargar lista inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session)
        if(session) fetchRooms(session.user.id, true) // true = mostrar loading inicial
    })
    
    // --- SUSCRIPCIÓN ROBUSTA (SOLUCIÓN AL BUG DE DESAPARICIÓN) ---
    const channel = supabase.channel('room_list_updates')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_rooms' }, (payload) => {
        const newRoomData = payload.new;
        
        // A. Notificación
        if (newRoomData.last_message) {
            sendNotification("💬 Nuevo Mensaje", newRoomData.last_message);
        }

        // B. Actualización Silenciosa
        // Recargamos la lista completa para evitar errores de sincronización y datos faltantes.
        // NO activamos el loading, por lo que el cambio es invisible y fluido.
        if(session) fetchRooms(session.user.id, false) 
    })
    .subscribe()

    return () => supabase.removeChannel(channel)
  }, [session])

  const fetchRooms = async (userId, showLoading = false) => {
    if(showLoading) setLoading(true)
    
    try {
        const { data: myInvolvements } = await supabase
            .from('chat_participants')
            .select('room_id')
            .eq('user_id', userId)

        if (myInvolvements && myInvolvements.length > 0) {
            const roomIds = myInvolvements.map(r => r.room_id)
            
            const { data: roomData } = await supabase
                .from('chat_rooms')
                .select('*, chat_participants(profiles(full_name, avatar_url, id))')
                .in('id', roomIds)
                .order('last_message_time', { ascending: false })
            
            const formattedRooms = roomData.map(room => {
                if (room.is_group) {
                    return { ...room, display_name: room.name, display_image: room.image_url }
                } else {
                    const other = room.chat_participants.find(p => p.profiles.id !== userId)?.profiles
                    return { 
                        ...room, 
                        display_name: other?.full_name || 'Usuario Desconocido', 
                        display_image: other?.avatar_url 
                    }
                }
            })
            setRooms(formattedRooms)
        }
    } catch (error) {
        console.error("Error fetching rooms:", error)
    } finally {
        setLoading(false)
    }
  }

  // --- FILTRADO SEGURO ---
  const visibleRooms = rooms.filter(room => 
    room.display_name?.toLowerCase().includes((localFilter || '').toLowerCase())
  )

  // --- ACTIONS ---
  const createGroup = async () => {
    if (!newGroupName.trim()) return
    try {
        const { data: roomId, error } = await supabase.rpc('create_chat_room_transaction', {
            p_name: newGroupName,
            p_is_group: true,
            p_creator_id: session.user.id
        })
        if (error) throw error
        setShowGroupModal(false)
        setNewGroupName('')
        fetchRooms(session.user.id, false)
        navigate(`/chat/${roomId}`)
    } catch (error) { alert("Error: " + error.message) }
  }

  const handleSearchUsers = async (term) => {
    setSearchTerm(term)
    if(term.length < 3) return setSearchResults([])
    setSearching(true)
    const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .ilike('full_name', `%${term}%`)
        .limit(5)
    
    setSearchResults(data?.filter(u => u.id !== session.user.id) || [])
    setSearching(false)
  }

  const startDM = async (otherUserId) => {
      try {
          const { data: roomId, error } = await supabase.rpc('create_dm_transaction', {
              p_my_id: session.user.id,
              p_other_id: otherUserId
          })
          if (error) throw error
          setShowUserModal(false)
          fetchRooms(session.user.id, false)
          navigate(`/chat/${roomId}`)
      } catch (error) { alert("Error: " + error.message) }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col md:max-w-5xl md:mx-auto md:shadow-2xl md:min-h-[90vh] md:my-5 md:rounded-3xl md:overflow-hidden md:border dark:border-slate-800 transition-colors">
      
      {/* HEADER TIPO APP */}
      <header className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 transition-all">
        <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
                 <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition group">
                    <ArrowLeft size={22} className="text-slate-600 dark:text-slate-300 group-hover:-translate-x-1 transition-transform"/>
                 </button>
                 <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Chats</h1>
            </div>
            
            {/* ACCIONES RÁPIDAS HEADER */}
            <div className="flex items-center gap-1">
                <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition md:hidden">
                    <Search size={22}/>
                </button>
                <button onClick={() => setShowGroupModal(true)} className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full transition">
                    <Users size={22}/>
                </button>
            </div>
        </div>

        {/* SEARCH BAR INTEGRADA */}
        <div className="px-4 pb-3">
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={16} className="text-slate-400 group-focus-within:text-indigo-500 transition-colors"/>
                </div>
                <input 
                    className="block w-full pl-10 pr-3 py-2.5 bg-slate-100 dark:bg-slate-900/50 border-none rounded-xl text-sm font-medium dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white dark:focus:bg-slate-900 transition-all outline-none"
                    placeholder="Buscar chats o mensajes..."
                    value={localFilter}
                    onChange={(e) => setLocalFilter(e.target.value)}
                />
                {localFilter && (
                    <button onClick={() => setLocalFilter('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">
                        <X size={14} className="bg-slate-200 dark:bg-slate-700 rounded-full p-0.5"/>
                    </button>
                )}
            </div>
        </div>
      </header>

      {/* LISTA DE CHATS */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
            <div className="p-4 space-y-4">
                {[...Array(6)].map((_, i) => <ChatSkeleton key={i}/>)}
            </div>
        ) : visibleRooms.length === 0 ? (
            /* EMPTY STATE */
            <div className="flex flex-col items-center justify-center h-[60vh] px-6 text-center animate-in fade-in zoom-in duration-300">
                <div className="w-20 h-20 bg-indigo-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-indigo-500">
                    <MessageCircle size={32}/>
                </div>
                <h3 className="font-bold text-lg dark:text-white mb-1">
                   {localFilter ? 'Sin resultados' : 'No tienes mensajes'}
                </h3>
                <p className="text-slate-400 text-sm max-w-xs mb-6">
                    {localFilter ? `No encontramos nada para "${localFilter}"` : 'Empieza una conversación con tus compañeros.'}
                </p>
                <button 
                    onClick={() => {
                        if(localFilter) { setSearchTerm(localFilter); setLocalFilter(''); setShowUserModal(true); }
                        else { setShowUserModal(true); }
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-full shadow-lg shadow-indigo-500/30 active:scale-95 transition-all flex items-center gap-2"
                >
                    <Plus size={18}/> {localFilter ? 'Buscar Globalmente' : 'Nuevo Chat'}
                </button>
            </div>
        ) : (
            /* LISTA REAL */
            <div className="pb-24 pt-1">
                {visibleRooms.map(room => {
                    // Calculamos si el mensaje es reciente (ej: hoy) para resaltarlo
                    const isRecent = new Date(room.last_message_time).toDateString() === new Date().toDateString();
                    
                    return (
                    <div 
                        key={room.id} 
                        onClick={() => navigate(`/chat/${room.id}`)}
                        className="group flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-900/40 cursor-pointer transition-colors border-b border-transparent hover:border-slate-100 dark:hover:border-slate-800/50"
                    >
                        {/* AVATAR */}
                        <div className="relative shrink-0">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-100 to-purple-100 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm group-hover:shadow-md transition-all">
                                {room.display_image ? (
                                    <img src={room.display_image} className="w-full h-full object-cover" alt="Avatar"/>
                                ) : (
                                    room.display_name?.charAt(0).toUpperCase() || '#'
                                )}
                            </div>
                        </div>

                        {/* INFO */}
                        <div className="flex-1 min-w-0 flex flex-col justify-center h-full">
                            <div className="flex justify-between items-baseline mb-0.5">
                                <h3 className="font-bold text-slate-900 dark:text-slate-100 truncate text-[15px] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                    {room.display_name}
                                </h3>
                                {/* Fecha con color si es reciente */}
                                <span className={`text-[11px] font-medium shrink-0 ml-2 ${
                                    isRecent ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-400'
                                }`}>
                                    {formatChatDate(room.last_message_time)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <p className={`text-[13px] truncate pr-4 leading-relaxed flex items-center gap-1 ${
                                    isRecent ? 'text-slate-700 dark:text-slate-300 font-medium' : 'text-slate-500 dark:text-slate-400'
                                }`}>
                                    {/* Iconos según tipo de mensaje */}
                                    {room.last_message?.includes('http') ? <Camera size={13} className="text-slate-400"/> : <CheckCheck size={13} className="text-indigo-400"/>}
                                    {room.last_message || <span className="italic opacity-50">Borrador...</span>}
                                </p>
                            </div>
                        </div>
                    </div>
                )})}
            </div>
        )}
      </div>

      {/* FAB (BOTÓN FLOTANTE MÓVIL) */}
      <button 
        onClick={() => setShowUserModal(true)}
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-600/30 flex items-center justify-center z-30 active:scale-90 transition-transform hover:bg-indigo-700"
      >
        <Plus size={28} strokeWidth={2.5}/>
      </button>

      {/* --- MODALES CON ESTILO WHATSAPP --- */}
      
      {/* 1. CREAR GRUPO */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] p-0 relative shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800">
                <div className="bg-indigo-600 px-6 py-4 flex items-center justify-between">
                     <h3 className="font-bold text-lg text-white flex items-center gap-2"><Users size={20}/> Nuevo Grupo</h3>
                     <button onClick={() => setShowGroupModal(false)} className="text-white/80 hover:text-white bg-white/10 rounded-full p-1"><X size={20}/></button>
                </div>
                
                <div className="p-6">
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300 border-2 border-dashed border-slate-300 dark:border-slate-700 cursor-pointer hover:border-indigo-500 hover:text-indigo-500 transition">
                            <Camera size={24}/>
                        </div>
                    </div>
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Nombre del grupo</label>
                    <input 
                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl mt-1 mb-6 outline-none font-bold text-lg dark:text-white border border-slate-200 dark:border-slate-700 focus:border-indigo-500 transition"
                        placeholder="Ej. Proyecto Final..."
                        value={newGroupName}
                        autoFocus
                        onChange={e => setNewGroupName(e.target.value)}
                    />
                    <button 
                        onClick={createGroup} 
                        className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-sm uppercase tracking-widest shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition hover:bg-indigo-700"
                    >
                        Crear Ahora
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* 2. BUSCAR PERSONAS */}
      {showUserModal && (
        <div className="fixed inset-0 bg-white dark:bg-slate-950 z-[60] md:bg-black/60 md:backdrop-blur-sm md:flex md:items-center md:justify-center animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full h-full md:h-auto md:max-h-[80vh] md:max-w-lg md:rounded-3xl relative shadow-2xl flex flex-col">
                {/* Modal Header */}
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                    <button onClick={() => setShowUserModal(false)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                        <ArrowLeft size={22} className="text-slate-600 dark:text-white"/>
                    </button>
                    <div className="flex-1">
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white">Nuevo Chat</h3>
                        <p className="text-xs text-slate-400">{searchResults.length > 0 ? `${searchResults.length} resultados` : 'Busca personas'}</p>
                    </div>
                </div>

                {/* Buscador */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50">
                     <div className="relative">
                        <Search size={18} className="absolute left-3 top-3.5 text-slate-400"/>
                        <input 
                            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 rounded-xl outline-none font-medium dark:text-white shadow-sm border border-slate-100 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500/20 transition"
                            placeholder="Nombre o usuario..."
                            autoFocus
                            value={searchTerm}
                            onChange={e => handleSearchUsers(e.target.value)}
                        />
                     </div>
                </div>

                {/* Lista de Resultados */}
                <div className="flex-1 overflow-y-auto p-2">
                    {searching ? (
                        <div className="py-10 text-center"><Loader2 className="animate-spin mx-auto text-indigo-500"/></div>
                    ) : (
                        <div className="space-y-1">
                            {/* Botón para crear grupo desde aquí si se desea */}
                            <div onClick={() => { setShowUserModal(false); setShowGroupModal(true); }} className="flex items-center gap-4 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition group">
                                <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                    <Users size={22}/>
                                </div>
                                <p className="font-bold dark:text-white">Crear un nuevo grupo</p>
                            </div>

                            <div className="my-2 px-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Resultados</div>

                            {searchResults.map(user => (
                                <div key={user.id} onClick={() => startDM(user.id)} className="flex items-center gap-4 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition">
                                    <img src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.full_name}&background=random`} className="w-12 h-12 rounded-full border border-slate-100 dark:border-slate-700 object-cover" alt="User"/>
                                    <div className="flex-1 border-b border-slate-50 dark:border-slate-800/50 pb-3 mb-[-12px]">
                                        <p className="font-bold text-slate-800 dark:text-white text-base">{user.full_name}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">¡Hola! Estoy usando Iuris.</p>
                                    </div>
                                </div>
                            ))}
                            
                            {searchTerm.length > 2 && searchResults.length === 0 && !searching && (
                                <div className="py-10 text-center opacity-60">
                                    <Search size={40} className="mx-auto mb-2 text-slate-300"/>
                                    <p className="text-sm text-slate-500">No encontramos a nadie llamado "{searchTerm}"</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  )
}