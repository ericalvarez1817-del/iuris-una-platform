import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, BookA, Copy, Check } from 'lucide-react'
import { lexicon } from '../../data/lexicon'

export default function Lexicon() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState('Todos') // Todos, Latín, Concepto
  const [copiedId, setCopiedId] = useState(null) // Para el efecto visual de "Copiado"

  // Lógica de Filtrado
  const filteredTerms = lexicon.filter(item => {
    const matchesSearch = item.term.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.definition.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filter === 'Todos' || item.category === filter
    return matchesSearch && matchesFilter
  })

  // Función para copiar al portapapeles
  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000) // Resetear icono después de 2s
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 transition-colors duration-300">
      
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 px-4 py-4 flex items-center gap-3 transition-colors">
        <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-slate-800 dark:text-white text-lg">Léxico Jurídico</h1>
        </div>
      </header>

      <main className="p-4 max-w-md mx-auto">
        
        {/* Buscador */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-3 text-slate-400" size={20} />
          <input 
            type="text"
            placeholder="Buscar término (ej: Dolo, Ab initio)..."
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white outline-none shadow-sm transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filtros (Pestañas) */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {['Todos', 'Latín', 'Concepto'].map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`
                px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all
                ${filter === cat 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                }
              `}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Lista de Resultados */}
        <div className="space-y-4">
          {filteredTerms.length === 0 ? (
            <div className="text-center text-slate-400 mt-10">
              <BookA size={48} className="mx-auto mb-4 opacity-20" />
              <p>No encontré ese término, Colega.</p>
            </div>
          ) : (
            filteredTerms.map(item => (
              <div key={item.id} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors group relative">
                
                {/* Badge Categoría */}
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${
                    item.category === 'Latín' 
                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' 
                      : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                  }`}>
                    {item.category}
                  </span>
                  
                  {/* Botón Copiar */}
                  <button 
                    onClick={() => handleCopy(`${item.term}: ${item.definition}`, item.id)}
                    className="text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  >
                    {copiedId === item.id ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                  </button>
                </div>

                {/* Término */}
                <h3 className="text-xl font-serif font-bold text-slate-800 dark:text-white mb-2 italic">
                  {item.term}
                </h3>

                {/* Definición */}
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                  {item.definition}
                </p>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}