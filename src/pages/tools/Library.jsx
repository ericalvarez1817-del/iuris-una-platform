import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { 
  Book, Search, Plus, Download, ShoppingCart, 
  Loader2, DollarSign, FileText, Camera, X, ArrowLeft, Wallet, 
  Upload, Trash2, EyeOff, Eye, BarChart3, Flame
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
  const [activeTab, setActiveTab] = useState('store') // 'store' | 'portfolio'
  const [searchTerm, setSearchTerm] = useState('')
  
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

        // 2. Libros (Traemos descargas también)
        const { data: books, error } = await supabase
            .from('ebooks')
            .select('*, profiles(full_name)')
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

  // --- LÓGICA DE FILTRADO Y BÚSQUEDA ---
  const filteredBooks = ebooks.filter(book => 
    book.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const marketBooks = filteredBooks.filter(book => 
    book.owner_id !== session?.user?.id && book.is_active
  )

  const myUploadedBooks = filteredBooks.filter(book => 
    book.owner_id === session?.user?.id
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
      // Toggle estado (Activar/Desactivar)
      const newStatus = !currentStatus
      const action = newStatus ? "reactivar" : "retirar"
      if (!confirm(`¿Deseas ${action} este libro?`)) return;

      try {
          await supabase.from('ebooks').update({ is_active: newStatus }).eq('id', bookId)
          loadData(session.user.id)
      } catch (error) { alert("Error: " + error.message) }
  }

  const handleDelete = async (bookId) => {
      if (!confirm("⚠️ ¿Borrar permanentemente? Esto es destructivo.")) return;
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
          alert("¡Compra exitosa!")
          loadData(session.user.id) 
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

  // --- TARJETA DE LIBRO (Reutilizable) ---
  const BookCard = ({ book, isOwnerView = false }) => {
      const isOwned = myPurchases.includes(book.id)
      
      return (
        <div className={`p-3 rounded-2xl border shadow-sm flex flex-col h-full relative group transition-all hover:shadow-md ${!book.is_active && isOwnerView ? 'bg-slate-100 border-slate-200 opacity-75' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'}`}>
            
            {/* BADGES PARA DUEÑO */}
            {isOwnerView && (
                <div className="absolute top-2 left-2 z-20 flex gap-1">
                    <span className={`text-[9px] font-black px-2 py-1 rounded-md text-white ${book.is_active ? 'bg-emerald-500' : 'bg-slate-500'}`}>
                        {book.is_active ? 'EN VENTA' : 'ARCHIVADO'}
                    </span>
                </div>
            )}

            {/* CONTADOR DE DESCARGAS (NUEVO) */}
            <div className="absolute top-2 right-2 z-20 bg-black/60 backdrop-blur-md text-white text-[9px] font-bold px-2 py-1 rounded-md flex items-center gap-1">
                <Flame size={10} className="text-orange-400 fill-orange-400"/> {book.downloads || 0}
            </div>

            {/* PORTADA */}
            <div className="aspect-[3/4] bg-slate-100 dark:bg-slate-800 rounded-xl mb-3 overflow-hidden relative mt-1">
                {book.cover_url ? (
                    <img src={book.cover_url} className={`w-full h-full object-cover ${!book.is_active ? 'grayscale' : ''}`} />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                        <FileText size={40} strokeWidth={1.5}/>
                    </div>
                )}
            </div>

            {/* INFO */}
            <div className="flex-1 flex flex-col">
                <h3 className="font-black text-slate-800 dark:text-white text-sm leading-tight mb-1 line-clamp-2">{book.title}</h3>
                <p className="text-[10px] text-slate-500 font-bold mb-3">Por: {book.profiles?.full_name?.split(' ')[0] || 'Anónimo'}</p>
                
                <div className="mt-auto space-y-2">
                    {/* BOTONES SEGÚN VISTA */}
                    {isOwnerView ? (
                        <div className="flex gap-2">
                            <button onClick={() => handleArchive(book.id, book.is_active)} className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-bold">
                                {book.is_active ? <EyeOff size={14} className="mx-auto"/> : <Eye size={14} className="mx-auto"/>}
                            </button>
                            <button onClick={() => handleDelete(book.id)} className="flex-1 py-2 bg-red-50 text-red-500 rounded-lg text-[10px] font-bold">
                                <Trash2 size={14} className="mx-auto"/>
                            </button>
                        </div>
                    ) : (
                        isOwned ? (
                            <button onClick={() => handleDownload(book)} className="w-full py-3 bg-emerald-100 text-emerald-700 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2">
                                <Download size={14}/> Descargar
                            </button>
                        ) : (
                            <button onClick={() => handleBuy(book)} className="w-full py-3 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 shadow-lg active:scale-95 transition">
                                <ShoppingCart size={14}/> {formatMoney(book.price)} IURIS
                            </button>
                        )
                    )}
                </div>
            </div>
        </div>
      )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans pb-24 transition-colors">
      
      {/* HEADER */}
      <header className="bg-slate-900 text-white sticky top-0 z-30 px-4 py-3 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 hover:bg-white/10 rounded-full"><ArrowLeft size={20} /></button>
          <div><h1 className="font-bold text-lg leading-none">LIBRERÍA</h1><p className="text-[9px] text-slate-400 font-bold tracking-widest uppercase">IURIS Store</p></div>
        </div>
        <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-full">
          <Wallet size={14} className="text-emerald-400" /><span className="font-bold text-sm">{profile?.balance || 0}</span>
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto space-y-6">
        
        {/* BUSCADOR */}
        <div className="relative">
            <Search className="absolute left-4 top-3.5 text-slate-400" size={20}/>
            <input 
                placeholder="Buscar por título..." 
                className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm outline-none focus:border-indigo-500 transition font-bold text-sm"
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>

        {/* TABS DE NAVEGACIÓN (SEPARACIÓN) */}
        <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl">
            <button 
                onClick={() => setActiveTab('store')}
                className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition ${activeTab === 'store' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-white' : 'text-slate-500'}`}
            >
                <ShoppingCart size={14}/> Explorar Tienda
            </button>
            <button 
                onClick={() => setActiveTab('portfolio')}
                className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition ${activeTab === 'portfolio' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-white' : 'text-slate-500'}`}
            >
                <Book size={14}/> Mis Libros
            </button>
        </div>

        {/* CONTENIDO SEGÚN TAB */}
        {activeTab === 'store' ? (
            <div>
                <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Lo más reciente</h2>
                <div className="grid grid-cols-2 gap-4">
                    {marketBooks.map(book => <BookCard key={book.id} book={book} />)}
                </div>
                {marketBooks.length === 0 && <p className="text-center text-slate-400 text-sm py-10">No hay libros que coincidan.</p>}
            </div>
        ) : (
            <div>
                {/* BOTÓN SUBIR SOLO EN MI TAB */}
                <div onClick={() => setShowModal(true)} className="bg-indigo-50 dark:bg-indigo-900/20 border-2 border-dashed border-indigo-200 dark:border-indigo-800 rounded-2xl p-6 text-center cursor-pointer hover:bg-indigo-100 transition mb-6">
                    <div className="bg-white dark:bg-slate-800 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-indigo-500">
                        <Plus size={24}/>
                    </div>
                    <h3 className="font-bold text-indigo-900 dark:text-indigo-300 text-sm">Publicar Nuevo Material</h3>
                    <p className="text-[10px] text-indigo-400">Gana el 70% de cada venta</p>
                </div>

                <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Mi Catálogo</h2>
                <div className="grid grid-cols-2 gap-4">
                    {myUploadedBooks.map(book => <BookCard key={book.id} book={book} isOwnerView={true} />)}
                </div>
                {myUploadedBooks.length === 0 && <p className="text-center text-slate-400 text-sm py-4">Aún no has publicado nada.</p>}
            </div>
        )}

      </main>

      {/* MODAL DE PUBLICACIÓN (Igual que antes) */}
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
                        <label className="border-2 border-dashed border-slate-200 rounded-xl p-3 text-center cursor-pointer"><Camera className="mx-auto mb-1 text-slate-400"/><span className="text-[9px] font-bold block text-slate-500">{form.cover ? "OK" : "Portada"}</span><input type="file" accept="image/*" className="hidden" onChange={e => setForm({...form, cover: e.target.files[0]})}/></label>
                        <label className="border-2 border-dashed border-indigo-200 bg-indigo-50 rounded-xl p-3 text-center cursor-pointer"><FileText className="mx-auto mb-1 text-indigo-500"/><span className="text-[9px] font-bold block text-indigo-600">{form.file ? "OK" : "PDF"}</span><input type="file" className="hidden" onChange={e => setForm({...form, file: e.target.files[0]})}/></label>
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