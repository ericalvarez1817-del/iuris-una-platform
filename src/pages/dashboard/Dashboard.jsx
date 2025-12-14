import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import useTheme from '../../hooks/useTheme'
import { LogOut, Award, TrendingUp, CalendarCheck, Sun, Moon, BookA, ShoppingBag } from 'lucide-react'
import { useNavigate, Link, useLocation } from 'react-router-dom'

export default function Dashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()
  
  const [userEmail, setUserEmail] = useState('')
  const [average, setAverage] = useState('0.00')

  useEffect(() => {
    getUser()
    getAverage()
  }, [location])

  const getUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setUserEmail(user.email)
  }

  const getAverage = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('student_grades')
      .select('final')
      .eq('user_id', user.id)

    if (data && data.length > 0) {
      const validGrades = data.filter(item => item.final && item.final > 0)
      if (validGrades.length > 0) {
        const sum = validGrades.reduce((acc, curr) => acc + curr.final, 0)
        const avg = (sum / validGrades.length).toFixed(2)
        setAverage(avg)
      } else {
        setAverage('0.00')
      }
    } else {
      setAverage('0.00')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 pb-24 transition-colors duration-300">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Hola, Colega</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 truncate max-w-[200px]">{userEmail}</p>
        </div>
        
        <div className="flex gap-2">
          {/* BOTÓN TEMA */}
          <button 
            onClick={toggleTheme}
            className="p-2 bg-white dark:bg-slate-800 text-slate-400 dark:text-yellow-400 border border-slate-200 dark:border-slate-700 rounded-full hover:bg-slate-100 transition shadow-sm"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {/* BOTÓN SALIR */}
          <button 
            onClick={handleLogout}
            className="p-2 bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 rounded-full hover:text-red-600 hover:border-red-200 transition shadow-sm"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* TARJETA PROMEDIO */}
      <Link to="/gpa" className="block transform transition hover:scale-[1.02] active:scale-95 mb-6">
        <div className="bg-slate-900 dark:bg-slate-800 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden cursor-pointer border border-transparent dark:border-slate-700">
          <div className="relative z-10">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Promedio General</p>
            <div className="flex justify-between items-end">
                <h2 className="text-4xl font-bold mb-4">{average}<span className="text-lg text-slate-400">/5</span></h2>
                <span className="text-xs text-slate-400 mb-5 underline">Calcular</span>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 text-sm bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                <TrendingUp size={16} className="text-emerald-400" />
                <span>Estado</span>
              </div>
              <div className="flex items-center gap-2 text-sm bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                <Award size={16} className="text-amber-400" />
                <span>{parseFloat(average) >= 4.5 ? 'Honor' : parseFloat(average) >= 3 ? 'Regular' : 'Bajo'}</span>
              </div>
            </div>
          </div>
          <div className="absolute -right-4 -bottom-10 w-32 h-32 bg-purple-500 rounded-full blur-3xl opacity-30"></div>
          <div className="absolute -left-4 -top-10 w-32 h-32 bg-blue-500 rounded-full blur-3xl opacity-30"></div>
        </div>
      </Link>

      {/* SECCIÓN HERRAMIENTAS */}
      <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 text-lg">Herramientas</h3>

      {/* 1. MERCADO UNA (NUEVO - DESTACADO) */}
      <Link to="/market" className="block mb-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex gap-4 items-center transition-colors hover:border-indigo-400 group relative overflow-hidden">
          {/* Efecto de brillo al pasar el mouse */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-indigo-50 dark:to-indigo-900/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-lg text-white shadow-md group-hover:scale-110 transition-transform z-10">
            <ShoppingBag size={24} />
          </div>
          <div className="z-10">
            <h4 className="font-bold text-slate-800 dark:text-slate-100">Mercado UNA</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Compra, Venta & Servicios</p>
          </div>
        </div>
      </Link>

      {/* 2. LÉXICO DE PODER */}
      <Link to="/lexicon" className="block mb-6">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex gap-4 items-center transition-colors hover:border-amber-400 group">
          <div className="bg-amber-50 dark:bg-amber-900/30 p-3 rounded-lg text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
            <BookA size={24} />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 dark:text-slate-100">Léxico de Poder</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">Diccionario & Latín</p>
          </div>
        </div>
      </Link>

      {/* AGENDA */}
      <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 text-lg">Tu Agenda</h3>
      
      <div className="space-y-3">
        {/* Card 1 */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex gap-4 items-center transition-colors">
          <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg text-blue-600 dark:text-blue-400">
            <CalendarCheck size={24} />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 dark:text-slate-100">Próximo Parcial</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">Derecho Romano - 15 Oct</p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex gap-4 items-center transition-colors">
          <div className="bg-emerald-50 dark:bg-emerald-900/30 p-3 rounded-lg text-emerald-600 dark:text-emerald-400">
            <TrendingUp size={24} />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 dark:text-slate-100">Progreso de Estudio</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">Consulta tu Tracker</p>
          </div>
        </div>
      </div>
    </div>
  )
}