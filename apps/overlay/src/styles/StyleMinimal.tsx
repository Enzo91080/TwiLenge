// =============================================================
// STYLE MINIMAL — Fond semi-transparent épuré, aucun effet
// =============================================================

import { CATEGORY_LABELS, DIFFICULTY_LABELS } from '@challenge-hub/shared'
import type { StyleProps } from './types'
import { CATEGORY_COLORS, DIFFICULTY_COLORS, formatTime } from './colors'

export function StyleMinimal({ challenge: c, timerSecondsLeft, theme }: StyleProps) {
  const isDark     = theme === 'dark'
  const accent     = CATEGORY_COLORS[c.category]
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

        {/* Titre + timer sur la même ligne */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
          <div style={{
            fontSize: '14px', fontWeight: 700, lineHeight: 1.25,
            color: textPrimary, flex: 1,
          }}>
            {c.title}
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

        {/* Description */}
        {c.description && (
          <div style={{ fontSize: '11px', color: textMuted, lineHeight: 1.4, marginBottom: '8px' }}>
            {c.description}
          </div>
        )}

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

        {/* Footer : catégorie + difficulté */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: accent }}>
            {CATEGORY_LABELS[c.category]}
          </span>
          <span style={{ fontSize: '9px', color: textMuted }}>·</span>
          <span style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: diffColor }}>
            {DIFFICULTY_LABELS[c.difficulty]}
          </span>
        </div>
      </div>
    </div>
  )
}
