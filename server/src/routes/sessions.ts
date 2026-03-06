// =============================================================
// ROUTES API : GESTION DES SESSIONS
// =============================================================
// GET  /api/session               - session en cours + etat
// POST /api/session/start         - demarrer une session
// POST /api/session/end           - terminer la session
// POST /api/session/activate/:id  - activer un defi
// POST /api/session/complete      - completer le defi en cours
// POST /api/session/fail          - echouer le defi en cours
// POST /api/session/skip          - passer le defi en cours
// POST /api/session/spin          - activer un defi aleatoire
// POST /api/session/timer/start   - demarrer le timer
// POST /api/session/timer/stop    - arreter le timer
// GET  /api/history               - historique des sessions passees
// GET  /api/history/:id           - detail d'une session
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
  updateSessionPoints,
  getSessionChallengeById,
} from '../db/index.js'
import { state, resetState, startTimer, stopTimer } from '../state.js'
import { broadcast, broadcastState, getFullState } from '../ws/manager.js'

export async function sessionRoutes(fastify: FastifyInstance) {
  // GET /api/session - Retourne l'etat complet de la session en cours
  fastify.get('/session', async () => {
    return getFullState()
  })

  // POST /api/session/start - Demarrer une nouvelle session
  // Ajoute automatiquement tous les defis existants dans la session
  fastify.post('/session/start', async (request, reply) => {
    if (state.session) {
      return reply.status(400).send({ error: 'Une session est deja en cours. Termines-la avant d\'en demarrer une nouvelle.' })
    }

    // Creer la session en BDD
    const session = createSession()
    state.session = session

    // Ajouter tous les defis disponibles a la session
    const challenges = getAllChallenges()
    const sessionChallenges = challenges.map((c) => addChallengeToSession(session.id, c.id))

    state.pendingChallenges = sessionChallenges
    state.completedCount = 0
    state.failedCount = 0
    state.skippedCount = 0
    state.votes = {}

    broadcast({ type: 'SESSION_STARTED', data: session })
    broadcastState()

    return getFullState()
  })

  // POST /api/session/end - Terminer la session en cours
  fastify.post('/session/end', async (request, reply) => {
    if (!state.session) {
      return reply.status(400).send({ error: 'Aucune session en cours.' })
    }

    // Si un defi est actif, le marquer comme passe
    if (state.activeChallenge) {
      updateSessionChallengeStatus(state.activeChallenge.id, 'skipped')
    }

    stopTimer()
    const ended = endSession(state.session.id)

    broadcast({ type: 'SESSION_ENDED', data: ended! })
    resetState()

    return { success: true, session: ended }
  })

  // POST /api/session/activate/:id - Activer un defi specifique
  fastify.post('/session/activate/:id', async (request, reply) => {
    if (!state.session) {
      return reply.status(400).send({ error: 'Aucune session en cours.' })
    }

    const { id } = request.params as { id: string }
    const scId = parseInt(id)

    // Si un defi est deja actif, le remettre en pending
    if (state.activeChallenge) {
      updateSessionChallengeStatus(state.activeChallenge.id, 'skipped')
      state.skippedCount++
    }

    stopTimer()
    state.timerSecondsLeft = null

    // Activer le nouveau defi
    const activated = updateSessionChallengeStatus(scId, 'active')
    if (!activated) return reply.status(404).send({ error: 'Defi introuvable dans cette session.' })

    state.activeChallenge = activated
    // Retirer des pending
    state.pendingChallenges = state.pendingChallenges.filter((sc) => sc.id !== scId)
    // Effacer les votes
    state.votes = {}

    broadcast({ type: 'CHALLENGE_ACTIVATED', data: activated })
    broadcastState()

    // Demarrer le timer automatiquement si le defi en a un
    if (activated.challenge.timerSeconds) {
      startTimerForChallenge(activated.challenge.timerSeconds)
    }

    return getFullState()
  })

  // POST /api/session/complete - Valider le defi en cours comme complete
  fastify.post('/session/complete', async (request, reply) => {
    if (!state.activeChallenge) {
      return reply.status(400).send({ error: 'Aucun defi actif.' })
    }

    stopTimer()
    state.timerSecondsLeft = null

    const points = state.activeChallenge.challenge.points
    const completed = updateSessionChallengeStatus(state.activeChallenge.id, 'completed', points)!

    // Mettre a jour les compteurs
    state.completedCount++
    state.session!.totalPoints += points
    updateSessionPoints(state.session!.id, state.session!.totalPoints)

    state.activeChallenge = null

    broadcast({ type: 'CHALLENGE_COMPLETED', data: completed })
    broadcastState()

    return getFullState()
  })

  // POST /api/session/fail - Marquer le defi en cours comme echoue
  fastify.post('/session/fail', async (request, reply) => {
    if (!state.activeChallenge) {
      return reply.status(400).send({ error: 'Aucun defi actif.' })
    }

    stopTimer()
    state.timerSecondsLeft = null

    const failed = updateSessionChallengeStatus(state.activeChallenge.id, 'failed', 0)!

    state.failedCount++
    state.activeChallenge = null

    broadcast({ type: 'CHALLENGE_FAILED', data: failed })
    broadcastState()

    return getFullState()
  })

  // POST /api/session/skip - Passer le defi en cours sans penalite
  fastify.post('/session/skip', async (request, reply) => {
    if (!state.activeChallenge) {
      return reply.status(400).send({ error: 'Aucun defi actif.' })
    }

    stopTimer()
    state.timerSecondsLeft = null

    const skipped = updateSessionChallengeStatus(state.activeChallenge.id, 'skipped', 0)!

    state.skippedCount++
    state.activeChallenge = null

    broadcast({ type: 'CHALLENGE_SKIPPED', data: skipped })
    broadcastState()

    return getFullState()
  })

  // POST /api/session/spin - Activer un defi aleatoire parmi les pending
  fastify.post('/session/spin', async (request, reply) => {
    if (!state.session) {
      return reply.status(400).send({ error: 'Aucune session en cours.' })
    }

    const pending = state.pendingChallenges.filter((sc) => sc.status === 'pending')
    if (pending.length === 0) {
      return reply.status(400).send({ error: 'Plus aucun defi en attente.' })
    }

    // Choisir un defi aleatoire parmi les pending
    const random = pending[Math.floor(Math.random() * pending.length)]

    // Reutiliser la route activate
    return fastify.inject({
      method: 'POST',
      url: `/api/session/activate/${random.id}`,
    }).then((res) => JSON.parse(res.body))
  })

  // POST /api/session/timer/start - Demarrer le timer manuellement
  fastify.post('/session/timer/start', async (request, reply) => {
    if (!state.activeChallenge) {
      return reply.status(400).send({ error: 'Aucun defi actif.' })
    }

    const seconds = state.activeChallenge.challenge.timerSeconds
    if (!seconds) {
      return reply.status(400).send({ error: 'Ce defi n\'a pas de timer configure.' })
    }

    startTimerForChallenge(seconds)
    return { success: true, secondsLeft: seconds }
  })

  // POST /api/session/timer/stop - Arreter le timer
  fastify.post('/session/timer/stop', async () => {
    stopTimer()
    state.timerSecondsLeft = null
    broadcast({ type: 'TIMER_STOPPED', data: null })
    return { success: true }
  })

  // GET /api/history - Historique de toutes les sessions
  fastify.get('/history', async () => {
    const sessions = getAllSessions()
    return sessions.map((s) => ({
      ...s,
      challenges: getSessionChallenges(s.id),
    }))
  })

  // GET /api/history/:id - Detail d'une session specifique
  fastify.get('/history/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const session = getSessionById(parseInt(id))
    if (!session) return reply.status(404).send({ error: 'Session introuvable' })

    return {
      ...session,
      challenges: getSessionChallenges(session.id),
    }
  })
}

// --- HELPER INTERNE : demarrage du timer avec broadcast ---
function startTimerForChallenge(seconds: number) {
  startTimer(seconds, () => {
    // Callback appele quand le timer expire
    broadcast({ type: 'TIMER_EXPIRED', data: null })
    broadcastState()
  })

  // Broadcaster chaque tick (chaque seconde)
  const originalInterval = state.timerInterval
  if (originalInterval) {
    clearInterval(originalInterval)
  }

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
