// =============================================================
// ETAT EN MEMOIRE — MULTI-TENANT
// =============================================================
// Chaque streamer a son propre etat isole.
// getState(streamerId) cree l'etat si inexistant.
// =============================================================

import type { Session, SessionChallenge } from '@challenge-hub/shared'

export interface StreamerState {
  session: Session | null
  activeChallenge: SessionChallenge | null
  pendingChallenges: SessionChallenge[]
  completedCount: number
  failedCount: number
  skippedCount: number
  timerSecondsLeft: number | null
  timerInterval: NodeJS.Timeout | null
  votes: Record<number, number>
}

const streamerStates = new Map<string, StreamerState>()

function createEmptyState(): StreamerState {
  return {
    session: null,
    activeChallenge: null,
    pendingChallenges: [],
    completedCount: 0,
    failedCount: 0,
    skippedCount: 0,
    timerSecondsLeft: null,
    timerInterval: null,
    votes: {},
  }
}

export function getState(streamerId: string): StreamerState {
  if (!streamerStates.has(streamerId)) {
    streamerStates.set(streamerId, createEmptyState())
  }
  return streamerStates.get(streamerId)!
}

export function resetState(streamerId: string): void {
  stopTimer(streamerId)
  streamerStates.set(streamerId, createEmptyState())
}

// --- GESTION DU TIMER ---

export function startTimer(streamerId: string, seconds: number, onExpire: () => void): void {
  stopTimer(streamerId)
  const s = getState(streamerId)
  s.timerSecondsLeft = seconds

  s.timerInterval = setInterval(() => {
    if (s.timerSecondsLeft === null) return
    s.timerSecondsLeft--
    if (s.timerSecondsLeft <= 0) {
      stopTimer(streamerId)
      s.timerSecondsLeft = null
      onExpire()
    }
  }, 1000)
}

export function stopTimer(streamerId: string): void {
  const s = streamerStates.get(streamerId)
  if (s?.timerInterval) {
    clearInterval(s.timerInterval)
    s.timerInterval = null
  }
}
