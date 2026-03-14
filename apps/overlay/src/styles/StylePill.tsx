// =============================================================
// STYLE PILL — Pastille compacte, très discrète, une seule ligne
// =============================================================

import type { StyleProps } from './types'
import { formatTime } from './colors'

const ACCENT = '#F0C540'

export function StylePill({ challenge: c, timerSecondsLeft, theme }: StyleProps) {
  const isDark  = theme === 'dark'
  const accent  = ACCENT

  const isTimerLow = timerSecondsLeft !== null && timerSecondsLeft <= 30
  const timerColor = isTimerLow ? '#EF4444' : accent

  const bg        = isDark ? 'rgba(8, 10, 18, 0.82)' : 'rgba(255, 255, 255, 0.90)'
  const textColor = isDark ? '#F1F5F9' : '#0F172A'
  const textMuted = isDark ? '#64748B' : '#94A3B8'

  return (
    <div
      className="animate-pop-in"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        padding: '8px 14px',
        background: bg,
        backdropFilter: 'blur(16px)',
        borderRadius: '100px',
        border: `1px solid ${accent}50`,
        boxShadow: `0 0 10px ${accent}20, 0 4px 16px rgba(0,0,0,0.45)`,
        maxWidth: '380px',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
      }}
    >
      {/* Point pulsant */}
      <div
        className="dot-pulse"
        style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ADE80', flexShrink: 0 }}
      />

      {/* Description (tronquée si trop long) */}
      <span style={{
        fontSize: '12px', color: textColor,
        overflow: 'hidden', textOverflow: 'ellipsis', flex: 1,
      }}>
        {c.description || '—'}
      </span>

      {/* Timer */}
      {timerSecondsLeft !== null && (
        <>
          <div style={{ width: '1px', height: '14px', background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)', flexShrink: 0 }} />
          <span
            className={isTimerLow ? 'animate-timer-pulse' : ''}
            style={{
              fontFamily: 'monospace', fontSize: '13px', fontWeight: 800,
              color: timerColor,
              textShadow: isTimerLow ? `0 0 8px ${timerColor}` : undefined,
              flexShrink: 0,
            }}
          >
            {formatTime(timerSecondsLeft)}
          </span>
        </>
      )}

      {timerSecondsLeft === null && c.timerSeconds && (
        <span style={{ fontSize: '11px', color: textMuted, flexShrink: 0 }}>
          ⏱ {formatTime(c.timerSeconds)}
        </span>
      )}
    </div>
  )
}
