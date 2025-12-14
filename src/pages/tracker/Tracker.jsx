import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { syllabus } from '../../data/syllabus'
import { ArrowLeft, CheckCircle2, Circle } from 'lucide-react'

export default function Tracker() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState([]) // Lista de bolillas marcadas ID
  const [activeSubject, setActiveSubject] = useState(null) // Materia seleccionada actualmente

  // Al cargar, pedimos a Supabase el progreso del usuario
  useEffect(() => {
    fetchProgress()
  }, [])

  const fetchProgress = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('student_progress')
        .select('subject_id, bolilla_number')
        .eq('user_id', user.id)

      if (error) throw error
      setProgress(data || [])
    } catch (error) {
      console.error('Error cargando progreso:', error)
    } finally {
      setLoading(false)
    }
  }

  // Función para Marcar/Desmarcar
  const toggleBolilla = async (subjectId, bolillaNum) => {
    const { data: { user } } = await supabase.auth.getUser()
    
    // Verificamos si ya está marcada
    const isMarked = progress.some(p => p.subject_id === subjectId && p.bolilla_number === bolillaNum)

    // Actualización OPTIMISTA
    if (isMarked) {
      setProgress(prev => prev.filter(p => !(p.subject_id === subjectId && p.bolilla_number === bolillaNum)))
      // Borrar de Supabase
      await supabase.from('student_progress').delete().match({ user_id: user.id, subject_id: subjectId, bolilla_number: bolillaNum })
    } else {
      setProgress(prev => [...prev, { subject_id: subjectId, bolilla_number: bolillaNum }])
      // Insertar en Supabase
      await supabase.from('student_progress').insert({ user_id: user.id, subject_id: subjectId, bolilla_number: bolillaNum })
    }
  }

  // Cálculo de porcentaje
  const getPercentage = (subjectId, totalBolillas) => {
    const markedCount = progress.filter(p => p.subject_id === subjectId).length
    return Math.round((markedCount / totalBolillas) * 100)
  }

  return (
    // CAMBIO: Agregado dark:bg-slate-950 y transition-colors
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 transition-colors duration-300">
      
      {/* Header Fijo */}
      {/* CAMBIO: Agregado dark:bg-slate-900 y dark:border-slate-800 */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 px-4 py-4 flex items-center gap-3 transition-colors">
        <button onClick={() => activeSubject ? setActiveSubject(null) : navigate('/dashboard')} className="p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
          <ArrowLeft size={20} />
        </button>
        {/* CAMBIO: Agregado dark:text-white */}
        <h1 className="font-bold text-slate-800 dark:text-white text-lg">
          {activeSubject ? activeSubject.name : 'Mis Materias'}
        </h1>
      </header>

      <main className="p-4 max-w-md mx-auto">
        {loading ? (
          <p className="text-center text-slate-400 mt-10">Cargando tu progreso...</p>
        ) : (
          <>
            {/* VISTA 1: LISTA DE MATERIAS */}
            {!activeSubject && (
              <div className="space-y-3">
                {syllabus.map(subject => {
                  const percent = getPercentage(subject.id, subject.bolillas)
                  return (
                    <div 
                      key={subject.id} 
                      onClick={() => setActiveSubject(subject)}
                      // CAMBIO: Agregado dark:bg-slate-900 y dark:border-slate-800
                      className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm active:scale-95 transition cursor-pointer"
                    >
                      <div className="flex justify-between items-center mb-2">
                        {/* CAMBIO: Agregado dark:text-slate-100 */}
                        <h3 className="font-semibold text-slate-800 dark:text-slate-100">{subject.name}</h3>
                        {/* CAMBIO: Estilos condicionales para modo oscuro en el badge */}
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${percent === 100 ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                          {percent}%
                        </span>
                      </div>
                      {/* Barra de progreso visual */}
                      {/* CAMBIO: Fondo de barra en modo oscuro dark:bg-slate-800 */}
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full transition-all duration-500" style={{ width: `${percent}%` }}></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* VISTA 2: DENTRO DE UNA MATERIA (BOLILLAS) */}
            {activeSubject && (
              <div className="grid grid-cols-4 gap-3">
                {Array.from({ length: activeSubject.bolillas }, (_, i) => i + 1).map(num => {
                  const isChecked = progress.some(p => p.subject_id === activeSubject.id && p.bolilla_number === num)
                  return (
                    <button
                      key={num}
                      onClick={() => toggleBolilla(activeSubject.id, num)}
                      // CAMBIO: Estilos para botón no marcado en modo oscuro (fondo, borde, texto, hover)
                      className={`aspect-square rounded-xl flex flex-col items-center justify-center border transition-all ${
                        isChecked 
                          ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-400 dark:hover:border-blue-500'
                      }`}
                    >
                      <span className="text-xl font-bold">{num}</span>
                      {/* CAMBIO: Icono vacío en modo oscuro dark:text-slate-700 */}
                      {isChecked ? <CheckCircle2 size={16} /> : <Circle size={16} className="text-slate-300 dark:text-slate-700" />}
                    </button>
                  )
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}