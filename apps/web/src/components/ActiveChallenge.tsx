// =============================================================
// COMPOSANT DÉFI ACTIF
// =============================================================
// Panneau central du dashboard affichant le défi en cours.
// Contient les boutons Complété / Échoué / Passé et le timer.
// =============================================================

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, XCircle, SkipForward, Timer, Play, Square } from 'lucide-react'
import { api } from '../lib/api'
import { useAppState } from '../lib/context'
import { formatTime, difficultyColor, categoryColor, cn } from '../lib/utils'
import { CATEGORY_LABELS, DIFFICULTY_LABELS } from '@challenge-hub/shared'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Card, CardContent } from './ui/card'

export function ActiveChallenge() {
  const { appState } = useAppState()
  const { activeChallenge, timerSecondsLeft } = appState
  const qc = useQueryClient()

  const onSuccess = () => qc.invalidateQueries({ queryKey: ['session'] })

  const completeMut = useMutation({ mutationFn: api.session.complete, onSuccess })
  const failMut = useMutation({ mutationFn: api.session.fail, onSuccess })
  const skipMut = useMutation({ mutationFn: api.session.skip, onSuccess })
  const timerStartMut = useMutation({ mutationFn: api.session.timer.start, onSuccess })
  const timerStopMut = useMutation({ mutationFn: api.session.timer.stop, onSuccess })

  const isLoading = completeMut.isPending || failMut.isPending || skipMut.isPending

  if (!activeChallenge) {
    return (
      <Card className="flex flex-col items-center justify-center text-center min-h-[220px] border-dashed">
        <CardContent className="flex flex-col items-center justify-center gap-2 py-8">
          <div className="text-4xl">🎯</div>
          <p className="text-fortnite-muted text-sm">Aucun défi actif</p>
          <p className="text-fortnite-muted/60 text-xs">
            Clique sur un défi ci-dessous pour le lancer
          </p>
        </CardContent>
      </Card>
    )
  }

  const c = activeChallenge.challenge
  const hasTimer = c.timerSeconds !== null
  const timerRunning = timerSecondsLeft !== null

  // Couleur du timer selon le temps restant
  const timerColor =
    timerSecondsLeft !== null && timerSecondsLeft <= 30
      ? 'text-red-400'
      : 'text-fortnite-yellow'

  return (
    <Card className="border-fortnite-yellow/30 bg-fortnite-yellow/5 animate-fade-in">
      <CardContent className="p-4 space-y-4">
        {/* Header : badges + titre + points */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            {/* Badges catégorie + difficulté */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              <span className={cn('badge border', categoryColor(c.category))}>
                {CATEGORY_LABELS[c.category]}
              </span>
              <span className={cn('badge border', difficultyColor(c.difficulty))}>
                {DIFFICULTY_LABELS[c.difficulty]}
              </span>
              {hasTimer && (
                <Badge variant="blue">
                  <Timer className="w-3 h-3 mr-1" />
                  {formatTime(c.timerSeconds!)}
                </Badge>
              )}
            </div>
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

        {/* Compte à rebours du timer */}
        {timerRunning && timerSecondsLeft !== null && (
          <div
            className={cn(
              'text-4xl font-mono font-bold text-center py-3 tracking-widest rounded-lg bg-black/20',
              timerColor,
            )}
          >
            {formatTime(timerSecondsLeft)}
          </div>
        )}

        {/* Contrôles du timer */}
        {hasTimer && (
          <div className="flex gap-2">
            {!timerRunning ? (
              <Button
                variant="blue"
                className="flex-1"
                onClick={() => timerStartMut.mutate()}
                disabled={timerStartMut.isPending}
              >
                <Play className="w-4 h-4" />
                Démarrer le timer
              </Button>
            ) : (
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => timerStopMut.mutate()}
                disabled={timerStopMut.isPending}
              >
                <Square className="w-4 h-4" />
                Arrêter le timer
              </Button>
            )}
          </div>
        )}

        {/* Actions principales */}
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="success"
            className="py-3 flex-col gap-1 h-auto"
            onClick={() => completeMut.mutate()}
            disabled={isLoading}
          >
            <CheckCircle className="w-5 h-5" />
            <span className="hidden sm:inline text-xs">Complété</span>
          </Button>

          <Button
            variant="destructive"
            className="py-3 flex-col gap-1 h-auto"
            onClick={() => failMut.mutate()}
            disabled={isLoading}
          >
            <XCircle className="w-5 h-5" />
            <span className="hidden sm:inline text-xs">Échoué</span>
          </Button>

          <Button
            variant="secondary"
            className="py-3 flex-col gap-1 h-auto"
            onClick={() => skipMut.mutate()}
            disabled={isLoading}
          >
            <SkipForward className="w-5 h-5" />
            <span className="hidden sm:inline text-xs">Passer</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
