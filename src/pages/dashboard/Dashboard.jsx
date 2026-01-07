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
  ChevronRight, Sparkles, GraduationCap, Bell
} from 'lucide-react'

// Botón de notificaciones
import NotificationButton from '../../components/ui/NotificationButton'

export default function Dashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()
  
  const [userEmail, setUserEmail] = useState('')
  const [average, setAverage] = useState('0.00')
  const [scrolled, setScrolled] = useState(false)
  
  // --- ESTADOS PARA LA AGENDA ---
  const [proximaTarea, setProximaTarea] = useState(null)
  const [loadingAgenda, setLoadingAgenda] = useState(true)
  const [progresoData, setProgresoData] = useState('Cargando...') 
  // ------------------------------------

  // --- DETECCIÓN DE SCROLL PARA EL HEADER ---
  useEffect(() => {
    const handleScroll = () => {
        setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // --- 2. CONFIGURACIÓN DEL TOUR GUIADO (MEJORADO V3) ---
  useEffect(() => {
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-300">
      
      {/* --- HEADER STICKY "GLASSMORPHISM" ---
          Se mantiene arriba al hacer scroll.
      */}
      <div className={`sticky top-0 z-40 transition-all duration-300 ${
          scrolled 
            ? 'bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 shadow-sm pt-2 pb-2' 
            : 'bg-transparent pt-6 pb-2'
      }`}>
        <div className="max-w-7xl mx-auto px-4 md:px-8">
            <header id="tour-welcome" className="flex justify-between items-center gap-4">
                <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                    <div className={`transition-all duration-300 flex items-center justify-center bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-2xl text-white shadow-lg shadow-indigo-500/30 shrink-0 ${
                        scrolled ? 'w-10 h-10 rounded-xl' : 'w-12 h-12 md:w-14 md:h-14 rounded-2xl'
                    }`}>
                        <span className={`font-bold ${scrolled ? 'text-lg' : 'text-xl md:text-2xl'}`}>{userEmail.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex flex-col justify-center min-w-0">
                        <h1 className={`font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight transition-all duration-300 ${
                            scrolled ? 'text-lg' : 'text-2xl md:text-3xl'
                        }`}>
                            {scrolled ? 'IURIS UNA' : 'Hola, Colega'}
                        </h1>
                        {!scrolled && (
                            <p className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400 truncate opacity-90 animate-in fade-in slide-in-from-left-2">
                                {userEmail}
                            </p>
                        )}
                    </div>
                </div>
                
                <div className="flex gap-2 items-center shrink-0">
                    <NotificationButton />
                    <button 
                    onClick={toggleTheme}
                    className="p-2.5 bg-white dark:bg-slate-800 text-slate-500 dark:text-yellow-400 border border-slate-200 dark:border-slate-700 rounded-full hover:bg-slate-50 hover:scale-105 active:scale-95 transition-all shadow-sm"
                    >
                    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                    <button 
                    onClick={handleLogout}
                    className="p-2.5 bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 rounded-full hover:text-red-600 hover:border-red-200 hover:bg-red-50 active:scale-95 transition-all shadow-sm"
                    >
                    <LogOut size={20} />
                    </button>
                </div>
            </header>
        </div>
      </div>

      {/* --- CONTENIDO PRINCIPAL ---
          Bento Grid Layout 
      */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 pb-32 pt-2">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">

            {/* COLUMNA 1: ESTADÍSTICAS Y AGENDA */}
            <div className="space-y-5 md:space-y-6">
                
                {/* TARJETA PROMEDIO (GPA) */}
                <Link to="/gpa" id="tour-gpa" className="block group h-auto">
                    <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 dark:from-slate-800 dark:to-slate-900 text-white p-6 rounded-[2rem] shadow-xl shadow-indigo-900/20 dark:shadow-none border border-white/10 dark:border-slate-700 transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-2xl">
                        <div className="relative z-10 flex flex-col h-full justify-between min-h-[180px]">
                            <div className="flex justify-between items-start mb-2">
                                <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-md shadow-inner border border-white/10">
                                    <GraduationCap size={22} className="text-indigo-100"/>
                                </div>
                                <span className={`text-[10px] uppercase tracking-wider font-bold px-3 py-1 rounded-full border shadow-sm backdrop-blur-md ${
                                    parseFloat(average) >= 4.5 
                                    ? 'bg-emerald-400/20 text-emerald-100 border-emerald-400/30' 
                                    : 'bg-indigo-400/20 text-indigo-100 border-indigo-400/30'
                                }`}>
                                    {parseFloat(average) >= 4.5 ? 'Honor Roll' : 'Activo'}
                                </span>
                            </div>
                            
                            <div>
                                <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-1 opacity-80">Promedio General</p>
                                <div className="flex items-baseline gap-1">
                                    <h2 className="text-6xl font-black tracking-tighter text-white drop-shadow-sm">{average}</h2>
                                    <span className="text-xl font-medium text-indigo-300">/5</span>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between group-hover:border-white/20 transition-colors">
                                <span className="text-xs font-medium text-indigo-100">Ver análisis detallado</span>
                                <div className="bg-white/20 p-1.5 rounded-full group-hover:bg-white group-hover:text-indigo-600 transition-all">
                                    <ChevronRight size={14}/>
                                </div>
                            </div>
                        </div>
                        
                        {/* Efectos de fondo */}
                        <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-white/10 rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-opacity"></div>
                        <div className="absolute bottom-[-10%] left-[-10%] w-32 h-32 bg-indigo-400/20 rounded-full blur-3xl opacity-20"></div>
                    </div>
                </Link>

                {/* TARJETA AGENDA */}
                <div id="tour-agenda">
                    <Link to="/agenda" className="block group">
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200/60 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none hover:border-indigo-300 dark:hover:border-indigo-800 transition-all duration-300 relative overflow-hidden h-full">
                            <div className="flex items-center justify-between mb-6 relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl shadow-sm">
                                        <CalendarCheck size={22} />
                                    </div>
                                    <h3 className="font-bold text-slate-800 dark:text-white text-lg">Agenda</h3>
                                </div>
                                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Próximo</span>
                            </div>
                            
                            <div className="relative z-10">
                                {loadingAgenda ? (
                                    <div className="animate-pulse space-y-3">
                                        <div className="h-5 bg-slate-100 dark:bg-slate-800 rounded-lg w-3/4"></div>
                                        <div className="h-4 bg-slate-50 dark:bg-slate-800 rounded-lg w-1/2"></div>
                                    </div>
                                ) : (
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50 group-hover:bg-blue-50/50 dark:group-hover:bg-slate-800 transition-colors">
                                        <div className="flex justify-between items-start gap-3">
                                            <div>
                                                <h4 className="text-lg font-bold text-slate-900 dark:text-white leading-tight mb-1.5 line-clamp-2">
                                                    {proximaTarea.titulo}
                                                </h4>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1">{proximaTarea.descripcion}</p>
                                            </div>
                                            {proximaTarea.fecha_formateada && (
                                                <div className="shrink-0 flex flex-col items-center bg-white dark:bg-slate-700 rounded-xl px-3 py-2 shadow-sm border border-slate-100 dark:border-slate-600">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Vence</span>
                                                    <span className="text-sm font-black text-red-500">{proximaTarea.fecha_formateada}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            {/* Decoración sutil */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-100/40 to-transparent dark:from-blue-900/10 rounded-bl-[4rem] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        </div>
                    </Link>
                </div>
            </div>

            {/* COLUMNA 2 Y 3: HERRAMIENTAS */}
            <div className="md:col-span-1 lg:col-span-2 space-y-5 md:space-y-6">
                
                {/* GRID DE HERRAMIENTAS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5 h-full">
                    
                    {/* IURIS CHAT */}
                    <Link to="/chat" id="tour-chat" className="group">
                        <div className="h-full bg-white dark:bg-slate-900 p-5 rounded-[1.8rem] border border-slate-200/60 dark:border-slate-800 shadow-sm hover:shadow-lg hover:shadow-green-100/50 dark:hover:shadow-none hover:border-green-300 dark:hover:border-green-800 transition-all duration-300 flex flex-col justify-between relative overflow-hidden">
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div className="w-12 h-12 flex items-center justify-center bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-2xl group-hover:scale-110 group-hover:rotate-[-5deg] transition-transform duration-300 shadow-sm">
                                    <MessageCircle size={24} />
                                </div>
                                <div className="text-slate-300 dark:text-slate-700 group-hover:text-green-500 group-hover:translate-x-1 transition-all">
                                    <ChevronRight size={20} />
                                </div>
                            </div>
                            <div className="relative z-10">
                                <h4 className="font-bold text-lg text-slate-800 dark:text-white group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors">Comunidad</h4>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Grupos de estudio & debate</p>
                            </div>
                            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-green-50 dark:bg-green-900/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
                        </div>
                    </Link>

                    {/* IURIS NEWS */}
                    <Link to="/news" className="group">
                        <div className="h-full bg-white dark:bg-slate-900 p-5 rounded-[1.8rem] border border-slate-200/60 dark:border-slate-800 shadow-sm hover:shadow-lg hover:shadow-sky-100/50 dark:hover:shadow-none hover:border-sky-300 dark:hover:border-sky-800 transition-all duration-300 flex flex-col justify-between relative overflow-hidden">
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div className="w-12 h-12 flex items-center justify-center bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 rounded-2xl group-hover:scale-110 group-hover:rotate-[5deg] transition-transform duration-300 shadow-sm">
                                    <Newspaper size={24} />
                                </div>
                                <div className="text-slate-300 dark:text-slate-700 group-hover:text-sky-500 group-hover:translate-x-1 transition-all">
                                    <ChevronRight size={20} />
                                </div>
                            </div>
                            <div className="relative z-10">
                                <h4 className="font-bold text-lg text-slate-800 dark:text-white group-hover:text-sky-700 dark:group-hover:text-sky-400 transition-colors">Noticias</h4>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Actualidad jurídica UNA</p>
                            </div>
                            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-sky-50 dark:bg-sky-900/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
                        </div>
                    </Link>

                    {/* MERCADO UNA */}
                    <Link to="/market" id="tour-market" className="group">
                        <div className="h-full bg-white dark:bg-slate-900 p-5 rounded-[1.8rem] border border-slate-200/60 dark:border-slate-800 shadow-sm hover:shadow-lg hover:shadow-purple-100/50 dark:hover:shadow-none hover:border-purple-300 dark:hover:border-purple-800 transition-all duration-300 flex flex-col justify-between relative overflow-hidden">
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div className="w-12 h-12 flex items-center justify-center bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-2xl group-hover:scale-110 transition-transform duration-300 shadow-sm">
                                    <ShoppingBag size={24} />
                                </div>
                                <div className="text-slate-300 dark:text-slate-700 group-hover:text-purple-500 group-hover:translate-x-1 transition-all">
                                    <ChevronRight size={20} />
                                </div>
                            </div>
                            <div className="relative z-10">
                                <h4 className="font-bold text-lg text-slate-800 dark:text-white group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors">Mercado</h4>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Servicios & Oportunidades</p>
                            </div>
                            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-purple-50 dark:bg-purple-900/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
                        </div>
                    </Link>

                    {/* LIBRERIA */}
                    <Link to="/library" id="tour-library" className="group">
                        <div className="h-full bg-white dark:bg-slate-900 p-5 rounded-[1.8rem] border border-slate-200/60 dark:border-slate-800 shadow-sm hover:shadow-lg hover:shadow-pink-100/50 dark:hover:shadow-none hover:border-pink-300 dark:hover:border-pink-800 transition-all duration-300 flex flex-col justify-between relative overflow-hidden">
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div className="w-12 h-12 flex items-center justify-center bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 rounded-2xl group-hover:scale-110 transition-transform duration-300 shadow-sm">
                                    <Book size={24} />
                                </div>
                                <div className="text-slate-300 dark:text-slate-700 group-hover:text-pink-500 group-hover:translate-x-1 transition-all">
                                    <ChevronRight size={20} />
                                </div>
                            </div>
                            <div className="relative z-10">
                                <h4 className="font-bold text-lg text-slate-800 dark:text-white group-hover:text-pink-700 dark:group-hover:text-pink-400 transition-colors">Librería</h4>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Compra & Venta de Libros</p>
                            </div>
                            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-pink-50 dark:bg-pink-900/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
                        </div>
                    </Link>

                    {/* LEXICON & TRACKER (Full width in mobile) */}
                    <Link to="/lexicon" className="group sm:col-span-2 lg:col-span-1">
                        <div className="h-full bg-gradient-to-r from-amber-50 to-orange-50/50 dark:from-slate-900 dark:to-slate-800/50 p-5 rounded-[1.8rem] border border-amber-100 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-amber-300 dark:hover:border-amber-800 transition-all flex items-center gap-4 relative overflow-hidden">
                            <div className="w-12 h-12 flex items-center justify-center bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl shrink-0 group-hover:rotate-12 transition-transform shadow-sm">
                                <BookA size={24} />
                            </div>
                            <div className="flex-1 relative z-10">
                                <h4 className="font-bold text-lg text-slate-800 dark:text-white group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">Léxico Jurídico</h4>
                                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Diccionario & Latín</p>
                            </div>
                            <div className="absolute right-4 text-amber-200/50 dark:text-amber-900/20 group-hover:scale-110 transition-transform">
                                <BookA size={64} />
                            </div>
                        </div>
                    </Link>

                    <Link to="/tracker" className="group sm:col-span-2 lg:col-span-1">
                        <div className="h-full bg-gradient-to-r from-emerald-50 to-teal-50/50 dark:from-slate-900 dark:to-slate-800/50 p-5 rounded-[1.8rem] border border-emerald-100 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-800 transition-all flex items-center gap-4 relative overflow-hidden">
                            <div className="w-12 h-12 flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl shrink-0 group-hover:scale-110 transition-transform shadow-sm">
                                <TrendingUp size={24} />
                            </div>
                            <div className="flex-1 relative z-10 min-w-0">
                                <h4 className="font-bold text-lg text-slate-800 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">Mi Progreso</h4>
                                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 truncate">{progresoData}</p>
                            </div>
                            <div className="absolute -top-2 -right-2 text-emerald-300/30 dark:text-emerald-800/20 animate-pulse">
                                <Sparkles size={48} />
                            </div>
                        </div>
                    </Link>

                </div>
            </div>

        </div>
      </main>
    </div>
  )
}