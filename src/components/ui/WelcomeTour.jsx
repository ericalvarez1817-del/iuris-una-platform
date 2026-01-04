import { useState, useEffect } from 'react'
import { X, ChevronRight, BookOpen, ShoppingBag, MessageCircle, Rocket, Zap, ShieldCheck } from 'lucide-react'

export default function WelcomeTour() {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [isClosing, setIsClosing] = useState(false)

  useEffect(() => {
    // Verificamos si ya vio el tutorial (puedes cambiar la key si quieres resetearlo para todos)
    const hasSeen = localStorage.getItem('iuris_tutorial_brutal_v1')
    if (!hasSeen) {
      // Pequeño delay para que la animación de entrada se sienta mejor al cargar la app
      setTimeout(() => setIsOpen(true), 500)
    }
  }, [])

  const handleClose = () => {
    setIsClosing(true) // Activa animación de salida
    setTimeout(() => {
      setIsOpen(false)
      localStorage.setItem('iuris_tutorial_brutal_v1', 'true')
    }, 400) // Espera a que termine la animación
  }

  const steps = [
    {
      pretitle: "TODO EN UNO",
      title: "Tu Arsenal Jurídico",
      desc: "Leyes actualizadas, jurisprudencia y herramientas académicas en tu bolsillo. Deja los libros pesados en casa.",
      icon: <BookOpen size={64} className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" />,
      bgGradient: "from-indigo-500 to-blue-600",
      shadowColor: "shadow-indigo-500/50"
    },
    {
      pretitle: "ECONOMÍA REAL",
      title: "Mercado IURIS",
      desc: "Convierte tus resúmenes en dinero real. Compra, vende y ofrece servicios a otros estudiantes de la UNA.",
      icon: <ShoppingBag size={64} className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" />,
      bgGradient: "from-emerald-500 to-teal-600",
      shadowColor: "shadow-emerald-500/50"
    },
    {
      pretitle: "COMUNIDAD VIP",
      title: "Círculo de Confianza",
      desc: "Chats encriptados y verificados. Sin spam, solo networking de alto nivel con tus futuros colegas.",
      icon: <ShieldCheck size={64} className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" />,
      bgGradient: "from-violet-600 to-fuchsia-600",
      shadowColor: "shadow-violet-500/50"
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
    <div className={`fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 transition-all duration-500 ${isClosing ? 'opacity-0 backdrop-blur-none' : 'opacity-100 backdrop-blur-md bg-black/40'}`}>
      
      {/* CARD PRINCIPAL */}
      <div 
        className={`
          w-full sm:max-w-md bg-white dark:bg-slate-900 
          rounded-t-[2.5rem] sm:rounded-[2.5rem] 
          shadow-2xl overflow-hidden relative 
          transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1)
          ${isClosing ? 'translate-y-full sm:scale-95' : 'translate-y-0 sm:scale-100'}
        `}
      >
        
        {/* FONDO ANIMADO DECORATIVO */}
        <div className={`absolute top-0 left-0 w-full h-64 bg-gradient-to-br ${steps[step].bgGradient} transition-colors duration-700 ease-in-out`}>
            {/* Círculos decorativos flotantes (Efecto Bokeh) */}
            <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-0 left-[-10%] w-48 h-48 bg-black/10 rounded-full blur-2xl"></div>
        </div>

        {/* BOTÓN CERRAR */}
        <button 
          onClick={handleClose} 
          className="absolute top-5 right-5 z-20 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition border border-white/10"
        >
          <X size={20} />
        </button>

        {/* CONTENIDO */}
        <div className="relative z-10 pt-16 pb-8 px-8 flex flex-col items-center text-center">
          
          {/* ICONO CON EFECTO 3D */}
          <div className={`
             mb-8 p-6 rounded-3xl 
             bg-white/10 backdrop-blur-xl border border-white/20 
             shadow-xl ${steps[step].shadowColor} 
             transform transition-all duration-500 hover:scale-110 hover:-rotate-3
             animate-in zoom-in-50 duration-500
          `} key={step + 'icon'}>
            {steps[step].icon}
          </div>

          {/* TEXTOS ANIMADOS */}
          <div className="space-y-3 min-h-[140px]" key={step + 'text'}>
            <span className="text-[10px] font-black tracking-[0.2em] text-white/80 uppercase animate-in slide-in-from-bottom-2 fade-in duration-500 delay-75">
                {steps[step].pretitle}
            </span>
            <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight animate-in slide-in-from-bottom-3 fade-in duration-500 delay-100">
              {steps[step].title}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed animate-in slide-in-from-bottom-4 fade-in duration-500 delay-200">
              {steps[step].desc}
            </p>
          </div>

          {/* CONTROLES INFERIORES */}
          <div className="w-full mt-8 flex items-center justify-between">
            
            {/* INDICADORES DE PÁGINA (Dots) */}
            <div className="flex gap-2">
              {steps.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-2.5 rounded-full transition-all duration-500 ${i === step ? `w-8 bg-gradient-to-r ${steps[step].bgGradient}` : 'w-2.5 bg-slate-200 dark:bg-slate-800'}`} 
                />
              ))}
            </div>

            {/* BOTÓN PRINCIPAL */}
            <button 
              onClick={nextStep} 
              className={`
                group relative px-8 py-3.5 rounded-full 
                bg-slate-900 dark:bg-white text-white dark:text-slate-900 
                font-bold text-sm shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 
                transition-all duration-300 flex items-center gap-2 overflow-hidden
              `}
            >
              <span className="relative z-10 flex items-center gap-2">
                {step === steps.length - 1 ? 'DESPEGAR' : 'SIGUIENTE'} 
                {step === steps.length - 1 ? <Rocket size={18} className="animate-bounce" /> : <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform"/>}
              </span>
              
              {/* Brillo al pasar el mouse */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            </button>

          </div>

        </div>
      </div>
    </div>
  )
}