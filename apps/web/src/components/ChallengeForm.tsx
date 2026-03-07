// =============================================================
// FORMULAIRE DE DÉFI
// =============================================================
// Utilisé pour créer et modifier les défis.
// =============================================================

import { useState } from 'react'
import type { Challenge, ChallengeCategory, ChallengeDifficulty } from '@challenge-hub/shared'
import { CATEGORY_LABELS, DIFFICULTY_LABELS } from '@challenge-hub/shared'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Label } from './ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'

type FormData = {
  title: string
  description: string
  category: ChallengeCategory
  difficulty: ChallengeDifficulty
  timerSeconds: number | null
}

interface ChallengeFormProps {
  initial?: Partial<Challenge>
  onSubmit: (data: FormData) => void
  onCancel: () => void
  isLoading: boolean
}

export function ChallengeForm({ initial, onSubmit, onCancel, isLoading }: ChallengeFormProps) {
  const [form, setForm] = useState<FormData>({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    category: initial?.category ?? 'custom',
    difficulty: initial?.difficulty ?? 'medium',
    timerSeconds: initial?.timerSeconds ?? null,
  })

  const [hasTimer, setHasTimer] = useState(initial?.timerSeconds != null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ ...form, timerSeconds: hasTimer ? form.timerSeconds : null })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Titre */}
      <div className="space-y-1.5">
        <Label htmlFor="title">
          Titre <span className="text-red-400">*</span>
        </Label>
        <Input
          id="title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Ex: Victoire Royale, Triple Élimination..."
          required
          maxLength={100}
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="description">
          Description{' '}
          <span className="text-fortnite-muted/60 text-xs">(optionnel)</span>
        </Label>
        <Textarea
          id="description"
          rows={2}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Règles détaillées du défi..."
          maxLength={500}
        />
      </div>

      {/* Catégorie + Difficulté */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Catégorie</Label>
          <Select
            value={form.category}
            onValueChange={(v) => setForm({ ...form, category: v as ChallengeCategory })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Difficulté</Label>
          <Select
            value={form.difficulty}
            onValueChange={(v) => setForm({ ...form, difficulty: v as ChallengeDifficulty })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(DIFFICULTY_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Timer (optionnel) */}
      <div className="space-y-2">
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={hasTimer}
            onChange={(e) => setHasTimer(e.target.checked)}
            className="w-4 h-4 rounded border-fortnite-border bg-fortnite-darker accent-fortnite-yellow"
          />
          <span className="text-sm text-fortnite-muted">Ajouter un timer</span>
        </label>

        {hasTimer && (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              className="w-28"
              value={form.timerSeconds ?? 120}
              onChange={(e) =>
                setForm({ ...form, timerSeconds: parseInt(e.target.value) || 60 })
              }
              min={30}
              max={3600}
              step={30}
            />
            <span className="text-sm text-fortnite-muted">
              secondes ({Math.floor((form.timerSeconds ?? 120) / 60)} min{' '}
              {(form.timerSeconds ?? 120) % 60}s)
            </span>
          </div>
        )}
      </div>

      {/* Boutons */}
      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          disabled={isLoading || !form.title}
          className="flex-1"
        >
          {isLoading ? 'Enregistrement...' : initial?.id ? 'Modifier' : 'Ajouter le défi'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </form>
  )
}
