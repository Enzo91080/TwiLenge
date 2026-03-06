// =============================================================
// PAGE HISTORIQUE
// =============================================================
// Affiche toutes les sessions passées avec leurs défis et scores.
// =============================================================

import { useQuery } from '@tanstack/react-query'
import { Trophy, CheckCircle, XCircle, SkipForward, ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { api } from '../lib/api'
import { formatDate, statusColor, cn } from '../lib/utils'
import { STATUS_LABELS } from '@challenge-hub/shared'
import type { Session, SessionChallenge } from '@challenge-hub/shared'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'

export function History() {
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['history'],
    queryFn: api.history.list,
  })

  const ended = sessions.filter((s) => s.endedAt)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Historique</h1>
        <p className="text-sm text-fortnite-muted mt-0.5">{ended.length} session(s) terminée(s)</p>
      </div>

      {isLoading ? (
        <div className="text-center text-fortnite-muted py-12">Chargement...</div>
      ) : ended.length === 0 ? (
        <Card className="text-center border-dashed">
          <CardContent className="py-12">
            <div className="text-3xl mb-3">📊</div>
            <div className="text-white font-medium">Aucune session terminée</div>
            <div className="text-fortnite-muted text-sm mt-1">
              Lance une session depuis le Dashboard et termine-la pour voir l'historique.
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {ended.map((session) => (
            <SessionRow
              key={session.id}
              session={session}
              challenges={session.challenges}
              isExpanded={expandedId === session.id}
              onToggle={() => setExpandedId(expandedId === session.id ? null : session.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// --- COMPOSANT INTERNE : ligne de session ---
function SessionRow({
  session,
  challenges,
  isExpanded,
  onToggle,
}: {
  session: Session
  challenges: SessionChallenge[]
  isExpanded: boolean
  onToggle: () => void
}) {
  const completed = challenges.filter((c) => c.status === 'completed')
  const failed = challenges.filter((c) => c.status === 'failed')
  const skipped = challenges.filter((c) => c.status === 'skipped')

  const duration = session.endedAt
    ? Math.round((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 60000)
    : null

  return (
    <Card>
      <CardContent className="p-4">
        {/* En-tête de session (cliquable pour expand) */}
        <button
          className="w-full flex items-center justify-between gap-4 text-left"
          onClick={onToggle}
        >
          <div className="flex items-center gap-3">
            {isExpanded
              ? <ChevronDown className="w-4 h-4 text-fortnite-muted shrink-0" />
              : <ChevronRight className="w-4 h-4 text-fortnite-muted shrink-0" />
            }
            <div>
              <div className="font-semibold text-white">Session #{session.id}</div>
              <div className="text-xs text-fortnite-muted">
                {formatDate(session.startedAt)}
                {duration !== null && ` • ${duration} min`}
              </div>
            </div>
          </div>

          {/* Stats rapides */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="flex items-center gap-1.5 text-green-400">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">{completed.length}</span>
            </div>
            <div className="flex items-center gap-1.5 text-red-400">
              <XCircle className="w-4 h-4" />
              <span className="text-sm font-medium">{failed.length}</span>
            </div>
            <div className="flex items-center gap-1.5 text-yellow-400">
              <SkipForward className="w-4 h-4" />
              <span className="text-sm font-medium">{skipped.length}</span>
            </div>
            <div className="flex items-center gap-1.5 text-fortnite-yellow">
              <Trophy className="w-4 h-4" />
              <span className="text-sm font-bold">{session.totalPoints} pts</span>
            </div>
          </div>
        </button>

        {/* Détail des défis (collapse) */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-fortnite-border space-y-2">
            {challenges.map((sc) => (
              <div
                key={sc.id}
                className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg bg-fortnite-darker"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{sc.challenge.title}</div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={cn('badge', statusColor(sc.status))}>
                    {STATUS_LABELS[sc.status]}
                  </span>
                  {sc.pointsEarned > 0 && (
                    <span className="text-fortnite-yellow text-sm font-medium">
                      +{sc.pointsEarned} pts
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
