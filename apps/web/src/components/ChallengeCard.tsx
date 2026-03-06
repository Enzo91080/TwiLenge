// =============================================================
// COMPOSANT CARTE DE DÉFI
// =============================================================
// Variante "pending" : dans la queue de session (Dashboard).
// Variante "manage"  : dans la page de gestion des défis.
// =============================================================

import { Timer, Users, Pencil, Trash2 } from 'lucide-react'
import { cn, difficultyColor, categoryColor, formatTime } from '../lib/utils'
import { CATEGORY_LABELS, DIFFICULTY_LABELS } from '@challenge-hub/shared'
import type { Challenge, SessionChallenge } from '@challenge-hub/shared'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'

// --- CARTE DANS LA QUEUE (session en cours) ---

interface PendingCardProps {
  sc: SessionChallenge
  votes: Record<number, number>
  onActivate: (id: number) => void
  isLoading: boolean
}

export function PendingChallengeCard({ sc, votes, onActivate, isLoading }: PendingCardProps) {
  const c = sc.challenge
  const voteCount = votes[sc.id] ?? 0

  return (
    <Card
      className={cn(
        'cursor-pointer hover:border-fortnite-yellow/30 hover:bg-fortnite-yellow/5 transition-all duration-150 group',
      )}
      onClick={() => !isLoading && onActivate(sc.id)}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <span className={cn('badge border text-xs', categoryColor(c.category))}>
                {CATEGORY_LABELS[c.category]}
              </span>
              <span className={cn('badge border text-xs', difficultyColor(c.difficulty))}>
                {DIFFICULTY_LABELS[c.difficulty]}
              </span>
            </div>
            <div className="text-sm font-medium text-white truncate group-hover:text-fortnite-yellow transition-colors">
              {c.title}
            </div>
          </div>

          {/* Votes du chat */}
          {voteCount > 0 && (
            <div className="flex items-center gap-1 text-purple-400">
              <Users className="w-3.5 h-3.5" />
              <span className="text-xs font-bold">{voteCount}</span>
            </div>
          )}

          {/* Timer */}
          {c.timerSeconds && (
            <div className="flex items-center gap-1 text-blue-400 shrink-0">
              <Timer className="w-3.5 h-3.5" />
              <span className="text-xs">{formatTime(c.timerSeconds)}</span>
            </div>
          )}

          {/* Points */}
          <div className="text-fortnite-yellow font-bold text-sm shrink-0">{c.points} pts</div>
        </div>
      </CardContent>
    </Card>
  )
}

// --- CARTE DANS LA PAGE DE GESTION ---

interface ManageCardProps {
  challenge: Challenge
  onEdit: (challenge: Challenge) => void
  onDelete: (id: number) => void
}

export function ManageChallengeCard({ challenge: c, onEdit, onDelete }: ManageCardProps) {
  return (
    <Card className="group hover:border-fortnite-border/80 transition-colors">
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          {/* Poignée de drag (visuelle) */}
          <div className="text-fortnite-border group-hover:text-fortnite-muted mt-0.5 cursor-grab select-none text-lg leading-none">
            ⠿
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <span className={cn('badge border', categoryColor(c.category))}>
                {CATEGORY_LABELS[c.category]}
              </span>
              <span className={cn('badge border', difficultyColor(c.difficulty))}>
                {DIFFICULTY_LABELS[c.difficulty]}
              </span>
              {c.timerSeconds && (
                <Badge variant="blue">
                  <Timer className="w-3 h-3 mr-1" />
                  {formatTime(c.timerSeconds)}
                </Badge>
              )}
            </div>
            <div className="font-medium text-white">{c.title}</div>
            {c.description && (
              <div className="text-xs text-fortnite-muted mt-0.5 line-clamp-2">{c.description}</div>
            )}
          </div>

          {/* Points */}
          <div className="text-fortnite-yellow font-bold shrink-0">{c.points} pts</div>

          {/* Actions */}
          <div className="flex gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(c)}
              title="Modifier"
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(c.id)}
              title="Supprimer"
              className="text-red-400/60 hover:text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
