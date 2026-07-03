'use client'
import { Popover, PopoverTrigger, PopoverContent } from './popover'
import { cn } from '@/lib/utils'

interface KIBadgeProps {
  reasoning: string
  confirmed?: boolean
  className?: string
}

/**
 * Sichtbares KI-Kennzeichen (FR35) mit Klick-Popover für Begründung (FR36).
 * `confirmed=false` (Default) → gestrichelter grüner Border + Puls
 * `confirmed=true` → solider Border, kein Puls
 */
export function KIBadge({ reasoning, confirmed = false, className }: KIBadgeProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={
            confirmed
              ? 'Bestätigter KI-Vorschlag — Begründung anzeigen'
              : 'KI-generierter Vorschlag — Begründung anzeigen'
          }
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium min-h-[44px] min-w-[44px] justify-center',
            'border-[1.5px] text-[var(--color-node-ki)]',
            confirmed
              ? 'border-solid bg-[var(--color-node-ki-bg)]'
              : 'border-dashed bg-[var(--color-node-ki-bg)] animate-pulse',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lsm-action',
            'transition-[border-style,background-color] duration-300 ease-in-out',
            className
          )}
        >
          <span aria-hidden>✨</span>
          <span>KI</span>
        </button>
      </PopoverTrigger>
      <PopoverContent role="dialog" aria-label="KI-Begründung">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Warum diese Frage?
          </p>
          <p className="text-sm leading-relaxed">{reasoning}</p>
        </div>
      </PopoverContent>
    </Popover>
  )
}
