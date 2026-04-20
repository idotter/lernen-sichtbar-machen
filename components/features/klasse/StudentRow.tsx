'use client'
import { useState, useTransition } from 'react'
import { resetChildPin } from '@/app/(app)/klasse/_actions'
import { Button } from '@/components/ui/button'

type Props = {
  child: { id: string; displayName: string }
}

/**
 * StudentRow (UX-DR5): Avatar (32px) + Name + Status-Dot + PIN-zurücksetzen-Action.
 * Avatar ist ein einfaches Initialen-Placeholder für MVP.
 */
export function StudentRow({ child }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  const initials = child.displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('')

  function handleReset() {
    setError(null)
    startTransition(async () => {
      const result = await resetChildPin(child.id)
      if (!result.success) {
        setError(result.error)
      }
      setConfirming(false)
    })
  }

  return (
    <li className="flex items-center justify-between gap-3 rounded-md border p-3 min-h-[56px]">
      <div className="flex items-center gap-3">
        <div
          aria-hidden="true"
          className="flex size-8 items-center justify-center rounded-full bg-lsm-bg text-xs font-semibold"
        >
          {initials}
        </div>
        <span className="font-medium text-sm">{child.displayName}</span>
        {/* UX-DR5 Status-Dot: Kind ist registriert (grün). Spätere Stories können
            diesen Dot differenzieren (z.B. gelb pulsierend bei Inaktivität >3 Tage). */}
        <span
          aria-label="Registriert"
          title="Registriert"
          className="inline-block size-2 rounded-full bg-node-ki"
        />
      </div>
      <div className="flex items-center gap-2">
        {error && <span className="text-xs text-destructive">{error}</span>}
        {confirming ? (
          <>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={handleReset}
              disabled={isPending}
              className="min-h-[36px]"
            >
              {isPending ? 'Setze zurück…' : 'Bestätigen'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setConfirming(false)}
              disabled={isPending}
              className="min-h-[36px]"
            >
              Abbrechen
            </Button>
          </>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setConfirming(true)}
            className="min-h-[36px]"
          >
            PIN zurücksetzen
          </Button>
        )}
      </div>
    </li>
  )
}
