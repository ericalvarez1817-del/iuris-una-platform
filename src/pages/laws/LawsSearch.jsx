import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, Search, Book, Loader2, AlertCircle } from 'lucide-react'

export default function LawsSearch() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  // Función de búsqueda optimizada
  useEffect(() => {
    const fetchResults = async () => {
      if (searchTerm.length < 3) {
        setResults([])
        return
      }

      setLoading(true)
      try {
        // Usamos 'websearch' para búsqueda inteligente en español
        const { data, error } = await supabase
          .from('laws_db')
          .select('id, corpus, article, title, content')
          .textSearch('search_text', searchTerm, {
            type: 'websearch',
            config: 'spanish'
          })
          .limit(20) // Traemos solo 20 para ser veloces

        if (error) throw error
        setResults(data || [])
      } catch (err) {
        console.error('Error buscando:', err)
      } finally {
        setLoading(false)
      }
    }

    // Debounce: Espera 500ms a que termines de escribir para buscar
    const timeoutId = setTimeout(fetchResults, 500)
    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  const truncateHTML = (html, maxLength) => {
    const tmp = document.createElement("DIV")
    tmp.innerHTML = html
    let text = tmp.textContent || tmp.innerText || ""
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-10 transition-colors duration-300">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 p-4 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-bold text-slate-800 dark:text-white text-lg">Buscador Jurídico</h1>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-3 text-slate-400" size={20} />
          <input 
            type="text"
            placeholder="Ej: homicidio, usucapión, art 15..."
            className="w-full pl-10 pr-4 py-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-amber-500 dark:text-white transition outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {loading && <Loader2 className="absolute right-3 top-3 animate-spin text-amber-500" size={20} />}
        </div>
      </header>

      <div className="p-4 max-w-3xl mx-auto space-y-4">
        {results.map((item) => (
          <div 
            key={item.id}
            onClick={() => navigate(`/laws/${item.id}`)}
            className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 active:scale-[0.98] transition-all cursor-pointer hover:border-amber-200 dark:hover:border-amber-900"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded uppercase tracking-wider">
                  {item.corpus}
                </span>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 mt-2 text-lg">
                  {item.article} <span className="font-normal opacity-80" dangerouslySetInnerHTML={{__html: item.title}} />
                </h3>
              </div>
              <Book className="text-slate-300 dark:text-slate-700 shrink-0" size={20} />
            </div>
            <div className="text-slate-500 dark:text-slate-400 text-sm line-clamp-3 leading-relaxed">
              {truncateHTML(item.content, 140)}
            </div>
          </div>
        ))}

        {!loading && searchTerm.length > 2 && results.length === 0 && (
          <div className="text-center py-10 text-slate-400">
            <AlertCircle className="mx-auto mb-2 opacity-50" size={32} />
            <p>No encontramos resultados para "{searchTerm}"</p>
          </div>
        )}
      </div>
    </div>
  )
}