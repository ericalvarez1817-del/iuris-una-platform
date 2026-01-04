import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, Search, Book, Scale, Shield, Briefcase, FileText, X, ChevronRight } from 'lucide-react'

// Categorías EXACTAS basadas en tu lista
const CATEGORIES = [
  { label: 'Constitución', filter: 'Constitución Nacional', color: 'bg-blue-600', icon: Scale },
  { label: 'Código Civil', filter: 'Código Civil', color: 'bg-emerald-600', icon: Book },
  { label: 'Código Penal', filter: 'Código Penal', color: 'bg-red-600', icon: Shield },
  { label: 'Procesal Civil', filter: 'Código Procesal Civil', color: 'bg-teal-600', icon: Book },
  { label: 'Procesal Penal', filter: 'Código Procesal Penal', color: 'bg-orange-600', icon: Shield },
  { label: 'Laboral', filter: 'Código Laboral', color: 'bg-amber-600', icon: Briefcase },
  { label: 'Tributario', filter: 'Ley de Modernización Tributaria', color: 'bg-indigo-600', icon: FileText },
]

export default function LawsSearch() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeCat, setActiveCat] = useState(null)

  useEffect(() => {
    const doSearch = async () => {
      // Si no hay nada, limpiar (a menos que haya categoría activa)
      if (searchTerm.length < 2 && !activeCat) {
          setResults([])
          return
      }

      setLoading(true)
      let query = supabase.from('laws_db').select('id, corpus, article, title, content').limit(50)

      if (searchTerm.length >= 2) {
          query = query.textSearch('search_text', searchTerm, { type: 'websearch', config: 'spanish' })
      } else if (activeCat) {
          // Si solo hay categoría, ordenar por ID (simulando orden de lectura)
          query = query.eq('corpus', activeCat.filter).order('id', { ascending: true })
      }

      if (activeCat && searchTerm.length >= 2) {
          query = query.eq('corpus', activeCat.filter)
      }

      const { data } = await query
      setResults(data || [])
      setLoading(false)
    }

    const timer = setTimeout(doSearch, 300)
    return () => clearTimeout(timer)
  }, [searchTerm, activeCat])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-900 sticky top-0 z-20 p-4 shadow-sm border-b dark:border-slate-800">
        <div className="flex gap-3 items-center mb-4">
            <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-200"><ArrowLeft size={20}/></button>
            <h1 className="font-bold text-lg text-slate-800 dark:text-white">Buscador Jurídico</h1>
        </div>

        <div className="relative">
            <Search className="absolute left-3 top-3 text-slate-400" size={20} />
            <input 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder={activeCat ? `Buscar en ${activeCat.label}...` : "Buscar art, ley, tema..."}
                className="w-full pl-10 pr-10 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 dark:text-white transition"
            />
            {activeCat && <button onClick={() => setActiveCat(null)} className="absolute right-3 top-3 text-slate-400 hover:text-red-500"><X size={20}/></button>}
        </div>
      </header>

      <div className="p-4 max-w-3xl mx-auto space-y-4">
        {/* Chips de Categorías */}
        {!activeCat && !searchTerm && (
            <div className="grid grid-cols-2 gap-3 animate-fade-in-up">
                {CATEGORIES.map(cat => (
                    <button key={cat.label} onClick={() => setActiveCat(cat)} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-amber-400 shadow-sm flex items-center gap-3 transition-all active:scale-95 text-left">
                        <div className={`p-2 rounded-lg ${cat.color} text-white`}><cat.icon size={18}/></div>
                        <span className="font-bold text-sm text-slate-700 dark:text-slate-200">{cat.label}</span>
                    </button>
                ))}
            </div>
        )}

        {/* Resultados */}
        <div className="space-y-3">
            {results.map(item => (
                <div key={item.id} onClick={() => navigate(`/laws/${item.id}`)} className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border-l-4 border-amber-500 cursor-pointer hover:shadow-md transition-all active:scale-[0.99]">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{item.corpus}</span>
                        <ChevronRight size={16} className="text-slate-300"/>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                        {item.article} <span className="font-normal opacity-80 text-base" dangerouslySetInnerHTML={{__html: item.title}}></span>
                    </h3>
                    <div className="text-sm text-slate-500 line-clamp-2 mt-1" dangerouslySetInnerHTML={{__html: item.content}}></div>
                </div>
            ))}
        </div>
        
        {loading && <div className="text-center py-10 opacity-50">Buscando...</div>}
      </div>
    </div>
  )
}