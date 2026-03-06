// Composant Textarea shadcn/ui — thème Fortnite dark
import * as React from 'react'
import { cn } from '../../lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex w-full rounded-lg border border-fortnite-border bg-fortnite-darker px-3 py-2 text-sm text-white',
          'placeholder:text-fortnite-muted',
          'focus:outline-none focus:ring-1 focus:ring-fortnite-yellow focus:border-fortnite-yellow',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'resize-none transition-colors',
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Textarea.displayName = 'Textarea'

export { Textarea }
