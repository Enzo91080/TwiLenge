import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/overlay/',
  server: {
    port: 5174,
  },
  build: {
    outDir: '../../server/public/overlay',
    emptyOutDir: true,
  },
})
