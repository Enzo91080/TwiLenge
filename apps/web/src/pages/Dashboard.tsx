// =============================================================
// PAGE DASHBOARD — Panneau de contrôle principal
// =============================================================

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Play, Square, Shuffle, Trophy, Target, XCircle, SkipForward } from 'lucide-react'
import { api } from '../lib/api'
import { useAppState } from '../lib/context'
import { ActiveChallenge } from '../components/ActiveChallenge'
import { PendingChallengeCard } from '../components/ChallengeCard'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { ConfirmDialog } from '../components/ConfirmDialog'

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

  const totalPoints = session?.totalPoints ?? 0

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">

      {/* Modal de confirmation fin de session */}
      <ConfirmDialog
        open={showEndConfirm}
        onOpenChange={setShowEndConfirm}
        title="Terminer la session ?"
        description={`Le score final (${totalPoints} pts) sera sauvegardé dans l'historique. Cette action est irréversible.`}
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
            <div className="text-5xl md:text-6xl mb-4">🎮</div>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
            <StatCard icon={<Trophy className="w-5 h-5" />} label="Points" value={totalPoints}
              colorClass="text-fortnite-yellow" bgClass="bg-fortnite-yellow/5 border-fortnite-yellow/20" />
            <StatCard icon={<Target className="w-5 h-5" />} label="Complétés" value={completedCount}
              colorClass="text-green-400" bgClass="bg-green-500/5 border-green-500/20" />
            <StatCard icon={<XCircle className="w-5 h-5" />} label="Échoués" value={failedCount}
              colorClass="text-red-400" bgClass="bg-red-500/5 border-red-500/20" />
            <StatCard icon={<SkipForward className="w-5 h-5" />} label="Passés" value={skippedCount}
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
                <span className="text-xs text-fortnite-muted/60 hidden sm:block">Appuie pour activer</span>
              </div>
              <div className="space-y-2">
                {pendingChallenges.map((sc) => (
                  <PendingChallengeCard
                    key={sc.id} sc={sc} votes={votes}
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
                <div className="text-4xl mb-3">🏆</div>
                <div className="text-white font-bold text-lg">Tous les défis sont terminés !</div>
                <div className="text-fortnite-yellow font-semibold mt-1">{totalPoints} points</div>
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
    <Card className={bgClass}>
      <CardContent className="p-3 md:p-4 text-center">
        <div className={`flex justify-center mb-1.5 ${colorClass}`}>{icon}</div>
        <div className={`text-2xl md:text-3xl font-bold ${colorClass}`}>{value}</div>
        <div className="text-xs text-fortnite-muted mt-0.5 font-medium">{label}</div>
      </CardContent>
    </Card>
  )
}
