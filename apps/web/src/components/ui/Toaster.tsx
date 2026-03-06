// =============================================================
// COMPOSANT NOTIFICATIONS TOAST
// =============================================================
// Affiche des notifications temporaires en bas à droite.
// Se déclenche automatiquement sur les événements WebSocket.
// =============================================================

import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, SkipForward, Info } from 'lucide-react'
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

  const addToast = (message: string, type: Toast['type']) => {
    const id = ++toastId
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }

  useEffect(() => {
    if (!lastEvent) return
    switch (lastEvent.type) {
      case 'CHALLENGE_COMPLETED':
        addToast(`Défi complété ! +${lastEvent.data.pointsEarned} pts`, 'success')
        break
      case 'CHALLENGE_FAILED':
        addToast('Défi échoué !', 'error')
        break
      case 'CHALLENGE_SKIPPED':
        addToast('Défi passé', 'warning')
        break
      case 'CHALLENGE_ACTIVATED':
        addToast(`Défi actif : ${lastEvent.data.challenge.title}`, 'info')
        break
      case 'TIMER_EXPIRED':
        addToast('Temps écoulé !', 'error')
        break
      case 'SESSION_STARTED':
        addToast('Session démarrée !', 'success')
        break
      case 'SESSION_ENDED':
        addToast('Session terminée', 'info')
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
            'flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl text-sm font-medium animate-slide-in min-w-[280px] backdrop-blur-sm',
            toast.type === 'success' && 'bg-green-950/95 border-green-500/40 text-green-300',
            toast.type === 'error'   && 'bg-red-950/95 border-red-500/40 text-red-300',
            toast.type === 'warning' && 'bg-yellow-950/95 border-yellow-500/40 text-yellow-300',
            toast.type === 'info'    && 'bg-blue-950/95 border-blue-500/40 text-blue-300',
          )}
        >
          {toast.type === 'success' && <CheckCircle className="w-4 h-4 shrink-0" />}
          {toast.type === 'error'   && <XCircle className="w-4 h-4 shrink-0" />}
          {toast.type === 'warning' && <SkipForward className="w-4 h-4 shrink-0" />}
          {toast.type === 'info'    && <Info className="w-4 h-4 shrink-0" />}
          {toast.message}
        </div>
      ))}
    </div>
  )
}
