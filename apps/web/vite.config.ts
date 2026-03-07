import { defineConfig, createLogger } from 'vite'
import react from '@vitejs/plugin-react'

// Filtre les erreurs de proxy sans interet (deconnexions normales du navigateur)
const logger = createLogger()
const warn = logger.warn.bind(logger)
const error = logger.error.bind(logger)
const ignore = (msg: string) => ['ECONNABORTED', 'ECONNREFUSED', 'ECONNRESET'].some(e => msg.includes(e))
logger.warn  = (msg, opts) => { if (!ignore(msg)) warn(msg, opts) }
logger.error = (msg, opts) => { if (!ignore(msg)) error(msg, opts) }

export default defineConfig({
  customLogger: logger,
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api':  'http://localhost:3001',
      '/auth': 'http://localhost:3001',
      '/ws':   { target: 'ws://localhost:3001', ws: true },
    },
  },
  build: {
    outDir: '../../server/public/web',
    emptyOutDir: true,
  },
})
