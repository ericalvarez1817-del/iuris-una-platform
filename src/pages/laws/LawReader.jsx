import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, BookOpen, Search, Type, Share2, Copy, Check } from 'lucide-react'

export default function LawReader() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [articles, setArticles] = useState([]) // Lista de artículos cargados
  const [loading, setLoading] = useState(true)
  const [initialLaw, setInitialLaw] = useState(null)
  const [copiedId, setCopiedId] = useState(null)
  const [fontSize, setFontSize] = useState('text-lg') // Control de tamaño de letra

  // 1. Cargar el artículo inicial y sus vecinos
  useEffect(() => {
    const initReader = async () => {
      setLoading(true)
      
      // A. Traemos el artículo seleccionado
      const { data: current, error } = await supabase
        .from('laws_db')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !current) {
        setLoading(false)
        return
      }

      setInitialLaw(current)

      // B. Truco "Brutal": Traemos los siguientes 20 artículos del MISMO cuerpo legal
      // Usamos el ID o un orden lógico. Como los IDs son UUID, es difícil ordenar.
      // Haremos una búsqueda por texto aproximado del número de artículo para ordenarlos
      // O mejor: Traemos por 'corpus' y filtramos en memoria (si no son demasiados)
      // ESTRATEGIA OPTIMIZADA: Buscar por coincidencia de texto en corpus
      
      const { data: neighbors } = await supabase
        .from('laws_db')
        .select('*')
        .eq('corpus', current.corpus)
        .textSearch('search_text', `${current.article.split(' ')[0]}`, { config: 'simple' }) // Intento de traer cercanos
        .limit(50) // Traemos un lote
      
      // Como ordenar por "Art. 1, Art. 2" es difícil en SQL puro sin columnas numéricas,
      // aquí implementamos un ordenador simple de JavaScript:
      let sorted = []
      if (neighbors) {
          // Extraer número: "Art. 15" -> 15
          const getNum = (str) => parseInt(str.replace(/\D/g, '')) || 0
          
          const targetNum = getNum(current.article)
          
          // Filtramos y ordenamos: Queremos el actual y los siguientes
          sorted = neighbors
            .filter(a => getNum(a.article) >= targetNum)
            .sort((a, b) => getNum(a.article) - getNum(b.article))
      }

      // Si el filtrado falló (por formatos raros), al menos mostramos el actual
      if (sorted.length === 0) sorted = [current]
      
      // Eliminamos duplicados visuales si el actual está en la lista
      const unique = sorted.filter((v,i,a)=>a.findIndex(v2=>(v2.id===v.id))===i)
      
      setArticles(unique)
      setLoading(false)
    }

    initReader()
  }, [id])

  // Función para cargar más (Simulación de scroll infinito)
  const loadMore = async () => {
    if (articles.length === 0) return
    const lastArticle = articles[articles.length - 1]
    const lastNum = parseInt(lastArticle.article.replace(/\D/g, '')) || 0
    
    // Traer el siguiente lote
    // Nota: Esto es imperfecto sin una columna numérica real en DB, pero funciona visualmente
    // para la demo. Idealmente agregarías columna 'order_index' en Supabase.
  }

  const copyText = (text, itemId) => {
    navigator.clipboard.writeText(text)
    setCopiedId(itemId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Clases dinámicas para tamaño de fuente
  const fontClasses = {
      'text-sm': 'prose-sm',
      'text-base': 'prose-base',
      'text-lg': 'prose-lg',
      'text-xl': 'prose-xl'
  }

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#FDFBF7]"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600"></div></div>

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-slate-800 font-serif pb-20">
      
      {/* Header Flotante "Kindle Style" */}
      <header className="sticky top-0 z-30 bg-[#FDFBF7]/95 backdrop-blur border-b border-stone-200 px-4 py-3 flex items-center justify-between shadow-sm transition-all">
        <div className="flex items-center gap-3">
            <button onClick={() => navigate('/laws')} className="p-2 hover:bg-stone-200 rounded-full transition-colors text-stone-600">
                <ArrowLeft size={20} />
            </button>
            <div className="flex flex-col">
                <h1 className="text-xs font-bold uppercase tracking-widest text-stone-500">Leyendo</h1>
                <span className="text-sm font-bold text-stone-900 truncate max-w-[200px]">{initialLaw?.corpus}</span>
            </div>
        </div>
        
        <div className="flex items-center gap-1">
            <button onClick={() => setFontSize(prev => prev === 'text-lg' ? 'text-xl' : 'text-lg')} className="p-2 text-stone-600 hover:bg-stone-200 rounded-full">
                <Type size={20} />
            </button>
        </div>
      </header>

      {/* Contenedor del Documento Continuo */}
      <main className="max-w-3xl mx-auto px-6 md:px-12 py-8">
        
        {articles.map((item, index) => (
            <article key={item.id} className={`mb-16 animate-fade-in relative group ${index !== 0 ? 'border-t border-stone-200 pt-10' : ''}`}>
                
                {/* Número de Artículo (Anchor Visual) */}
                <div className="flex justify-between items-baseline mb-4">
                    <h2 className="text-2xl font-bold text-amber-700 font-sans tracking-tight">
                        {item.article}
                    </h2>
                    
                    {/* Botones de acción por artículo (aparecen al hover) */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                        <button onClick={() => copyText(`${item.article}\n${item.content}`, item.id)} className="p-1.5 text-stone-400 hover:text-amber-600 hover:bg-amber-50 rounded">
                            {copiedId === item.id ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                    </div>
                </div>

                {/* Título del Artículo (si tiene) */}
                {item.title && (
                    <h3 className="text-lg font-semibold text-stone-600 mb-4 italic" dangerouslySetInnerHTML={{__html: item.title}}></h3>
                )}

                {/* Contenido Texto */}
                <div 
                    className={`prose prose-stone ${fontClasses[fontSize]} max-w-none text-justify leading-relaxed text-stone-800`}
                    dangerouslySetInnerHTML={{ __html: item.content }}
                />
            </article>
        ))}

        {/* Footer del Documento */}
        <div className="mt-20 py-10 border-t-2 border-dashed border-stone-300 text-center">
            <p className="text-stone-500 italic mb-4">Fin de la sección cargada</p>
            <button className="px-6 py-2 bg-stone-800 text-white rounded-full hover:bg-stone-700 transition-colors font-sans text-sm font-bold">
                Cargar siguientes artículos
            </button>
        </div>

      </main>
    </div>
  )
}