import { Outlet, useLocation, Link } from 'react-router-dom'
import { Home, Scale, Calculator, FileText, BookA, TrendingUp } from 'lucide-react'

export default function AppLayout() {
  const location = useLocation()
  
  // Ocultamos la barra global solo si estamos dentro del Mercado
  const isMarketplace = location.pathname === '/market'

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300 ${!isMarketplace ? 'pb-24' : ''}`}>
      
      <Outlet />

      {!isMarketplace && (
        <nav className="fixed bottom-0 left-0 w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-40 px-1 py-3 safe-area-bottom">
          <div className="flex justify-between items-center max-w-lg mx-auto overflow-x-auto no-scrollbar">
            
            <Link to="/dashboard" className={`flex flex-col items-center gap-1 min-w-[50px] transition-colors ${location.pathname === '/dashboard' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
              <Home size={22} strokeWidth={location.pathname === '/dashboard' ? 2.5 : 2} />
              <span className="text-[10px] font-bold">Inicio</span>
            </Link>

            <Link to="/tracker" className={`flex flex-col items-center gap-1 min-w-[50px] transition-colors ${location.pathname === '/tracker' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
              <TrendingUp size={22} strokeWidth={location.pathname === '/tracker' ? 2.5 : 2} />
              <span className="text-[10px] font-bold">Progreso</span>
            </Link>

            <Link to="/laws" className={`flex flex-col items-center gap-1 min-w-[50px] transition-colors ${location.pathname.includes('/laws') ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
              <Scale size={22} strokeWidth={location.pathname.includes('/laws') ? 2.5 : 2} />
              <span className="text-[10px] font-bold">Leyes</span>
            </Link>

            {/* AQUI ESTÁ LA CALCULADORA RECUPERADA */}
            <Link to="/tools" className={`flex flex-col items-center gap-1 min-w-[50px] transition-colors ${location.pathname === '/tools' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
              <Calculator size={22} strokeWidth={location.pathname === '/tools' ? 2.5 : 2} />
              <span className="text-[10px] font-bold">Plazos</span>
            </Link>
            
             <Link to="/lexicon" className={`flex flex-col items-center gap-1 min-w-[50px] transition-colors ${location.pathname === '/lexicon' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
              <BookA size={22} strokeWidth={location.pathname === '/lexicon' ? 2.5 : 2} />
              <span className="text-[10px] font-bold">Léxico</span>
            </Link>

            <Link to="/notes" className={`flex flex-col items-center gap-1 min-w-[50px] transition-colors ${location.pathname === '/notes' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
              <FileText size={22} strokeWidth={location.pathname === '/notes' ? 2.5 : 2} />
              <span className="text-[10px] font-bold">Notas</span>
            </Link>

          </div>
        </nav>
      )}
    </div>
  )
}