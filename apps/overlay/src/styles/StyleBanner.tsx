// =============================================================
// STYLE BANNIÈRE — Bande horizontale large, idéal haut/bas de scène
// =============================================================

import { CATEGORY_LABELS, DIFFICULTY_LABELS } from '@challenge-hub/shared'
import type { StyleProps } from './types'
import { CATEGORY_COLORS, DIFFICULTY_COLORS, formatTime } from './colors'

export function StyleBanner({ challenge: c, timerSecondsLeft, theme }: StyleProps) {
  const isDark    = theme === 'dark'
  const accent    = CATEGORY_COLORS[c.category]
  const diffColor = DIFFICULTY_COLORS[c.difficulty]

  const isTimerLow    = timerSecondsLeft !== null && timerSecondsLeft <= 30
  const timerProgress = timerSecondsLeft !== null && c.timerSeconds
    ? Math.max(0, (timerSecondsLeft / c.timerSeconds) * 100)
    : 100

  const bg = isDark
    ? `linear-gradient(90deg, rgba(6,8,14,0.95) 0%, rgba(12,15,24,0.92) 60%, rgba(6,8,14,0.88) 100%)`
    : `linear-gradient(90deg, rgba(255,255,255,0.96) 0%, rgba(245,248,252,0.94) 100%)`

  const textPrimary = isDark ? '#FFFFFF' : '#0F172A'
  const textMuted   = isDark ? '#64748B' : '#94A3B8'

  return (
    <div
      className="animate-pop-in"
      style={{
        width: '520px',
        background: bg,
        backdropFilter: 'blur(20px)',
        borderRadius: '6px',
        overflow: 'hidden',
        filter: [
          `drop-shadow(0 0 14px ${accent}35)`,
          'drop-shadow(0 6px 20px rgba(0,0,0,0.55))',
        ].join(' '),
      }}
    >
      {/* Barre de progression en haut (si timer actif) */}
      {timerSecondsLeft !== null && c.timerSeconds ? (
        <div style={{ height: '3px', background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${timerProgress}%`,
            background: isTimerLow ? 'linear-gradient(90deg, #EF4444, #F97316)' : `linear-gradient(90deg, ${accent}, ${accent}CC)`,
            boxShadow: isTimerLow ? '0 0 8px #EF4444' : `0 0 8px ${accent}`,
            transition: 'width 1s linear',
          }} />
        </div>
      ) : (
        /* Ligne accent fixe si pas de timer */
        <div style={{ height: '3px', background: `linear-gradient(90deg, ${accent}, ${accent}50, transparent)` }} />
      )}

      {/* Contenu horizontal */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', gap: '14px' }}>

        {/* Barre verticale accent */}
        <div style={{ width: '3px', height: '38px', background: accent, borderRadius: '2px', flexShrink: 0 }} />

        {/* Bloc gauche : catégorie + titre */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '9px', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase',
            color: accent, marginBottom: '4px',
          }}>
            {CATEGORY_LABELS[c.category]}
          </div>
          <div style={{
            fontSize: '15px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.02em',
            color: textPrimary, lineHeight: 1.15,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {c.title}
          </div>
        </div>

        {/* Séparateur vertical */}
        <div style={{ width: '1px', height: '32px', background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', flexShrink: 0 }} />

        {/* Bloc droit : difficulté + timer */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
          <span style={{
            fontSize: '8px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase',
            color: diffColor, background: `${diffColor}15`, border: `1px solid ${diffColor}40`,
            padding: '1px 7px', borderRadius: '3px',
          }}>
            {DIFFICULTY_LABELS[c.difficulty]}
          </span>

          {timerSecondsLeft !== null && (
            <div
              className={isTimerLow ? 'animate-timer-pulse' : ''}
              style={{
                fontFamily: 'monospace', fontSize: '22px', fontWeight: 900, letterSpacing: '0.05em',
                color: isTimerLow ? '#EF4444' : textPrimary,
                textShadow: isTimerLow ? '0 0 12px #EF4444' : `0 0 10px ${accent}`,
                lineHeight: 1,
              }}
            >
              {formatTime(timerSecondsLeft)}
            </div>
          )}

          {timerSecondsLeft === null && c.timerSeconds && (
            <div style={{ fontSize: '12px', color: textMuted }}>⏱ {formatTime(c.timerSeconds)}</div>
          )}

          {timerSecondsLeft === null && !c.timerSeconds && (
            <div style={{ width: '1px' }} /> /* placeholder pour l'alignement */
          )}
        </div>
      </div>
    </div>
  )
}
