import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { 
  Newspaper, Calendar, ChevronRight, Search, 
  Building2, Scale, PartyPopper, X, Plus, 
  Loader2, Image as ImageIcon, BadgeCheck, User, Trash2,
  Clock, Share2, MoreHorizontal, MessageCircle
} from 'lucide-react'

// 1. IMPORTAMOS EL NOTIFICADOR
import { sendNotification } from '../../lib/notifications'

// TU ID DE ADMIN
const ADMIN_ID = '8ce7cf5d-700f-419e-a180-c5c1af8f627c'

const formatDate = (dateString) => {
  const options = { day: 'numeric', month: 'long' }
  return new Date(dateString).toLocaleDateString('es-PY', options)
}

// --- COMPONENTE SKELETON MEJORADO ---
const NewsSkeleton = ({ isLarge }) => (
    <div className={`bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm ${isLarge ? 'md:col-span-2' : ''}`}>
      <div className={`w-full bg-slate-200 dark:bg-slate-800 animate-pulse ${isLarge ? 'h-64 sm:h-80' : 'h-48'}`} />
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
            <div className="w-24 h-3 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        </div>
        <div className="space-y-2">
            <div className="w-full h-6 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            <div className="w-3/4 h-6 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        </div>
        <div className="w-full h-16 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
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
  const sessionRef = useRef(null) 

  // Formulario
  const [form, setForm] = useState({ title: '', content: '', category: 'UNA', image: null })
  const [uploading, setUploading] = useState(false)
  const [previewImage, setPreviewImage] = useState(null)

  // 1. EFECTO DE INICIALIZACIÓN
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session)
        sessionRef.current = session
    })
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session)
        sessionRef.current = session
    })

    fetchNews()

    const channel = supabase.channel('news_updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'news' }, (payload) => {
          fetchNews()
          const newArticle = payload.new
          const currentUserId = sessionRef.current?.user?.id
          
          if (currentUserId && newArticle.author_id !== currentUserId) {
              sendNotification("📰 IURIS NEWS", newArticle.title)
          } else if (!currentUserId) {
              sendNotification("📰 IURIS NEWS", newArticle.title)
          }
      })
      .subscribe()

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
          if (form.image) {
              const fileExt = form.image.name.split('.').pop()
              const fileName = `news_${Date.now()}.${fileExt}` 
              const { error: uploadError } = await supabase.storage.from('news-images').upload(fileName, form.image)
              if (uploadError) throw uploadError
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
          
          setShowModal(false)
          setForm({ title: '', content: '', category: 'UNA', image: null })
          setPreviewImage(null)
          fetchNews() 

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

  // --- UI HELPERS ---
  const getCategoryIcon = (cat) => {
      if (cat === 'UNA') return <Building2 size={14} />
      if (cat === 'JURIDICO') return <Scale size={14} />
      return <PartyPopper size={14} />
  }

  const getCategoryStyles = (cat) => {
    if (cat === 'UNA') return 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20'
    if (cat === 'JURIDICO') return 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20'
    return 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/20'
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-32 font-sans transition-colors">
      
      {/* HEADER STICKY GLASSMORPHISM */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 shadow-sm transition-all duration-300">
        <div className="max-w-5xl mx-auto px-4 py-3">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-500/20">
                        <Newspaper size={22}/> 
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 dark:text-white leading-none tracking-tight">IURIS NEWS</h1>
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">Actualidad UNA</p>
                    </div>
                </div>
                
                <button 
                    onClick={() => setShowModal(true)} 
                    className="group flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-xl shadow-xl shadow-slate-900/10 dark:shadow-slate-100/5 hover:scale-105 active:scale-95 transition-all"
                >
                    <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300"/>
                    <span className="text-xs font-bold">Publicar</span>
                </button>
            </div>
            
            {/* FILTROS TIPO CAPSULA */}
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar mask-gradient-right">
              {['TODAS', 'UNA', 'JURIDICO', 'SOCIALES'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={`px-4 py-1.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider border whitespace-nowrap transition-all duration-300 ${
                    filter === cat 
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/25 scale-105' 
                      : 'bg-white text-slate-500 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
        </div>
      </div>

      {/* FEED PRINCIPAL */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {loading ? (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <NewsSkeleton isLarge={true} />
               <NewsSkeleton />
               <NewsSkeleton />
           </div>
        ) : filteredNews.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-full mb-4">
                    <Newspaper size={48} className="text-slate-300 dark:text-slate-600"/>
                </div>
                <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">Sin noticias aquí</h3>
                <p className="text-slate-500 dark:text-slate-500 text-sm mb-4">Sé el primero en compartir algo interesante.</p>
                <button onClick={() => setFilter('TODAS')} className="text-indigo-600 dark:text-indigo-400 text-sm font-bold hover:underline">Ver todo</button>
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 auto-rows-fr">
              {filteredNews.map((item, index) => {
                const canDelete = session?.user?.id === item.author_id || session?.user?.id === ADMIN_ID;
                const isLarge = index === 0 && filter === 'TODAS'; // Primera noticia destacada

                return (
                    <article 
                        key={item.id} 
                        onClick={() => setSelectedNews(item)}
                        className={`group relative bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 dark:hover:shadow-indigo-900/10 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all duration-500 cursor-pointer flex flex-col ${isLarge ? 'md:col-span-2' : ''}`}
                    >
                        {/* IMAGEN DE FONDO O SUPERIOR */}
                        {item.image_url ? (
                            <div className={`relative overflow-hidden w-full bg-slate-100 dark:bg-slate-800 ${isLarge ? 'h-64 sm:h-96' : 'h-52'}`}>
                                <img 
                                    src={item.image_url} 
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 will-change-transform" 
                                    loading="lazy"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-500"></div>
                                
                                {/* Badge Categoría Flotante */}
                                <div className="absolute top-4 left-4">
                                    <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-lg flex items-center gap-1.5 ${
                                        item.category === 'UNA' ? 'bg-blue-500/90 text-white' : 
                                        item.category === 'JURIDICO' ? 'bg-amber-500/90 text-white' : 'bg-purple-500/90 text-white'
                                    }`}>
                                        {getCategoryIcon(item.category)}
                                        {item.category}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="absolute top-4 left-4 z-10">
                                <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border flex items-center gap-1.5 ${getCategoryStyles(item.category)}`}>
                                    {getCategoryIcon(item.category)}
                                    {item.category}
                                </span>
                            </div>
                        )}
                    
                        {/* CONTENIDO */}
                        <div className="p-6 flex-1 flex flex-col relative">
                            {/* Metadata Autor */}
                            <div className={`flex items-center gap-3 mb-3 ${item.image_url ? '' : 'mt-6'}`}>
                                <div className="w-8 h-8 rounded-full p-0.5 bg-gradient-to-tr from-indigo-500 to-purple-500">
                                    <img src={item.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${item.profiles?.full_name}&background=random`} className="w-full h-full rounded-full object-cover border border-white dark:border-slate-900"/>
                                </div>
                                <div className="flex flex-col">
                                    <p className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1">
                                        {item.profiles?.full_name || 'Anónimo'}
                                        {item.profiles?.is_reporter && (
                                            <BadgeCheck size={12} className="text-blue-500 fill-blue-500 text-white" />
                                        )}
                                    </p>
                                    <p className="text-[10px] text-slate-400 font-medium">{formatDate(item.created_at)}</p>
                                </div>
                            </div>

                            <h2 className={`font-black text-slate-900 dark:text-white leading-tight mb-3 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors ${isLarge ? 'text-2xl md:text-4xl' : 'text-xl'}`}>
                                {item.title}
                            </h2>
                            
                            <p className={`text-slate-500 dark:text-slate-400 font-serif leading-relaxed line-clamp-3 mb-4 ${isLarge ? 'text-lg' : 'text-sm'}`}>
                                {item.content}
                            </p>
                            
                            <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-800/50">
                                <div className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:underline decoration-2 underline-offset-4 transition-all">
                                    Leer artículo <ChevronRight size={14} className="stroke-[3]"/>
                                </div>
                                
                                <div className="flex gap-2">
                                    {canDelete && (
                                        <button 
                                            onClick={(e) => handleDelete(e, item.id)}
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                                            title="Eliminar noticia"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </article>
                )
              })}
          </div>
        )}
      </div>

      {/* MODAL LECTURA INMERSIVA (Estilo Apple News) */}
      {selectedNews && (
        <div className="fixed inset-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl z-[60] overflow-y-auto animate-in fade-in duration-300">
            {/* BARRA DE NAVEGACIÓN MODAL */}
            <div className="sticky top-0 z-50 flex justify-between items-center p-4 max-w-3xl mx-auto w-full bg-gradient-to-b from-white/90 to-transparent dark:from-slate-950/90 pointer-events-none">
                <div className="pointer-events-auto">
                    <button 
                        onClick={() => setSelectedNews(null)} 
                        className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-transform hover:scale-105 shadow-sm"
                    >
                        <X size={20}/>
                    </button>
                </div>
                <div className="pointer-events-auto flex gap-2">
                    <button className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition shadow-sm">
                        <Share2 size={20}/>
                    </button>
                </div>
            </div>

            <div className="max-w-3xl mx-auto pb-20 px-4 md:px-0">
                {/* HERO IMAGE */}
                {selectedNews.image_url && (
                    <div className="w-full h-[40vh] md:h-[60vh] rounded-[2rem] overflow-hidden shadow-2xl mb-8 mx-auto relative group">
                        <img src={selectedNews.image_url} className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-105" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                    </div>
                )}

                {/* CONTENIDO DEL ARTÍCULO */}
                <div className="px-4 md:px-8">
                    <div className="flex flex-col gap-6 mb-8">
                        <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${getCategoryStyles(selectedNews.category)}`}>
                                {selectedNews.category}
                            </span>
                            <span className="text-xs text-slate-400 font-medium">{formatDate(selectedNews.created_at)}</span>
                        </div>
                        
                        <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white leading-[1.1] tracking-tight">
                            {selectedNews.title}
                        </h1>

                        <div className="flex items-center gap-4 py-4 border-y border-slate-100 dark:border-slate-800">
                            <img src={selectedNews.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${selectedNews.profiles?.full_name}&background=random`} className="w-12 h-12 rounded-full object-cover shadow-sm"/>
                            <div>
                                <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1">
                                    Por {selectedNews.profiles?.full_name}
                                    {selectedNews.profiles?.is_reporter && <BadgeCheck size={16} className="text-blue-500 fill-blue-500 text-white" />}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Reportero IURIS</p>
                            </div>
                        </div>
                    </div>

                    <div className="prose prose-lg dark:prose-invert prose-slate max-w-none">
                        <p className="text-lg md:text-xl leading-relaxed text-slate-700 dark:text-slate-300 font-serif whitespace-pre-line text-justify hyphens-auto drop-cap first-letter:float-left first-letter:text-5xl first-letter:pr-3 first-letter:font-black first-letter:text-indigo-600 dark:first-letter:text-indigo-400">
                            {selectedNews.content}
                        </p>
                    </div>

                    {/* FIN DEL ARTÍCULO */}
                    <div className="mt-16 flex flex-col items-center justify-center text-center opacity-60">
                        <div className="w-16 h-1 bg-slate-200 dark:bg-slate-800 rounded-full mb-4"></div>
                        <Newspaper size={24} className="text-slate-400 mb-2"/>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Fin de la noticia</p>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* MODAL CREAR NOTICIA */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl relative border border-slate-200 dark:border-slate-800 overflow-hidden">
                {/* Fondo decorativo */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                
                <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 p-2 bg-slate-50 dark:bg-slate-800 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition"><X size={20}/></button>
                
                <h2 className="font-black text-2xl text-slate-900 dark:text-white mb-2">Crear Noticia</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">Comparte información relevante con toda la facultad.</p>
                
                <div className="space-y-5">
                    <div className="group">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1 group-focus-within:text-indigo-500 transition-colors">Título</label>
                        <input 
                            className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold text-slate-900 dark:text-white border-2 border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all placeholder:text-slate-400 placeholder:font-normal" 
                            placeholder="Escribe un titular llamativo..." 
                            value={form.title}
                            onChange={e => setForm({...form, title: e.target.value})}
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="group">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1 group-focus-within:text-indigo-500 transition-colors">Categoría</label>
                            <div className="relative">
                                <select 
                                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold text-slate-700 dark:text-slate-200 border-2 border-transparent focus:border-indigo-500 cursor-pointer appearance-none" 
                                    value={form.category} 
                                    onChange={e => setForm({...form, category: e.target.value})}
                                >
                                    <option value="UNA">🏛️ UNA</option>
                                    <option value="JURIDICO">⚖️ Jurídico</option>
                                    <option value="SOCIALES">🎉 Sociales</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <ChevronRight size={16} className="rotate-90"/>
                                </div>
                            </div>
                        </div>
                        <div>
                             <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Multimedia</label>
                             <label className="flex items-center justify-center w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:border-indigo-400 transition-all h-[60px] group">
                                <span className="text-xs font-bold text-slate-500 group-hover:text-indigo-500 flex items-center gap-2 truncate transition-colors">
                                    <ImageIcon size={18}/> {form.image ? 'Cambiar' : 'Subir Foto'}
                                </span>
                                <input type="file" className="hidden" accept="image/*" onChange={handleImageSelect}/>
                            </label>
                        </div>
                    </div>

                    {previewImage && (
                        <div className="relative w-full h-40 rounded-2xl overflow-hidden group shadow-md border border-slate-200 dark:border-slate-700">
                            <img src={previewImage} className="w-full h-full object-cover"/>
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button 
                                    onClick={() => {setForm({...form, image: null}); setPreviewImage(null)}}
                                    className="bg-red-500 text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform"
                                >
                                    <Trash2 size={20}/>
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="group">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1 group-focus-within:text-indigo-500 transition-colors">Contenido</label>
                        <textarea 
                            className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none text-sm text-slate-800 dark:text-slate-200 border-2 border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all h-32 resize-none leading-relaxed placeholder:text-slate-400" 
                            placeholder="Desarrolla la noticia aquí..." 
                            value={form.content}
                            onChange={e => setForm({...form, content: e.target.value})}
                        />
                    </div>
                    
                    <button 
                        onClick={handlePublish} 
                        disabled={uploading} 
                        className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black rounded-2xl uppercase tracking-widest shadow-lg shadow-indigo-500/30 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                    >
                        {uploading ? <Loader2 className="animate-spin" size={20}/> : (
                            <>Publicar <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" /></>
                        )}
                    </button>
                </div>
            </div>
        </div>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .mask-gradient-right { -webkit-mask-image: linear-gradient(to right, black 85%, transparent 100%); }
        .drop-cap:first-letter { font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif; }
      `}</style>
    </div>
  )
}