// =============================================================
// COMPOSANT NOTIFICATIONS TOAST
// =============================================================
// Affiche des notifications temporaires en bas a droite de l'ecran.
// Se declenche automatiquement sur les evenements WebSocket importants.
// =============================================================

import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, SkipForward, Trophy } from 'lucide-react'
import { useAppState } from '../../lib/context'
import { cn } from '../../lib/utils'

interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
}

let toastId = 0

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const { lastEvent } = useAppState()

  // Ajouter un toast
  const addToast = (message: string, type: Toast['type']) => {
    const id = ++toastId
    setToasts((prev) => [...prev, { id, message, type }])
    // Supprimer apres 4 secondes
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }

  // Ecouter les evenements WebSocket
  useEffect(() => {
    if (!lastEvent) return

    switch (lastEvent.type) {
      case 'CHALLENGE_COMPLETED':
        addToast(`Defi complete ! +${lastEvent.data.pointsEarned} pts`, 'success')
        break
      case 'CHALLENGE_FAILED':
        addToast(`Defi echoue !`, 'error')
        break
      case 'CHALLENGE_SKIPPED':
        addToast('Defi passe', 'warning')
        break
      case 'CHALLENGE_ACTIVATED':
        addToast(`Defi actif : ${lastEvent.data.challenge.title}`, 'info')
        break
      case 'TIMER_EXPIRED':
        addToast('Temps ecoule !', 'error')
        break
      case 'SESSION_STARTED':
        addToast('Session demarree !', 'success')
        break
      case 'SESSION_ENDED':
        addToast('Session terminee', 'info')
        break
    }
  }, [lastEvent])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 space-y-2 z-50">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium animate-slide-in min-w-[280px]',
            toast.type === 'success' && 'bg-green-900/90 border-green-500/30 text-green-300',
            toast.type === 'error'   && 'bg-red-900/90 border-red-500/30 text-red-300',
            toast.type === 'warning' && 'bg-yellow-900/90 border-yellow-500/30 text-yellow-300',
            toast.type === 'info'    && 'bg-blue-900/90 border-blue-500/30 text-blue-300',
          )}
        >
          {toast.type === 'success' && <CheckCircle className="w-4 h-4 shrink-0" />}
          {toast.type === 'error'   && <XCircle className="w-4 h-4 shrink-0" />}
          {toast.type === 'warning' && <SkipForward className="w-4 h-4 shrink-0" />}
          {toast.type === 'info'    && <Trophy className="w-4 h-4 shrink-0" />}
          {toast.message}
        </div>
      ))}
    </div>
  )
}
