// =============================================================
// POINT D'ENTREE DU SERVEUR — MULTI-TENANT
// =============================================================

import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import websocket from '@fastify/websocket'
import cookie from '@fastify/cookie'
import staticPlugin from '@fastify/static'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  initDB,
  getActiveSession,
  getSessionChallenges,
  getAuthSession,
  getSetting,
  getActiveAuthSessions,
} from './db/index.js'
import { challengeRoutes } from './routes/challenges.js'
import { sessionRoutes } from './routes/sessions.js'
import { settingsRoutes, publicSettingsRoutes } from './routes/settings.js'
import { authRoutes } from './routes/auth.js'
import { debugRoutes } from './routes/debug.js'
import { addClient } from './ws/manager.js'
import { requireAuth } from './middleware/auth.js'
import { startTwitchBot } from './twitch/bot.js'
import { startEventSub } from './twitch/eventsub.js'
import { config } from './config.js'
import { getState } from './state.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isProduction = process.env.NODE_ENV === 'production'

const fastify = Fastify({ logger: isProduction })

async function main() {
  // 1. Base de donnees MongoDB
  await initDB()

  // 2. Restaurer les bots des streameurs ayant une session auth active
  const activeSessions = await getActiveAuthSessions()
  for (const { login } of activeSessions) {
    const streamerId = login
    // Restaurer l'etat en memoire si une session de jeu est active
    const activeSession = await getActiveSession(streamerId)
    if (activeSession) {
      const s = getState(streamerId)
      s.session = activeSession
      const challenges = await getSessionChallenges(streamerId, activeSession.id)
      s.activeChallenge = challenges.find((c) => c.status === 'active') ?? null
      s.pendingChallenges = challenges.filter((c) => c.status === 'pending')
      s.completedCount = challenges.filter((c) => c.status === 'completed').length
      s.failedCount = challenges.filter((c) => c.status === 'failed').length
      s.skippedCount = challenges.filter((c) => c.status === 'skipped').length
      console.log(`[Session] Session restauree pour ${streamerId}`)
    }
    // Demarrer bot et EventSub
    await startTwitchBot(streamerId)
    await startEventSub(streamerId)
  }

  // --- PLUGINS ---

  await fastify.register(helmet, { contentSecurityPolicy: false })

  await fastify.register(rateLimit, { max: 200, timeWindow: '1 minute' })

  await fastify.register(cors, {
    origin: isProduction
      ? [config.PUBLIC_URL]
      : [config.WEB_URL, config.OVERLAY_URL, 'http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
  })

  await fastify.register(cookie)
  await fastify.register(websocket)

  // --- ROUTES PUBLIQUES ---
  await fastify.register(authRoutes)
  await fastify.register(publicSettingsRoutes, { prefix: '/api' })

  // --- ROUTES PROTEGES ---
  await fastify.register(async (app) => {
    app.addHook('preHandler', requireAuth)
    await app.register(challengeRoutes, { prefix: '/api' })
    await app.register(sessionRoutes, { prefix: '/api' })
    await app.register(settingsRoutes, { prefix: '/api' })
    if (!isProduction) {
      await app.register(debugRoutes, { prefix: '/api' })
    }
  })

  // WebSocket : cookie session (dashboard) ou ?token=ws_token&streamer=login (overlay OBS)
  fastify.get('/ws', { websocket: true }, async (socket, request) => {
    const cookieToken = (request.cookies as Record<string, string>)?.session_token
    const queryToken = (request.query as Record<string, string>)?.token
    const queryStreamer = (request.query as Record<string, string>)?.streamer

    let streamerId: string | null = null

    if (cookieToken) {
      const session = await getAuthSession(cookieToken)
      if (session) streamerId = session.login
    } else if (queryToken && queryStreamer) {
      const wsToken = await getSetting(queryStreamer, 'ws_token')
      if (wsToken && queryToken === wsToken) streamerId = queryStreamer
    }

    if (!streamerId) {
      socket.close()
      return
    }

    // Restauration lazy de l'etat si pas encore charge
    const s = getState(streamerId)
    if (!s.session) {
      const activeSession = await getActiveSession(streamerId)
      if (activeSession) {
        s.session = activeSession
        const challenges = await getSessionChallenges(streamerId, activeSession.id)
        s.activeChallenge = challenges.find((c) => c.status === 'active') ?? null
        s.pendingChallenges = challenges.filter((c) => c.status === 'pending')
        s.completedCount = challenges.filter((c) => c.status === 'completed').length
        s.failedCount = challenges.filter((c) => c.status === 'failed').length
        s.skippedCount = challenges.filter((c) => c.status === 'skipped').length
      }
    }

    addClient(socket, streamerId)
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
}

process.on('unhandledRejection', (reason) => {
  console.error('[Server] Rejection non geree (non fatale):', reason)
})

main().catch((err) => {
  console.error('Erreur fatale au demarrage:', err)
  process.exit(1)
})
