// =============================================================
// POINT D'ENTREE DU SERVEUR
// =============================================================
// Demarre Fastify, enregistre les routes, connecte Twitch.
// Commande de lancement : pnpm dev (depuis la racine)
// =============================================================

import Fastify from 'fastify'
import cors from '@fastify/cors'
import websocket from '@fastify/websocket'
import staticPlugin from '@fastify/static'
import path from 'path'
import { fileURLToPath } from 'url'
import { initDB, getActiveSession, getSessionChallenges } from './db/index.js'
import { challengeRoutes } from './routes/challenges.js'
import { sessionRoutes } from './routes/sessions.js'
import { settingsRoutes } from './routes/settings.js'
import { authRoutes } from './routes/auth.js'
import { addClient } from './ws/manager.js'
import { startTwitchBot } from './twitch/bot.js'
import { startEventSub } from './twitch/eventsub.js'
import { config } from './config.js'
import { state } from './state.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isProduction = process.env.NODE_ENV === 'production'

const fastify = Fastify({ logger: true })

async function main() {
  // --- INITIALISATION ---

  // 1. Base de donnees (cree les tables si necessaire)
  initDB()
  console.log('[DB] Base de donnees initialisee.')

  // 2. Restaurer la session active depuis la BDD (si l'app a plante/redemarree)
  const activeSession = getActiveSession()
  if (activeSession) {
    state.session = activeSession
    const challenges = getSessionChallenges(activeSession.id)
    state.activeChallenge = challenges.find((c) => c.status === 'active') ?? null
    state.pendingChallenges = challenges.filter((c) => c.status === 'pending')
    state.completedCount = challenges.filter((c) => c.status === 'completed').length
    state.failedCount = challenges.filter((c) => c.status === 'failed').length
    state.skippedCount = challenges.filter((c) => c.status === 'skipped').length
    console.log(`[Session] Session #${activeSession.id} restauree (${state.pendingChallenges.length} defis en attente)`)
  }

  // --- PLUGINS FASTIFY ---

  // CORS : autorise le dashboard et l'overlay a appeler l'API
  await fastify.register(cors, {
    origin: isProduction
      ? [config.PUBLIC_URL]
      : [config.WEB_URL, config.OVERLAY_URL, 'http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
  })

  // WebSocket : pour les mises a jour en temps reel
  await fastify.register(websocket)

  // --- ROUTES ---

  await fastify.register(challengeRoutes, { prefix: '/api' })
  await fastify.register(sessionRoutes, { prefix: '/api' })
  await fastify.register(settingsRoutes, { prefix: '/api' })
  await fastify.register(authRoutes)

  // Point d'entree WebSocket : les clients se connectent ici
  // Dashboard et overlay se connectent automatiquement a ws://localhost:3001/ws
  fastify.get('/ws', { websocket: true }, (socket) => {
    addClient(socket)
  })

  // Route de sante (pour verifier que le serveur tourne)
  fastify.get('/health', async () => ({ status: 'ok', version: '1.0.0' }))

  // --- FICHIERS STATIQUES (production uniquement) ---
  // En dev, le dashboard et l'overlay tournent via Vite sur des ports separes.
  // En production (Railway), Fastify sert directement les fichiers buildés.

  if (isProduction) {
    const webDistPath = path.join(__dirname, '../public/web')
    const overlayDistPath = path.join(__dirname, '../public/overlay')

    // Fichiers statiques du dashboard (/)
    await fastify.register(staticPlugin, {
      root: webDistPath,
      prefix: '/',
      wildcard: false,
    })

    // Fichiers statiques de l'overlay (/overlay)
    await fastify.register(staticPlugin, {
      root: overlayDistPath,
      prefix: '/overlay',
      wildcard: false,
      decorateReply: false,
    })

    // SPA fallback : toute route inconnue renvoie l'index.html correspondant
    // (React Router gere la navigation cote client)
    fastify.setNotFoundHandler(async (request, reply) => {
      if (
        request.url.startsWith('/api') ||
        request.url.startsWith('/auth') ||
        request.url === '/ws' ||
        request.url === '/health'
      ) {
        return reply.status(404).send({ error: 'Not found' })
      }
      if (request.url.startsWith('/overlay')) {
        return reply.sendFile('index.html', overlayDistPath)
      }
      return reply.sendFile('index.html', webDistPath)
    })
  }

  // --- DEMARRAGE ---

  await fastify.listen({ port: config.PORT, host: '0.0.0.0' })

  if (isProduction) {
    console.log(`\n  Serveur demarre sur ${config.PUBLIC_URL}`)
    console.log(`  Dashboard  : ${config.PUBLIC_URL}`)
    console.log(`  Overlay OBS: ${config.PUBLIC_URL}/overlay`)
    console.log(`  Auth Twitch: ${config.PUBLIC_URL}/auth/twitch\n`)
  } else {
    console.log(`\n  Serveur demarre sur http://localhost:${config.PORT}`)
    console.log(`  Dashboard  : http://localhost:5173`)
    console.log(`  Overlay OBS: http://localhost:5174`)
    console.log(`  Auth Twitch: http://localhost:${config.PORT}/auth/twitch\n`)
  }

  // --- TWITCH (apres le demarrage du serveur) ---
  await startTwitchBot()
  await startEventSub()
}

main().catch((err) => {
  console.error('Erreur fatale au demarrage:', err)
  process.exit(1)
})
