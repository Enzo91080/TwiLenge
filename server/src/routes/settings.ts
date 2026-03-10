// =============================================================
// ROUTES API : PARAMETRES
// =============================================================
// GET /api/settings      - lire les parametres (sans les secrets)
// PUT /api/settings      - mettre a jour les parametres
// GET /api/status        - statut de l'application
// =============================================================

import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { getAllSettings, getSetting, setSetting, isTwitchConfigured } from '../db/index.js'
import { config } from '../config.js'
import { startTwitchBot, stopTwitchBot } from '../twitch/bot.js'
import { startEventSub, stopEventSub } from '../twitch/eventsub.js'

// Cles sensibles a ne jamais retourner au client
const PRIVATE_KEYS = new Set([
  'twitch_access_token',
  'twitch_refresh_token',
  'twitch_token_expires_at',
  'twitch_client_secret',
])

// Cles Twitch qui, si modifiees, necessitent un redemarrage du bot
const TWITCH_CREDENTIAL_KEYS = new Set([
  'twitch_client_id',
  'twitch_client_secret',
  'twitch_channel',
])

// Routes publiques : /setup et /status (accessibles sans connexion)
export async function publicSettingsRoutes(fastify: FastifyInstance) {
  // POST /api/setup - Configuration initiale (public, uniquement si pas encore configure)
  // Permet de saisir CLIENT_ID, CLIENT_SECRET, CHANNEL sans etre connecte
  fastify.post('/setup', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request, reply) => {
    const alreadyConfigured = await isTwitchConfigured()
    if (alreadyConfigured) {
      return reply.status(403).send({ error: 'Deja configure. Utilisez les Parametres apres connexion.' })
    }

    const schema = z.object({
      clientId: z.string().trim().min(1),
      clientSecret: z.string().trim().min(1),
    })
    const parsed = schema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'clientId et clientSecret sont requis.' })
    }

    await setSetting('twitch_client_id', parsed.data.clientId)
    await setSetting('twitch_client_secret', parsed.data.clientSecret)

    return { success: true }
  })

  // GET /api/status - Statut global de l'application
  fastify.get('/status', async () => {
    const configured = await isTwitchConfigured()
    const twitchChannel = await getSetting('twitch_channel')
    const botEnabled = (await getSetting('bot_enabled')) === 'true'
    const channelPointsEnabled = (await getSetting('channel_points_enabled')) === 'true'

    return {
      twitchConfigured: configured,
      twitchChannel: twitchChannel || null,
      botEnabled,
      channelPointsEnabled,
      port: config.PORT,
      authCallbackUrl: config.AUTH_CALLBACK_URL,
    }
  })
}

// Cles de parametres autorisees en ecriture via PUT /api/settings
const ALLOWED_SETTING_KEYS = new Set([
  'twitch_client_id',
  'twitch_client_secret',
  'twitch_channel',
  'bot_enabled',
  'channel_points_enabled',
  'bot_cmd_defi',
  'bot_cmd_score',
  'bot_cmd_prochains',
  'bot_cmd_vote',
  'bot_cmd_ok',
  'bot_cmd_fail',
  'bot_cmd_skip',
])

// Routes protegees : /settings (necessitent une session dashboard)
export async function settingsRoutes(fastify: FastifyInstance) {
  // GET /api/settings - Retourne tous les parametres (sans les cles sensibles)
  fastify.get('/settings', async () => {
    const all = await getAllSettings()
    return Object.fromEntries(
      Object.entries(all).filter(([key]) => !PRIVATE_KEYS.has(key)),
    )
  })

  // PUT /api/settings - Mettre a jour un ou plusieurs parametres
  fastify.put('/settings', async (request, reply) => {
    const schema = z.record(z.string(), z.string())
    const parsed = schema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Corps invalide.' })
    }

    // Rejeter toute cle non autorisee
    const unknownKeys = Object.keys(parsed.data).filter((k) => !ALLOWED_SETTING_KEYS.has(k))
    if (unknownKeys.length > 0) {
      return reply.status(400).send({ error: `Cles non autorisees : ${unknownKeys.join(', ')}` })
    }

    let twitchCredentialsChanged = false

    for (const [key, value] of Object.entries(parsed.data)) {
      await setSetting(key, value)
      if (TWITCH_CREDENTIAL_KEYS.has(key)) {
        twitchCredentialsChanged = true
      }
    }

    // Si les credentials Twitch ont change, redemarrer le bot et EventSub
    if (twitchCredentialsChanged) {
      stopTwitchBot()
      stopEventSub()
      await startTwitchBot()
      await startEventSub()
    }

    const all = await getAllSettings()
    return Object.fromEntries(
      Object.entries(all).filter(([key]) => !PRIVATE_KEYS.has(key)),
    )
  })
}
