// =============================================================
// HOOK WEBSOCKET
// =============================================================
// Se connecte au serveur en WebSocket et ecoute les evenements.
// Retourne l'etat courant de l'application (session, defis, timer...).
// Se reconnecte automatiquement si la connexion est perdue.
// =============================================================

import { useState, useEffect, useRef, useCallback } from 'react'
import type { AppState, WSEvent } from '@challenge-hub/shared'

// En dev : connexion directe au serveur (evite le proxy Vite qui génère des erreurs)
// En prod : meme host que le dashboard
const WS_URL = import.meta.env.DEV
  ? 'ws://localhost:3001/ws'
  : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`

const DEFAULT_STATE: AppState = {
  session: null,
  activeChallenge: null,
  pendingChallenges: [],
  completedCount: 0,
  failedCount: 0,
  skippedCount: 0,
  timerSecondsLeft: null,
  votes: {},
}

export function useWebSocket() {
  const [appState, setAppState] = useState<AppState>(DEFAULT_STATE)
  const [connected, setConnected] = useState(false)
  // Dernier evenement recu (pour les animations/notifications)
  const [lastEvent, setLastEvent] = useState<WSEvent | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const connect = useCallback(() => {
    // Eviter les connexions multiples
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      console.log('[WS] Connecte au serveur')
    }

    ws.onmessage = (event) => {
      try {
        const msg: WSEvent = JSON.parse(event.data)
        setLastEvent(msg)

        // Mettre a jour l'etat selon le type d'evenement
        if (msg.type === 'STATE_SYNC') {
          setAppState(msg.data)
        } else if (msg.type === 'TIMER_TICK') {
          setAppState((prev) => ({ ...prev, timerSecondsLeft: msg.data.secondsLeft }))
        } else if (msg.type === 'TIMER_EXPIRED' || msg.type === 'TIMER_STOPPED') {
          setAppState((prev) => ({ ...prev, timerSecondsLeft: null }))
        } else if (msg.type === 'VOTE_UPDATE') {
          setAppState((prev) => ({ ...prev, votes: msg.data }))
        }
        // Pour les autres evenements (CHALLENGE_COMPLETED, etc.),
        // le serveur envoie aussi un STATE_SYNC juste apres.
      } catch (err) {
        console.error('[WS] Erreur de parsing:', err)
      }
    }

    ws.onclose = () => {
      setConnected(false)
      console.log('[WS] Deconnecte. Reconnexion dans 3s...')
      // Tentative de reconnexion apres 3 secondes
      reconnectTimeout.current = setTimeout(connect, 3000)
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      reconnectTimeout.current && clearTimeout(reconnectTimeout.current)
      wsRef.current?.close()
    }
  }, [connect])

  return { appState, connected, lastEvent }
}
