// =============================================================
// PAGE DASHBOARD — Panneau de contrôle principal
// =============================================================

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Play, Square, Shuffle, Target, XCircle, SkipForward, Gamepad2, Trophy } from 'lucide-react'
import { api } from '../lib/api'
import { useAppState } from '../lib/context'
import { ActiveChallenge } from '../components/ActiveChallenge'
import { PendingChallengeCard } from '../components/ChallengeCard'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { cn } from '../lib/utils'

export function Dashboard() {
  const { appState } = useAppState()
  const { session, activeChallenge, pendingChallenges, completedCount, failedCount, skippedCount, votes } = appState
  const qc = useQueryClient()

  const [showEndConfirm, setShowEndConfirm] = useState(false)

  const onSuccess = () => qc.invalidateQueries({ queryKey: ['session'] })

  const startMut = useMutation({ mutationFn: api.session.start, onSuccess })
  const endMut = useMutation({ mutationFn: api.session.end, onSuccess })
  const spinMut = useMutation({ mutationFn: api.session.spin, onSuccess })
  const activateMut = useMutation({
    mutationFn: (id: number) => api.session.activate(id),
    onSuccess,
  })

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">

      {/* Modal de confirmation fin de session */}
      <ConfirmDialog
        open={showEndConfirm}
        onOpenChange={setShowEndConfirm}
        title="Terminer la session ?"
        description="Les résultats seront sauvegardés dans l'historique. Cette action est irréversible."
        confirmLabel="Terminer la session"
        variant="destructive"
        onConfirm={() => endMut.mutate()}
        isLoading={endMut.isPending}
      />

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl md:text-2xl font-bold text-white">Dashboard</h1>

        {!session ? (
          <Button onClick={() => startMut.mutate()} disabled={startMut.isPending} size="sm">
            <Play className="w-4 h-4" />
            <span className="hidden xs:inline">Démarrer</span>
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="purple"
              size="sm"
              onClick={() => spinMut.mutate()}
              disabled={spinMut.isPending || pendingChallenges.length === 0}
              title="Défi aléatoire"
            >
              <Shuffle className="w-4 h-4" />
              <span className="hidden sm:inline">Aléatoire</span>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowEndConfirm(true)}
              disabled={endMut.isPending}
            >
              <Square className="w-4 h-4" />
              <span className="hidden sm:inline">Terminer</span>
            </Button>
          </div>
        )}
      </div>

      {/* Écran d'accueil sans session */}
      {!session && (
        <Card className="text-center border-fortnite-yellow/10 bg-gradient-to-b from-fortnite-card to-fortnite-darker">
          <CardContent className="py-12 md:py-16">
            <div className="w-16 h-16 rounded-2xl bg-fortnite-yellow/10 flex items-center justify-center mx-auto mb-4">
              <Gamepad2 className="w-8 h-8 text-fortnite-yellow" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Prêt à streamer ?</h2>
            <p className="text-fortnite-muted text-sm max-w-sm mx-auto leading-relaxed">
              Lance une session pour commencer les défis. Tous tes défis configurés seront chargés automatiquement.
            </p>
            <Button className="mt-6" onClick={() => startMut.mutate()} disabled={startMut.isPending}>
              <Play className="w-4 h-4" />
              Démarrer la session
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Session en cours */}
      {session && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 md:gap-3">
            <StatCard icon={<Target className="w-4 h-4" />} label="Complétés" value={completedCount}
              colorClass="text-green-400" bgClass="bg-green-500/5 border-green-500/20" />
            <StatCard icon={<XCircle className="w-4 h-4" />} label="Échoués" value={failedCount}
              colorClass="text-red-400" bgClass="bg-red-500/5 border-red-500/20" />
            <StatCard icon={<SkipForward className="w-4 h-4" />} label="Passés" value={skippedCount}
              colorClass="text-yellow-400" bgClass="bg-yellow-500/5 border-yellow-500/20" />
          </div>

          {/* Défi actif */}
          <div>
            <h2 className="text-xs font-semibold text-fortnite-muted uppercase tracking-widest mb-3">
              Défi en cours
            </h2>
            <ActiveChallenge />
          </div>

          {/* Queue */}
          {pendingChallenges.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-fortnite-muted uppercase tracking-widest">
                  En attente ({pendingChallenges.length})
                </h2>
                <span className="text-xs text-fortnite-muted/50 hidden sm:block">Clic pour activer</span>
              </div>
              <div className="space-y-2">
                {pendingChallenges.map((sc, index) => (
                  <PendingChallengeCard
                    key={sc.id} sc={sc} votes={votes}
                    position={index + 1}
                    onActivate={(id) => activateMut.mutate(id)}
                    isLoading={activateMut.isPending}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Fin de tous les défis */}
          {pendingChallenges.length === 0 && !activeChallenge && (
            <Card className="text-center border-dashed border-fortnite-yellow/20">
              <CardContent className="py-10">
                <div className="w-12 h-12 rounded-xl bg-fortnite-yellow/10 flex items-center justify-center mx-auto mb-3">
                  <Trophy className="w-6 h-6 text-fortnite-yellow" />
                </div>
                <div className="text-white font-bold text-lg">Tous les défis sont terminés !</div>
                <p className="text-fortnite-muted text-sm mt-1">Tu peux terminer la session ou en relancer une nouvelle.</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, colorClass, bgClass }: {
  icon: React.ReactNode; label: string; value: number
  colorClass: string; bgClass: string
}) {
  return (
    <Card className={cn(bgClass, 'overflow-hidden')}>
      <CardContent className="p-3 md:p-4 text-center">
        <div className={cn('flex justify-center mb-2', colorClass)}>{icon}</div>
        <div className={cn('text-3xl md:text-4xl font-bold tabular-nums leading-none', colorClass)}>{value}</div>
        <div className="text-xs text-fortnite-muted mt-1.5 font-medium">{label}</div>
      </CardContent>
    </Card>
  )
}
