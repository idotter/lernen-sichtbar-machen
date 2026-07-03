'use client'
import { useActionState, useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { createLernEntryWithArtefact } from '../../_actions'
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  type AllowedMimeType,
} from '@/lib/validators/artefact'

const ACCEPT = ALLOWED_MIME_TYPES.join(',')

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      disabled={disabled || pending}
      className="w-full min-h-[44px]"
    >
      {pending ? 'Wird hochgeladen…' : 'Weiter'}
    </Button>
  )
}

export default function BildPage() {
  const router = useRouter()
  const [state, action] = useActionState(createLernEntryWithArtefact, null)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [clientError, setClientError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (state?.success) router.push('/lernlandkarte')
  }, [state, router])

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setClientError(null)
    const f = e.target.files?.[0] ?? null
    if (!f) {
      setFile(null)
      return
    }

    if (!ALLOWED_MIME_TYPES.includes(f.type as AllowedMimeType)) {
      setClientError('Nur JPG, PNG, GIF oder PDF erlaubt.')
      setFile(null)
      return
    }
    if (f.size > MAX_FILE_SIZE) {
      setClientError('Datei überschreitet 10 MB.')
      setFile(null)
      return
    }
    setFile(f)
  }

  const isImage = file?.type.startsWith('image/')

  return (
    <div className="min-h-screen bg-lsm-bg p-6">
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-muted-foreground hover:text-foreground mb-4 min-h-[44px] flex items-center gap-1"
          >
            ← Zurück
          </button>
          <h1 className="text-xl font-bold">Was hast du gesehen?</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Foto aufnehmen oder aus der Galerie wählen.
          </p>
        </div>

        <form action={action} className="space-y-4">
          {!file && (
            <label
              htmlFor="file-input"
              className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-lsm-border bg-lsm-surface p-8 min-h-[160px] cursor-pointer hover:bg-muted transition"
            >
              <span className="text-4xl" aria-hidden>📷</span>
              <span className="text-sm font-medium">Foto oder Datei wählen</span>
              <span className="text-xs text-muted-foreground">JPG, PNG, GIF, PDF · max 10 MB</span>
            </label>
          )}

          <input
            ref={inputRef}
            id="file-input"
            name="file"
            type="file"
            accept={ACCEPT}
            capture="environment"
            className="sr-only"
            onChange={handleFileChange}
            required
          />

          {file && previewUrl && (
            <div className="space-y-3">
              <div className="rounded-lg border-2 border-[var(--color-node-schritt)] bg-[var(--color-node-schritt-bg)] p-3">
                {isImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt="Vorschau"
                    className="w-full h-auto max-h-64 rounded object-contain"
                  />
                ) : (
                  <p className="text-sm">📄 {file.name}</p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  {(file.size / 1024).toFixed(0)} KB · {file.type}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFile(null)
                  if (inputRef.current) inputRef.current.value = ''
                }}
                className="text-sm text-lsm-action hover:underline min-h-[44px]"
              >
                Anderes Bild wählen
              </button>
            </div>
          )}

          <Textarea
            name="comment"
            placeholder="Beschreibe, was du siehst… (optional)"
            className="text-base min-h-[80px] resize-none"
            maxLength={500}
          />

          {clientError && (
            <p role="alert" className="text-sm text-destructive">{clientError}</p>
          )}
          {state && !state.success && (
            <p role="alert" className="text-sm text-destructive">{state.error}</p>
          )}

          <SubmitButton disabled={!file} />
        </form>
      </div>
    </div>
  )
}
