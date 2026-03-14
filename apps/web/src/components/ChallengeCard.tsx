// =============================================================
// COMPOSANT CARTE DE DÉFI
// =============================================================
// Variante "pending" : dans la queue de session (Dashboard).
// Variante "manage"  : dans la page de gestion des défis.
// =============================================================

import { Timer, Users, Pencil, Trash2 } from 'lucide-react'
import { cn, difficultyColor, formatTime } from '../lib/utils'
import { DIFFICULTY_LABELS } from '@challenge-hub/shared'
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
  position?: number
}

export function PendingChallengeCard({ sc, votes, onActivate, isLoading, position }: PendingCardProps) {
  const c = sc.challenge
  const voteCount = votes[sc.id] ?? 0

  return (
    <Card
      className="cursor-pointer hover:border-fortnite-yellow/30 hover:bg-fortnite-yellow/5 transition-all duration-150 group"
      onClick={() => !isLoading && onActivate(sc.id)}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          {/* Numéro de position */}
          {position !== undefined && (
            <div className="shrink-0 w-6 h-6 rounded-full bg-fortnite-darker border border-fortnite-border text-fortnite-muted/60 text-xs font-bold flex items-center justify-center tabular-nums">
              {position}
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <span className={cn('badge border text-xs mb-1', difficultyColor(c.difficulty))}>
              {DIFFICULTY_LABELS[c.difficulty]}
            </span>
            <div className="text-sm text-fortnite-muted truncate group-hover:text-white transition-colors">
              {c.description || '—'}
            </div>
          </div>

          {/* Votes du chat */}
          {voteCount > 0 && (
            <div className="flex items-center gap-1 text-purple-400 shrink-0">
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

const DIFFICULTY_DOT: Record<string, string> = {
  easy: 'bg-green-400',
  medium: 'bg-yellow-400',
  hard: 'bg-red-400',
}

const DIFFICULTY_BG: Record<string, string> = {
  easy: 'hover:border-green-500/20',
  medium: 'hover:border-yellow-500/20',
  hard: 'hover:border-red-500/20',
}

export function ManageChallengeCard({ challenge: c, onEdit, onDelete }: ManageCardProps) {
  return (
    <div
      className={cn(
        'group flex items-start gap-3 p-3.5 rounded-xl border border-fortnite-border bg-fortnite-card transition-all duration-150',
        DIFFICULTY_BG[c.difficulty],
        'hover:bg-white/[0.02]',
      )}
    >
      {/* Indicateur difficulté */}
      <div className="mt-1.5 shrink-0">
        <div className={cn('w-2 h-2 rounded-full', DIFFICULTY_DOT[c.difficulty])} />
      </div>

      {/* Description */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white leading-snug line-clamp-2">
          {c.description || <span className="text-fortnite-muted italic">Sans description</span>}
        </p>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className={cn('text-xs font-medium', difficultyColor(c.difficulty))}>
            {DIFFICULTY_LABELS[c.difficulty]}
          </span>
          {c.timerSeconds && (
            <>
              <span className="text-fortnite-border">·</span>
              <span className="flex items-center gap-1 text-xs text-blue-400">
                <Timer className="w-3 h-3" />
                {formatTime(c.timerSeconds)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Actions — visibles au hover */}
      <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(c)}
          title="Modifier"
          className="h-7 w-7 text-fortnite-muted hover:text-white"
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(c.id)}
          title="Supprimer"
          className="h-7 w-7 text-fortnite-muted/50 hover:text-red-400 hover:bg-red-500/10"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  )
}
