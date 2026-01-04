import { useState } from 'react'
import { supabase } from '../lib/supabase' 
import { Upload, Loader2, Scan, CheckCircle, AlertTriangle, FileJson } from 'lucide-react'

export default function LoadLaws() {
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState([])
  const [stats, setStats] = useState({ total: 0, success: 0, errors: 0 })

  // --- ALGORITMO CAZADOR DE OBJETOS (Blindado contra errores de sintaxis) ---
  const extraerObjetosJSON = (texto) => {
    const objetos = []
    let llaveAbierta = 0
    let inicio = -1
    let enCadena = false
    let escape = false

    // Recorremos caracter por caracter buscando bloques { ... }
    for (let i = 0; i < texto.length; i++) {
      const char = texto[i]

      // Manejo de strings para ignorar llaves dentro de textos (ej: content: "text { o }")
      if (char === '"' && !escape) {
        enCadena = !enCadena
      }
      if (char === '\\' && !escape) {
        escape = true
        continue
      }
      escape = false

      if (!enCadena) {
        if (char === '{') {
          if (llaveAbierta === 0) inicio = i
          llaveAbierta++
        } else if (char === '}') {
          llaveAbierta--
          if (llaveAbierta === 0 && inicio !== -1) {
            // ¡ENCONTRAMOS UN OBJETO CERRADO!
            const rawObj = texto.substring(inicio, i + 1)
            try {
              const obj = JSON.parse(rawObj)
              // Validamos que parezca una ley
              if (obj.corpus && (obj.article || obj.content)) {
                objetos.push(obj)
              }
            } catch (e) {
              // Si falla el parseo individual, lo ignoramos y seguimos
              console.warn("Objeto corrupto ignorado:", rawObj.substring(0, 50))
            }
            inicio = -1
          }
        }
      }
    }
    return objetos
  }

  const limpiarDatos = (listaLeyes) => {
    return listaLeyes.map(item => {
      // 1. Quitamos ID viejo
      const { id, ...resto } = item
      
      // 2. Limpiamos HTML del título
      let tituloLimpio = resto.title || ""
      if (tituloLimpio.includes("<")) {
        const tmp = document.createElement("DIV")
        tmp.innerHTML = tituloLimpio
        tituloLimpio = tmp.textContent || tmp.innerText || ""
      }

      return {
        ...resto,
        title: tituloLimpio.trim()
      }
    })
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    setLoading(true)
    setLogs(prev => ["📂 Leyendo archivo gigante...", ...prev])

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const text = e.target.result

        setLogs(prev => ["🦅 Iniciando 'Caza de Objetos' (esto puede tardar unos segundos)...", ...prev])
        
        // Usamos el algoritmo manual en lugar de JSON.parse
        const leyesEncontradas = extraerObjetosJSON(text)

        if (leyesEncontradas.length === 0) {
            throw new Error("No se encontraron objetos JSON válidos con formato de ley.")
        }

        setLogs(prev => [`✅ ¡Caza exitosa! Se recuperaron ${leyesEncontradas.length} artículos válidos.`, ...prev])
        setLogs(prev => [`🧹 Limpiando datos...`, ...prev])
        
        const datosLimpios = limpiarDatos(leyesEncontradas)
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
    const BATCH_SIZE = 200 // Bajamos un poco el lote para asegurar
    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE)
      setLogs(prev => [`🚀 Subiendo lote ${i} a ${i + batch.length}...`, ...prev])

      const { error } = await supabase
        .from('laws_db')
        .upsert(batch, { onConflict: 'corpus, article' }) // IMPORTANTE: Coincide con el índice SQL

      if (error) {
        errorCount += batch.length
        setLogs(prev => [`⚠️ Error Supabase: ${error.message} (Revisa si creaste el índice SQL)`, ...prev])
      } else {
        successCount += batch.length
      }
      
      setStats({ total: data.length, success: successCount, errors: errorCount })
    }

    setLogs(prev => [`🏁 ¡PROCESO TERMINADO!`, ...prev])
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2 text-slate-800">
          <Scan className="text-amber-600" /> Cargador v5.0 "El Cazador"
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
            {loading ? "Cazando leyes..." : "Arrastra leyes.json aquí"}
          </p>
          <p className="text-xs text-slate-400 mt-2">Ignora errores de comas, corchetes y basura.</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6 text-center">
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                <div className="text-2xl font-bold text-blue-700">{stats.total}</div>
                <div className="text-xs text-blue-600 uppercase font-bold">Total</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                <div className="text-2xl font-bold text-green-700">{stats.success}</div>
                <div className="text-xs text-green-600 uppercase font-bold">Subidos</div>
            </div>
            <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                <div className="text-2xl font-bold text-red-700">{stats.errors}</div>
                <div className="text-xs text-red-600 uppercase font-bold">Errores</div>
            </div>
        </div>

        <div className="mt-6 bg-slate-900 rounded-lg p-4 h-64 overflow-y-auto font-mono text-xs shadow-inner">
          {logs.length === 0 && <span className="text-slate-500 italic">Esperando archivo...</span>}
          {logs.map((log, i) => (
            <div key={i} className={`mb-1.5 border-b border-slate-800 pb-1 ${
                log.includes("Error") || log.includes("FATAL") ? "text-red-400 font-bold" : 
                log.includes("Caza") ? "text-yellow-400" :
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