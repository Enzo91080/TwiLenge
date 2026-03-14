// =============================================================
// PAGE TOP VIEWERS — Classement des viewers Channel Points
// =============================================================

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Trophy, Zap, CheckCircle2, XCircle, Crown } from 'lucide-react'
import { api } from '../lib/api'
import { useAppState } from '../lib/context'
import { Card, CardContent } from '../components/ui/card'
import { cn } from '../lib/utils'
import type { Redemption } from '@challenge-hub/shared'

type Filter = 'session' | 'all'

interface ViewerStats {
  userName: string
  total: number
  success: number
  lastChallenge: string | null
}

function aggregateRedemptions(redemptions: Redemption[]): ViewerStats[] {
  const map = new Map<string, ViewerStats>()
  for (const r of redemptions) {
    const existing = map.get(r.userName)
    if (existing) {
      existing.total++
      if (r.success) {
        existing.success++
        existing.lastChallenge = r.challengeDescription
      }
    } else {
      map.set(r.userName, {
        userName: r.userName,
        total: 1,
        success: r.success ? 1 : 0,
        lastChallenge: r.success ? r.challengeDescription : null,
      })
    }
  }
  return [...map.values()].sort((a, b) => b.total - a.total || b.success - a.success)
}

export function TopViewers() {
  const { appState } = useAppState()
  const { session } = appState
  const [filter, setFilter] = useState<Filter>(session ? 'session' : 'all')

  const { data: redemptions = [], isLoading } = useQuery({
    queryKey: ['redemptions', filter === 'session' ? session?.id : 'all'],
    queryFn: () => api.redemptions.list(filter === 'session' ? session?.id : undefined),
  })

  const viewers = aggregateRedemptions(redemptions)

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">Top Viewers</h1>
          <p className="text-sm text-fortnite-muted mt-0.5">
            Viewers ayant dépensé des Channel Points
          </p>
        </div>

        {/* Filtre session / global */}
        <div className="flex gap-1 p-1 rounded-lg bg-fortnite-darker border border-fortnite-border">
          <FilterBtn active={filter === 'session'} onClick={() => setFilter('session')} disabled={!session}>
            Session
          </FilterBtn>
          <FilterBtn active={filter === 'all'} onClick={() => setFilter('all')}>
            Tout
          </FilterBtn>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center text-fortnite-muted py-16">
          <div className="w-10 h-10 rounded-xl bg-fortnite-border/30 flex items-center justify-center mx-auto mb-3 animate-pulse">
            <Trophy className="w-5 h-5 text-fortnite-muted/50" />
          </div>
          Chargement...
        </div>
      ) : viewers.length === 0 ? (
        <Card className="text-center border-dashed">
          <CardContent className="py-14">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mx-auto mb-3">
              <Zap className="w-6 h-6 text-purple-400/50" />
            </div>
            <div className="text-white font-medium">Aucun rachat</div>
            <div className="text-fortnite-muted text-sm mt-1 max-w-xs mx-auto">
              {filter === 'session' && !session
                ? 'Lance une session pour commencer à tracer les rachats.'
                : 'Les rachats Channel Points apparaîtront ici dès qu\'un viewer dépense des points.'}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {viewers.map((viewer, index) => (
            <ViewerRow key={viewer.userName} viewer={viewer} rank={index + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

function ViewerRow({ viewer, rank }: { viewer: ViewerStats; rank: number }) {
  const rate = viewer.total > 0 ? Math.round((viewer.success / viewer.total) * 100) : 0

  return (
    <Card className={cn(
      'overflow-hidden transition-colors',
      rank === 1 && 'border-fortnite-yellow/30 bg-fortnite-yellow/3',
      rank === 2 && 'border-white/10',
      rank === 3 && 'border-orange-500/20',
    )}>
      <CardContent className="p-3 md:p-4">
        <div className="flex items-center gap-3">
          {/* Rang */}
          <div className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0',
            rank === 1 && 'bg-fortnite-yellow/15 text-fortnite-yellow',
            rank === 2 && 'bg-white/8 text-white/70',
            rank === 3 && 'bg-orange-500/15 text-orange-400',
            rank > 3 && 'bg-fortnite-border/50 text-fortnite-muted',
          )}>
            {rank <= 3 ? <Crown className="w-4 h-4" /> : rank}
          </div>

          {/* Nom + dernier défi */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white text-sm">{viewer.userName}</span>
              {rank === 1 && (
                <span className="text-xs font-medium text-fortnite-yellow bg-fortnite-yellow/10 px-1.5 py-0.5 rounded">
                  #1
                </span>
              )}
            </div>
            {viewer.lastChallenge && (
              <div className="text-xs text-fortnite-muted truncate mt-0.5">
                Dernier : {viewer.lastChallenge}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right hidden sm:block">
              <div className="flex items-center justify-end gap-2 text-xs">
                <span className="flex items-center gap-1 text-green-400">
                  <CheckCircle2 className="w-3 h-3" />
                  {viewer.success}
                </span>
                <span className="flex items-center gap-1 text-red-400">
                  <XCircle className="w-3 h-3" />
                  {viewer.total - viewer.success}
                </span>
              </div>
              {/* Barre taux de succès */}
              <div className="w-20 h-1 bg-fortnite-border rounded-full mt-1.5 overflow-hidden">
                <div
                  className="h-full bg-green-400 rounded-full transition-all"
                  style={{ width: `${rate}%` }}
                />
              </div>
            </div>

            <div className="text-center">
              <div className="text-lg font-bold text-purple-300 tabular-nums leading-none">{viewer.total}</div>
              <div className="text-xs text-fortnite-muted mt-0.5">rachat{viewer.total > 1 ? 's' : ''}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function FilterBtn({
  active, onClick, disabled, children,
}: {
  active: boolean; onClick: () => void; disabled?: boolean; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'px-3 py-1 rounded-md text-xs font-medium transition-colors',
        active
          ? 'bg-fortnite-yellow/15 text-fortnite-yellow'
          : 'text-fortnite-muted hover:text-white',
        disabled && 'opacity-40 cursor-not-allowed',
      )}
    >
      {children}
    </button>
  )
}
