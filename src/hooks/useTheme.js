import { useEffect, useState } from 'react'

export default function useTheme() {
  // 1. Intentamos leer el tema guardado en localStorage
  const savedTheme = localStorage.getItem('theme')
  
  // 2. Si no hay guardado, miramos la preferencia del sistema operativo
  const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

  // Estado inicial: lo guardado O la preferencia del sistema
  const [theme, setTheme] = useState(savedTheme || systemPreference)

  // Efecto secundario: Cada vez que 'theme' cambia, actualizamos el HTML y localStorage
  useEffect(() => {
    const root = window.document.documentElement

    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }

    // Guardamos la elección para la próxima visita
    localStorage.setItem('theme', theme)
  }, [theme])

  // Función para alternar entre modos
  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light')
  }

  // Devolvemos el tema actual y la función para cambiarlo
  return { theme, toggleTheme }
}