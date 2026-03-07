// =============================================================
// PAGE HISTORIQUE
// =============================================================

import { useQuery } from '@tanstack/react-query'
import { CheckCircle, XCircle, SkipForward, ChevronDown, ChevronRight, BarChart3 } from 'lucide-react'
import { useState } from 'react'
import { api } from '../lib/api'
import { formatDate, statusColor, cn } from '../lib/utils'
import { STATUS_LABELS } from '@challenge-hub/shared'
import type { Session, SessionChallenge } from '@challenge-hub/shared'
import { Card, CardContent } from '../components/ui/card'

export function History() {
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['history'],
    queryFn: api.history.list,
  })

  const ended = sessions.filter((s) => s.endedAt)

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-white">Historique</h1>
        <p className="text-sm text-fortnite-muted mt-0.5">{ended.length} session(s) terminée(s)</p>
      </div>

      {isLoading ? (
        <div className="text-center text-fortnite-muted py-16">
          <div className="text-3xl mb-3 animate-pulse">📊</div>
          Chargement...
        </div>
      ) : ended.length === 0 ? (
        <Card className="text-center border-dashed">
          <CardContent className="py-14">
            <div className="w-12 h-12 rounded-xl bg-fortnite-border/30 flex items-center justify-center mx-auto mb-3">
              <BarChart3 className="w-6 h-6 text-fortnite-muted/50" />
            </div>
            <div className="text-white font-medium">Aucune session terminée</div>
            <div className="text-fortnite-muted text-sm mt-1 max-w-xs mx-auto">
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

function SessionRow({
  session, challenges, isExpanded, onToggle,
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
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* En-tête cliquable */}
        <button
          className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-white/3 transition-colors"
          onClick={onToggle}
        >
          <div className="flex items-center gap-3 min-w-0">
            {isExpanded
              ? <ChevronDown className="w-4 h-4 text-fortnite-muted shrink-0" />
              : <ChevronRight className="w-4 h-4 text-fortnite-muted shrink-0" />
            }
            <div className="min-w-0">
              <div className="font-semibold text-white text-sm">Session #{session.id}</div>
              <div className="text-xs text-fortnite-muted truncate">
                {formatDate(session.startedAt)}
                {duration !== null && ` · ${duration} min`}
              </div>
            </div>
          </div>

          {/* Stats rapides — icônes + chiffres */}
          <div className="flex items-center gap-3 shrink-0 text-sm">
            <span className="flex items-center gap-1 text-green-400">
              <CheckCircle className="w-3.5 h-3.5" />
              <span className="font-medium">{completed.length}</span>
            </span>
            <span className="flex items-center gap-1 text-red-400">
              <XCircle className="w-3.5 h-3.5" />
              <span className="font-medium">{failed.length}</span>
            </span>
            <span className="flex items-center gap-1 text-yellow-400">
              <SkipForward className="w-3.5 h-3.5" />
              <span className="font-medium">{skipped.length}</span>
            </span>
            {/* Taux de complétion */}
            {(completed.length + failed.length + skipped.length) > 0 && (
              <span className="hidden sm:flex items-center gap-1 pl-1 border-l border-fortnite-border text-xs font-semibold text-white tabular-nums">
                {Math.round(completed.length / (completed.length + failed.length + skipped.length) * 100)}%
              </span>
            )}
          </div>
        </button>

        {/* Détail des défis */}
        {isExpanded && (
          <div className="border-t border-fortnite-border">
            {challenges.map((sc, i) => (
              <div
                key={sc.id}
                className={cn(
                  'flex items-center justify-between gap-3 px-4 py-2.5 text-sm',
                  i > 0 && 'border-t border-fortnite-border/50',
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-white truncate">{sc.challenge.title}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn('badge text-xs', statusColor(sc.status))}>
                    {STATUS_LABELS[sc.status]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
