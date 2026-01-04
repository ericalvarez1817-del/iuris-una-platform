import { useState } from 'react'
// CORRECCIÓN IMPORTANTE: Solo un "../" porque estamos en src/pages/
import { supabase } from '../lib/supabase' 
import { Upload, Loader2 } from 'lucide-react'

export default function LoadLaws() {
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState([])
  const [stats, setStats] = useState({ total: 0, success: 0, errors: 0 })

  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    setLoading(true)
    setLogs(prev => ["📂 Leyendo archivo...", ...prev])

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const json = JSON.parse(e.target.result)
        setStats({ total: json.length, success: 0, errors: 0 })
        setLogs(prev => [`✅ Archivo válido. Detectados ${json.length} artículos.`, ...prev])
        
        await uploadInBatches(json)
      } catch (err) {
        setLogs(prev => [`❌ Error al leer JSON: ${err.message}`, ...prev])
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
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Upload className="text-amber-600" /> Cargador Masivo de Leyes
        </h1>

        <div className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center hover:bg-slate-50 transition-colors relative">
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
            <Upload className="mx-auto text-slate-400 mb-2" size={40} />
          )}
          <p className="text-slate-600 font-medium">
            {loading ? "Procesando leyes..." : "Arrastra tu archivo laws.json aquí"}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6 text-center">
            <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-2xl font-bold text-blue-700">{stats.total}</div>
                <div className="text-xs text-blue-600 uppercase">Total</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
                <div className="text-2xl font-bold text-green-700">{stats.success}</div>
                <div className="text-xs text-green-600 uppercase">Subidos</div>
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
                <div className="text-2xl font-bold text-red-700">{stats.errors}</div>
                <div className="text-xs text-red-600 uppercase">Errores</div>
            </div>
        </div>

        <div className="mt-6 bg-slate-900 rounded-lg p-4 h-64 overflow-y-auto font-mono text-xs text-green-400">
          {logs.map((log, i) => (
            <div key={i} className="mb-1 border-b border-slate-800 pb-1">{log}</div>
          ))}
        </div>
      </div>
    </div>
  )
}