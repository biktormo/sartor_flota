import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({ 
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'logo.png'], // Archivos estáticos a cachear
      manifest: {
        name: 'SARTOR Gestión de Flota',
        short_name: 'Sartor Flota',
        description: 'Control de consumo de combustible y gestión de unidades John Deere.',
        theme_color: '#367C2B', // Verde John Deere
        background_color: '#f4f7f5', // Color de fondo al abrir la app
        display: 'standalone', // Esto elimina la barra de navegación del navegador (parece app nativa)
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable' // Importante para iconos redondos en Android
          }
        ]
      }
    })
  ],
})