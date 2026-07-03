'use client'
import { cn } from '@/lib/utils'
import type { LearningEntry } from '@/lib/db/schema/learning-entries'

type NodeVariant = 'frage' | 'schritt' | 'ki-suggested' | 'ki-confirmed'

const VARIANT_CLASSES: Record<NodeVariant, string> = {
  frage: 'border-[var(--color-node-frage)] bg-[var(--color-node-frage-bg)]',
  schritt: 'border-[var(--color-node-schritt)] bg-[var(--color-node-schritt-bg)]',
  'ki-suggested': 'ki-suggested',
  'ki-confirmed': 'ki-confirmed',
}

function entryToVariant(entry: LearningEntry): NodeVariant {
  if (entry.type === 'frage') return 'frage'
  if (entry.type === 'ki_question') return 'ki-suggested'
  return 'schritt'
}

interface JourneyNodeProps {
  entry: LearningEntry
  thumbnailUrl?: string
  isNew?: boolean
  className?: string
}

export function JourneyNode({ entry, thumbnailUrl, isNew, className }: JourneyNodeProps) {
  const variant = entryToVariant(entry)

  return (
    <article
      role="article"
      tabIndex={0}
      aria-label={`Lerneintrag: ${entry.text ?? '(kein Text)'}`}
      className={cn(
        'rounded-lg border-2 p-4 w-full min-h-[44px]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lsm-action',
        VARIANT_CLASSES[variant],
        isNew && 'animate-fade-in',
        className
      )}
    >
      <div className="flex items-start gap-3">
        {thumbnailUrl && (
          <img
            src={thumbnailUrl}
            alt="Artefakt-Vorschau"
            className="w-12 h-12 rounded object-cover shrink-0"
            loading="lazy"
          />
        )}
        <p className="text-sm leading-relaxed break-words">{entry.text}</p>
      </div>
    </article>
  )
}

interface OptimisticJourneyNodeProps {
  text: string
  variant: NodeVariant
}

export function OptimisticJourneyNode({ text, variant }: OptimisticJourneyNodeProps) {
  return (
    <article
      role="article"
      aria-label={`Neu: ${text}`}
      className={cn(
        'rounded-lg border-2 p-4 w-full min-h-[44px] opacity-70',
        VARIANT_CLASSES[variant]
      )}
    >
      <p className="text-sm leading-relaxed break-words">{text}</p>
    </article>
  )
}
