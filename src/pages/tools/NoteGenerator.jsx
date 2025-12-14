import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { jsPDF } from 'jspdf'
import { ArrowLeft, FileText, Download, Eraser } from 'lucide-react'

export default function NoteGenerator() {
  const navigate = useNavigate()
  
  // Datos del formulario
  const [formData, setFormData] = useState({
    recipientName: 'Sr. Decano',
    recipientTitle: 'Facultad de Derecho UNA',
    reference: 'Solicitud de Revisión de Examen',
    body: 'Por medio de la presente, me dirijo a usted con el fin de solicitar la revisión de mi examen final de la materia "Derecho Romano I", rendido en fecha...',
    signerName: '',
    signerId: ''
  })

  // Función para generar la fecha actual formato Paraguay
  const getTodayDate = () => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' }
    return `Asunción, ${new Date().toLocaleDateString('es-ES', options)}`
  }

  // Lógica de Generación de PDF
  const generatePDF = () => {
    const doc = new jsPDF()
    
    // Configuración de fuente
    doc.setFont('helvetica')
    doc.setFontSize(12)

    // 1. Fecha (Alineada a la derecha)
    const date = getTodayDate()
    doc.text(date, 190, 20, { align: 'right' })

    // 2. Encabezado (Destinatario)
    doc.setFont('helvetica', 'bold')
    doc.text('A:', 20, 40)
    doc.setFont('helvetica', 'normal')
    doc.text(formData.recipientName, 30, 40)
    doc.text(formData.recipientTitle, 30, 46)

    // 3. Referencia
    doc.setFont('helvetica', 'bold')
    doc.text('REF:', 20, 60)
    doc.setFont('helvetica', 'normal')
    doc.text(formData.reference, 35, 60)

    // 4. Cuerpo (Texto largo con salto de línea automático)
    doc.text(formData.body, 20, 80, { maxWidth: 170, align: 'justify' })

    // 5. Despedida
    doc.text('Sin otro particular, me despido atentamente.', 20, 150)

    // 6. Firma (Centrada abajo)
    doc.line(70, 240, 140, 240) // Línea para firmar
    doc.text(formData.signerName, 105, 248, { align: 'center' })
    doc.text(`C.I. N° ${formData.signerId}`, 105, 254, { align: 'center' })
    doc.text('Alumno/a', 105, 260, { align: 'center' })

    // Descargar
    doc.save('Nota_Formal_UNA.pdf')
  }

  const handleChange = (e) => {
    setFormData({...formData, [e.target.name]: e.target.value})
  }

  return (
    // CAMBIO: Fondo oscuro general dark:bg-slate-950
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-10 transition-colors duration-300">
      {/* Header */}
      {/* CAMBIO: Header oscuro dark:bg-slate-900 */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 px-4 py-4 flex items-center gap-3 transition-colors">
        <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-bold text-slate-800 dark:text-white text-lg">Redactor de Notas</h1>
      </header>

      <main className="p-4 max-w-md mx-auto space-y-6">
        {/* CAMBIO: Tarjeta oscura dark:bg-slate-900 y borde dark:border-slate-800 */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4 transition-colors">
          
          {/* Inputs Destinatario */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Destinatario</label>
            <input 
              name="recipientName" 
              value={formData.recipientName} 
              onChange={handleChange}
              // CAMBIO: Input transparente con texto blanco
              className="w-full p-2 border-b border-slate-300 dark:border-slate-700 bg-transparent dark:text-white focus:border-purple-600 outline-none mt-1 transition-colors" 
              placeholder="Ej: Prof. Dr. Juan Pérez"
            />
            <input 
              name="recipientTitle" 
              value={formData.recipientTitle} 
              onChange={handleChange}
              // CAMBIO: Input transparente
              className="w-full p-2 border-b border-slate-300 dark:border-slate-700 bg-transparent text-sm text-slate-600 dark:text-slate-400 focus:border-purple-600 outline-none transition-colors" 
              placeholder="Cargo (Ej: Titular Cátedra X)"
            />
          </div>

          {/* Input Referencia */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Referencia (Tema)</label>
            <input 
              name="reference" 
              value={formData.reference} 
              onChange={handleChange}
              // CAMBIO: Input transparente con texto blanco
              className="w-full p-2 border-b border-slate-300 dark:border-slate-700 bg-transparent dark:text-white focus:border-purple-600 outline-none mt-1 font-medium transition-colors" 
            />
          </div>

          {/* Input Cuerpo */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Cuerpo de la Nota</label>
            <textarea 
              name="body" 
              value={formData.body} 
              onChange={handleChange}
              rows={6}
              // CAMBIO: TextArea transparente con texto blanco
              className="w-full p-3 border border-slate-300 dark:border-slate-700 bg-transparent dark:text-white rounded-lg focus:border-purple-600 outline-none mt-2 text-sm leading-relaxed transition-colors" 
            />
          </div>

          {/* Inputs Firmante */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Datos del Firmante</label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <input 
                name="signerName" 
                value={formData.signerName} 
                onChange={handleChange}
                // CAMBIO: Inputs de firma
                className="p-2 border border-slate-300 dark:border-slate-700 bg-transparent dark:text-white rounded focus:border-purple-600 outline-none transition-colors" 
                placeholder="Tu Nombre Completo"
              />
              <input 
                name="signerId" 
                value={formData.signerId} 
                onChange={handleChange}
                // CAMBIO: Inputs de firma
                className="p-2 border border-slate-300 dark:border-slate-700 bg-transparent dark:text-white rounded focus:border-purple-600 outline-none transition-colors" 
                placeholder="C.I. N°"
              />
            </div>
          </div>

          {/* Botón de Acción */}
          <button
            onClick={generatePDF}
            disabled={!formData.signerName || !formData.signerId}
            className="w-full bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          >
            <Download size={20} />
            Generar PDF Formal
          </button>
          
          {!formData.signerName && (
            <p className="text-center text-xs text-red-400">Completa tus datos para firmar.</p>
          )}

        </div>
      </main>
    </div>
  )
}