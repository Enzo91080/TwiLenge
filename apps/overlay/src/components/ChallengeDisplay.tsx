// =============================================================
// COMPOSANT PRINCIPAL DE L'OVERLAY
// =============================================================
// Affiche le defi actif avec son titre, description, timer et points.
// Style inspire Fortnite : fond sombre, bordure jaune, police bold.
// =============================================================

import { Timer } from 'lucide-react'
import type { Challenge, ChallengeCategory, ChallengeDifficulty } from '@challenge-hub/shared'
import { CATEGORY_LABELS, DIFFICULTY_LABELS } from '@challenge-hub/shared'

// Couleurs des badges par categorie
const CATEGORY_COLORS: Record<ChallengeCategory, string> = {
  elimination: '#EF4444',
  placement:   '#3B82F6',
  loadout:     '#A855F7',
  chaos:       '#F97316',
  custom:      '#6B7280',
}

const DIFFICULTY_COLORS: Record<ChallengeDifficulty, string> = {
  easy:   '#22C55E',
  medium: '#EAB308',
  hard:   '#EF4444',
}

interface ChallengeDisplayProps {
  challenge: Challenge
  timerSecondsLeft: number | null
  theme: 'dark' | 'light'
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export function ChallengeDisplay({ challenge: c, timerSecondsLeft, theme }: ChallengeDisplayProps) {
  const isDark = theme === 'dark'
  const isTimerLow = timerSecondsLeft !== null && timerSecondsLeft <= 30

  return (
    <div
      className="animate-pop-in rounded-xl overflow-hidden"
      style={{
        width: '340px',
        background: isDark ? 'rgba(13, 17, 23, 0.92)' : 'rgba(255, 255, 255, 0.95)',
        border: '2px solid #F0C540',
        boxShadow: '0 0 20px rgba(240, 197, 64, 0.2), 0 4px 24px rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Barre de couleur Fortnite en haut */}
      <div style={{ height: '3px', background: 'linear-gradient(90deg, #F0C540, #1565C0)' }} />

      <div className="p-4">
        {/* Badges */}
        <div className="flex items-center gap-2 mb-2.5">
          {/* Badge "DEFI EN COURS" */}
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full tracking-wider"
            style={{ background: '#F0C540', color: '#0D1117' }}
          >
            DEFI EN COURS
          </span>

          {/* Categorie */}
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{
              background: `${CATEGORY_COLORS[c.category]}22`,
              color: CATEGORY_COLORS[c.category],
              border: `1px solid ${CATEGORY_COLORS[c.category]}44`,
            }}
          >
            {CATEGORY_LABELS[c.category]}
          </span>

          {/* Difficulte */}
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{
              background: `${DIFFICULTY_COLORS[c.difficulty]}22`,
              color: DIFFICULTY_COLORS[c.difficulty],
              border: `1px solid ${DIFFICULTY_COLORS[c.difficulty]}44`,
            }}
          >
            {DIFFICULTY_LABELS[c.difficulty]}
          </span>
        </div>

        {/* Titre */}
        <div
          className="text-lg font-bold leading-tight mb-1"
          style={{ color: isDark ? '#FFFFFF' : '#0D1117' }}
        >
          {c.title}
        </div>

        {/* Description */}
        {c.description && (
          <div
            className="text-sm leading-snug mb-3"
            style={{ color: isDark ? '#8B949E' : '#374151' }}
          >
            {c.description}
          </div>
        )}

        {/* Footer : points + timer */}
        <div className="flex items-center justify-between">
          {/* Points */}
          <div>
            <span className="text-2xl font-black" style={{ color: '#F0C540' }}>
              {c.points}
            </span>
            <span className="text-sm ml-1" style={{ color: isDark ? '#8B949E' : '#6B7280' }}>
              pts
            </span>
          </div>

          {/* Timer en cours */}
          {timerSecondsLeft !== null && (
            <div
              className={`flex items-center gap-1.5 font-mono font-bold text-xl ${isTimerLow ? 'animate-timer-pulse' : ''}`}
              style={{ color: isTimerLow ? '#EF4444' : '#F0C540' }}
            >
              <Timer className="w-4 h-4" />
              {formatTime(timerSecondsLeft)}
            </div>
          )}

          {/* Timer du defi (pas encore lance) */}
          {timerSecondsLeft === null && c.timerSeconds && (
            <div
              className="flex items-center gap-1 text-sm"
              style={{ color: isDark ? '#8B949E' : '#6B7280' }}
            >
              <Timer className="w-4 h-4" />
              {formatTime(c.timerSeconds)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
