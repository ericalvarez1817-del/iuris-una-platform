// vite.config.js

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa'; // <-- Importar el Plugin

export default defineConfig({
  plugins: [
    react(),
    // Configuración del Plugin Vite PWA
    VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
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
                    purpose: 'any maskable' // Esto ayuda a que el ícono se vea mejor en Android
                }
            ]
        }
    })
  ],
});