// =============================================================
// COMPOSANT PRINCIPAL DE L'OVERLAY — redesign premium
// =============================================================

import type { Challenge, ChallengeCategory, ChallengeDifficulty } from '@challenge-hub/shared'
import { CATEGORY_LABELS, DIFFICULTY_LABELS } from '@challenge-hub/shared'

// Couleurs par catégorie (accent principal)
const CATEGORY_COLORS: Record<ChallengeCategory, string> = {
  elimination: '#EF4444',
  placement:   '#3B82F6',
  loadout:     '#A855F7',
  chaos:       '#F97316',
  custom:      '#F0C540',
}

const DIFFICULTY_COLORS: Record<ChallengeDifficulty, string> = {
  easy:   '#22C55E',
  medium: '#EAB308',
  hard:   '#EF4444',
}

interface ChallengeDisplayProps {
  challenge: Challenge
  timerSecondsLeft: number | null
  theme: 'dark' | 'light'
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

// Forme gaming : coin supérieur droit coupé
const CLIP_PATH = 'polygon(0% 0%, calc(100% - 22px) 0%, 100% 22px, 100% 100%, 0% 100%)'

export function ChallengeDisplay({ challenge: c, timerSecondsLeft, theme }: ChallengeDisplayProps) {
  const isDark = theme === 'dark'
  const accent = CATEGORY_COLORS[c.category]
  const diffColor = DIFFICULTY_COLORS[c.difficulty]

  const isTimerRunning = timerSecondsLeft !== null
  const isTimerLow     = timerSecondsLeft !== null && timerSecondsLeft <= 30
  const timerProgress  = isTimerRunning && c.timerSeconds
    ? Math.max(0, (timerSecondsLeft! / c.timerSeconds) * 100)
    : 100

  // Background selon le thème
  const bg = isDark
    ? 'linear-gradient(145deg, rgba(8,10,16,0.96) 0%, rgba(14,18,28,0.93) 100%)'
    : 'linear-gradient(145deg, rgba(255,255,255,0.97) 0%, rgba(240,243,248,0.95) 100%)'

  const textPrimary   = isDark ? '#FFFFFF' : '#0F172A'
  const textSecondary = isDark ? '#94A3B8' : '#64748B'

  return (
    // Wrapper pour drop-shadow (clip-path masque box-shadow)
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
        <div style={{
          height: '2px',
          background: `linear-gradient(90deg, ${accent}, ${accent}00)`,
        }} />

        {/* Reflet subtil en haut-gauche */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0,
          width: '60%', height: '40%',
          background: `radial-gradient(ellipse at 0% 0%, ${accent}0A 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        <div style={{ padding: '14px 16px 16px', position: 'relative' }}>

          {/* ── Header : live dot + label + catégorie ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              {/* Point pulsant */}
              <div
                className="dot-pulse"
                style={{
                  width: '7px', height: '7px', borderRadius: '50%',
                  background: '#4ADE80',
                  flexShrink: 0,
                }}
              />
              <span style={{
                fontSize: '9px', fontWeight: 800, letterSpacing: '0.16em',
                textTransform: 'uppercase', color: '#4ADE80',
              }}>
                Défi en cours
              </span>
            </div>

            {/* Badge catégorie */}
            <span style={{
              fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: accent,
              background: `${accent}18`,
              border: `1px solid ${accent}45`,
              padding: '2px 8px', borderRadius: '3px',
            }}>
              {CATEGORY_LABELS[c.category]}
            </span>
          </div>

          {/* ── Ligne de séparation ── */}
          <div style={{
            height: '1px',
            background: `linear-gradient(90deg, ${accent}50, transparent)`,
            marginBottom: '10px',
          }} />

          {/* ── Titre ── */}
          <div style={{
            fontSize: '17px', fontWeight: 800, lineHeight: 1.2,
            color: textPrimary,
            textTransform: 'uppercase', letterSpacing: '0.025em',
            marginBottom: c.description ? '6px' : '12px',
          }}>
            {c.title}
          </div>

          {/* ── Description ── */}
          {c.description && (
            <div style={{
              fontSize: '12px', lineHeight: 1.5,
              color: textSecondary,
              marginBottom: '12px',
            }}>
              {c.description}
            </div>
          )}

          {/* ── Barre de progression du timer ── */}
          {isTimerRunning && c.timerSeconds && (
            <div style={{ marginBottom: '10px' }}>
              <div style={{
                height: '3px', borderRadius: '2px',
                background: 'rgba(255,255,255,0.08)',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${timerProgress}%`,
                  borderRadius: '2px',
                  background: isTimerLow
                    ? 'linear-gradient(90deg, #EF4444, #F97316)'
                    : `linear-gradient(90deg, ${accent}, ${accent}BB)`,
                  transition: 'width 1s linear, background 0.5s ease',
                  boxShadow: isTimerLow ? '0 0 8px #EF4444' : `0 0 8px ${accent}`,
                }} />
              </div>
            </div>
          )}

          {/* ── Footer : difficulté + timer ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

            {/* Badge difficulté */}
            <span style={{
              fontSize: '9px', fontWeight: 800, letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: diffColor,
              background: `${diffColor}18`,
              border: `1px solid ${diffColor}40`,
              padding: '3px 9px', borderRadius: '3px',
            }}>
              {DIFFICULTY_LABELS[c.difficulty]}
            </span>

            {/* Timer actif */}
            {timerSecondsLeft !== null && (
              <div
                className={isTimerLow ? 'animate-timer-pulse' : ''}
                style={{
                  fontFamily: '"Segoe UI", monospace',
                  fontSize: '22px', fontWeight: 800,
                  letterSpacing: '0.04em',
                  color: isTimerLow ? '#EF4444' : textPrimary,
                  textShadow: isTimerLow
                    ? '0 0 16px #EF4444, 0 0 6px #EF4444'
                    : `0 0 14px ${accent}`,
                }}
              >
                {formatTime(timerSecondsLeft)}
              </div>
            )}

            {/* Timer du défi (pas encore lancé) */}
            {timerSecondsLeft === null && c.timerSeconds && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                fontSize: '12px', color: textSecondary,
              }}>
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
