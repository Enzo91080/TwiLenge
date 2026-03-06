// Composant Input shadcn/ui — thème Fortnite dark
import * as React from 'react'
import { cn } from '../../lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex w-full rounded-lg border border-fortnite-border bg-fortnite-darker px-3 py-2 text-sm text-white',
          'placeholder:text-fortnite-muted',
          'focus:outline-none focus:ring-1 focus:ring-fortnite-yellow focus:border-fortnite-yellow',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'transition-colors',
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export { Input }
