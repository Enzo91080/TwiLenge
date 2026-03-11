import type { Challenge } from '@challenge-hub/shared'

// Interface partagée par tous les composants de style d'overlay
export interface StyleProps {
  challenge: Challenge
  timerSecondsLeft: number | null
  theme: 'dark' | 'light'
}
