// =============================================================
// ETAT GLOBAL EN MEMOIRE
// =============================================================
// Cet objet contient l'etat actuel de l'application.
// Il est mis a jour par les routes et diffuse aux clients via WebSocket.
// Il est reconstruit depuis la BDD au demarrage du serveur.
// =============================================================

import type { Session, SessionChallenge } from '@challenge-hub/shared'

export const state = {
  // Session en cours (null si aucune session active)
  session: null as Session | null,

  // Defi actuellement actif (null si aucun)
  activeChallenge: null as SessionChallenge | null,

  // Defis de la session en attente (order = ordre d'affichage)
  pendingChallenges: [] as SessionChallenge[],

  // Compteurs de la session
  completedCount: 0,
  failedCount: 0,
  skippedCount: 0,

  // Timer en cours (secondes restantes, null si pas de timer)
  timerSecondsLeft: null as number | null,
  timerInterval: null as NodeJS.Timeout | null,

  // Votes du chat { challengeId: nombreDeVotes }
  votes: {} as Record<number, number>,
}

// Remet l'etat a zero (appele quand une session se termine)
export function resetState() {
  state.session = null
  state.activeChallenge = null
  state.pendingChallenges = []
  state.completedCount = 0
  state.failedCount = 0
  state.skippedCount = 0
  state.timerSecondsLeft = null
  state.votes = {}
  stopTimer()
}

// --- GESTION DU TIMER ---

export function startTimer(seconds: number, onExpire: () => void) {
  stopTimer() // Arreter le timer precedent si il y en a un
  state.timerSecondsLeft = seconds

  state.timerInterval = setInterval(() => {
    if (state.timerSecondsLeft === null) return

    state.timerSecondsLeft--

    if (state.timerSecondsLeft <= 0) {
      stopTimer()
      state.timerSecondsLeft = null
      onExpire()
    }
  }, 1000)
}

export function stopTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval)
    state.timerInterval = null
  }
}
