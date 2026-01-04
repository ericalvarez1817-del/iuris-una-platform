import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, Search, Book, Gavel, Scale, FileText, ChevronRight, X } from 'lucide-react'

// Configuración de las Tarjetas (Puedes agregar más)
const LAW_CATEGORIES = [
  { id: 'Constitución Nacional', label: 'Constitución', icon: Scale, color: 'bg-blue-600', text: 'text-blue-600', bgLight: 'bg-blue-50' },
  { id: 'Código Civil', label: 'Código Civil', icon: Book, color: 'bg-emerald-600', text: 'text-emerald-600', bgLight: 'bg-emerald-50' },
  { id: 'Código Procesal Civil', label: 'Procesal Civil', icon: Gavel, color: 'bg-teal-600', text: 'text-teal-600', bgLight: 'bg-teal-50' },
  { id: 'Código Penal', label: 'Código Penal', icon: AlertTriangle, color: 'bg-red-600', text: 'text-red-600', bgLight: 'bg-red-50' },
  { id: 'Código Procesal Penal', label: 'Procesal Penal', icon: Gavel, color: 'bg-orange-600', text: 'text-orange-600', bgLight: 'bg-orange-50' },
  { id: 'Código Laboral', label: 'Laboral', icon: Briefcase, color: 'bg-amber-600', text: 'text-amber-600', bgLight: 'bg-amber-50' },
]

// Iconos extra por si no tienes importados todos
import { AlertTriangle, Briefcase } from 'lucide-react'

export default function LawsSearch() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeFilter, setActiveFilter] = useState(null) // Filtro seleccionado

  useEffect(() => {
    const fetchResults = async () => {
      // Si no hay búsqueda ni filtro, limpiamos (mostramos tarjetas)
      if (searchTerm.length < 2 && !activeFilter) {
        setResults([])
        return
      }

      setLoading(true)
      try {
        let query = supabase
          .from('laws_db')
          .select('id, corpus, article, title, content')
          .limit(50)

        // Lógica de búsqueda
        if (searchTerm.length >= 2) {
            query = query.textSearch('search_text', searchTerm, {
                type: 'websearch',
                config: 'spanish'
            })
        }

        // Lógica de filtro por tarjeta
        if (activeFilter) {
            query = query.eq('corpus', activeFilter)
            // Si solo hay filtro (sin texto), traemos los primeros artículos
            if (searchTerm.length < 2) {
                query = query.order('id', { ascending: true }) // Intenta ordenar por orden de creación
            }
        }

        const { data, error } = await query
        if (error) throw error
        setResults(data || [])
      } catch (err) {
        console.error('Error buscando:', err)
      } finally {
        setLoading(false)
      }
    }

    const timeoutId = setTimeout(fetchResults, 400)
    return () => clearTimeout(timeoutId)
  }, [searchTerm, activeFilter])

  const truncateHTML = (html, maxLength) => {
    const tmp = document.createElement("DIV")
    tmp.innerHTML = html
    let text = tmp.textContent || tmp.innerText || ""
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-10">
      {/* Header Sticky */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 p-4 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 text-slate-600 dark:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-bold text-slate-800 dark:text-white text-lg">Biblioteca Jurídica</h1>
        </div>

        {/* Barra de Búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-3 text-slate-400" size={20} />
          <input 
            type="text"
            placeholder={activeFilter ? `Buscando en ${activeFilter}...` : "Buscar en todas las leyes..."}
            className="w-full pl-10 pr-10 py-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-amber-500 dark:text-white transition outline-none font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {activeFilter && (
            <button onClick={() => setActiveFilter(null)} className="absolute right-2 top-2 p-1 text-slate-400 hover:text-red-500">
                <X size={18} />
            </button>
          )}
        </div>
        
        {/* Chips de filtro activo */}
        {activeFilter && (
            <div className="mt-3 flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Filtrando por:</span>
                <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold flex items-center gap-1">
                    {activeFilter}
                </span>
            </div>
        )}
      </header>

      <div className="p-4 max-w-3xl mx-auto space-y-6">
        
        {/* VISTA 1: TARJETAS (Solo si no hay búsqueda ni filtro) */}
        {!activeFilter && searchTerm.length < 2 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 animate-fade-in-up">
                {LAW_CATEGORIES.map((cat) => (
                    <button 
                        key={cat.id}
                        onClick={() => setActiveFilter(cat.id)}
                        className={`${cat.bgLight} dark:bg-slate-900 border border-transparent dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-600 p-4 rounded-xl text-left transition-all active:scale-95 group shadow-sm`}
                    >
                        <div className={`w-10 h-10 rounded-lg ${cat.color} flex items-center justify-center mb-3 text-white shadow-md group-hover:scale-110 transition-transform`}>
                            <cat.icon size={20} />
                        </div>
                        <h3 className={`font-bold text-sm ${cat.text} dark:text-slate-200 leading-tight`}>
                            {cat.label}
                        </h3>
                    </button>
                ))}
                {/* Botón para "Otros" */}
                <button 
                     onClick={() => { setSearchTerm('Ley'); }} // Truco para buscar genérico
                     className="bg-slate-100 dark:bg-slate-800 p-4 rounded-xl text-left hover:bg-slate-200 transition-colors flex flex-col justify-between"
                >
                    <div className="w-10 h-10 rounded-lg bg-slate-300 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
                        <FileText size={20} />
                    </div>
                    <span className="font-bold text-sm text-slate-600 dark:text-slate-300 mt-3">Otras Leyes</span>
                </button>
            </div>
        )}

        {/* VISTA 2: RESULTADOS */}
        <div className="space-y-3">
          {results.map((item) => (
            <div 
              key={item.id}
              onClick={() => navigate(`/laws/${item.id}`)}
              className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border-l-4 border-amber-500 border-y border-r border-slate-100 dark:border-slate-800 active:scale-[0.99] transition-all cursor-pointer hover:shadow-md group"
            >
              <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                        {item.corpus}
                    </span>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg group-hover:text-amber-600 transition-colors">
                        {item.article} <span className="font-normal opacity-90 text-base" dangerouslySetInnerHTML={{__html: item.title}} />
                    </h3>
                  </div>
                  <ChevronRight className="text-slate-300 group-hover:text-amber-500 transition-colors" size={20} />
              </div>
              <div className="mt-2 text-slate-500 dark:text-slate-400 text-sm line-clamp-2 font-serif leading-relaxed opacity-80">
                {truncateHTML(item.content, 120)}
              </div>
            </div>
          ))}
        </div>

        {/* Estados de Carga y Vacío */}
        {loading && <div className="text-center py-10"><div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full mx-auto"></div></div>}
        
        {!loading && searchTerm.length >= 2 && results.length === 0 && (
           <div className="text-center py-12 opacity-60">
             <Book size={48} className="mx-auto mb-3 text-slate-300" />
             <p>No encontramos nada para "{searchTerm}"</p>
           </div>
        )}
      </div>
    </div>
  )
}