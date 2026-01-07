import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { 
  Newspaper, Calendar, ChevronRight, Search, 
  Building2, Scale, PartyPopper, X, Plus, 
  Loader2, Image as ImageIcon, BadgeCheck, User, Trash2,
  Clock, Share2, MoreHorizontal
} from 'lucide-react'

// 1. IMPORTAMOS EL NOTIFICADOR
import { sendNotification } from '../../lib/notifications'

// TU ID DE ADMIN
const ADMIN_ID = '8ce7cf5d-700f-419e-a180-c5c1af8f627c'

const formatDate = (dateString) => {
  const options = { day: 'numeric', month: 'long', hour: '2-digit', minute:'2-digit' }
  return new Date(dateString).toLocaleDateString('es-PY', options)
}

// COMPONENTE SKELETON PARA CARGA
const NewsSkeleton = () => (
    <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-5 border border-slate-100 dark:border-slate-800 space-y-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
        <div className="space-y-2">
          <div className="w-24 h-3 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          <div className="w-16 h-2 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        </div>
      </div>
      <div className="w-full h-48 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
      <div className="space-y-3 pt-2">
        <div className="w-full h-6 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="w-3/4 h-4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="w-1/2 h-4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
      </div>
    </div>
)

export default function NewsFeed() {
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('TODAS')
  const [selectedNews, setSelectedNews] = useState(null)
  const [showModal, setShowModal] = useState(false)
  
  const [session, setSession] = useState(null)
  // Usamos useRef para acceder a la sesión actual dentro del listener sin causar re-renders
  const sessionRef = useRef(null) 

  // Formulario
  const [form, setForm] = useState({ title: '', content: '', category: 'UNA', image: null })
  const [uploading, setUploading] = useState(false)
  
  // Estado para preview de imagen al crear
  const [previewImage, setPreviewImage] = useState(null)

  // 1. EFECTO DE INICIALIZACIÓN (Solo carga al montar)
  useEffect(() => {
    // A. Obtener sesión
    supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session)
        sessionRef.current = session
    })
    
    // B. Escuchar cambios de sesión (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session)
        sessionRef.current = session
    })

    // C. Cargar noticias iniciales
    fetchNews()

    // D. SUSCRIPCIÓN EN TIEMPO REAL (El Oído) 👂
    const channel = supabase.channel('news_updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'news' }, (payload) => {
          
          // Refrescamos la lista visualmente
          fetchNews()

          // NOTIFICACIÓN (Usando la referencia para no causar bucles)
          const newArticle = payload.new
          const currentUserId = sessionRef.current?.user?.id
          
          // Solo notificamos si el autor NO soy yo
          if (currentUserId && newArticle.author_id !== currentUserId) {
              sendNotification("📰 IURIS NEWS", newArticle.title)
          } else if (!currentUserId) {
              sendNotification("📰 IURIS NEWS", newArticle.title)
          }
      })
      .subscribe()

    // Limpieza al salir
    return () => {
        supabase.removeChannel(channel)
        subscription.unsubscribe()
    }

  }, []) 

  const fetchNews = async () => {
    const { data, error } = await supabase
      .from('news')
      .select('*, profiles(full_name, is_reporter, avatar_url)')
      .order('created_at', { ascending: false })
    
    if (error) console.error("Error cargando noticias:", error)
    else setNews(data || [])
    
    setLoading(false)
  }

  const handleImageSelect = (e) => {
      const file = e.target.files[0]
      if (file) {
          setForm({...form, image: file})
          setPreviewImage(URL.createObjectURL(file))
      }
  }

  const handlePublish = async () => {
      if(!form.title || !form.content) return alert("Faltan datos por completar")
      if(!session) return alert("No hay sesión activa")

      setUploading(true)
      try {
          let imgUrl = null
          
          // Subida de imagen corregida con extensión
          if (form.image) {
              const fileExt = form.image.name.split('.').pop()
              const fileName = `news_${Date.now()}.${fileExt}` // Nombre seguro con extensión

              const { error: uploadError } = await supabase.storage
                .from('news-images')
                .upload(fileName, form.image)
              
              if (uploadError) throw uploadError

              const { data } = supabase.storage.from('news-images').getPublicUrl(fileName)
              imgUrl = data.publicUrl
          }

          // Inserción en base de datos
          const { error } = await supabase.from('news').insert({
              title: form.title,
              content: form.content,
              category: form.category,
              image_url: imgUrl,
              author_id: session.user.id
          })

          if (error) throw error
          
          // alert("¡Noticia publicada correctamente!") // Alert removido para mejor UX
          setShowModal(false)
          setForm({ title: '', content: '', category: 'UNA', image: null })
          setPreviewImage(null)
          fetchNews() // Recarga inmediata

      } catch (e) {
          console.error("Error publicando:", e)
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

  // Función auxiliar para iconos de categoría
  const getCategoryIcon = (cat) => {
      if (cat === 'UNA') return <Building2 size={12} />
      if (cat === 'JURIDICO') return <Scale size={12} />
      return <PartyPopper size={12} />
  }

  const getCategoryStyles = (cat) => {
    if (cat === 'UNA') return 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'
    if (cat === 'JURIDICO') return 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800'
    return 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800'
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 font-sans transition-colors">
      
      {/* HEADER STICKY CON BLUR */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3">
            <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2.5">
                    <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-indigo-500/20 shadow-lg">
                        <Newspaper size={20}/> 
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 dark:text-white leading-none tracking-tight">IURIS NEWS</h1>
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">La voz estudiantil</p>
                    </div>
                </div>
                <button 
                    onClick={() => setShowModal(true)} 
                    className="group bg-slate-900 dark:bg-white text-white dark:text-slate-900 p-2.5 rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                >
                    <Plus size={18} className="group-hover:rotate-90 transition-transform"/>
                    <span className="hidden sm:inline text-xs font-bold mr-1">Publicar</span>
                </button>
            </div>
            
            {/* FILTROS MEJORADOS */}
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar mask-gradient-right">
              {['TODAS', 'UNA', 'JURIDICO', 'SOCIALES'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={`px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border whitespace-nowrap transition-all duration-300 ${
                    filter === cat 
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20 scale-105' 
                      : 'bg-white text-slate-500 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
        </div>
      </div>

      {/* FEED PRINCIPAL */}
      <div className="p-4 max-w-3xl mx-auto space-y-6 mt-4">
        {loading ? (
           // SKELETON LOADING STATE
           <div className="space-y-6">
               <NewsSkeleton />
               <NewsSkeleton />
               <NewsSkeleton />
           </div>
        ) : filteredNews.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                <Newspaper size={48} className="text-slate-300 dark:text-slate-700 mb-4"/>
                <p className="text-slate-500 dark:text-slate-400 font-medium">No hay noticias en esta categoría.</p>
                <button onClick={() => setFilter('TODAS')} className="mt-2 text-indigo-500 text-sm font-bold hover:underline">Ver todas</button>
           </div>
        ) : (
          // GRID DE NOTICIAS
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredNews.map((item, index) => {
                const canDelete = session?.user?.id === item.author_id || session?.user?.id === ADMIN_ID;
                const isLarge = index === 0 && filter === 'TODAS'; // Primera noticia destacada

                return (
                    <article 
                    key={item.id} 
                    onClick={() => setSelectedNews(item)}
                    className={`bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl hover:border-indigo-100 dark:hover:border-indigo-900/30 transition-all duration-300 cursor-pointer group relative flex flex-col ${isLarge ? 'md:col-span-2' : ''}`}
                    >
                        {/* AUTHOR HEADER */}
                        <div className="p-4 flex items-center gap-3 relative z-10">
                            <div className="w-10 h-10 rounded-full p-[2px] bg-gradient-to-tr from-indigo-500 to-purple-500">
                                <img src={item.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${item.profiles?.full_name}&background=random`} className="w-full h-full rounded-full object-cover border-2 border-white dark:border-slate-900"/>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5 truncate">
                                    {item.profiles?.full_name || 'Anónimo'}
                                    {item.profiles?.is_reporter && (
                                        <BadgeCheck size={14} className="text-blue-500 fill-blue-500 text-white shrink-0" />
                                    )}
                                </p>
                                <div className="flex items-center gap-2 text-[10px] font-medium text-slate-400">
                                    <span>{formatDate(item.created_at)}</span>
                                    {/* <span>•</span>
                                    <span className="flex items-center gap-1"><Clock size={10}/> 2 min</span> */}
                                </div>
                            </div>
                            
                            {/* CATEGORY BADGE */}
                            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border flex items-center gap-1.5 ${getCategoryStyles(item.category)}`}>
                                {getCategoryIcon(item.category)}
                                {item.category}
                            </span>
                        </div>

                        {/* IMAGE SECTION */}
                        {item.image_url && (
                            <div className={`w-full overflow-hidden relative bg-slate-100 dark:bg-slate-800 ${isLarge ? 'h-64 sm:h-96' : 'h-48'}`}>
                                <img 
                                    src={item.image_url} 
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                                    loading="lazy"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </div>
                        )}
                    
                        {/* CONTENT SECTION */}
                        <div className="p-5 flex-1 flex flex-col">
                            <h2 className={`font-black text-slate-800 dark:text-slate-100 leading-tight mb-3 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors ${isLarge ? 'text-2xl md:text-3xl' : 'text-lg'}`}>
                                {item.title}
                            </h2>
                            <p className={`text-slate-500 dark:text-slate-400 line-clamp-3 font-serif leading-relaxed ${isLarge ? 'text-base' : 'text-sm'}`}>
                                {item.content}
                            </p>
                            
                            <div className="mt-auto pt-4 flex items-center justify-between">
                                <div className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-[-10px] group-hover:translate-x-0 duration-300">
                                    Leer completo <ChevronRight size={14} strokeWidth={3}/>
                                </div>
                                
                                {canDelete && (
                                    <button 
                                        onClick={(e) => handleDelete(e, item.id)}
                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors z-20"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </article>
                )
              })}
          </div>
        )}
      </div>

      {/* MODAL LECTURA INMERSIVA */}
      {selectedNews && (
        <div className="fixed inset-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl z-50 overflow-y-auto animate-in fade-in duration-300">
            <div className="max-w-2xl mx-auto min-h-screen bg-white dark:bg-slate-900 shadow-2xl relative flex flex-col md:border-x border-slate-100 dark:border-slate-800">
                
                {/* CLOSE BUTTON */}
                <button 
                    onClick={() => setSelectedNews(null)} 
                    className="fixed top-4 right-4 md:right-[calc(50%-300px)] z-[60] p-2.5 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur text-slate-600 dark:text-slate-300 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition shadow-lg"
                >
                    <X size={24}/>
                </button>

                {/* HERO IMAGE */}
                {selectedNews.image_url && (
                    <div className="w-full h-[40vh] md:h-[50vh] relative shrink-0">
                        <img src={selectedNews.image_url} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-slate-900 via-transparent to-transparent"></div>
                    </div>
                )}

                {/* CONTENT */}
                <div className={`px-6 md:px-10 pb-20 ${!selectedNews.image_url ? 'pt-24' : '-mt-20 relative z-10'}`}>
                    
                    {/* META INFO */}
                    <div className="flex flex-col gap-4 mb-6">
                        <span className={`self-start px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${getCategoryStyles(selectedNews.category)}`}>
                            {selectedNews.category}
                        </span>
                        
                        <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white leading-[1.1] tracking-tight">
                            {selectedNews.title}
                        </h1>

                        <div className="flex items-center justify-between border-y border-slate-100 dark:border-slate-800 py-4 my-2">
                            <div className="flex items-center gap-3">
                                <img src={selectedNews.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${selectedNews.profiles?.full_name}&background=random`} className="w-10 h-10 rounded-full object-cover"/>
                                <div>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1">
                                        {selectedNews.profiles?.full_name}
                                        {selectedNews.profiles?.is_reporter && <BadgeCheck size={16} className="text-blue-500 fill-blue-500 text-white" />}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(selectedNews.created_at)}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full transition"><Share2 size={20}/></button>
                            </div>
                        </div>
                    </div>

                    {/* BODY TEXT */}
                    <div className="prose prose-lg dark:prose-invert prose-slate max-w-none">
                        <p className="text-lg leading-relaxed text-slate-700 dark:text-slate-300 font-serif whitespace-pre-line text-justify hyphens-auto first-letter:text-5xl first-letter:font-bold first-letter:text-slate-900 dark:first-letter:text-white first-letter:mr-3 first-letter:float-left">
                            {selectedNews.content}
                        </p>
                    </div>

                    {/* FOOTER */}
                    <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 text-center">
                        <div className="inline-flex items-center justify-center p-3 bg-slate-50 dark:bg-slate-800 rounded-full mb-4">
                            <Newspaper size={20} className="text-slate-400"/>
                        </div>
                        <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">IURIS UNA News</p>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* MODAL CREAR NOTICIA */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] p-6 shadow-2xl relative border border-slate-200 dark:border-slate-800">
                <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition"><X size={20}/></button>
                
                <h2 className="font-black text-2xl text-slate-900 dark:text-white mb-1">Publicar Noticia</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Comparte información relevante con la comunidad.</p>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Título</label>
                        <input 
                            className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none font-bold text-slate-900 dark:text-white border border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all placeholder:text-slate-400" 
                            placeholder="Ej: Nuevas fechas de exámenes..." 
                            value={form.title}
                            onChange={e => setForm({...form, title: e.target.value})}
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Categoría</label>
                            <select 
                                className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none font-semibold text-slate-900 dark:text-white border border-transparent focus:border-indigo-500 cursor-pointer appearance-none" 
                                value={form.category} 
                                onChange={e => setForm({...form, category: e.target.value})}
                            >
                                <option value="UNA">🏛️ UNA</option>
                                <option value="JURIDICO">⚖️ Jurídico</option>
                                <option value="SOCIALES">🎉 Sociales</option>
                            </select>
                        </div>
                        <div>
                             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Imagen</label>
                             <label className="flex items-center justify-center w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition h-[58px]">
                                <span className="text-xs font-bold text-slate-500 flex items-center gap-2 truncate">
                                    <ImageIcon size={16}/> {form.image ? 'Cambiar' : 'Subir'}
                                </span>
                                <input type="file" className="hidden" accept="image/*" onChange={handleImageSelect}/>
                            </label>
                        </div>
                    </div>

                    {previewImage && (
                        <div className="relative w-full h-32 rounded-xl overflow-hidden group">
                            <img src={previewImage} className="w-full h-full object-cover"/>
                            <button 
                                onClick={() => {setForm({...form, image: null}); setPreviewImage(null)}}
                                className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 size={14}/>
                            </button>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Contenido</label>
                        <textarea 
                            className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none text-sm text-slate-800 dark:text-slate-200 border border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all h-32 resize-none leading-relaxed placeholder:text-slate-400" 
                            placeholder="Escribe los detalles aquí..." 
                            value={form.content}
                            onChange={e => setForm({...form, content: e.target.value})}
                        />
                    </div>
                    
                    <button 
                        onClick={handlePublish} 
                        disabled={uploading} 
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl uppercase tracking-widest shadow-lg shadow-indigo-500/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {uploading ? <Loader2 className="animate-spin" size={20}/> : (
                            <>Publicar Noticia <ChevronRight size={18} /></>
                        )}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* ESTILOS GLOBALES PARA SCROLLBAR OCULTO Y TEXTO JUSTIFICADO */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .mask-gradient-right { -webkit-mask-image: linear-gradient(to right, black 85%, transparent 100%); }
      `}</style>
    </div>
  )
}