import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, Search, Book, Copy, Check, 
  Bookmark, Share2, Filter, X 
} from 'lucide-react'
import { lexicon } from '../../data/lexicon'

// --- Custom Hook para optimizar la búsqueda ---
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])
  return debouncedValue
}

export default function Lexicon() {
  const navigate = useNavigate()
  
  // Estados
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 300) // 300ms delay para optimización
  const [activeCategory, setActiveCategory] = useState('Todos')
  const [bookmarks, setBookmarks] = useState(() => {
    const saved = localStorage.getItem('lexicon_bookmarks')
    return saved ? JSON.parse(saved) : []
  })
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false)
  const [copiedId, setCopiedId] = useState(null)

  // Extraer categorías únicas dinámicamente
  const categories = useMemo(() => {
    const cats = new Set(lexicon.map(item => item.category))
    return ['Todos', ...Array.from(cats).sort()]
  }, [])

  // Lógica de Filtrado Memoizada (Brutalmente optimizada)
  const filteredTerms = useMemo(() => {
    let result = lexicon

    // 1. Filtrar por favoritos si está activo
    if (showBookmarksOnly) {
      result = result.filter(item => bookmarks.includes(item.id))
    }

    // 2. Filtrar por categoría
    if (activeCategory !== 'Todos') {
      result = result.filter(item => item.category === activeCategory)
    }

    // 3. Filtrar por búsqueda (usando el valor debounced)
    if (debouncedQuery) {
      const lowerQuery = debouncedQuery.toLowerCase()
      result = result.filter(item => 
        item.term.toLowerCase().includes(lowerQuery) || 
        item.definition.toLowerCase().includes(lowerQuery) ||
        (item.tags && item.tags.some(tag => tag.toLowerCase().includes(lowerQuery)))
      )
    }

    return result
  }, [debouncedQuery, activeCategory, showBookmarksOnly, bookmarks])

  // Manejadores de Acción
  const toggleBookmark = (id) => {
    const newBookmarks = bookmarks.includes(id)
      ? bookmarks.filter(b => b !== id)
      : [...bookmarks, id]
    
    setBookmarks(newBookmarks)
    localStorage.setItem('lexicon_bookmarks', JSON.stringify(newBookmarks))
  }

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleShare = async (item) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Léxico Jurídico: ${item.term}`,
          text: `${item.term}: ${item.definition}`,
          url: window.location.href
        })
      } catch (error) {
        console.log('Error sharing', error)
      }
    } else {
      handleCopy(`${item.term}: ${item.definition}`, item.id)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-500 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* --- Sticky Header Premium --- */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50 supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/dashboard')} 
              className="p-2 -ml-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all active:scale-95"
            >
              <ArrowLeft size={22} strokeWidth={2.5} />
            </button>
            
            <div className="flex-1 flex flex-col">
              <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                Léxico Jurídico
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {lexicon.length} términos disponibles
              </p>
            </div>

            {/* Toggle Favoritos Mobile/Desktop */}
            <button
              onClick={() => setShowBookmarksOnly(!showBookmarksOnly)}
              className={`p-2.5 rounded-full transition-all duration-300 relative group ${
                showBookmarksOnly 
                  ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400 ring-2 ring-amber-200 dark:ring-amber-800' 
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
              title="Ver Favoritos"
            >
              <Bookmark size={20} fill={showBookmarksOnly ? "currentColor" : "none"} />
              {bookmarks.length > 0 && !showBookmarksOnly && (
                <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-white dark:border-slate-900 rounded-full animate-bounce" />
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pt-6 pb-24">
        
        {/* --- Area de Control (Buscador y Filtros) --- */}
        <div className="space-y-6 mb-8">
          
          {/* Buscador Avanzado */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
            </div>
            <input 
              type="text"
              placeholder="Buscar término, definición o concepto..."
              className="w-full pl-12 pr-12 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm focus:shadow-lg focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 dark:text-white outline-none transition-all text-base"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button 
                onClick={() => setQuery('')}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Carrusel de Filtros */}
          <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 mask-gradient-x">
            <Filter size={18} className="text-slate-400 flex-shrink-0 mr-2" />
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`
                  px-5 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-300 border
                  ${activeCategory === cat 
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-500/25 shadow-md scale-105' 
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/10'
                  }
                `}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* --- Grid de Resultados --- */}
        <div className={`grid gap-4 transition-all duration-500 ${filteredTerms.length === 0 ? 'opacity-50' : 'opacity-100'} ${filteredTerms.length > 0 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
          
          {filteredTerms.length === 0 ? (
            <div className="col-span-full py-20 text-center">
              <div className="bg-slate-100 dark:bg-slate-800/50 w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 animate-pulse">
                <Book size={40} className="text-slate-400 dark:text-slate-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">
                Sin resultados
              </h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                No encontramos "{query}" en nuestra base de datos actual.
              </p>
              {showBookmarksOnly && (
                <button 
                  onClick={() => setShowBookmarksOnly(false)}
                  className="mt-6 text-indigo-600 font-medium hover:underline"
                >
                  Ver todos los términos
                </button>
              )}
            </div>
          ) : (
            filteredTerms.map((item, index) => (
              <div 
                key={item.id}
                className="group relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-500/30 dark:hover:border-indigo-500/30 transition-all duration-300 flex flex-col h-full"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Header Card */}
                <div className="flex justify-between items-start mb-4">
                  <span className={`
                    text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-lg border
                    ${item.category === 'Latín' 
                      ? 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/30' 
                      : 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-900/30'}
                  `}>
                    {item.category}
                  </span>
                  
                  <div className="flex gap-1">
                    {/* Share Button (Mobile friendly) */}
                    <button
                      onClick={() => handleShare(item)}
                      className="p-2 text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-full transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="Compartir"
                    >
                      <Share2 size={16} />
                    </button>

                    {/* Bookmark Button */}
                    <button 
                      onClick={() => toggleBookmark(item.id)}
                      className={`p-2 rounded-full transition-colors ${
                        bookmarks.includes(item.id)
                          ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20'
                          : 'text-slate-300 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                      }`}
                    >
                      <Bookmark size={18} fill={bookmarks.includes(item.id) ? "currentColor" : "none"} />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h3 className="text-2xl font-serif font-bold text-slate-800 dark:text-white mb-3 italic group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {item.term}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                    {item.definition}
                  </p>
                </div>

                {/* Footer / Copy Action */}
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                   <div className="flex gap-2">
                      {item.tags && item.tags.map(tag => (
                        <span key={tag} className="text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded">
                          #{tag}
                        </span>
                      ))}
                   </div>
                   
                   <button 
                    onClick={() => handleCopy(`${item.term}: ${item.definition}`, item.id)}
                    className={`
                      flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all
                      ${copiedId === item.id
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-slate-100 text-slate-500 hover:bg-indigo-100 hover:text-indigo-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                      }
                    `}
                   >
                     {copiedId === item.id ? (
                       <>Copiado <Check size={14} /></>
                     ) : (
                       <>Copiar <Copy size={14} /></>
                     )}
                   </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* --- Footer Note --- */}
        {!showBookmarksOnly && filteredTerms.length > 0 && (
          <div className="mt-12 text-center">
            <p className="text-slate-400 text-sm">
              Mostrando {filteredTerms.length} términos jurídicos
            </p>
          </div>
        )}

      </main>
    </div>
  )
}