import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy les appels API vers le serveur Fastify pour eviter les problemes CORS en dev
    proxy: {
      '/api': 'http://localhost:3001',
      '/auth': 'http://localhost:3001',
      '/ws': { target: 'ws://localhost:3001', ws: true },
    },
  },
  build: {
    // En production, les fichiers sont servis directement par Fastify
    outDir: '../../server/public/web',
    emptyOutDir: true,
  },
})
