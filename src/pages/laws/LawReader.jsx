import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, Type, Copy, Check, List, Moon, Sun } from 'lucide-react'

export default function LawReader() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [articles, setArticles] = useState([]) 
  const [loading, setLoading] = useState(true)
  const [currentLawTitle, setCurrentLawTitle] = useState("")
  const [fontSize, setFontSize] = useState('text-lg')
  const [copiedId, setCopiedId] = useState(null)
  
  // --- NUEVO ESTADO: MODO OSCURO ---
  const [isDarkMode, setIsDarkMode] = useState(true) // Empieza en oscuro si prefieres, o false para claro

  const activeArticleRef = useRef(null)

  // --- 1. CONFIGURACIÓN DE TEMAS ---
  // Aquí definimos los colores para Día (Paper) y Noche (OLED/Dark)
  const theme = {
    bg: isDarkMode ? 'bg-slate-950' : 'bg-[#FDFBF7]',
    text: isDarkMode ? 'text-slate-300' : 'text-slate-800',
    headerBg: isDarkMode ? 'bg-slate-950/90 border-slate-800' : 'bg-[#FDFBF7]/90 border-stone-200',
    iconColor: isDarkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-stone-600 hover:bg-stone-200',
    titleColor: isDarkMode ? 'text-amber-500' : 'text-amber-800',
    subtitleColor: isDarkMode ? 'text-slate-500' : 'text-stone-500',
    activeArticle: isDarkMode 
        ? 'bg-slate-900 border-slate-800 shadow-slate-900/50' // Estilo Activo Noche
        : 'bg-amber-50/50 border-amber-100 shadow-stone-200/50', // Estilo Activo Día
    prose: isDarkMode ? 'prose-invert' : 'prose-stone', // Esto invierte el color del texto HTML automáticamente
    divider: isDarkMode ? 'border-slate-800' : 'border-stone-100'
  }

  // --- 2. FUNCIÓN DE LIMPIEZA ---
  const cleanContentVisual = (html) => {
    if (!html) return ""
    let clean = html
    clean = clean.replace(/<p>\s*(SECCI[ÓO]N|CAP[ÍI]TULO|T[ÍI]TULO|LIBRO)\s+[IVXLCDM]+\s*<\/p>\s*$/i, '')
    clean = clean.replace(/<p>\s*(DE LOS|DE LAS|DEL|DE LA)\s+[A-ZÁÉÍÓÚÑ\s]+<\/p>\s*$/i, '')
    clean = clean.replace(/(<br\s*\/?>\s*)+$/, '')
    return clean
  }

  // --- 3. CARGA DE DATOS ---
  useEffect(() => {
    const fetchFullLaw = async () => {
      setLoading(true)
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

      const { data: allArticles } = await supabase
        .from('laws_db')
        .select('*')
        .eq('corpus', current.corpus)
      
      if (allArticles) {
          const getNum = (str) => {
              const match = str.match(/(\d+)/)
              return match ? parseInt(match[0]) : 0
          }
          const sorted = allArticles.sort((a, b) => getNum(a.article) - getNum(b.article))
          setArticles(sorted)
      }
      setLoading(false)
    }

    fetchFullLaw()
  }, [id])

  // --- 4. AUTO-SCROLL ---
  useEffect(() => {
    if (!loading && articles.length > 0 && activeArticleRef.current) {
        activeArticleRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [loading, articles, id])


  const copyText = (text, itemId) => {
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

  if (loading) return <div className={`h-screen flex items-center justify-center ${theme.bg}`}><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600"></div></div>

  return (
    <div className={`min-h-screen ${theme.bg} ${theme.text} font-serif pb-20 transition-colors duration-500`}>
      
      {/* Header Sticky */}
      <header className={`sticky top-0 z-30 backdrop-blur border-b px-4 py-3 flex items-center justify-between shadow-sm transition-colors duration-500 ${theme.headerBg}`}>
        <div className="flex items-center gap-3">
            <button onClick={() => navigate('/laws')} className={`p-2 rounded-full transition-colors ${theme.iconColor}`}>
                <ArrowLeft size={20} />
            </button>
            <div className="flex flex-col">
                <h1 className={`text-xs font-bold uppercase tracking-widest ${theme.subtitleColor}`}>Lectura</h1>
                <span className={`text-sm font-bold truncate max-w-[150px] md:max-w-md ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>{currentLawTitle}</span>
            </div>
        </div>
        
        <div className="flex items-center gap-2">
            {/* Botón MODO OSCURO */}
            <button 
                onClick={() => setIsDarkMode(!isDarkMode)} 
                className={`p-2 rounded-full transition-colors ${theme.iconColor}`}
                title="Cambiar tema"
            >
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* Botón TAMAÑO LETRA */}
            <button 
                onClick={() => setFontSize(prev => prev === 'text-lg' ? 'text-xl' : 'text-lg')} 
                className={`p-2 rounded-full transition-colors ${theme.iconColor}`}
                title="Cambiar tamaño letra"
            >
                <Type size={20} />
            </button>
        </div>
      </header>

      {/* Cuerpo del Documento */}
      <main className="max-w-3xl mx-auto px-6 md:px-12 py-8">
        
        {articles.map((item, index) => {
            const isActive = item.id === id 
            
            return (
                <article 
                    key={item.id} 
                    ref={isActive ? activeArticleRef : null}
                    id={`art-${item.id}`}
                    className={`
                        mb-0 py-12 px-2 relative group transition-all duration-700
                        ${isActive ? `${theme.activeArticle} -mx-4 px-6 rounded-xl border` : `border-t ${theme.divider}`}
                    `}
                >
                    {isActive && (
                        <div className={`absolute top-4 right-4 text-[10px] font-sans font-bold px-2 py-1 rounded-full animate-pulse ${isDarkMode ? 'bg-amber-900 text-amber-500' : 'bg-amber-100 text-amber-600'}`}>
                            LEYENDO
                        </div>
                    )}

                    <div className="mb-4 flex justify-between items-baseline">
                        <div>
                             <h2 className={`font-sans tracking-tight inline-block mr-3 font-bold ${isActive ? `text-3xl ${theme.titleColor}` : `text-2xl ${isDarkMode ? 'text-slate-500' : 'text-stone-700'}`}`}>
                                {item.article}
                            </h2>
                            {item.title && item.title.length > 2 && (
                                <div className={`text-lg font-semibold italic mt-1 leading-tight ${theme.subtitleColor}`} dangerouslySetInnerHTML={{__html: item.title}}></div>
                            )}
                        </div>

                        <button 
                            onClick={() => copyText(`${item.article}\n${item.content}`, item.id)} 
                            className={`p-2 rounded-full transition-all ${isActive ? `opacity-100 ${isDarkMode ? 'bg-slate-800' : 'bg-white shadow-sm'}` : `opacity-0 group-hover:opacity-100 ${theme.iconColor}`}`}
                        >
                            {copiedId === item.id ? <Check size={18} className="text-green-500"/> : <Copy size={18} />}
                        </button>
                    </div>

                    <div 
                        className={`prose ${theme.prose} ${fontClasses[fontSize]} max-w-none text-justify leading-relaxed transition-colors duration-500`}
                        dangerouslySetInnerHTML={{ __html: cleanContentVisual(item.content) }}
                    />

                </article>
            )
        })}

        <div className={`mt-20 py-20 border-t-4 border-double ${isDarkMode ? 'border-slate-800' : 'border-stone-300'} text-center`}>
            <div className={`inline-block p-4 rounded-full mb-4 ${isDarkMode ? 'bg-slate-900' : 'bg-stone-100'}`}>
                <List className={theme.subtitleColor} />
            </div>
            <p className={`${theme.subtitleColor} font-serif text-lg`}>Fin del Documento</p>
        </div>

      </main>
    </div>
  )
}