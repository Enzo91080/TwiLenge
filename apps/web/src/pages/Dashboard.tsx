// =============================================================
// PAGE DASHBOARD - Panneau de controle principal
// =============================================================
// C'est la page principale. Le streamer la garde ouverte pendant
// son stream pour controler les defis en temps reel.
// =============================================================

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Play, Square, Shuffle, Trophy, Target, XCircle, SkipForward } from 'lucide-react'
import { api } from '../lib/api'
import { useAppState } from '../lib/context'
import { ActiveChallenge } from '../components/ActiveChallenge'
import { PendingChallengeCard } from '../components/ChallengeCard'

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

  const totalChallenges = completedCount + failedCount + skippedCount + pendingChallenges.length + (activeChallenge ? 1 : 0)
  const totalPoints = session?.totalPoints ?? 0

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>

        {/* Controles de session */}
        {!session ? (
          <button
            onClick={() => startMut.mutate()}
            disabled={startMut.isPending}
            className="btn-primary"
          >
            <Play className="w-4 h-4" />
            Demarrer la session
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => spinMut.mutate()}
              disabled={spinMut.isPending || pendingChallenges.length === 0}
              className="btn bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30"
              title="Activer un defi aleatoire parmi les defis en attente"
            >
              <Shuffle className="w-4 h-4" />
              Aleatoire
            </button>
            <button
              onClick={() => {
                if (confirm('Terminer la session ? Le score sera sauvegarde.')) {
                  endMut.mutate()
                }
              }}
              disabled={endMut.isPending}
              className="btn-danger"
            >
              <Square className="w-4 h-4" />
              Terminer la session
            </button>
          </div>
        )}
      </div>

      {/* Pas de session : message d'accueil */}
      {!session && (
        <div className="card text-center py-12">
          <div className="text-5xl mb-4">🎮</div>
          <h2 className="text-xl font-bold text-white mb-2">Pret a streamer ?</h2>
          <p className="text-fortnite-muted text-sm max-w-md mx-auto">
            Clique sur "Demarrer la session" pour lancer une nouvelle session de defis.
            Tous tes defis seront charges automatiquement.
          </p>
        </div>
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
              label="Completes"
              value={completedCount}
              color="text-green-400"
            />
            <StatCard
              icon={<XCircle className="w-5 h-5 text-red-400" />}
              label="Echoues"
              value={failedCount}
              color="text-red-400"
            />
            <StatCard
              icon={<SkipForward className="w-5 h-5 text-yellow-400" />}
              label="Passes"
              value={skippedCount}
              color="text-yellow-400"
            />
          </div>

          {/* Defi actif */}
          <div>
            <h2 className="text-sm font-medium text-fortnite-muted uppercase tracking-wider mb-3">
              Defi en cours
            </h2>
            <ActiveChallenge />
          </div>

          {/* Queue des defis en attente */}
          {pendingChallenges.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-medium text-fortnite-muted uppercase tracking-wider">
                  Defis en attente ({pendingChallenges.length})
                </h2>
                <span className="text-xs text-fortnite-muted">
                  Clique sur un defi pour l'activer
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

          {/* Plus aucun defi */}
          {pendingChallenges.length === 0 && !activeChallenge && (
            <div className="card text-center py-8 border-dashed">
              <div className="text-3xl mb-2">🏆</div>
              <div className="text-white font-medium">Tous les defis sont termines !</div>
              <div className="text-fortnite-muted text-sm mt-1">
                Score final : {totalPoints} points
              </div>
            </div>
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
    <div className="card text-center">
      <div className="flex justify-center mb-1">{icon}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-fortnite-muted mt-0.5">{label}</div>
    </div>
  )
}
