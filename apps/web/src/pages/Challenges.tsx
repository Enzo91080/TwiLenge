// =============================================================
// PAGE GESTION DES DÉFIS
// =============================================================
// Permet de créer, modifier, supprimer et réordonner les défis.
// =============================================================

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, RotateCcw, Download, Upload } from 'lucide-react'
import { api } from '../lib/api'
import { ManageChallengeCard } from '../components/ChallengeCard'
import { ChallengeForm } from '../components/ChallengeForm'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import type { Challenge } from '@challenge-hub/shared'

export function Challenges() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null)
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

  const deleteMut = useMutation({
    mutationFn: api.challenges.delete,
    onSuccess,
  })

  const resetMut = useMutation({
    mutationFn: api.challenges.reset,
    onSuccess,
  })

  const handleDelete = (id: number) => {
    if (confirm('Supprimer ce défi ? Cette action est irréversible.')) {
      deleteMut.mutate(id)
    }
  }

  const handleReset = () => {
    if (confirm('Réinitialiser TOUS les défis aux valeurs par défaut ? Tous tes défis personnalisés seront supprimés.')) {
      resetMut.mutate()
    }
  }

  const handleExport = () => {
    window.open(api.challenges.exportUrl, '_blank')
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      await api.challenges.import(Array.isArray(data) ? data : [data])
      onSuccess()
      alert(`${Array.isArray(data) ? data.length : 1} défi(s) importé(s) avec succès !`)
    } catch {
      alert("Erreur : le fichier n'est pas un fichier de défis valide.")
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Défis</h1>
          <p className="text-sm text-fortnite-muted mt-0.5">{challenges.length} défi(s) configuré(s)</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button variant="ghost" size="sm" onClick={handleExport} title="Exporter en JSON">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exporter</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} title="Importer depuis JSON">
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Importer</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-red-400/70 hover:text-red-400 hover:bg-red-500/10"
            title="Réinitialiser les défis par défaut"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">Réinitialiser</span>
          </Button>
          <Button onClick={() => { setEditingChallenge(null); setShowForm(true) }} size="sm">
            <Plus className="w-4 h-4" />
            Nouveau défi
          </Button>
        </div>

        {/* Input fichier caché pour l'import */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImport}
        />
      </div>

      {/* Formulaire de création */}
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

      {/* Formulaire d'édition */}
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

      {/* Liste des défis */}
      {isLoading ? (
        <div className="text-center text-fortnite-muted py-12">Chargement...</div>
      ) : challenges.length === 0 ? (
        <Card className="text-center border-dashed">
          <CardContent className="py-12">
            <div className="text-3xl mb-3">📋</div>
            <div className="text-white font-medium">Aucun défi configuré</div>
            <div className="text-fortnite-muted text-sm mt-1">
              Clique sur "Nouveau défi" pour en ajouter un.
            </div>
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
