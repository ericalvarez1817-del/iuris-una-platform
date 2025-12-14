import { useState, useEffect } from 'react'
import { ArrowLeft, Save, Trash2, Plus, Calculator } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function GpaCalculator() {
  const navigate = useNavigate()
  // Iniciamos con una materia vacía por defecto para asegurar que siempre haya algo que mostrar
  const [subjects, setSubjects] = useState([{ id: Date.now(), name: '', partial: '', final: '' }])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchGrades()
  }, [])

  const fetchGrades = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data, error } = await supabase
          .from('student_grades')
          .select('*')
          .eq('user_id', user.id)

        if (data && data.length > 0) {
          setSubjects(data)
        }
      }
    } catch (error) {
      console.error("Error cargando notas:", error)
    } finally {
      setLoading(false)
    }
  }

  const addSubject = () => {
    setSubjects([...subjects, { id: Date.now(), name: '', partial: '', final: '' }])
  }

  const updateSubject = (id, field, value) => {
    setSubjects(subjects.map(s => s.id === id ? { ...s, [field]: value } : s))
  }

  const removeSubject = (id) => {
    setSubjects(subjects.filter(s => s.id !== id))
  }

  const calculateAverage = () => {
    // Filtramos materias válidas (con nota final numérica mayor a 0)
    const validSubjects = subjects.filter(s => s.final && !isNaN(s.final) && parseFloat(s.final) > 0)
    
    if (validSubjects.length === 0) return '0.00'
    
    const sum = validSubjects.reduce((acc, curr) => acc + parseFloat(curr.final), 0)
    return (sum / validSubjects.length).toFixed(2)
  }

  const saveGrades = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Feedback visual simple
    const originalText = document.getElementById('btn-save').innerText
    document.getElementById('btn-save').innerText = 'Guardando...'

    try {
        await supabase.from('student_grades').delete().eq('user_id', user.id)
        
        const dataToSave = subjects.map(s => ({
          user_id: user.id,
          name: s.name,
          partial: s.partial || 0,
          final: s.final || 0
        }))

        await supabase.from('student_grades').insert(dataToSave)
        alert('¡Notas guardadas correctamente!')
    } catch (error) {
        alert('Error al guardar')
    } finally {
        document.getElementById('btn-save').innerText = originalText
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 pb-24 transition-colors duration-300">
      
      {/* HEADER */}
      <header className="flex items-center gap-3 mb-6 pt-2">
        <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="bg-emerald-100 dark:bg-emerald-900/50 p-2 rounded-lg text-emerald-700 dark:text-emerald-400">
          <Calculator size={24} />
        </div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-white">Promedio Académico</h1>
      </header>

      {/* TARJETA DE RESULTADO */}
      <div className="bg-slate-900 dark:bg-slate-800 text-white p-6 rounded-2xl shadow-lg mb-6 flex justify-between items-center border border-transparent dark:border-slate-700 transition-colors">
        <div>
          <p className="text-slate-400 text-xs uppercase font-bold">Promedio Actual</p>
          <h2 className="text-4xl font-bold">{calculateAverage()}</h2>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-300">Materias<br/>Computadas</p>
          <p className="text-xl font-bold">{subjects.filter(s => s.final && parseFloat(s.final) > 0).length}</p>
        </div>
      </div>

      {/* LISTA DE MATERIAS */}
      <div className="space-y-4 mb-6">
          {subjects.map((subject, index) => (
            <div key={subject.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
                <div className="flex justify-between items-start mb-3">
                <input
                    type="text"
                    placeholder={`Materia ${index + 1}`}
                    value={subject.name}
                    onChange={(e) => updateSubject(subject.id, 'name', e.target.value)}
                    className="font-bold text-slate-800 dark:text-slate-100 w-full focus:outline-none focus:text-blue-600 dark:focus:text-blue-400 placeholder:text-slate-300 dark:placeholder:text-slate-600 bg-transparent"
                />
                <button onClick={() => removeSubject(subject.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                    <Trash2 size={18} />
                </button>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-xs text-slate-400 font-bold uppercase">P. Parcial</label>
                    <input
                    type="number"
                    placeholder="0"
                    value={subject.partial}
                    onChange={(e) => updateSubject(subject.id, 'partial', e.target.value)}
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 focus:border-blue-500 outline-none text-slate-800 dark:text-white transition-colors"
                    />
                </div>
                <div>
                    <label className="text-xs text-slate-400 font-bold uppercase">Nota Final</label>
                    <input
                    type="number"
                    placeholder="0"
                    max="5"
                    value={subject.final}
                    onChange={(e) => updateSubject(subject.id, 'final', e.target.value)}
                    className="w-full mt-1 p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded border border-emerald-200 dark:border-emerald-800 focus:border-emerald-500 outline-none text-emerald-800 dark:text-emerald-400 font-bold transition-colors"
                    />
                </div>
                </div>
            </div>
          ))}
      </div>

      {/* BOTONES DE ACCIÓN */}
      <div className="flex gap-3">
        <button 
          onClick={addSubject}
          className="flex-1 py-3 border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded-xl font-semibold flex justify-center items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-900 hover:border-slate-400 transition-colors"
        >
          <Plus size={20} /> Agregar
        </button>
        <button 
          id="btn-save"
          onClick={saveGrades}
          className="flex-1 py-3 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 dark:hover:bg-indigo-700 transition-colors flex justify-center items-center gap-2"
        >
          <Save size={20} /> Guardar
        </button>
      </div>
    </div>
  )
}