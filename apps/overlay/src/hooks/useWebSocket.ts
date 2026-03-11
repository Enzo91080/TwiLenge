// Meme logique que le dashboard, mais l'overlay se connecte
// directement sur le port 3001 du serveur (pas de proxy en prod)
import { useState, useEffect, useRef, useCallback } from 'react'
import type { AppState, WSEvent } from '@challenge-hub/shared'

// Lire token et streamer depuis les params URL de l'overlay
// ex: ?token=xxx&streamer=monlogin&position=top-right
const params = new URLSearchParams(window.location.search)
const overlayToken = params.get('token') ?? ''
const overlayStreamer = params.get('streamer') ?? ''
const WS_BASE = import.meta.env.DEV
  ? 'ws://localhost:3001/ws'
  : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`
const WS_URL = `${WS_BASE}?token=${encodeURIComponent(overlayToken)}&streamer=${encodeURIComponent(overlayStreamer)}`

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
  const [lastEvent, setLastEvent] = useState<WSEvent | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onmessage = (event) => {
      try {
        const msg: WSEvent = JSON.parse(event.data)
        setLastEvent(msg)

        if (msg.type === 'STATE_SYNC') {
          setAppState(msg.data)
        } else if (msg.type === 'TIMER_TICK') {
          setAppState((prev) => ({ ...prev, timerSecondsLeft: msg.data.secondsLeft }))
        } else if (msg.type === 'TIMER_EXPIRED' || msg.type === 'TIMER_STOPPED') {
          setAppState((prev) => ({ ...prev, timerSecondsLeft: null }))
        }
      } catch {}
    }

    ws.onclose = () => {
      reconnectTimeout.current = setTimeout(connect, 3000)
    }

    ws.onerror = () => ws.close()
  }, [])

  useEffect(() => {
    connect()
    return () => {
      reconnectTimeout.current && clearTimeout(reconnectTimeout.current)
      wsRef.current?.close()
    }
  }, [connect])

  return { appState, lastEvent }
}
