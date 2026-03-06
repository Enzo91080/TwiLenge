// =============================================================
// COMPOSANT CARTE DE DEFI
// =============================================================
// Affiche un defi dans la liste (dashboard ou page Defis).
// Variante "pending" : affiche dans la queue de session.
// Variante "manage"  : affiche dans la page de gestion.
// =============================================================

import { Timer, Users } from 'lucide-react'
import { cn, difficultyColor, categoryColor, formatTime } from '../lib/utils'
import { CATEGORY_LABELS, DIFFICULTY_LABELS } from '@challenge-hub/shared'
import type { Challenge, SessionChallenge } from '@challenge-hub/shared'

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
    <div
      className={cn(
        'card cursor-pointer hover:border-fortnite-yellow/30 transition-all duration-150',
        'hover:bg-fortnite-yellow/5 group',
      )}
      onClick={() => !isLoading && onActivate(sc.id)}
    >
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
    </div>
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
    <div className="card group hover:border-fortnite-border/80 transition-colors">
      <div className="flex items-start gap-3">
        {/* Icone de drag (visuelle seulement, le drag est gere par le parent) */}
        <div className="text-fortnite-border group-hover:text-fortnite-muted mt-0.5 cursor-grab">
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
              <span className="badge border text-blue-400 bg-blue-400/10 border-blue-400/20">
                <Timer className="w-3 h-3 mr-1" />
                {formatTime(c.timerSeconds)}
              </span>
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
          <button
            onClick={() => onEdit(c)}
            className="btn-ghost p-1.5 rounded"
            title="Modifier"
          >
            ✏️
          </button>
          <button
            onClick={() => onDelete(c.id)}
            className="btn-ghost p-1.5 rounded text-red-400/60 hover:text-red-400"
            title="Supprimer"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  )
}
