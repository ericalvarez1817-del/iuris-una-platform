/** @type {import('tailwindcss').Config} */
import animate from 'tailwindcss-animate'; // <--- 1. IMPORTAR ESTO

export default {
  darkMode: 'class', 
  
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [
    animate // <--- 2. AGREGAR AQUÍ
  ],
}