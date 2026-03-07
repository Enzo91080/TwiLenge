// =============================================================
// ROUTES : AUTHENTIFICATION
// =============================================================
// --- Dashboard (session cookie) ---
// GET  /auth/dashboard          - redirige vers Twitch pour login dashboard
// GET  /auth/session            - statut de la session dashboard (public)
// POST /auth/session/logout     - deconnexion dashboard
//
// --- Bot Twitch (tokens OAuth) ---
// GET  /auth/twitch             - redirige vers Twitch pour autoriser le bot
// GET  /auth/callback           - callback commun (state=dashboard|bot)
// GET  /auth/status             - statut de connexion du bot
// POST /auth/logout             - deconnecter le bot
// =============================================================

import type { FastifyInstance } from 'fastify'
import { config } from '../config.js'
import {
  getSetting, setSetting, isTwitchConfigured,
  createAuthSession, getAuthSession, deleteAuthSession,
} from '../db/index.js'
import { startTwitchBot, stopTwitchBot } from '../twitch/bot.js'
import { startEventSub, stopEventSub } from '../twitch/eventsub.js'

const isProduction = process.env.NODE_ENV === 'production'

const COOKIE_OPTIONS = {
  path: '/',
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: isProduction,
  maxAge: 7 * 24 * 60 * 60, // 7 jours en secondes
}

// Scopes dashboard + bot : tout en une seule connexion
const DASHBOARD_SCOPES = ['user:read:email', 'chat:read', 'chat:edit', 'channel:read:redemptions'].join(' ')

// Scopes pour le bot seul (reconnexion depuis Settings si tokens expires)
const BOT_SCOPES = ['chat:read', 'chat:edit', 'channel:read:redemptions'].join(' ')

export async function authRoutes(fastify: FastifyInstance) {

  // ============================================================
  // DASHBOARD AUTH
  // ============================================================

  // GET /auth/dashboard - Lance le flow OAuth pour le login du dashboard
  fastify.get('/auth/dashboard', async (request, reply) => {
    if (!await isTwitchConfigured()) {
      return reply.redirect(`${config.WEB_URL}/?setup=true`)
    }

    const clientId = (await getSetting('twitch_client_id'))!
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: config.AUTH_CALLBACK_URL,
      response_type: 'code',
      scope: DASHBOARD_SCOPES,
      state: 'dashboard',
      force_verify: 'true',
    })

    return reply.redirect(`https://id.twitch.tv/oauth2/authorize?${params.toString()}`)
  })

  // GET /auth/session - Verifie si l'utilisateur a une session dashboard active (public)
  fastify.get('/auth/session', async (request, reply) => {
    const token = (request.cookies as Record<string, string>)?.session_token
    if (!token) return { authenticated: false }

    const session = await getAuthSession(token)
    if (!session) {
      reply.clearCookie('session_token', { path: '/' })
      return { authenticated: false }
    }

    const configured = await isTwitchConfigured()
    return { authenticated: true, login: session.login, twitchConfigured: configured }
  })

  // POST /auth/session/logout - Deconnexion dashboard
  fastify.post('/auth/session/logout', async (request, reply) => {
    const token = (request.cookies as Record<string, string>)?.session_token
    if (token) await deleteAuthSession(token)
    reply.clearCookie('session_token', { path: '/' })
    return { success: true }
  })

  // ============================================================
  // CALLBACK COMMUN (dashboard + bot)
  // ============================================================

  // GET /auth/callback - Twitch redirige ici apres autorisation
  fastify.get('/auth/callback', async (request, reply) => {
    const { code, error, state } = request.query as {
      code?: string; error?: string; state?: string
    }

    if (error || !code) {
      const reason = error ?? 'no_code'
      if (state === 'dashboard') {
        return reply.redirect(`${config.WEB_URL}/?auth=error&reason=${reason}`)
      }
      return reply.redirect(`${config.WEB_URL}/settings?auth=error&reason=${reason}`)
    }

    const clientId = await getSetting('twitch_client_id')
    const clientSecret = await getSetting('twitch_client_secret')

    if (!clientId || !clientSecret) {
      return reply.redirect(`${config.WEB_URL}/?auth=error&reason=no_credentials`)
    }

    try {
      const scope = state === 'dashboard' ? DASHBOARD_SCOPES : BOT_SCOPES

      const tokenResponse = await fetch('https://id.twitch.tv/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: config.AUTH_CALLBACK_URL,
        }),
      })

      const tokens = await tokenResponse.json() as {
        access_token: string; refresh_token: string; expires_in: number
      }

      if (!tokens.access_token) throw new Error('Pas de token dans la reponse Twitch')

      // Recuperer les infos du compte Twitch
      const userResponse = await fetch('https://api.twitch.tv/helix/users', {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Client-Id': clientId,
        },
      })
      const userData = await userResponse.json() as {
        data: Array<{ display_name: string; login: string; profile_image_url: string }>
      }
      const twitchUser = userData.data?.[0]
      if (!twitchUser) throw new Error('Impossible de recuperer les infos Twitch')

      // Sauvegarder les tokens bot (commun aux deux flows)
      await setSetting('twitch_access_token', tokens.access_token)
      await setSetting('twitch_refresh_token', tokens.refresh_token)
      await setSetting('twitch_token_expires_at', String(Date.now() + tokens.expires_in * 1000))
      await setSetting('twitch_display_name', twitchUser.display_name)
      await setSetting('twitch_login', twitchUser.login)
      await setSetting('twitch_profile_image_url', twitchUser.profile_image_url)

      // Demarrer le bot avec les nouveaux tokens
      stopTwitchBot()
      stopEventSub()
      startTwitchBot()
      startEventSub()

      // ---- FLOW DASHBOARD : creer la session + rediriger vers Settings ----
      if (state === 'dashboard') {
        // Enregistrer le channel de ce streamer (ecrase le precedent si changement de compte)
        await setSetting('twitch_channel', twitchUser.login.toLowerCase())

        const sessionToken = await createAuthSession(twitchUser.login)
        reply.setCookie('session_token', sessionToken, COOKIE_OPTIONS)
        return reply.redirect(`${config.WEB_URL}/settings`)
      }

      // ---- FLOW BOT SEUL (reconnexion depuis Settings) ----
      return reply.redirect(`${config.WEB_URL}/settings?auth=success`)

    } catch (err) {
      console.error("[Auth] Erreur callback:", err)
      const redirect = state === 'dashboard' ? `${config.WEB_URL}/` : `${config.WEB_URL}/settings`
      return reply.redirect(`${redirect}?auth=error&reason=token_exchange`)
    }
  })

  // ============================================================
  // BOT TWITCH AUTH (inchange, accessible aux utilisateurs authentifies)
  // ============================================================

  // GET /auth/twitch - Lance le flow OAuth pour le bot
  fastify.get('/auth/twitch', async (request, reply) => {
    if (!await isTwitchConfigured()) {
      return reply.status(400).send({
        error: 'Twitch non configure. Remplis la configuration dans les Parametres.',
      })
    }

    const clientId = (await getSetting('twitch_client_id'))!
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: config.AUTH_CALLBACK_URL,
      response_type: 'code',
      scope: BOT_SCOPES,
      state: 'bot',
      force_verify: 'true',
    })

    return reply.redirect(`https://id.twitch.tv/oauth2/authorize?${params.toString()}`)
  })

  // GET /auth/status - Statut de connexion du bot (utilise dans Settings)
  fastify.get('/auth/status', async () => {
    const token = await getSetting('twitch_access_token')
    const expiresAt = await getSetting('twitch_token_expires_at')

    if (!token) return { connected: false, reason: 'no_token' }
    if (expiresAt && Date.now() > parseInt(expiresAt)) return { connected: false, reason: 'expired' }

    const channel = await getSetting('twitch_channel')
    return {
      connected: true,
      channel: await getSetting('twitch_display_name') || await getSetting('twitch_login') || channel,
      login: await getSetting('twitch_login') || channel,
      profileImageUrl: await getSetting('twitch_profile_image_url') || null,
    }
  })

  // POST /auth/logout - Deconnecter le bot
  fastify.post('/auth/logout', async () => {
    await setSetting('twitch_access_token', '')
    await setSetting('twitch_refresh_token', '')
    await setSetting('twitch_token_expires_at', '')
    stopTwitchBot()
    stopEventSub()
    return { success: true }
  })
}
