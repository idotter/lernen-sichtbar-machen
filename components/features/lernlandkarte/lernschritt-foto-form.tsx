'use client'
import { useActionState, useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { addLernschrittMitFoto } from '@/app/(app)/lernlandkarte/_actions'
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  type AllowedMimeType,
} from '@/lib/validators/artefact'

const ACCEPT = ALLOWED_MIME_TYPES.join(',')

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={disabled || pending} className="w-full min-h-[44px]">
      {pending ? 'Wird hochgeladen…' : 'Speichern'}
    </Button>
  )
}

interface Props {
  parentId: string
  onSuccess?: () => void
}

export function LernschrittFotoForm({ parentId, onSuccess }: Props) {
  const [state, action] = useActionState(addLernschrittMitFoto, null)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [clientError, setClientError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (state?.success) onSuccess?.()
  }, [state, onSuccess])

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setClientError(null)
    const f = e.target.files?.[0] ?? null
    if (!f) return setFile(null)
    if (!ALLOWED_MIME_TYPES.includes(f.type as AllowedMimeType)) {
      setClientError('Nur JPG, PNG, GIF oder PDF erlaubt.')
      return setFile(null)
    }
    if (f.size > MAX_FILE_SIZE) {
      setClientError('Datei überschreitet 10 MB.')
      return setFile(null)
    }
    setFile(f)
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="parentId" value={parentId} />
      {!file ? (
        <label
          htmlFor="foto-input"
          className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-lsm-border bg-lsm-surface p-6 min-h-[120px] cursor-pointer hover:bg-muted"
        >
          <span className="text-3xl" aria-hidden>📷</span>
          <span className="text-sm">Foto wählen</span>
        </label>
      ) : (
        <div className="rounded-lg border-2 border-[var(--color-node-schritt)] bg-[var(--color-node-schritt-bg)] p-3">
          {file.type.startsWith('image/') && previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="Vorschau" className="w-full h-auto max-h-48 rounded object-contain" />
          ) : (
            <p className="text-sm">📄 {file.name}</p>
          )}
          <button
            type="button"
            onClick={() => {
              setFile(null)
              if (inputRef.current) inputRef.current.value = ''
            }}
            className="mt-2 text-xs text-lsm-action hover:underline"
          >
            Anderes Bild
          </button>
        </div>
      )}
      <input
        ref={inputRef}
        id="foto-input"
        name="file"
        type="file"
        accept={ACCEPT}
        capture="environment"
        className="sr-only"
        onChange={handleChange}
        required
      />
      <Textarea
        name="comment"
        placeholder="Kommentar (optional)"
        className="text-base min-h-[60px] resize-none"
        maxLength={500}
      />
      {clientError && <p role="alert" className="text-sm text-destructive">{clientError}</p>}
      {state && !state.success && (
        <p role="alert" className="text-sm text-destructive">{state.error}</p>
      )}
      <SubmitButton disabled={!file} />
    </form>
  )
}
