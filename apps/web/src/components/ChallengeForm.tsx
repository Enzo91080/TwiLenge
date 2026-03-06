// =============================================================
// FORMULAIRE DE DEFI
// =============================================================
// Utilise pour creer et modifier les defis.
// Les champs sont documentes avec des placeholders explicites.
// =============================================================

import { useState } from 'react'
import type { Challenge, ChallengeCategory, ChallengeDifficulty } from '@challenge-hub/shared'
import { CATEGORY_LABELS, DIFFICULTY_LABELS } from '@challenge-hub/shared'

type FormData = {
  title: string
  description: string
  category: ChallengeCategory
  difficulty: ChallengeDifficulty
  points: number
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
    points: initial?.points ?? 100,
    timerSeconds: initial?.timerSeconds ?? null,
  })

  const [hasTimer, setHasTimer] = useState(initial?.timerSeconds != null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      ...form,
      timerSeconds: hasTimer ? form.timerSeconds : null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Titre du defi */}
      <div>
        <label className="block text-sm text-fortnite-muted mb-1">
          Titre <span className="text-red-400">*</span>
        </label>
        <input
          className="input"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Ex: Victoire Royale, Triple Elimination..."
          required
          maxLength={100}
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm text-fortnite-muted mb-1">
          Description <span className="text-fortnite-muted/60 text-xs">(optionnel)</span>
        </label>
        <textarea
          className="input resize-none"
          rows={2}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Regles detaillees du defi..."
          maxLength={500}
        />
      </div>

      {/* Categorie + Difficulte sur la meme ligne */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-fortnite-muted mb-1">Categorie</label>
          <select
            className="input"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value as ChallengeCategory })}
          >
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-fortnite-muted mb-1">Difficulte</label>
          <select
            className="input"
            value={form.difficulty}
            onChange={(e) => setForm({ ...form, difficulty: e.target.value as ChallengeDifficulty })}
          >
            {Object.entries(DIFFICULTY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Points */}
      <div>
        <label className="block text-sm text-fortnite-muted mb-1">
          Points attribues a la completion
        </label>
        <input
          type="number"
          className="input"
          value={form.points}
          onChange={(e) => setForm({ ...form, points: parseInt(e.target.value) || 0 })}
          min={0}
          max={9999}
          step={50}
        />
      </div>

      {/* Timer (optionnel) */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer mb-2">
          <input
            type="checkbox"
            checked={hasTimer}
            onChange={(e) => setHasTimer(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-fortnite-muted">Ajouter un timer</span>
        </label>

        {hasTimer && (
          <div className="flex items-center gap-2">
            <input
              type="number"
              className="input w-28"
              value={form.timerSeconds ?? 120}
              onChange={(e) => setForm({ ...form, timerSeconds: parseInt(e.target.value) || 60 })}
              min={30}
              max={3600}
              step={30}
            />
            <span className="text-sm text-fortnite-muted">
              secondes ({Math.floor((form.timerSeconds ?? 120) / 60)} min {(form.timerSeconds ?? 120) % 60}s)
            </span>
          </div>
        )}
      </div>

      {/* Boutons */}
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={isLoading || !form.title} className="btn-primary flex-1">
          {isLoading ? 'Enregistrement...' : initial?.id ? 'Modifier' : 'Ajouter le defi'}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost">
          Annuler
        </button>
      </div>
    </form>
  )
}
