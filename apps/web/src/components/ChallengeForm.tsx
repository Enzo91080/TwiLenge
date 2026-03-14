// =============================================================
// FORMULAIRE DE DÉFI
// =============================================================

import { useState } from 'react'
import type { Challenge, ChallengeDifficulty } from '@challenge-hub/shared'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { Label } from './ui/label'
import { Input } from './ui/input'
import { cn } from '../lib/utils'
import { Timer } from 'lucide-react'

type FormData = {
  title: string
  description: string
  category: 'custom'
  difficulty: ChallengeDifficulty
  timerSeconds: number | null
}

interface ChallengeFormProps {
  initial?: Partial<Challenge>
  onSubmit: (data: FormData) => void
  onCancel: () => void
  isLoading: boolean
}

const DIFFICULTIES: { value: ChallengeDifficulty; label: string; color: string }[] = [
  { value: 'easy',   label: 'Facile',   color: 'border-green-400/60 bg-green-500/10 text-green-400' },
  { value: 'medium', label: 'Moyen',    color: 'border-yellow-400/60 bg-yellow-500/10 text-yellow-400' },
  { value: 'hard',   label: 'Difficile', color: 'border-red-400/60 bg-red-500/10 text-red-400' },
]

export function ChallengeForm({ initial, onSubmit, onCancel, isLoading }: ChallengeFormProps) {
  const [description, setDescription] = useState(initial?.description ?? '')
  const [difficulty, setDifficulty] = useState<ChallengeDifficulty>(initial?.difficulty ?? 'medium')
  const [hasTimer, setHasTimer] = useState(initial?.timerSeconds != null)
  const [timerSeconds, setTimerSeconds] = useState(initial?.timerSeconds ?? 120)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim()) return
    onSubmit({
      title: '',
      description: description.trim(),
      category: 'custom',
      difficulty,
      timerSeconds: hasTimer ? timerSeconds : null,
    })
  }

  const minutes = Math.floor(timerSeconds / 60)
  const seconds = timerSeconds % 60

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="description">
          Description <span className="text-red-400">*</span>
        </Label>
        <Textarea
          id="description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Décris le défi... ex: Faire un Top 1 uniquement au sniper"
          required
          maxLength={500}
          autoFocus
        />
      </div>

      {/* Difficulté */}
      <div className="space-y-1.5">
        <Label>Difficulté</Label>
        <div className="flex gap-2">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => setDifficulty(d.value)}
              className={cn(
                'flex-1 py-1.5 rounded-lg border text-xs font-semibold transition-all',
                difficulty === d.value
                  ? d.color
                  : 'border-fortnite-border bg-fortnite-darker text-fortnite-muted hover:border-fortnite-border/70',
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timer */}
      <div className="space-y-2">
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={hasTimer}
            onChange={(e) => setHasTimer(e.target.checked)}
            className="w-4 h-4 rounded border-fortnite-border bg-fortnite-darker accent-fortnite-yellow"
          />
          <span className="text-sm text-fortnite-muted flex items-center gap-1.5">
            <Timer className="w-3.5 h-3.5" />
            Timer
          </span>
        </label>

        {hasTimer && (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              className="w-28"
              value={timerSeconds}
              onChange={(e) => setTimerSeconds(parseInt(e.target.value) || 60)}
              min={30}
              max={3600}
              step={30}
            />
            <span className="text-sm text-fortnite-muted tabular-nums">
              sec ({minutes}m{seconds > 0 ? ` ${seconds}s` : ''})
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={isLoading || !description.trim()} className="flex-1">
          {isLoading ? 'Enregistrement...' : initial?.id ? 'Enregistrer' : 'Ajouter'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </form>
  )
}
