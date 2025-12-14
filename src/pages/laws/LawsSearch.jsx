import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom' // Importamos Link
import { laws } from '../../data/laws'
import { ArrowLeft, Search, Book } from 'lucide-react'

export default function LawsSearch() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  
  const results = searchTerm.length < 2 
    ? [] 
    : laws.filter(item => 
        item.article.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.content.toLowerCase().includes(searchTerm.toLowerCase())
      )

  // Función auxiliar para recortar texto HTML de forma segura
  const truncateHTML = (html, maxLength) => {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    let text = tmp.textContent || tmp.innerText || "";
    if (text.length > maxLength) {
      text = text.substring(0, maxLength) + '...';
    }
    return text;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-10 transition-colors duration-300">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 p-4 shadow-sm transition-colors">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-bold text-slate-800 dark:text-white text-lg">Buscador Jurídico</h1>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-3 text-slate-400" size={20} />
          <input 
            type="text"
            placeholder="Buscar art., palabra clave, tema..."
            className="w-full pl-10 pr-4 py-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-amber-500 dark:text-white transition outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
        </div>
      </header>

      <main className="p-4 max-w-md mx-auto">
        {searchTerm.length < 2 && (
          <div className="text-center text-slate-400 dark:text-slate-600 mt-10">
            <Book size={48} className="mx-auto mb-4 opacity-20" />
            <p>Escribe para buscar en la<br/>Constitución y Códigos</p>
          </div>
        )}

        {searchTerm.length >= 2 && results.length === 0 && (
          <p className="text-center text-slate-500 dark:text-slate-400 mt-10">
            No se encontraron coincidencias para "{searchTerm}"
          </p>
        )}

        <div className="space-y-4">
          {results.map(item => (
            // Envolvemos la tarjeta en un Link para ir al detalle
            <Link to={`/laws/${item.id}`} key={item.id} className="block">
              <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-amber-400 dark:hover:border-amber-600 transition-colors cursor-pointer">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded uppercase tracking-wider">
                    {item.corpus}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">{item.article}</span>
                </div>
                
                {/* AQUÍ ESTÁ LA MAGIA: Usamos dangerouslySetInnerHTML para el título */}
                <h3 
                  className="font-bold text-slate-800 dark:text-slate-200 mb-2"
                  dangerouslySetInnerHTML={{ __html: item.title }}
                />
                
                {/* Y también para el contenido, mostrando un resumen sin etiquetas */}
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed text-justify line-clamp-3">
                  {truncateHTML(item.content, 200)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}