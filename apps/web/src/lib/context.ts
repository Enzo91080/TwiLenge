import { createContext, useContext } from 'react'
import type { AppState, WSEvent } from '@challenge-hub/shared'

interface WSContextValue {
  appState: AppState
  connected: boolean
  lastEvent: WSEvent | null
}

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

export const WSContext = createContext<WSContextValue>({
  appState: DEFAULT_STATE,
  connected: false,
  lastEvent: null,
})

// Hook raccourci pour utiliser le contexte dans n'importe quel composant
export function useAppState() {
  return useContext(WSContext)
}
