import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import useTheme from '../../hooks/useTheme'
import { useNavigate, Link, useLocation } from 'react-router-dom'
// 1. IMPORTAMOS DRIVER.JS Y SUS ESTILOS
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

// Importamos los iconos
import { LogOut, Award, TrendingUp, CalendarCheck, Sun, Moon, BookA, ShoppingBag, Book, Newspaper, MessageCircle } from 'lucide-react'

// Botón de notificaciones
import NotificationButton from '../../components/ui/NotificationButton'

export default function Dashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()
  
  const [userEmail, setUserEmail] = useState('')
  const [average, setAverage] = useState('0.00')
  
  // --- ESTADOS PARA LA AGENDA ---
  const [proximaTarea, setProximaTarea] = useState(null)
  const [loadingAgenda, setLoadingAgenda] = useState(true)
  const [progresoData, setProgresoData] = useState('Cargando...') 
  // ------------------------------------

  // --- 2. CONFIGURACIÓN DEL TOUR GUIADO (CORREGIDO) ---
  useEffect(() => {
    const hasSeenTour = localStorage.getItem('iuris_walkthrough_v2') // Cambié a v2 para que te vuelva a salir
    
    if (!hasSeenTour) {
      const driverObj = driver({
        showProgress: true,
        allowClose: false,
        animate: true,
        // Textos de botones más amigables
        nextBtnText: 'Siguiente →',
        prevBtnText: '← Atrás',
        doneBtnText: '¡Avanzar!',
        // Pasos detallados según tus correcciones
        steps: [
          { 
            element: '#tour-welcome', 
            popover: { 
              title: '👋 Bienvenido a IURIS UNA', 
              description: 'Tu centro de comando académico. Aquí gestionas tu vida universitaria, finanzas y herramientas.', 
              side: "bottom", 
              align: 'center' 
            } 
          },
          { 
            element: '#tour-gpa', 
            popover: { 
              title: '🎓 Tu Promedio (GPA)', 
              description: 'Visualiza tu calificación actual en tiempo real. Toca "Calcular" para proyectar qué notas necesitas para alcanzar el cuadro de honor.', 
              side: "bottom", 
              align: 'start' 
            } 
          },
          { 
            element: '#tour-market', 
            popover: { 
              title: '💼 Mercado de Servicios', 
              description: '¿Buscas u ofreces servicios? Aquí puedes contratar gestores, solicitar tipeos o publicitar tus habilidades profesionales para ganar dinero.', 
              side: "top", 
              align: 'start' 
            } 
          },
          { 
            element: '#tour-library', 
            popover: { 
              title: '📚 Librería Digital & Resúmenes', 
              description: 'Compra y venta de material académico. Encuentra libros usados, códigos y los mejores resúmenes hechos por otros alumnos.', 
              side: "top", 
              align: 'start' 
            } 
          },
          { 
            element: '#tour-chat', 
            popover: { 
              title: '👥 Comunidad Verificada', 
              description: 'Grupos de estudio y networking exclusivo para estudiantes de la UNA. Conecta con tus futuros colegas.', 
              side: "top", 
              align: 'start' 
            } 
          },
          { 
            element: '#tour-agenda', 
            popover: { 
              title: '📅 Agenda de Plazos', 
              description: 'No pierdas ningún examen. Tus parciales y fechas límite se ordenan automáticamente por urgencia aquí.', 
              side: "top", 
              align: 'start' 
            } 
          }
        ],
        onDestroyStarted: () => {
           localStorage.setItem('iuris_walkthrough_v2', 'true')
           driverObj.destroy();
        },
      });

      setTimeout(() => {
        driverObj.drive();
      }, 1500); // Un poco más de delay para asegurar carga visual
    }
  }, [])
  // ----------------------------------------

  useEffect(() => {
    getUser()
    getAverage()
    fetchProximaTarea()
    fetchProgresoData() 
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

  const fetchProximaTarea = async () => {
    setLoadingAgenda(true)
    const { data, error } = await supabase
      .from('tareas_agenda')
      .select('titulo, descripcion, fecha_limite')
      .eq('completada', false)
      .order('fecha_limite', { ascending: true })
      .limit(1)

    if (error) {
      console.error('Error al cargar la agenda:', error)
      setProximaTarea({
        titulo: 'Error de conexión',
        descripcion: 'No se pudo cargar la agenda',
        fecha_formateada: ''
      })
    } else if (data && data.length > 0) {
      const fecha = new Date(data[0].fecha_limite).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
      setProximaTarea({
        ...data[0],
        fecha_formateada: fecha.replace('.', '')
      })
    } else {
      setProximaTarea({
        titulo: 'Sin Eventos Próximos',
        descripcion: '¡Añade tu primer parcial!',
        fecha_formateada: ''
      })
    }
    setLoadingAgenda(false)
  }
  
  const fetchProgresoData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        setProgresoData('Inicia sesión para ver tu progreso')
        return
    }

    const { data: trackerEntries, error } = await supabase
        .from('student_progress') 
        .select('subject_id, bolilla_number')
        .eq('user_id', user.id)

    if (error) {
        console.error('Error al cargar el progreso:', error)
        setProgresoData('Error al cargar datos.')
        return
    }

    if (trackerEntries && trackerEntries.length > 0) {
        const progressBySubject = trackerEntries.reduce((acc, entry) => {
            const currentMax = acc[entry.subject_id] || 0;
            acc[entry.subject_id] = Math.max(currentMax, entry.bolilla_number);
            return acc;
        }, {});

        const numMaterias = Object.keys(progressBySubject).length;
        
        let maxBolilla = 0;
        let mostAdvancedSubject = 'N/A'; 

        for (const [subject, bolilla] of Object.entries(progressBySubject)) {
            if (bolilla > maxBolilla) {
                maxBolilla = bolilla;
                mostAdvancedSubject = subject;
            }
        }

        if (numMaterias > 0) {
            setProgresoData(`Avanzando en ${numMaterias} materias. Última bolilla: ${maxBolilla} (${mostAdvancedSubject})`);
        } else {
            setProgresoData('Comienza a registrar tu avance.');
        }

    } else {
        setProgresoData('Comienza a registrar tu avance.');
    }
  }


  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 pb-24 transition-colors duration-300">
      
      {/* HEADER con ID #tour-welcome */}
      <div id="tour-welcome" className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Hola, Colega</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 truncate max-w-[200px]">{userEmail}</p>
        </div>
        
        <div className="flex gap-2 items-center">
          <NotificationButton />
          <button 
            onClick={toggleTheme}
            className="p-2 bg-white dark:bg-slate-800 text-slate-400 dark:text-yellow-400 border border-slate-200 dark:border-slate-700 rounded-full hover:bg-slate-100 transition shadow-sm"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button 
            onClick={handleLogout}
            className="p-2 bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 rounded-full hover:text-red-600 hover:border-red-200 transition shadow-sm"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* TARJETA PROMEDIO con ID #tour-gpa */}
      <Link to="/gpa" id="tour-gpa" className="block transform transition hover:scale-[1.02] active:scale-95 mb-6">
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

      {/* 0. IURIS CHAT con ID #tour-chat */}
      <Link to="/chat" id="tour-chat" className="block mb-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex gap-4 items-center transition-colors hover:border-green-400 group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-green-50 dark:to-green-900/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-3 rounded-lg text-white shadow-md group-hover:scale-110 transition-transform z-10">
            <MessageCircle size={24} />
          </div>
          <div className="z-10">
            <h4 className="font-bold text-slate-800 dark:text-slate-100">IURIS Chat</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Grupos & Comunidad</p>
          </div>
        </div>
      </Link>

      {/* 1. IURIS NEWS */}
      <Link to="/news" className="block mb-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex gap-4 items-center transition-colors hover:border-blue-400 group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-blue-50 dark:to-blue-900/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-3 rounded-lg text-white shadow-md group-hover:scale-110 transition-transform z-10">
            <Newspaper size={24} />
          </div>
          <div className="z-10">
            <h4 className="font-bold text-slate-800 dark:text-slate-100">IURIS News</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Noticias UNA & Jurídicas</p>
          </div>
        </div>
      </Link>

      {/* 2. MERCADO UNA con ID #tour-market */}
      <Link to="/market" id="tour-market" className="block mb-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex gap-4 items-center transition-colors hover:border-indigo-400 group relative overflow-hidden">
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

      {/* 3. LIBRERÍA DIGITAL con ID #tour-library */}
      <Link to="/library" id="tour-library" className="block mb-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex gap-4 items-center transition-colors hover:border-fuchsia-400 group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-fuchsia-50 dark:to-fuchsia-900/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="bg-gradient-to-br from-fuchsia-500 to-pink-600 p-3 rounded-lg text-white shadow-md group-hover:scale-110 transition-transform z-10">
            <Book size={24} />
          </div>
          <div className="z-10">
            <h4 className="font-bold text-slate-800 dark:text-slate-100">Librería IURIS</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Ebooks & Resúmenes</p>
          </div>
        </div>
      </Link>

      {/* 4. LÉXICO DE PODER */}
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

      {/* AGENDA con ID #tour-agenda */}
      <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 text-lg">Tu Agenda</h3>
      
      <div id="tour-agenda" className="space-y-3">
        {/* Card 1: PRÓXIMO PARCIAL */}
        <Link to="/agenda" className="block">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex gap-4 items-center transition-colors hover:border-blue-400">
            {loadingAgenda ? (
                <div className="flex items-center gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg text-blue-600 dark:text-blue-400 animate-pulse">
                        <CalendarCheck size={24} />
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Cargando próximos eventos...</p>
                </div>
            ) : (
                <>
                    <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg text-blue-600 dark:text-blue-400">
                        <CalendarCheck size={24} />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-100">{proximaTarea.titulo}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {proximaTarea.descripcion} {proximaTarea.fecha_formateada && `- ${proximaTarea.fecha_formateada}`}
                        </p>
                    </div>
                </>
            )}
            </div>
        </Link>

        {/* Card 2: PROGRESO DE ESTUDIO */}
        <Link to="/tracker" className="block">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex gap-4 items-center transition-colors hover:border-emerald-400">
                <div className="bg-emerald-50 dark:bg-emerald-900/30 p-3 rounded-lg text-emerald-600 dark:text-emerald-400">
                    <TrendingUp size={24} />
                </div>
                <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-100">Progreso de Estudio</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{progresoData}</p>
                </div>
            </div>
        </Link>
      </div>
    </div>
  )
}