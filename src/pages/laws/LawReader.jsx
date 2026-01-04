import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, Type, Copy, Check, ChevronDown } from 'lucide-react'

export default function LawReader() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [articles, setArticles] = useState([]) 
  const [loading, setLoading] = useState(true)
  const [initialLaw, setInitialLaw] = useState(null)
  const [fontSize, setFontSize] = useState('text-lg')

  // --- FUNCIÓN DE LIMPIEZA VISUAL (PARCHE) ---
  // Intenta ocultar el título del siguiente artículo si quedó pegado al final
  const cleanContentVisual = (html) => {
    if (!html) return ""
    // Si el texto termina con un título en mayúsculas tipo "DEL PODER LEGISLATIVO", lo ocultamos visualmente
    // Esta regex busca textos cortos en mayúsculas al final del string
    // Es un parche visual, lo ideal es corregir la base de datos.
    return html.replace(/<p><strong><span[^>]*>[A-ZÁÉÍÓÚÑ\s]{5,}<\/span><\/strong><\/p>$/i, '')
  }
  // ------------------------------------------

  useEffect(() => {
    const initReader = async () => {
      setLoading(true)
      
      // 1. Traemos el artículo seleccionado
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

      // 2. Traer vecinos del MISMO LIBRO EXACTO (usando corpus exacto)
      // Como no unificamos libros, esto funciona perfecto para leer "Libro Segundo" de corrido.
      const { data: neighbors } = await supabase
        .from('laws_db')
        .select('*')
        .eq('corpus', current.corpus) // Mismo libro exacto
        .textSearch('search_text', `${current.article.split(' ')[0]}`, { config: 'simple' }) 
        .limit(40) 
      
      let sorted = []
      if (neighbors) {
          const getNum = (str) => parseInt(str.replace(/\D/g, '')) || 0
          const targetNum = getNum(current.article)
          
          // Ordenamos por número de artículo
          sorted = neighbors
            .filter(a => getNum(a.article) >= targetNum)
            .sort((a, b) => getNum(a.article) - getNum(b.article))
      }

      if (sorted.length === 0) sorted = [current]
      
      // Eliminamos duplicados por ID
      const unique = sorted.filter((v,i,a)=>a.findIndex(v2=>(v2.id===v.id))===i)
      
      setArticles(unique)
      setLoading(false)
    }

    initReader()
  }, [id])

  const fontClasses = {
      'text-sm': 'prose-sm',
      'text-base': 'prose-base',
      'text-lg': 'prose-lg',
      'text-xl': 'prose-xl'
  }

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#FDFBF7]"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600"></div></div>

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-slate-800 font-serif pb-20">
      
      {/* Header Flotante */}
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
        
        <button onClick={() => setFontSize(prev => prev === 'text-lg' ? 'text-xl' : 'text-lg')} className="p-2 text-stone-600 hover:bg-stone-200 rounded-full">
            <Type size={20} />
        </button>
      </header>

      {/* Documento Continuo */}
      <main className="max-w-3xl mx-auto px-6 md:px-12 py-8">
        
        {articles.map((item, index) => (
            <article key={item.id} className={`mb-12 animate-fade-in relative group ${index !== 0 ? 'border-t border-stone-200 pt-12 mt-4' : ''}`}>
                
                {/* Cabecera del Artículo */}
                <div className="mb-4">
                    <h2 className="text-2xl font-bold text-amber-800 font-sans tracking-tight inline-block mr-3">
                        {item.article}
                    </h2>
                    {/* Renderizamos el título solo si existe y no es basura */}
                    {item.title && item.title.length > 2 && (
                        <span className="text-lg font-semibold text-stone-600 italic block mt-1" dangerouslySetInnerHTML={{__html: item.title}}></span>
                    )}
                </div>

                {/* Contenido Texto */}
                <div 
                    className={`prose prose-stone ${fontClasses[fontSize]} max-w-none text-justify leading-relaxed text-stone-900`}
                    // Usamos la función cleanContentVisual para intentar ocultar la basura al final
                    dangerouslySetInnerHTML={{ __html: cleanContentVisual(item.content) }}
                />
            </article>
        ))}

        <div className="mt-20 py-10 border-t-2 border-dashed border-stone-300 text-center opacity-60">
            <p className="text-stone-500 italic text-sm">Fin de la vista previa</p>
        </div>

      </main>
    </div>
  )
}