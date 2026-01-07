import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import useTheme from '../../hooks/useTheme'
import { useNavigate, Link, useLocation } from 'react-router-dom'
// 1. IMPORTAMOS DRIVER.JS Y SUS ESTILOS
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

// Importamos los iconos
import { 
  LogOut, Award, TrendingUp, CalendarCheck, Sun, Moon, 
  BookA, ShoppingBag, Book, Newspaper, MessageCircle, 
  ChevronRight, Sparkles, GraduationCap
} from 'lucide-react'

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

  // --- 2. CONFIGURACIÓN DEL TOUR GUIADO (MEJORADO V3) ---
  useEffect(() => {
    // Cambié la key a 'v3' para que el tour se reinicie y veas los cambios
    const hasSeenTour = localStorage.getItem('iuris_walkthrough_v3')
    
    if (!hasSeenTour) {
      const driverObj = driver({
        showProgress: true,
        allowClose: false,
        animate: true,
        // Configuración de textos
        nextBtnText: 'Siguiente →',
        prevBtnText: '← Atrás',
        doneBtnText: '¡Comenzar!',
        steps: [
          { 
            element: '#tour-welcome', 
            popover: { 
              title: '👋 Bienvenido a IURIS UNA', 
              description: 'Tu centro de comando académico. Aquí gestionas tu vida universitaria, finanzas y herramientas legales.', 
              side: "bottom", 
              align: 'center' 
            } 
          },
          { 
            element: '#tour-gpa', 
            popover: { 
              title: '🎓 Tu Promedio (GPA)', 
              description: 'Tu calificación en tiempo real. Usa el botón "Calcular" para proyectar qué notas necesitas en tus finales.', 
              side: "bottom", 
              align: 'start' 
            } 
          },
          { 
            element: '#tour-market', 
            popover: { 
              title: '🤝 Mercado de Servicios', 
              description: 'Conecta talento. Aquí puedes ofrecer tus servicios (gestoría, tipeo, pasantías) o contratar a otros colegas.', 
              side: "top", 
              align: 'start' 
            } 
          },
          { 
            element: '#tour-library', 
            popover: { 
              title: '📚 Librería IURIS', 
              description: 'El espacio para comercializar conocimiento. Compra y vende libros usados, códigos y resúmenes de calidad.', 
              side: "top", 
              align: 'start' 
            } 
          },
          { 
            element: '#tour-chat', 
            popover: { 
              title: '⚖️ Comunidad UNA', 
              description: 'Networking real. Únete a grupos de estudio verificados y debate con tus futuros colegas.', 
              side: "top", 
              align: 'start' 
            } 
          },
          { 
            element: '#tour-agenda', 
            popover: { 
              title: '📅 Agenda Inteligente', 
              description: 'Tus parciales y entregas se ordenan automáticamente por urgencia. Nunca pierdas una fecha límite.', 
              side: "top", 
              align: 'start' 
            } 
          },
          // --- NUEVO PASO: LEYES (En la barra inferior) ---
          { 
            element: '#nav-laws', 
            popover: { 
              title: '🏛️ Leyes al Instante', 
              description: 'Tu herramienta más potente. Accede a todos los códigos y leyes vigentes con un lector optimizado para estudiantes.', 
              side: "top", 
              align: 'center' 
            } 
          }
        ],
        onDestroyStarted: () => {
           localStorage.setItem('iuris_walkthrough_v3', 'true')
           driverObj.destroy();
        },
      });

      // Delay para asegurar que todo cargó antes de iniciar
      setTimeout(() => {
        driverObj.drive();
      }, 1500); 
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
        titulo: 'Todo al día',
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
            setProgresoData(`Avanzando en ${numMaterias} materias. Top: Bolilla ${maxBolilla}`);
        } else {
            setProgresoData('Comienza a registrar tu avance.');
        }

    } else {
        setProgresoData('Comienza a registrar tu avance.');
    }
  }


  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 pb-32 transition-colors duration-300 font-sans">
      
      {/* WRAPPER PRINCIPAL PARA LIMITAR ANCHO EN PC */}
      <div className="max-w-7xl mx-auto">

        {/* HEADER MEJORADO */}
        <header id="tour-welcome" className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                <span className="text-2xl font-bold">{userEmail.charAt(0).toUpperCase()}</span>
            </div>
            <div>
                <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Hola, Colega</h1>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate max-w-[220px] sm:max-w-md">{userEmail}</p>
            </div>
          </div>
          
          <div className="flex gap-3 items-center w-full md:w-auto justify-end">
            <NotificationButton />
            <button 
              onClick={toggleTheme}
              className="p-3 bg-white dark:bg-slate-800 text-slate-500 dark:text-yellow-400 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 hover:scale-105 active:scale-95 transition-all shadow-sm"
            >
              {theme === 'dark' ? <Sun size={22} /> : <Moon size={22} />}
            </button>
            <button 
              onClick={handleLogout}
              className="p-3 bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 rounded-xl hover:text-red-600 hover:border-red-200 hover:bg-red-50 active:scale-95 transition-all shadow-sm"
            >
              <LogOut size={22} />
            </button>
          </div>
        </header>

        {/* BENTO GRID LAYOUT */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* COLUMNA 1: ESTADÍSTICAS Y AGENDA */}
            <div className="space-y-6">
                
                {/* TARJETA PROMEDIO (GPA) */}
                <Link to="/gpa" id="tour-gpa" className="block group">
                    <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-950 text-white p-6 rounded-[2rem] shadow-xl shadow-slate-900/10 border border-slate-200/10 transition-transform group-hover:translate-y-[-4px]">
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-2">
                                <div className="p-2 bg-white/10 rounded-lg backdrop-blur-md">
                                    <GraduationCap size={24} className="text-indigo-300"/>
                                </div>
                                <span className="bg-emerald-500/20 text-emerald-300 text-xs font-bold px-2 py-1 rounded-full border border-emerald-500/30">
                                    {parseFloat(average) >= 4.5 ? 'HONOR' : 'ACTIVO'}
                                </span>
                            </div>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Promedio General</p>
                            <h2 className="text-5xl font-black tracking-tight mb-2">{average}</h2>
                            <div className="flex items-center gap-1 text-slate-400 text-sm group-hover:text-indigo-300 transition-colors">
                                <span>Ver detalles y calcular</span>
                                <ChevronRight size={16}/>
                            </div>
                        </div>
                        {/* Decoración de fondo */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 rounded-full blur-[80px] opacity-20 group-hover:opacity-30 transition-opacity"></div>
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-teal-500 rounded-full blur-[60px] opacity-20"></div>
                    </div>
                </Link>

                {/* TARJETA AGENDA */}
                <div id="tour-agenda">
                    <Link to="/agenda" className="block group h-full">
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-none hover:shadow-xl hover:border-indigo-200 dark:hover:border-indigo-900 transition-all h-full flex flex-col justify-between relative overflow-hidden">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl">
                                    <CalendarCheck size={22} />
                                </div>
                                <h3 className="font-bold text-slate-800 dark:text-white">Próximo Evento</h3>
                            </div>
                            
                            {loadingAgenda ? (
                                <div className="animate-pulse space-y-2">
                                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                                    <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/2"></div>
                                </div>
                            ) : (
                                <div>
                                    <h4 className="text-xl font-bold text-slate-900 dark:text-white leading-tight mb-1 line-clamp-2">
                                        {proximaTarea.titulo}
                                    </h4>
                                    <div className="flex justify-between items-end mt-2">
                                        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1">{proximaTarea.descripcion}</p>
                                        {proximaTarea.fecha_formateada && (
                                            <span className="shrink-0 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold px-2 py-1 rounded-lg border border-red-100 dark:border-red-900/30">
                                                {proximaTarea.fecha_formateada}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-bl-full pointer-events-none"></div>
                        </div>
                    </Link>
                </div>
            </div>

            {/* COLUMNA 2: HERRAMIENTAS PRINCIPALES */}
            <div className="md:col-span-1 lg:col-span-2 space-y-6">
                
                {/* SECCION HERRAMIENTAS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full">
                    
                    {/* IURIS CHAT */}
                    <Link to="/chat" id="tour-chat" className="group">
                        <div className="h-full bg-white dark:bg-slate-900 p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-lg hover:border-green-200 dark:hover:border-green-900 transition-all flex flex-col justify-between">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-2xl group-hover:scale-110 transition-transform">
                                    <MessageCircle size={26} />
                                </div>
                                <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-full text-slate-400 group-hover:text-green-500 transition-colors">
                                    <ChevronRight size={18} />
                                </div>
                            </div>
                            <div>
                                <h4 className="font-bold text-lg text-slate-800 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">Comunidad</h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Grupos de estudio & debate</p>
                            </div>
                        </div>
                    </Link>

                    {/* IURIS NEWS */}
                    <Link to="/news" className="group">
                        <div className="h-full bg-white dark:bg-slate-900 p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-900 transition-all flex flex-col justify-between">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl group-hover:scale-110 transition-transform">
                                    <Newspaper size={26} />
                                </div>
                                <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-full text-slate-400 group-hover:text-blue-500 transition-colors">
                                    <ChevronRight size={18} />
                                </div>
                            </div>
                            <div>
                                <h4 className="font-bold text-lg text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Noticias</h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Actualidad jurídica UNA</p>
                            </div>
                        </div>
                    </Link>

                    {/* MERCADO UNA */}
                    <Link to="/market" id="tour-market" className="group">
                        <div className="h-full bg-white dark:bg-slate-900 p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-lg hover:border-purple-200 dark:hover:border-purple-900 transition-all flex flex-col justify-between">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-2xl group-hover:scale-110 transition-transform">
                                    <ShoppingBag size={26} />
                                </div>
                                <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-full text-slate-400 group-hover:text-purple-500 transition-colors">
                                    <ChevronRight size={18} />
                                </div>
                            </div>
                            <div>
                                <h4 className="font-bold text-lg text-slate-800 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">Mercado</h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Servicios & Oportunidades</p>
                            </div>
                        </div>
                    </Link>

                    {/* LIBRERIA */}
                    <Link to="/library" id="tour-library" className="group">
                        <div className="h-full bg-white dark:bg-slate-900 p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-lg hover:border-pink-200 dark:hover:border-pink-900 transition-all flex flex-col justify-between">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 rounded-2xl group-hover:scale-110 transition-transform">
                                    <Book size={26} />
                                </div>
                                <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-full text-slate-400 group-hover:text-pink-500 transition-colors">
                                    <ChevronRight size={18} />
                                </div>
                            </div>
                            <div>
                                <h4 className="font-bold text-lg text-slate-800 dark:text-white group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">Librería</h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Compra & Venta de Libros</p>
                            </div>
                        </div>
                    </Link>

                    {/* LEXICON & TRACKER (SPAN COMPLETO EN MÓVIL) */}
                    <Link to="/lexicon" className="group sm:col-span-2 lg:col-span-1">
                        <div className="h-full bg-gradient-to-r from-amber-50 to-orange-50 dark:from-slate-900 dark:to-slate-900 p-5 rounded-[1.5rem] border border-amber-100 dark:border-slate-800 shadow-sm hover:shadow-lg hover:border-amber-300 dark:hover:border-amber-900 transition-all flex items-center gap-4">
                            <div className="p-3 bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-2xl group-hover:rotate-12 transition-transform">
                                <BookA size={26} />
                            </div>
                            <div>
                                <h4 className="font-bold text-lg text-slate-800 dark:text-white">Léxico Jurídico</h4>
                                <p className="text-sm text-slate-600 dark:text-slate-400">Diccionario & Latín</p>
                            </div>
                        </div>
                    </Link>

                    <Link to="/tracker" className="group sm:col-span-2 lg:col-span-1">
                        <div className="h-full bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-slate-900 dark:to-slate-900 p-5 rounded-[1.5rem] border border-emerald-100 dark:border-slate-800 shadow-sm hover:shadow-lg hover:border-emerald-300 dark:hover:border-emerald-900 transition-all flex items-center gap-4 relative overflow-hidden">
                            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl z-10 group-hover:scale-110 transition-transform">
                                <TrendingUp size={26} />
                            </div>
                            <div className="z-10 flex-1">
                                <h4 className="font-bold text-lg text-slate-800 dark:text-white">Mi Progreso</h4>
                                <p className="text-sm text-slate-600 dark:text-slate-400 truncate w-full">{progresoData}</p>
                            </div>
                            {/* Sparkle Icon Decorativo */}
                            <Sparkles className="absolute right-2 top-2 text-emerald-200 dark:text-emerald-900/20 opacity-50" size={60} />
                        </div>
                    </Link>

                </div>
            </div>

        </div>
      </div>
    </div>
  )
}