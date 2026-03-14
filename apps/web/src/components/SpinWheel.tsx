// =============================================================
// SLOT MACHINE — Les défis défilent et s'arrêtent sur le gagnant
// =============================================================

import { useEffect, useRef, useState, useMemo } from 'react'
import type { SessionChallenge } from '@challenge-hub/shared'
import { Trophy } from 'lucide-react'

interface Props {
  isOpen: boolean
  challenges: SessionChallenge[]
  result: SessionChallenge | null
  onClose: () => void
}

const ITEM_H   = 72   // px par case
const VISIBLE  = 5    // cases visibles dans la fenêtre
const WINDOW_H = ITEM_H * VISIBLE
const REPS     = 40   // répétitions pour un scroll infini fluide
const STOP_DURATION = 3600 // ms décélération

export function SpinWheel({ isOpen, challenges, result, onClose }: Props) {
  const reelRef    = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const resultRef  = useRef<SessionChallenge | null>(null)
  const [phase, setPhase] = useState<'spinning' | 'result'>('spinning')

  useEffect(() => { resultRef.current = result }, [result])

  // Liste étendue pour l'illusion d'un scroll infini
  const items = useMemo(
    () => Array.from({ length: REPS }, () => challenges).flat(),
    [challenges],
  )

  useEffect(() => {
    if (!isOpen || challenges.length === 0) return
    setPhase('spinning')
    resultRef.current = null

    const n   = challenges.length
    let offset      = 10 * n * ITEM_H  // départ au milieu du buffer
    let stopping    = false
    let stopStart   = 0
    let stopTime    = 0
    let targetOff   = 0
    let applied     = false
    let rafId       = 0
    const t0        = Date.now()

    const applyTransform = (off: number) => {
      if (reelRef.current) {
        const ty = -off + Math.floor(VISIBLE / 2) * ITEM_H
        reelRef.current.style.transform = `translateY(${ty}px)`
      }
    }

    const loop = () => {
      if (!stopping) {
        offset += 30  // vitesse initiale rapide

        if (Date.now() - t0 >= 1400 && resultRef.current && !applied) {
          applied = true
          const idx = Math.max(0, challenges.findIndex(c => c.id === resultRef.current!.id))

          // Trouver le prochain indice correspondant à idx, au moins 4n cases plus loin
          const cur = offset / ITEM_H
          let target = Math.ceil(cur + 3 * n)
          const diff = ((idx - (target % n)) + n) % n
          target += diff
          targetOff  = target * ITEM_H
          stopStart  = offset
          stopTime   = performance.now()
          stopping   = true
        }
      } else {
        const t     = Math.min((performance.now() - stopTime) / STOP_DURATION, 1)
        const ease  = 1 - Math.pow(1 - t, 5)  // ease-out quint
        offset = stopStart + (targetOff - stopStart) * ease

        if (t >= 1) {
          applyTransform(offset)
          setPhase('result')
          setTimeout(() => onCloseRef.current(), 3200)
          return
        }
      }
      applyTransform(offset)
      rafId = requestAnimationFrame(loop)
    }

    applyTransform(offset)
    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  }, [isOpen, challenges, items])

  useEffect(() => { if (!isOpen) setPhase('spinning') }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
      <div className="flex flex-col items-center gap-8">

        {/* Titre */}
        <div className="text-center space-y-1">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-fortnite-yellow/60">
            Challenge Hub
          </p>
          <h2 className="text-2xl font-black text-white tracking-tight">
            {phase === 'spinning' ? 'Sélection en cours...' : 'Défi sélectionné !'}
          </h2>
        </div>

        {/* Machine à sous */}
        <div className="relative flex items-center gap-4">

          {/* Barre déco gauche */}
          <div className="flex flex-col gap-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="w-2 h-2 rounded-full" style={{
                background: phase === 'result' ? '#F0C540' : 'rgba(240,197,64,0.25)',
                transition: 'background 0.4s',
                transitionDelay: `${i * 60}ms`,
              }} />
            ))}
          </div>

          {/* Fenêtre du slot */}
          <div className="relative" style={{ width: 380, height: WINDOW_H }}>

            {/* Cadre extérieur */}
            <div className="absolute inset-0 rounded-2xl pointer-events-none z-20" style={{
              border: `2px solid ${phase === 'result' ? 'rgba(240,197,64,0.7)' : 'rgba(255,255,255,0.08)'}`,
              boxShadow: phase === 'result' ? '0 0 40px rgba(240,197,64,0.25), inset 0 0 20px rgba(240,197,64,0.05)' : 'none',
              transition: 'border-color 0.5s, box-shadow 0.5s',
            }} />

            {/* Surbrillance de la case centrale */}
            <div className="absolute left-0 right-0 z-10 pointer-events-none" style={{
              top: Math.floor(VISIBLE / 2) * ITEM_H,
              height: ITEM_H,
              background: phase === 'result'
                ? 'rgba(240,197,64,0.08)'
                : 'rgba(255,255,255,0.03)',
              borderTop: `1px solid ${phase === 'result' ? 'rgba(240,197,64,0.5)' : 'rgba(255,255,255,0.08)'}`,
              borderBottom: `1px solid ${phase === 'result' ? 'rgba(240,197,64,0.5)' : 'rgba(255,255,255,0.08)'}`,
              transition: 'all 0.4s',
            }} />

            {/* Reel */}
            <div className="overflow-hidden rounded-2xl" style={{ height: WINDOW_H, background: 'rgba(6,8,14,0.98)' }}>
              <div ref={reelRef} style={{ willChange: 'transform' }}>
                {items.map((sc, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-center px-6 text-center"
                    style={{ height: ITEM_H }}
                  >
                    <span className="text-white/90 font-semibold text-sm leading-snug" style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {sc.challenge.description || '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Fondu haut */}
            <div className="absolute inset-x-0 top-0 pointer-events-none z-10 rounded-t-2xl" style={{
              height: ITEM_H * 2.2,
              background: 'linear-gradient(to bottom, rgba(6,8,14,1) 0%, rgba(6,8,14,0.85) 50%, transparent 100%)',
            }} />

            {/* Fondu bas */}
            <div className="absolute inset-x-0 bottom-0 pointer-events-none z-10 rounded-b-2xl" style={{
              height: ITEM_H * 2.2,
              background: 'linear-gradient(to top, rgba(6,8,14,1) 0%, rgba(6,8,14,0.85) 50%, transparent 100%)',
            }} />
          </div>

          {/* Barre déco droite */}
          <div className="flex flex-col gap-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="w-2 h-2 rounded-full" style={{
                background: phase === 'result' ? '#F0C540' : 'rgba(240,197,64,0.25)',
                transition: 'background 0.4s',
                transitionDelay: `${i * 60}ms`,
              }} />
            ))}
          </div>
        </div>

        {/* Résultat */}
        <div style={{ minHeight: 72 }} className="flex items-center justify-center">
          {phase === 'result' && result ? (
            <div className="text-center animate-in fade-in slide-in-from-bottom-3 duration-500 max-w-sm">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Trophy className="w-4 h-4 text-fortnite-yellow" />
                <span className="text-fortnite-yellow text-xs font-bold uppercase tracking-widest">Défi activé</span>
              </div>
              <p className="text-white font-bold text-lg leading-snug bg-fortnite-yellow/10 border border-fortnite-yellow/25 rounded-xl px-6 py-3">
                {result.challenge.description || '—'}
              </p>
            </div>
          ) : (
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-fortnite-yellow/40 animate-pulse"
                  style={{ animationDelay: `${i * 200}ms` }} />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
