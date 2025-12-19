import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { 
  Newspaper, Calendar, ChevronRight, Search, 
  Building2, Scale, PartyPopper, X, Plus, 
  Loader2, Image as ImageIcon, BadgeCheck, User, Trash2
} from 'lucide-react'

// 1. IMPORTAMOS EL NOTIFICADOR
import { sendNotification } from '../../lib/notifications'

// TU ID DE ADMIN
const ADMIN_ID = '8ce7cf5d-700f-419e-a180-c5c1af8f627c'

const formatDate = (dateString) => {
  const options = { day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit' }
  return new Date(dateString).toLocaleDateString('es-PY', options)
}

export default function NewsFeed() {
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('TODAS')
  const [selectedNews, setSelectedNews] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [session, setSession] = useState(null)

  // Formulario
  const [form, setForm] = useState({ title: '', content: '', category: 'UNA', image: null })
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    // 1. Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session)
    })
    
    // 2. Cargar noticias iniciales
    fetchNews()

    // 3. SUSCRIPCIÓN EN TIEMPO REAL (El Oído) 👂
    const channel = supabase.channel('news_updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'news' }, (payload) => {
          
          // A. Refrescamos la lista visualmente
          fetchNews()

          // B. NOTIFICACIÓN (Solo si no fui yo el que publicó)
          const newArticle = payload.new
          
          // Verificamos session?.user?.id para no notificarnos a nosotros mismos
          if (session && newArticle.author_id !== session.user.id) {
              sendNotification("📰 IURIS NEWS", newArticle.title)
          } else if (!session) {
              // Si por alguna razón la sesión no cargó aún, notificamos igual por seguridad
              sendNotification("📰 IURIS NEWS", newArticle.title)
          }
      })
      .subscribe()

    // Limpieza al salir
    return () => supabase.removeChannel(channel)

  }, [session]) // Dependemos de session para saber si soy yo el autor

  const fetchNews = async () => {
    // Nota: Quitamos setLoading(true) global para que no parpadee al recibir actualizaciones en vivo
    const { data, error } = await supabase
      .from('news')
      .select('*, profiles(full_name, is_reporter, avatar_url)')
      .order('created_at', { ascending: false })
    
    if (error) console.error(error)
    else setNews(data || [])
    
    setLoading(false) // Solo quitamos el loading inicial
  }

  const handlePublish = async () => {
      if(!form.title || !form.content) return alert("Faltan datos")
      setUploading(true)
      try {
          let imgUrl = null
          if (form.image) {
              const fileName = `news_${Date.now()}`
              await supabase.storage.from('news-images').upload(fileName, form.image)
              const { data } = supabase.storage.from('news-images').getPublicUrl(fileName)
              imgUrl = data.publicUrl
          }

          const { error } = await supabase.from('news').insert({
              title: form.title,
              content: form.content,
              category: form.category,
              image_url: imgUrl,
              author_id: session.user.id
          })

          if (error) throw error
          
          alert("¡Noticia publicada!")
          setShowModal(false)
          setForm({ title: '', content: '', category: 'UNA', image: null })
          // fetchNews se llama automáticamente por el listener en tiempo real

      } catch (e) {
          alert("Error: " + e.message)
      }
      setUploading(false)
  }

  const handleDelete = async (e, newsId) => {
      e.stopPropagation()
      if(!confirm("¿Borrar esta noticia permanentemente?")) return

      try {
          const { error } = await supabase.from('news').delete().eq('id', newsId)
          if(error) throw error
          fetchNews()
      } catch (error) {
          alert("Error al borrar: " + error.message)
      }
  }

  const filteredNews = filter === 'TODAS' ? news : news.filter(n => n.category === filter)

  const getCategoryColor = (cat) => {
    if (cat === 'UNA') return 'bg-blue-100 text-blue-700'
    if (cat === 'JURIDICO') return 'bg-slate-100 text-slate-700'
    return 'bg-purple-100 text-purple-700'
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 font-sans transition-colors">
      
      {/* HEADER STICKY */}
      <div className="bg-white dark:bg-slate-900 sticky top-0 z-20 px-4 py-4 shadow-sm border-b border-slate-100 dark:border-slate-800">
        <div className="flex justify-between items-center mb-4">
            <div>
                <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Newspaper className="text-indigo-600"/> IURIS NEWS
                </h1>
                <p className="text-[10px] text-slate-500 font-medium">La voz de los estudiantes</p>
            </div>
            <button onClick={() => setShowModal(true)} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 p-2 rounded-full shadow-lg active:scale-95 transition">
                <Plus size={20} />
            </button>
        </div>
        
        {/* FILTROS */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {['TODAS', 'UNA', 'JURIDICO', 'SOCIALES'].map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border whitespace-nowrap transition ${
                filter === cat 
                  ? 'bg-indigo-600 text-white border-indigo-600' 
                  : 'bg-white text-slate-500 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* FEED */}
      <div className="p-4 max-w-lg mx-auto space-y-5">
        {loading ? (
           <div className="text-center py-10"><Loader2 className="animate-spin mx-auto text-indigo-500"/></div>
        ) : filteredNews.length === 0 ? (
           <p className="text-center text-slate-400 text-xs py-10">No hay noticias aún. ¡Sé el primero!</p>
        ) : (
          filteredNews.map(item => {
            const canDelete = session?.user?.id === item.author_id || session?.user?.id === ADMIN_ID;

            return (
                <article 
                key={item.id} 
                onClick={() => setSelectedNews(item)}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer active:scale-[0.99] relative group"
                >
                {canDelete && (
                    <button 
                        onClick={(e) => handleDelete(e, item.id)}
                        className="absolute top-3 right-3 z-30 bg-white/90 dark:bg-slate-800/90 p-2 rounded-full text-red-500 shadow-sm opacity-0 group-hover:opacity-100 transition hover:scale-110"
                    >
                        <Trash2 size={16} />
                    </button>
                )}

                <div className="p-3 flex items-center gap-2 border-b border-slate-50 dark:border-slate-800">
                    <div className="w-8 h-8 rounded-full bg-slate-100 overflow-hidden">
                        <img src={item.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${item.profiles?.full_name}&background=random`} className="w-full h-full object-cover"/>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1">
                            {item.profiles?.full_name || 'Anónimo'}
                            {item.profiles?.is_reporter && (
                                <BadgeCheck size={14} className="text-blue-500 fill-blue-500 text-white" />
                            )}
                        </p>
                        <p className="text-[9px] text-slate-400">{formatDate(item.created_at)}</p>
                    </div>
                </div>

                {item.image_url && (
                    <div className="h-48 w-full overflow-hidden">
                    <img src={item.image_url} className="w-full h-full object-cover" loading="lazy"/>
                    </div>
                )}
                
                <div className="p-4">
                    <span className={`inline-block px-2 py-0.5 rounded-md text-[8px] font-black uppercase mb-2 ${getCategoryColor(item.category)}`}>
                        {item.category}
                    </span>
                    <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 leading-tight mb-2">
                    {item.title}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3">
                    {item.content}
                    </p>
                </div>
                </article>
            )
          })
        )}
      </div>

      {/* MODAL LECTURA (ESTILO ABC COLOR / PRENSA PROFESIONAL) */}
      {selectedNews && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full h-full sm:h-[90vh] sm:max-w-xl sm:rounded-2xl overflow-y-auto relative shadow-2xl flex flex-col">
            
            {/* Botón cerrar flotante */}
            <button 
                onClick={() => setSelectedNews(null)} 
                className="absolute top-4 right-4 z-50 p-2 bg-black/50 backdrop-blur-md text-white rounded-full hover:bg-black/70 transition"
            >
                <X size={24}/>
            </button>
            
            {/* Imagen Principal (Hero Image) */}
            {selectedNews.image_url && (
              <div className="w-full h-64 sm:h-72 shrink-0 relative">
                  <img src={selectedNews.image_url} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                  {/* Categoría sobre la imagen */}
                  <div className="absolute bottom-4 left-4">
                        <span className={`inline-block px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest text-white ${
                            selectedNews.category === 'UNA' ? 'bg-blue-600' : 
                            selectedNews.category === 'JURIDICO' ? 'bg-slate-600' : 'bg-purple-600'
                        }`}>
                            {selectedNews.category}
                        </span>
                  </div>
              </div>
            )}

            {/* Contenido del Artículo */}
            <div className={`p-6 sm:p-8 ${!selectedNews.image_url ? 'pt-16' : ''} flex-1`}>
               
               {/* Metadata Autor */}
               <div className="flex items-center gap-3 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <img src={selectedNews.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${selectedNews.profiles?.full_name}&background=random`} className="w-10 h-10 rounded-full object-cover"/>
                    <div>
                        <p className="text-sm font-bold dark:text-white flex items-center gap-1">
                            {selectedNews.profiles?.full_name}
                            {selectedNews.profiles?.is_reporter && <BadgeCheck size={16} className="text-blue-500 fill-blue-500 text-white" />}
                        </p>
                        <p className="text-xs text-slate-400">{formatDate(selectedNews.created_at)}</p>
                    </div>
               </div>

              {/* Título Principal */}
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-6 leading-tight tracking-tight">
                {selectedNews.title}
              </h1>

              {/* CUERPO DEL TEXTO (OPTIMIZADO PARA LECTURA MOVIL) */}
              <div className="text-base sm:text-lg leading-relaxed text-slate-800 dark:text-slate-300 font-serif whitespace-pre-line break-words text-justify hyphens-auto">
                {selectedNews.content}
              </div>
            </div>

            {/* Footer de lectura */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 text-center">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Fin del Artículo</p>
                <div className="flex justify-center mt-2">
                    <Newspaper size={16} className="text-slate-300"/>
                </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL CREAR NOTICIA */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl relative">
                <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-slate-400"><X size={20}/></button>
                <h2 className="font-black text-xl text-slate-900 dark:text-white mb-4">Publicar Noticia</h2>
                
                <div className="space-y-3">
                    <input className="input-modern" placeholder="Título impactante" onChange={e => setForm({...form, title: e.target.value})}/>
                    
                    <select className="input-modern" onChange={e => setForm({...form, category: e.target.value})}>
                        <option value="UNA">🏛️ Institucional UNA</option>
                        <option value="JURIDICO">⚖️ Jurídico</option>
                        <option value="SOCIALES">🎉 Sociales / Eventos</option>
                    </select>

                    <textarea className="input-modern h-32" placeholder="¿Qué está pasando?" onChange={e => setForm({...form, content: e.target.value})}/>
                    
                    <label className="block w-full p-3 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <ImageIcon className="mx-auto text-slate-400 mb-1" size={20}/>
                        <span className="text-[10px] text-slate-500">{form.image ? "Imagen Cargada" : "Añadir Foto (Opcional)"}</span>
                        <input type="file" className="hidden" onChange={e => setForm({...form, image: e.target.files[0]})}/>
                    </label>

                    <button onClick={handlePublish} disabled={uploading} className="w-full py-3 bg-indigo-600 text-white font-black rounded-xl uppercase tracking-widest shadow-lg active:scale-95 transition">
                        {uploading ? <Loader2 className="animate-spin mx-auto"/> : 'PUBLICAR AHORA'}
                    </button>
                </div>
            </div>
        </div>
      )}

      <style>{`
        .input-modern { width: 100%; padding: 0.75rem; border-radius: 0.75rem; outline: none; font-size: 0.875rem; font-weight: 600; border: 1px solid #e2e8f0; transition: all 0.2s; }
        .bg-slate-50 .input-modern { background-color: #f8fafc; color: #0f172a; }
        .dark .input-modern { background-color: #1e293b; color: white; border-color: #334155; }
        .input-modern:focus { border-color: #6366f1; }
      `}</style>
    </div>
  )
}