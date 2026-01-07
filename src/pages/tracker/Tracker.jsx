import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { syllabus } from '../../data/syllabus'
import { 
  ArrowLeft, CheckCircle2, Circle, 
  Trophy, BookOpen, GraduationCap, 
  ChevronRight, Sparkles
} from 'lucide-react'

export default function Tracker() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState([]) 
  const [activeSubject, setActiveSubject] = useState(null)
  const [showConfetti, setShowConfetti] = useState(false)

  // Cargar progreso
  useEffect(() => {
    fetchProgress()
  }, [])

  const fetchProgress = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('student_progress')
        .select('subject_id, bolilla_number')
        .eq('user_id', user.id)

      if (error) throw error
      setProgress(data || [])
    } catch (error) {
      console.error('Error cargando progreso:', error)
    } finally {
      // Pequeño delay artificial para que se aprecie la animación de carga (opcional, para UX suave)
      setTimeout(() => setLoading(false), 300)
    }
  }

  // --- Lógica de Negocio ---

  const toggleBolilla = async (subjectId, bolillaNum) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return // O redirigir a login

    const isMarked = progress.some(p => p.subject_id === subjectId && p.bolilla_number === bolillaNum)

    // Optimistic Update
    if (isMarked) {
      setProgress(prev => prev.filter(p => !(p.subject_id === subjectId && p.bolilla_number === bolillaNum)))
      await supabase.from('student_progress').delete().match({ user_id: user.id, subject_id: subjectId, bolilla_number: bolillaNum })
    } else {
      // Efecto visual si completa algo
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 1000)
      
      setProgress(prev => [...prev, { subject_id: subjectId, bolilla_number: bolillaNum }])
      await supabase.from('student_progress').insert({ user_id: user.id, subject_id: subjectId, bolilla_number: bolillaNum })
    }
  }

  const getSubjectStats = (subjectId, totalBolillas) => {
    const markedCount = progress.filter(p => p.subject_id === subjectId).length
    const percentage = Math.round((markedCount / totalBolillas) * 100)
    return { markedCount, percentage }
  }

  // Estadísticas Globales Memoizadas
  const globalStats = useMemo(() => {
    if (syllabus.length === 0) return { totalSubjects: 0, completedSubjects: 0, totalProgress: 0 }
    
    let totalPercentageSum = 0
    let completedCount = 0

    syllabus.forEach(sub => {
      const { percentage } = getSubjectStats(sub.id, sub.bolillas)
      totalPercentageSum += percentage
      if (percentage === 100) completedCount++
    })

    return {
      totalSubjects: syllabus.length,
      completedSubjects: completedCount,
      totalProgress: Math.round(totalPercentageSum / syllabus.length)
    }
  }, [progress])


  // --- Renderizado ---

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-500 font-sans pb-24">
      
      {/* Header Premium */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50 sticky top-0 z-30 px-4 py-3 supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => activeSubject ? setActiveSubject(null) : navigate('/dashboard')} 
              className="p-2 -ml-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all active:scale-95"
            >
              <ArrowLeft size={22} strokeWidth={2.5} />
            </button>
            
            <div className="flex flex-col">
              <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent truncate max-w-[200px] sm:max-w-none">
                {activeSubject ? activeSubject.name : 'Mi Progreso'}
              </h1>
              {activeSubject && (
                <p className="text-xs text-slate-500 font-medium">
                  {getSubjectStats(activeSubject.id, activeSubject.bolillas).markedCount} de {activeSubject.bolillas} bolillas
                </p>
              )}
            </div>
          </div>

          {/* Mini Stats en Header (Solo si hay materia activa) */}
          {activeSubject && (
            <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-full">
              <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
                {getSubjectStats(activeSubject.id, activeSubject.bolillas).percentage}%
              </span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 lg:p-6 space-y-6">
        
        {loading ? (
          // Skeleton Loading Premium
          <div className="space-y-4 animate-pulse">
            <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {[1,2,3,4].map(i => (
                 <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-xl w-full"></div>
               ))}
            </div>
          </div>
        ) : (
          <>
            {/* VISTA 1: DASHBOARD GENERAL */}
            {!activeSubject && (
              <div className="space-y-8 animate-fade-in-up">
                
                {/* Hero Stats Card */}
                <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-6 text-white shadow-xl shadow-indigo-500/20">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none"></div>
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full -ml-10 -mb-10 blur-2xl pointer-events-none"></div>
                  
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <p className="text-indigo-100 font-medium text-sm mb-1">Progreso Global</p>
                        <h2 className="text-4xl font-black tracking-tight">{globalStats.totalProgress}%</h2>
                      </div>
                      <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                        <Trophy size={24} className="text-yellow-300" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-black/20 rounded-xl p-3 backdrop-blur-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <BookOpen size={14} className="text-indigo-200" />
                          <span className="text-xs font-medium text-indigo-100">Materias</span>
                        </div>
                        <span className="text-lg font-bold">{globalStats.totalSubjects}</span>
                      </div>
                      <div className="bg-black/20 rounded-xl p-3 backdrop-blur-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <GraduationCap size={16} className="text-emerald-300" />
                          <span className="text-xs font-medium text-indigo-100">Completadas</span>
                        </div>
                        <span className="text-lg font-bold">{globalStats.completedSubjects}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lista de Materias */}
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 px-1">Tus Materias</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {syllabus.map((subject, index) => {
                      const { percentage, markedCount } = getSubjectStats(subject.id, subject.bolillas)
                      const isCompleted = percentage === 100
                      
                      return (
                        <div 
                          key={subject.id} 
                          onClick={() => setActiveSubject(subject)}
                          className={`
                            group relative bg-white dark:bg-slate-900 p-5 rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden
                            ${isCompleted 
                              ? 'border-emerald-500/50 shadow-emerald-500/10 dark:shadow-emerald-900/20' 
                              : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 shadow-sm hover:shadow-md'
                            }
                          `}
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          {/* Fondo de progreso sutil */}
                          <div 
                            className={`absolute bottom-0 left-0 h-1 transition-all duration-700 ${isCompleted ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
                            style={{ width: `${percentage}%` }}
                          ></div>

                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1 pr-4">
                              <h3 className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                                {subject.name}
                              </h3>
                              <p className="text-xs text-slate-500 mt-1">
                                {markedCount}/{subject.bolillas} bolillas
                              </p>
                            </div>
                            
                            {isCompleted ? (
                              <div className="bg-emerald-100 dark:bg-emerald-900/30 p-1.5 rounded-full">
                                <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />
                              </div>
                            ) : (
                              <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-full group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 transition-colors">
                                <ChevronRight size={18} className="text-slate-400 group-hover:text-indigo-500" />
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-1000 ease-out ${isCompleted ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <span className={`text-xs font-bold ${isCompleted ? 'text-emerald-600' : 'text-slate-600 dark:text-slate-400'}`}>
                              {percentage}%
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* VISTA 2: DETALLE DE MATERIA (BOLILLERO) */}
            {activeSubject && (
              <div className="animate-fade-in space-y-6">
                
                {/* Info Card */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-6 items-center justify-between">
                   <div className="text-center md:text-left">
                     <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-1">Estás estudiando</h2>
                     <p className="text-2xl font-serif font-bold text-slate-800 dark:text-white">{activeSubject.name}</p>
                   </div>
                   
                   <div className="flex items-center gap-4">
                     <div className="text-center">
                       <span className="block text-2xl font-black text-indigo-600 dark:text-indigo-400">
                         {getSubjectStats(activeSubject.id, activeSubject.bolillas).percentage}%
                       </span>
                       <span className="text-xs font-medium text-slate-500">Completado</span>
                     </div>
                     <div className="w-px h-10 bg-slate-200 dark:bg-slate-800"></div>
                     <div className="text-center">
                       <span className="block text-2xl font-black text-slate-700 dark:text-slate-300">
                         {activeSubject.bolillas - getSubjectStats(activeSubject.id, activeSubject.bolillas).markedCount}
                       </span>
                       <span className="text-xs font-medium text-slate-500">Restantes</span>
                     </div>
                   </div>
                </div>

                {/* Grid de Bolillas */}
                <div>
                  <h3 className="text-sm font-bold text-slate-500 mb-4 uppercase tracking-wide px-1">Bolillas del Programa</h3>
                  <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3">
                    {Array.from({ length: activeSubject.bolillas }, (_, i) => i + 1).map(num => {
                      const isChecked = progress.some(p => p.subject_id === activeSubject.id && p.bolilla_number === num)
                      
                      return (
                        <button
                          key={num}
                          onClick={() => toggleBolilla(activeSubject.id, num)}
                          className={`
                            relative group aspect-square rounded-2xl flex flex-col items-center justify-center border transition-all duration-300
                            ${isChecked 
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-105 z-10' 
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/10'
                            }
                          `}
                        >
                          <span className={`text-xl md:text-2xl font-black mb-1 ${isChecked ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                            {num}
                          </span>
                          
                          {isChecked ? (
                            <CheckCircle2 size={16} className="animate-scale-in" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-slate-200 dark:border-slate-700 group-hover:border-indigo-400 transition-colors"></div>
                          )}

                          {/* Efecto Confetti Local (Solo visual) */}
                          {isChecked && showConfetti && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <Sparkles className="text-yellow-300 animate-ping absolute" size={40} />
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}