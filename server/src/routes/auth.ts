// =============================================================
// ROUTES : AUTHENTIFICATION TWITCH
// =============================================================
// GET /auth/twitch           - redirige vers Twitch pour autoriser
// GET /auth/callback         - callback apres autorisation Twitch
// GET /auth/status           - verifie si l'app est connectee a Twitch
// POST /auth/logout          - deconnecter Twitch
// =============================================================
// Le token d'acces est stocke dans la base de donnees (table settings)
// cles: "twitch_access_token" et "twitch_refresh_token"
// =============================================================

import type { FastifyInstance } from 'fastify'
import { config, isTwitchConfigured } from '../config.js'
import { getSetting, setSetting } from '../db/index.js'
import { startTwitchBot, stopTwitchBot } from '../twitch/bot.js'
import { startEventSub, stopEventSub } from '../twitch/eventsub.js'

// Scopes Twitch necessaires :
// - chat:read + chat:edit : lire et envoyer des messages dans le chat
// - channel:read:redemptions : lire les rachat de channel points
// - moderator:read:followers : optionnel, pour les followers
const TWITCH_SCOPES = [
  'chat:read',
  'chat:edit',
  'channel:read:redemptions',
].join(' ')

export async function authRoutes(fastify: FastifyInstance) {
  // GET /auth/twitch - Lance le flow OAuth Twitch
  fastify.get('/auth/twitch', async (request, reply) => {
    if (!isTwitchConfigured()) {
      return reply.status(400).send({
        error: 'Twitch n\'est pas configure. Remplis TWITCH_CLIENT_ID et TWITCH_CLIENT_SECRET dans .env',
      })
    }

    const params = new URLSearchParams({
      client_id: config.TWITCH_CLIENT_ID,
      redirect_uri: config.AUTH_CALLBACK_URL,
      response_type: 'code',
      scope: TWITCH_SCOPES,
      // Force la re-autorisation pour eviter les problemes de token
      force_verify: 'true',
    })

    return reply.redirect(`https://id.twitch.tv/oauth2/authorize?${params.toString()}`)
  })

  // GET /auth/callback - Twitch redirige ici apres autorisation
  fastify.get('/auth/callback', async (request, reply) => {
    const { code, error } = request.query as { code?: string; error?: string }

    if (error) {
      return reply.redirect(`${config.WEB_URL}/settings?auth=error&reason=${error}`)
    }

    if (!code) {
      return reply.redirect(`${config.WEB_URL}/settings?auth=error&reason=no_code`)
    }

    try {
      // Echanger le code contre un access token
      const tokenResponse = await fetch('https://id.twitch.tv/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: config.TWITCH_CLIENT_ID,
          client_secret: config.TWITCH_CLIENT_SECRET,
          code,
          grant_type: 'authorization_code',
          redirect_uri: config.AUTH_CALLBACK_URL,
        }),
      })

      const tokens = await tokenResponse.json() as {
        access_token: string
        refresh_token: string
        expires_in: number
      }

      if (!tokens.access_token) {
        throw new Error('Pas de token dans la reponse Twitch')
      }

      // Sauvegarder les tokens en BDD
      setSetting('twitch_access_token', tokens.access_token)
      setSetting('twitch_refresh_token', tokens.refresh_token)
      setSetting('twitch_token_expires_at', String(Date.now() + tokens.expires_in * 1000))

      // Redemarrer le bot et EventSub avec les nouveaux tokens
      stopTwitchBot()
      stopEventSub()
      startTwitchBot()
      startEventSub()

      return reply.redirect(`${config.WEB_URL}/settings?auth=success`)
    } catch (err) {
      console.error('[Auth] Erreur lors de l\'echange de token:', err)
      return reply.redirect(`${config.WEB_URL}/settings?auth=error&reason=token_exchange`)
    }
  })

  // GET /auth/status - Verifie si le token est present et valide
  fastify.get('/auth/status', async () => {
    const token = getSetting('twitch_access_token')
    const expiresAt = getSetting('twitch_token_expires_at')

    if (!token) return { connected: false, reason: 'no_token' }
    if (expiresAt && Date.now() > parseInt(expiresAt)) return { connected: false, reason: 'expired' }

    return {
      connected: true,
      channel: config.TWITCH_CHANNEL,
    }
  })

  // POST /auth/logout - Supprimer les tokens Twitch
  fastify.post('/auth/logout', async () => {
    setSetting('twitch_access_token', '')
    setSetting('twitch_refresh_token', '')
    setSetting('twitch_token_expires_at', '')
    stopTwitchBot()
    stopEventSub()
    return { success: true }
  })
}
