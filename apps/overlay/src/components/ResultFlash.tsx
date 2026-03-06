// =============================================================
// COMPOSANT FLASH DE RESULTAT
// =============================================================
// S'affiche brievement quand un defi est complete ou echoue.
// Visible 2 secondes, puis disparait.
// =============================================================

interface ResultFlashProps {
  type: 'completed' | 'failed'
}

export function ResultFlash({ type }: ResultFlashProps) {
  const isCompleted = type === 'completed'

  return (
    <div
      className="animate-pop-in rounded-xl overflow-hidden"
      style={{
        width: '340px',
        border: `2px solid ${isCompleted ? '#22C55E' : '#EF4444'}`,
        boxShadow: `0 0 30px ${isCompleted ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
        background: isCompleted ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div className="p-6 text-center">
        <div className="text-5xl mb-2">{isCompleted ? '✓' : '✗'}</div>
        <div
          className="text-2xl font-black tracking-widest"
          style={{ color: isCompleted ? '#22C55E' : '#EF4444' }}
        >
          {isCompleted ? 'COMPLETE !' : 'ECHOUE !'}
        </div>
      </div>
    </div>
  )
}
