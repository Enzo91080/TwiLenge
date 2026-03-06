// =============================================================
// PAGE GESTION DES DEFIS
// =============================================================
// Permet de creer, modifier, supprimer et reordonner les defis.
// Les defis sont charges depuis le serveur via React Query.
// =============================================================

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, RotateCcw, Download, Upload } from 'lucide-react'
import { api } from '../lib/api'
import { ManageChallengeCard } from '../components/ChallengeCard'
import { ChallengeForm } from '../components/ChallengeForm'
import type { Challenge } from '@challenge-hub/shared'

export function Challenges() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const onSuccess = () => qc.invalidateQueries({ queryKey: ['challenges'] })

  // Charger la liste des defis
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
    if (confirm('Supprimer ce defi ? Cette action est irreversible.')) {
      deleteMut.mutate(id)
    }
  }

  const handleReset = () => {
    if (confirm('Reinitialiser TOUS les defis aux valeurs par defaut ? Tous tes defis personnalises seront supprimes.')) {
      resetMut.mutate()
    }
  }

  // Export : ouvre l'URL de telechargement
  const handleExport = () => {
    window.open(api.challenges.exportUrl, '_blank')
  }

  // Import : lit un fichier JSON et envoie au serveur
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const data = JSON.parse(text)
      await api.challenges.import(Array.isArray(data) ? data : [data])
      onSuccess()
      alert(`${Array.isArray(data) ? data.length : 1} defi(s) importe(s) avec succes !`)
    } catch {
      alert('Erreur : le fichier n\'est pas un fichier de defis valide.')
    } finally {
      // Remettre l'input a zero pour pouvoir reimporter le meme fichier
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Defis</h1>
          <p className="text-sm text-fortnite-muted mt-0.5">{challenges.length} defi(s) configure(s)</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {/* Boutons secondaires */}
          <button onClick={handleExport} className="btn-ghost" title="Exporter en JSON">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exporter</span>
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="btn-ghost" title="Importer depuis JSON">
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Importer</span>
          </button>
          <button onClick={handleReset} className="btn-ghost text-red-400/70 hover:text-red-400" title="Reinitialiser les defis par defaut">
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">Reinitialiser</span>
          </button>

          {/* Ajouter */}
          <button onClick={() => { setEditingChallenge(null); setShowForm(true) }} className="btn-primary">
            <Plus className="w-4 h-4" />
            Nouveau defi
          </button>
        </div>

        {/* Input fichier cache pour l'import */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImport}
        />
      </div>

      {/* Formulaire de creation */}
      {showForm && !editingChallenge && (
        <div className="card border-fortnite-yellow/20">
          <h2 className="font-semibold text-white mb-4">Nouveau defi</h2>
          <ChallengeForm
            onSubmit={(data) => createMut.mutate({ ...data, sortOrder: challenges.length })}
            onCancel={() => setShowForm(false)}
            isLoading={createMut.isPending}
          />
        </div>
      )}

      {/* Formulaire d'edition */}
      {editingChallenge && (
        <div className="card border-fortnite-yellow/20">
          <h2 className="font-semibold text-white mb-4">Modifier le defi</h2>
          <ChallengeForm
            initial={editingChallenge}
            onSubmit={(data) => updateMut.mutate({ id: editingChallenge.id, data })}
            onCancel={() => setEditingChallenge(null)}
            isLoading={updateMut.isPending}
          />
        </div>
      )}

      {/* Liste des defis */}
      {isLoading ? (
        <div className="text-center text-fortnite-muted py-12">Chargement...</div>
      ) : challenges.length === 0 ? (
        <div className="card text-center py-12 border-dashed">
          <div className="text-3xl mb-3">📋</div>
          <div className="text-white font-medium">Aucun defi configure</div>
          <div className="text-fortnite-muted text-sm mt-1">
            Clique sur "Nouveau defi" pour en ajouter un.
          </div>
        </div>
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
