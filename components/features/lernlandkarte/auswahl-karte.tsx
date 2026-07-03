'use client'
import type { Einstiegsfrage } from '@/lib/data/einstiegsfragen'
import { cn } from '@/lib/utils'

interface AuswahlKarteProps {
  frage: Einstiegsfrage
  onSelect: (frage: Einstiegsfrage) => void
  disabled?: boolean
}

export function AuswahlKarte({ frage, onSelect, disabled }: AuswahlKarteProps) {
  return (
    <button
      type="button"
      role="button"
      aria-label={`Einstiegsfrage wählen: ${frage.text}`}
      onClick={() => onSelect(frage)}
      disabled={disabled}
      className={cn(
        'group flex flex-col items-start gap-3 rounded-lg border-2 border-lsm-border bg-lsm-surface p-4',
        'min-h-[120px] w-full text-left transition',
        'hover:border-[var(--color-node-frage)] hover:shadow-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lsm-action',
        'disabled:opacity-50 disabled:cursor-not-allowed'
      )}
    >
      <span className="text-3xl" aria-hidden>{frage.icon}</span>
      <span className="text-sm font-medium leading-snug break-words">{frage.text}</span>
    </button>
  )
}
