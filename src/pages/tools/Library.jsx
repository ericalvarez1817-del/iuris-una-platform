import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { 
  Book, Search, Plus, Download, ShoppingCart, 
  Loader2, DollarSign, FileText, Camera, X, ArrowLeft, Wallet, 
  Upload, Trash2, EyeOff, Eye, Flame, BookOpen, Tag
} from 'lucide-react'

// Utilidad moneda
const formatMoney = (amount) => new Intl.NumberFormat('es-PY').format(amount || 0)

export default function Library() {
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  
  // Datos
  const [ebooks, setEbooks] = useState([])
  const [myPurchases, setMyPurchases] = useState([]) 
  
  // UI States
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [activeTab, setActiveTab] = useState('store') // 'store' | 'library'
  const [searchTerm, setSearchTerm] = useState('')
  const [visibleCount, setVisibleCount] = useState(20) // Paginación local
  
  // Formulario
  const [form, setForm] = useState({ title: '', desc: '', price: '', cover: null, file: null })
  const [uploading, setUploading] = useState(false)

  // --- INICIALIZACIÓN ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) loadData(session.user.id)
    })
  }, [])

  const loadData = async (userId) => {
    setLoading(true)
    try {
        // 1. Perfil
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', userId).single()
        if(prof) setProfile(prof)

        // 2. Libros (Traemos TODOS ordenados por popularidad y fecha)
        const { data: books, error } = await supabase
            .from('ebooks')
            .select('*, profiles(full_name)')
            .order('downloads', { ascending: false }) // Primero los más populares
            .order('created_at', { ascending: false })
        
        if (error) console.error(error)
        setEbooks(books || [])

        // 3. Mis compras
        const { data: purchases } = await supabase
            .from('ebook_purchases')
            .select('ebook_id')
            .eq('buyer_id', userId)
        
        const purchaseIds = purchases?.map(p => p.ebook_id) || []
        setMyPurchases(purchaseIds)
    } catch (e) {
        console.error(e)
    }
    setLoading(false)
  }

  // --- FILTROS INTELIGENTES ---
  
  // 1. Libros para la TIENDA: Activos, que NO son míos y NO he comprado
  const storeBooks = ebooks.filter(book => 
    book.is_active && 
    book.owner_id !== session?.user?.id && 
    !myPurchases.includes(book.id) &&
    book.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // 2. Mi BIBLIOTECA (Comprados): Libros que compré (sin importar si están activos o no)
  const myLibraryBooks = ebooks.filter(book => 
    myPurchases.includes(book.id) &&
    book.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // 3. Mis PUBLICACIONES (Subidos): Libros que yo subí (para gestionar)
  const myUploadedBooks = ebooks.filter(book => 
    book.owner_id === session?.user?.id &&
    book.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // --- ACCIONES ---
  const handlePublish = async () => {
      if (!form.title || !form.price || !form.file) return alert("Completa título, precio y archivo.")
      setUploading(true)
      try {
          let coverUrl = null
          if (form.cover) {
              const coverName = `cover_${Date.now()}`
              await supabase.storage.from('ebook-covers').upload(coverName, form.cover)
              const { data } = supabase.storage.from('ebook-covers').getPublicUrl(coverName)
              coverUrl = data.publicUrl
          }

          const safeFileName = form.file.name.replace(/[^a-zA-Z0-9.]/g, '_')
          const fileName = `book_${Date.now()}_${safeFileName}`
          await supabase.storage.from('ebook-files').upload(fileName, form.file)

          const { error } = await supabase.from('ebooks').insert({
              owner_id: session.user.id,
              title: form.title,
              description: form.desc,
              price: parseInt(form.price),
              cover_url: coverUrl,
              file_path: fileName, 
              file_type: form.file.name.split('.').pop().toUpperCase(),
              is_active: true,
              downloads: 0
          })

          if (error) throw error
          alert("¡Publicado!")
          setShowModal(false)
          setForm({ title: '', desc: '', price: '', cover: null, file: null })
          loadData(session.user.id)
      } catch (error) { alert("Error: " + error.message) }
      setUploading(false)
  }

  const handleArchive = async (bookId, currentStatus) => {
      const newStatus = !currentStatus
      const action = newStatus ? "reactivar" : "pausar la venta de"
      if (!confirm(`¿Deseas ${action} este libro?`)) return;

      try {
          await supabase.from('ebooks').update({ is_active: newStatus }).eq('id', bookId)
          loadData(session.user.id)
      } catch (error) { alert("Error: " + error.message) }
  }

  const handleDelete = async (bookId) => {
      if (!confirm("⚠️ ¿Borrar permanentemente? Esto eliminará el libro de tu historial.")) return;
      try {
          await supabase.from('ebooks').delete().eq('id', bookId)
          loadData(session.user.id)
      } catch (error) { alert("Error: " + error.message) }
  }

  const handleBuy = async (book) => {
      if (profile.balance < book.price) return alert("Saldo insuficiente.")
      if (!confirm(`¿Comprar "${book.title}" por ${book.price} Coins?`)) return
      setLoading(true)
      try {
          const { error } = await supabase.rpc('buy_ebook_transaction', { p_ebook_id: book.id, p_buyer_id: session.user.id })
          if (error) throw error
          alert("¡Compra exitosa! Se ha añadido a 'Mis Libros'.")
          loadData(session.user.id) 
          setActiveTab('library') // Llevar al usuario a su biblioteca
      } catch (error) { alert("Error: " + error.message) }
      setLoading(false)
  }

  const handleDownload = async (book) => {
      try {
          const { data, error } = await supabase.storage.from('ebook-files').createSignedUrl(book.file_path, 60)
          if (error) throw error
          window.open(data.signedUrl, '_blank')
      } catch (error) { alert("Error: " + error.message) }
  }

  // --- TARJETA COMPACTA ---
  const BookCard = ({ book, type }) => {
      // type: 'store' | 'owned' | 'manage'
      return (
        <div className={`flex flex-col h-full group relative rounded-lg overflow-hidden transition-all hover:-translate-y-1 ${!book.is_active && type === 'manage' ? 'opacity-75' : ''}`}>
            
            {/* PORTADA (Aspecto Libro Real) */}
            <div className="aspect-[2/3] bg-slate-200 dark:bg-slate-800 relative rounded-lg overflow-hidden shadow-sm border border-slate-100 dark:border-slate-700">
                {book.cover_url ? (
                    <img src={book.cover_url} className={`w-full h-full object-cover ${!book.is_active && type === 'manage' ? 'grayscale' : ''}`} loading="lazy" />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                        <Book size={24} strokeWidth={1.5}/>
                        <span className="text-[9px] font-bold uppercase mt-1 leading-none">{book.title}</span>
                    </div>
                )}
                
                {/* Badge de Descargas (Popularidad) */}
                {book.downloads > 0 && (
                    <div className="absolute top-1 right-1 bg-black/60 backdrop-blur-md text-white text-[8px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <Flame size={8} className="text-orange-400 fill-orange-400"/> {book.downloads}
                    </div>
                )}

                {/* Badge Estado (Solo dueño) */}
                {type === 'manage' && (
                    <div className={`absolute bottom-0 left-0 right-0 text-[8px] font-black text-center py-1 text-white uppercase ${book.is_active ? 'bg-emerald-500/90' : 'bg-red-500/90'}`}>
                        {book.is_active ? 'En Venta' : 'Pausado'}
                    </div>
                )}
            </div>

            {/* INFO */}
            <div className="pt-2 flex-1 flex flex-col">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-xs leading-tight mb-0.5 line-clamp-2" title={book.title}>{book.title}</h3>
                <p className="text-[10px] text-slate-500 mb-2 truncate">{book.profiles?.full_name?.split(' ')[0]}</p>
                
                <div className="mt-auto">
                    {type === 'owned' && (
                        <button onClick={() => handleDownload(book)} className="w-full py-1.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-1 hover:bg-indigo-100 transition">
                            <Download size={12}/> Leer
                        </button>
                    )}
                    {type === 'store' && (
                        <button onClick={() => handleBuy(book)} className="w-full py-1.5 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-1 shadow-sm active:scale-95 transition">
                            <ShoppingCart size={12}/> {formatMoney(book.price)}
                        </button>
                    )}
                    {type === 'manage' && (
                        <div className="flex gap-1">
                            <button onClick={() => handleArchive(book.id, book.is_active)} className="flex-1 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-bold border border-slate-200 dark:border-slate-700">
                                {book.is_active ? <EyeOff size={12} className="mx-auto"/> : <Eye size={12} className="mx-auto"/>}
                            </button>
                            <button onClick={() => handleDelete(book.id)} className="flex-1 py-1.5 bg-red-50 text-red-500 rounded-lg text-[10px] font-bold hover:bg-red-100">
                                <Trash2 size={12} className="mx-auto"/>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans pb-24 transition-colors">
      
      {/* HEADER COMPACTO */}
      <header className="bg-slate-900 text-white sticky top-0 z-30 px-4 py-3 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="p-1.5 -ml-2 hover:bg-white/10 rounded-full"><ArrowLeft size={18} /></button>
          <div><h1 className="font-bold text-base leading-none">LIBRERÍA</h1><p className="text-[8px] text-slate-400 font-bold tracking-widest uppercase">Digital Store</p></div>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-3 py-1 rounded-full">
          <Wallet size={12} className="text-emerald-400" /><span className="font-bold text-xs">{profile?.balance || 0}</span>
        </div>
      </header>

      <main className="p-4 max-w-2xl mx-auto space-y-6">
        
        {/* BUSCADOR & TABS */}
        <div className="space-y-3">
            <div className="relative">
                <Search className="absolute left-4 top-3 text-slate-400" size={16}/>
                <input 
                    placeholder="Buscar libros..." 
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm outline-none focus:border-indigo-500 transition font-medium text-sm"
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl">
                <button 
                    onClick={() => setActiveTab('store')}
                    className={`flex-1 py-2 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition ${activeTab === 'store' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-white' : 'text-slate-500'}`}
                >
                    <ShoppingCart size={14}/> Tienda
                </button>
                <button 
                    onClick={() => setActiveTab('library')}
                    className={`flex-1 py-2 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition ${activeTab === 'library' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-white' : 'text-slate-500'}`}
                >
                    <Book size={14}/> Mis Libros
                </button>
            </div>
        </div>

        {/* CONTENIDO */}
        {activeTab === 'store' ? (
            <div>
                {/* BOTÓN VENDER (Solo en tienda o destacado) */}
                <div onClick={() => setShowModal(true)} className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-4 text-white shadow-lg mb-6 flex items-center justify-between cursor-pointer hover:scale-[1.01] transition active:scale-95">
                    <div>
                        <h2 className="font-bold text-sm">¿Tienes resúmenes?</h2>
                        <p className="text-[10px] opacity-90">Véndelos y gana IURIS Coins</p>
                    </div>
                    <div className="bg-white/20 p-2 rounded-full"><Plus size={20}/></div>
                </div>

                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Catálogo Global</h2>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-6">
                    {storeBooks.slice(0, visibleCount).map(book => <BookCard key={book.id} book={book} type="store" />)}
                </div>
                
                {storeBooks.length > visibleCount && (
                    <button onClick={() => setVisibleCount(prev => prev + 20)} className="w-full mt-6 py-3 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white">
                        Cargar más libros...
                    </button>
                )}

                {storeBooks.length === 0 && <p className="text-center text-slate-400 text-xs py-10">No se encontraron libros.</p>}
            </div>
        ) : (
            <div className="space-y-8">
                {/* SECCIÓN 1: MIS COMPRAS (Biblioteca) */}
                <div className="animate-in slide-in-from-right-4 duration-300">
                    <h2 className="flex items-center gap-2 text-sm font-black text-slate-800 dark:text-white mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">
                        <BookOpen size={16} className="text-emerald-500"/> Mi Biblioteca Digital
                    </h2>
                    {myLibraryBooks.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-6">
                            {myLibraryBooks.map(book => <BookCard key={book.id} book={book} type="owned" />)}
                        </div>
                    ) : (
                        <p className="text-xs text-slate-400 italic">Aún no has comprado libros.</p>
                    )}
                </div>

                {/* SECCIÓN 2: MIS PUBLICACIONES (Ventas) */}
                <div className="animate-in slide-in-from-right-8 duration-500">
                    <h2 className="flex items-center gap-2 text-sm font-black text-slate-800 dark:text-white mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">
                        <Tag size={16} className="text-indigo-500"/> Mis Publicaciones en Venta
                    </h2>
                    {myUploadedBooks.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-6">
                            {myUploadedBooks.map(book => <BookCard key={book.id} book={book} type="manage" />)}
                        </div>
                    ) : (
                        <div className="text-center py-6 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                            <p className="text-xs text-slate-500 mb-2">No tienes libros a la venta.</p>
                            <button onClick={() => setShowModal(true)} className="text-xs font-bold text-indigo-500 hover:underline">Comenzar a Vender</button>
                        </div>
                    )}
                </div>
            </div>
        )}

      </main>

      {/* MODAL PUBLICAR */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] p-6 relative shadow-2xl border border-slate-200 dark:border-slate-800">
                <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500"><X size={20}/></button>
                <h2 className="font-black text-xl text-slate-900 dark:text-white mb-6 flex items-center gap-2"><Upload size={24} className="text-indigo-500"/> Publicar</h2>
                <div className="space-y-4">
                    <input className="input-modern" placeholder="Título" onChange={e => setForm({...form, title: e.target.value})}/>
                    <textarea className="input-modern h-20" placeholder="Descripción..." onChange={e => setForm({...form, desc: e.target.value})}/>
                    <div className="relative"><DollarSign className="absolute left-4 top-4 text-indigo-500" size={16}/><input type="number" className="input-modern pl-10" placeholder="Precio" onChange={e => setForm({...form, price: e.target.value})}/></div>
                    <div className="grid grid-cols-2 gap-3">
                        <label className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-3 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"><Camera className="mx-auto mb-1 text-slate-400"/><span className="text-[9px] font-bold block text-slate-500">{form.cover ? "OK" : "Portada"}</span><input type="file" accept="image/*" className="hidden" onChange={e => setForm({...form, cover: e.target.files[0]})}/></label>
                        <label className="border-2 border-dashed border-indigo-200 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl p-3 text-center cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/30"><FileText className="mx-auto mb-1 text-indigo-500"/><span className="text-[9px] font-bold block text-indigo-600">{form.file ? "OK" : "PDF"}</span><input type="file" className="hidden" onChange={e => setForm({...form, file: e.target.files[0]})}/></label>
                    </div>
                    <button onClick={handlePublish} disabled={uploading} className="w-full py-4 bg-indigo-600 text-white font-black rounded-xl uppercase shadow-lg active:scale-95 transition disabled:opacity-50">{uploading ? <Loader2 className="animate-spin mx-auto"/> : 'PUBLICAR'}</button>
                </div>
            </div>
        </div>
      )}

      <style>{`
        .input-modern { width: 100%; padding: 1rem; border-radius: 1rem; outline: none; font-size: 0.875rem; font-weight: 700; border: 2px solid transparent; transition: all 0.2s; }
        .bg-slate-50 .input-modern { background-color: #f8fafc; color: #0f172a; }
        .dark .input-modern { background-color: #1e293b; color: white; }
        .input-modern:focus { border-color: #6366f1; background-color: white; }
        .dark .input-modern:focus { background-color: #0f172a; }
      `}</style>
    </div>
  )
}