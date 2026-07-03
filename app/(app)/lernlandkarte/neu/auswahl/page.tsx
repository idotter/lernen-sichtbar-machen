'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { EINSTIEGSFRAGEN, type Einstiegsfrage } from '@/lib/data/einstiegsfragen'
import { AuswahlKarte } from '@/components/features/lernlandkarte/auswahl-karte'
import { createLernEntry } from '../../_actions'

export default function AuswahlPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  function handleSelect(frage: Einstiegsfrage) {
    setSelectedId(frage.id)
    setError(null)
    startTransition(async () => {
      const fd = new FormData()
      fd.append('text', frage.text)
      const result = await createLernEntry(null, fd)
      if (result.success) {
        router.push('/lernlandkarte')
      } else {
        setError(result.error)
        setSelectedId(null)
      }
    })
  }

  return (
    <div className="min-h-screen bg-lsm-bg p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-muted-foreground hover:text-foreground mb-4 min-h-[44px] flex items-center gap-1"
          >
            ← Zurück
          </button>
          <h1 className="text-xl font-bold">Zeig mir Ideen</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Wähle eine Frage, die dich neugierig macht.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3" role="list">
          {EINSTIEGSFRAGEN.map((frage) => (
            <div key={frage.id} role="listitem">
              <AuswahlKarte
                frage={frage}
                onSelect={handleSelect}
                disabled={isPending && selectedId !== frage.id}
              />
            </div>
          ))}
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">{error}</p>
        )}

        <div className="border-t border-lsm-border pt-4">
          <Link
            href="/lernlandkarte/neu/freitext"
            className="inline-flex items-center gap-2 text-sm font-medium text-lsm-action hover:underline min-h-[44px]"
          >
            ✏️ Eigene Frage stellen
          </Link>
        </div>
      </div>
    </div>
  )
}
