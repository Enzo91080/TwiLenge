// =============================================================
// ROUTES API : PARAMETRES
// =============================================================
// GET /api/settings      - lire les parametres (sans les secrets)
// PUT /api/settings      - mettre a jour les parametres
// GET /api/status        - statut de l'application
// =============================================================

import type { FastifyInstance } from 'fastify'
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

export async function settingsRoutes(fastify: FastifyInstance) {
  // POST /api/setup - Configuration initiale (public, uniquement si pas encore configure)
  // Permet de saisir CLIENT_ID, CLIENT_SECRET, CHANNEL sans etre connecte
  fastify.post('/setup', async (request, reply) => {
    const alreadyConfigured = await isTwitchConfigured()
    if (alreadyConfigured) {
      return reply.status(403).send({ error: 'Deja configure. Utilisez les Parametres apres connexion.' })
    }

    const { clientId, clientSecret } = request.body as {
      clientId?: string; clientSecret?: string
    }

    if (!clientId || !clientSecret) {
      return reply.status(400).send({ error: 'clientId et clientSecret sont requis.' })
    }

    await setSetting('twitch_client_id', clientId.trim())
    await setSetting('twitch_client_secret', clientSecret.trim())

    return { success: true }
  })

  // GET /api/settings - Retourne tous les parametres (sans les cles sensibles)
  fastify.get('/settings', async () => {
    const all = await getAllSettings()
    return Object.fromEntries(
      Object.entries(all).filter(([key]) => !PRIVATE_KEYS.has(key)),
    )
  })

  // PUT /api/settings - Mettre a jour un ou plusieurs parametres
  fastify.put('/settings', async (request) => {
    const body = request.body as Record<string, string>
    let twitchCredentialsChanged = false

    for (const [key, value] of Object.entries(body)) {
      await setSetting(key, String(value))
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
