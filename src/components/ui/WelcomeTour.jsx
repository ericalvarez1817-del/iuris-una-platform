import { useState, useEffect } from 'react'
import { X, ChevronRight, Check, Search, PlusCircle, BookOpen, User, DollarSign, Wallet } from 'lucide-react'

export default function WelcomeTour() {
  const [isOpen, setIsOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(false) // Para animación manual
  const [step, setStep] = useState(0)

  useEffect(() => {
    const hasSeen = localStorage.getItem('iuris_guide_final_v4')
    if (!hasSeen) {
      setIsOpen(true)
      // Pequeño delay para activar la opacidad
      setTimeout(() => setIsVisible(true), 100)
    }
  }, [])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(() => {
      setIsOpen(false)
      localStorage.setItem('iuris_guide_final_v4', 'true')
    }, 300)
  }

  const steps = [
    {
      title: "1. Gana Dinero Real",
      instruction: "Ve al Mercado (Bolsa). Toca el botón (+) y sube tus resúmenes. Cada venta suma saldo a tu cuenta.",
      proTip: "Los apuntes de 1er año son los más vendidos.",
      icon: <DollarSign size={32} className="text-emerald-500" />,
      // Visual simple con divs
      visual: (
        <div className="flex gap-4 items-center justify-center opacity-80 mt-2 p-2">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg"><Wallet size={20}/></div>
            <div className="h-0.5 w-8 bg-slate-300"></div>
            <div className="p-2 bg-indigo-600 rounded-full text-white"><PlusCircle size={24}/></div>
        </div>
      )
    },
    {
      title: "2. Leyes al Instante",
      instruction: "En Leyes (Balanza), usa el buscador. Escribe 'Código Civil'. Al leer, usa el botón 'Aa' para agrandar la letra.",
      proTip: "El modo oscuro ahorra batería en clase.",
      icon: <BookOpen size={32} className="text-indigo-500" />,
      visual: (
        <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg w-full max-w-[180px] mx-auto mt-2 flex items-center gap-2">
            <Search size={16} className="text-slate-400"/>
            <div className="h-2 w-16 bg-slate-300 rounded-full"></div>
        </div>
      )
    },
    {
      title: "3. Tu Marca Personal",
      instruction: "Completa tu Perfil. Una buena foto y biografía aumentan tus ventas y tu reputación en la comunidad.",
      proTip: "Verifica tu cuenta para destacar.",
      icon: <User size={32} className="text-amber-500" />,
      visual: (
        <div className="flex items-center gap-3 justify-center mt-2 p-2">
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700"></div>
            <div className="space-y-1">
                <div className="h-2 w-20 bg-slate-200 dark:bg-slate-700 rounded"></div>
                <div className="flex gap-1">
                    {[1,2,3,4,5].map(i => <div key={i} className="w-2 h-2 bg-amber-400 rounded-full"></div>)}
                </div>
            </div>
        </div>
      )
    }
  ]

  const nextStep = () => {
    if (step < steps.length - 1) {
      setStep(step + 1)
    } else {
      handleClose()
    }
  }

  if (!isOpen) return null

  return (
    // CONTENEDOR PRINCIPAL (Fondo Oscuro)
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
    >
      
      {/* TARJETA BLANCA/OSCURA */}
      <div className={`w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden transform transition-all duration-500 ${isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
        
        {/* Header */}
        <div className="bg-slate-50 dark:bg-slate-950 px-6 py-4 flex justify-between items-center border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                PASO {step + 1} / {steps.length}
            </span>
            <button onClick={handleClose} className="text-slate-400 hover:text-red-500 transition">
                <X size={20}/>
            </button>
        </div>

        {/* Contenido */}
        <div className="p-6 flex flex-col items-center text-center">
            
            {/* Icono */}
            <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-full shadow-sm transition-all duration-300 transform hover:scale-110">
                {steps[step].icon}
            </div>

            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-3">
                {steps[step].title}
            </h2>

            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-6">
                {steps[step].instruction}
            </p>

            {/* Gráfico Visual */}
            <div className="w-full mb-6 opacity-80 grayscale hover:grayscale-0 transition-all">
                {steps[step].visual}
            </div>

            {/* Tip Box */}
            <div className="w-full bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 p-3 rounded-lg flex gap-3 text-left">
                <div className="shrink-0">
                    <div className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center text-xs text-white font-bold">i</div>
                </div>
                <p className="text-xs text-indigo-800 dark:text-indigo-300 pt-0.5">
                    <span className="font-bold">Tip: </span>
                    {steps[step].proTip}
                </p>
            </div>

        </div>

        {/* Footer (Botón) */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
            <button 
                onClick={nextStep}
                className="w-full py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg"
            >
                {step === steps.length - 1 ? '¡Comenzar!' : 'Siguiente'}
                {step === steps.length - 1 ? <Check size={18}/> : <ChevronRight size={18}/>}
            </button>
        </div>

      </div>
    </div>
  )
}