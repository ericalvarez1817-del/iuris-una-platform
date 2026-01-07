import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, Calendar, Calculator as CalcIcon, 
  Info, CheckCircle2, XCircle, AlertTriangle, 
  Settings2, ChevronDown, ChevronUp, CalendarDays 
} from 'lucide-react'

// --- CONSTANTES Y CONFIGURACIÓN PARAGUAY ---

// Feriados Fijos (MM-DD)
const FIXED_HOLIDAYS = [
  '01-01', // Año Nuevo
  '03-01', // Día de los Héroes
  '05-01', // Día del Trabajador
  '05-14', // Independencia Patria
  '05-15', // Independencia Patria
  '06-12', // Paz del Chaco
  '08-15', // Fundación de Asunción
  '09-29', // Victoria de Boquerón
  '12-08', // Virgen de Caacupé
  '12-25', // Navidad
]

// Feriados Móviles (Jueves y Viernes Santo) para 2024-2027
// Formato YYYY-MM-DD
const MOVABLE_HOLIDAYS = [
  '2024-03-28', '2024-03-29',
  '2025-04-17', '2025-04-18',
  '2026-04-02', '2026-04-03',
  '2027-03-25', '2027-03-26'
]

const isHoliday = (dateObj) => {
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0')
  const day = dateObj.getDate().toString().padStart(2, '0')
  const year = dateObj.getFullYear()
  const dateStr = `${month}-${day}`
  const fullDateStr = `${year}-${month}-${day}`

  if (FIXED_HOLIDAYS.includes(dateStr)) return 'Feriado Nacional'
  if (MOVABLE_HOLIDAYS.includes(fullDateStr)) return 'Semana Santa'
  return null
}

const isJudicialFair = (dateObj) => {
  // Feria Judicial en Paraguay: 1 al 31 de Enero
  return dateObj.getMonth() === 0 // Enero es mes 0
}

export default function Calculator() {
  const navigate = useNavigate()
  
  // --- ESTADOS ---
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [days, setDays] = useState('')
  const [type, setType] = useState('habiles') // 'habiles' | 'corridos'
  const [includeFeria, setIncludeFeria] = useState(true) // Considerar Enero como inhábil
  const [extendIfHoliday, setExtendIfHoliday] = useState(true) // Si vence en inhábil, pasar al siguiente hábil (para días corridos)
  const [showSettings, setShowSettings] = useState(false)
  
  // --- RESULTADO CALCULADO ---
  const result = useMemo(() => {
    if (!days || isNaN(parseInt(days))) return null

    const start = new Date(startDate + 'T00:00:00')
    let current = new Date(start)
    let count = 0
    const totalDays = parseInt(days)
    const skippedDays = [] // Para mostrar detalle: { date: Date, reason: string }

    if (type === 'habiles') {
      while (count < totalDays) {
        current.setDate(current.getDate() + 1)
        
        const dayOfWeek = current.getDay() // 0 dom, 6 sab
        const holidayName = isHoliday(current)
        const isFeria = includeFeria && isJudicialFair(current)
        
        let isWorkingDay = true
        let reason = ''

        if (dayOfWeek === 0 || dayOfWeek === 6) {
          isWorkingDay = false
          reason = dayOfWeek === 0 ? 'Domingo' : 'Sábado'
        } else if (holidayName) {
          isWorkingDay = false
          reason = holidayName
        } else if (isFeria) {
          isWorkingDay = false
          reason = 'Feria Judicial (Enero)'
        }

        if (isWorkingDay) {
          count++
        } else {
          skippedDays.push({ date: new Date(current), reason })
        }
      }
    } else {
      // DÍAS CORRIDOS
      current.setDate(current.getDate() + totalDays)
      
      // Lógica de extensión si cae en día inhábil (Art 338 CPC aprox)
      if (extendIfHoliday) {
        let extensionNeeded = true
        while (extensionNeeded) {
            const dayOfWeek = current.getDay()
            const holidayName = isHoliday(current)
            const isFeria = includeFeria && isJudicialFair(current)

            if (dayOfWeek === 0 || dayOfWeek === 6 || holidayName || isFeria) {
                skippedDays.push({ 
                    date: new Date(current), 
                    reason: `Vencimiento extendido por ${holidayName || (isFeria ? 'Feria Judicial' : 'Fin de Semana')}` 
                })
                current.setDate(current.getDate() + 1)
            } else {
                extensionNeeded = false
            }
        }
      }
    }

    return {
      finalDate: current,
      skippedLog: skippedDays
    }
  }, [startDate, days, type, includeFeria, extendIfHoliday])

  // --- HELPERS VISUALES ---
  const formatDate = (date) => {
    return date.toLocaleDateString('es-PY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  }

  const getWeekDayShort = (date) => date.toLocaleDateString('es-PY', { weekday: 'short' }).toUpperCase()
  const getDayNum = (date) => date.getDate()

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-500 font-sans pb-10">
      
      {/* --- HEADER --- */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-full transition-colors">
            <ArrowLeft size={22} />
            </button>
            <div>
                <h1 className="font-bold text-slate-800 dark:text-white text-xl flex items-center gap-2">
                    <CalcIcon className="text-emerald-600 dark:text-emerald-500" size={24}/>
                    Calculadora de Plazos
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">Calcula vencimientos judiciales y administrativos</p>
            </div>
        </div>
        <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
            Paraguay
        </div>
      </header>

      <main className="p-4 max-w-4xl mx-auto grid md:grid-cols-2 gap-6 items-start mt-4">
        
        {/* --- COLUMNA IZQUIERDA: INPUTS --- */}
        <div className="space-y-6">
            
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-black/50 border border-slate-100 dark:border-slate-800 relative overflow-hidden">
                {/* Decoración de fondo */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-10 -mt-10"></div>

                <h2 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-6">Configuración del Plazo</h2>

                <div className="space-y-6 relative z-10">
                    {/* Fecha Inicio */}
                    <div className="group">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                            <Calendar size={16} className="text-emerald-600" /> 
                            Fecha de Notificación / Inicio
                        </label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-0 outline-none transition-all font-medium text-slate-800 dark:text-white"
                        />
                    </div>

                    {/* Input Días */}
                    <div className="group">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                            <CalendarDays size={16} className="text-emerald-600" />
                            Duración del Plazo
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                placeholder="0"
                                value={days}
                                onChange={(e) => setDays(e.target.value)}
                                className="w-full p-4 pr-16 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-0 outline-none transition-all font-bold text-xl text-slate-800 dark:text-white"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">DÍAS</span>
                        </div>
                    </div>

                    {/* Selector de Tipo */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tipo de Cómputo</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setType('habiles')}
                                className={`p-4 rounded-xl border-2 text-sm font-bold transition-all flex flex-col items-center gap-2 ${
                                    type === 'habiles' 
                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 shadow-md' 
                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:border-emerald-200'
                                }`}
                            >
                                <CheckCircle2 size={20} className={type === 'habiles' ? 'opacity-100' : 'opacity-0'} />
                                Días Hábiles
                            </button>
                            <button
                                onClick={() => setType('corridos')}
                                className={`p-4 rounded-xl border-2 text-sm font-bold transition-all flex flex-col items-center gap-2 ${
                                    type === 'corridos' 
                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 shadow-md' 
                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:border-emerald-200'
                                }`}
                            >
                                <CalendarDays size={20} className={type === 'corridos' ? 'opacity-100' : 'opacity-0'} />
                                Días Corridos
                            </button>
                        </div>
                    </div>

                    {/* Ajustes Avanzados */}
                    <div className="pt-2">
                        <button 
                            onClick={() => setShowSettings(!showSettings)}
                            className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                        >
                            <Settings2 size={14} />
                            {showSettings ? 'Ocultar ajustes avanzados' : 'Mostrar ajustes avanzados (Feria Judicial, etc)'}
                            {showSettings ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                        </button>
                        
                        {showSettings && (
                            <div className="mt-4 space-y-3 bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <div className="relative">
                                        <input type="checkbox" checked={includeFeria} onChange={(e) => setIncludeFeria(e.target.checked)} className="sr-only peer" />
                                        <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-600"></div>
                                    </div>
                                    <span className="text-sm text-slate-700 dark:text-slate-300">Incluir Feria Judicial (Enero) como inhábil</span>
                                </label>
                                
                                {type === 'corridos' && (
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <div className="relative">
                                            <input type="checkbox" checked={extendIfHoliday} onChange={(e) => setExtendIfHoliday(e.target.checked)} className="sr-only peer" />
                                            <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-600"></div>
                                        </div>
                                        <span className="text-sm text-slate-700 dark:text-slate-300">Extender si vence en día inhábil</span>
                                    </label>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* --- COLUMNA DERECHA: RESULTADOS --- */}
        <div className="space-y-6">
            
            {result ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* TARJETA PRINCIPAL DE RESULTADO */}
                    <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-6 sm:p-8 text-white shadow-2xl shadow-emerald-500/20 relative overflow-hidden">
                         {/* Círculos decorativos */}
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-2xl"></div>

                        <p className="relative z-10 text-emerald-100 font-medium text-sm tracking-widest uppercase mb-2">Fecha de Vencimiento</p>
                        <h2 className="relative z-10 text-3xl sm:text-4xl font-bold capitalize mb-4 leading-tight">
                            {formatDate(result.finalDate)}
                        </h2>
                        
                        <div className="relative z-10 flex items-center gap-3 bg-white/20 backdrop-blur-md rounded-lg p-3 w-fit">
                            <div className="bg-white text-emerald-700 font-bold px-3 py-1 rounded text-lg shadow-sm">
                                {getDayNum(result.finalDate)}
                            </div>
                            <div className="text-sm font-medium">
                                <p className="leading-none">{getWeekDayShort(result.finalDate)}</p>
                                <p className="opacity-80 text-xs">{(result.finalDate.getMonth() + 1).toString().padStart(2, '0')}/{result.finalDate.getFullYear()}</p>
                            </div>
                        </div>
                    </div>

                    {/* DESGLOSE DE DÍAS INHÁBILES */}
                    {result.skippedLog.length > 0 && (
                        <div className="mt-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                            <div className="bg-slate-50 dark:bg-slate-950/50 px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm flex items-center gap-2">
                                    <AlertTriangle size={16} className="text-amber-500"/>
                                    Días Inhábiles Descontados ({result.skippedLog.length})
                                </h3>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                                {result.skippedLog.map((log, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors border-b border-slate-50 dark:border-slate-800 last:border-0">
                                        <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 flex flex-col items-center justify-center shrink-0 border border-red-100 dark:border-red-900/30">
                                            <span className="text-xs font-bold leading-none">{getDayNum(log.date)}</span>
                                            <span className="text-[9px] font-medium leading-none mt-0.5">{getWeekDayShort(log.date)}</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{log.reason}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-500 capitalize">{formatDate(log.date)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* NOTA LEGAL */}
                    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-xl text-xs flex gap-3 border border-blue-100 dark:border-blue-900/30">
                        <Info size={18} className="shrink-0 mt-0.5" />
                        <p>
                            Este cálculo es referencial. Recuerda verificar las Acordadas de la Corte Suprema de Justicia para suspensiones extraordinarias de plazos no contempladas aquí.
                        </p>
                    </div>

                </div>
            ) : (
                // ESTADO VACÍO (INICIAL)
                <div className="h-full flex flex-col items-center justify-center p-8 text-center opacity-50 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl min-h-[400px]">
                    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                        <CalcIcon size={40} className="text-slate-400 dark:text-slate-500" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-600 dark:text-slate-400 mb-2">Esperando datos</h3>
                    <p className="text-sm text-slate-400 dark:text-slate-500 max-w-xs">
                        Ingresa la fecha de inicio y la duración en días para calcular el vencimiento exacto.
                    </p>
                </div>
            )}

        </div>
      </main>
    </div>
  )
}