// vite.config.js

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // ESTAS 4 LÍNEAS SON LA SOLUCIÓN AL ARCHIVO EN BLANCO:
      strategies: 'injectManifest', // Le dice que use tu archivo custom
      srcDir: 'public',             // Le dice dónde buscarlo
      filename: 'sw.js',            // Le dice cómo se llama
      injectRegister: false,        // No registrar auto, ya lo hicimos en main.jsx

      registerType: 'autoUpdate',
      
      manifest: {
        name: 'IURIS UNA',
        short_name: 'IURIS UNA App',
        description: 'Plataforma de servicios jurídicos para estudiantes.',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#4f46e5',
        icons: [
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      // Esto ayuda a depurar si algo falla
      devOptions: {
        enabled: true,
        type: 'module',
      },
    })
  ],
});