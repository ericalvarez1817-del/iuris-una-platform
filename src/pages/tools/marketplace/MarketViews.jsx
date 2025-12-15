import { 
  Search, Plus, CheckCircle2, Trash2, FileText, 
  Paperclip, Briefcase, Landmark, ShieldCheck, 
  Star, Download, Camera, Loader2, Clock, ArrowUpRight, ArrowDownLeft, Copy, CreditCard,
  Briefcase as BriefcaseIcon, Hammer, Upload, AlertTriangle
} from 'lucide-react'

// --- UTILIDADES ---
const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-PY').format(amount || 0)
}

const formatDate = (dateString) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('es-PY')
}

// DATOS BANCARIOS ADMIN
const ADMIN_BANK_INFO = {
    banco: "Banco Atlas",
    cuenta: "1749426",
    titular: "Eric Alvarez",
    ci: "5.948.371"
}

// --- COMPONENTES AUXILIARES ---

const EmptyState = ({ icon: Icon, title, description }) => (
    <div className="text-center py-20 px-6 rounded-3xl bg-slate-50 dark:bg-slate-900/50 border-2 border-dashed border-slate-200 dark:border-slate-800 animate-fade-in">
        <div className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500 dark:text-indigo-400 w-20 h-20 rounded-[2rem] rotate-3 flex items-center justify-center mx-auto mb-6 shadow-sm transition hover:rotate-6 hover:scale-105">
            <Icon size={32} strokeWidth={2.5} className="-rotate-3"/>
        </div>
        <h3 className="text-xl font-black text-slate-800 dark:text-white mb-3">{title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed font-medium">
            {description}
        </p>
    </div>
)

const StarRating = ({ rating, size = 12 }) => (
  <div className="flex text-amber-400">
    {[...Array(5)].map((_, i) => (
      <Star key={i} size={size} fill={i < Math.round(rating) ? "currentColor" : "none"} />
    ))}
  </div>
)

// --- TARJETA DE ITEM DE MERCADO ---
function MarketItemCard({ item, currentUserId, onDelete, onRequestClick, section }) {
    const isService = section === 'servicios' 

    // Protección de datos nulos
    const ownerName = item.profiles?.full_name || item.profiles?.email?.split('@')[0] || 'Usuario'
    const ownerReputation = item.profiles?.reputation || 5
    const ownerAvatar = item.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${ownerName}&background=random`

    return (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm relative mb-6 transition hover:shadow-md group">
             {/* BOTÓN BORRAR (SOLO DUEÑO) */}
             {item.owner_id === currentUserId && (
                <button onClick={() => onDelete(item.id)} className="absolute top-5 right-5 text-slate-300 hover:text-red-500 bg-slate-100 dark:bg-slate-800 p-2 rounded-full transition opacity-0 group-hover:opacity-100 z-10">
                    <Trash2 size={16} />
                </button>
             )}
             
             {/* HEADER USUARIO */}
             <div className="flex items-center gap-4 mb-5">
               <img src={ownerAvatar} alt="Avatar" className="w-12 h-12 rounded-2xl object-cover shadow-sm bg-slate-100" />
               <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{ownerName}</p>
                    {item.profiles?.is_verified && <CheckCircle2 size={14} className="text-blue-500 fill-blue-500 text-white" />}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                      <StarRating rating={ownerReputation} />
                      <span className="text-[10px] text-slate-400 font-bold">({ownerReputation} rep)</span>
                  </div>
               </div>
            </div>

            {/* CONTENIDO */}
            <div className="mb-4">
                <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-3 ${isService ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400'}`}>
                    {isService ? 'Oferta de Servicio' : 'Solicitud de Trabajo'}
                </span>
                <h3 className="font-black text-slate-800 dark:text-white text-xl leading-tight mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-7">{item.description}</p>
            </div>
            
            {item.file_url && (
                <a href={item.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 bg-slate-50 dark:bg-slate-800 px-5 py-3 rounded-2xl text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-5 hover:bg-indigo-50 dark:hover:bg-slate-700 transition border border-slate-200 dark:border-slate-700 hover:border-indigo-200 group/file">
                    <div className="bg-white dark:bg-slate-700 p-1.5 rounded-lg group-hover/file:scale-110 transition">
                        <Download size={16} />
                    </div>
                    Ver Archivo Adjunto
                </a>
            )}
            
            {/* FOOTER PRECIO/ACCIÓN */}
            <div className="flex items-end justify-between border-t border-slate-100 dark:border-slate-800 pt-5">
              <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Presupuesto</span>
                  <div className="font-black text-2xl text-emerald-600 dark:text-emerald-400 flex items-baseline gap-1">
                      {formatMoney(item.price)} <span className="text-xs text-slate-400 font-bold">IURIS</span>
                  </div>
              </div>
              
              <div>
                  {item.owner_id !== currentUserId ? (
                      <button onClick={() => onRequestClick(item)} className={`px-6 py-4 rounded-2xl text-xs font-black shadow-xl shadow-slate-200 dark:shadow-none hover:scale-[1.02] transition active:scale-95 tracking-widest text-white ${isService ? 'bg-slate-900 dark:bg-white dark:text-slate-900' : 'bg-indigo-600'}`}>
                          {isService ? 'CONTRATAR' : 'POSTULARME'}
                      </button>
                  ) : (
                      <div className="px-4 py-4 bg-slate-50 dark:bg-slate-800 text-slate-400 text-xs font-bold rounded-2xl border border-slate-100 dark:border-slate-700">
                          (Es tu Publicación)
                      </div>
                  )}
              </div>
            </div>
        </div>
    )
}

// --- VISTA 1: FEED (MERCADO) ---
export function FeedView({ items = [], section, setSection, onPublishClick, onRequestClick, onDelete, currentUserId }) {
  return (
    <div className="space-y-4 animate-fade-in pb-24">
      {/* TABS SERVICIOS / TRABAJOS */}
      <div className="flex bg-slate-200 dark:bg-slate-800 p-1.5 rounded-2xl mb-6 sticky top-20 z-20 backdrop-blur-md bg-opacity-90">
        <button onClick={() => setSection('servicios')} className={`flex-1 py-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${section === 'servicios' ? 'bg-white dark:bg-slate-700 shadow-md text-indigo-700 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
            <BriefcaseIcon size={14}/> OFERTAS (Servicios)
        </button>
        <button onClick={() => setSection('trabajos')} className={`flex-1 py-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${section === 'trabajos' ? 'bg-white dark:bg-slate-700 shadow-md text-amber-700 dark:text-amber-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
            <Hammer size={14}/> DEMANDAS (Trabajos)
        </button>
      </div>

      {!items || items.length === 0 ? (
        <EmptyState 
            icon={Search} 
            title="Sin publicaciones" 
            description={section === 'servicios' ? "Nadie ofrece servicios por ahora. ¡Sé el primero!" : "No hay solicitudes de trabajo activas."}
        />
      ) : (
        items.map(item => (
            <MarketItemCard 
                key={item.id} 
                item={item} 
                section={section} 
                currentUserId={currentUserId} 
                onDelete={onDelete} 
                onRequestClick={onRequestClick}
            />
        ))
      )}
      
      {/* FAB (BOTÓN FLOTANTE) */}
      <button onClick={onPublishClick} className="fixed bottom-24 right-6 bg-slate-900 dark:bg-indigo-600 text-white p-4 rounded-[2rem] shadow-2xl hover:scale-110 transition active:scale-95 z-30 hover:rotate-90 duration-300 border-[6px] border-slate-50 dark:border-slate-950 ring-4 ring-indigo-500/20">
          <Plus size={28} strokeWidth={3} />
      </button>
    </div>
  )
}

// --- VISTA 2: BUZÓN (INBOX - CORREGIDO) ---
export function InboxView({ requests = [], currentUserId, onAccept, onReject, onComplete, onDeliver }) {
  return (
    <div className="space-y-6 animate-fade-in pb-24">
      <h2 className="font-black text-slate-800 dark:text-white mb-6 text-2xl px-2">Gestión de Contratos</h2>
      
      {!requests || requests.length === 0 ? (
          <EmptyState 
            icon={Briefcase} 
            title="Buzón vacío" 
            description="No tienes contrataciones ni postulaciones en curso."
          />
      ) : (
          requests.map(req => {
            const isIncoming = req.to_id === currentUserId; 
            const partner = isIncoming ? req.from_profile : req.to_profile;
            
            // Protección contra items borrados
            const itemSection = req.item_data?.section;
            const itemTitle = req.item_data?.title || 'Publicación eliminada';
            const isService = itemSection === 'servicios';
            
            const partnerName = partner?.full_name || partner?.email?.split('@')[0] || 'Usuario';
            const partnerAvatar = partner?.avatar_url || `https://ui-avatars.com/api/?name=${partnerName}&background=random`;

            // Roles
            const amIClient = (isService && !isIncoming) || (!isService && isIncoming);
            const amIWorker = (isService && isIncoming) || (!isService && !isIncoming);
            
            // --- ETIQUETAS INTELIGENTES ---
            let statusLabel = 'PENDIENTE';
            let statusColor = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';

            if (req.status === 'completed') {
                statusLabel = 'FINALIZADO';
                statusColor = 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            } else if (req.status === 'rejected') {
                statusLabel = 'CANCELADO';
                statusColor = 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            } else if (req.status === 'delivered') {
                statusLabel = 'ENTREGADO (REVISIÓN)';
                statusColor = 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            } else if (req.status === 'accepted') {
                statusLabel = 'EN PROCESO';
                statusColor = 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400';
            }

            // Barra lateral de color
            const barBaseColor = statusColor.split(' ')[0];

            return (
              <div key={req.id} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm mb-4 overflow-hidden relative group">
                  {/* Barra lateral de estado */}
                  <div className={`absolute top-0 left-0 w-1.5 h-full ${barBaseColor}`}></div>
                  
                  {/* CONTENEDOR INTERNO - INICIO */}
                  <div className="pl-4">
                    <div className="flex justify-between mb-4 items-center">
                            <span className={`text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest ${statusColor}`}>
                                {statusLabel}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><Clock size={12}/> {formatDate(req.created_at)}</span>
                    </div>
                    
                    <h3 className="font-black text-lg text-slate-800 dark:text-white mb-1 leading-tight">{itemTitle}</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                        Monto custodiado: <span className="text-emerald-500">{formatMoney(req.price_locked)} IURIS</span>
                    </p>
                    
                    <div className="flex items-center gap-3 mb-5 bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                        <img src={partnerAvatar} alt="Partner" className="w-10 h-10 rounded-full object-cover bg-slate-200" />
                        <div>
                            <p className="text-[9px] uppercase font-bold text-slate-400 mb-0.5">
                                {amIClient ? 'Trabajador:' : 'Cliente:'}
                            </p>
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                {partnerName}
                            </p>
                        </div>
                    </div>
                    
                    {/* NOTA INICIAL / REQUISITOS */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl mb-5 border border-slate-100 dark:border-slate-700/50 relative">
                        <div className="text-slate-300 absolute top-2 left-2 opacity-50"><FileText size={20}/></div>
                        <p className="text-sm italic text-slate-600 dark:text-slate-300 pl-8 relative z-10 leading-relaxed break-words">"{req.note}"</p>
                        
                        {req.file_url && (
                            <a href={req.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold bg-white dark:bg-slate-700 p-3 rounded-xl border border-slate-200 dark:border-slate-600 hover:opacity-80 transition mt-4 shadow-sm w-fit">
                                <Paperclip size={16} /> Ver Requisitos
                            </a>
                        )}
                    </div>

                    {/* --- ZONA DE ENTREGA (VISUAL) --- */}
                    {req.status === 'delivered' && (
                        <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-2xl mb-5 border border-emerald-100 dark:border-emerald-800/50 animate-in zoom-in-95">
                            <div className="flex items-center gap-2 mb-2">
                                <CheckCircle2 size={18} className="text-emerald-500"/>
                                <p className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400">Trabajo Entregado</p>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-300 mb-3 break-words">"{req.delivery_note}"</p>
                            
                            {req.delivery_file_url ? (
                                <a href={req.delivery_file_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 text-xs font-bold py-3 rounded-xl border border-emerald-200 dark:border-emerald-700 shadow-sm hover:scale-[1.02] transition">
                                    <Download size={16} /> DESCARGAR ENTREGABLE
                                </a>
                            ) : (
                                <p className="text-xs text-red-400 italic font-bold bg-red-50 p-2 rounded-lg inline-block">Error: No se adjuntó archivo.</p>
                            )}
                        </div>
                    )}

                    {/* --- ZONA DE ACCIONES (DINÁMICA) --- */}
                    <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        
                        {/* 1. NEGOCIACIÓN (Solo receptor) */}
                        {isIncoming && (req.status === 'pending' || req.status === 'postulation') && (
                            <div className="flex flex-col gap-2">
                                {!isService && (
                                    <p className="text-xs text-center text-slate-500 mb-1 flex items-center justify-center gap-1">
                                        <AlertTriangle size={12}/> Al aceptar, se bloquearán los fondos de tu billetera.
                                    </p>
                                )}
                                <div className="flex gap-3">
                                    <button onClick={() => onReject(req.id)} className="flex-1 py-3.5 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 text-xs font-black rounded-2xl hover:bg-red-100 dark:hover:bg-red-900/30 transition border border-red-100 dark:border-red-900/50">
                                        RECHAZAR
                                    </button>
                                    <button onClick={() => onAccept(req)} className="flex-1 py-3.5 bg-emerald-600 text-white text-xs font-black rounded-2xl shadow-lg shadow-emerald-200 dark:shadow-none hover:bg-emerald-700 transition tracking-wider">
                                        {isService ? 'ACEPTAR TRABAJO' : 'CONTRATAR (PAGAR)'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* 2. TRABAJADOR: ENTREGAR */}
                        {amIWorker && req.status === 'accepted' && (
                            <button onClick={() => onDeliver(req)} className="w-full py-4 bg-indigo-600 text-white text-xs font-black rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition tracking-wider flex items-center justify-center gap-2 animate-pulse">
                                <Upload size={18}/> ENTREGAR TRABAJO FINAL
                            </button>
                        )}

                        {/* 3. CLIENTE: ESPERANDO */}
                        {amIClient && req.status === 'accepted' && (
                             <p className="text-center text-xs text-slate-400 font-bold py-2 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                <Loader2 size={12} className="inline animate-spin mr-2"/>
                                Esperando entrega del trabajador...
                            </p>
                        )}

                        {/* 4. CLIENTE: REVISIÓN Y PAGO */}
                        {amIClient && req.status === 'delivered' && (
                             <div className="space-y-2 mt-2">
                                <p className="text-xs text-center text-slate-500">Revisa el archivo. Si todo está correcto, libera el pago.</p>
                                <div className="flex gap-3">
                                    <button onClick={() => alert("Función de reclamo en desarrollo. Contacta a soporte.")} className="flex-1 py-3 bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 text-xs font-black rounded-xl hover:bg-slate-200 transition">
                                        RECLAMAR
                                    </button>
                                    <button onClick={() => onComplete(req)} className="flex-[2] py-3 bg-emerald-500 text-white text-xs font-black rounded-xl shadow-lg shadow-emerald-200 dark:shadow-none hover:bg-emerald-600 transition tracking-wider flex items-center justify-center gap-2">
                                        <CheckCircle2 size={16}/> APROBAR Y PAGAR
                                    </button>
                                </div>
                             </div>
                        )}
                        
                        {/* 5. TRABAJADOR: ESPERANDO APROBACIÓN */}
                        {amIWorker && req.status === 'delivered' && (
                            <p className="text-center text-xs text-emerald-600 dark:text-emerald-400 font-bold py-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800">
                                <Clock size={12} className="inline mr-2"/>
                                Entregado. Esperando liberación de fondos por el cliente.
                            </p>
                        )}

                        {/* 6. FINALIZADO */}
                        {req.status === 'completed' && (
                            <p className="text-center text-xs text-green-600 dark:text-green-400 font-black uppercase flex items-center justify-center gap-2 bg-green-50 dark:bg-green-900/20 py-3 rounded-2xl border border-green-200 dark:border-green-800">
                                <CheckCircle2 size={16} className="fill-green-600 text-white dark:text-slate-900"/> Transacción Finalizada
                            </p>
                        )}
                  </div> 
                  {/* CIERRE DE ZONA DE ACCIONES */}

                  </div> 
                  {/* --- CORRECCIÓN AQUÍ: CIERRE DEL CONTENEDOR INTERNO (pl-4) QUE FALTABA --- */}

              </div>
            )
          })
      )}
    </div>
  )
}

// --- VISTA 3: BILLETERA (IURIS-COIN) ---
export function WalletView({ profile, paymentRequests = [], onTopUp, onWithdraw }) {
    return (
        <div className="space-y-8 animate-scale-in pb-24">
            
            {/* TARJETA DE SALDO PREMIUM */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 text-white p-8 rounded-[2.5rem] shadow-2xl text-center relative overflow-hidden ring-4 ring-slate-100 dark:ring-slate-800 group">
                <div className="relative z-10">
                    <p className="text-sm text-indigo-200 font-bold uppercase tracking-widest mb-3 flex items-center justify-center gap-2"><Landmark size={16}/> Tu Saldo Disponible</p>
                    <h2 className="text-6xl sm:text-7xl font-black mb-4 tracking-tighter tabular-nums">{formatMoney(profile?.balance)}</h2>
                    <p className="text-sm text-emerald-300 font-black bg-emerald-400/10 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-400/20 shadow-inner">
                        <CreditCard size={16}/> IURIS-COIN
                    </p>
                </div>
                {/* Decoración Dinámica */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl group-hover:bg-indigo-500/30 transition-all duration-500"></div>
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all duration-500"></div>
            </div>

            {/* BOTONES ACCIÓN GRANDES */}
            <div className="grid grid-cols-2 gap-5">
                <button onClick={onTopUp} className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] flex flex-col items-center gap-4 border-2 border-slate-100 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500 hover:shadow-xl transition group relative overflow-hidden">
                    <div className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 p-4 rounded-2xl shadow-sm group-hover:scale-110 transition relative z-10">
                        <ArrowDownLeft size={32} strokeWidth={2.5} />
                    </div>
                    <span className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider relative z-10">Cargar Saldo</span>
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-900/10 opacity-0 group-hover:opacity-100 transition"></div>
                </button>
                
                <button onClick={onWithdraw} className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] flex flex-col items-center gap-4 border-2 border-slate-100 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-xl transition group relative overflow-hidden">
                    <div className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 p-4 rounded-2xl shadow-sm group-hover:scale-110 transition relative z-10">
                        <ArrowUpRight size={32} strokeWidth={2.5} />
                    </div>
                    <span className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider relative z-10">Retirar Dinero</span>
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-transparent dark:from-indigo-900/10 opacity-0 group-hover:opacity-100 transition"></div>
                </button>
            </div>
            
            {/* TARJETA DATOS BANCARIOS OFICIALES */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-950 p-6 rounded-3xl text-left text-white shadow-xl ring-1 ring-slate-900/5 mx-2 cursor-pointer group select-all">
                {/* Patrón de fondo sutil */}
                <div className="absolute top-0 right-0 -mt-8 -mr-8 text-white/5 rotate-12 group-hover:rotate-6 transition duration-700"><Landmark size={140} /></div>

                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2 bg-slate-900/50 p-2 rounded-xl pr-4 backdrop-blur-md">
                            <ShieldCheck size={20} className="text-indigo-300 fill-indigo-900/50"/>
                            <span className="text-xs font-black uppercase tracking-widest text-indigo-100">Cuenta Oficial</span>
                        </div>
                         <span className="text-[10px] bg-white/10 px-3 py-1.5 rounded-full flex items-center gap-1.5 text-indigo-100 font-bold group-active:bg-white/20 transition">
                            <Copy size={12}/> Copiar Datos
                         </span>
                    </div>

                    <div className="space-y-5">
                        <div>
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1.5 flex items-center gap-1"><Landmark size={10}/> Banco Destino</p>
                            <p className="text-2xl font-black tracking-tight text-white">{ADMIN_BANK_INFO.banco}</p>
                        </div>
                         <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1.5">Nº de Cuenta (Guaraníes)</p>
                            <p className="text-3xl font-mono font-bold text-indigo-300 tracking-widest tabular-nums">{ADMIN_BANK_INFO.cuenta}</p>
                        </div>
                        <div className="flex gap-6 pt-2">
                             <div>
                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Titular</p>
                                <p className="text-sm font-bold text-indigo-100">{ADMIN_BANK_INFO.titular}</p>
                            </div>
                             <div>
                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Doc. Identidad</p>
                                <p className="text-sm font-bold text-indigo-100">{ADMIN_BANK_INFO.ci}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* LISTA HISTORIAL */}
            <div>
                <h3 className="font-black text-xl mb-5 dark:text-white flex items-center gap-2 px-2">Últimos Movimientos</h3>
                <div className="space-y-3">
                    {(!paymentRequests || paymentRequests.length === 0) ? (
                         <EmptyState 
                            icon={Clock} 
                            title="Sin movimientos" 
                            description="Aún no has realizado cargas ni retiros de saldo."
                        />
                    ) : (
                        paymentRequests.map(req => (
                        <div key={req.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex justify-between items-center shadow-sm transition hover:shadow-md">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-xl ${req.type === 'deposit' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                                    {req.type === 'deposit' ? <ArrowDownLeft size={20} strokeWidth={2.5}/> : <ArrowUpRight size={20} strokeWidth={2.5}/>}
                                </div>
                                <div>
                                    <p className="text-sm font-black dark:text-white uppercase tracking-wide">{req.type === 'deposit' ? 'Carga de Saldo' : 'Retiro de Fondos'}</p>
                                    <p className="text-[11px] text-slate-400 font-bold flex items-center gap-1 mt-0.5"><Clock size={10}/> {formatDate(req.created_at)}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={`text-lg font-black mb-1 ${req.type === 'deposit' ? 'text-green-600 dark:text-green-400' : 'text-slate-800 dark:text-white'}`}>
                                    {req.type === 'deposit' ? '+' : '-'}{formatMoney(req.amount)}
                                </p>
                                <span className={`text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider ${req.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : req.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 dark:bg-slate-800 dark:text-slate-300'}`}>
                                    {req.status === 'pending' ? 'En Revisión' : req.status === 'approved' ? 'Aprobado' : req.status}
                                </span>
                            </div>
                        </div>
                    )))}
                </div>
            </div>
        </div>
    )
}

// --- VISTA 4: PERFIL (TODO REDONDEADO Y MODERNO) ---
export function ProfileView({ profile, setProfileData, onSave, onVerify, onUploadAvatar, uploading }) {
    // Protección por si profile es null inicialmente
    const profileName = profile?.full_name || profile?.email?.split('@')[0] || ''
    const profileEmail = profile?.email || ''
    const profileAvatar = profile?.avatar_url || `https://ui-avatars.com/api/?name=${profileName}&background=random`

    return (
        <div className="animate-fade-in space-y-8 pb-24 text-center">
             
             {/* HEADER CON FONDO */}
             <div className="relative bg-slate-100 dark:bg-slate-800 h-32 rounded-t-[3rem] rounded-b-3xl mt-4">
                 <div className="absolute -bottom-16 left-1/2 -translate-x-1/2">
                    {/* AVATAR CON CAMARA */}
                    <div className="relative inline-block">
                        <img src={profileAvatar} alt="Perfil" className="w-32 h-32 rounded-[2.5rem] object-cover border-[6px] border-white dark:border-slate-900 shadow-2xl bg-white" />
                        <label className="absolute -bottom-2 -right-2 bg-indigo-600 text-white p-3 rounded-2xl cursor-pointer hover:bg-indigo-700 shadow-lg transition transform hover:scale-110 active:scale-95 border-4 border-white dark:border-slate-900">
                            {uploading ? <Loader2 size={18} className="animate-spin"/> : <Camera size={18} />}
                            <input type="file" className="hidden" accept="image/*" onChange={onUploadAvatar} />
                        </label>
                    </div>
                 </div>
             </div>

             <div className="space-y-2 pt-14 px-4">
                 <h2 className="text-3xl font-black text-slate-900 dark:text-white flex items-center justify-center gap-2">
                     {profileName}
                     {profile?.is_verified && <CheckCircle2 size={26} className="text-blue-500 fill-blue-500 text-white" />}
                 </h2>
                 <p className="text-sm text-slate-500 dark:text-slate-400 font-bold tracking-wide bg-slate-100 dark:bg-slate-800 inline-block px-4 py-1 rounded-full">{profileEmail}</p>
             </div>

             {/* FORMULARIO DE PERFIL (INPUTS MASIVOS) */}
             <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl shadow-slate-100 dark:shadow-none border border-slate-200 dark:border-slate-800 text-left space-y-6 mx-2">
                 <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
                    <h3 className="text-base font-black flex items-center gap-3 dark:text-white uppercase tracking-wider"><BriefcaseIcon size={20} className="text-indigo-500"/> Datos Públicos</h3>
                 </div>
                 
                 <div className="space-y-6">
                    <div>
                        <label className="text-xs font-black text-slate-400 uppercase mb-3 block tracking-wider ml-2">Nombre Visible</label>
                        <input 
                            value={profileName} 
                            onChange={(e) => setProfileData({...profile, full_name: e.target.value})}
                            className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl text-base font-bold dark:text-white outline-none focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900 border-2 border-transparent focus:border-indigo-500 transition"
                            placeholder="Ej: Juan Pérez"
                        />
                    </div>
                    
                    <div>
                        <label className="text-xs font-black text-slate-400 uppercase mb-3 block tracking-wider ml-2">Biografía / Habilidades</label>
                        <textarea 
                            rows={4}
                            value={profile?.bio || ''} 
                            onChange={(e) => setProfileData({...profile, bio: e.target.value})}
                            className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl text-sm font-medium dark:text-white outline-none focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900 border-2 border-transparent focus:border-indigo-500 transition resize-none leading-relaxed"
                            placeholder="Describe qué estudias y qué servicios ofreces..."
                        />
                    </div>
                 </div>
                 
                 <button onClick={onSave} className="w-full py-5 bg-slate-900 dark:bg-white dark:text-slate-900 text-white text-sm font-black tracking-widest rounded-3xl mt-4 hover:opacity-90 transition shadow-2xl hover:shadow-indigo-200 dark:hover:shadow-none uppercase transform active:scale-95">
                    Guardar Cambios
                 </button>
             </div>

             {/* BOTÓN VERIFICAR PREMIUM */}
             {!profile?.is_verified && (
                 <button onClick={onVerify} className="w-full py-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-[2.5rem] shadow-2xl shadow-indigo-200 dark:shadow-none flex items-center justify-between px-8 hover:scale-[1.02] transition active:scale-95 group mx-2 border-4 border-white dark:border-slate-950">
                     <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-3 rounded-2xl group-hover:rotate-12 transition backdrop-blur-sm">
                            <ShieldCheck size={32} className="text-white" />
                        </div>
                        <div className="text-left leading-tight">
                            <p className="text-xs font-black opacity-80 mb-1 tracking-widest uppercase">Suscripción</p>
                            <p className="text-lg font-black tracking-tight">SOLICITAR VERIFICADO</p>
                        </div>
                     </div>
                     <div className="text-right bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm">
                        <p className="text-xs font-bold opacity-80 mb-0.5">Precio</p>
                        <p className="text-base font-black">150 COINS</p>
                     </div>
                 </button>
             )}
        </div>
    )
}