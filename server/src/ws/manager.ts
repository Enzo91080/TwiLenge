// =============================================================
// GESTIONNAIRE WEBSOCKET
// =============================================================
// Gere toutes les connexions WebSocket ouvertes.
// Quand quelque chose change (defi active, timer, etc.),
// on appelle broadcast() pour informer tous les clients connectes
// (dashboard, overlay, etc.) en meme temps.
// =============================================================

import type { WSEvent, AppState } from '@challenge-hub/shared'
import { state } from '../state.js'

// Ensemble de tous les clients WebSocket connectes
const clients = new Set<any>()

// Enregistrer un nouveau client quand il se connecte
export function addClient(socket: any) {
  clients.add(socket)

  // Envoyer l'etat actuel immediatement au nouveau client
  sendToClient(socket, {
    type: 'STATE_SYNC',
    data: getFullState(),
  })

  // Retirer le client quand il se deconnecte
  socket.on('close', () => {
    clients.delete(socket)
  })
}

// Envoyer un evenement a tous les clients connectes
export function broadcast(event: WSEvent) {
  const message = JSON.stringify(event)
  for (const client of clients) {
    if (client.readyState === 1) { // 1 = OPEN
      client.send(message)
    }
  }
}

// Envoyer un evenement a un seul client
function sendToClient(socket: any, event: WSEvent) {
  if (socket.readyState === 1) {
    socket.send(JSON.stringify(event))
  }
}

// Diffuser l'etat complet (utilise apres chaque changement important)
export function broadcastState() {
  broadcast({
    type: 'STATE_SYNC',
    data: getFullState(),
  })
}

// Construire l'etat complet depuis le state en memoire
export function getFullState(): AppState {
  return {
    session: state.session,
    activeChallenge: state.activeChallenge,
    pendingChallenges: state.pendingChallenges,
    completedCount: state.completedCount,
    failedCount: state.failedCount,
    skippedCount: state.skippedCount,
    timerSecondsLeft: state.timerSecondsLeft,
    votes: state.votes,
  }
}
