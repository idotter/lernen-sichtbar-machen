'use client'
import { useState, useTransition } from 'react'
import { generateInviteCode } from '@/app/(app)/klasse/_actions'
import { Button } from '@/components/ui/button'

type Props = {
  classId: string
  initialCode: string | null
}

export function InviteCodeSection({ classId, initialCode }: Props) {
  const [code, setCode] = useState<string | null>(initialCode)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  function handleGenerate() {
    setError(null)
    setCopied(false)
    startTransition(async () => {
      const result = await generateInviteCode(classId)
      if (result.success) {
        setCode(result.data.code)
      } else {
        setError(result.error)
      }
    })
  }

  async function handleCopy() {
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Ignorieren — Clipboard-API nicht verfügbar
    }
  }

  return (
    <div className="space-y-3">
      {code ? (
        <div className="flex items-center gap-3">
          <div className="flex-1 rounded-md border bg-lsm-bg p-4 text-center">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Einladungs-Code</p>
            <p className="text-2xl font-mono font-semibold tracking-widest mt-1">{code}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleCopy}
              className="min-h-[36px]"
            >
              {copied ? 'Kopiert!' : 'Kopieren'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleGenerate}
              disabled={isPending}
              className="min-h-[36px]"
            >
              {isPending ? 'Erzeuge…' : 'Neu erzeugen'}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          onClick={handleGenerate}
          disabled={isPending}
          className="min-h-[44px]"
        >
          {isPending ? 'Erzeuge Code…' : 'Einladungscode erzeugen'}
        </Button>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">
        Teile diesen Code mit deinen Lernenden. Sie melden sich unter{' '}
        <code className="rounded bg-lsm-bg px-1">/kind-login</code> an.
      </p>
    </div>
  )
}
