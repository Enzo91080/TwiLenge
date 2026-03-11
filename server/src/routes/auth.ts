// =============================================================
// ROUTES : AUTHENTIFICATION — MULTI-TENANT
// =============================================================
// GET  /auth/dashboard      - redirige vers Twitch OAuth
// GET  /auth/session        - statut session dashboard (public)
// POST /auth/session/logout - deconnexion dashboard
// GET  /auth/callback       - callback OAuth Twitch
// GET  /auth/status         - statut Twitch du streamer connecte
// POST /auth/logout         - deconnecter le bot Twitch
// =============================================================

import type { FastifyInstance } from 'fastify'
import { config } from '../config.js'
import {
  getSetting, setSetting,
  createAuthSession, getAuthSession, deleteAuthSession,
  seedStreamerDefaults,
} from '../db/index.js'
import { startTwitchBot, stopTwitchBot } from '../twitch/bot.js'
import { startEventSub, stopEventSub } from '../twitch/eventsub.js'
import { requireAuth } from '../middleware/auth.js'

const isProduction = process.env.NODE_ENV === 'production'

const COOKIE_OPTIONS = {
  path: '/',
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: isProduction,
  maxAge: 7 * 24 * 60 * 60,
}

// Un seul flow OAuth : login dashboard + tokens bot en meme temps
const ALL_SCOPES = ['chat:read', 'chat:edit', 'channel:read:redemptions'].join(' ')

export async function authRoutes(fastify: FastifyInstance) {

  // GET /auth/dashboard - Lance le flow OAuth
  fastify.get('/auth/dashboard', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request, reply) => {
    if (!config.TWITCH_CLIENT_ID) {
      return reply.status(500).send({ error: 'TWITCH_CLIENT_ID manquant dans .env' })
    }

    const params = new URLSearchParams({
      client_id: config.TWITCH_CLIENT_ID,
      redirect_uri: config.AUTH_CALLBACK_URL,
      response_type: 'code',
      scope: ALL_SCOPES,
      state: 'dashboard',
      force_verify: 'true',
    })

    return reply.redirect(`https://id.twitch.tv/oauth2/authorize?${params.toString()}`)
  })

  // GET /auth/session - Verifie la session dashboard (public)
  fastify.get('/auth/session', async (request, reply) => {
    const token = (request.cookies as Record<string, string>)?.session_token
    if (!token) return { authenticated: false }

    const session = await getAuthSession(token)
    if (!session) {
      reply.clearCookie('session_token', { path: '/' })
      return { authenticated: false }
    }

    return { authenticated: true, login: session.login }
  })

  // POST /auth/session/logout - Deconnexion dashboard
  fastify.post('/auth/session/logout', async (request, reply) => {
    const token = (request.cookies as Record<string, string>)?.session_token
    if (token) await deleteAuthSession(token)
    reply.clearCookie('session_token', { path: '/' })
    return { success: true }
  })

  // GET /auth/callback - Twitch redirige ici apres autorisation
  fastify.get('/auth/callback', async (request, reply) => {
    const { code, error } = request.query as {
      code?: string; error?: string; state?: string
    }

    if (error || !code) {
      return reply.redirect(`${config.WEB_URL}/?auth=error&reason=${error ?? 'no_code'}`)
    }

    if (!config.TWITCH_CLIENT_ID || !config.TWITCH_CLIENT_SECRET) {
      return reply.redirect(`${config.WEB_URL}/?auth=error&reason=no_credentials`)
    }

    try {
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
        access_token: string; refresh_token: string; expires_in: number
      }

      if (!tokens.access_token) {
        console.error('[Auth] Reponse Twitch:', JSON.stringify(tokens))
        throw new Error('Pas de token dans la reponse Twitch')
      }

      // Recuperer les infos du compte Twitch
      const userResponse = await fetch('https://api.twitch.tv/helix/users', {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Client-Id': config.TWITCH_CLIENT_ID,
        },
      })
      const userData = await userResponse.json() as {
        data: Array<{ display_name: string; login: string; profile_image_url: string }>
      }
      const twitchUser = userData.data?.[0]
      if (!twitchUser) throw new Error('Impossible de recuperer les infos Twitch')

      const streamerId = twitchUser.login.toLowerCase()

      // Seed des defaults au premier login
      await seedStreamerDefaults(streamerId)

      // Sauvegarder les tokens et infos du streamer
      await setSetting(streamerId, 'twitch_access_token', tokens.access_token)
      await setSetting(streamerId, 'twitch_refresh_token', tokens.refresh_token)
      await setSetting(streamerId, 'twitch_token_expires_at', String(Date.now() + tokens.expires_in * 1000))
      await setSetting(streamerId, 'twitch_display_name', twitchUser.display_name)
      await setSetting(streamerId, 'twitch_login', twitchUser.login)
      await setSetting(streamerId, 'twitch_profile_image_url', twitchUser.profile_image_url)
      await setSetting(streamerId, 'twitch_channel', streamerId)

      // Creer la session dashboard
      const sessionToken = await createAuthSession(streamerId)
      reply.setCookie('session_token', sessionToken, COOKIE_OPTIONS)

      // Demarrer bot et EventSub pour ce streamer
      stopTwitchBot(streamerId)
      stopEventSub(streamerId)
      await startTwitchBot(streamerId)
      await startEventSub(streamerId)

      return reply.redirect(`${config.WEB_URL}/settings`)

    } catch (err) {
      console.error('[Auth] Erreur callback:', err)
      return reply.redirect(`${config.WEB_URL}/?auth=error&reason=token_exchange`)
    }
  })

  // GET /auth/status - Statut Twitch du streamer connecte (protege)
  fastify.get('/auth/status', { preHandler: requireAuth }, async (request) => {
    const streamerId = (request as any).twitchLogin as string
    const token = await getSetting(streamerId, 'twitch_access_token')
    const expiresAt = await getSetting(streamerId, 'twitch_token_expires_at')

    if (!token) return { connected: false, reason: 'no_token' }
    const expiresAtMs = expiresAt ? parseInt(expiresAt) : NaN
    if (!isNaN(expiresAtMs) && Date.now() > expiresAtMs) return { connected: false, reason: 'expired' }

    return {
      connected: true,
      channel: await getSetting(streamerId, 'twitch_channel'),
      login: await getSetting(streamerId, 'twitch_login'),
      profileImageUrl: await getSetting(streamerId, 'twitch_profile_image_url') || null,
    }
  })

  // POST /auth/logout - Deconnecter le bot du streamer (protege)
  fastify.post('/auth/logout', { preHandler: requireAuth }, async (request) => {
    const streamerId = (request as any).twitchLogin as string
    await setSetting(streamerId, 'twitch_access_token', '')
    await setSetting(streamerId, 'twitch_refresh_token', '')
    await setSetting(streamerId, 'twitch_token_expires_at', '')
    stopTwitchBot(streamerId)
    stopEventSub(streamerId)
    return { success: true }
  })
}
