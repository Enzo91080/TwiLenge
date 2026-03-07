// =============================================================
// MIDDLEWARE D'AUTHENTIFICATION
// =============================================================
// Verifie le cookie de session Twitch sur les routes proteges.
// Renvoie 401 si la session est absente ou expiree.
// =============================================================

import type { FastifyRequest, FastifyReply } from 'fastify'
import { getAuthSession } from '../db/index.js'

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const token = (request.cookies as Record<string, string>)?.session_token
  if (!token) {
    return reply.status(401).send({ error: 'Non authentifie', code: 'NO_SESSION' })
  }

  const session = await getAuthSession(token)
  if (!session) {
    reply.clearCookie('session_token', { path: '/' })
    return reply.status(401).send({ error: 'Session expiree', code: 'SESSION_EXPIRED' })
  }

  // Attacher le login au request pour usage eventuel dans les routes
  ;(request as any).twitchLogin = session.login
}
