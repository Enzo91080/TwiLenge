// =============================================================
// FLASH RÉSULTAT — animation dramatique
// =============================================================

interface ResultFlashProps {
  type: 'completed' | 'failed'
}

const CLIP_PATH = 'polygon(0% 0%, calc(100% - 22px) 0%, 100% 22px, 100% 100%, 0% 100%)'

export function ResultFlash({ type }: ResultFlashProps) {
  const isCompleted = type === 'completed'
  const color    = isCompleted ? '#22C55E' : '#EF4444'
  const colorDim = isCompleted ? '#16A34A' : '#DC2626'
  const bg = isCompleted
    ? 'linear-gradient(145deg, rgba(10,24,14,0.97) 0%, rgba(15,32,19,0.94) 100%)'
    : 'linear-gradient(145deg, rgba(24,10,10,0.97) 0%, rgba(32,14,14,0.94) 100%)'

  return (
    <div
      className="animate-result-in"
      style={{
        filter: [
          `drop-shadow(0 0 28px ${color}65)`,
          `drop-shadow(0 0 10px ${color}35)`,
          'drop-shadow(0 10px 24px rgba(0,0,0,0.7))',
        ].join(' '),
      }}
    >
      <div
        style={{
          width: '360px',
          clipPath: CLIP_PATH,
          background: bg,
          backdropFilter: 'blur(20px)',
          borderLeft: `3px solid ${color}`,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Ligne supérieure */}
        <div style={{
          height: '2px',
          background: `linear-gradient(90deg, ${color}, ${color}00)`,
        }} />

        {/* Reflet radial */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at 50% 0%, ${color}12 0%, transparent 65%)`,
          pointerEvents: 'none',
        }} />

        <div style={{
          padding: '24px 20px 22px',
          textAlign: 'center',
          position: 'relative',
        }}>
          {/* Icône principale */}
          <div style={{
            fontSize: '52px',
            lineHeight: 1,
            marginBottom: '10px',
            filter: `drop-shadow(0 0 16px ${color}) drop-shadow(0 0 6px ${colorDim})`,
          }}>
            {isCompleted ? '✓' : '✗'}
          </div>

          {/* Label principal */}
          <div style={{
            fontSize: '26px',
            fontWeight: 900,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: color,
            textShadow: `0 0 24px ${color}, 0 0 8px ${colorDim}`,
            marginBottom: '4px',
          }}>
            {isCompleted ? 'Complété !' : 'Échoué !'}
          </div>

          {/* Sous-label */}
          <div style={{
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: `${color}80`,
          }}>
            {isCompleted ? 'Défi réussi' : 'Défi raté'}
          </div>
        </div>

        {/* Ligne inférieure miroir */}
        <div style={{
          height: '2px',
          background: `linear-gradient(270deg, ${color}00, ${color}60)`,
        }} />
      </div>
    </div>
  )
}
