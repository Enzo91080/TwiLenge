// =============================================================
// PAGE GESTION DES DÉFIS
// =============================================================

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, RotateCcw, Download, Upload, Loader2, List, X } from 'lucide-react'
import { api } from '../lib/api'
import { ManageChallengeCard } from '../components/ChallengeCard'
import { ChallengeForm } from '../components/ChallengeForm'
import { Button } from '../components/ui/button'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { cn } from '../lib/utils'
import type { Challenge, ChallengeDifficulty } from '@challenge-hub/shared'

type Filter = 'all' | ChallengeDifficulty

const FILTERS: { value: Filter; label: string; dot?: string }[] = [
  { value: 'all',    label: 'Tous' },
  { value: 'easy',   label: 'Facile',    dot: 'bg-green-400' },
  { value: 'medium', label: 'Moyen',     dot: 'bg-yellow-400' },
  { value: 'hard',   label: 'Difficile', dot: 'bg-red-400' },
]

export function Challenges() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState<Filter>('all')
  const [showForm, setShowForm] = useState(false)
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const onSuccess = () => qc.invalidateQueries({ queryKey: ['challenges'] })

  const { data: challenges = [], isLoading } = useQuery({
    queryKey: ['challenges'],
    queryFn: api.challenges.list,
  })

  const createMut = useMutation({
    mutationFn: api.challenges.create,
    onSuccess: () => { onSuccess(); setShowForm(false) },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Omit<Challenge, 'id' | 'createdAt'>> }) =>
      api.challenges.update(id, data),
    onSuccess: () => { onSuccess(); setEditingChallenge(null) },
  })

  const deleteMut = useMutation({ mutationFn: api.challenges.delete, onSuccess })
  const resetMut = useMutation({ mutationFn: api.challenges.reset, onSuccess })

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      await api.challenges.import(Array.isArray(data) ? data : [data])
      onSuccess()
    } catch {
      alert('Erreur : fichier invalide.')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const openCreate = () => { setEditingChallenge(null); setShowForm(true) }
  const openEdit = (c: Challenge) => { setShowForm(false); setEditingChallenge(c) }
  const closeForm = () => { setShowForm(false); setEditingChallenge(null) }

  const counts: Record<Filter, number> = {
    all: challenges.length,
    easy: challenges.filter((c) => c.difficulty === 'easy').length,
    medium: challenges.filter((c) => c.difficulty === 'medium').length,
    hard: challenges.filter((c) => c.difficulty === 'hard').length,
  }

  const filtered = filter === 'all' ? challenges : challenges.filter((c) => c.difficulty === filter)
  const isFormOpen = showForm || editingChallenge !== null

  return (
    <div className="p-4 md:p-6 space-y-4">

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null) }}
        title="Supprimer ce défi ?"
        description="Cette action est irréversible."
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={() => { if (deleteId !== null) deleteMut.mutate(deleteId) }}
        isLoading={deleteMut.isPending}
      />

      <ConfirmDialog
        open={showResetConfirm}
        onOpenChange={setShowResetConfirm}
        title="Réinitialiser tous les défis ?"
        description="Tes défis personnalisés seront supprimés et remplacés par les défis par défaut."
        confirmLabel="Réinitialiser"
        variant="destructive"
        onConfirm={() => resetMut.mutate()}
        isLoading={resetMut.isPending}
      />

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl md:text-2xl font-bold text-white">Défis</h1>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon" onClick={() => window.open(api.challenges.exportUrl, '_blank')} title="Exporter JSON" className="h-8 w-8">
            <Download className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} title="Importer JSON" className="h-8 w-8">
            <Upload className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost" size="icon"
            onClick={() => setShowResetConfirm(true)}
            className="h-8 w-8 text-red-400/50 hover:text-red-400 hover:bg-red-500/10"
            title="Réinitialiser"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          <div className="w-px h-5 bg-fortnite-border mx-0.5" />
          <Button size="sm" onClick={openCreate} className="gap-1.5">
            <Plus className="w-4 h-4" />
            Nouveau
          </Button>
        </div>
        <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
      </div>

      {/* Filtres */}
      {challenges.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all',
                filter === f.value
                  ? 'bg-fortnite-yellow/10 border-fortnite-yellow/30 text-fortnite-yellow'
                  : 'border-fortnite-border bg-fortnite-darker text-fortnite-muted hover:text-white hover:border-fortnite-border/70',
              )}
            >
              {f.dot && <span className={cn('w-1.5 h-1.5 rounded-full', f.dot)} />}
              {f.label}
              <span className={cn(
                'tabular-nums',
                filter === f.value ? 'text-fortnite-yellow/70' : 'text-fortnite-muted/50',
              )}>
                {counts[f.value]}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Formulaire création / édition */}
      {isFormOpen && (
        <div className="rounded-xl border border-fortnite-yellow/20 bg-fortnite-card overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-fortnite-border/50">
            <span className="text-sm font-semibold text-white">
              {editingChallenge ? 'Modifier le défi' : 'Nouveau défi'}
            </span>
            <button onClick={closeForm} className="text-fortnite-muted hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4">
            <ChallengeForm
              initial={editingChallenge ?? undefined}
              onSubmit={(data) =>
                editingChallenge
                  ? updateMut.mutate({ id: editingChallenge.id, data })
                  : createMut.mutate({ ...data, sortOrder: challenges.length })
              }
              onCancel={closeForm}
              isLoading={createMut.isPending || updateMut.isPending}
            />
          </div>
        </div>
      )}

      {/* Liste */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-fortnite-muted">
          <Loader2 className="w-6 h-6 animate-spin opacity-40" />
          Chargement...
        </div>
      ) : challenges.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="w-12 h-12 rounded-xl bg-fortnite-border/30 flex items-center justify-center">
            <List className="w-6 h-6 text-fortnite-muted/50" />
          </div>
          <div>
            <div className="text-white font-medium">Aucun défi configuré</div>
            <div className="text-fortnite-muted text-sm mt-1">Crée ton premier défi pour commencer.</div>
          </div>
          <Button onClick={openCreate} className="mt-1">
            <Plus className="w-4 h-4" />
            Créer un défi
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-fortnite-muted text-sm">
          Aucun défi dans cette difficulté.
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((c) => (
            <ManageChallengeCard
              key={c.id}
              challenge={c}
              onEdit={openEdit}
              onDelete={(id) => setDeleteId(id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
