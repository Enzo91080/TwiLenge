// =============================================================
// ROUTES API : PARAMETRES — MULTI-TENANT
// =============================================================
// GET /api/settings  - lire les parametres du streamer connecte
// PUT /api/settings  - mettre a jour les parametres
// GET /api/status    - statut de l'application (public)
// =============================================================

import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { getAllSettings, getSetting, setSetting } from '../db/index.js'
import { config } from '../config.js'
import { startTwitchBot, stopTwitchBot } from '../twitch/bot.js'
import { startEventSub, stopEventSub } from '../twitch/eventsub.js'

const PRIVATE_KEYS = new Set([
  'twitch_access_token',
  'twitch_refresh_token',
  'twitch_token_expires_at',
])


const ALLOWED_SETTING_KEYS = new Set([
  'twitch_channel',
  'bot_enabled',
  'channel_points_enabled',
  'channel_points_reward_name',
  'bot_cmd_defi',
  'bot_cmd_score',
  'bot_cmd_prochains',
  'bot_cmd_vote',
  'bot_cmd_ok',
  'bot_cmd_fail',
  'bot_cmd_skip',
])

// Route publique : statut app-level
export async function publicSettingsRoutes(fastify: FastifyInstance) {
  fastify.get('/status', async () => {
    return {
      appConfigured: !!(config.TWITCH_CLIENT_ID && config.TWITCH_CLIENT_SECRET),
      authCallbackUrl: config.AUTH_CALLBACK_URL,
    }
  })
}

// Routes protegees : settings par streamer
export async function settingsRoutes(fastify: FastifyInstance) {
  // GET /api/settings
  fastify.get('/settings', async (request) => {
    const streamerId = (request as any).twitchLogin as string
    const all = await getAllSettings(streamerId)
    return Object.fromEntries(
      Object.entries(all).filter(([key]) => !PRIVATE_KEYS.has(key)),
    )
  })

  // PUT /api/settings
  fastify.put('/settings', async (request, reply) => {
    const streamerId = (request as any).twitchLogin as string
    const schema = z.record(z.string(), z.string())
    const parsed = schema.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send({ error: 'Corps invalide.' })

    const unknownKeys = Object.keys(parsed.data).filter((k) => !ALLOWED_SETTING_KEYS.has(k))
    if (unknownKeys.length > 0) {
      return reply.status(400).send({ error: `Cles non autorisees : ${unknownKeys.join(', ')}` })
    }

    const BOT_RESTART_KEYS = new Set(['twitch_channel', 'bot_enabled', 'channel_points_enabled'])
    let needsRestart = false
    for (const [key, value] of Object.entries(parsed.data)) {
      await setSetting(streamerId, key, value)
      if (BOT_RESTART_KEYS.has(key)) needsRestart = true
    }

    if (needsRestart) {
      stopTwitchBot(streamerId)
      stopEventSub(streamerId)
      await startTwitchBot(streamerId)
      await startEventSub(streamerId)
    }

    const all = await getAllSettings(streamerId)
    return Object.fromEntries(
      Object.entries(all).filter(([key]) => !PRIVATE_KEYS.has(key)),
    )
  })

  // GET /api/status/streamer - statut Twitch du streamer connecte
  fastify.get('/status/streamer', async (request) => {
    const streamerId = (request as any).twitchLogin as string
    const twitchChannel = await getSetting(streamerId, 'twitch_channel')
    const botEnabled = (await getSetting(streamerId, 'bot_enabled')) === 'true'
    const channelPointsEnabled = (await getSetting(streamerId, 'channel_points_enabled')) === 'true'
    const accessToken = await getSetting(streamerId, 'twitch_access_token')

    return {
      twitchConnected: !!accessToken,
      twitchChannel: twitchChannel || null,
      botEnabled,
      channelPointsEnabled,
    }
  })
}
