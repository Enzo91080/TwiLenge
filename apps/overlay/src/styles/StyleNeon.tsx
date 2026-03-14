// =============================================================
// STYLE NÉON — Fond noir, bordures lumineuses, glow intense
// =============================================================

import { DIFFICULTY_LABELS } from '@challenge-hub/shared'
import type { StyleProps } from './types'
import { DIFFICULTY_COLORS, formatTime } from './colors'

const ACCENT = '#F0C540'

export function StyleNeon({ challenge: c, timerSecondsLeft }: StyleProps) {
  const accent    = ACCENT
  const diffColor = DIFFICULTY_COLORS[c.difficulty]

  const isTimerLow    = timerSecondsLeft !== null && timerSecondsLeft <= 30
  const timerProgress = timerSecondsLeft !== null && c.timerSeconds
    ? Math.max(0, (timerSecondsLeft / c.timerSeconds) * 100)
    : 100

  const glowColor = isTimerLow ? '#EF4444' : accent

  return (
    <div
      className="animate-pop-in animate-neon-glow"
      style={{
        width: '360px',
        background: 'rgba(0, 0, 0, 0.92)',
        borderRadius: '4px',
        border: `1px solid ${glowColor}`,
        boxShadow: [
          `0 0 10px ${glowColor}55`,
          `0 0 22px ${glowColor}28`,
          `0 0 45px ${glowColor}12`,
          `inset 0 0 14px ${glowColor}08`,
        ].join(', '),
        overflow: 'hidden',
        transition: 'box-shadow 0.5s ease, border-color 0.5s ease',
      }}
    >
      {/* Ligne de scan horizontale haut */}
      <div style={{ height: '1px', background: `linear-gradient(90deg, transparent, ${glowColor}CC, transparent)` }} />

      <div style={{ padding: '13px 16px 14px' }}>

        {/* Statut en cours */}
        <div style={{
          fontSize: '10px', fontWeight: 900, letterSpacing: '0.3em', textTransform: 'uppercase',
          color: accent,
          textShadow: `0 0 8px ${accent}, 0 0 16px ${accent}80`,
          marginBottom: '8px',
        }}>
          ◈ Défi en cours
        </div>

        {/* Description */}
        <div style={{ fontSize: '14px', lineHeight: 1.45, color: '#FFFFFF', marginBottom: '12px' }}>
          {c.description || '—'}
        </div>

        {/* Barre de progression néon */}
        {timerSecondsLeft !== null && c.timerSeconds && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ height: '2px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${timerProgress}%`,
                background: glowColor,
                boxShadow: `0 0 8px ${glowColor}, 0 0 16px ${glowColor}60`,
                transition: 'width 1s linear',
              }} />
            </div>
          </div>
        )}

        {/* Footer : difficulté + timer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{
            fontSize: '9px', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase',
            color: diffColor,
            textShadow: `0 0 6px ${diffColor}80`,
            border: `1px solid ${diffColor}50`,
            padding: '2px 8px', borderRadius: '2px',
            background: `${diffColor}10`,
          }}>
            {DIFFICULTY_LABELS[c.difficulty]}
          </span>

          {timerSecondsLeft !== null && (
            <div
              className={isTimerLow ? 'animate-timer-pulse' : ''}
              style={{
                fontFamily: 'monospace', fontSize: '26px', fontWeight: 900, letterSpacing: '0.06em',
                color: glowColor,
                textShadow: `0 0 12px ${glowColor}, 0 0 24px ${glowColor}80, 0 0 40px ${glowColor}40`,
              }}
            >
              {formatTime(timerSecondsLeft)}
            </div>
          )}

          {timerSecondsLeft === null && c.timerSeconds && (
            <div style={{ fontSize: '13px', color: '#4A5568' }}>
              ⏱ {formatTime(c.timerSeconds)}
            </div>
          )}
        </div>
      </div>

      {/* Ligne de scan bas (miroir) */}
      <div style={{ height: '1px', background: `linear-gradient(90deg, transparent, ${glowColor}60, transparent)` }} />
    </div>
  )
}
