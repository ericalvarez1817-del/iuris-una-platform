import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Wallet, Search, Bell, CreditCard, User, Upload, X, Loader2, DollarSign, FileText, Camera, AlertCircle, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { FeedView, WalletView, InboxView, ProfileView } from './MarketViews'

// --- COMPONENTE DE NOTIFICACIÓN (TOAST) ---
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  const bgClass = type === 'success' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-red-500 text-white'
  
  return (
    <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-4 rounded-full shadow-2xl shadow-slate-200 dark:shadow-none animate-in slide-in-from-top-5 duration-300 ${bgClass}`}>
      {type === 'success' ? <CheckCircle2 size={20} className="text-emerald-400 dark:text-emerald-600 fill-current" /> : <AlertCircle size={20}/>}
      <span className="font-bold text-sm tracking-wide">{message}</span>
    </div>
  )
}

export default function Marketplace() {
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  
  // UI States
  const [activeTab, setActiveTab] = useState('market')
  const [marketSection, setMarketSection] = useState('servicios')
  const [showModal, setShowModal] = useState(null)
  const [loading, setLoading] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  
  // Toast State
  const [toast, setToast] = useState(null) 

  // Data
  const [items, setItems] = useState([])
  const [requests, setRequests] = useState([])
  const [paymentRequests, setPaymentRequests] = useState([])
  
  // Forms
  const [formPublish, setFormPublish] = useState({ title: '', desc: '', price: '', file: null })
  const [formRequest, setFormRequest] = useState({ note: '', file: null })
  const [deliveryForm, setDeliveryForm] = useState({ note: '', file: null }) 
  
  const [selectedItem, setSelectedItem] = useState(null)
  const [topUpAmount, setTopUpAmount] = useState('')
  const [topUpFile, setTopUpFile] = useState(null)
  
  const [withdrawForm, setWithdrawForm] = useState({ 
      bank_name: '', 
      account_number: '', 
      account_holder: '', 
      holder_ci: '', 
      phone_number: '', 
      amount: '' 
  })

  // Audio Ref
  const audioRef = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'))

  // --- SONIDO Y NOTIFICACIÓN ---
  const notify = (msg, type = 'success', sound = false) => {
    setToast({ message: msg, type })
    if (sound) {
        audioRef.current.currentTime = 0
        audioRef.current.volume = 0.6
        audioRef.current.play().catch(() => console.log("Interacción requerida para audio"))
    }
  }

  // --- LOGICA INICIAL ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchAllData(session.user.id)
    })
  }, [])

  // --- REALTIME (SIN RECARGAS) ---
  useEffect(() => {
    if (!session?.user?.id) return

    const channel = supabase.channel('market_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'market_requests' },
        (payload) => {
          // Filtrar eventos relevantes para mi
          if (payload.new.to_id === session.user.id || payload.new.from_id === session.user.id) {
            
            // Determinar mensaje según el cambio
            if (payload.eventType === 'INSERT' && payload.new.to_id === session.user.id) {
                notify("¡Nueva solicitud recibida!", 'success', true)
            } else if (payload.eventType === 'UPDATE' && payload.new.status === 'completed') {
                notify("¡Trabajo finalizado y pagado!", 'success', true)
            } else if (payload.eventType === 'UPDATE' && payload.new.status === 'accepted') {
                notify("¡Propuesta aceptada!", 'success', true)
            } else if (payload.eventType === 'UPDATE' && payload.new.status === 'delivered' && payload.new.to_id === session.user.id) {
                notify("¡Han entregado el trabajo! Revisa para liberar fondos.", 'success', true)
            }

            // Actualizar datos SILENCIOSAMENTE
            fetchAllData(session.user.id)
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [session])

  const fetchAllData = async (userId) => {
    try {
        // 1. Perfil
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', userId).single()
        if (prof) setProfile(prof)

        // 2. Mercado
        const { data: market } = await supabase
            .from('market_items')
            .select('id, owner_id, title, description, price, section, file_url, created_at, profiles(email, full_name, reputation, is_verified, avatar_url)')
            .order('created_at', { ascending: false })
        setItems(market || [])

        // 3. Solicitudes (Inbox)
        const { data: reqs } = await supabase
            .from('market_requests')
            .select(`
                *, 
                item_data:market_items(title, section, price), 
                from_profile:profiles!from_id(email, full_name, avatar_url, reputation, is_verified), 
                to_profile:profiles!to_id(email, full_name, avatar_url, reputation, is_verified)
            `)
            .or(`from_id.eq.${userId},to_id.eq.${userId}`)
            .order('created_at', { ascending: false })
        setRequests(reqs || [])

        // 4. Pagos
        const { data: pays } = await supabase
            .from('payment_requests')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
        setPaymentRequests(pays || [])

    } catch (e) { 
        console.error("Error silencioso:", e)
    }
  }

  const uploadFile = async (file) => {
    if (!file) return null
    try {
        const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`
        const { error } = await supabase.storage.from('market-files').upload(fileName, file)
        if (error) throw error
        const { data } = supabase.storage.from('market-files').getPublicUrl(fileName)
        return data.publicUrl
    } catch (error) {
        notify("Error subiendo archivo", 'error')
        return null
    }
  }

  // --- ACCIONES ---

  // 1. PUBLICAR
  const publishItem = async () => {
    if (!formPublish.title || !formPublish.price) return notify("Faltan datos", 'error')
    setLoading(true)
    try {
        let url = null
        if (formPublish.file) url = await uploadFile(formPublish.file)
        const priceInt = parseInt(formPublish.price)

        const { error } = await supabase.from('market_items').insert({ 
            owner_id: session.user.id, 
            section: marketSection, 
            title: formPublish.title, 
            description: formPublish.desc, 
            price: priceInt, 
            file_url: url 
        })
        if (error) throw error
        notify("¡Publicación creada!")
        setShowModal(null)
        setFormPublish({ title: '', desc: '', price: '', file: null })
        fetchAllData(session.user.id)
    } catch (e) { notify(e.message, 'error') }
    setLoading(false)
  }

  // 2. RECARGAR
  const requestTopUp = async () => {
      if (!topUpAmount) return notify("Ingresa monto", 'error')
      setLoading(true)
      try {
          let url = null
          if (topUpFile) url = await uploadFile(topUpFile)
          
          const { error } = await supabase.from('payment_requests').insert({ 
              user_id: session.user.id, 
              type: 'deposit', 
              amount: parseInt(topUpAmount), 
              proof_url: url, 
              status: 'pending' 
          })
          if (error) throw error
          notify("Recarga solicitada. Pendiente aprobación.")
          setShowModal(null)
          setTopUpAmount('')
          setTopUpFile(null)
          fetchAllData(session.user.id)
      } catch (e) { notify(e.message, 'error') }
      setLoading(false)
  }

  // 3. RETIRAR
  const requestWithdraw = async () => {
      if (!withdrawForm.amount) return notify("Ingresa monto", 'error')
      if (parseInt(withdrawForm.amount) > profile.balance) return notify("Saldo insuficiente", 'error')

      setLoading(true)
      try {
          const { error } = await supabase.from('payment_requests').insert({ 
              user_id: session.user.id, 
              type: 'withdraw', 
              status: 'pending',
              ...withdrawForm, 
              amount: parseInt(withdrawForm.amount) 
          })
          if (error) throw error
          notify("Solicitud de retiro enviada")
          setShowModal(null)
          setWithdrawForm({ bank_name: '', account_number: '', account_holder: '', holder_ci: '', phone_number: '', amount: '' })
          fetchAllData(session.user.id)
      } catch (e) { notify(e.message, 'error') }
      setLoading(false)
  }

  // 4. CONTRATAR / POSTULARSE
  const sendWorkRequest = async () => {
    if (!selectedItem?.owner_id) return notify("Error: Item sin dueño", 'error')

    // Si es SERVICIO, cobrar YA (Bloquear fondos)
    if (selectedItem.section === 'servicios') {
        if (profile.balance < selectedItem.price) return notify("Saldo insuficiente. Recarga IURIS-COINS.", 'error')
        const { error } = await supabase.from('profiles').update({ balance: profile.balance - selectedItem.price }).eq('id', session.user.id)
        if (error) return notify("Error en pago", 'error')
    } 
    
    setLoading(true)
    try {
        let url = null
        if (formRequest.file) url = await uploadFile(formRequest.file)
        
        await supabase.from('market_requests').insert({ 
            item_id: selectedItem.id, 
            from_id: session.user.id, 
            to_id: selectedItem.owner_id, 
            note: formRequest.note, 
            file_url: url, 
            price_locked: selectedItem.price,
            status: selectedItem.section === 'trabajos' ? 'postulation' : 'pending'
        })
        
        notify(selectedItem.section === 'trabajos' ? "¡Postulación enviada!" : "Contratación pagada y enviada.")
        setShowModal(null)
        fetchAllData(session.user.id)
    } catch (e) { notify(e.message, 'error') }
    setLoading(false)
  }

  // 5. ACEPTAR (LÓGICA DUEÑO DE TRABAJO PAGA)
  const handleAcceptRequest = async (req) => {
      if (req.status === 'postulation') {
          if (profile.balance < req.price_locked) return notify("Saldo insuficiente para contratar.", 'error')
          if (!confirm(`¿Contratar por ${req.price_locked} IURIS?`)) return

          const { error } = await supabase.from('profiles').update({ balance: profile.balance - req.price_locked }).eq('id', session.user.id)
          if (error) return notify("Error procesando pago", 'error')
      }

      await supabase.from('market_requests').update({status: 'accepted'}).eq('id', req.id)
      notify("¡Propuesta Aceptada!")
      fetchAllData(session.user.id)
  }

  // 6. RECHAZAR (CON REEMBOLSO AUTOMÁTICO)
  const handleRejectRequest = async (id) => {
      if(!confirm("¿Rechazar?")) return
      const req = requests.find(r => r.id === id)
      
      // Si era servicio pagado, devolver dinero al cliente
      if (req && req.status === 'pending' && req.item_data?.section === 'servicios') {
          const { data: client } = await supabase.from('profiles').select('balance').eq('id', req.from_id).single()
          await supabase.from('profiles').update({ balance: client.balance + req.price_locked }).eq('id', req.from_id)
          notify("Rechazado y reembolsado.", 'success')
      }

      await supabase.from('market_requests').update({status: 'rejected'}).eq('id', id)
      fetchAllData(session.user.id)
  }

  // 7. ENTREGAR TRABAJO (FLUJO ESCROW)
  const deliverWork = async () => {
    if (!selectedItem) return; 
    setLoading(true)
    try {
        let url = null
        if (deliveryForm.file) {
            url = await uploadFile(deliveryForm.file)
        } else {
            setLoading(false)
            return notify("Debes subir un archivo de entrega obligatoriamente.", 'error')
        }

        const { error } = await supabase
            .from('market_requests')
            .update({ 
                status: 'delivered', 
                delivery_file_url: url,
                delivery_note: deliveryForm.note,
                delivery_at: new Date()
            })
            .eq('id', selectedItem.id)

        if (error) throw error
        notify("¡Trabajo entregado! Esperando aprobación.", 'success', true)
        setShowModal(null)
        setDeliveryForm({ note: '', file: null })
        fetchAllData(session.user.id)
    } catch (e) {
        notify(e.message, 'error')
    }
    setLoading(false)
  }

  // 8. COMPLETAR (USANDO RPC PARA PAGAR AL TRABAJADOR)
  const handleCompleteRequest = async (req) => {
      if(!confirm("¿Confirmar finalización? Se liberarán los fondos.")) return;

      // Identificar trabajador
      let earnerId = req.item_data?.section === 'servicios' ? req.to_id : req.from_id

      try {
          const { error } = await supabase.rpc('finish_job_transaction', { 
              p_request_id: req.id, 
              p_earner_id: earnerId 
          })

          if (error) throw error

          notify("¡Trabajo completado! Fondos liberados.", 'success', true)
          fetchAllData(session.user.id)

      } catch (error) {
          console.error(error)
          notify("Error al liberar fondos: " + error.message, 'error')
      }
  }

  // PERFIL
  const handleAvatarUpload = async (e) => {
      setUploadingAvatar(true)
      try {
          const url = await uploadFile(e.target.files[0])
          if(url) {
            await supabase.from('profiles').update({ avatar_url: url }).eq('id', session.user.id)
            notify("Foto actualizada")
            fetchAllData(session.user.id)
          }
      } catch (e) { notify("Error al subir imagen", 'error') }
      setUploadingAvatar(false)
  }

  const updateProfile = async () => {
      await supabase.from('profiles').update({ bio: profile.bio, full_name: profile.full_name }).eq('id', session.user.id)
      notify("Perfil actualizado")
  }
  
  const verifyProfile = async () => {
      if (profile.balance < 150) return notify("Saldo insuficiente", 'error')
      if(confirm("¿Pagar 150 Coins?")) {
        await supabase.from('profiles').update({ balance: profile.balance - 150, is_verified: true }).eq('id', session.user.id)
        notify("¡Perfil Verificado!", 'success', true)
        fetchAllData(session.user.id)
      }
  }

  if (!profile) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white"><Loader2 className="animate-spin mr-2"/> Cargando Iuris...</div>

  const filteredItems = items.filter(i => i.section === marketSection)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans pb-20 transition-colors">
      
      {/* TOAST NOTIFICATION CONTAINER */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* HEADER */}
      <header className="bg-slate-900 text-white sticky top-0 z-30 px-4 py-3 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 hover:bg-white/10 rounded-full"><ArrowLeft size={20} /></button>
          <div><h1 className="font-bold text-lg leading-none">MERCADO UNA</h1><p className="text-[9px] text-slate-400 font-bold tracking-widest uppercase">Sistema V6.0</p></div>
        </div>
        <div onClick={() => setActiveTab('wallet')} className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-full cursor-pointer hover:bg-slate-700 transition active:scale-95">
          <Wallet size={14} className="text-emerald-400" /><span className="font-bold text-sm">{profile.balance}</span>
        </div>
      </header>

      {/* BODY */}
      <main className="p-4 max-w-md mx-auto">
        {activeTab === 'market' && (
            <FeedView 
                items={filteredItems} 
                section={marketSection} 
                setSection={setMarketSection} 
                currentUserId={session.user.id} 
                onPublishClick={() => setShowModal('publish')} 
                onRequestClick={(item) => { setSelectedItem(item); setShowModal('request') }} 
                onDelete={async (id) => { 
                    if(!confirm("¿Borrar?")) return;
                    await supabase.from('market_items').delete().eq('id', id); 
                    notify("Eliminado correctamente")
                    fetchAllData(session.user.id)
                }} 
            />
        )}
        
        {activeTab === 'inbox' && (
            <InboxView 
                requests={requests} 
                currentUserId={session.user.id} 
                onAccept={handleAcceptRequest} 
                onReject={handleRejectRequest} 
                onComplete={handleCompleteRequest}
                onDeliver={(req) => { setSelectedItem(req); setShowModal('deliver') }} 
            />
        )}
        
        {activeTab === 'wallet' && <WalletView profile={profile} paymentRequests={paymentRequests} onTopUp={() => setShowModal('topup')} onWithdraw={() => setShowModal('withdraw')} />}
        
        {activeTab === 'profile' && <ProfileView profile={profile} setProfileData={setProfile} onSave={updateProfile} onVerify={verifyProfile} onUploadAvatar={handleAvatarUpload} uploading={uploadingAvatar} />}
      </main>

      {/* NAV */}
      <nav className="fixed bottom-0 left-0 w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-40 flex justify-around py-3 pb-6 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] safe-area-bottom">
        {[{ id: 'market', icon: Search, label: 'Mercado' }, { id: 'inbox', icon: Bell, label: 'Buzón' }, { id: 'wallet', icon: CreditCard, label: 'Billetera' }, { id: 'profile', icon: User, label: 'Perfil' }].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col items-center gap-1 transition-all ${activeTab === tab.id ? 'text-indigo-600 dark:text-indigo-400 scale-110' : 'text-slate-400'}`}>
            <tab.icon size={24} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
            <span className="text-[10px] font-bold uppercase">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* --- MODALES --- */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800">
                
                {/* Header Modal */}
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <h3 className="font-black text-xl text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                        {showModal === 'publish' && <><FileText size={24} className="text-indigo-500"/> Crear Anuncio</>}
                        {showModal === 'request' && <><FileText size={24} className="text-indigo-500"/> {selectedItem?.section === 'trabajos' ? 'Postularme' : 'Contratar'}</>}
                        {showModal === 'deliver' && <><Upload size={24} className="text-indigo-500"/> Entregar Trabajo</>}
                        {showModal === 'topup' && <><Wallet size={24} className="text-emerald-500"/> Cargar Saldo</>}
                        {showModal === 'withdraw' && <><CreditCard size={24} className="text-amber-500"/> Retirar</>}
                    </h3>
                    <button onClick={()=>setShowModal(null)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition"><X size={20} className="text-slate-500 dark:text-slate-400"/></button>
                </div>
                
                {/* 1. PUBLICAR */}
                {showModal === 'publish' && (
                    <div className="space-y-4">
                        <input className="input-modern" placeholder={marketSection === 'servicios' ? "Título (Ej: Hago Resúmenes)" : "Título (Ej: Necesito Resumen)"} onChange={e => setFormPublish({...formPublish, title: e.target.value})}/>
                        <textarea className="input-modern h-32" placeholder="Descripción detallada..." onChange={e => setFormPublish({...formPublish, desc: e.target.value})}/>
                        <div className="relative">
                             <DollarSign className="absolute left-4 top-4 text-indigo-500"/>
                             <input type="number" className="input-modern pl-10" placeholder="Precio (IURIS)" onChange={e => setFormPublish({...formPublish, price: e.target.value})}/>
                        </div>
                        <label className="file-upload-modern">
                            <Camera className="mx-auto mb-1 text-indigo-500"/>
                            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{formPublish.file ? formPublish.file.name : "Subir Foto"}</span>
                            <input type="file" className="hidden" onChange={e => setFormPublish({...formPublish, file: e.target.files[0]})}/>
                        </label>
                        <button onClick={publishItem} disabled={loading} className="btn-modern bg-indigo-600">
                            {loading ? <Loader2 className="animate-spin"/> : 'PUBLICAR AHORA'}
                        </button>
                    </div>
                )}

                {/* 2. SOLICITAR / POSTULARSE */}
                {showModal === 'request' && (
                    <div className="space-y-5">
                         <div className="bg-indigo-50 dark:bg-indigo-900/20 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-800/50">
                            <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-1">
                                {selectedItem?.section === 'trabajos' ? 'Te postulas ante:' : 'Estás contratando a:'}
                            </p>
                            <p className="text-lg font-black text-slate-900 dark:text-white mb-2">{selectedItem?.profiles?.full_name}</p>
                            <span className="text-base font-black text-emerald-600 dark:text-emerald-400">{selectedItem?.price} IURIS</span>
                         </div>
                         <textarea className="input-modern h-32" placeholder={selectedItem?.section === 'trabajos' ? "Explica por qué eres el indicado..." : "Instrucciones del trabajo..."} onChange={e => setFormRequest({...formRequest, note: e.target.value})}/>
                         <label className="file-upload-modern border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                            <Upload className="mx-auto mb-2 text-slate-400"/>
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{formRequest.file ? formRequest.file.name : "Archivo (Opcional)"}</span>
                            <input type="file" className="hidden" onChange={e => setFormRequest({...formRequest, file: e.target.files[0]})}/>
                        </label>
                        <button onClick={sendWorkRequest} disabled={loading} className="btn-modern bg-slate-900 dark:bg-white dark:text-slate-900">
                            {selectedItem?.section === 'trabajos' ? 'ENVIAR POSTULACIÓN' : 'PAGAR Y SOLICITAR'}
                        </button>
                    </div>
                )}

                {/* 3. ENTREGAR TRABAJO (NUEVO MODAL) */}
                {showModal === 'deliver' && (
                    <div className="space-y-4">
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                             <h4 className="font-black text-indigo-700 dark:text-indigo-400 text-sm uppercase mb-1">Entregable Final</h4>
                             <p className="text-xs text-slate-600 dark:text-slate-300">Sube el documento final para que el cliente lo revise y libere el pago.</p>
                        </div>

                        <textarea 
                            className="input-modern h-32" 
                            placeholder="Comentarios sobre la entrega (Ej: Aquí adjunto el resumen finalizado...)" 
                            onChange={e => setDeliveryForm({...deliveryForm, note: e.target.value})}
                        />

                        <label className="file-upload-modern border-indigo-200 dark:border-indigo-800 bg-indigo-50/50">
                            <Upload className="mx-auto mb-2 text-indigo-500"/>
                            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                {deliveryForm.file ? deliveryForm.file.name : "Subir Archivo Final (PDF/Word)"}
                            </span>
                            <input type="file" className="hidden" onChange={e => setDeliveryForm({...deliveryForm, file: e.target.files[0]})}/>
                        </label>

                        <button onClick={deliverWork} disabled={loading} className="btn-modern bg-indigo-600 text-white">
                            {loading ? <Loader2 className="animate-spin"/> : 'ENVIAR ENTREGA PARA REVISIÓN'}
                        </button>
                    </div>
                )}

                {/* 4. RECARGAR (TOPUP) */}
                {showModal === 'topup' && (
                    <div className="space-y-6 text-center">
                        <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700">
                            <label className="label-modern text-center mb-4">Monto Transferido (Gs)</label>
                            <div className="flex items-center justify-center gap-1">
                                <span className="text-3xl text-slate-300 font-light">$</span>
                                <input type="number" className="w-40 bg-transparent text-5xl font-black text-center text-emerald-500 outline-none placeholder:text-slate-200 dark:placeholder:text-slate-700" placeholder="0" onChange={e => setTopUpAmount(e.target.value)}/>
                            </div>
                            <p className="text-xs text-slate-400 font-bold mt-2">Recuerda: 1.000 Gs = 1 IURIS-COIN</p>
                        </div>
                        <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl text-xs text-amber-700 dark:text-amber-400 font-bold border border-amber-100 dark:border-amber-800 flex items-center gap-2">
                            <AlertCircle size={16}/>
                            Transfiere el monto exacto a la cuenta Atlas indicada en tu billetera.
                        </div>
                        <label className="file-upload-modern border-emerald-500/30 bg-emerald-500/10">
                             <Camera className="mx-auto mb-2 text-emerald-500" size={32}/>
                             <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 px-4 block">
                                {topUpFile ? topUpFile.name : "SUBIR COMPROBANTE"}
                             </span>
                             <input type="file" className="hidden" onChange={e => setTopUpFile(e.target.files[0])}/>
                        </label>
                        <button onClick={requestTopUp} disabled={loading} className="btn-modern bg-emerald-600 hover:bg-emerald-700">
                            {loading ? 'Enviando...' : 'INFORMAR TRANSFERENCIA'}
                        </button>
                    </div>
                )}

                {/* 5. RETIRAR */}
                {showModal === 'withdraw' && (
                    <div className="space-y-4">
                        <div className="grid gap-4">
                            <div><label className="label-modern">Banco</label><input className="input-modern" placeholder="Ej: Banco Atlas" onChange={e => setWithdrawForm({...withdrawForm, bank_name: e.target.value})}/></div>
                            <div><label className="label-modern">Nº Cuenta</label><input className="input-modern" placeholder="00-123456" onChange={e => setWithdrawForm({...withdrawForm, account_number: e.target.value})}/></div>
                            <div><label className="label-modern">Titular</label><input className="input-modern" placeholder="Nombre completo" onChange={e => setWithdrawForm({...withdrawForm, account_holder: e.target.value})}/></div>
                            <div className="flex gap-3">
                                <div className="flex-1"><label className="label-modern">C.I.</label><input className="input-modern" placeholder="1.234.567" onChange={e => setWithdrawForm({...withdrawForm, holder_ci: e.target.value})}/></div>
                                <div className="flex-1"><label className="label-modern">Celular</label><input className="input-modern" placeholder="09xx..." onChange={e => setWithdrawForm({...withdrawForm, phone_number: e.target.value})}/></div>
                            </div>
                        </div>
                        <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800">
                            <label className="label-modern text-amber-500">Monto a Retirar</label>
                            <input type="number" className="input-modern bg-amber-50 dark:bg-amber-900/10 text-amber-600 border-amber-200 dark:border-amber-800" placeholder="0" onChange={e => setWithdrawForm({...withdrawForm, amount: e.target.value})}/>
                        </div>
                        <button onClick={requestWithdraw} disabled={loading} className="btn-modern bg-slate-900 dark:bg-white dark:text-slate-900">SOLICITAR RETIRO</button>
                    </div>
                )}
            </div>
        </div>
      )}

      {/* CSS CLASSES */}
      <style>{`
        .label-modern { display: block; font-size: 0.65rem; font-weight: 900; color: #94a3b8; text-transform: uppercase; margin-bottom: 0.5rem; margin-left: 0.25rem; letter-spacing: 0.05em; }
        .input-modern { width: 100%; padding: 1rem; border-radius: 1rem; outline: none; font-size: 0.875rem; font-weight: 700; border: 2px solid transparent; transition: all 0.2s; }
        .bg-slate-50 .input-modern { background-color: #f8fafc; color: #0f172a; }
        .dark .input-modern { background-color: #1e293b; color: white; }
        .input-modern:focus { border-color: #6366f1; background-color: white; }
        .dark .input-modern:focus { background-color: #0f172a; }
        
        .file-upload-modern { display: block; width: 100%; padding: 1.5rem; border: 2px dashed #e2e8f0; border-radius: 1rem; text-align: center; cursor: pointer; transition: all 0.2s; background-color: rgba(99, 102, 241, 0.05); }
        .dark .file-upload-modern { border-color: #1e293b; background-color: rgba(99, 102, 241, 0.1); }
        .file-upload-modern:hover { background-color: rgba(99, 102, 241, 0.1); }
        
        .btn-modern { width: 100%; padding: 1rem; font-weight: 900; font-size: 0.75rem; letter-spacing: 0.1em; border-radius: 1rem; text-transform: uppercase; display: flex; align-items: center; justify-content: center; gap: 0.5rem; transition: transform 0.1s; }
        .btn-modern:active { transform: scale(0.98); }
      `}</style>
    </div>
  )
}