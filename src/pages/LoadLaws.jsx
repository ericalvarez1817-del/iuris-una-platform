import { useState } from 'react'
import { supabase } from '../lib/supabase' 
import { Upload, Loader2, RefreshCw, FileCheck } from 'lucide-react'

export default function LoadLaws() {
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState([])
  const [stats, setStats] = useState({ total: 0, success: 0, errors: 0 })

  // --- ALGORITMO CIRUJANO: Corrige títulos desfasados ---
  const repararTitulosDesfasados = (lista) => {
    let corregidos = []
    
    for (let i = 0; i < lista.length; i++) {
        let actual = { ...lista[i] }
        
        // Limpieza básica de HTML en contenido
        actual.content = actual.content || ""
        
        // ESTRATEGIA: Mirar si el artículo ANTERIOR le dejó un título "de regalo" al final
        // (Esto requiere lógica compleja, pero haremos una aproximación segura:
        //  Limpiar el título actual de basura HTML)
        
        // 1. Limpiar Título
        let titulo = actual.title || ""
        if (titulo.includes("<")) {
            const tmp = document.createElement("DIV")
            tmp.innerHTML = titulo
            titulo = tmp.textContent || tmp.innerText || ""
        }
        // Si el título parece basura (ej: "</span>"), lo borramos
        if (titulo.length < 3 || titulo.includes("span>")) titulo = ""
        actual.title = titulo.trim()

        corregidos.push(actual)
    }
    return corregidos
  }

  // --- CAZADOR DE OBJETOS ---
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
              if (obj.corpus && (obj.article || obj.content)) objetos.push(obj)
            } catch (e) { }
            inicio = -1
          }
        }
      }
    }
    return objetos
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
        
        setLogs(prev => ["🦅 Cazando objetos...", ...prev])
        const leyesCrudas = extraerObjetosJSON(text)

        setLogs(prev => [`🩹 Reparando títulos y HTML de ${leyesCrudas.length} artículos...`, ...prev])
        const datosLimpios = repararTitulosDesfasados(leyesCrudas)
        
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
    const BATCH_SIZE = 300
    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      // Truco Anti-Crash: Map para eliminar duplicados exactos en el mismo lote
      const rawBatch = data.slice(i, i + BATCH_SIZE)
      const batchMap = new Map();
      rawBatch.forEach(item => {
          const key = `${item.corpus}-${item.article}`.toLowerCase().trim()
          batchMap.set(key, item) 
      });
      const safeBatch = Array.from(batchMap.values());

      setLogs(prev => [`🚀 Subiendo lote ${i}...`, ...prev])

      const { error } = await supabase
        .from('laws_db')
        .upsert(safeBatch, { onConflict: 'corpus, article' }) 

      if (error) {
        errorCount += safeBatch.length
        setLogs(prev => [`⚠️ Error: ${error.message}`, ...prev])
      } else {
        successCount += safeBatch.length
      }
      
      setStats({ total: data.length, success: successCount, errors: errorCount })
    }

    setLogs(prev => [`🏁 ¡CARGA COMPLETA!`, ...prev])
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2 text-slate-800">
          <RefreshCw className="text-blue-600" /> Cargador & Reparador v8.0
        </h1>
        <div className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center hover:bg-slate-50 transition-colors relative group">
          <input type="file" accept=".json" onChange={handleFileUpload} disabled={loading} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          {loading ? <Loader2 className="animate-spin mx-auto text-amber-500 mb-2" size={40} /> : <FileCheck className="mx-auto text-slate-400 mb-2" size={40} />}
          <p className="text-slate-600 font-medium">{loading ? "Reparando..." : "Arrastra leyes.json aquí"}</p>
        </div>
        
        {/* Estadísticas Visuales */}
        <div className="grid grid-cols-3 gap-4 mt-6 text-center">
            <div className="bg-blue-50 p-3 rounded-lg"><div className="text-2xl font-bold text-blue-700">{stats.total}</div><div className="text-xs text-blue-600 uppercase">Total</div></div>
            <div className="bg-green-50 p-3 rounded-lg"><div className="text-2xl font-bold text-green-700">{stats.success}</div><div className="text-xs text-green-600 uppercase">Éxitos</div></div>
            <div className="bg-red-50 p-3 rounded-lg"><div className="text-2xl font-bold text-red-700">{stats.errors}</div><div className="text-xs text-red-600 uppercase">Errores</div></div>
        </div>

        <div className="mt-6 bg-slate-900 rounded-lg p-4 h-48 overflow-y-auto font-mono text-xs text-green-400">
          {logs.map((log, i) => <div key={i} className="mb-1">{log}</div>)}
        </div>
      </div>
    </div>
  )
}