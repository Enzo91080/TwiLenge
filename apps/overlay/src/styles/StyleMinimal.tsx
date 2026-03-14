// =============================================================
// STYLE MINIMAL — Fond semi-transparent épuré, aucun effet
// =============================================================

import { DIFFICULTY_LABELS } from '@challenge-hub/shared'
import type { StyleProps } from './types'
import { DIFFICULTY_COLORS, formatTime } from './colors'

const ACCENT = '#F0C540'

export function StyleMinimal({ challenge: c, timerSecondsLeft, theme }: StyleProps) {
  const isDark     = theme === 'dark'
  const accent     = ACCENT
  const diffColor  = DIFFICULTY_COLORS[c.difficulty]

  const isTimerLow    = timerSecondsLeft !== null && timerSecondsLeft <= 30
  const timerProgress = timerSecondsLeft !== null && c.timerSeconds
    ? Math.max(0, (timerSecondsLeft / c.timerSeconds) * 100)
    : 100

  const bg          = isDark ? 'rgba(10, 12, 20, 0.80)' : 'rgba(255, 255, 255, 0.88)'
  const textPrimary = isDark ? '#F1F5F9' : '#0F172A'
  const textMuted   = isDark ? '#64748B' : '#94A3B8'

  return (
    <div
      className="animate-pop-in"
      style={{
        width: '300px',
        background: bg,
        backdropFilter: 'blur(16px)',
        borderRadius: '10px',
        borderTop:    `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'}`,
        borderRight:  `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'}`,
        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'}`,
        borderLeft: `3px solid ${accent}`,
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '11px 14px 12px' }}>

        {/* Description + timer sur la même ligne */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
          <div style={{ fontSize: '13px', lineHeight: 1.4, color: textPrimary, flex: 1 }}>
            {c.description || '—'}
          </div>

          {timerSecondsLeft !== null && (
            <div
              className={isTimerLow ? 'animate-timer-pulse' : ''}
              style={{
                fontSize: '18px', fontWeight: 800, fontFamily: 'monospace',
                color: isTimerLow ? '#EF4444' : accent,
                flexShrink: 0, lineHeight: 1.2,
              }}
            >
              {formatTime(timerSecondsLeft)}
            </div>
          )}

          {timerSecondsLeft === null && c.timerSeconds && (
            <div style={{ fontSize: '12px', color: textMuted, flexShrink: 0 }}>
              ⏱ {formatTime(c.timerSeconds)}
            </div>
          )}
        </div>

        {/* Barre de progression */}
        {timerSecondsLeft !== null && c.timerSeconds && (
          <div style={{ marginBottom: '8px' }}>
            <div style={{ height: '2px', borderRadius: '1px', background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${timerProgress}%`, borderRadius: '1px',
                background: isTimerLow ? '#EF4444' : accent,
                transition: 'width 1s linear',
              }} />
            </div>
          </div>
        )}

        {/* Footer : difficulté */}
        <span style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: diffColor }}>
          {DIFFICULTY_LABELS[c.difficulty]}
        </span>
      </div>
    </div>
  )
}
