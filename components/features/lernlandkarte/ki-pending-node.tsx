'use client'
import { cn } from '@/lib/utils'

interface Props {
  variant?: 'pending' | 'unavailable'
  className?: string
}

/**
 * Platzhalter-Node während die KI eine sokratische Gegenfrage generiert.
 * `pending`: pulsierend, «KI denkt nach…»
 * `unavailable`: nach Timeout (30s) oder 3 Retries, «KI analysiert gerade…»
 */
export function KiPendingNode({ variant = 'pending', className }: Props) {
  const isUnavailable = variant === 'unavailable'
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={!isUnavailable}
      aria-label={isUnavailable ? 'KI analysiert gerade' : 'KI denkt über deine Frage nach'}
      className={cn(
        'flex items-center gap-3 rounded-lg border-2 border-dashed p-4 w-full min-h-[44px]',
        'border-[var(--color-node-ki)] bg-[var(--color-node-ki-bg)]',
        !isUnavailable && 'animate-pulse',
        className
      )}
    >
      <span className="text-2xl" aria-hidden>{isUnavailable ? '⏳' : '💭'}</span>
      <p className="text-sm text-muted-foreground">
        {isUnavailable ? 'KI analysiert gerade…' : 'KI denkt nach…'}
      </p>
    </div>
  )
}
