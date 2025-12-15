import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { 
  Book, Search, Plus, Download, ShoppingCart, 
  Loader2, DollarSign, FileText, Camera, X, ArrowLeft, Wallet, Upload, Trash2
} from 'lucide-react'

// Utilidad moneda
const formatMoney = (amount) => new Intl.NumberFormat('es-PY').format(amount || 0)

export default function Library() {
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [ebooks, setEbooks] = useState([])
  const [myPurchases, setMyPurchases] = useState([]) 
  
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  
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
        // 1. Perfil (Saldo)
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', userId).single()
        if(prof) setProfile(prof)

        // 2. Libros disponibles
        const { data: books, error } = await supabase
            .from('ebooks')
            .select('*, profiles(full_name)')
            .order('created_at', { ascending: false })
        
        if (error) console.error("Error fetching books:", error)
        setEbooks(books || [])

        // 3. Mis compras
        const { data: purchases } = await supabase
            .from('ebook_purchases')
            .select('ebook_id')
            .eq('buyer_id', userId)
        
        const purchaseIds = purchases?.map(p => p.ebook_id) || []
        setMyPurchases(purchaseIds)
    } catch (e) {
        console.error("Error general:", e)
    }
    setLoading(false)
  }

  // --- SUBIR LIBRO ---
  const handlePublish = async () => {
      if (!form.title || !form.price || !form.file) return alert("Completa título, precio y archivo.")
      
      setUploading(true)
      try {
          // 1. Subir Portada (Pública)
          let coverUrl = null
          if (form.cover) {
              const coverName = `cover_${Date.now()}`
              const { error: coverErr } = await supabase.storage.from('ebook-covers').upload(coverName, form.cover)
              if (coverErr) throw coverErr
              const { data: publicUrl } = supabase.storage.from('ebook-covers').getPublicUrl(coverName)
              coverUrl = publicUrl.publicUrl
          }

          // 2. Subir Archivo (Privado)
          const safeFileName = form.file.name.replace(/[^a-zA-Z0-9.]/g, '_')
          const fileName = `book_${Date.now()}_${safeFileName}`
          
          const { error: fileErr } = await supabase.storage.from('ebook-files').upload(fileName, form.file)
          if (fileErr) throw fileErr

          // 3. Guardar en BD
          const { error: dbErr } = await supabase.from('ebooks').insert({
              owner_id: session.user.id,
              title: form.title,
              description: form.desc,
              price: parseInt(form.price),
              cover_url: coverUrl,
              file_path: fileName, 
              file_type: form.file.name.split('.').pop().toUpperCase()
          })

          if (dbErr) throw dbErr

          alert("¡Libro publicado exitosamente!")
          setShowModal(false)
          setForm({ title: '', desc: '', price: '', cover: null, file: null })
          // Recargar datos inmediatamente
          loadData(session.user.id)

      } catch (error) {
          alert("Error: " + error.message)
      }
      setUploading(false)
  }

  // --- BORRAR LIBRO (Solo Dueño) ---
  const handleDelete = async (bookId) => {
      if (!confirm("¿Estás seguro de eliminar este libro de la tienda?")) return;

      try {
          const { error } = await supabase.from('ebooks').delete().eq('id', bookId)
          if (error) throw error
          
          alert("Libro eliminado.")
          loadData(session.user.id) // Refrescar lista
      } catch (error) {
          alert("Error al borrar: " + error.message)
      }
  }

  // --- COMPRAR LIBRO ---
  const handleBuy = async (book) => {
      if (profile.balance < book.price) return alert("Saldo insuficiente.")
      if (!confirm(`¿Comprar "${book.title}" por ${book.price} Coins?`)) return

      setLoading(true)
      try {
          const { error } = await supabase.rpc('buy_ebook_transaction', {
              p_ebook_id: book.id,
              p_buyer_id: session.user.id
          })

          if (error) throw error
          
          alert("¡Compra exitosa!")
          loadData(session.user.id) 

      } catch (error) {
          alert("Error en la compra: " + error.message)
      }
      setLoading(false)
  }

  // --- DESCARGAR LIBRO ---
  const handleDownload = async (book) => {
      try {
          const { data, error } = await supabase.storage
              .from('ebook-files')
              .createSignedUrl(book.file_path, 60)

          if (error) throw error
          window.open(data.signedUrl, '_blank')

      } catch (error) {
          alert("Error al generar descarga: " + error.message)
      }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans pb-24">
      {/* HEADER */}
      <header className="bg-slate-900 text-white sticky top-0 z-30 px-4 py-3 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 hover:bg-white/10 rounded-full"><ArrowLeft size={20} /></button>
          <div><h1 className="font-bold text-lg leading-none">LIBRERÍA IURIS</h1><p className="text-[9px] text-slate-400 font-bold tracking-widest uppercase">Digital Store</p></div>
        </div>
        <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-full">
          <Wallet size={14} className="text-emerald-400" /><span className="font-bold text-sm">{profile?.balance || 0}</span>
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto">
        
        {/* BANNER PROMO */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-[2rem] p-6 text-white mb-8 shadow-xl relative overflow-hidden">
            <div className="relative z-10">
                <h2 className="font-black text-2xl mb-2">Vende tus Resúmenes</h2>
                <p className="text-xs font-medium opacity-90 mb-4 max-w-[80%]">Sube tus PDFs o libros y gana el 70% de cada venta directamente a tu billetera IURIS.</p>
                <button onClick={() => setShowModal(true)} className="bg-white text-indigo-600 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg active:scale-95 transition flex items-center gap-2">
                    <Plus size={16}/> Publicar Material
                </button>
            </div>
            <Book size={120} className="absolute -bottom-4 -right-4 opacity-20 rotate-12"/>
        </div>

        {/* LISTA DE LIBROS */}
        <div className="grid grid-cols-2 gap-4">
            {ebooks.map(book => {
                const isOwned = myPurchases.includes(book.id) || book.owner_id === session?.user?.id
                const isMyBook = book.owner_id === session?.user?.id
                
                return (
                    <div key={book.id} className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col h-full relative group">
                        
                        {/* BOTÓN DE BORRAR (SOLO SI ES MÍO) */}
                        {isMyBook && (
                            <button 
                                onClick={() => handleDelete(book.id)}
                                className="absolute top-2 left-2 z-20 bg-red-500 text-white p-1.5 rounded-full shadow-md hover:scale-110 transition opacity-0 group-hover:opacity-100"
                            >
                                <Trash2 size={12} />
                            </button>
                        )}

                        {/* PORTADA */}
                        <div className="aspect-[3/4] bg-slate-100 dark:bg-slate-800 rounded-xl mb-3 overflow-hidden relative">
                            {book.cover_url ? (
                                <img src={book.cover_url} className="w-full h-full object-cover transition group-hover:scale-105 duration-500" />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                                    <FileText size={40} strokeWidth={1.5}/>
                                    <span className="text-[10px] font-black uppercase mt-2">Sin Portada</span>
                                </div>
                            )}
                            <span className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-white text-[8px] font-bold px-2 py-1 rounded-md uppercase">
                                {book.file_type || 'PDF'}
                            </span>
                        </div>

                        {/* INFO */}
                        <div className="flex-1 flex flex-col">
                            <h3 className="font-black text-slate-800 dark:text-white text-sm leading-tight mb-1 line-clamp-2">{book.title}</h3>
                            <p className="text-[10px] text-slate-500 font-bold mb-3">Por: {book.profiles?.full_name?.split(' ')[0] || 'Anónimo'}</p>
                            
                            <div className="mt-auto">
                                {isOwned ? (
                                    <button onClick={() => handleDownload(book)} className="w-full py-3 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-emerald-200 transition">
                                        <Download size={14}/> Descargar
                                    </button>
                                ) : (
                                    <button onClick={() => handleBuy(book)} className="w-full py-3 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 shadow-lg active:scale-95 transition">
                                        <ShoppingCart size={14}/> {formatMoney(book.price)} Gs
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>

        {ebooks.length === 0 && !loading && (
            <div className="text-center py-20 opacity-50">
                <Search size={40} className="mx-auto mb-2"/>
                <p className="font-bold text-sm">Aún no hay libros publicados</p>
            </div>
        )}
      </main>

      {/* MODAL DE PUBLICACIÓN */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] p-6 relative shadow-2xl border border-slate-200 dark:border-slate-800">
                <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500"><X size={20}/></button>
                
                <h2 className="font-black text-xl text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <Upload size={24} className="text-indigo-500"/> Vender Digital
                </h2>

                <div className="space-y-4">
                    <input className="input-modern" placeholder="Título del Material" onChange={e => setForm({...form, title: e.target.value})}/>
                    <textarea className="input-modern h-24" placeholder="Descripción breve..." onChange={e => setForm({...form, desc: e.target.value})}/>
                    
                    <div className="relative">
                        <DollarSign className="absolute left-4 top-4 text-indigo-500" size={16}/>
                        <input type="number" className="input-modern pl-10" placeholder="Precio en IURIS" onChange={e => setForm({...form, price: e.target.value})}/>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <label className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                            <Camera className="mx-auto mb-2 text-slate-400"/>
                            <span className="text-[10px] font-bold block text-slate-500">{form.cover ? "Portada Lista" : "Subir Portada"}</span>
                            <input type="file" accept="image/*" className="hidden" onChange={e => setForm({...form, cover: e.target.files[0]})}/>
                        </label>

                        <label className="border-2 border-dashed border-indigo-200 dark:border-indigo-900/50 bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl p-4 text-center cursor-pointer hover:bg-indigo-100 transition">
                            <FileText className="mx-auto mb-2 text-indigo-500"/>
                            <span className="text-[10px] font-bold block text-indigo-600">{form.file ? "Archivo Listo" : "Subir PDF/DOC"}</span>
                            <input type="file" accept=".pdf,.epub,.doc,.docx" className="hidden" onChange={e => setForm({...form, file: e.target.files[0]})}/>
                        </label>
                    </div>

                    <button onClick={handlePublish} disabled={uploading} className="w-full py-4 bg-indigo-600 text-white font-black rounded-xl uppercase tracking-widest shadow-xl active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-2">
                        {uploading ? <Loader2 className="animate-spin"/> : 'PUBLICAR Y VENDER'}
                    </button>
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