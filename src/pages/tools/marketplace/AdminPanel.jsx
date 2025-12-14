import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
// USAMOS ICONOS BÁSICOS PARA EVITAR ERRORES DE VERSIÓN
import { 
  Check, X, AlertTriangle, Loader2, Search, 
  ArrowUp, ArrowDown, Wallet, User, Calendar, 
  Lock, LogOut 
} from 'lucide-react'

// 🔐 CONFIGURACIÓN DE SEGURIDAD
const ADMIN_PASSWORD = "admin" 
const MAX_ATTEMPTS = 3
const LOCKOUT_TIME = 5 * 60 * 1000 

export default function AdminPanel() {
  const navigate = useNavigate()

  // ESTADOS
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [inputPass, setInputPass] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [lockoutUntil, setLockoutUntil] = useState(null)
  
  const [loading, setLoading] = useState(false)
  const [requests, setRequests] = useState([])
  const [processingId, setProcessingId] = useState(null)
  const [filter, setFilter] = useState('pending')

  // 1. CHEQUEO DE BLOQUEO
  useEffect(() => {
    const storedLockout = localStorage.getItem('admin_lockout')
    if (storedLockout && new Date().getTime() < parseInt(storedLockout)) {
      setLockoutUntil(parseInt(storedLockout))
    }
  }, [])

  // 2. CARGAR DATOS
  useEffect(() => {
    if (isUnlocked) fetchRequests()
  }, [isUnlocked, filter])

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('payment_requests')
        .select('*, profiles(full_name, email, balance, is_verified, avatar_url)')
        .eq('status', filter)
        .order('created_at', { ascending: false })

      if (error) throw error
      setRequests(data || [])
    } catch (error) {
      console.error("Error Admin:", error.message)
    }
    setLoading(false)
  }

  // --- LOGIN ---
  const handleUnlock = (e) => {
    e.preventDefault()
    if (lockoutUntil) {
      if (new Date().getTime() < lockoutUntil) return setErrorMsg(`Sistema bloqueado.`)
      setLockoutUntil(null)
      localStorage.removeItem('admin_lockout')
      setAttempts(0)
    }

    if (inputPass === ADMIN_PASSWORD) {
      setIsUnlocked(true)
      setErrorMsg('')
    } else {
      const newAttempts = attempts + 1
      setAttempts(newAttempts)
      if (newAttempts >= MAX_ATTEMPTS) {
        const lockTime = new Date().getTime() + LOCKOUT_TIME
        setLockoutUntil(lockTime)
        localStorage.setItem('admin_lockout', lockTime.toString())
        setErrorMsg("⛔ BLOQUEADO POR 5 MINUTOS.")
      } else {
        setErrorMsg(`Clave incorrecta.`)
      }
    }
  }

  // --- APROBAR ---
  const handleApprove = async (req) => {
    if (!confirm(`¿Aprobar transacción de ${req.amount} Gs?`)) return
    setProcessingId(req.id)
    try {
      const { error } = await supabase.rpc('approve_wallet_transaction', { p_request_id: req.id })
      if (error) throw error
      alert("¡Aprobado!")
      fetchRequests() 
    } catch (error) {
      alert("Error: " + error.message)
    }
    setProcessingId(null)
  }

  // --- RECHAZAR ---
  const handleReject = async (id) => {
    if (!confirm("¿Rechazar solicitud?")) return
    setProcessingId(id)
    try {
      await supabase.from('payment_requests').update({ status: 'rejected' }).eq('id', id)
      fetchRequests()
    } catch (error) { alert("Error: " + error.message) }
    setProcessingId(null)
  }

  // VISTA BLOQUEADA
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 p-8 rounded-[2rem] shadow-2xl w-full max-w-md border border-slate-700 text-center">
          <div className="bg-slate-700 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            {lockoutUntil ? <AlertTriangle size={40} className="text-red-500 animate-pulse"/> : <Lock size={40} className="text-indigo-400"/>}
          </div>
          <h1 className="text-2xl font-black text-white mb-2">ACCESO RESTRINGIDO</h1>
          <form onSubmit={handleUnlock} className="space-y-4">
            <input type="password" value={inputPass} onChange={(e) => setInputPass(e.target.value)} placeholder="Clave Maestra" className="w-full p-4 bg-slate-900 rounded-xl text-white text-center tracking-[0.5em] font-black outline-none border-2 border-slate-600 focus:border-indigo-500" disabled={!!lockoutUntil}/>
            {errorMsg && <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-red-400 text-xs font-bold">{errorMsg}</div>}
            <button disabled={!!lockoutUntil} type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-600 text-white font-black rounded-xl shadow-lg uppercase tracking-widest">{lockoutUntil ? 'BLOQUEADO' : 'DESBLOQUEAR'}</button>
          </form>
        </div>
      </div>
    )
  }

  // VISTA DESBLOQUEADA
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans pb-20">
      <header className="bg-slate-900 text-white sticky top-0 z-30 px-6 py-4 shadow-xl flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 hover:bg-white/10 rounded-full"><ArrowDown size={20} className="rotate-90" /></button>
          <div><h1 className="font-black text-xl tracking-tight flex items-center gap-2"><Wallet className="text-emerald-400"/> PANEL</h1></div>
        </div>
        <button onClick={() => setIsUnlocked(false)} className="bg-slate-800 p-2 rounded-lg text-xs font-bold flex items-center gap-2 text-slate-300 border border-slate-700"><LogOut size={16}/> SALIR</button>
      </header>

      <main className="max-w-3xl mx-auto p-6">
        <div className="flex gap-2 mb-8 bg-white dark:bg-slate-900 p-1.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
            {['pending', 'approved', 'rejected'].map(f => (
                <button key={f} onClick={() => setFilter(f)} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider ${filter === f ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    {f === 'pending' ? 'Pendientes' : f === 'approved' ? 'Aprobados' : 'Rechazados'}
                </button>
            ))}
        </div>

        {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-slate-400" size={40}/></div> : 
         requests.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                <Search size={48} className="mx-auto text-slate-200 dark:text-slate-700 mb-4"/>
                <p className="text-slate-400 font-bold">No hay solicitudes.</p>
            </div>
        ) : (
            <div className="space-y-4">
                {requests.map(req => {
                    // PROTECCIÓN CONTRA USUARIOS FANTASMA (Si profiles es null, usamos valores por defecto)
                    const user = req.profiles || { full_name: 'Usuario Eliminado', email: 'Sin email', balance: 0, avatar_url: null };

                    return (
                    <div key={req.id} className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden">
                        <div className={`absolute left-0 top-0 bottom-0 w-2 ${req.type === 'deposit' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                        <div className="flex flex-col sm:flex-row justify-between gap-6 pl-4">
                            <div className="flex-1">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 ${req.type === 'deposit' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {req.type === 'deposit' ? <ArrowDown size={12}/> : <ArrowUp size={12}/>}
                                    {req.type === 'deposit' ? 'Recarga' : 'Retiro'}
                                </span>
                                <div className="flex items-center gap-4 mb-4">
                                    <img src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.email}&background=random`} className="w-12 h-12 rounded-2xl object-cover bg-slate-100"/>
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-white text-lg leading-none mb-1">{user.full_name}</p>
                                        <p className="text-xs text-slate-500 font-medium">{user.email}</p>
                                        <p className="text-xs text-indigo-500 font-black mt-1">Saldo: {user.balance} IURIS</p>
                                    </div>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-700/50">
                                    {req.type === 'deposit' ? (
                                        <div className="flex items-center gap-4">
                                            {req.proof_url ? (
                                                <a href={req.proof_url} target="_blank" rel="noopener noreferrer" className="w-20 h-20 bg-slate-200 rounded-xl overflow-hidden block border border-slate-300 relative">
                                                    <img src={req.proof_url} className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 text-white font-bold text-[10px]">VER</div>
                                                </a>
                                            ) : <div className="w-20 h-20 bg-slate-100 rounded-xl flex items-center justify-center text-[8px] font-bold text-slate-400 text-center">SIN FOTO</div>}
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Declarado</p>
                                                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{req.amount} Gs</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                                            <div className="col-span-2"><p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Retirar</p><p className="text-2xl font-black text-amber-600 dark:text-amber-400">{req.amount} Gs</p></div>
                                            <div><p className="text-[10px] uppercase font-bold text-slate-400">Banco</p><p className="font-bold dark:text-white">{req.bank_name}</p></div>
                                            <div><p className="text-[10px] uppercase font-bold text-slate-400">Cuenta</p><p className="font-mono font-bold dark:text-white">{req.account_number}</p></div>
                                            <div><p className="text-[10px] uppercase font-bold text-slate-400">CI</p><p className="font-bold dark:text-white">{req.holder_ci}</p></div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {req.status === 'pending' && (
                                <div className="flex flex-col justify-center gap-3 sm:w-40 border-t sm:border-t-0 sm:border-l border-slate-100 dark:border-slate-800 pt-4 sm:pt-0 sm:pl-6">
                                    <button onClick={() => handleApprove(req)} disabled={processingId === req.id} className="w-full py-4 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-wider hover:scale-105 transition shadow-xl disabled:opacity-50 flex items-center justify-center gap-2">{processingId === req.id ? <Loader2 className="animate-spin"/> : <Check size={16}/>} Aprobar</button>
                                    <button onClick={() => handleReject(req.id)} disabled={processingId === req.id} className="w-full py-4 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-red-100 transition disabled:opacity-50 flex items-center justify-center gap-2"><X size={16}/> Rechazar</button>
                                </div>
                            )}
                            {req.status !== 'pending' && (
                                <div className="flex items-center justify-center sm:w-40 border-t sm:border-t-0 sm:border-l border-slate-100 dark:border-slate-800 pt-4 sm:pt-0 sm:pl-6">
                                    <span className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest ${req.status === 'approved' ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' : 'bg-red-50 text-red-400'}`}>{req.status === 'approved' ? 'Procesado' : 'Rechazado'}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )})}
            </div>
        )}
      </main>
    </div>
  )
}