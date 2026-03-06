// Composant Badge shadcn/ui — thème Fortnite
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-fortnite-yellow/20 text-fortnite-yellow',
        secondary:
          'border-transparent bg-white/10 text-fortnite-muted',
        destructive:
          'border-transparent bg-red-500/20 text-red-400',
        outline:
          'border-fortnite-border text-fortnite-muted',
        success:
          'border-green-500/30 bg-green-500/10 text-green-400',
        warning:
          'border-yellow-500/30 bg-yellow-500/10 text-yellow-400',
        blue:
          'border-blue-500/30 bg-blue-500/10 text-blue-400',
        purple:
          'border-purple-500/30 bg-purple-500/10 text-purple-400',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
