// =============================================================
// GESTIONNAIRE WEBSOCKET — MULTI-TENANT
// =============================================================
// Chaque socket est associe a un streamerId.
// broadcast() et broadcastState() n'envoient qu'aux clients
// du meme streamer.
// =============================================================

import type { WSEvent, AppState } from '@challenge-hub/shared'
import { getState } from '../state.js'

// socket -> streamerId
const clients = new Map<any, string>()

export function addClient(socket: any, streamerId: string): void {
  clients.set(socket, streamerId)

  // Envoyer l'etat actuel immediatement
  sendToClient(socket, {
    type: 'STATE_SYNC',
    data: getFullState(streamerId),
  })

  socket.on('close', () => {
    clients.delete(socket)
  })
}

export function broadcast(streamerId: string, event: WSEvent): void {
  const message = JSON.stringify(event)
  for (const [socket, sid] of clients) {
    if (sid === streamerId && socket.readyState === 1) {
      socket.send(message)
    }
  }
}

function sendToClient(socket: any, event: WSEvent): void {
  if (socket.readyState === 1) {
    socket.send(JSON.stringify(event))
  }
}

export function broadcastState(streamerId: string): void {
  broadcast(streamerId, {
    type: 'STATE_SYNC',
    data: getFullState(streamerId),
  })
}

export function getFullState(streamerId: string): AppState {
  const s = getState(streamerId)
  return {
    session: s.session,
    activeChallenge: s.activeChallenge,
    pendingChallenges: s.pendingChallenges,
    completedCount: s.completedCount,
    failedCount: s.failedCount,
    skippedCount: s.skippedCount,
    timerSecondsLeft: s.timerSecondsLeft,
    votes: s.votes,
  }
}
