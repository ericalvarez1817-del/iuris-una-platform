import { useState, useEffect } from 'react'
import { X, ChevronRight, Check, Rocket, BookOpen, User, DollarSign, Wallet, Search, PlusCircle } from 'lucide-react'

export default function WelcomeTour() {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [isClosing, setIsClosing] = useState(false)

  useEffect(() => {
    // Cambiamos la key para forzar que aparezca de nuevo al probar
    const hasSeen = localStorage.getItem('iuris_tour_ultimate')
    if (!hasSeen) {
      setTimeout(() => setIsOpen(true), 500)
    }
  }, [])

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsOpen(false)
      localStorage.setItem('iuris_tour_ultimate', 'true')
    }, 500)
  }

  // --- CONTENIDO INSTRUCTIVO (Con diseño visual) ---
  const steps = [
    {
      pretitle: "TU ECONOMÍA",
      title: "Cómo Ganar Dinero",
      instruction: "Ve a la pestaña Mercado. Toca el botón (+) y selecciona 'Vender Resumen'. Sube tus PDFs y fija el precio en IURIS Coins.",
      proTip: "Los resúmenes de 'Romano I' y 'Civil' son los más buscados.",
      icon: <DollarSign size={48} className="text-emerald-100" />,
      bgGradient: "from-emerald-600 to-teal-800",
      accentColor: "bg-emerald-500",
      // Simulación Visual (UI Mockup)
      visual: (
        <div className="flex gap-4 items-center justify-center mt-4 p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
            <div className="p-2 bg-white/20 rounded-lg"><Wallet size={20} className="text-white"/></div>
            <div className="flex-1 h-1 bg-white/20 rounded-full mx-2"></div>
            <div className="p-2 bg-emerald-500 rounded-full text-white shadow-lg shadow-emerald-500/50 animate-pulse"><PlusCircle size={24}/></div>
        </div>
      )
    },
    {
      pretitle: "TUS ESTUDIOS",
      title: "Leyes Offline",
      instruction: "En la sección Leyes, usa la lupa para buscar (ej: 'Divorcio'). Cuando abras una ley, se guardará automáticamente para leer sin internet.",
      proTip: "Usa el botón 'Aa' para agrandar la letra en clase.",
      icon: <BookOpen size={48} className="text-indigo-100" />,
      bgGradient: "from-indigo-600 to-blue-800",
      accentColor: "bg-indigo-500",
      visual: (
        <div className="flex flex-col gap-2 mt-4 p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10 max-w-[200px] mx-auto">
            <div className="flex items-center gap-2 bg-white/20 p-2 rounded-lg">
                <Search size={14} className="text-white/70"/>
                <div className="h-1.5 w-16 bg-white/30 rounded-full"></div>
            </div>
            <div className="space-y-1.5 opacity-60">
                <div className="h-1 w-full bg-white/10 rounded-full"></div>
                <div className="h-1 w-2/3 bg-white/10 rounded-full"></div>
            </div>
        </div>
      )
    },
    {
      pretitle: "TU REPUTACIÓN",
      title: "Perfil Verificado",
      instruction: "Tu foto y nombre son tu marca. Completa tu biografía en el Perfil para generar confianza y vender más rápido.",
      proTip: "Los usuarios verificados aparecen primero en las búsquedas.",
      icon: <User size={48} className="text-amber-100" />,
      bgGradient: "from-amber-600 to-orange-800",
      accentColor: "bg-amber-500",
      visual: (
        <div className="flex items-center gap-3 justify-center mt-4 p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 border-2 border-white/30"></div>
            <div className="space-y-1.5 text-left">
                <div className="h-2 w-20 bg-white/30 rounded"></div>
                <div className="flex gap-1">
                    {[1,2,3,4,5].map(i => <div key={i} className="w-2 h-2 bg-amber-400 rounded-full shadow-[0_0_5px_rgba(251,191,36,0.8)]"></div>)}
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
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-500 ${isClosing ? 'opacity-0 bg-black/0' : 'opacity-100 bg-black/80 backdrop-blur-sm'}`}>
      
      {/* CARD PRINCIPAL */}
      <div 
        className={`
          w-full max-w-sm rounded-[2rem] overflow-hidden relative shadow-2xl 
          transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1)
          ${isClosing ? 'scale-90 translate-y-10' : 'scale-100 translate-y-0'}
          bg-slate-900 border border-slate-800
        `}
      >
        
        {/* FONDO ANIMADO DE COLOR */}
        <div className={`absolute inset-0 bg-gradient-to-br ${steps[step].bgGradient} transition-colors duration-700 ease-in-out opacity-100`}>
            {/* Patrones de fondo */}
            <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-[80px] animate-pulse"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/20 rounded-full blur-[60px]"></div>
        </div>

        {/* HEADER: BOTÓN CERRAR */}
        <button 
          onClick={handleClose} 
          className="absolute top-4 right-4 z-20 p-2 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full text-white/70 hover:text-white transition border border-white/10"
        >
          <X size={20} />
        </button>

        {/* CONTENIDO */}
        <div className="relative z-10 p-8 flex flex-col items-center text-center text-white">
          
          {/* ICONO FLOTANTE */}
          <div className="mb-6 animate-in zoom-in duration-500" key={step + 'icon'}>
            <div className={`p-5 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl shadow-black/20`}>
                {steps[step].icon}
            </div>
          </div>

          {/* TEXTOS */}
          <div className="space-y-2 mb-6 min-h-[120px]" key={step + 'text'}>
            <p className="text-xs font-bold tracking-[0.2em] text-white/60 uppercase animate-in slide-in-from-bottom-2 fade-in duration-500 delay-100">
                {steps[step].pretitle}
            </p>
            <h2 className="text-2xl font-black tracking-tight animate-in slide-in-from-bottom-4 fade-in duration-500 delay-200">
              {steps[step].title}
            </h2>
            <p className="text-sm font-medium text-white/80 leading-relaxed animate-in slide-in-from-bottom-6 fade-in duration-500 delay-300">
              {steps[step].instruction}
            </p>
            
            {/* VISUAL MOCKUP */}
            <div className="animate-in fade-in duration-700 delay-500">
                {steps[step].visual}
            </div>
          </div>

          {/* PRO TIP BOX */}
          <div className="w-full bg-black/20 border border-white/10 rounded-xl p-3 flex gap-3 text-left mb-8 backdrop-blur-md animate-in slide-in-from-bottom-4 fade-in duration-500 delay-500">
            <div className="shrink-0 mt-0.5">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${steps[step].accentColor}`}>!</div>
            </div>
            <p className="text-xs text-white/90">
                <span className="font-bold text-white opacity-100">Pro Tip: </span>
                {steps[step].proTip}
            </p>
          </div>

          {/* CONTROLES INFERIORES */}
          <div className="w-full flex items-center justify-between">
            {/* Dots Indicadores */}
            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-1.5 rounded-full transition-all duration-500 ${i === step ? 'w-6 bg-white' : 'w-1.5 bg-white/30'}`} 
                />
              ))}
            </div>

            {/* Botón Acción */}
            <button 
              onClick={nextStep} 
              className="group relative px-6 py-3 rounded-xl bg-white text-slate-900 font-bold text-sm shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2 overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-2">
                {step === steps.length - 1 ? 'DESPEGAR' : 'SIGUIENTE'}
                {step === steps.length - 1 ? <Rocket size={16} className="animate-bounce" /> : <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform"/>}
              </span>
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}