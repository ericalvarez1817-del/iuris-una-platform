import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import useTheme from '../../hooks/useTheme' // <--- IMPORTAMOS EL HOOK
import { Loader2, Sun, Moon } from 'lucide-react' // <--- IMPORTAMOS ICONOS

export default function Login() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme() // <--- USAMOS EL HOOK
  
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        })
        if (signUpError) {
           setError(signUpError.message)
        } else {
           alert('¡Cuenta creada! Iniciando sesión...')
           const { error: retryError } = await supabase.auth.signInWithPassword({ email, password })
           if (!retryError) navigate('/dashboard')
        }
      } else {
        setError(error.message)
      }
    } else {
        navigate('/dashboard')
    }
    setLoading(false)
  }

  return (
    // FONDO: Claro (slate-100) vs Oscuro (slate-950)
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950 p-4 transition-colors duration-300">
      
      {/* BOTÓN DE TEMA FLOTANTE (Esquina superior derecha) */}
      <button 
        onClick={toggleTheme}
        className="absolute top-5 right-5 p-2 rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-yellow-400 shadow-md hover:scale-110 transition-transform"
      >
        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      {/* TARJETA: Blanca vs Gris Oscuro (slate-900) */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-xl shadow-lg w-full max-w-md border border-slate-200 dark:border-slate-800 transition-colors duration-300">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Iuris UNA</h1>
          <p className="text-slate-500 dark:text-slate-400">Acceso Estudiantes de Derecho</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Correo Electrónico</label>
            <input
              type="email"
              required
              // INPUTS: Fondo claro vs Fondo oscuro (slate-800)
              className="w-full p-3 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-slate-800 dark:focus:ring-slate-500 focus:outline-none transition bg-white dark:bg-slate-800 dark:text-white"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Contraseña</label>
            <input
              type="password"
              required
              className="w-full p-3 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-slate-800 dark:focus:ring-slate-500 focus:outline-none transition bg-white dark:bg-slate-800 dark:text-white"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 dark:bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-slate-800 dark:hover:bg-indigo-700 transition flex items-center justify-center"
          >
            {loading ? <Loader2 className="animate-spin mr-2" /> : 'Ingresar / Registrarse'}
          </button>
        </form>
      </div>
    </div>
  )
}