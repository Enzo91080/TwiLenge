import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ChallengeDifficulty, ChallengeCategory, ChallengeStatus } from '@challenge-hub/shared'

// Helper pour combiner des classes Tailwind sans conflits
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Formate des secondes en mm:ss
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// Retourne la couleur Tailwind associee a une difficulte
export function difficultyColor(difficulty: ChallengeDifficulty): string {
  switch (difficulty) {
    case 'easy':   return 'text-green-400 bg-green-400/10 border-green-400/20'
    case 'medium': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
    case 'hard':   return 'text-red-400 bg-red-400/10 border-red-400/20'
  }
}

// Retourne la couleur associee a une categorie
export function categoryColor(category: ChallengeCategory): string {
  switch (category) {
    case 'elimination': return 'text-red-400 bg-red-400/10 border-red-400/20'
    case 'placement':   return 'text-blue-400 bg-blue-400/10 border-blue-400/20'
    case 'loadout':     return 'text-purple-400 bg-purple-400/10 border-purple-400/20'
    case 'chaos':       return 'text-orange-400 bg-orange-400/10 border-orange-400/20'
    case 'custom':      return 'text-gray-400 bg-gray-400/10 border-gray-400/20'
  }
}

// Retourne la couleur associee a un statut
export function statusColor(status: ChallengeStatus): string {
  switch (status) {
    case 'completed': return 'text-green-400 bg-green-400/10'
    case 'failed':    return 'text-red-400 bg-red-400/10'
    case 'skipped':   return 'text-yellow-400 bg-yellow-400/10'
    case 'active':    return 'text-blue-400 bg-blue-400/10'
    case 'pending':   return 'text-gray-400 bg-gray-400/10'
  }
}

// Formate une date ISO en format lisible
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
