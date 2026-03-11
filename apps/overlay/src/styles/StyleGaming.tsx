// =============================================================
// STYLE GAMING — Card sombre avec coin coupé, style HUD gaming
// =============================================================

import { CATEGORY_LABELS, DIFFICULTY_LABELS } from '@challenge-hub/shared'
import type { StyleProps } from './types'
import { CATEGORY_COLORS, DIFFICULTY_COLORS, formatTime } from './colors'

const CLIP_PATH = 'polygon(0% 0%, calc(100% - 22px) 0%, 100% 22px, 100% 100%, 0% 100%)'

export function StyleGaming({ challenge: c, timerSecondsLeft, theme }: StyleProps) {
  const isDark = theme === 'dark'
  const accent = CATEGORY_COLORS[c.category]
  const diffColor = DIFFICULTY_COLORS[c.difficulty]

  const isTimerRunning = timerSecondsLeft !== null
  const isTimerLow     = timerSecondsLeft !== null && timerSecondsLeft <= 30
  const timerProgress  = isTimerRunning && c.timerSeconds
    ? Math.max(0, (timerSecondsLeft! / c.timerSeconds) * 100)
    : 100

  const bg = isDark
    ? 'linear-gradient(145deg, rgba(8,10,16,0.96) 0%, rgba(14,18,28,0.93) 100%)'
    : 'linear-gradient(145deg, rgba(255,255,255,0.97) 0%, rgba(240,243,248,0.95) 100%)'

  const textPrimary   = isDark ? '#FFFFFF' : '#0F172A'
  const textSecondary = isDark ? '#94A3B8' : '#64748B'

  return (
    <div
      className="animate-pop-in"
      style={{
        filter: [
          `drop-shadow(0 0 18px ${accent}45)`,
          `drop-shadow(0 0 6px  ${accent}25)`,
          'drop-shadow(0 10px 24px rgba(0,0,0,0.65))',
        ].join(' '),
      }}
    >
      <div
        style={{
          width: '360px',
          clipPath: CLIP_PATH,
          background: bg,
          backdropFilter: 'blur(20px)',
          borderLeft: `3px solid ${accent}`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Ligne supérieure — dégradé catégorie */}
        <div style={{ height: '2px', background: `linear-gradient(90deg, ${accent}, ${accent}00)` }} />

        {/* Reflet en haut-gauche */}
        <div style={{
          position: 'absolute', top: 0, left: 0,
          width: '60%', height: '40%',
          background: `radial-gradient(ellipse at 0% 0%, ${accent}0A 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        <div style={{ padding: '14px 16px 16px', position: 'relative' }}>

          {/* Header : live dot + catégorie */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <div className="dot-pulse" style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#4ADE80', flexShrink: 0 }} />
              <span style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#4ADE80' }}>
                Défi en cours
              </span>
            </div>
            <span style={{
              fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: accent, background: `${accent}18`, border: `1px solid ${accent}45`,
              padding: '2px 8px', borderRadius: '3px',
            }}>
              {CATEGORY_LABELS[c.category]}
            </span>
          </div>

          {/* Séparation */}
          <div style={{ height: '1px', background: `linear-gradient(90deg, ${accent}50, transparent)`, marginBottom: '10px' }} />

          {/* Titre */}
          <div style={{
            fontSize: '17px', fontWeight: 800, lineHeight: 1.2, color: textPrimary,
            textTransform: 'uppercase', letterSpacing: '0.025em',
            marginBottom: c.description ? '6px' : '12px',
          }}>
            {c.title}
          </div>

          {/* Description */}
          {c.description && (
            <div style={{ fontSize: '12px', lineHeight: 1.5, color: textSecondary, marginBottom: '12px' }}>
              {c.description}
            </div>
          )}

          {/* Barre de progression */}
          {isTimerRunning && c.timerSeconds && (
            <div style={{ marginBottom: '10px' }}>
              <div style={{ height: '3px', borderRadius: '2px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${timerProgress}%`, borderRadius: '2px',
                  background: isTimerLow ? 'linear-gradient(90deg, #EF4444, #F97316)' : `linear-gradient(90deg, ${accent}, ${accent}BB)`,
                  transition: 'width 1s linear, background 0.5s ease',
                  boxShadow: isTimerLow ? '0 0 8px #EF4444' : `0 0 8px ${accent}`,
                }} />
              </div>
            </div>
          )}

          {/* Footer : difficulté + timer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{
              fontSize: '9px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase',
              color: diffColor, background: `${diffColor}18`, border: `1px solid ${diffColor}40`,
              padding: '3px 9px', borderRadius: '3px',
            }}>
              {DIFFICULTY_LABELS[c.difficulty]}
            </span>

            {timerSecondsLeft !== null && (
              <div
                className={isTimerLow ? 'animate-timer-pulse' : ''}
                style={{
                  fontFamily: '"Segoe UI", monospace', fontSize: '22px', fontWeight: 800, letterSpacing: '0.04em',
                  color: isTimerLow ? '#EF4444' : textPrimary,
                  textShadow: isTimerLow ? '0 0 16px #EF4444, 0 0 6px #EF4444' : `0 0 14px ${accent}`,
                }}
              >
                {formatTime(timerSecondsLeft)}
              </div>
            )}

            {timerSecondsLeft === null && c.timerSeconds && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: textSecondary }}>
                <span style={{ fontSize: '11px' }}>⏱</span>
                {formatTime(c.timerSeconds)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
