// Composant Button shadcn/ui — variantes adaptées au thème Fortnite
import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        // Jaune Fortnite — action principale
        default:
          'bg-fortnite-yellow text-fortnite-darker hover:brightness-110 active:brightness-90',
        // Rouge — action destructive
        destructive:
          'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30',
        // Vert — validation
        success:
          'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30',
        // Violet — action secondaire (ex: aléatoire)
        purple:
          'bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30',
        // Bleu — action neutre (ex: timer)
        blue:
          'bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30',
        // Gris — action secondaire neutre
        secondary:
          'bg-white/5 text-fortnite-muted border border-fortnite-border hover:text-white hover:bg-white/10',
        // Transparent — actions discrètes
        ghost:
          'text-fortnite-muted hover:text-white hover:bg-white/5',
        // Avec bordure
        outline:
          'border border-fortnite-border bg-transparent text-fortnite-muted hover:bg-white/5 hover:text-white',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-10 px-6',
        icon: 'h-8 w-8 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
