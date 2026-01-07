import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { jsPDF } from 'jspdf'
import { 
  ArrowLeft, Download, Eraser, 
  LayoutTemplate, PenTool, Eye, 
  Calendar, User, FileSignature, 
  CheckCircle2, Briefcase
} from 'lucide-react'

// --- 1. Definición de Plantillas (Base de Conocimiento) ---
const TEMPLATES = [
  {
    id: 'generic',
    label: 'Nota Genérica',
    icon: FileSignature,
    data: {
      recipientName: 'Sr. Decano',
      recipientTitle: 'Facultad de Derecho UNA',
      reference: 'Solicitud Varia',
      body: 'Me dirijo a usted con el objeto de plantear la siguiente solicitud...',
    }
  },
  {
    id: 'review',
    label: 'Revisión de Examen',
    icon: Eye,
    data: {
      recipientName: 'Prof. Dr. [Nombre del Titular]',
      recipientTitle: 'Titular de la Cátedra de [Materia]',
      reference: 'Solicitud de Revisión de Examen Final',
      body: 'Por medio de la presente, solicito respetuosamente la revisión de mi examen final correspondiente a la asignatura [Asignatura], rendido en fecha [Fecha]. El motivo de mi solicitud obedece a la necesidad de verificar la corrección de los temas [Temas a revisar] para fines académicos.',
    }
  },
  {
    id: 'absence',
    label: 'Justificativo Ausencia',
    icon: Calendar,
    data: {
      recipientName: 'Dirección Académica',
      recipientTitle: 'Facultad de Derecho UNA',
      reference: 'Justificación de Inasistencia',
      body: 'Me dirijo a usted para justificar mi inasistencia a las clases/examen de la fecha [Fecha], debido a motivos de salud/laborales que acredito con el documento adjunto a esta nota.',
    }
  },
  {
    id: 'resignation',
    label: 'Renuncia / Baja',
    icon: Eraser,
    data: {
      recipientName: 'Secretaría General',
      recipientTitle: 'Facultad de Derecho UNA',
      reference: 'Renuncia a la Cátedra / Curso',
      body: 'Por la presente comunico mi decisión indeclinable de renunciar a [Cargo o Curso] por motivos particulares que me impiden continuar con el desempeño de mis obligaciones.',
    }
  }
]

export default function NoteGenerator() {
  const navigate = useNavigate()
  
  // --- Estados ---
  const [activeTemplate, setActiveTemplate] = useState('generic')
  const [viewMode, setViewMode] = useState('edit') // 'edit' | 'preview'
  const [isGenerating, setIsGenerating] = useState(false)
  
  const [formData, setFormData] = useState({
    city: 'Asunción',
    date: new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }),
    recipientName: TEMPLATES[0].data.recipientName,
    recipientTitle: TEMPLATES[0].data.recipientTitle,
    reference: TEMPLATES[0].data.reference,
    body: TEMPLATES[0].data.body,
    signerName: '',
    signerId: '',
    signerType: 'Alumno/a' // Alumno, Delegado, Docente
  })

  // --- Lógica ---
  
  const loadTemplate = (templateId) => {
    const template = TEMPLATES.find(t => t.id === templateId)
    setActiveTemplate(templateId)
    setFormData(prev => ({
      ...prev,
      recipientName: template.data.recipientName,
      recipientTitle: template.data.recipientTitle,
      reference: template.data.reference,
      body: template.data.body
    }))
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // --- Generador PDF con jsPDF ---
  const generatePDF = () => {
    setIsGenerating(true)
    
    // Pequeño timeout para dar feedback visual
    setTimeout(() => {
      try {
        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        })

        // Configuración
        const pageWidth = doc.internal.pageSize.getWidth()
        const margin = 25
        const contentWidth = pageWidth - (margin * 2)
        let yPos = 30
        const lineHeight = 6

        // Fuente estilo Times (Standard en PDF)
        doc.setFont('times', 'normal')
        doc.setFontSize(12)

        // 1. Fecha (Alineada a la derecha)
        const dateStr = `${formData.city}, ${formData.date}`
        doc.text(dateStr, pageWidth - margin, yPos, { align: 'right' })
        yPos += 20

        // 2. Encabezado Destinatario
        doc.setFont('times', 'bold')
        doc.text('A:', margin, yPos)
        
        // Bloque destinatario con indentación
        doc.text(formData.recipientName, margin + 10, yPos)
        yPos += 6
        doc.setFont('times', 'normal')
        doc.text(formData.recipientTitle, margin + 10, yPos)
        yPos += 20

        // 3. Referencia
        doc.setFont('times', 'bold')
        doc.text('REF.:', margin, yPos)
        doc.setFont('times', 'normal')
        // Simulamos subrayado dibujando una línea si es necesario, o solo mayúsculas
        doc.text(formData.reference.toUpperCase(), margin + 15, yPos)
        yPos += 20

        // 4. Cuerpo de la nota (Manejo de texto largo)
        doc.setFont('times', 'normal')
        // splitTextToSize divide el texto en líneas que caben en el ancho
        const splitBody = doc.splitTextToSize(formData.body, contentWidth)
        
        // Imprimir líneas justificadas (jsPDF tiene soporte básico para justify, 
        // pero a veces 'left' se ve mejor si el algoritmo de justificado no es perfecto.
        // Usaremos 'justify' si la versión lo soporta bien, sino 'left' es seguro)
        doc.text(splitBody, margin, yPos, { align: 'justify', maxWidth: contentWidth })
        
        // Calcular nueva Y basada en la cantidad de líneas
        yPos += (splitBody.length * lineHeight) + 20

        // 5. Despedida
        doc.text('Sin otro particular, me despido atentamente.', margin, yPos)

        // 6. Firma (Centrada en la parte inferior o después del texto)
        // Aseguramos que la firma no quede muy arriba si el texto es corto, ni fuera de hoja
        let signatureY = Math.max(yPos + 40, 220)
        
        // Si nos pasamos de la hoja, nueva página (básico)
        if (signatureY > 270) {
          doc.addPage()
          signatureY = 40
        }

        doc.setLineWidth(0.5)
        doc.line(pageWidth / 2 - 35, signatureY, pageWidth / 2 + 35, signatureY) // Línea de firma
        
        doc.setFont('times', 'bold')
        doc.text(formData.signerName, pageWidth / 2, signatureY + 8, { align: 'center' })
        
        doc.setFont('times', 'normal')
        doc.text(`C.I. N° ${formData.signerId}`, pageWidth / 2, signatureY + 14, { align: 'center' })
        doc.text(formData.signerType, pageWidth / 2, signatureY + 20, { align: 'center' })

        // Guardar
        doc.save(`Nota_${formData.reference.replace(/\s+/g, '_').substring(0, 20)}.pdf`)
      } catch (error) {
        console.error("Error generando PDF", error)
        alert("Hubo un error al generar el PDF. Revisa la consola.")
      } finally {
        setIsGenerating(false)
      }
    }, 500)
  }

  // --- Renderizado ---

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans transition-colors duration-300">
      
      {/* Header Premium */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all">
            <ArrowLeft size={20} />
          </button>
          <div className="flex flex-col">
            <h1 className="font-bold text-slate-800 dark:text-white text-lg leading-tight">Redactor Jurídico</h1>
            <p className="text-xs text-slate-500 dark:text-slate-500">Generador de Documentos Formales</p>
          </div>
        </div>
        
        {/* Toggle Mobile View */}
        <div className="flex lg:hidden bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
          <button 
            onClick={() => setViewMode('edit')}
            className={`p-2 rounded-md transition-all ${viewMode === 'edit' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}
          >
            <PenTool size={18} />
          </button>
          <button 
            onClick={() => setViewMode('preview')}
            className={`p-2 rounded-md transition-all ${viewMode === 'preview' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}
          >
            <Eye size={18} />
          </button>
        </div>

        {/* Action Desktop */}
        <button 
          onClick={generatePDF}
          disabled={!formData.signerName || !formData.signerId || isGenerating}
          className={`hidden lg:flex items-center gap-2 px-6 py-2 rounded-xl font-bold text-white shadow-lg shadow-indigo-500/20 transition-all active:scale-95 ${
            !formData.signerName || !formData.signerId 
              ? 'bg-slate-300 cursor-not-allowed dark:bg-slate-700 text-slate-500' 
              : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {isGenerating ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Download size={18} />
          )}
          <span className="text-sm">{isGenerating ? 'Generando...' : 'Descargar PDF'}</span>
        </button>
      </header>

      <main className="flex-1 flex overflow-hidden">
        
        {/* --- COLUMNA IZQUIERDA: EDITOR --- */}
        <div className={`flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-6 ${viewMode === 'preview' ? 'hidden lg:block' : 'block'}`}>
          <div className="max-w-2xl mx-auto space-y-8 pb-20">
            
            {/* 1. Selector de Plantillas */}
            <section>
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Seleccionar Plantilla</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => loadTemplate(t.id)}
                    className={`
                      flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-200 gap-3 h-28 relative overflow-hidden group
                      ${activeTemplate === t.id 
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/30' 
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-indigo-300 dark:hover:border-slate-700 hover:shadow-md'
                      }
                    `}
                  >
                    <t.icon size={24} strokeWidth={1.5} className={activeTemplate === t.id ? 'text-white' : 'text-indigo-500'} />
                    <span className="text-[11px] font-bold text-center leading-tight">{t.label}</span>
                    
                    {activeTemplate === t.id && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle2 size={16} className="text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </section>

            {/* 2. Datos del Documento */}
            <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 lg:p-8 shadow-sm border border-slate-200 dark:border-slate-800 space-y-6">
              <div className="flex items-center gap-3 mb-2 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                  <FileSignature className="text-indigo-600 dark:text-indigo-400" size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white">Contenido del Documento</h3>
                  <p className="text-xs text-slate-500">Información principal de la nota</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="col-span-1">
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block uppercase tracking-wide">Ciudad</label>
                  <input name="city" value={formData.city} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" />
                </div>
                <div className="col-span-1">
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block uppercase tracking-wide">Fecha</label>
                  <input name="date" value={formData.date} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block uppercase tracking-wide">Destinatario</label>
                <input name="recipientName" value={formData.recipientName} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" placeholder="Ej: Prof. Dr. Juan Pérez" />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block uppercase tracking-wide">Cargo</label>
                <input name="recipientTitle" value={formData.recipientTitle} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" placeholder="Ej: Decano de la Facultad" />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block uppercase tracking-wide">Referencia (REF)</label>
                <div className="relative">
                  <input name="reference" value={formData.reference} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-4 pr-10 py-3 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none uppercase font-bold tracking-wide transition-all" />
                  <LayoutTemplate className="absolute right-3 top-3.5 text-slate-400" size={18} />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block uppercase tracking-wide">Cuerpo de la Nota</label>
                <textarea 
                  name="body" 
                  value={formData.body} 
                  onChange={handleChange} 
                  rows={10} 
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none leading-relaxed resize-none transition-all"
                />
              </div>
            </section>

            {/* 3. Datos del Firmante */}
            <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 lg:p-8 shadow-sm border border-slate-200 dark:border-slate-800 space-y-6">
              <div className="flex items-center gap-3 mb-2 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                  <User className="text-indigo-600 dark:text-indigo-400" size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white">Firma del Documento</h3>
                  <p className="text-xs text-slate-500">Datos obligatorios para la validez</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block uppercase tracking-wide">Nombre Completo</label>
                  <input name="signerName" value={formData.signerName} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" placeholder="Tu Nombre" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block uppercase tracking-wide">Cédula (C.I.)</label>
                  <input name="signerId" value={formData.signerId} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" placeholder="1.234.567" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block uppercase tracking-wide">Rol / Título</label>
                  <div className="relative">
                    <select name="signerType" value={formData.signerType} onChange={handleChange} className="w-full appearance-none bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all">
                      <option>Alumno/a</option>
                      <option>Delegado/a de Curso</option>
                      <option>Docente</option>
                      <option>Abogado/a</option>
                      <option>Particular</option>
                    </select>
                    <Briefcase className="absolute right-4 top-3.5 text-slate-400 pointer-events-none" size={16} />
                  </div>
                </div>
              </div>
            </section>

            {/* Mobile Download Button Bottom */}
            <div className="lg:hidden pb-10">
              <button
                onClick={generatePDF}
                disabled={!formData.signerName || !formData.signerId || isGenerating}
                className={`w-full py-4 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-3 transition-all ${
                  !formData.signerName || !formData.signerId 
                  ? 'bg-slate-400 cursor-not-allowed' 
                  : 'bg-indigo-600 active:scale-95 shadow-indigo-500/30'
                }`}
              >
                 {isGenerating ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Download size={20} />
                )}
                {isGenerating ? 'Creando Documento...' : 'Descargar PDF'}
              </button>
            </div>

          </div>
        </div>

        {/* --- COLUMNA DERECHA: LIVE PREVIEW (Solo Visualización) --- */}
        <div className={`flex-1 bg-slate-100 dark:bg-slate-950/50 border-l border-slate-200 dark:border-slate-800 p-4 lg:p-8 flex items-start justify-center overflow-y-auto ${viewMode === 'edit' ? 'hidden lg:flex' : 'flex'}`}>
          
          {/* Hoja A4 Simulada */}
          <div className="bg-white text-black shadow-2xl w-full max-w-[210mm] min-h-[297mm] p-[25mm] relative hidden-scrollbar md:scale-90 lg:scale-100 origin-top transition-transform duration-300">
            
            {/* Contenido Visual */}
            <div className="text-right font-serif text-sm mb-12 text-slate-900">
              {formData.city}, {formData.date}
            </div>

            <div className="mb-2 text-slate-900">
              <div className="font-serif font-bold text-sm">A:</div>
              <div className="ml-8">
                <div className="font-serif font-bold text-sm">{formData.recipientName || '[Nombre del Destinatario]'}</div>
                <div className="font-serif text-sm">{formData.recipientTitle || '[Cargo]'}</div>
              </div>
            </div>

            <div className="mb-8 mt-6 text-slate-900">
              <div className="font-serif font-bold text-sm inline">REF.: </div>
              <div className="font-serif text-sm inline ml-2 uppercase underline decoration-1 underline-offset-2">
                {formData.reference || '[REFERENCIA]'}
              </div>
            </div>

            <div className="text-justify font-serif text-sm leading-7 whitespace-pre-wrap min-h-[200px] text-slate-900">
              {formData.body || 'Escribe el cuerpo de la nota...'}
            </div>

            <div className="mt-8 font-serif text-sm text-slate-900">
              Sin otro particular, me despido atentamente.
            </div>

            {/* Firma Visual */}
            <div className="mt-32 flex flex-col items-center text-slate-900">
              <div className="w-64 border-t border-black mb-2"></div>
              <div className="font-serif font-bold text-sm">{formData.signerName || 'Firma'}</div>
              <div className="font-serif text-sm">C.I. N° {formData.signerId || '.......'}</div>
              <div className="font-serif text-sm">{formData.signerType}</div>
            </div>

            {/* Marca de agua */}
            <div className="absolute bottom-4 right-4 text-[10px] text-slate-300 italic select-none">
              Vista previa - Iuris UNA
            </div>
          </div>
        </div>

      </main>
    </div>
  )
}