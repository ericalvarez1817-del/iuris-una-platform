import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Calculator as CalcIcon, Calendar, Info } from 'lucide-react'

export default function Calculator() {
  const navigate = useNavigate()
  
  // Estados para los inputs
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]) // Hoy
  const [days, setDays] = useState('')
  const [type, setType] = useState('habiles') // 'habiles' o 'corridos'
  const [result, setResult] = useState(null)

  // Lógica de Negocio: Cálculo de Fechas
  const calculateDeadline = () => {
    if (!days) return

    const start = new Date(startDate)
    // Ajustamos la zona horaria para evitar errores de "día anterior"
    start.setMinutes(start.getMinutes() + start.getTimezoneOffset())

    let finalDate = new Date(start)
    let count = 0
    const totalDays = parseInt(days)

    if (type === 'corridos') {
      // Días Corridos: Suma simple
      finalDate.setDate(start.getDate() + totalDays)
    } else {
      // Días Hábiles: Sumamos día por día saltando fines de semana
      while (count < totalDays) {
        finalDate.setDate(finalDate.getDate() + 1)
        const day = finalDate.getDay()
        // 0 = Domingo, 6 = Sábado. Si no es finde, contamos el día.
        if (day !== 0 && day !== 6) {
          count++
        }
      }
    }

    // Formatear fecha para mostrar (DD/MM/AAAA)
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
    setResult(finalDate.toLocaleDateString('es-ES', options))
  }

  return (
    // CAMBIO: Fondo oscuro general
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {/* Header */}
      {/* CAMBIO: Header oscuro con borde y texto adaptado */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 px-4 py-4 flex items-center gap-3 transition-colors">
        <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-bold text-slate-800 dark:text-white text-lg">Calculadora de Plazos</h1>
      </header>

      <main className="p-4 max-w-md mx-auto space-y-6">
        
        {/* Tarjeta de Inputs */}
        {/* CAMBIO: Fondo tarjeta y bordes oscuros */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4 transition-colors">
          
          {/* Input Fecha Inicial */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-2">
              <Calendar size={16} /> Fecha de Notificación / Inicio
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              // CAMBIO: Input oscuro
              className="w-full p-3 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none bg-white dark:bg-slate-800 dark:text-white transition-colors"
            />
          </div>

          {/* Input Cantidad de Días */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Plazo (Días)</label>
            <input
              type="number"
              placeholder="Ej: 3, 5, 15..."
              value={days}
              onChange={(e) => setDays(e.target.value)}
              // CAMBIO: Input oscuro
              className="w-full p-3 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none bg-white dark:bg-slate-800 dark:text-white transition-colors"
            />
          </div>

          {/* Selector de Tipo */}
          {/* CAMBIO: Contenedor de botones oscuro */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors">
            <button
              onClick={() => setType('habiles')}
              // CAMBIO: Botones con estados activo/inactivo para modo oscuro
              className={`py-2 text-sm font-medium rounded-md transition ${type === 'habiles' ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
            >
              Días Hábiles
            </button>
            <button
              onClick={() => setType('corridos')}
              className={`py-2 text-sm font-medium rounded-md transition ${type === 'corridos' ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
            >
              Días Corridos
            </button>
          </div>

          {/* Botón Calcular */}
          <button
            onClick={calculateDeadline}
            disabled={!days}
            className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CalcIcon size={20} />
            Calcular Vencimiento
          </button>
        </div>

        {/* Tarjeta de Resultado */}
        {result && (
          // CAMBIO: Fondo verde oscuro translúcido para el resultado
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-6 rounded-xl animate-fade-in transition-colors">
            <p className="text-emerald-800 dark:text-emerald-400 text-sm font-medium uppercase tracking-wide mb-1">El plazo vence el:</p>
            <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-300 capitalize">
              {result}
            </p>
            
            {/* CAMBIO: Info box adaptada */}
            <div className="mt-4 flex gap-2 items-start text-emerald-700 dark:text-emerald-400 text-xs bg-emerald-100/50 dark:bg-emerald-900/40 p-3 rounded-lg transition-colors">
              <Info size={16} className="shrink-0 mt-0.5" />
              <p>Recuerda verificar si existen feriados judiciales o asuetos específicos que suspendan los plazos en tu jurisdicción.</p>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}