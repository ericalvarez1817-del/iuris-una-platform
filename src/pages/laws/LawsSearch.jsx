import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, Search, Book, Scale, Shield, Briefcase, FileText, X, ChevronRight, AlertTriangle } from 'lucide-react'

// CATEGORÍAS "INTELIGENTES" (Usan palabras clave, no nombres exactos)
const CATEGORIES = [
  { label: 'Constitución', keyword: 'Constitu', color: 'bg-blue-600', icon: Scale },
  { label: 'Código Civil', keyword: 'CIVIL', color: 'bg-emerald-600', icon: Book },
  { label: 'Código Penal', keyword: 'PENAL', color: 'bg-red-600', icon: Shield },
  { label: 'Procesal Civil', keyword: 'PROCESAL CIVIL', color: 'bg-teal-600', icon: Book },
  { label: 'Procesal Penal', keyword: 'PROCESAL PENAL', color: 'bg-orange-600', icon: Shield },
  { label: 'Laboral', keyword: 'TRABAJO', color: 'bg-amber-600', icon: Briefcase },
  { label: 'Tributario', keyword: 'TRIBUTARIO', color: 'bg-indigo-600', icon: FileText },
  { label: 'Niñez y Adolescencia', keyword: 'NIÑEZ', color: 'bg-pink-600', icon: AlertTriangle },
]

export default function LawsSearch() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeCat, setActiveCat] = useState(null)

  useEffect(() => {
    const doSearch = async () => {
      // 1. Si no hay búsqueda ni categoría, limpiamos resultados
      if (searchTerm.length < 2 && !activeCat) {
          setResults([])
          return
      }

      setLoading(true)
      
      // 2. Construimos la consulta base
      let query = supabase
        .from('laws_db')
        .select('id, corpus, article, title, content')
        .limit(50)

      // 3. Lógica de Categoría (Filtro Flexible)
      if (activeCat) {
          // TRUCO: Usamos 'ilike' con %comodines% para encontrar "LEY... CODIGO CIVIL..."
          // buscando solo la palabra clave "CIVIL"
          query = query.ilike('corpus', `%${activeCat.keyword}%`)
          
          // Si no escribe texto, ordenamos "naturalmente" por ID para que salgan en orden
          if (searchTerm.length < 2) {
             query = query.order('id', { ascending: true })
          }
      }

      // 4. Lógica de Búsqueda de Texto
      if (searchTerm.length >= 2) {
          query = query.textSearch('search_text', searchTerm, { 
            type: 'websearch', 
            config: 'spanish' 
          })
      }

      const { data, error } = await query
      
      if (error) console.error("Error buscando:", error)
      setResults(data || [])
      setLoading(false)
    }

    const timer = setTimeout(doSearch, 300)
    return () => clearTimeout(timer)
  }, [searchTerm, activeCat])

  // Función auxiliar para recortar nombres largos
  const formatCorpusName = (name) => {
    if (name.includes('CONSTITUCIÓN')) return 'Constitución Nacional'
    // Quitamos "LEY N° XXX /" para que se lea mejor en la tarjeta
    return name.replace(/LEY N° \d+\/\s*/i, '').substring(0, 40) + (name.length > 40 ? '...' : '')
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      <header className="bg-white dark:bg-slate-900 sticky top-0 z-20 p-4 shadow-sm border-b dark:border-slate-800">
        <div className="flex gap-3 items-center mb-4">
            <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-200"><ArrowLeft size={20}/></button>
            <h1 className="font-bold text-lg text-slate-800 dark:text-white">Biblioteca Jurídica</h1>
        </div>

        <div className="relative">
            <Search className="absolute left-3 top-3 text-slate-400" size={20} />
            <input 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder={activeCat ? `Filtrando por ${activeCat.label}...` : "Buscar art, ley, tema..."}
                className="w-full pl-10 pr-10 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 dark:text-white transition shadow-sm"
            />
            {activeCat && <button onClick={() => setActiveCat(null)} className="absolute right-3 top-3 text-slate-400 hover:text-red-500"><X size={20}/></button>}
        </div>
      </header>

      <div className="p-4 max-w-3xl mx-auto space-y-4">
        
        {/* Chips de Categorías (Solo visibles si no hay filtro activo) */}
        {!activeCat && !searchTerm && (
            <div className="grid grid-cols-2 gap-3 animate-fade-in-up">
                {CATEGORIES.map(cat => (
                    <button key={cat.label} onClick={() => setActiveCat(cat)} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-amber-400 shadow-sm flex items-center gap-3 transition-all active:scale-95 text-left group">
                        <div className={`p-2.5 rounded-lg ${cat.color} text-white shadow-md group-hover:scale-110 transition-transform`}><cat.icon size={20}/></div>
                        <span className="font-bold text-sm text-slate-700 dark:text-slate-200">{cat.label}</span>
                    </button>
                ))}
            </div>
        )}

        {/* Banner de Filtro Activo */}
        {activeCat && (
            <div className={`p-3 rounded-lg ${activeCat.color} bg-opacity-10 border border-${activeCat.color} flex justify-between items-center animate-fade-in`}>
                <span className={`text-sm font-bold ${activeCat.color.replace('bg-', 'text-')}`}>
                    Mostrando resultados de: {activeCat.label}
                </span>
                <button onClick={() => setActiveCat(null)} className="text-xs underline opacity-60 hover:opacity-100">Limpiar filtro</button>
            </div>
        )}

        {/* Lista de Resultados */}
        <div className="space-y-3">
            {results.map(item => (
                <div key={item.id} onClick={() => navigate(`/laws/${item.id}`)} className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border-l-4 border-amber-500 cursor-pointer hover:shadow-md transition-all active:scale-[0.99] group">
                    <div className="flex justify-between items-center mb-1">
                        {/* Mostramos el nombre real del libro/ley pero formateado */}
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate max-w-[200px]">
                            {formatCorpusName(item.corpus)}
                        </span>
                        <ChevronRight size={16} className="text-slate-300 group-hover:text-amber-500"/>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">
                        {item.article} 
                        {/* Renderizamos el título solo si no es vacío */}
                        {item.title && <span className="font-normal opacity-80 text-base ml-2 italic" dangerouslySetInnerHTML={{__html: item.title}}></span>}
                    </h3>
                    <div className="text-sm text-slate-500 line-clamp-2 leading-relaxed" dangerouslySetInnerHTML={{__html: item.content}}></div>
                </div>
            ))}

            {/* Estado Vacío */}
            {!loading && results.length === 0 && (searchTerm || activeCat) && (
                <div className="text-center py-12 opacity-50">
                    <Book size={40} className="mx-auto mb-2 text-slate-300"/>
                    <p>No se encontraron artículos.</p>
                </div>
            )}
        </div>
        
        {loading && <div className="text-center py-10"><div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full mx-auto"></div></div>}
      </div>
    </div>
  )
}