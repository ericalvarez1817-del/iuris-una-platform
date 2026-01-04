import { useState } from 'react'
import { supabase } from '../lib/supabase' 
import { Upload, Loader2, Scan, Database, FileJson } from 'lucide-react'

export default function LoadLaws() {
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState([])
  const [stats, setStats] = useState({ total: 0, success: 0, errors: 0 })

  // --- 1. CAZADOR DE OBJETOS ---
  const extraerObjetosJSON = (texto) => {
    const objetos = []
    let llaveAbierta = 0
    let inicio = -1
    let enCadena = false
    let escape = false

    for (let i = 0; i < texto.length; i++) {
      const char = texto[i]
      if (char === '"' && !escape) enCadena = !enCadena
      if (char === '\\' && !escape) { escape = true; continue; }
      escape = false

      if (!enCadena) {
        if (char === '{') {
          if (llaveAbierta === 0) inicio = i
          llaveAbierta++
        } else if (char === '}') {
          llaveAbierta--
          if (llaveAbierta === 0 && inicio !== -1) {
            const rawObj = texto.substring(inicio, i + 1)
            try {
              const obj = JSON.parse(rawObj)
              // Aceptamos todo lo que parezca ley, sin filtrar duplicados aquí
              if (obj.corpus && (obj.article || obj.content)) objetos.push(obj)
            } catch (e) { /* Ignorar basura */ }
            inicio = -1
          }
        }
      }
    }
    return objetos
  }

  const limpiarDatos = (listaLeyes) => {
    return listaLeyes.map(item => {
      const { id, ...resto } = item
      let tituloLimpio = resto.title || ""
      if (tituloLimpio.includes("<")) {
        const tmp = document.createElement("DIV")
        tmp.innerHTML = tituloLimpio
        tituloLimpio = tmp.textContent || tmp.innerText || ""
      }
      return { ...resto, title: tituloLimpio.trim() }
    })
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    setLoading(true)
    setLogs(prev => ["📂 Leyendo archivo...", ...prev])

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const text = e.target.result
        
        setLogs(prev => ["🦅 Cazando objetos (Modo sin filtros)...", ...prev])
        const leyesCrudas = extraerObjetosJSON(text)

        setLogs(prev => [`🧹 Procesando ${leyesCrudas.length} artículos...`, ...prev])
        const datosLimpios = limpiarDatos(leyesCrudas)
        
        setStats({ total: datosLimpios.length, success: 0, errors: 0 })
        await uploadInBatches(datosLimpios)

      } catch (err) {
        console.error(err)
        setLogs(prev => [`❌ Error FATAL: ${err.message}`, ...prev])
        setLoading(false)
      }
    }
    reader.readAsText(file)
  }

  const uploadInBatches = async (data) => {
    const BATCH_SIZE = 200
    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const rawBatch = data.slice(i, i + BATCH_SIZE)
      
      // --- TRUCO TÉCNICO PARA EVITAR CRASH ---
      // Supabase falla si enviamos 2 veces el mismo ID en el MISMO paquete.
      // Solución: En este paquete específico, dejamos solo la última versión de cada artículo.
      // Esto NO borra datos del archivo, solo organiza el envío.
      const batchMap = new Map();
      rawBatch.forEach(item => {
          // Usamos corpus + articulo como clave única temporal
          const key = `${item.corpus}-${item.article}`.toLowerCase().trim()
          batchMap.set(key, item) 
      });
      const safeBatch = Array.from(batchMap.values());
      // ---------------------------------------

      setLogs(prev => [`🚀 Subiendo lote ${i} a ${i + safeBatch.length}...`, ...prev])

      const { error } = await supabase
        .from('laws_db')
        .upsert(safeBatch, { onConflict: 'corpus, article' }) 

      if (error) {
        // Si aún así falla, lo registramos pero seguimos
        errorCount += safeBatch.length
        setLogs(prev => [`⚠️ Error leve: ${error.message} (Siguiendo con el próximo lote...)`, ...prev])
      } else {
        successCount += safeBatch.length
      }
      
      setStats({ total: data.length, success: successCount, errors: errorCount })
    }

    setLogs(prev => [`🏁 ¡CARGA COMPLETA! Todo lo posible ha sido subido.`, ...prev])
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2 text-slate-800">
          <Database className="text-blue-600" /> Cargador "Fuerza Bruta"
        </h1>

        <div className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center hover:bg-slate-50 transition-colors relative group">
          <input 
            type="file" 
            accept=".json" 
            onChange={handleFileUpload}
            disabled={loading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          {loading ? (
            <Loader2 className="animate-spin mx-auto text-amber-500 mb-2" size={40} />
          ) : (
            <div className="group-hover:scale-110 transition-transform duration-200">
                <FileJson className="mx-auto text-slate-400 mb-2" size={40} />
            </div>
          )}
          <p className="text-slate-600 font-medium">
            {loading ? "Inyectando leyes..." : "Arrastra leyes.json aquí"}
          </p>
          <p className="text-xs text-slate-400 mt-2">Modo sin eliminación de duplicados.</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6 text-center">
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                <div className="text-2xl font-bold text-blue-700">{stats.total}</div>
                <div className="text-xs text-blue-600 uppercase font-bold">Total</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                <div className="text-2xl font-bold text-green-700">{stats.success}</div>
                <div className="text-xs text-green-600 uppercase font-bold">Éxitos</div>
            </div>
            <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                <div className="text-2xl font-bold text-red-700">{stats.errors}</div>
                <div className="text-xs text-red-600 uppercase font-bold">Fallos</div>
            </div>
        </div>

        <div className="mt-6 bg-slate-900 rounded-lg p-4 h-64 overflow-y-auto font-mono text-xs shadow-inner">
          {logs.length === 0 && <span className="text-slate-500 italic">Esperando archivo...</span>}
          {logs.map((log, i) => (
            <div key={i} className={`mb-1.5 border-b border-slate-800 pb-1 ${
                log.includes("Error") ? "text-red-400 font-bold" : 
                log.includes("🚀") ? "text-blue-400" :
                "text-green-400"
            }`}>
                {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}