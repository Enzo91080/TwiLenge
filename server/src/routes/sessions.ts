// =============================================================
// ROUTES API : GESTION DES SESSIONS
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
  getSessionChallengeById,
} from '../db/index.js'
import { state, resetState, startTimer, stopTimer } from '../state.js'
import { broadcast, broadcastState, getFullState } from '../ws/manager.js'

export async function sessionRoutes(fastify: FastifyInstance) {
  // GET /api/session
  fastify.get('/session', async () => {
    return getFullState()
  })

  // POST /api/session/start
  fastify.post('/session/start', async (request, reply) => {
    if (state.session) {
      return reply.status(400).send({ error: 'Une session est deja en cours.' })
    }

    const session = await createSession()
    state.session = session

    const challenges = await getAllChallenges()
    const sessionChallenges = await Promise.all(
      challenges.map((c) => addChallengeToSession(session.id, c.id)),
    )

    state.pendingChallenges = sessionChallenges
    state.completedCount = 0
    state.failedCount = 0
    state.skippedCount = 0
    state.votes = {}

    broadcast({ type: 'SESSION_STARTED', data: session })
    broadcastState()

    return getFullState()
  })

  // POST /api/session/end
  fastify.post('/session/end', async (request, reply) => {
    if (!state.session) {
      return reply.status(400).send({ error: 'Aucune session en cours.' })
    }

    if (state.activeChallenge) {
      await updateSessionChallengeStatus(state.activeChallenge.id, 'skipped')
    }

    stopTimer()
    const ended = await endSession(state.session.id)

    broadcast({ type: 'SESSION_ENDED', data: ended! })
    resetState()
    broadcastState()

    return { success: true, session: ended }
  })

  // POST /api/session/activate/:id
  fastify.post('/session/activate/:id', async (request, reply) => {
    if (!state.session) {
      return reply.status(400).send({ error: 'Aucune session en cours.' })
    }

    const { id } = request.params as { id: string }
    const scId = parseInt(id)

    if (state.activeChallenge) {
      await updateSessionChallengeStatus(state.activeChallenge.id, 'skipped')
      state.skippedCount++
    }

    stopTimer()
    state.timerSecondsLeft = null

    const activated = await updateSessionChallengeStatus(scId, 'active')
    if (!activated) return reply.status(404).send({ error: 'Defi introuvable dans cette session.' })

    state.activeChallenge = activated
    state.pendingChallenges = state.pendingChallenges.filter((sc) => sc.id !== scId)
    state.votes = {}

    broadcast({ type: 'CHALLENGE_ACTIVATED', data: activated })
    broadcastState()

    if (activated.challenge.timerSeconds) {
      startTimerForChallenge(activated.challenge.timerSeconds)
    }

    return getFullState()
  })

  // POST /api/session/complete
  fastify.post('/session/complete', async (request, reply) => {
    if (!state.activeChallenge) {
      return reply.status(400).send({ error: 'Aucun defi actif.' })
    }

    stopTimer()
    state.timerSecondsLeft = null

    const completed = (await updateSessionChallengeStatus(state.activeChallenge.id, 'completed'))!
    state.completedCount++
    state.activeChallenge = null

    broadcast({ type: 'CHALLENGE_COMPLETED', data: completed })
    broadcastState()

    return getFullState()
  })

  // POST /api/session/fail
  fastify.post('/session/fail', async (request, reply) => {
    if (!state.activeChallenge) {
      return reply.status(400).send({ error: 'Aucun defi actif.' })
    }

    stopTimer()
    state.timerSecondsLeft = null

    const failed = (await updateSessionChallengeStatus(state.activeChallenge.id, 'failed'))!
    state.failedCount++
    state.activeChallenge = null

    broadcast({ type: 'CHALLENGE_FAILED', data: failed })
    broadcastState()

    return getFullState()
  })

  // POST /api/session/skip
  fastify.post('/session/skip', async (request, reply) => {
    if (!state.activeChallenge) {
      return reply.status(400).send({ error: 'Aucun defi actif.' })
    }

    stopTimer()
    state.timerSecondsLeft = null

    const skipped = (await updateSessionChallengeStatus(state.activeChallenge.id, 'skipped'))!
    state.skippedCount++
    state.activeChallenge = null

    broadcast({ type: 'CHALLENGE_SKIPPED', data: skipped })
    broadcastState()

    return getFullState()
  })

  // POST /api/session/spin - Activer un defi aleatoire
  fastify.post('/session/spin', async (request, reply) => {
    if (!state.session) {
      return reply.status(400).send({ error: 'Aucune session en cours.' })
    }

    const pending = state.pendingChallenges.filter((sc) => sc.status === 'pending')
    if (pending.length === 0) {
      return reply.status(400).send({ error: 'Plus aucun defi en attente.' })
    }

    const random = pending[Math.floor(Math.random() * pending.length)]
    const scId = random.id

    if (state.activeChallenge) {
      await updateSessionChallengeStatus(state.activeChallenge.id, 'skipped')
      state.skippedCount++
    }

    stopTimer()
    state.timerSecondsLeft = null

    const activated = await updateSessionChallengeStatus(scId, 'active')
    if (!activated) return reply.status(404).send({ error: 'Defi introuvable.' })

    state.activeChallenge = activated
    state.pendingChallenges = state.pendingChallenges.filter((sc) => sc.id !== scId)
    state.votes = {}

    broadcast({ type: 'WHEEL_SPUN', data: activated })
    broadcastState()

    if (activated.challenge.timerSeconds) {
      startTimerForChallenge(activated.challenge.timerSeconds)
    }

    return getFullState()
  })

  // POST /api/session/timer/start
  fastify.post('/session/timer/start', async (request, reply) => {
    if (!state.activeChallenge) {
      return reply.status(400).send({ error: 'Aucun defi actif.' })
    }
    const seconds = state.activeChallenge.challenge.timerSeconds
    if (!seconds) {
      return reply.status(400).send({ error: "Ce defi n'a pas de timer configure." })
    }
    startTimerForChallenge(seconds)
    return { success: true, secondsLeft: seconds }
  })

  // POST /api/session/timer/stop
  fastify.post('/session/timer/stop', async () => {
    stopTimer()
    state.timerSecondsLeft = null
    broadcast({ type: 'TIMER_STOPPED', data: null })
    return { success: true }
  })

  // GET /api/history
  fastify.get('/history', async () => {
    const sessions = await getAllSessions()
    const withChallenges = await Promise.all(
      sessions.map(async (s) => ({ ...s, challenges: await getSessionChallenges(s.id) })),
    )
    return withChallenges
  })

  // GET /api/history/:id
  fastify.get('/history/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const session = await getSessionById(parseInt(id))
    if (!session) return reply.status(404).send({ error: 'Session introuvable' })
    return { ...session, challenges: await getSessionChallenges(session.id) }
  })
}

// --- HELPER : demarrage du timer avec broadcast ---
function startTimerForChallenge(seconds: number) {
  startTimer(seconds, () => {
    broadcast({ type: 'TIMER_EXPIRED', data: null })
    broadcastState()
  })

  const originalInterval = state.timerInterval
  if (originalInterval) clearInterval(originalInterval)

  state.timerSecondsLeft = seconds
  state.timerInterval = setInterval(() => {
    if (state.timerSecondsLeft === null) return
    state.timerSecondsLeft--
    broadcast({ type: 'TIMER_TICK', data: { secondsLeft: state.timerSecondsLeft } })
    if (state.timerSecondsLeft <= 0) {
      stopTimer()
      state.timerSecondsLeft = null
      broadcast({ type: 'TIMER_EXPIRED', data: null })
    }
  }, 1000)
}
