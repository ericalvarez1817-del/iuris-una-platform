import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
// Asegúrate de que estas rutas sean correctas en tu proyecto
import { supabase } from '../../lib/supabase' 
import { syllabus as initialSyllabus } from '../../data/syllabus' 
import { 
  ArrowLeft, CheckCircle2, Circle, 
  Trophy, BookOpen, GraduationCap, 
  ChevronRight, Sparkles, Settings2, 
  Plus, Trash2, Save, X, Minus
} from 'lucide-react'

// --- MOCKS (SOLO PARA VISTA PREVIA, BORRAR EN PRODUCCIÓN) ---
/*
const initialSyllabus = [
  { id: 1, name: 'Derecho Romano I', bolillas: 15 },
  { id: 2, name: 'Introducción al Derecho', bolillas: 12 },
];
const supabase = {
  auth: { getUser: async () => ({ data: { user: { id: 'mock-user' } } }) },
  from: () => ({
    select: () => ({ eq: async () => ({ data: [], error: null }) }),
    insert: async () => ({ error: null }),
    delete: () => ({ match: async () => ({ error: null }) })
  })
};
*/
// ------------------------------------------------------------

export default function Tracker() {
  const navigate = useNavigate()
  
  // --- Estados ---
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState([]) 
  const [activeSubject, setActiveSubject] = useState(null)
  const [showConfetti, setShowConfetti] = useState(false)
  
  // Estado para gestión de materias (Carga de localStorage o usa el default)
  const [subjects, setSubjects] = useState(() => {
    const saved = localStorage.getItem('my_syllabus_v1')
    return saved ? JSON.parse(saved) : initialSyllabus
  })
  
  const [isEditing, setIsEditing] = useState(false) // Modo Edición
  const [isAdding, setIsAdding] = useState(false)   // Modal añadir materia
  const [newSubject, setNewSubject] = useState({ name: '', bolillas: 10 })

  // --- Efectos ---

  // Cargar progreso de Supabase
  useEffect(() => {
    fetchProgress()
  }, [])

  // Guardar cambios de materias en LocalStorage
  useEffect(() => {
    localStorage.setItem('my_syllabus_v1', JSON.stringify(subjects))
  }, [subjects])

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
      setTimeout(() => setLoading(false), 300)
    }
  }

  // --- Lógica de Negocio (Progreso) ---

  const toggleBolilla = async (subjectId, bolillaNum) => {
    if (isEditing) return // Desactivar clicks en modo edición

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 

    const isMarked = progress.some(p => p.subject_id === subjectId && p.bolilla_number === bolillaNum)

    // Optimistic Update
    if (isMarked) {
      setProgress(prev => prev.filter(p => !(p.subject_id === subjectId && p.bolilla_number === bolillaNum)))
      await supabase.from('student_progress').delete().match({ user_id: user.id, subject_id: subjectId, bolilla_number: bolillaNum })
    } else {
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 1000)
      
      setProgress(prev => [...prev, { subject_id: subjectId, bolilla_number: bolillaNum }])
      await supabase.from('student_progress').insert({ user_id: user.id, subject_id: subjectId, bolilla_number: bolillaNum })
    }
  }

  // --- Lógica de Gestión de Materias ---

  const handleAddSubject = () => {
    if (!newSubject.name.trim()) return
    const newId = Date.now() // ID temporal basado en timestamp
    const subjectToAdd = { ...newSubject, id: newId }
    setSubjects([...subjects, subjectToAdd])
    setNewSubject({ name: '', bolillas: 10 })
    setIsAdding(false)
  }

  const handleDeleteSubject = (id) => {
    if (window.confirm('¿Seguro que quieres eliminar esta materia y su progreso?')) {
      setSubjects(subjects.filter(s => s.id !== id))
      // Opcional: Limpiar progreso de esa materia del estado local para que no quede basura
      setProgress(prev => prev.filter(p => p.subject_id !== id))
    }
  }

  const updateBolillasCount = (id, delta) => {
    setSubjects(subjects.map(s => {
      if (s.id === id) {
        const newCount = Math.max(1, s.bolillas + delta)
        return { ...s, bolillas: newCount }
      }
      return s
    }))
  }

  // --- Estadísticas ---

  const getSubjectStats = (subjectId, totalBolillas) => {
    const markedCount = progress.filter(p => p.subject_id === subjectId).length
    const percentage = totalBolillas > 0 ? Math.round((markedCount / totalBolillas) * 100) : 0
    return { markedCount, percentage }
  }

  const globalStats = useMemo(() => {
    if (subjects.length === 0) return { totalSubjects: 0, completedSubjects: 0, totalProgress: 0 }
    
    let totalPercentageSum = 0
    let completedCount = 0

    subjects.forEach(sub => {
      const { percentage } = getSubjectStats(sub.id, sub.bolillas)
      totalPercentageSum += percentage
      if (percentage === 100) completedCount++
    })

    return {
      totalSubjects: subjects.length,
      completedSubjects: completedCount,
      totalProgress: Math.round(totalPercentageSum / subjects.length)
    }
  }, [progress, subjects]) // Dependencias actualizadas

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
              <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent truncate max-w-[180px] sm:max-w-none">
                {activeSubject ? activeSubject.name : (isEditing ? 'Editar Materias' : 'Mi Progreso')}
              </h1>
              {activeSubject && (
                <p className="text-xs text-slate-500 font-medium animate-fade-in">
                  {getSubjectStats(activeSubject.id, activeSubject.bolillas).markedCount} de {activeSubject.bolillas} bolillas
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Botón Configuración (Toggle Edit Mode) */}
            {!activeSubject && (
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={`p-2.5 rounded-full transition-all ${
                  isEditing 
                    ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-300 rotate-180' 
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {isEditing ? <CheckCircle2 size={20} /> : <Settings2 size={20} />}
              </button>
            )}

            {/* Mini Stats (Solo si hay materia activa y NO editando) */}
            {activeSubject && !isEditing && (
              <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-full animate-scale-in">
                <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
                  {getSubjectStats(activeSubject.id, activeSubject.bolillas).percentage}%
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 lg:p-6 space-y-6">
        
        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {[1,2,3,4].map(i => <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-xl w-full"></div>)}
            </div>
          </div>
        ) : (
          <>
            {/* --- VISTA 1: DASHBOARD GENERAL --- */}
            {!activeSubject && (
              <div className="space-y-8 animate-fade-in-up">
                
                {/* Hero Stats Card (Solo visible si NO estamos editando) */}
                {!isEditing && (
                  <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-6 text-white shadow-xl shadow-indigo-500/20 transition-all duration-500">
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
                )}

                {/* Lista de Materias */}
                <div>
                  <div className="flex justify-between items-end mb-4 px-1">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                      {isEditing ? 'Gestionar Plan de Estudios' : 'Tus Materias'}
                    </h3>
                    {isEditing && (
                      <span className="text-xs text-indigo-500 font-medium animate-pulse">
                        Modo Edición Activo
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Botón Añadir Materia (Solo en modo edición) */}
                    {isEditing && (
                      <button
                        onClick={() => setIsAdding(true)}
                        className="group relative bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all duration-300 flex flex-col items-center justify-center gap-2 min-h-[140px]"
                      >
                        <div className="bg-white dark:bg-slate-800 p-3 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                          <Plus size={24} className="text-indigo-500" />
                        </div>
                        <span className="text-sm font-bold text-slate-500 group-hover:text-indigo-600 dark:text-slate-400">Nueva Materia</span>
                      </button>
                    )}

                    {subjects.map((subject, index) => {
                      const { percentage, markedCount } = getSubjectStats(subject.id, subject.bolillas)
                      const isCompleted = percentage === 100 && !isEditing
                      
                      return (
                        <div 
                          key={subject.id} 
                          onClick={() => !isEditing && setActiveSubject(subject)}
                          className={`
                            group relative bg-white dark:bg-slate-900 p-5 rounded-2xl border transition-all duration-300 overflow-hidden
                            ${isEditing ? 'cursor-default border-slate-200 dark:border-slate-800' : 'cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md'}
                            ${isCompleted ? 'border-emerald-500/50 shadow-emerald-500/10' : ''}
                          `}
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          {/* Fondo de progreso (Solo si NO editamos) */}
                          {!isEditing && (
                            <div 
                              className={`absolute bottom-0 left-0 h-1 transition-all duration-700 ${isCompleted ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          )}

                          {/* CONTENIDO TARJETA */}
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1 pr-4">
                              <h3 className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                                {subject.name}
                              </h3>
                              
                              {/* Controles de Edición vs Info Normal */}
                              {isEditing ? (
                                <div className="flex items-center gap-3 mt-2">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); updateBolillasCount(subject.id, -1) }}
                                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-red-500"
                                  >
                                    <Minus size={14} />
                                  </button>
                                  <span className="text-sm font-mono font-bold text-slate-600 dark:text-slate-300 w-6 text-center">
                                    {subject.bolillas}
                                  </span>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); updateBolillasCount(subject.id, 1) }}
                                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-green-500"
                                  >
                                    <Plus size={14} />
                                  </button>
                                  <span className="text-[10px] uppercase text-slate-400 ml-1 font-bold">Bolillas</span>
                                </div>
                              ) : (
                                <p className="text-xs text-slate-500 mt-1">
                                  {markedCount}/{subject.bolillas} bolillas
                                </p>
                              )}
                            </div>
                            
                            {/* Icono Estado / Eliminar */}
                            {isEditing ? (
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteSubject(subject.id) }}
                                className="p-2 bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                              >
                                <Trash2 size={18} />
                              </button>
                            ) : (
                              isCompleted ? (
                                <div className="bg-emerald-100 dark:bg-emerald-900/30 p-1.5 rounded-full">
                                  <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />
                                </div>
                              ) : (
                                <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-full group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 transition-colors">
                                  <ChevronRight size={18} className="text-slate-400 group-hover:text-indigo-500" />
                                </div>
                              )
                            )}
                          </div>

                          {/* Barra de progreso (Oculta en edición) */}
                          {!isEditing && (
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
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* --- VISTA 2: DETALLE DE MATERIA (BOLILLERO) --- */}
            {activeSubject && (
              <div className="animate-fade-in space-y-6">
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

      {/* --- MODAL AÑADIR MATERIA --- */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Nueva Materia</h3>
                <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nombre de la Materia</label>
                  <input 
                    type="text" 
                    value={newSubject.name}
                    onChange={(e) => setNewSubject({...newSubject, name: e.target.value})}
                    placeholder="Ej: Derecho Penal II"
                    autoFocus
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Cantidad de Bolillas</label>
                  <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 rounded-xl p-2 border border-slate-200 dark:border-slate-700">
                    <button 
                      onClick={() => setNewSubject(prev => ({...prev, bolillas: Math.max(1, prev.bolillas - 1)}))}
                      className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg shadow-sm text-slate-500 transition-colors"
                    >
                      <Minus size={18} />
                    </button>
                    <span className="flex-1 text-center font-bold text-xl text-slate-800 dark:text-white">
                      {newSubject.bolillas}
                    </span>
                    <button 
                      onClick={() => setNewSubject(prev => ({...prev, bolillas: prev.bolillas + 1}))}
                      className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg shadow-sm text-indigo-600 transition-colors"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleAddSubject}
                disabled={!newSubject.name.trim()}
                className="w-full mt-8 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Save size={18} />
                Guardar Materia
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}