// =============================================================
// POINT D'ENTREE DU SERVEUR
// =============================================================

import Fastify from 'fastify'
import cors from '@fastify/cors'
import websocket from '@fastify/websocket'
import cookie from '@fastify/cookie'
import staticPlugin from '@fastify/static'
import path from 'path'
import { fileURLToPath } from 'url'
import { initDB, getActiveSession, getSessionChallenges } from './db/index.js'
import { challengeRoutes } from './routes/challenges.js'
import { sessionRoutes } from './routes/sessions.js'
import { settingsRoutes } from './routes/settings.js'
import { authRoutes } from './routes/auth.js'
import { addClient } from './ws/manager.js'
import { requireAuth } from './middleware/auth.js'
import { startTwitchBot } from './twitch/bot.js'
import { startEventSub } from './twitch/eventsub.js'
import { config } from './config.js'
import { state } from './state.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isProduction = process.env.NODE_ENV === 'production'

const fastify = Fastify({ logger: isProduction })

async function main() {
  // 1. Base de donnees MongoDB
  await initDB()

  // 2. Restaurer la session active depuis la BDD
  const activeSession = await getActiveSession()
  if (activeSession) {
    state.session = activeSession
    const challenges = await getSessionChallenges(activeSession.id)
    state.activeChallenge = challenges.find((c) => c.status === 'active') ?? null
    state.pendingChallenges = challenges.filter((c) => c.status === 'pending')
    state.completedCount = challenges.filter((c) => c.status === 'completed').length
    state.failedCount = challenges.filter((c) => c.status === 'failed').length
    state.skippedCount = challenges.filter((c) => c.status === 'skipped').length
    console.log(`[Session] Session #${activeSession.id} restauree`)
  }

  // --- PLUGINS ---

  await fastify.register(cors, {
    origin: isProduction
      ? [config.PUBLIC_URL]
      : [config.WEB_URL, config.OVERLAY_URL, 'http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
  })

  await fastify.register(cookie)
  await fastify.register(websocket)

  // --- ROUTES PUBLIQUES ---
  // Auth (dashboard login, callback, statut session) + setup initial
  await fastify.register(authRoutes)
  await fastify.register(settingsRoutes, { prefix: '/api' })

  // --- ROUTES PROTEGES (necessitent une session dashboard) ---
  await fastify.register(async (app) => {
    app.addHook('preHandler', requireAuth)
    await app.register(challengeRoutes, { prefix: '/api' })
    await app.register(sessionRoutes, { prefix: '/api' })
  })

  // WebSocket (ouvert pour le dashboard et l'overlay)
  fastify.get('/ws', { websocket: true }, (socket) => {
    addClient(socket)
  })

  fastify.get('/health', async () => ({ status: 'ok' }))

  // --- FICHIERS STATIQUES (production uniquement) ---
  if (isProduction) {
    const webDistPath = path.join(__dirname, '../public/web')
    const overlayDistPath = path.join(__dirname, '../public/overlay')

    await fastify.register(staticPlugin, { root: webDistPath, prefix: '/', wildcard: false })
    await fastify.register(staticPlugin, {
      root: overlayDistPath, prefix: '/overlay', wildcard: false, decorateReply: false,
    })

    fastify.setNotFoundHandler(async (request, reply) => {
      if (['api', 'auth', 'ws', 'health'].some((p) => request.url.startsWith(`/${p}`))) {
        return reply.status(404).send({ error: 'Not found' })
      }
      if (request.url.startsWith('/overlay')) return reply.sendFile('index.html', overlayDistPath)
      return reply.sendFile('index.html', webDistPath)
    })
  }

  // --- DEMARRAGE ---
  await fastify.listen({ port: config.PORT, host: '0.0.0.0' })

  if (isProduction) {
    console.log(`\n  Serveur demarre sur ${config.PUBLIC_URL}`)
  } else {
    console.log(`\n  Serveur demarre sur http://localhost:${config.PORT}`)
    console.log(`  Dashboard  : http://localhost:5173`)
    console.log(`  Overlay OBS: http://localhost:5174\n`)
  }

  await startTwitchBot()
  await startEventSub()
}

main().catch((err) => {
  console.error('Erreur fatale au demarrage:', err)
  process.exit(1)
})
