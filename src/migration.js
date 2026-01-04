import { supabase } from './lib/supabase' // Asegúrate de importar tu cliente
import { laws } from './data/laws' // Tus leyes actuales

const migrarDatos = async () => {
  console.log("Iniciando migración...")
  
  // Mapeamos tus datos actuales al formato de la DB
  const datosParaSubir = laws.map(ley => ({
    corpus: ley.corpus,
    article: ley.article,
    title: ley.title, // Ojo: en tu archivo a veces tiene HTML en el título, idealmente límpialo
    content: ley.content
  }))

  const { error } = await supabase
    .from('laws_db')
    .insert(datosParaSubir)

  if (error) console.error("Error migrando:", error)
  else console.log("¡Migración exitosa! Ahora borra este script.")
}
// Ejecuta migrarDatos() una vez (ej: desde un useEffect o un botón temporal)