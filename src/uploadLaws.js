import { supabase } from './lib/supabase'
import { laws } from './data/laws' // Tu archivo actual con la Constitución

export const subirLeyes = async () => {
  console.log("⏳ Iniciando carga masiva...")
  
  // Preparamos los datos
  const datosFormateados = laws.map(ley => ({
    // Asegúrate de que los nombres de columnas coincidan con tu tabla en Supabase
    corpus: ley.corpus,
    article: ley.article,
    title: ley.title || '',
    content: ley.content,
    // Generamos un ID compatible si no usas los de la DB, 
    // pero idealmente deja que Supabase genere el UUID.
    // Si quieres mantener tus IDs 'cn-1', úsalos, pero asegúrate que la columna id sea tipo texto.
    // Si la columna id es UUID (por defecto), elimina esta línea:
    // id: ley.id 
  }))

  // Subimos en lotes para no saturar
  const { error } = await supabase
    .from('laws_db') // Asegúrate que la tabla se llame así
    .upsert(datosFormateados, { onConflict: 'article, corpus' }) // Evita duplicados si ejecutas 2 veces

  if (error) console.error("❌ Error subiendo:", error)
  else console.log("✅ ¡Leyes subidas correctamente!")
}