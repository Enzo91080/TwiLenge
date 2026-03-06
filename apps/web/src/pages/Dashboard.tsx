// =============================================================
// PAGE DASHBOARD - Panneau de contrôle principal
// =============================================================
// C'est la page principale. Le streameur la garde ouverte pendant
// son stream pour contrôler les défis en temps réel.
// =============================================================

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Play, Square, Shuffle, Trophy, Target, XCircle, SkipForward } from 'lucide-react'
import { api } from '../lib/api'
import { useAppState } from '../lib/context'
import { ActiveChallenge } from '../components/ActiveChallenge'
import { PendingChallengeCard } from '../components/ChallengeCard'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'

export function Dashboard() {
  const { appState } = useAppState()
  const { session, activeChallenge, pendingChallenges, completedCount, failedCount, skippedCount, votes } = appState
  const qc = useQueryClient()

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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>

        {/* Contrôles de session */}
        {!session ? (
          <Button onClick={() => startMut.mutate()} disabled={startMut.isPending}>
            <Play className="w-4 h-4" />
            Démarrer la session
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="purple"
              onClick={() => spinMut.mutate()}
              disabled={spinMut.isPending || pendingChallenges.length === 0}
              title="Activer un défi aléatoire parmi les défis en attente"
            >
              <Shuffle className="w-4 h-4" />
              Aléatoire
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirm('Terminer la session ? Le score sera sauvegardé.')) {
                  endMut.mutate()
                }
              }}
              disabled={endMut.isPending}
            >
              <Square className="w-4 h-4" />
              Terminer la session
            </Button>
          </div>
        )}
      </div>

      {/* Pas de session : message d'accueil */}
      {!session && (
        <Card className="text-center">
          <CardContent className="py-12">
            <div className="text-5xl mb-4">🎮</div>
            <h2 className="text-xl font-bold text-white mb-2">Prêt à streamer ?</h2>
            <p className="text-fortnite-muted text-sm max-w-md mx-auto">
              Clique sur "Démarrer la session" pour lancer une nouvelle session de défis.
              Tous tes défis seront chargés automatiquement.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Session en cours */}
      {session && (
        <>
          {/* Stats de la session */}
          <div className="grid grid-cols-4 gap-3">
            <StatCard
              icon={<Trophy className="w-5 h-5 text-fortnite-yellow" />}
              label="Points"
              value={totalPoints}
              color="text-fortnite-yellow"
            />
            <StatCard
              icon={<Target className="w-5 h-5 text-green-400" />}
              label="Complétés"
              value={completedCount}
              color="text-green-400"
            />
            <StatCard
              icon={<XCircle className="w-5 h-5 text-red-400" />}
              label="Échoués"
              value={failedCount}
              color="text-red-400"
            />
            <StatCard
              icon={<SkipForward className="w-5 h-5 text-yellow-400" />}
              label="Passés"
              value={skippedCount}
              color="text-yellow-400"
            />
          </div>

          {/* Défi actif */}
          <div>
            <h2 className="text-xs font-semibold text-fortnite-muted uppercase tracking-wider mb-3">
              Défi en cours
            </h2>
            <ActiveChallenge />
          </div>

          {/* Queue des défis en attente */}
          {pendingChallenges.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-fortnite-muted uppercase tracking-wider">
                  Défis en attente ({pendingChallenges.length})
                </h2>
                <span className="text-xs text-fortnite-muted">
                  Clique pour activer
                </span>
              </div>
              <div className="space-y-2">
                {pendingChallenges.map((sc) => (
                  <PendingChallengeCard
                    key={sc.id}
                    sc={sc}
                    votes={votes}
                    onActivate={(id) => activateMut.mutate(id)}
                    isLoading={activateMut.isPending}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Plus aucun défi */}
          {pendingChallenges.length === 0 && !activeChallenge && (
            <Card className="text-center border-dashed">
              <CardContent className="py-8">
                <div className="text-3xl mb-2">🏆</div>
                <div className="text-white font-medium">Tous les défis sont terminés !</div>
                <div className="text-fortnite-muted text-sm mt-1">
                  Score final : {totalPoints} points
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

// --- COMPOSANT INTERNE : carte de statistique ---
function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode
  label: string
  value: number
  color: string
}) {
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <div className="flex justify-center mb-1">{icon}</div>
        <div className={`text-2xl font-bold ${color}`}>{value}</div>
        <div className="text-xs text-fortnite-muted mt-0.5">{label}</div>
      </CardContent>
    </Card>
  )
}
