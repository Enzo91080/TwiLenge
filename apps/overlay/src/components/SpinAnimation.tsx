// =============================================================
// SLOT MACHINE — Overlay OBS (compact, positionné dans le coin)
// =============================================================

import { useEffect, useRef, useMemo } from 'react'
import type { SessionChallenge } from '@challenge-hub/shared'

interface Props {
  challenges: SessionChallenge[]
  result: SessionChallenge
  onComplete: () => void
}

const ITEM_H   = 44
const VISIBLE  = 3
const WINDOW_H = ITEM_H * VISIBLE
const REPS     = 40
const STOP_DURATION = 3400

export function SpinAnimation({ challenges, result, onComplete }: Props) {
  const reelRef       = useRef<HTMLDivElement>(null)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  const items = useMemo(
    () => Array.from({ length: REPS }, () => challenges).flat(),
    [challenges],
  )

  useEffect(() => {
    if (challenges.length === 0) return

    const n   = challenges.length
    const idx = Math.max(0, challenges.findIndex(c => c.id === result.id))
    let offset    = 10 * n * ITEM_H
    let stopping  = false
    let stopStart = 0
    let stopTime  = 0
    let targetOff = 0
    let applied   = false
    let rafId     = 0
    const t0      = Date.now()

    const applyTransform = (off: number) => {
      if (reelRef.current) {
        const ty = -off + Math.floor(VISIBLE / 2) * ITEM_H
        reelRef.current.style.transform = `translateY(${ty}px)`
      }
    }

    const loop = () => {
      if (!stopping) {
        offset += 22
        if (Date.now() - t0 >= 1200 && !applied) {
          applied = true
          const cur  = offset / ITEM_H
          let target = Math.ceil(cur + 3 * n)
          const diff = ((idx - (target % n)) + n) % n
          target    += diff
          targetOff  = target * ITEM_H
          stopStart  = offset
          stopTime   = performance.now()
          stopping   = true
        }
      } else {
        const t    = Math.min((performance.now() - stopTime) / STOP_DURATION, 1)
        const ease = 1 - Math.pow(1 - t, 5)
        offset = stopStart + (targetOff - stopStart) * ease
        if (t >= 1) {
          applyTransform(offset)
          setTimeout(() => onCompleteRef.current(), 2800)
          return
        }
      }
      applyTransform(offset)
      rafId = requestAnimationFrame(loop)
    }

    applyTransform(offset)
    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  }, [challenges, result])

  return (
    <div style={{
      width: 260,
      background: 'rgba(8,10,16,0.95)',
      border: '1px solid rgba(240,197,64,0.3)',
      borderRadius: 12,
      overflow: 'hidden',
      boxShadow: '0 4px 24px rgba(0,0,0,0.7)',
    }}>

      {/* Header */}
      <div style={{
        padding: '8px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: '#F0C540',
          boxShadow: '0 0 6px #F0C540',
          animation: 'pulse 1s ease-in-out infinite',
        }} />
        <span style={{
          color: 'rgba(240,197,64,0.8)', fontSize: 10, fontWeight: 700,
          letterSpacing: '0.15em', textTransform: 'uppercase',
        }}>
          Sélection en cours
        </span>
      </div>

      {/* Slot window */}
      <div style={{ position: 'relative', height: WINDOW_H }}>

        {/* Highlight centre */}
        <div style={{
          position: 'absolute', left: 0, right: 0,
          top: Math.floor(VISIBLE / 2) * ITEM_H, height: ITEM_H,
          background: 'rgba(240,197,64,0.06)',
          borderTop: '1px solid rgba(240,197,64,0.25)',
          borderBottom: '1px solid rgba(240,197,64,0.25)',
          pointerEvents: 'none', zIndex: 2,
        }} />

        {/* Reel */}
        <div style={{ overflow: 'hidden', height: WINDOW_H }}>
          <div ref={reelRef} style={{ willChange: 'transform' }}>
            {items.map((sc, i) => (
              <div key={i} style={{
                height: ITEM_H,
                display: 'flex', alignItems: 'center',
                padding: '0 14px',
              }}>
                <span style={{
                  color: 'rgba(255,255,255,0.85)',
                  fontSize: 12, fontWeight: 600,
                  lineHeight: 1.3,
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
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 0,
          height: ITEM_H * 1.2, pointerEvents: 'none', zIndex: 3,
          background: 'linear-gradient(to bottom, rgba(8,10,16,1), transparent)',
        }} />

        {/* Fondu bas */}
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          height: ITEM_H * 1.2, pointerEvents: 'none', zIndex: 3,
          background: 'linear-gradient(to top, rgba(8,10,16,1), transparent)',
        }} />
      </div>
    </div>
  )
}
