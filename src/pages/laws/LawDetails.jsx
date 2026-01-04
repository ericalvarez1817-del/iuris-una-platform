import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, Share2, Copy, BookOpen, Check } from 'lucide-react'

export default function LawDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [law, setLaw] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const fetchLaw = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('laws_db')
        .select('*')
        .eq('id', id)
        .single()

      if (!error && data) {
        setLaw(data)
      }
      setLoading(false)
    }
    fetchLaw()
  }, [id])

  const copyToClipboard = () => {
    // Copiamos formato lindo: "Art. 1 - Título \n Texto..."
    const textToCopy = `${law.corpus}\n${law.article} ${law.title}\n\n${getTextFromHTML(law.content)}`
    navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getTextFromHTML = (html) => {
    const tmp = document.createElement("DIV")
    tmp.innerHTML = html
    return tmp.textContent || tmp.innerText || ""
  }

  if (loading) return <div className="min-h-screen bg-stone-50 dark:bg-slate-950 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-600"></div></div>
  
  if (!law) return <div className="p-8 text-center text-slate-500">Artículo no encontrado</div>

  return (
    <div className="min-h-screen bg-[#FDFBF7] dark:bg-slate-950 pb-20 transition-colors">
      
      {/* Navbar Minimalista */}
      <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-stone-200 dark:border-slate-800 sticky top-0 z-20 px-4 py-3 flex items-center justify-between shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-stone-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-full transition-colors">
          <ArrowLeft size={22} />
        </button>
        
        <div className="flex gap-2">
            <button onClick={copyToClipboard} className="p-2 text-stone-500 hover:text-amber-600 hover:bg-amber-50 rounded-full transition-all" title="Copiar texto">
                {copied ? <Check size={20} className="text-green-600"/> : <Copy size={20} />}
            </button>
            <button className="p-2 text-stone-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all">
                <Share2 size={20} />
            </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6 md:p-10 animate-fade-in">
        {/* Cabecera del Artículo */}
        <div className="mb-8 text-center">
            <span className="inline-block px-3 py-1 rounded-full bg-stone-200 dark:bg-slate-800 text-stone-600 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-4">
                {law.corpus}
            </span>
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-stone-900 dark:text-amber-50 leading-tight mb-2">
                {law.article}
            </h1>
            {law.title && (
                <h2 className="text-xl font-serif text-stone-600 dark:text-slate-300 italic" dangerouslySetInnerHTML={{__html: law.title}}></h2>
            )}
        </div>

        {/* Separador Decorativo */}
        <div className="flex justify-center mb-8 opacity-30">
            <div className="h-px w-24 bg-stone-900 dark:bg-white"></div>
        </div>

        {/* Contenido (Estilo Libro) */}
        <article className="prose prose-lg prose-stone dark:prose-invert max-w-none font-serif leading-loose text-justify text-stone-800 dark:text-slate-200">
             {/* Inyectamos el HTML pero aseguramos que los párrafos tengan espacio */}
             <div 
                dangerouslySetInnerHTML={{ __html: law.content }} 
                className="[&>p]:mb-6 [&>ul]:list-disc [&>ul]:pl-5"
             />
        </article>

        {/* Footer del artículo */}
        <div className="mt-12 pt-6 border-t border-stone-200 dark:border-slate-800 flex justify-center text-stone-400 text-xs">
            <span className="flex items-center gap-1">
                <BookOpen size={12} /> Iuris UNA Platform
            </span>
        </div>
      </main>
    </div>
  )
}