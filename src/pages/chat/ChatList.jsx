import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { MessageCircle, Plus, Search, Users, Loader2, ArrowLeft, X } from 'lucide-react'

// 1. IMPORTAMOS EL CEREBRO DE NOTIFICACIONES
import { sendNotification } from '../../lib/notifications'

export default function ChatList() {
  const navigate = useNavigate()
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  
  // Modales
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [showUserModal, setShowUserModal] = useState(false)
  
  // Forms
  const [newGroupName, setNewGroupName] = useState('')
  const [searchTerm, setSearchTerm] = useState('') // Búsqueda Global (Modal)
  const [localFilter, setLocalFilter] = useState('') // Búsqueda Local (Lista)
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session)
        if(session) fetchRooms(session.user.id)
    })
    
    // Suscripción para actualizar lista Y NOTIFICAR si llega mensaje nuevo
    const channel = supabase.channel('room_list_updates')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_rooms' }, (payload) => {
        
        // A. Actualizamos la lista visualmente
        if(session) fetchRooms(session.user.id)

        // B. LÓGICA DE NOTIFICACIÓN INTELIGENTE 🔔
        const newRoomData = payload.new;
        
        // Si hay un mensaje nuevo (y no es solo un cambio de nombre de grupo)
        if (newRoomData.last_message) {
            sendNotification("💬 Nuevo Mensaje", newRoomData.last_message);
        }
    })
    .subscribe()

    return () => supabase.removeChannel(channel)
  }, [session])

  const fetchRooms = async (userId) => {
    // 1. Obtener IDs de mis salas
    const { data: myInvolvements } = await supabase
        .from('chat_participants')
        .select('room_id')
        .eq('user_id', userId)

    if (myInvolvements && myInvolvements.length > 0) {
        const roomIds = myInvolvements.map(r => r.room_id)
        
        // 2. Traer salas + nombres
        const { data: roomData } = await supabase
            .from('chat_rooms')
            .select('*, chat_participants(profiles(full_name, avatar_url, id))')
            .in('id', roomIds)
            .order('last_message_time', { ascending: false })
        
        // Procesar datos
        const formattedRooms = roomData.map(room => {
            if (room.is_group) {
                return { ...room, display_name: room.name, display_image: room.image_url }
            } else {
                // Es DM: Buscar al participante que NO soy yo
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
    setLoading(false)
  }

  // --- FILTRADO LOCAL (MEJORA UX) ---
  const visibleRooms = rooms.filter(room => 
    room.display_name.toLowerCase().includes(localFilter.toLowerCase())
  )

  // --- CREAR GRUPO (USANDO RPC) ---
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
        fetchRooms(session.user.id)
        navigate(`/chat/${roomId}`)

    } catch (error) {
        alert("Error: " + error.message)
    }
  }

  // --- BUSCAR USUARIOS (GLOBAL) ---
  const handleSearchUsers = async (term) => {
    setSearchTerm(term)
    if(term.length < 3) return setSearchResults([])
    
    setSearching(true)
    const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .ilike('full_name', `%${term}%`)
        .limit(5)
    
    // Filtrar para no mostrarme a mí mismo
    const filtered = data?.filter(u => u.id !== session.user.id) || []
    setSearchResults(filtered)
    setSearching(false)
  }

  // --- INICIAR DM (USANDO RPC) ---
  const startDM = async (otherUserId) => {
      try {
          const { data: roomId, error } = await supabase.rpc('create_dm_transaction', {
              p_my_id: session.user.id,
              p_other_id: otherUserId
          })

          if (error) throw error

          setShowUserModal(false)
          fetchRooms(session.user.id)
          navigate(`/chat/${roomId}`)
          
      } catch (error) {
          alert("Error iniciando chat: " + error.message)
      }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 transition-colors">
      {/* HEADER */}
      <div className="bg-white dark:bg-slate-900 sticky top-0 z-10 p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
             <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"><ArrowLeft size={20} className="dark:text-white"/></button>
             <h1 className="text-xl font-black text-slate-800 dark:text-white">Chats</h1>
        </div>
        
        {/* BOTONES ACCIÓN */}
        <div className="flex gap-2">
            <button onClick={() => setShowGroupModal(true)} className="p-2 bg-indigo-600 text-white rounded-full shadow-lg active:scale-95 transition">
                <Plus size={20}/>
            </button>
        </div>
      </div>

      {/* BARRA DE BÚSQUEDA LOCAL (NUEVO) */}
      <div className="px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-50 dark:border-slate-800">
        <div className="relative bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center px-3 py-2 transition-colors focus-within:ring-2 focus-within:ring-indigo-500/20">
            <Search size={18} className="text-slate-400 mr-2"/>
            <input 
                className="bg-transparent outline-none w-full text-sm dark:text-white font-medium placeholder:text-slate-400"
                placeholder="Buscar en tus chats..."
                value={localFilter}
                onChange={(e) => setLocalFilter(e.target.value)}
            />
            {localFilter && (
                <button onClick={() => setLocalFilter('')}>
                    <X size={16} className="text-slate-400"/>
                </button>
            )}
        </div>
      </div>

      {/* LISTA DE CHATS */}
      <div className="p-2 space-y-2">
        {loading ? (
            <div className="text-center py-10"><Loader2 className="animate-spin mx-auto text-indigo-500"/></div>
        ) : rooms.length === 0 ? (
            <div className="text-center py-20 opacity-50">
                <MessageCircle size={48} className="mx-auto mb-2 text-slate-300"/>
                <p className="text-sm dark:text-slate-400">No tienes chats activos.</p>
                <button onClick={() => setShowUserModal(true)} className="mt-4 text-indigo-500 font-bold text-sm">Buscar a alguien</button>
            </div>
        ) : visibleRooms.length === 0 ? (
            // ESTADO VACÍO DE FILTRO
            <div className="text-center py-10">
                <p className="text-sm text-slate-400 mb-2">No encontré chats con "{localFilter}"</p>
                <button 
                    onClick={() => {
                        setSearchTerm(localFilter) // Pasamos lo que escribió al buscador global
                        setLocalFilter('') // Limpiamos filtro local
                        setShowUserModal(true) // Abrimos modal global
                    }} 
                    className="text-indigo-600 dark:text-indigo-400 font-bold text-sm bg-indigo-50 dark:bg-indigo-900/20 px-4 py-2 rounded-full"
                >
                    Buscar en Directorio Global
                </button>
            </div>
        ) : (
            visibleRooms.map(room => (
                <div 
                    key={room.id} 
                    onClick={() => navigate(`/chat/${room.id}`)}
                    className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 active:scale-[0.98] transition cursor-pointer hover:shadow-sm"
                >
                    <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-lg overflow-hidden shrink-0">
                        {room.display_image ? <img src={room.display_image} className="w-full h-full object-cover"/> : (room.display_name?.charAt(0) || '#')}
                    </div>
                    <div className="flex-1 overflow-hidden min-w-0">
                        <div className="flex justify-between items-center mb-0.5">
                            <h3 className="font-bold text-slate-800 dark:text-white truncate text-sm">{room.display_name}</h3>
                            <span className="text-[10px] text-slate-400 shrink-0 ml-2 font-medium">
                                {new Date(room.last_message_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate font-medium">
                            {room.last_message ? room.last_message : <span className="italic opacity-50">Borrador...</span>}
                        </p>
                    </div>
                </div>
            ))
        )}
      </div>

      {/* MODAL 1: CREAR GRUPO */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 relative">
                <button onClick={() => setShowGroupModal(false)} className="absolute top-4 right-4 text-slate-400"><X size={20}/></button>
                <h3 className="font-black text-lg mb-4 dark:text-white flex items-center gap-2"><Users className="text-indigo-500"/> Nuevo Grupo</h3>
                <input 
                    className="w-full p-3 bg-slate-100 dark:bg-slate-800 rounded-xl mb-4 outline-none font-bold dark:text-white border border-transparent focus:border-indigo-500 transition"
                    placeholder="Nombre del grupo..."
                    value={newGroupName}
                    onChange={e => setNewGroupName(e.target.value)}
                />
                <button onClick={createGroup} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold uppercase tracking-widest shadow-lg active:scale-95 transition">Crear Grupo</button>
            </div>
        </div>
      )}

      {/* MODAL 2: BUSCAR PERSONAS (NUEVO CHAT) */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start pt-20 justify-center p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 relative shadow-2xl">
                <button onClick={() => setShowUserModal(false)} className="absolute top-4 right-4 text-slate-400"><X size={20}/></button>
                <h3 className="font-black text-lg mb-4 dark:text-white flex items-center gap-2"><Search className="text-indigo-500"/> Iniciar Chat</h3>
                
                <input 
                    className="w-full p-3 bg-slate-100 dark:bg-slate-800 rounded-xl mb-4 outline-none font-bold dark:text-white"
                    placeholder="Buscar en directorio global..."
                    autoFocus
                    value={searchTerm}
                    onChange={e => handleSearchUsers(e.target.value)}
                />

                <div className="max-h-60 overflow-y-auto space-y-2">
                    {searching && <p className="text-center text-xs text-slate-400">Buscando...</p>}
                    
                    {searchResults.map(user => (
                        <div key={user.id} onClick={() => startDM(user.id)} className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition">
                            <img src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.full_name}&background=random`} className="w-10 h-10 rounded-full"/>
                            <div>
                                <p className="font-bold text-sm dark:text-white">{user.full_name}</p>
                                <p className="text-[10px] text-indigo-500 font-bold">Enviar mensaje</p>
                            </div>
                        </div>
                    ))}
                    
                    {searchTerm.length > 2 && searchResults.length === 0 && !searching && (
                        <p className="text-center text-xs text-slate-400">No se encontraron usuarios.</p>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  )
}