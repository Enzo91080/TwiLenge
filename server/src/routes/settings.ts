// =============================================================
// ROUTES API : PARAMETRES
// =============================================================
// GET /api/settings      - lire tous les parametres
// PUT /api/settings      - mettre a jour les parametres
// GET /api/status        - statut de l'application (Twitch, etc.)
// =============================================================

import type { FastifyInstance } from 'fastify'
import { getAllSettings, setSetting } from '../db/index.js'
import { config, isTwitchConfigured } from '../config.js'

export async function settingsRoutes(fastify: FastifyInstance) {
  // GET /api/settings - Retourne tous les parametres de la BDD
  fastify.get('/settings', async () => {
    return getAllSettings()
  })

  // PUT /api/settings - Mettre a jour un ou plusieurs parametres
  // Body: { "overlay_position": "top-right", "overlay_theme": "dark" }
  fastify.put('/settings', async (request) => {
    const body = request.body as Record<string, string>
    for (const [key, value] of Object.entries(body)) {
      setSetting(key, String(value))
    }
    return getAllSettings()
  })

  // GET /api/status - Statut global de l'application
  // Utilise par le dashboard pour afficher les alertes de configuration
  fastify.get('/status', async () => {
    return {
      twitchConfigured: isTwitchConfigured(),
      twitchChannel: config.TWITCH_CHANNEL || null,
      botEnabled: config.BOT_ENABLED,
      channelPointsEnabled: config.CHANNEL_POINTS_ENABLED,
      port: config.PORT,
      // Expose l'URL de callback Twitch pour faciliter la configuration
      authCallbackUrl: config.AUTH_CALLBACK_URL,
    }
  })
}
