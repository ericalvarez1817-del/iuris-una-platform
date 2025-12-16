import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { MessageCircle, Plus, Search, Users, Loader2, ArrowLeft } from 'lucide-react'

export default function ChatList() {
  const navigate = useNavigate()
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')

  useEffect(() => {
    fetchRooms()
    
    // Suscripción para actualizar "último mensaje" en tiempo real
    const channel = supabase.channel('room_updates')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_rooms' }, () => {
        fetchRooms()
    })
    .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  const fetchRooms = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if(!user) return

    // 1. Obtener IDs de mis salas
    const { data: myInvolvements } = await supabase
        .from('chat_participants')
        .select('room_id')
        .eq('user_id', user.id)

    if (myInvolvements && myInvolvements.length > 0) {
        const roomIds = myInvolvements.map(r => r.room_id)
        
        // 2. Traer detalles de las salas
        const { data: roomData } = await supabase
            .from('chat_rooms')
            .select('*')
            .in('id', roomIds)
            .order('last_message_time', { ascending: false })
        
        setRooms(roomData || [])
    }
    setLoading(false)
  }

  const createGroup = async () => {
    if (!newGroupName.trim()) return
    const { data: { user } } = await supabase.auth.getUser()

    // 1. Crear Sala
    const { data: room, error } = await supabase.from('chat_rooms')
        .insert({ name: newGroupName, is_group: true, last_message: 'Grupo creado' })
        .select()
        .single()
    
    if (error) return alert(error.message)

    // 2. Añadirme como participante
    await supabase.from('chat_participants').insert({
        user_id: user.id,
        room_id: room.id
    })

    setShowModal(false)
    setNewGroupName('')
    fetchRooms()
    navigate(`/chat/${room.id}`) // Ir al chat
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      {/* HEADER */}
      <div className="bg-white dark:bg-slate-900 sticky top-0 z-10 p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
             <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><ArrowLeft size={20} className="dark:text-white"/></button>
             <h1 className="text-xl font-black text-slate-800 dark:text-white">Chats</h1>
        </div>
        <button onClick={() => setShowModal(true)} className="p-2 bg-indigo-600 text-white rounded-full shadow-lg active:scale-95 transition">
            <Plus size={20}/>
        </button>
      </div>

      {/* LISTA */}
      <div className="p-2">
        {loading ? (
            <div className="text-center py-10"><Loader2 className="animate-spin mx-auto text-indigo-500"/></div>
        ) : rooms.length === 0 ? (
            <div className="text-center py-20 opacity-50">
                <MessageCircle size={48} className="mx-auto mb-2 text-slate-300"/>
                <p className="text-sm">No tienes chats activos.</p>
                <button onClick={() => setShowModal(true)} className="mt-4 text-indigo-500 font-bold text-sm">Crear un Grupo</button>
            </div>
        ) : (
            rooms.map(room => (
                <div 
                    key={room.id} 
                    onClick={() => navigate(`/chat/${room.id}`)}
                    className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl mb-2 border border-slate-100 dark:border-slate-800 active:scale-[0.98] transition cursor-pointer"
                >
                    <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-lg">
                        {room.image_url ? <img src={room.image_url} className="w-full h-full rounded-full object-cover"/> : room.name?.charAt(0) || '#'}
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 dark:text-white truncate">{room.name || 'Chat'}</h3>
                            <span className="text-[10px] text-slate-400">{new Date(room.last_message_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                        </div>
                        <p className="text-xs text-slate-500 truncate">{room.last_message}</p>
                    </div>
                </div>
            ))
        )}
      </div>

      {/* MODAL CREAR GRUPO */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6">
                <h3 className="font-black text-lg mb-4 dark:text-white">Nuevo Grupo</h3>
                <input 
                    className="w-full p-3 bg-slate-100 dark:bg-slate-800 rounded-xl mb-4 outline-none font-bold dark:text-white"
                    placeholder="Nombre del grupo..."
                    value={newGroupName}
                    onChange={e => setNewGroupName(e.target.value)}
                />
                <div className="flex gap-2">
                    <button onClick={() => setShowModal(false)} className="flex-1 py-3 text-slate-500 font-bold">Cancelar</button>
                    <button onClick={createGroup} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold">Crear</button>
                </div>
            </div>
        </div>
      )}
    </div>
  )
}