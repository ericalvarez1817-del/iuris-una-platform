import { useParams, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, Share2, Copy } from 'lucide-react'

export default function LawDetails() {
  const { id } = useParams()
  const [law, setLaw] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLaw = async () => {
      setLoading(true)
      // Buscamos directamente en Supabase por ID
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

  if (loading) return <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div></div>
  
  if (!law) return <div className="p-8 text-center text-slate-500">Artículo no encontrado</div>

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 pb-24 transition-colors duration-300">
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 px-4 py-3 flex items-center gap-4 shadow-sm">
        <Link to="/laws" className="p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="font-bold text-slate-800 dark:text-white text-sm leading-tight line-clamp-1">
            {law.corpus}
          </h1>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 uppercase tracking-wider">
            {law.article}
          </p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto bg-white dark:bg-slate-900 min-h-[80vh] shadow-sm dark:shadow-none sm:my-4 sm:rounded-xl p-6 md:p-10">
        <div className="mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
          <span className="inline-block px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold mb-3">
            {law.article}
          </span>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white leading-tight" dangerouslySetInnerHTML={{__html: law.title}}></h2>
        </div>

        <div 
          className="prose prose-slate dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 leading-loose"
          dangerouslySetInnerHTML={{ __html: law.content }}
        />
        
        {/* Botones de acción simples */}
        <div className="mt-10 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
            <button className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-amber-600 transition-colors">
                <Copy size={16} /> Copiar
            </button>
            <button className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-amber-600 transition-colors">
                <Share2 size={16} /> Compartir
            </button>
        </div>
      </main>
    </div>
  )
}