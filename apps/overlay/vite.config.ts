import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // En prod, l'overlay est accessible a /overlay sur le meme serveur
  base: '/overlay/',
  server: {
    port: 5174,
    proxy: {
      '/ws': { target: 'ws://localhost:3001', ws: true },
    },
  },
  build: {
    outDir: '../../server/public/overlay',
    emptyOutDir: true,
  },
})
