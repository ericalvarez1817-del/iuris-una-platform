import { useState, useEffect } from 'react'
import { X, ChevronRight, Check, Search, PlusCircle, BookOpen, User, DollarSign, Wallet } from 'lucide-react'

export default function WelcomeTour() {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    // Cambiamos la key para que te vuelva a salir al probarlo
    const hasSeen = localStorage.getItem('iuris_guide_v3')
    if (!hasSeen) {
      setTimeout(() => setIsOpen(true), 500)
    }
  }, [])

  const handleClose = () => {
    setIsOpen(false)
    localStorage.setItem('iuris_guide_v3', 'true')
  }

  // --- CONTENIDO DEL TUTORIAL (Instrucciones Reales) ---
  const steps = [
    {
      title: "1. ¿Cómo gano dinero?",
      instruction: "Ve a la pestaña Mercado (icono de Bolsa). Busca el botón flotante (+) y selecciona 'Publicar'. Sube tus resúmenes en PDF.",
      proTip: "Los resúmenes de 'Derecho Romano' se venden más rápido.",
      icon: <DollarSign size={40} className="text-emerald-500" />,
      visual: (
        <div className="flex gap-4 items-center justify-center opacity-80 mt-2">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg"><Wallet size={20}/></div>
            <div className="h-0.5 w-8 bg-slate-300"></div>
            <div className="p-2 bg-indigo-600 rounded-full text-white"><PlusCircle size={24}/></div>
        </div>
      )
    },
    {
      title: "2. Leer leyes sin internet",
      instruction: "En la sección Leyes (Balanza), usa el buscador. Escribe 'Código Civil' o 'Divorcio'. Al abrir una ley, ajusta el tamaño de letra con el botón 'T'.",
      proTip: "Usa el Modo Oscuro (Luna) para leer de noche sin cansar la vista.",
      icon: <BookOpen size={40} className="text-indigo-500" />,
      visual: (
        <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg w-full max-w-[200px] mx-auto mt-2 flex items-center gap-2">
            <Search size={16} className="text-slate-400"/>
            <div className="h-2 w-20 bg-slate-300 rounded-full"></div>
        </div>
      )
    },
    {
      title: "3. Tu Perfil y Reputación",
      instruction: "Tu foto y nombre son tu marca. Si vendes buenos apuntes, tu reputación subirá y aparecerás como 'Vendedor Verificado'.",
      proTip: "Ve a la pestaña Perfil para cambiar tu foto y retirar tus ganancias.",
      icon: <User size={40} className="text-amber-500" />,
      visual: (
        <div className="flex items-center gap-3 justify-center mt-2">
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700"></div>
            <div className="space-y-1">
                <div className="h-2 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div>
                <div className="flex gap-1">
                    {[1,2,3,4,5].map(i => <div key={i} className="w-3 h-3 bg-amber-400 rounded-full"></div>)}
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 transition-all">
        
        {/* Header con Progreso */}
        <div className="bg-slate-50 dark:bg-slate-950 px-6 py-4 flex justify-between items-center border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                PASO {step + 1} DE {steps.length}
            </span>
            <button onClick={handleClose} className="text-slate-400 hover:text-red-500 transition">
                <X size={20}/>
            </button>
        </div>

        {/* Cuerpo del Tutorial */}
        <div className="p-8 flex flex-col items-center text-center">
            
            {/* Icono Principal Animado */}
            <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl shadow-sm animate-in zoom-in duration-300" key={step}>
                {steps[step].icon}
            </div>

            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-4 leading-tight">
                {steps[step].title}
            </h2>

            {/* Instrucción Clara */}
            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-6 font-medium">
                {steps[step].instruction}
            </p>

            {/* Representación Visual Mini */}
            <div className="w-full mb-6 opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
                {steps[step].visual}
            </div>

            {/* TIP PRO BOX */}
            <div className="w-full bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 p-3 rounded-lg flex gap-3 text-left">
                <div className="shrink-0 mt-0.5">
                    <div className="w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold">i</div>
                </div>
                <p className="text-xs text-indigo-800 dark:text-indigo-300">
                    <span className="font-bold block mb-0.5">Tip Pro:</span>
                    {steps[step].proTip}
                </p>
            </div>

        </div>

        {/* Footer Botón */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
            <button 
                onClick={nextStep}
                className="w-full py-3.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm hover:scale-[1.02] active:scale-95 transition flex items-center justify-center gap-2 shadow-lg"
            >
                {step === steps.length - 1 ? '¡ENTENDIDO, A ESTUDIAR!' : 'SIGUIENTE'}
                {step === steps.length - 1 ? <Check size={18}/> : <ChevronRight size={18}/>}
            </button>
        </div>

      </div>
    </div>
  )
}