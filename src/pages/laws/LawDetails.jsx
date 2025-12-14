import { useParams, Link, useNavigate } from 'react-router-dom'
import { laws } from '../../data/laws'
import { ArrowLeft } from 'lucide-react'
import { useEffect, useState, useRef } from 'react'

export default function LawDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [targetLaw, setTargetLaw] = useState(null)
  const [fullCorpus, setFullCorpus] = useState([])
  
  const hasScrolled = useRef(false)

  useEffect(() => {
    const found = laws.find(item => item.id === id)
    if (found) {
      setTargetLaw(found)
      const corpus = laws.filter(item => item.corpus === found.corpus)
      setFullCorpus(corpus)
    }
  }, [id])

  useEffect(() => {
    if (fullCorpus.length > 0 && !hasScrolled.current) {
      setTimeout(() => {
        const element = document.getElementById(id)
        if (element) {
          // Ajustamos el scroll para que quede un poco más arriba y se vea el contexto anterior
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          hasScrolled.current = true
        }
      }, 100)
    }
    return () => { hasScrolled.current = false }
  }, [fullCorpus, id])

  if (!targetLaw) {
    return <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-500">Cargando...</div>
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 pb-24 transition-colors duration-300">
      
      {/* HEADER FLOTANTE (Más discreto) */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 px-4 py-3 flex items-center gap-4 transition-colors shadow-sm">
        <Link to="/laws" className="p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="font-bold text-slate-800 dark:text-white text-base leading-none">
            {targetLaw.corpus}
          </h1>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider">
            Vista de Lectura
          </p>
        </div>
      </header>

      {/* CONTENEDOR TIPO "HOJA DE PAPEL" */}
      <main className="max-w-2xl mx-auto bg-white dark:bg-slate-900 min-h-screen shadow-2xl dark:shadow-none transition-colors my-0 sm:my-4 sm:rounded-lg overflow-hidden">
        
        {fullCorpus.map((item, index) => {
          const isTarget = item.id === id
          
          return (
            <div 
              key={item.id} 
              id={item.id}
              // AQUÍ ESTÁ EL TRUCO: Sin bordes, padding vertical cómodo.
              // Si el texto se cortó mal en el JSON, aquí se verá seguido.
              className={`
                px-6 py-6 md:px-10 md:py-8
                transition-colors duration-700
                ${isTarget 
                  ? 'bg-amber-50 dark:bg-amber-900/20' // Solo fondo suave si es el buscado
                  : 'bg-transparent'
                }
                /* Borde inferior sutil para guiar el ojo, pero muy ligero */
                border-b border-slate-100 dark:border-slate-800/50 last:border-0
              `}
            >
              {/* Número de Artículo (Estilo encabezado de libro) */}
              <div className="flex items-baseline gap-3 mb-2">
                <span className={`font-black text-lg ${isTarget ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                  {item.article}
                </span>
              </div>
              
              {/* Título HTML */}
              <div 
                className={`font-bold mb-3 leading-snug ${isTarget ? 'text-slate-800 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'}`}
                dangerouslySetInnerHTML={{ __html: item.title }}
              />

              {/* Contenido HTML */}
              <div 
                className={`text-justify leading-relaxed font-serif text-[17px] ${isTarget ? 'text-slate-900 dark:text-slate-200' : 'text-slate-600 dark:text-slate-400'}`}
                dangerouslySetInnerHTML={{ __html: item.content }}
              />
            </div>
          )
        })}

        {/* Espacio final para poder scrollear hasta el último artículo cómodamente */}
        <div className="h-32 bg-transparent"></div>
      </main>
    </div>
  )
}