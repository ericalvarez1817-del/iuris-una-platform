import { useState } from 'react'
import { supabase } from '../lib/supabase' 
import { Upload, Loader2, Wrench, CheckCircle, AlertTriangle } from 'lucide-react'

export default function LoadLaws() {
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState([])
  const [stats, setStats] = useState({ total: 0, success: 0, errors: 0 })

  const limpiarDatos = (rawJson) => {
    return rawJson.map(item => {
      // 1. Quitamos ID viejo (cn-1) para que Supabase cree uno nuevo
      const { id, ...resto } = item
      
      // 2. Limpiamos HTML sucio del título
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
    setLogs(prev => ["📂 Leyendo archivo...", ...prev])

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        let text = e.target.result.trim()

        // === CIRUGÍA DE JSON (REPARACIÓN AUTOMÁTICA) ===
        setLogs(prev => ["🔧 Analizando estructura del archivo...", ...prev])

        // 1. Si pegaste array junto a array (ej: ][), los unimos con coma
        if (text.match(/\]\s*\[/)) {
            setLogs(prev => ["🩹 Reparando: Se detectaron múltiples arrays pegados. Uniendo...", ...prev])
            text = text.replace(/\]\s*\[/g, ',')
        }

        // 2. Si pegaste objetos sueltos sin coma (ej: } {), agregamos la coma
        // Esta es la causa de tu error en la línea 2040
        if (text.match(/\}\s*[\r\n]+\s*\{/)) {
            setLogs(prev => ["🩹 Reparando: Faltaban comas entre los artículos. Agregando...", ...prev])
            text = text.replace(/(\})\s*([\r\n]+)\s*(\{)/g, '$1,$2$3')
        }

        // 3. Aseguramos que empiece y termine con corchetes [ ... ]
        if (!text.startsWith('[')) {
             setLogs(prev => ["🩹 Reparando: Agregando corchete de inicio '['...", ...prev])
             text = '[' + text
        }
        if (!text.endsWith(']')) {
             // A veces queda una coma suelta al final (ej: ...},)
             if (text.trim().endsWith(',')) {
                 text = text.trim().slice(0, -1) 
             }
             setLogs(prev => ["🩹 Reparando: Agregando corchete final ']'...", ...prev])
             text = text + ']'
        }
        // ===============================================

        const rawJson = JSON.parse(text)
        
        setLogs(prev => [`✅ JSON Reparado y Leído. Procesando ${rawJson.length} artículos...`, ...prev])
        const cleanJson = limpiarDatos(rawJson)
        
        setStats({ total: cleanJson.length, success: 0, errors: 0 })
        
        await uploadInBatches(cleanJson)

      } catch (err) {
        console.error(err)
        // Si falla aquí, es que el archivo está muy roto
        setLogs(prev => [`❌ Error FATAL: ${err.message}. Revisa la consola (F12) para más detalles.`, ...prev])
        setLoading(false)
      }
    }
    reader.readAsText(file)
  }

  const uploadInBatches = async (data) => {
    const BATCH_SIZE = 500
    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE)
      setLogs(prev => [`🚀 Subiendo lote ${i} a ${i + batch.length}...`, ...prev])

      const { error } = await supabase
        .from('laws_db')
        .upsert(batch, { onConflict: 'article, corpus' })

      if (error) {
        errorCount += batch.length
        setLogs(prev => [`⚠️ Error en lote ${i}: ${error.message}`, ...prev])
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
          <Wrench className="text-amber-600" /> Reparador y Cargador de Leyes
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
                <Upload className="mx-auto text-slate-400 mb-2" size={40} />
            </div>
          )}
          <p className="text-slate-600 font-medium">
            {loading ? "Reparando y subiendo..." : "Arrastra tu archivo leyes.json aquí"}
          </p>
          <p className="text-xs text-slate-400 mt-2">Corregirá automáticamente la falta de comas y corchetes.</p>
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
                log.includes("FATAL") ? "text-red-400 font-bold" : 
                log.includes("🩹") || log.includes("🔧") ? "text-yellow-400" :
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