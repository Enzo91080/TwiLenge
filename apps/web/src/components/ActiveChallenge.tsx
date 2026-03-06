// =============================================================
// COMPOSANT DEFI ACTIF
// =============================================================
// Panneau central du dashboard affichant le defi en cours.
// Contient les boutons Complete / Echoue / Passe et le timer.
// =============================================================

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, XCircle, SkipForward, Timer, Play, Square } from 'lucide-react'
import { api } from '../lib/api'
import { useAppState } from '../lib/context'
import { formatTime, difficultyColor, categoryColor, cn } from '../lib/utils'
import { CATEGORY_LABELS, DIFFICULTY_LABELS } from '@challenge-hub/shared'

export function ActiveChallenge() {
  const { appState } = useAppState()
  const { activeChallenge, timerSecondsLeft } = appState
  const qc = useQueryClient()

  // Invalidate le cache apres chaque action pour rafraichir l'UI
  const onSuccess = () => qc.invalidateQueries({ queryKey: ['session'] })

  const completeMut = useMutation({ mutationFn: api.session.complete, onSuccess })
  const failMut = useMutation({ mutationFn: api.session.fail, onSuccess })
  const skipMut = useMutation({ mutationFn: api.session.skip, onSuccess })
  const timerStartMut = useMutation({ mutationFn: api.session.timer.start, onSuccess })
  const timerStopMut = useMutation({ mutationFn: api.session.timer.stop, onSuccess })

  const isLoading = completeMut.isPending || failMut.isPending || skipMut.isPending

  if (!activeChallenge) {
    return (
      <div className="card flex flex-col items-center justify-center text-center min-h-[220px] border-dashed">
        <div className="text-4xl mb-3">🎯</div>
        <div className="text-fortnite-muted text-sm">Aucun defi actif</div>
        <div className="text-fortnite-muted/60 text-xs mt-1">
          Clique sur un defi ci-dessous pour le lancer
        </div>
      </div>
    )
  }

  const c = activeChallenge.challenge
  const hasTimer = c.timerSeconds !== null
  const timerRunning = timerSecondsLeft !== null

  // Couleur du timer selon le temps restant
  const timerColor = timerSecondsLeft !== null && timerSecondsLeft <= 30
    ? 'text-red-400'
    : 'text-fortnite-yellow'

  return (
    <div className="card border-fortnite-yellow/30 bg-fortnite-yellow/5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1">
          {/* Badges categorie + difficulte */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            <span className={cn('badge border', categoryColor(c.category))}>
              {CATEGORY_LABELS[c.category]}
            </span>
            <span className={cn('badge border', difficultyColor(c.difficulty))}>
              {DIFFICULTY_LABELS[c.difficulty]}
            </span>
            {hasTimer && (
              <span className="badge border text-blue-400 bg-blue-400/10 border-blue-400/20">
                <Timer className="w-3 h-3 mr-1" />
                {formatTime(c.timerSeconds!)}
              </span>
            )}
          </div>

          {/* Titre */}
          <h2 className="text-xl font-bold text-white leading-tight">{c.title}</h2>
          {c.description && (
            <p className="text-sm text-fortnite-muted mt-1">{c.description}</p>
          )}
        </div>

        {/* Points */}
        <div className="text-right shrink-0">
          <div className="text-2xl font-bold text-fortnite-yellow">{c.points}</div>
          <div className="text-xs text-fortnite-muted">points</div>
        </div>
      </div>

      {/* Timer en cours */}
      {timerRunning && timerSecondsLeft !== null && (
        <div className={cn('text-4xl font-mono font-bold text-center py-4 tracking-widest', timerColor)}>
          {formatTime(timerSecondsLeft)}
        </div>
      )}

      {/* Controles du timer */}
      {hasTimer && (
        <div className="flex gap-2 mb-4">
          {!timerRunning ? (
            <button
              onClick={() => timerStartMut.mutate()}
              className="btn bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 flex-1"
            >
              <Play className="w-4 h-4" />
              Demarrer le timer
            </button>
          ) : (
            <button
              onClick={() => timerStopMut.mutate()}
              className="btn bg-gray-500/20 text-gray-400 border border-gray-500/30 hover:bg-gray-500/30 flex-1"
            >
              <Square className="w-4 h-4" />
              Arreter le timer
            </button>
          )}
        </div>
      )}

      {/* Actions principales */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => completeMut.mutate()}
          disabled={isLoading}
          className="btn bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 justify-center py-3"
        >
          <CheckCircle className="w-5 h-5" />
          <span className="hidden sm:inline">Complete</span>
        </button>

        <button
          onClick={() => failMut.mutate()}
          disabled={isLoading}
          className="btn bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 justify-center py-3"
        >
          <XCircle className="w-5 h-5" />
          <span className="hidden sm:inline">Echoue</span>
        </button>

        <button
          onClick={() => skipMut.mutate()}
          disabled={isLoading}
          className="btn bg-gray-500/20 text-gray-400 border border-gray-500/30 hover:bg-gray-500/30 justify-center py-3"
        >
          <SkipForward className="w-5 h-5" />
          <span className="hidden sm:inline">Passer</span>
        </button>
      </div>
    </div>
  )
}
