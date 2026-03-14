// =============================================================
// COMPOSANT DÉFI ACTIF
// =============================================================

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, XCircle, SkipForward, Timer, Play, Square, Target } from 'lucide-react'
import { api } from '../lib/api'
import { useAppState } from '../lib/context'
import { formatTime, difficultyColor, cn } from '../lib/utils'
import { DIFFICULTY_LABELS } from '@challenge-hub/shared'
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
      <Card className="flex flex-col items-center justify-center text-center min-h-[180px] md:min-h-[220px] border-dashed">
        <CardContent className="flex flex-col items-center gap-2 py-8">
          <div className="w-12 h-12 rounded-xl bg-fortnite-border/30 flex items-center justify-center">
            <Target className="w-6 h-6 text-fortnite-muted/40" />
          </div>
          <p className="text-fortnite-muted text-sm">Aucun défi actif</p>
          <p className="text-fortnite-muted/50 text-xs">Appuie sur un défi en attente pour le lancer</p>
        </CardContent>
      </Card>
    )
  }

  const c = activeChallenge.challenge
  const hasTimer = c.timerSeconds !== null
  const timerRunning = timerSecondsLeft !== null
  const timerCritical = timerSecondsLeft !== null && timerSecondsLeft <= 30

  return (
    <Card className="border-fortnite-yellow/30 bg-gradient-to-b from-fortnite-yellow/5 to-transparent animate-fade-in">
      <CardContent className="p-4 md:p-5 space-y-4">

        {/* Indicateur EN COURS */}
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
          <span className="text-xs font-bold text-green-400 uppercase tracking-widest">En cours</span>
        </div>

        {/* Badges + description */}
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            <span className={cn('badge border text-xs', difficultyColor(c.difficulty))}>
              {DIFFICULTY_LABELS[c.difficulty]}
            </span>
            {hasTimer && (
              <Badge variant="blue">
                <Timer className="w-3 h-3 mr-1" />
                {formatTime(c.timerSeconds!)}
              </Badge>
            )}
          </div>
          {c.description && (
            <p className="text-sm text-fortnite-muted leading-relaxed">{c.description}</p>
          )}
        </div>

        {/* Compte à rebours */}
        {timerRunning && timerSecondsLeft !== null && (
          <div
            className={cn(
              'text-4xl md:text-5xl font-mono font-bold text-center py-4 rounded-xl tracking-widest border',
              timerCritical
                ? 'text-red-400 bg-red-500/10 border-red-500/20 animate-pulse'
                : 'text-fortnite-yellow bg-fortnite-yellow/5 border-fortnite-yellow/15',
            )}
          >
            {formatTime(timerSecondsLeft)}
          </div>
        )}

        {/* Contrôles timer */}
        {hasTimer && (
          <Button
            variant={timerRunning ? 'secondary' : 'blue'}
            className="w-full"
            onClick={() => timerRunning ? timerStopMut.mutate() : timerStartMut.mutate()}
            disabled={timerStartMut.isPending || timerStopMut.isPending}
          >
            {timerRunning
              ? <><Square className="w-4 h-4" /> Arrêter le timer</>
              : <><Play className="w-4 h-4" /> Démarrer le timer</>
            }
          </Button>
        )}

        {/* Actions — Compléter en CTA principal, Échoué + Passer en secondaire */}
        <div className="space-y-2">
          <Button
            variant="success"
            className="w-full h-12 text-base font-bold gap-2"
            onClick={() => completeMut.mutate()}
            disabled={isLoading}
          >
            <CheckCircle className="w-5 h-5" />
            Défi complété !
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="destructive"
              className="h-10 gap-1.5"
              onClick={() => failMut.mutate()}
              disabled={isLoading}
            >
              <XCircle className="w-4 h-4" />
              Échoué
            </Button>
            <Button
              variant="secondary"
              className="h-10 gap-1.5"
              onClick={() => skipMut.mutate()}
              disabled={isLoading}
            >
              <SkipForward className="w-4 h-4" />
              Passer
            </Button>
          </div>
        </div>

      </CardContent>
    </Card>
  )
}
