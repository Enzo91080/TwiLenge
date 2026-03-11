// Couleurs partagées entre tous les styles d'overlay

import type { ChallengeCategory, ChallengeDifficulty } from '@challenge-hub/shared'

export const CATEGORY_COLORS: Record<ChallengeCategory, string> = {
  elimination: '#EF4444',
  placement:   '#3B82F6',
  loadout:     '#A855F7',
  chaos:       '#F97316',
  custom:      '#F0C540',
}

export const DIFFICULTY_COLORS: Record<ChallengeDifficulty, string> = {
  easy:   '#22C55E',
  medium: '#EAB308',
  hard:   '#EF4444',
}

export function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}
