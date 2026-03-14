// =============================================================
// OVERLAY OBS
// =============================================================
// Cette page est destinee a etre ouverte dans OBS comme Browser Source.
// Elle affiche le defi en cours en temps reel, avec animations.
//
// Parametres URL :
//   ?position=top-right  (defaut) | top-left | bottom-right | bottom-left
//   ?theme=dark (defaut) | light
//   ?scale=1 (defaut, valeurs de 0.5 a 2)
//   ?style=gaming (defaut) | minimal | neon | banner | pill
// =============================================================

import { useEffect, useState } from 'react'
import { useWebSocket } from './hooks/useWebSocket'
import { ChallengeDisplay } from './components/ChallengeDisplay'
import { ResultFlash } from './components/ResultFlash'
import { SpinAnimation } from './components/SpinAnimation'
import type { OverlayParams, SessionChallenge } from '@challenge-hub/shared'

// Lire les parametres depuis l'URL
function getOverlayParams(): OverlayParams {
  const params = new URLSearchParams(window.location.search)
  return {
    position: (params.get('position') as OverlayParams['position']) ?? 'top-right',
    theme:    (params.get('theme')    as OverlayParams['theme'])    ?? 'dark',
    scale:    parseFloat(params.get('scale') ?? '1'),
    style:    (params.get('style')    as OverlayParams['style'])    ?? 'gaming',
  }
}

// Classes de positionnement selon le parametre URL
const POSITION_CLASSES: Record<OverlayParams['position'], string> = {
  'top-right':    'top-4 right-4',
  'top-left':     'top-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left':  'bottom-4 left-4',
}

export default function App() {
  const { appState, lastEvent } = useWebSocket()
  const { activeChallenge, timerSecondsLeft } = appState
  const params = getOverlayParams()

  // Flash de resultat (complete/echoue)
  const [flash, setFlash] = useState<'completed' | 'failed' | null>(null)
  // Animation roue (WHEEL_SPUN)
  const [spinResult, setSpinResult] = useState<SessionChallenge | null>(null)
  const [spinChallenges, setSpinChallenges] = useState<SessionChallenge[]>([])

  useEffect(() => {
    if (!lastEvent) return
    if (lastEvent.type === 'WHEEL_SPUN') {
      // La liste est embarquée dans l'événement — pas de dépendance sur appState
      setSpinChallenges(lastEvent.data.challenges)
      setSpinResult(lastEvent.data.activated)
    } else if (lastEvent.type === 'CHALLENGE_COMPLETED') {
      setSpinResult(null)
      setFlash('completed')
      setTimeout(() => setFlash(null), 2000)
    } else if (lastEvent.type === 'CHALLENGE_FAILED') {
      setSpinResult(null)
      setFlash('failed')
      setTimeout(() => setFlash(null), 2000)
    }
  }, [lastEvent])

  // Si aucun defi actif, pas de flash et pas de spin, ne rien afficher
  if (!activeChallenge && !flash && !spinResult) return null

  return (
    <div
      className={`fixed ${POSITION_CLASSES[params.position]}`}
      style={{ transform: `scale(${params.scale})`, transformOrigin: getTransformOrigin(params.position) }}
    >
      {/* Slot machine (prioritaire) */}
      {spinResult && spinChallenges.length > 0 && (
        <SpinAnimation
          challenges={spinChallenges}
          result={spinResult}
          onComplete={() => setSpinResult(null)}
        />
      )}

      {/* Flash de resultat */}
      {flash && !spinResult && <ResultFlash type={flash} />}

      {/* Defi en cours */}
      {activeChallenge && !flash && !spinResult && (
        <ChallengeDisplay
          style={params.style}
          challenge={activeChallenge.challenge}
          timerSecondsLeft={timerSecondsLeft}
          theme={params.theme}
        />
      )}
    </div>
  )
}

function getTransformOrigin(position: OverlayParams['position']): string {
  switch (position) {
    case 'top-right':    return 'top right'
    case 'top-left':     return 'top left'
    case 'bottom-right': return 'bottom right'
    case 'bottom-left':  return 'bottom left'
  }
}
