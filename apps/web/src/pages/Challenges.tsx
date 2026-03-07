// =============================================================
// PAGE GESTION DES DÉFIS
// =============================================================

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, RotateCcw, Download, Upload, Loader2, List } from 'lucide-react'
import { api } from '../lib/api'
import { ManageChallengeCard } from '../components/ChallengeCard'
import { ChallengeForm } from '../components/ChallengeForm'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { ConfirmDialog } from '../components/ConfirmDialog'
import type { Challenge } from '@challenge-hub/shared'

export function Challenges() {
  const qc = useQueryClient()
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

  const handleDelete = (id: number) => setDeleteId(id)
  const handleReset = () => setShowResetConfirm(true)

  const handleExport = () => window.open(api.challenges.exportUrl, '_blank')

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      await api.challenges.import(Array.isArray(data) ? data : [data])
      onSuccess()
      alert(`${Array.isArray(data) ? data.length : 1} défi(s) importé(s) !`)
    } catch {
      alert("Erreur : fichier invalide.")
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">

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
        description="Tes défis personnalisés seront supprimés et remplacés par les défis par défaut. Cette action est irréversible."
        confirmLabel="Réinitialiser"
        variant="destructive"
        onConfirm={() => resetMut.mutate()}
        isLoading={resetMut.isPending}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">Défis</h1>
          <p className="text-sm text-fortnite-muted mt-0.5">{challenges.length} défi(s)</p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          <Button variant="ghost" size="icon" onClick={handleExport} title="Exporter JSON">
            <Download className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} title="Importer JSON">
            <Upload className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleReset}
            className="text-red-400/60 hover:text-red-400 hover:bg-red-500/10"
            title="Réinitialiser"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button size="sm" onClick={() => { setEditingChallenge(null); setShowForm(true) }}>
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nouveau défi</span>
            <span className="sm:hidden">Nouveau</span>
          </Button>
        </div>

        <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
      </div>

      {/* Formulaire création */}
      {showForm && !editingChallenge && (
        <Card className="border-fortnite-yellow/20">
          <CardHeader>
            <CardTitle>Nouveau défi</CardTitle>
          </CardHeader>
          <CardContent>
            <ChallengeForm
              onSubmit={(data) => createMut.mutate({ ...data, sortOrder: challenges.length })}
              onCancel={() => setShowForm(false)}
              isLoading={createMut.isPending}
            />
          </CardContent>
        </Card>
      )}

      {/* Formulaire édition */}
      {editingChallenge && (
        <Card className="border-fortnite-yellow/20">
          <CardHeader>
            <CardTitle>Modifier le défi</CardTitle>
          </CardHeader>
          <CardContent>
            <ChallengeForm
              initial={editingChallenge}
              onSubmit={(data) => updateMut.mutate({ id: editingChallenge.id, data })}
              onCancel={() => setEditingChallenge(null)}
              isLoading={updateMut.isPending}
            />
          </CardContent>
        </Card>
      )}

      {/* Liste */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-fortnite-muted">
          <Loader2 className="w-7 h-7 animate-spin opacity-40" />
          Chargement...
        </div>
      ) : challenges.length === 0 ? (
        <Card className="text-center border-dashed">
          <CardContent className="py-14">
            <div className="w-12 h-12 rounded-xl bg-fortnite-border/30 flex items-center justify-center mx-auto mb-3">
              <List className="w-6 h-6 text-fortnite-muted/50" />
            </div>
            <div className="text-white font-medium">Aucun défi configuré</div>
            <div className="text-fortnite-muted text-sm mt-1">Clique sur "Nouveau" pour en ajouter un.</div>
            <Button className="mt-5" onClick={() => { setEditingChallenge(null); setShowForm(true) }}>
              <Plus className="w-4 h-4" />
              Créer un défi
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {challenges.map((c) => (
            <ManageChallengeCard
              key={c.id}
              challenge={c}
              onEdit={(c) => { setEditingChallenge(c); setShowForm(false) }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
