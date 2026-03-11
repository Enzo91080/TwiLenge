// =============================================================
// DISPATCHER — Choisit le composant de style selon le paramètre URL
// =============================================================

import type { OverlayStyle } from '@challenge-hub/shared'
import type { StyleProps } from '../styles/types'
import { StyleGaming } from '../styles/StyleGaming'
import { StyleMinimal } from '../styles/StyleMinimal'
import { StyleNeon } from '../styles/StyleNeon'
import { StyleBanner } from '../styles/StyleBanner'
import { StylePill } from '../styles/StylePill'

type ChallengeDisplayProps = StyleProps & { style: OverlayStyle }

const STYLES: Record<OverlayStyle, React.ComponentType<StyleProps>> = {
  gaming:  StyleGaming,
  minimal: StyleMinimal,
  neon:    StyleNeon,
  banner:  StyleBanner,
  pill:    StylePill,
}

export function ChallengeDisplay({ style, ...props }: ChallengeDisplayProps) {
  const Style = STYLES[style] ?? StyleGaming
  return <Style {...props} />
}
