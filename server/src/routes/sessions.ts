// =============================================================
// ROUTES API : GESTION DES SESSIONS — MULTI-TENANT
// =============================================================

import type { FastifyInstance } from 'fastify'
import {
  createSession,
  endSession,
  getAllSessions,
  getSessionById,
  getSessionChallenges,
  getAllChallenges,
  addChallengeToSession,
  updateSessionChallengeStatus,
} from '../db/index.js'
import { getState, resetState, startTimer, stopTimer } from '../state.js'
import { broadcast, broadcastState, getFullState } from '../ws/manager.js'

export async function sessionRoutes(fastify: FastifyInstance) {
  // GET /api/session
  fastify.get('/session', async (request) => {
    const streamerId = (request as any).twitchLogin as string
    return getFullState(streamerId)
  })

  // POST /api/session/start
  fastify.post('/session/start', async (request, reply) => {
    const streamerId = (request as any).twitchLogin as string
    const s = getState(streamerId)
    if (s.session) return reply.status(400).send({ error: 'Une session est deja en cours.' })

    const session = await createSession(streamerId)
    s.session = session

    const challenges = await getAllChallenges(streamerId)
    const sessionChallenges = await Promise.all(
      challenges.map((c) => addChallengeToSession(streamerId, session.id, c.id)),
    )

    s.pendingChallenges = sessionChallenges
    s.completedCount = 0
    s.failedCount = 0
    s.skippedCount = 0
    s.votes = {}

    broadcast(streamerId, { type: 'SESSION_STARTED', data: session })
    broadcastState(streamerId)

    return getFullState(streamerId)
  })

  // POST /api/session/end
  fastify.post('/session/end', async (request, reply) => {
    const streamerId = (request as any).twitchLogin as string
    const s = getState(streamerId)
    if (!s.session) return reply.status(400).send({ error: 'Aucune session en cours.' })

    if (s.activeChallenge) {
      await updateSessionChallengeStatus(streamerId, s.activeChallenge.id, 'skipped')
    }

    stopTimer(streamerId)
    const ended = await endSession(streamerId, s.session.id)

    broadcast(streamerId, { type: 'SESSION_ENDED', data: ended! })
    resetState(streamerId)
    broadcastState(streamerId)

    return { success: true, session: ended }
  })

  // POST /api/session/activate/:id
  fastify.post('/session/activate/:id', async (request, reply) => {
    const streamerId = (request as any).twitchLogin as string
    const s = getState(streamerId)
    if (!s.session) return reply.status(400).send({ error: 'Aucune session en cours.' })

    const { id } = request.params as { id: string }
    const scId = parseInt(id)
    if (isNaN(scId)) return reply.status(400).send({ error: 'ID invalide' })

    if (s.activeChallenge) {
      await updateSessionChallengeStatus(streamerId, s.activeChallenge.id, 'skipped')
      s.skippedCount++
    }

    stopTimer(streamerId)
    s.timerSecondsLeft = null

    const activated = await updateSessionChallengeStatus(streamerId, scId, 'active')
    if (!activated) return reply.status(404).send({ error: 'Defi introuvable dans cette session.' })

    s.activeChallenge = activated
    s.pendingChallenges = s.pendingChallenges.filter((sc) => sc.id !== scId)
    s.votes = {}

    broadcast(streamerId, { type: 'CHALLENGE_ACTIVATED', data: activated })
    broadcastState(streamerId)

    if (activated.challenge.timerSeconds) {
      startTimerForChallenge(streamerId, activated.challenge.timerSeconds)
    }

    return getFullState(streamerId)
  })

  // POST /api/session/complete
  fastify.post('/session/complete', async (request, reply) => {
    const streamerId = (request as any).twitchLogin as string
    const s = getState(streamerId)
    if (!s.activeChallenge) return reply.status(400).send({ error: 'Aucun defi actif.' })

    stopTimer(streamerId)
    s.timerSecondsLeft = null

    const completed = (await updateSessionChallengeStatus(streamerId, s.activeChallenge.id, 'completed'))!
    s.completedCount++
    s.activeChallenge = null

    broadcast(streamerId, { type: 'CHALLENGE_COMPLETED', data: completed })
    broadcastState(streamerId)

    return getFullState(streamerId)
  })

  // POST /api/session/fail
  fastify.post('/session/fail', async (request, reply) => {
    const streamerId = (request as any).twitchLogin as string
    const s = getState(streamerId)
    if (!s.activeChallenge) return reply.status(400).send({ error: 'Aucun defi actif.' })

    stopTimer(streamerId)
    s.timerSecondsLeft = null

    const failed = (await updateSessionChallengeStatus(streamerId, s.activeChallenge.id, 'failed'))!
    s.failedCount++
    s.activeChallenge = null

    broadcast(streamerId, { type: 'CHALLENGE_FAILED', data: failed })
    broadcastState(streamerId)

    return getFullState(streamerId)
  })

  // POST /api/session/skip
  fastify.post('/session/skip', async (request, reply) => {
    const streamerId = (request as any).twitchLogin as string
    const s = getState(streamerId)
    if (!s.activeChallenge) return reply.status(400).send({ error: 'Aucun defi actif.' })

    stopTimer(streamerId)
    s.timerSecondsLeft = null

    const skipped = (await updateSessionChallengeStatus(streamerId, s.activeChallenge.id, 'skipped'))!
    s.skippedCount++
    s.activeChallenge = null

    broadcast(streamerId, { type: 'CHALLENGE_SKIPPED', data: skipped })
    broadcastState(streamerId)

    return getFullState(streamerId)
  })

  // POST /api/session/spin
  fastify.post('/session/spin', async (request, reply) => {
    const streamerId = (request as any).twitchLogin as string
    const s = getState(streamerId)
    if (!s.session) return reply.status(400).send({ error: 'Aucune session en cours.' })

    const pending = s.pendingChallenges.filter((sc) => sc.status === 'pending')
    if (pending.length === 0) return reply.status(400).send({ error: 'Plus aucun defi en attente.' })

    const random = pending[Math.floor(Math.random() * pending.length)]

    if (s.activeChallenge) {
      await updateSessionChallengeStatus(streamerId, s.activeChallenge.id, 'skipped')
      s.skippedCount++
    }

    stopTimer(streamerId)
    s.timerSecondsLeft = null

    const activated = await updateSessionChallengeStatus(streamerId, random.id, 'active')
    if (!activated) return reply.status(404).send({ error: 'Defi introuvable.' })

    s.activeChallenge = activated
    s.pendingChallenges = s.pendingChallenges.filter((sc) => sc.id !== random.id)
    s.votes = {}

    broadcast(streamerId, { type: 'WHEEL_SPUN', data: activated })
    broadcastState(streamerId)

    if (activated.challenge.timerSeconds) {
      startTimerForChallenge(streamerId, activated.challenge.timerSeconds)
    }

    return getFullState(streamerId)
  })

  // POST /api/session/timer/start
  fastify.post('/session/timer/start', async (request, reply) => {
    const streamerId = (request as any).twitchLogin as string
    const s = getState(streamerId)
    if (!s.activeChallenge) return reply.status(400).send({ error: 'Aucun defi actif.' })
    const seconds = s.activeChallenge.challenge.timerSeconds
    if (!seconds) return reply.status(400).send({ error: "Ce defi n'a pas de timer configure." })
    startTimerForChallenge(streamerId, seconds)
    return { success: true, secondsLeft: seconds }
  })

  // POST /api/session/timer/stop
  fastify.post('/session/timer/stop', async (request) => {
    const streamerId = (request as any).twitchLogin as string
    const s = getState(streamerId)
    stopTimer(streamerId)
    s.timerSecondsLeft = null
    broadcast(streamerId, { type: 'TIMER_STOPPED', data: null })
    return { success: true }
  })

  // GET /api/history
  fastify.get('/history', async (request) => {
    const streamerId = (request as any).twitchLogin as string
    const sessions = await getAllSessions(streamerId)
    return Promise.all(
      sessions.map(async (s) => ({ ...s, challenges: await getSessionChallenges(streamerId, s.id) })),
    )
  })

  // GET /api/history/:id
  fastify.get('/history/:id', async (request, reply) => {
    const streamerId = (request as any).twitchLogin as string
    const { id } = request.params as { id: string }
    const numId = parseInt(id)
    if (isNaN(numId)) return reply.status(400).send({ error: 'ID invalide' })
    const session = await getSessionById(streamerId, numId)
    if (!session) return reply.status(404).send({ error: 'Session introuvable' })
    return { ...session, challenges: await getSessionChallenges(streamerId, session.id) }
  })
}

// --- HELPER : timer avec TIMER_TICK broadcast ---
function startTimerForChallenge(streamerId: string, seconds: number): void {
  const s = getState(streamerId)
  stopTimer(streamerId)
  s.timerSecondsLeft = seconds

  s.timerInterval = setInterval(() => {
    if (s.timerSecondsLeft === null) return
    s.timerSecondsLeft--
    broadcast(streamerId, { type: 'TIMER_TICK', data: { secondsLeft: s.timerSecondsLeft } })
    if (s.timerSecondsLeft <= 0) {
      stopTimer(streamerId)
      s.timerSecondsLeft = null
      broadcast(streamerId, { type: 'TIMER_EXPIRED', data: null })
    }
  }, 1000)
}
