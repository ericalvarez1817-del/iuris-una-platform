import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, Type, Copy, Check, List } from 'lucide-react'

export default function LawReader() {
  const { id } = useParams() // El ID del artículo al que hiciste clic
  const navigate = useNavigate()
  
  const [articles, setArticles] = useState([]) 
  const [loading, setLoading] = useState(true)
  const [currentLawTitle, setCurrentLawTitle] = useState("")
  const [fontSize, setFontSize] = useState('text-lg')
  const [copiedId, setCopiedId] = useState(null)

  // Referencia para controlar el scroll automático
  const activeArticleRef = useRef(null)

  // --- 1. FUNCIÓN DE LIMPIEZA AGRESIVA (El "Quitamanchas") ---
  const cleanContentVisual = (html) => {
    if (!html) return ""
    
    // Esta expresión regular busca patrones de títulos (SECCION, CAPITULO, TITULO, DE LAS...)
    // que estén al final del texto, y los elimina.
    let clean = html
    
    // 1. Eliminar "SECCION X", "CAPITULO Y", "TITULO Z" al final
    clean = clean.replace(/<p>\s*(SECCI[ÓO]N|CAP[ÍI]TULO|T[ÍI]TULO|LIBRO)\s+[IVXLCDM]+\s*<\/p>\s*$/i, '')
    
    // 2. Eliminar textos en mayúsculas tipo título al final (ej: "DEL JUICIO POLITICO")
    // Busca párrafos que contengan solo mayúsculas y espacios al final del string
    clean = clean.replace(/<p>\s*(DE LOS|DE LAS|DEL|DE LA)\s+[A-ZÁÉÍÓÚÑ\s]+<\/p>\s*$/i, '')
    
    // 3. Limpieza extra para saltos de línea sobrantes
    clean = clean.replace(/(<br\s*\/?>\s*)+$/, '')

    return clean
  }

  // --- 2. CARGA DEL LIBRO COMPLETO (Modo PDF) ---
  useEffect(() => {
    const fetchFullLaw = async () => {
      setLoading(true)

      // A. Primero averiguamos qué ley es (basado en el ID del artículo clicado)
      const { data: current, error } = await supabase
        .from('laws_db')
        .select('corpus, article')
        .eq('id', id)
        .single()

      if (error || !current) {
        setLoading(false)
        return
      }
      
      setCurrentLawTitle(current.corpus)

      // B. Traemos TODOS los artículos de esa ley (Sin límite, para que sea un PDF completo)
      const { data: allArticles } = await supabase
        .from('laws_db')
        .select('*')
        .eq('corpus', current.corpus)
      
      if (allArticles) {
          // C. Ordenamiento Numérico Inteligente
          // JavaScript ordena texto como "1, 10, 100, 2". Nosotros queremos "1, 2, 10, 100".
          const getNum = (str) => {
              // Extrae el primer número que encuentre: "Art. 224" -> 224
              const match = str.match(/(\d+)/)
              return match ? parseInt(match[0]) : 0
          }

          const sorted = allArticles.sort((a, b) => getNum(a.article) - getNum(b.article))
          setArticles(sorted)
      }
      
      setLoading(false)
    }

    fetchFullLaw()
  }, [id]) // Se ejecuta cuando entras

  // --- 3. AUTO-SCROLL (El Teletransportador) ---
  useEffect(() => {
    // Cuando terminan de cargar los artículos, buscamos el que tiene el ID activo
    if (!loading && articles.length > 0 && activeArticleRef.current) {
        // Hacemos scroll suave hasta el artículo
        activeArticleRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [loading, articles, id])


  // Utilidades
  const copyText = (text, itemId) => {
    // Limpiamos el HTML para copiar solo texto
    const tmp = document.createElement("DIV")
    tmp.innerHTML = text
    const cleanText = tmp.textContent || tmp.innerText || ""
    
    navigator.clipboard.writeText(cleanText)
    setCopiedId(itemId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const fontClasses = {
      'text-sm': 'prose-sm',
      'text-base': 'prose-base',
      'text-lg': 'prose-lg',
      'text-xl': 'prose-xl'
  }

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#FDFBF7]"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600"></div></div>

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-slate-800 font-serif pb-20">
      
      {/* Header Sticky */}
      <header className="sticky top-0 z-30 bg-[#FDFBF7]/95 backdrop-blur border-b border-stone-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
            <button onClick={() => navigate('/laws')} className="p-2 hover:bg-stone-200 rounded-full transition-colors text-stone-600">
                <ArrowLeft size={20} />
            </button>
            <div className="flex flex-col">
                <h1 className="text-xs font-bold uppercase tracking-widest text-stone-500">Documento Completo</h1>
                <span className="text-sm font-bold text-stone-900 truncate max-w-[200px] md:max-w-md">{currentLawTitle}</span>
            </div>
        </div>
        
        <button onClick={() => setFontSize(prev => prev === 'text-lg' ? 'text-xl' : 'text-lg')} className="p-2 text-stone-600 hover:bg-stone-200 rounded-full">
            <Type size={20} />
        </button>
      </header>

      {/* Cuerpo del Documento (Lista Infinita) */}
      <main className="max-w-3xl mx-auto px-6 md:px-12 py-8">
        
        {articles.map((item, index) => {
            // Verificamos si este es el artículo seleccionado para marcarlo
            const isActive = item.id === id 
            
            return (
                <article 
                    key={item.id} 
                    // Si es el activo, le asignamos la referencia para el auto-scroll
                    ref={isActive ? activeArticleRef : null}
                    id={`art-${item.id}`}
                    className={`
                        mb-0 py-12 px-2 relative group transition-colors duration-1000
                        ${isActive ? 'bg-amber-50/50 -mx-4 px-6 rounded-xl border border-amber-100 shadow-sm' : 'border-t border-stone-100'}
                    `}
                >
                    {/* Ancla visual para saber dónde estamos */}
                    {isActive && (
                        <div className="absolute top-4 right-4 text-xs font-sans text-amber-600 font-bold bg-amber-100 px-2 py-1 rounded-full animate-pulse">
                            LE YENDO AHORA
                        </div>
                    )}

                    {/* Cabecera del Artículo */}
                    <div className="mb-4 flex justify-between items-baseline">
                        <div>
                             <h2 className={`font-sans tracking-tight inline-block mr-3 font-bold ${isActive ? 'text-amber-700 text-3xl' : 'text-stone-700 text-2xl'}`}>
                                {item.article}
                            </h2>
                            {item.title && item.title.length > 2 && (
                                <div className="text-lg font-semibold text-stone-500 italic mt-1 leading-tight" dangerouslySetInnerHTML={{__html: item.title}}></div>
                            )}
                        </div>

                         {/* Botón Copiar (visible al hover) */}
                        <button 
                            onClick={() => copyText(`${item.article}\n${item.content}`, item.id)} 
                            className={`p-2 rounded-full transition-all ${isActive ? 'opacity-100 bg-white shadow-sm' : 'opacity-0 group-hover:opacity-100 hover:bg-stone-100'}`}
                            title="Copiar texto"
                        >
                            {copiedId === item.id ? <Check size={18} className="text-green-600"/> : <Copy size={18} className="text-stone-400"/>}
                        </button>
                    </div>

                    {/* Contenido Texto */}
                    <div 
                        className={`prose prose-stone ${fontClasses[fontSize]} max-w-none text-justify leading-relaxed text-stone-900`}
                        // APLICAMOS LA LIMPIEZA VISUAL AQUÍ
                        dangerouslySetInnerHTML={{ __html: cleanContentVisual(item.content) }}
                    />

                </article>
            )
        })}

        {/* Final del Documento */}
        <div className="mt-20 py-20 border-t-4 border-double border-stone-300 text-center">
            <div className="inline-block p-4 rounded-full bg-stone-100 mb-4">
                <List className="text-stone-400" />
            </div>
            <p className="text-stone-500 font-serif text-lg">Fin del Documento</p>
        </div>

      </main>
    </div>
  )
}